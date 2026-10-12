export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>La valise de Noël</title><meta name="robots" content="noindex,nofollow"></head><body>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@200;300;400;500&display=swap">
<style>
:root{
  --nuit:#20090e;
  --nuit2:#2d0d14;
  --creme:#f7f1e8;
  --or:#c9a46a;
  --rouge:#8e1f2f;
  --doux:rgba(247,241,232,.62);
  --ligne:rgba(201,164,106,.28);
  --titre:'Playfair Display',Georgia,'Times New Roman',serif;
  --texte:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:var(--nuit);color:var(--creme);
  font-family:var(--texte);font-weight:300;line-height:1.7;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
#neige{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.halo{position:fixed;left:50%;top:-18vh;width:120vw;height:70vh;transform:translateX(-50%);
  background:radial-gradient(ellipse at center,rgba(142,31,47,.40),rgba(32,9,14,0) 68%);
  pointer-events:none;z-index:0}
main{position:relative;z-index:2;width:min(880px,100%);margin:0 auto;padding:0 20px}

/* ——— haut de page ——— */
header{padding-block:clamp(54px,9vw,104px) clamp(22px,3.4vw,38px);text-align:center}
.sur{font-size:11px;letter-spacing:.38em;text-transform:uppercase;color:var(--or);margin:0 0 22px}
h1{font-family:var(--titre);font-weight:400;font-size:clamp(38px,8.4vw,74px);line-height:1.06;
  margin:0;text-wrap:balance}
h1 em{font-style:italic;color:var(--or)}
.prix-haut{margin:26px 0 0;font-size:clamp(17px,2.4vw,21px);letter-spacing:.05em}
.prix-haut b{font-weight:500}
.chapeau{margin:16px auto 0;max-width:34em;color:var(--doux);font-size:15px}

/* ——— le billet ——— */
.billet{
  position:relative;margin:clamp(26px,4vw,44px) 0 0;
  background:linear-gradient(180deg,rgba(45,13,20,.96),rgba(32,9,14,.96));
  border:1px solid var(--ligne);border-radius:4px;
  padding:clamp(26px,4.4vw,48px) clamp(20px,4vw,52px);
  box-shadow:0 30px 70px rgba(0,0,0,.45);
}
.billet::before,.billet::after{
  content:"";position:absolute;width:26px;height:26px;border-radius:50%;
  background:var(--nuit);border:1px solid var(--ligne);top:calc(50% - 13px)}
.billet::before{left:-14px;clip-path:inset(0 0 0 50%)}
.billet::after{right:-14px;clip-path:inset(0 50% 0 0)}
.billet h2{font-family:var(--titre);font-weight:400;font-size:clamp(21px,3vw,27px);
  margin:0 0 6px;text-align:center}
.billet .sous{text-align:center;color:var(--doux);font-size:13.5px;letter-spacing:.04em;margin:0 0 clamp(22px,3.4vw,34px)}

ul.choix{list-style:none;margin:0;padding:0}
ul.choix li{
  display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;
  padding:19px 0;border-top:1px solid rgba(247,241,232,.09);
}
ul.choix li:first-child{border-top:0}
.num{flex:0 0 auto;font-family:var(--titre);font-style:italic;color:var(--or);
  font-size:19px;min-width:1.4em}
.quoi{flex:1 1 230px;min-width:0;font-size:15.5px;color:var(--creme)}
.quoi small{display:block;color:var(--doux);font-size:13px;margin-top:3px;letter-spacing:.01em}
.val{flex:0 0 auto;color:var(--doux);font-size:14px;white-space:nowrap;
  font-variant-numeric:tabular-nums}

.opts{display:flex;flex-wrap:wrap;gap:7px 8px;margin-top:11px}
.opts b{display:inline-flex;align-items:center;gap:6px;font-weight:300;font-size:12.5px;
  color:var(--doux);border:1px solid rgba(247,241,232,.13);border-radius:999px;padding:4px 11px 4px 5px;
  white-space:nowrap}
.opts i{width:13px;height:13px;border-radius:50%;display:block;
  box-shadow:0 0 0 1px rgba(247,241,232,.25) inset}
.pastilles{display:flex;gap:7px;margin-top:9px}
.pastilles i{width:15px;height:15px;border-radius:50%;display:block;
  box-shadow:0 0 0 1px rgba(247,241,232,.22) inset,0 2px 6px rgba(0,0,0,.4)}

.trait{height:1px;background:var(--ligne);margin:clamp(22px,3.4vw,32px) 0 0}
.total{display:flex;justify-content:space-between;align-items:baseline;gap:16px;
  padding-top:20px;font-size:15px;color:var(--doux)}
.total b{font-weight:400}
.ticket{display:flex;justify-content:space-between;align-items:baseline;gap:16px;
  padding-top:10px}
.ticket span{font-family:var(--titre);font-size:clamp(19px,2.6vw,23px)}
.ticket strong{font-family:var(--titre);font-weight:500;color:var(--or);
  font-size:clamp(30px,5.4vw,44px);line-height:1}

/* ——— bas ——— */
.pied{text-align:center;padding:clamp(34px,5vw,58px) 0 clamp(54px,8vw,90px)}
.bouton{display:inline-block;text-decoration:none;background:var(--rouge);color:var(--creme);
  padding:16px 40px;border-radius:2px;letter-spacing:.14em;text-transform:uppercase;
  font-size:11.5px;font-weight:400;transition:background .25s ease,transform .25s ease}
