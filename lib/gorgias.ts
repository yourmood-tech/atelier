const DOMAIN = process.env.GORGIAS_DOMAIN ?? "yourmood";
const API_EMAIL = process.env.GORGIAS_API_EMAIL!;
const API_KEY = process.env.GORGIAS_API_KEY!;

function auth() {
  return `Basic ${Buffer.from(`${API_EMAIL}:${API_KEY}`).toString("base64")}`;
}

async function gorgiasPost(path: string, body: unknown) {
  const res = await fetch(`https://${DOMAIN}.gorgias.com/api/v2${path}`, {
    method: "POST",
    headers: {
      Authorization: auth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gorgias ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function postInternalNote(ticketId: number, text: string): Promise<void> {
  const html = `<p>${text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
  await gorgiasPost(`/tickets/${ticketId}/messages`, {
    channel: "internal-note",
    body_html: html,
    body_text: text,
  });
}
