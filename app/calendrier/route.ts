export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Le calendrier mood</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root{--bleu:#2E5375;--or:#B8912F;--orclair:#E6CB92;--doux:#6A7A86;--papier:#F7F5F0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{min-height:100vh;color:#2B4D6B;font-family:Poppins,system-ui,sans-serif;font-weight:300;
  background:linear-gradient(180deg,#DCE8F1 0%,#EFF4F8 46%,#F7F5F0 100%)}
.wrap{width:min(1080px,100%);margin:0 auto;padding:0 18px}
header{text-align:center;padding:52px 18px 10px}
.kick{font-size:10px;letter-spacing:.42em;text-transform:uppercase;color:var(--or)}
h1{font-family:Playfair Display,serif;font-weight:400;font-size:clamp(32px,5vw,54px);margin:14px 0 0;line-height:1.08;color:#2B4D6B}
h1 em{font-style:italic;color:#A8863A}
.sous{max-width:44ch;margin:16px auto 0;font-size:13.5px;line-height:1.9;color:#52728C}
.maison{position:relative;margin:34px auto 0;max-width:900px}
.maison img{width:100%;height:auto;display:block}
.pied{text-align:center;padding:28px 18px 70px;font-size:11px;letter-spacing:.14em;color:#8DA3B5}
</style></head><body>

<header>
  <div class="kick">décembre 2026</div>
  <h1>Le calendrier<br><em>mood</em></h1>
  <p class="sous">Vingt-quatre cases. Derrière chacune, une surprise — un polymère, un aluminium, un serti.</p>
</header>

<div class="wrap">
  <div class="maison"><img src="/calendrier/maison.jpg" alt="Le calendrier mood, maison de 24 tiroirs"></div>
  <p class="pied">Maquette — la maison seule pour l'instant</p>
</div>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
