/**
 * Clinic contact endpoints (the CRM-lite for the V0 demo).
 *   GET /api/contacts                  -- list recent contacts (limit 50)
 *   GET /api/contacts/by-phone/:phone  -- caller lookup at call start
 */
import { Hono } from "hono";
import type {
  GetContactByPhoneResponse,
  ListContactsResponse,
} from "@riri/shared";
import { getContactByPhone, listContacts } from "../lib/supabase.js";

export const contactRoutes = new Hono();

contactRoutes.get("/", async (c) => {
  const limitRaw = c.req.query("limit");
  const limit = limitRaw ? Number(limitRaw) : 50;
  const contacts = await listContacts(Number.isFinite(limit) ? limit : 50);
  const res: ListContactsResponse = { contacts };
  return c.json(res);
});

contactRoutes.get("/by-phone/:phone", async (c) => {
  const phone = decodeURIComponent(c.req.param("phone"));
  const contact = await getContactByPhone(phone);
  const res: GetContactByPhoneResponse = { contact };
  return c.json(res);
});
