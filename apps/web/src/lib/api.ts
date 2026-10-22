export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  message: string;
  website?: string; // honeypot, must stay empty
};

export async function submitContact(payload: ContactPayload): Promise<void> {
  const res = await fetch(`${API_URL}/v1/leads/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, landing_page: window.location.pathname, referrer: document.referrer || null }),
  });
  if (!res.ok) {
    throw new Error(`Contact request failed with status ${res.status}`);
  }
}
