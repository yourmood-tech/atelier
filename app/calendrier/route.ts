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
.wrap{width:min(1320px,100%);margin:0 auto;padding:0 18px}
header{text-align:center;padding:26px 18px 4px}
.kick{font-size:10px;letter-spacing:.42em;text-transform:uppercase;color:var(--or)}
h1{font-family:Playfair Display,serif;font-weight:400;font-size:clamp(26px,3.4vw,40px);margin:9px 0 0;line-height:1.1;color:#2B4D6B}
h1 em{font-style:italic;color:#A8863A}
.sous{max-width:52ch;margin:10px auto 0;font-size:12px;line-height:1.7;color:#52728C}
.maison{position:relative;margin:34px auto 0;max-width:900px}
.maison img{width:100%;height:auto;display:block}

.duo{display:grid;grid-template-columns:1.38fr .62fr;gap:28px;align-items:start;margin-top:22px}
@media(max-width:900px){.duo{grid-template-columns:1fr;gap:26px}}
.liste{background:#fff;border:1px solid rgba(46,83,117,.10);border-radius:14px;padding:16px 18px;box-shadow:0 14px 40px rgba(46,83,117,.08);columns:2;column-gap:20px}
@media(max-width:900px){.liste{columns:2}}@media(max-width:560px){.liste{columns:1}}
.lg{column-span:all;display:flex;gap:14px;flex-wrap:wrap;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#8DA3B5;
  padding-bottom:9px;border-bottom:1px solid rgba(46,83,117,.10);margin-bottom:4px}
.lg span{display:flex;align-items:center;gap:7px}
i.p{width:9px;height:9px;border-radius:50%;display:inline-block}
i.or,.n.or{background:linear-gradient(145deg,#E6CB92,#B8912F)}
i.glace,.n.glace{background:linear-gradient(145deg,#DCE9F3,#A9C4D8)}
.grp{margin-top:10px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid}
.grp h3{font-family:Playfair Display,serif;font-weight:400;font-size:12.5px;color:#2B4D6B;margin:0 0 4px}
.grp ul{list-style:none;margin:0;padding:0}
.grp li{display:flex;align-items:center;gap:8px;padding:2.5px 0;font-size:10.8px;line-height:1.3;color:#43637E}
.n{flex:none;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:Playfair Display,serif;font-size:9.5px;color:#2B4D6B;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
.n.or{color:#4A3A10}
.pied{text-align:center;padding:14px 18px 24px;font-size:10px;letter-spacing:.14em;color:#8DA3B5}
</style></head><body>

<header>
  <div class="kick">décembre 2026</div>
  <h1>Le calendrier<br><em>mood</em></h1>
  <p class="sous">Vingt-quatre cases. Derrière chacune, une surprise — un polymère, un aluminium, un serti.</p>
</header>

<div class="wrap">
  <div class="duo">
    <div class="maison"><img src="/calendrier/maison.jpg" alt="Le calendrier mood, maison de 24 tiroirs"></div>
    <aside class="liste">
      <div class="lg"><span><i class="p or"></i>impairs · doré</span><span><i class="p glace"></i>pairs · bleu glacé</span></div>
      <section class="grp"><h3>Acier découpé</h3><ul><li><span class="n or">01</span><span class="t">Les douceurs</span></li><li><span class="n glace">08</span><span class="t">Brille doucement</span></li></ul></section>
<section class="grp"><h3>Polymère</h3><ul><li><span class="n glace">02</span><span class="t">Rencontrent le givre</span></li><li><span class="n glace">04</span><span class="t">Avec la neige</span></li><li><span class="n or">05</span><span class="t">Noël s'éveille</span></li><li><span class="n or">09</span><span class="t">Le ciel s'embrase</span></li><li><span class="n glace">10</span><span class="t">Sur les Alpes</span></li><li><span class="n or">13</span><span class="t">Sous le sapin</span></li></ul></section>
<section class="grp"><h3>Aluminium</h3><ul><li><span class="n or">03</span><span class="t">Le rouge apparaît</span></li><li><span class="n glace">12</span><span class="t">Perce la nuit</span></li><li><span class="n or">15</span><span class="t">Les cerfs avancent</span></li><li><span class="n glace">16</span><span class="t">Sous les étoiles</span></li></ul></section>
<section class="grp"><h3>Aluminium serti</h3><ul><li><span class="n or">19</span><span class="t">Les flocons dansent</span></li><li><span class="n glace">24</span><span class="t">À minuit</span></li></ul></section>
<section class="grp"><h3>Aura</h3><ul><li><span class="n glace">14</span><span class="t">La glace scintille</span></li><li><span class="n or">23</span><span class="t">La magie commence</span></li></ul></section>
<section class="grp"><h3>Clip & Drop</h3><ul><li><span class="n glace">06</span><span class="t">Vêtu de bleu</span></li><li><span class="n or">11</span><span class="t">Une lumière</span></li><li><span class="n or">17</span><span class="t">Un éclat</span></li><li><span class="n glace">22</span><span class="t">Une dernière fois</span></li></ul></section>
<section class="grp"><h3>Nacre</h3><ul><li><span class="n or">07</span><span class="t">Une lueur</span></li><li><span class="n glace">20</span><span class="t">Dans le bleu</span></li></ul></section>
<section class="grp"><h3>Acier</h3><ul><li><span class="n glace">18</span><span class="t">Traverse la forêt</span></li><li><span class="n or">21</span><span class="t">Noël scintille</span></li></ul></section>
    </aside>
  </div>
  <p class="pied">Maquette — les pièces ne sont pas encore définitives</p>
</div>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
