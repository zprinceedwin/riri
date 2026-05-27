/**
 * MCP server for Agora Conversational AI Studio agents.
 *
 * Exposes five tools the LLM (managed OpenAI inside Agora Studio) can call
 * on every turn for live data:
 *   - search_clinic_kb       : RAG vector search over the knowledge base
 *   - list_available_slots   : live appointment slots
 *   - get_contact_by_phone   : caller CRM lookup
 *   - reserve_slot           : atomic 5-min hold via Supabase
 *   - confirm_booking        : slot held -> booked + Booking row
 *
 * Wire format: JSON-RPC 2.0 over HTTP (the "HTTP" / "Streamable HTTP" transport
 * option Studio offers in Integration > MCPs > Add Server). Single-shot
 * responses -- no SSE streaming needed for our tools.
 *
 * Public entry point: POST /mcp
 * Public URL pattern: https://<your-cloudflared>.trycloudflare.com/mcp
 */
import { Hono } from "hono";
import { embed } from "../lib/voyage.js";
import {
  confirmBooking,
  getContactByPhone,
  listSlotsBetween,
  reserveSlot,
  vectorSearch,
} from "../lib/supabase.js";

export const mcpRoutes = new Hono();

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "Riri-mcp", version: "0.1.0" };

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const TOOLS: Tool[] = [
  {
    name: "search_clinic_kb",
    description:
      "Search the clinic knowledge base (services, doctors, FAQ, policies, objection-handling) via semantic vector search. Use this whenever the caller asks a question whose answer is in the clinic's documented information. Returns the top matching passages with sources.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The caller's question or topic to look up.",
        },
        namespace: {
          type: "string",
          description:
            "Optional namespace filter. Sofia callers should use 'clinic-belle-manila'. Defaults to no filter.",
        },
        top_k: {
          type: "integer",
          description: "Number of results to return (1-10). Default 4.",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_available_slots",
    description:
      "List clinic appointment slots that are still bookable. Use whenever the caller is trying to schedule and you need to offer them concrete options. Returns up to 20 nearest available slots within the requested window.",
    inputSchema: {
      type: "object",
      properties: {
        from_iso: {
          type: "string",
          description:
            "ISO 8601 timestamp for the start of the search window. Defaults to now.",
        },
        to_iso: {
          type: "string",
          description:
            "ISO 8601 timestamp for the end of the search window. Defaults to 14 days from now.",
        },
        doctor_id: {
          type: "string",
          description:
            "Optional. Restrict to a single doctor (e.g. 'dr-santos'). Omit for any doctor.",
        },
      },
    },
  },
  {
    name: "get_contact_by_phone",
    description:
      "Look up a returning caller by phone number. Use at the START of a call only if you already know the caller's phone. Returns name, past visit count, last visit date, and tags so you can greet them by name and reference history. Returns null if the phone is unknown.",
    inputSchema: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description:
            "Phone number in international format, e.g. '+63-917-555-0101'.",
        },
      },
      required: ["phone"],
    },
  },
  {
    name: "reserve_slot",
    description:
      "Place a 5-minute hold on a specific slot so the caller can confirm without losing it to another booking. Call this BEFORE collecting the caller's contact details, then call confirm_booking to finalize. Returns { ok: true, slot } on success, or { ok: false, reason } on race / taken.",
    inputSchema: {
      type: "object",
      properties: {
        slot_id: {
          type: "string",
          description: "The slot identifier from list_available_slots.",
        },
        call_id: {
          type: "string",
          description: "The current call_id (provided in the per-call context).",
        },
        ttl_sec: {
          type: "integer",
          description: "Hold duration in seconds (1-1800). Default 300.",
        },
      },
      required: ["slot_id", "call_id"],
    },
  },
  {
    name: "confirm_booking",
    description:
      "Convert a held slot into a confirmed booking. Only call this AFTER you have the caller's full name, phone, and email AND after reserve_slot succeeded. Idempotent on phone (existing contact updates instead of duplicating). Triggers a best-effort confirmation email.",
    inputSchema: {
      type: "object",
      properties: {
        slot_id: { type: "string" },
        call_id: { type: "string" },
        service_id: {
          type: "string",
          description:
            "Service identifier, e.g. 'svc-botox-crows'. Use search_clinic_kb to look up service ids if unsure.",
        },
        contact: {
          type: "object",
          properties: {
            name: { type: "string" },
            phone: { type: "string" },
            email: { type: "string", format: "email" },
          },
          required: ["name", "phone", "email"],
        },
      },
      required: ["slot_id", "call_id", "service_id", "contact"],
    },
  },
];

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: { code: number; message: string; data?: unknown };
    };

function okResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function errResult(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}

mcpRoutes.get("/", (c) =>
  c.json({
    ok: true,
    service: "Riri-mcp",
    transport: "http+json-rpc-2.0",
    note: "POST a JSON-RPC 2.0 message to this URL. Methods: initialize, tools/list, tools/call.",
    tools: TOOLS.map((t) => t.name),
  })
);

mcpRoutes.post("/", async (c) => {
  let body: JsonRpcRequest;
  try {
    body = (await c.req.json()) as JsonRpcRequest;
  } catch {
    return c.json(errResult(null, -32700, "Parse error"));
  }
  const { id = null, method, params } = body;

  try {
    switch (method) {
      case "initialize":
        return c.json(
          okResult(id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
          })
        );

      case "tools/list":
        return c.json(okResult(id, { tools: TOOLS }));

      case "tools/call": {
        const name = String(params?.name ?? "");
        const args = (params?.arguments ?? {}) as Record<string, unknown>;
        const out = await callTool(name, args);
        // MCP content envelope: every tool result is wrapped as a content array
        // with one text item containing the JSON payload.
        return c.json(
          okResult(id, {
            content: [
              { type: "text", text: JSON.stringify(out, null, 2) },
            ],
            isError: false,
          })
        );
      }

      case "notifications/initialized":
      case "notifications/cancelled":
        // Notifications have no id and expect no response body, but we acknowledge.
        return c.body(null, 204);

      default:
        return c.json(errResult(id, -32601, `Method not found: ${method}`));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mcp] ${method} failed:`, msg);
    return c.json(errResult(id, -32603, "Internal error", msg));
  }
});

async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "search_clinic_kb": {
      const query = String(args.query ?? "");
      const namespace = args.namespace ? String(args.namespace) : undefined;
      const topK = typeof args.top_k === "number" ? args.top_k : 4;
      if (!query.trim()) return { results: [] };
      const queryVec = await embed(query);
      const chunks = await vectorSearch(queryVec, { topK, namespace });
      return {
        results: chunks.map((c) => ({
          id: c.id,
          text: c.text,
          source: c.source,
          title: c.title,
          score: c.score,
        })),
      };
    }

    case "list_available_slots": {
      const now = new Date();
      const fromIso =
        typeof args.from_iso === "string" ? args.from_iso : now.toISOString();
      const toIso =
        typeof args.to_iso === "string"
          ? args.to_iso
          : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const doctorId =
        typeof args.doctor_id === "string" ? args.doctor_id : undefined;
      const all = await listSlotsBetween(fromIso, toIso, doctorId);
      const available = all
        .filter((s) => s.status === "available")
        .slice(0, 20)
        .map((s) => ({
          slot_id: s.id,
          doctor_id: s.doctorId,
          starts_at: s.startsAt,
          duration_min: s.durationMin,
        }));
      return { slots: available, total_returned: available.length };
    }

    case "get_contact_by_phone": {
      const phone = String(args.phone ?? "");
      if (!phone) return { contact: null };
      const contact = await getContactByPhone(phone);
      if (!contact) return { contact: null };
      return {
        contact: {
          id: contact.id,
          name: contact.name,
          tags: contact.tags,
          notes: contact.notes,
          total_calls: contact.totalCalls,
          total_bookings: contact.totalBookings,
          last_seen_at: contact.lastSeenAt,
        },
      };
    }

    case "reserve_slot": {
      const slotId = String(args.slot_id ?? "");
      const callId = String(args.call_id ?? "");
      const ttlSec =
        typeof args.ttl_sec === "number" ? args.ttl_sec : 300;
      const result = await reserveSlot(slotId, callId, ttlSec);
      return result;
    }

    case "confirm_booking": {
      const slotId = String(args.slot_id ?? "");
      const callId = String(args.call_id ?? "");
      const serviceId = String(args.service_id ?? "");
      const contact = (args.contact ?? {}) as {
        name: string;
        phone: string;
        email: string;
      };
      const result = await confirmBooking({ slotId, callId, serviceId, contact });
      return result;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