.bouton:hover{background:#a4283a;transform:translateY(-1px)}
.mention{margin:18px auto 0;max-width:30em;color:rgba(247,241,232,.42);font-size:12px;line-height:1.65}

@media (max-width:520px){
  .val{flex-basis:100%;margin-left:calc(1.4em + 14px)}
  .billet::before,.billet::after{display:none}
}
</style>

<div class="halo"></div>
<canvas id="neige"></canvas>

<main>
  <header>
    <p class="sur">Édition de Noël · 2026</p>
    <h1>La valise <em>de Noël</em></h1>
    <p class="prix-haut"><b>400.–</b> · la cliente choisit elle-même</p>
    <p class="chapeau">Un billet, une valise. Vous décidez de ce qu'il y a dedans, pièce par pièce.</p>
  </header>

  <section class="billet">
    <h2>Ce que vous emportez</h2>
    <p class="sous">Cinq choix. Tous en stock.</p>

    <ul class="choix">
      <li>
        <span class="num">1</span>
        <span class="quoi">1 base en acier unique — spéciale Noël
          <small>extra small, small ou large</small></span>
        <span class="val">valeur 100.–</span>
      </li>
      <li>
        <span class="num">2</span>
        <span class="quoi">1 Aura medium en argent 925, à choix
          <span class="opts">
            <b><i style="background:#6E1B2A"></i>bordeaux</b>
            <b><i style="background:#A8C8E0"></i>céleste</b>
            <b><i style="background:#E3B7A0"></i>authentique rose gold</b>
            <b><i style="background:#D4342B"></i>coquelicot</b>
            <b><i style="background:#F2A9B8"></i>sucre d'orge</b>
          </span></span>
        <span class="val">valeur 119.–</span>
      </li>
      <li>
        <span class="num">3</span>
        <span class="quoi">1 pack de 2 minis Aura, à choix
          <span class="opts">
            <b><i style="background:#D4342B"></i>coquelicot</b>
            <b><i style="background:#F2A9B8"></i>sucre d'orge</b>
            <b><i style="background:#E8EEF2"></i>givré</b>
            <b><i style="background:#A8C8E0"></i>céleste</b>
            <b><i style="background:#6E1B2A"></i>bordeaux</b>
          </span></span>
        <span class="val">valeur 120.–</span>
      </li>
      <li>
        <span class="num">4</span>
        <span class="quoi">1 deux tiers en argent Aurheart, à choix
          <span class="opts">
            <b><i style="background:#9E1B2F"></i>rouge</b>
            <b><i style="background:#F2A9B8"></i>sucre d'orge</b>
            <b><i style="background:#E8EEF2"></i>givré</b>
            <b><i style="background:#A8C8E0"></i>céleste</b>
            <b><i style="background:#4E8FD0"></i>azure</b>
            <b><i style="background:#F4F4F2"></i>white</b>
          </span></span>
        <span class="val">valeur 177.–</span>
      </li>
      <li>
        <span class="num">5</span>
        <span class="quoi">1 deux tiers en argent Auraline, à choix
          <span class="opts">
            <b><i style="background:#9E1B2F"></i>rouge</b>
            <b><i style="background:#F2A9B8"></i>sucre d'orge</b>
            <b><i style="background:#E8EEF2"></i>givré</b>
            <b><i style="background:#F4F4F2"></i>white</b>
          </span></span>
        <span class="val">valeur 177.–</span>
      </li>
    </ul>

    <div class="trait"></div>
    <p class="total"><b>Valeur totale</b><b>693.–</b></p>
    <p class="ticket"><span>Le ticket</span><strong>400.–</strong></p>
  </section>

  <div class="pied">
    <a class="bouton" href="#">Je prends mon billet</a>
    <p class="mention">📷 Photo non contractuelle — les nuances peuvent varier légèrement en raison du travail artisanal.</p>
  </div>
</main>

<script>
(function(){
  var c=document.getElementById('neige'); if(!c) return;
  var x=c.getContext('2d'), f=[], L=0, H=0, doux=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function taille(){ L=c.width=innerWidth*devicePixelRatio; H=c.height=innerHeight*devicePixelRatio;
    c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; }
  taille(); addEventListener('resize',taille);
  var n=doux?26:70;
  for(var i=0;i<n;i++) f.push({x:Math.random(),y:Math.random(),r:(Math.random()*1.7+.5)*devicePixelRatio,
    v:(Math.random()*.00035+.00012),o:Math.random()*.45+.12,d:Math.random()*6.28});
  function dessine(t){
    x.clearRect(0,0,L,H);
    for(var i=0;i<f.length;i++){ var p=f[i];
      p.y+=p.v; if(p.y>1.05){p.y=-.05;p.x=Math.random();}
      var dx=Math.sin(t*0.00016+p.d)*0.006;
      x.beginPath(); x.arc((p.x+dx)*L,p.y*H,p.r,0,6.2832);
      x.fillStyle='rgba(247,241,232,'+p.o+')'; x.fill();
    }
    requestAnimationFrame(dessine);
  }
  requestAnimationFrame(dessine);
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
