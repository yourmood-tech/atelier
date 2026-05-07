import { echangerCodeContreTokens } from "@/lib/produits/dash";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return renduPage(
      `Dash a refusé l'autorisation`,
      `<pre>${escapeHtml(error)}\n${escapeHtml(errorDescription || "")}</pre>`
    );
  }
  if (!code) {
    return renduPage(
      `Pas de code reçu`,
      `<p>Dash n'a pas envoyé de code d'autorisation. Réessaie depuis <code>/api/produits/dash-auth-init</code>.</p>`
    );
  }

  try {
    const host = request.headers.get("host");
    const tokens = await echangerCodeContreTokens(code, host);
    if (!tokens.refresh_token) {
      return renduPage(
        `Pas de refresh_token reçu`,
        `<p>Dash a renvoyé un access_token mais pas de refresh_token. Vérifie que le scope <code>offline_access</code> est bien activé.</p>
         <pre>${escapeHtml(JSON.stringify(tokens, null, 2).slice(0, 500))}</pre>`
      );
    }

    return renduPage(
      `Autorisation Dash réussie`,
      `
      <p>Voici ton <strong>refresh_token</strong> Dash. <em>C'est l'unique fois où tu le verras</em> — copie-le maintenant.</p>

      <h3>Refresh Token (à copier dans Vercel)</h3>
      <textarea readonly style="width:100%;min-height:120px;font-family:monospace;font-size:0.75rem;padding:0.6rem;border:1px solid #c9a87c;border-radius:8px;">${escapeHtml(tokens.refresh_token)}</textarea>

      <h3>Étapes suivantes</h3>
      <ol style="line-height:1.8;">
        <li>Copie le refresh_token ci-dessus (clic dans la zone, Cmd+A, Cmd+C)</li>
        <li>Va sur <a href="https://vercel.com/philippe-2866s-projects/katana-scanner-mvp/settings/environment-variables" target="_blank">Vercel → Settings → Environment Variables</a></li>
        <li>Ajoute une variable : <strong>DASH_REFRESH_TOKEN</strong> = (colle ici), type Sensitive, target Production (+ Preview)</li>
        <li>Save, puis redéploie</li>
      </ol>

      <p style="color:#8a8a8a;font-size:0.85rem;margin-top:2rem;">Une fois fait, l'app gérera l'auth Dash toute seule.</p>
    `
    );
  } catch (e) {
    return renduPage(
      `Échange du code échoué`,
      `<pre>${escapeHtml(String((e as Error)?.message || e))}</pre>`
    );
  }
}

function renduPage(titre: string, contenu: string): Response {
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Dash — ${escapeHtml(titre)}</title>
<style>
body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; background: #f5e6e0; margin: 0; padding: 2rem; line-height: 1.5; }
.container { max-width: 700px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
h1 { font-weight: 300; color: #2a2a2a; }
h3 { margin-top: 1.5rem; }
pre { background: #fafafa; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.8rem; white-space: pre-wrap; }
a { color: #c9a87c; }
</style></head>
<body><div class="container"><h1>${escapeHtml(titre)}</h1>${contenu}</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
