const DOMAIN = process.env.GORGIAS_DOMAIN ?? "yourmood";
const API_EMAIL = process.env.GORGIAS_API_EMAIL!;
const API_KEY = process.env.GORGIAS_API_KEY!;

function auth() {
  return `Basic ${Buffer.from(`${API_EMAIL}:${API_KEY}`).toString("base64")}`;
}

async function gorgiasGet(path: string) {
  // Support both "yourmood" and "yourmood.gorgias.com" in env var
  const domain = DOMAIN.includes(".") ? DOMAIN : `${DOMAIN}.gorgias.com`;
  const url = `https://${domain}/api${path}`;
  const res = await fetch(url, {
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gorgias ${res.status} on ${url}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getTicketSubject(ticketId: number): Promise<string | null> {
  const data = await gorgiasGet(`/tickets/${ticketId}`) as Record<string, unknown>;
  return (data?.subject as string | null) ?? null;
}

export async function getTicketCustomerMessages(
  ticketId: number
): Promise<{ lastText: string; allText: string; senderEmail: string } | null> {
  const data = await gorgiasGet(`/messages?ticket_id=${ticketId}&limit=50`) as {
    data?: Record<string, unknown>[];
  };
  const messages = data?.data ?? [];
  const customerMsgs = messages.filter((m) => m.from_agent === false || m.from_agent === null);
  if (!customerMsgs.length) return null;

  const lastMsg = customerMsgs[customerMsgs.length - 1];
  return {
    lastText: (lastMsg.body_text as string) ?? "",
    allText: customerMsgs.map((m) => (m.body_text as string) ?? "").join("\n---\n"),
    senderEmail: ((lastMsg.sender as Record<string, unknown>)?.email as string) ?? "",
  };
}

async function gorgiasPost(path: string, body: unknown) {
  const domain = DOMAIN.includes(".") ? DOMAIN : `${DOMAIN}.gorgias.com`;
  const url = `https://${domain}/api${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gorgias ${res.status} on ${url}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function postInternalNote(ticketId: number, text: string): Promise<void> {
  const html = `<p>${text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
  await gorgiasPost(`/tickets/${ticketId}/messages`, {
    channel: "internal-note",
    body_html: html,
    body_text: text,
    sender: { email: process.env.GORGIAS_API_EMAIL! },
  });
}
