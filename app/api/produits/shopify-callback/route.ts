import { echangerCodeContreShopifyToken } from "@/lib/produits/shopify-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");
  const error = url.searchParams.get("error");

  if (error) {
    return renduPage(
      "Shopify a refusé l'autorisation",
      `<pre>${escapeHtml(error)}</pre>`
    );
  }
  if (!code || !shop) {
    return renduPage(
      "Paramètres manquants",
      `<p>Le callback Shopify n'a pas reçu <code>code</code> ou <code>shop</code>.</p>`
    );
  }

  try {
    const tokens = await echangerCodeContreShopifyToken(code, shop);
    const varName = shop.includes("moodjoaillerie")
      ? "MOODJOAILLERIE_SHOPIFY_ACCESS_TOKEN"
      : shop.includes("yourmood")
      ? "MOOD_SHOPIFY_ACCESS_TOKEN"
      : "SHOPIFY_ACCESS_TOKEN";
    const domainName = shop.includes("moodjoaillerie")
      ? "MOODJOAILLERIE_SHOPIFY_DOMAIN"
      : shop.includes("yourmood")
      ? "MOOD_SHOPIFY_DOMAIN"
      : "SHOPIFY_DOMAIN";

    return renduPage(
      "Autorisation Shopify réussie",
      `
      <p>Voici l'<strong>Admin API access token</strong> pour <code>${escapeHtml(shop)}</code>. Copie-le maintenant.</p>

      <h3>Access Token (à copier dans Vercel)</h3>
      <textarea readonly style="width:100%;min-height:80px;font-family:monospace;font-size:0.75rem;padding:0.6rem;border:1px solid #c9a87c;border-radius:8px;">${escapeHtml(tokens.access_token)}</textarea>

      <p style="margin-top:0.5rem;color:#8a8a8a;font-size:0.85rem;">Scopes accordés : <code>${escapeHtml(tokens.scope)}</code></p>

      <h3>Étapes suivantes</h3>
      <ol style="line-height:1.8;">
        <li>Copie le token ci-dessus</li>
        <li>Va sur <a href="https://vercel.com/philippe-2866s-projects/katana-scanner-mvp/settings/environment-variables" target="_blank">Vercel → Settings → Environment Variables</a></li>
        <li>Ajoute (ou remplace) :
          <ul>
            <li><code>${escapeHtml(varName)}</code> = (colle le token), type <strong>Sensitive</strong>, target Production (+ Preview)</li>
            <li><code>${escapeHtml(domainName)}</code> = <code>${escapeHtml(shop)}</code></li>
          </ul>
        </li>
        <li>Save → redéploie</li>
      </ol>
    `
    );
  } catch (e) {
    return renduPage(
      "Échange du code Shopify échoué",
      `<pre>${escapeHtml(String((e as Error)?.message || e))}</pre>`
    );
  }
}

function renduPage(titre: string, contenu: string): Response {
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Shopify — ${escapeHtml(titre)}</title>
<style>
body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; background: #f5e6e0; margin: 0; padding: 2rem; line-height: 1.5; }
.container { max-width: 700px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
h1 { font-weight: 300; color: #2a2a2a; }
h3 { margin-top: 1.5rem; }
pre { background: #fafafa; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.8rem; white-space: pre-wrap; }
a { color: #c9a87c; }
code { background: #fafafa; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; }
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
