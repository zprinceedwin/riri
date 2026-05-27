/**
 * Resend transactional email -- raw fetch (no SDK).
 *
 * Used for booking confirmation emails after Sofia closes a call. Best-effort:
 * if the API key is missing or the request fails, we log and return
 * `{ ok: false }` -- the booking flow MUST still succeed. Voice should never
 * be blocked by email.
 *
 * Resend docs: https://resend.com/docs/api-reference/emails/send-email
 */
import { getEnv } from "../env.js";

interface SendBookingConfirmationArgs {
  to: string;
  name: string;
  serviceName: string;
  doctorName: string;
  clinicName: string;
  scheduledFor: string;
  durationMin: number;
  addressLine: string;
  priceCents?: number;
  callId?: string;
}

export interface ResendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const ENDPOINT = "https://api.resend.com/emails";

export async function sendBookingConfirmation(
  args: SendBookingConfirmationArgs
): Promise<ResendResult> {
  let env;
  try {
    env = getEnv();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `env_unavailable: ${detail}` };
  }

  if (!env.RESEND_API_KEY) {
    return { ok: false, error: "resend_api_key_missing" };
  }

  const html = renderHtml(args);
  const text = renderText(args);

  const body = {
    from: env.RESEND_FROM_EMAIL,
    to: [args.to],
    subject: `Confirmed: ${args.serviceName} at ${args.clinicName}`,
    html,
    text,
    headers: args.callId
      ? { "X-Riri-Call-Id": args.callId }
      : undefined,
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[resend.sendBookingConfirmation] ${res.status} ${res.statusText} -- ${detail}`
      );
      return { ok: false, error: `${res.status}: ${detail || res.statusText}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[resend.sendBookingConfirmation] fetch failed:", detail);
    return { ok: false, error: detail };
  }
}

function formatScheduledFor(iso: string): string {
  // Manila is UTC+8 -- format with explicit Manila locale so the email reads
  // naturally for the caller and we don't depend on whatever timezone the
  // serverless container happens to run in.
  try {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function renderText(args: SendBookingConfirmationArgs): string {
  const when = formatScheduledFor(args.scheduledFor);
  const lines = [
    `Hi ${args.name},`,
    "",
    `You're confirmed for ${args.serviceName} with ${args.doctorName} at ${args.clinicName}.`,
    "",
    `When:     ${when}`,
    `Duration: ${args.durationMin} minutes`,
    `Where:    ${args.addressLine}`,
    "",
    "Need to reschedule or cancel? Reply to this email or call us back and we'll take care of it.",
    "",
    `— The ${args.clinicName} team`,
  ];
  return lines.join("\n");
}

function renderHtml(args: SendBookingConfirmationArgs): string {
  const when = formatScheduledFor(args.scheduledFor);
  const price =
    typeof args.priceCents === "number"
      ? formatPhp(args.priceCents)
      : null;
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Booking confirmed</title></head>
  <body style="margin:0;padding:0;background:#0a0d14;color:#e6e8ec;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d14;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#10131b;border:1px solid #272c38;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 0 28px;">
                <div style="display:inline-block;padding:6px 12px;border:1px solid rgba(233,168,46,0.3);background:rgba(233,168,46,0.1);color:#f4c352;border-radius:9999px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;">Booking confirmed</div>
                <h1 style="margin:18px 0 4px;font-size:24px;line-height:1.25;color:#f4f5f7;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(args.serviceName)}</h1>
                <p style="margin:0;color:#9aa1ad;font-size:14px;line-height:1.55;">Hi ${escapeHtml(args.name)} — you're locked in with ${escapeHtml(args.doctorName)} at ${escapeHtml(args.clinicName)}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(233,168,46,0.06);border:1px solid rgba(233,168,46,0.25);border-radius:12px;">
                  <tr><td style="padding:14px 16px;">
                    <div style="font-size:11px;color:#9aa1ad;text-transform:uppercase;letter-spacing:0.14em;">When</div>
                    <div style="font-size:15px;color:#f4f5f7;margin-top:2px;font-weight:600;">${escapeHtml(when)}</div>
                  </td></tr>
                  <tr><td style="padding:0 16px 14px 16px;">
                    <div style="font-size:11px;color:#9aa1ad;text-transform:uppercase;letter-spacing:0.14em;">Duration</div>
                    <div style="font-size:15px;color:#f4f5f7;margin-top:2px;">${args.durationMin} minutes</div>
                  </td></tr>
                  <tr><td style="padding:0 16px 14px 16px;">
                    <div style="font-size:11px;color:#9aa1ad;text-transform:uppercase;letter-spacing:0.14em;">Where</div>
                    <div style="font-size:15px;color:#f4f5f7;margin-top:2px;">${escapeHtml(args.addressLine)}</div>
                  </td></tr>
                  ${
                    price
                      ? `<tr><td style="padding:0 16px 14px 16px;">
                          <div style="font-size:11px;color:#9aa1ad;text-transform:uppercase;letter-spacing:0.14em;">Estimate</div>
                          <div style="font-size:15px;color:#f4f5f7;margin-top:2px;">${escapeHtml(price)}</div>
                        </td></tr>`
                      : ""
                  }
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px 28px;color:#c7cbd3;font-size:13px;line-height:1.6;">
                <p style="margin:0 0 8px;">Need to reschedule or cancel? Reply to this email or call us back — we'll take care of it.</p>
                <p style="margin:8px 0 0;">Looking forward to seeing you.</p>
                <p style="margin:18px 0 0;color:#6c7484;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">— The ${escapeHtml(args.clinicName)} team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function formatPhp(priceCents: number): string {
  const php = priceCents / 100;
  return `₱${php.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
