export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9005";

export type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  message: string;
  consent: boolean;
  website?: string; // honeypot, must stay empty
  turnstile_token?: string; // Cloudflare's "are you human" check, when it's switched on
};

/** Cloudflare Turnstile site key. Empty means the check is off (it must match TURNSTILE_SECRET in the API). */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** A refused submission whose message is meant for the visitor (too many messages, failed check). */
export class ContactError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

/** Campaign tags in the current page's link. Read from the URL only; nothing is stored in the browser. */
function campaignTags(): Record<string, string> | null {
  const params = new URLSearchParams(window.location.search);
  const tags = Object.fromEntries(UTM_KEYS.flatMap((k) => (params.get(k) ? [[k, params.get(k)!.slice(0, 100)]] : [])));
  return Object.keys(tags).length ? tags : null;
}

export async function submitContact(payload: ContactPayload): Promise<void> {
  const res = await fetch(`${API_URL}/v1/leads/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      landing_page: window.location.pathname,
      referrer: document.referrer || null,
      utm: campaignTags(),
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // not JSON
    }
    throw new ContactError(res.status, detail || `Contact request failed with status ${res.status}`);
  }
}
