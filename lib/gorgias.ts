const DOMAIN = process.env.GORGIAS_DOMAIN ?? "yourmood";
const API_EMAIL = process.env.GORGIAS_API_EMAIL!;
const API_KEY = process.env.GORGIAS_API_KEY!;

// Gorgias est derrière Cloudflare : sans signature d'outil connue, refus « 1010 ».
const UA = "curl/8.7.1";

function auth() {
  return `Basic ${Buffer.from(`${API_EMAIL}:${API_KEY}`).toString("base64")}`;
}

async function gorgiasGet(path: string) {
  // Support both "yourmood" and "yourmood.gorgias.com" in env var
  const domain = DOMAIN.includes(".") ? DOMAIN : `${DOMAIN}.gorgias.com`;
  const url = `https://${domain}/api${path}`;
  const res = await fetch(url, {
    headers: { Authorization: auth(), "Content-Type": "application/json", "User-Agent": UA },
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
    headers: { Authorization: auth(), "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gorgias ${res.status} on ${url}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function hasExistingDraftNote(ticketId: number): Promise<boolean> {
  const data = await gorgiasGet(`/messages?ticket_id=${ticketId}&limit=50`) as {
    data?: Record<string, unknown>[];
  };
  const messages = data?.data ?? [];
  return messages.some(
    (m) =>
      m.channel === "internal-note" &&
      typeof m.body_text === "string" &&
      m.body_text.startsWith("🤖 AI Draft")
  );
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

async function gorgiasPut(path: string, body: unknown) {
  const domain = DOMAIN.includes(".") ? DOMAIN : `${DOMAIN}.gorgias.com`;
  const url = `https://${domain}/api${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: auth(), "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gorgias ${res.status} on ${url}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function getTicket(ticketId: number): Promise<Record<string, unknown>> {
  return gorgiasGet(`/tickets/${ticketId}`) as Promise<Record<string, unknown>>;
}

/** Tickets d'une vue Gorgias (toutes les pages). La vue « Inbox » (1408971) = tickets ouverts
 *  attribués à l'utilisateur de la clé, ici philippe@yourmood.net = son inbox exacte. */
export async function ticketsDeLaVue(viewId: number): Promise<number[]> {
  const ids: number[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 20; i++) {
    const d = await gorgiasGet(`/views/${viewId}/items?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`) as { data?: { id: number }[]; meta?: { next_cursor?: string | null } };
    ids.push(...(d.data ?? []).map((t) => Number(t.id)));
    cursor = d.meta?.next_cursor ?? null;
    if (!cursor) break;
  }
  return ids;
}

/** Messages du ticket, du plus ancien au plus récent. */
export async function getTicketMessages(ticketId: number): Promise<Record<string, unknown>[]> {
  const d = await gorgiasGet(`/tickets/${ticketId}/messages?limit=50&order_by=created_datetime:asc`) as { data?: Record<string, unknown>[] };
  return d?.data ?? [];
}

/** Attribue le ticket à un agent (par son identifiant Gorgias). */
export async function assignTicket(ticketId: number, userId: number): Promise<void> {
  await gorgiasPut(`/tickets/${ticketId}`, { assignee_user: { id: userId } });
}

export async function closeTicket(ticketId: number): Promise<void> {
  await gorgiasPut(`/tickets/${ticketId}`, { status: "closed" });
}

/** Envoie une vraie réponse e-mail à la cliente, au nom d'un agent, depuis l'adresse du support. */
export async function sendEmailReply(p: {
  ticketId: number; agentId: number; fromAddress: string; fromName: string;
  toAddress: string; toName: string; subject: string; text: string;
}): Promise<void> {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = p.text.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`).join("");
  await gorgiasPost(`/tickets/${p.ticketId}/messages`, {
    channel: "email", via: "api", from_agent: true,
    sender: { id: p.agentId },
    receiver: { email: p.toAddress },
    source: { type: "email", from: { address: p.fromAddress, name: p.fromName }, to: [{ address: p.toAddress, name: p.toName }] },
    subject: p.subject,
    body_text: p.text,
    body_html: html,
  });
}
