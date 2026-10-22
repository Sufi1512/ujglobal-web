export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  message: string;
  consent: boolean;
  website?: string; // honeypot, must stay empty
};

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
    throw new Error(`Contact request failed with status ${res.status}`);
  }
}
