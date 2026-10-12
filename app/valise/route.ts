export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>La valise de Noël</title><meta name="robots" content="noindex,nofollow"></head><body>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@200;300;400;500&display=swap">
<style>
:root{
  --nuit:#20090e; --nuit2:#2d0d14; --creme:#f7f1e8; --or:#c9a46a; --rouge:#8e1f2f;
  --doux:rgba(247,241,232,.62); --ligne:rgba(201,164,106,.28);
  --titre:'Playfair Display',Georgia,'Times New Roman',serif;
  --texte:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--nuit);color:var(--creme);font-family:var(--texte);font-weight:300;
  line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:hidden}
#neige{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.halo{position:fixed;left:50%;top:-18vh;width:120vw;height:70vh;transform:translateX(-50%);
  background:radial-gradient(ellipse at center,rgba(142,31,47,.40),rgba(32,9,14,0) 68%);pointer-events:none;z-index:0}
main{position:relative;z-index:2;width:min(1120px,100%);margin:0 auto;padding:0 20px}

header{padding-block:clamp(50px,8vw,96px) clamp(18px,3vw,32px);text-align:center}
.sur{font-size:11px;letter-spacing:.38em;text-transform:uppercase;color:var(--or);margin:0 0 20px}
h1{font-family:var(--titre);font-weight:400;font-size:clamp(38px,8.4vw,74px);line-height:1.06;margin:0;text-wrap:balance}
h1 em{font-style:italic;color:var(--or)}
.prix-haut{margin:24px 0 0;font-size:clamp(17px,2.4vw,21px);letter-spacing:.05em}
.prix-haut b{font-weight:500}
.chapeau{margin:14px auto 0;max-width:34em;color:var(--doux);font-size:15px}

.grille{display:grid;grid-template-columns:1fr;gap:clamp(22px,3vw,34px);align-items:start;
  margin-top:clamp(26px,4vw,44px)}
@media(min-width:900px){.grille{grid-template-columns:1fr 360px}}

/* ——— les étapes ——— */
.etape{border-top:1px solid rgba(247,241,232,.10);padding:clamp(20px,2.8vw,28px) 0}
.etape:first-child{border-top:0;padding-top:0}
.tete{display:flex;align-items:baseline;gap:13px;flex-wrap:wrap}
.num{font-family:var(--titre);font-style:italic;color:var(--or);font-size:19px;min-width:1.3em}
.quoi{flex:1 1 220px;min-width:0;font-size:16px}
.val{color:var(--doux);font-size:13.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
.opts{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0 calc(1.3em + 13px)}
@media(max-width:520px){.opts{margin-left:0}}
.opt{display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:13px;color:var(--doux);
  background:transparent;border:1px solid rgba(247,241,232,.15);border-radius:999px;
  padding:7px 15px 7px 7px;cursor:pointer;white-space:nowrap;
  transition:border-color .2s ease,color .2s ease,background .2s ease,transform .15s ease}
.opt i{width:15px;height:15px;border-radius:50%;display:block;box-shadow:0 0 0 1px rgba(247,241,232,.25) inset}
.opt:hover{color:var(--creme);border-color:rgba(201,164,106,.55);transform:translateY(-1px)}
.opt[aria-pressed="true"]{color:var(--nuit);background:var(--or);border-color:var(--or);font-weight:400}
.opt[aria-pressed="true"] i{box-shadow:0 0 0 1px rgba(32,9,14,.35) inset}

/* ——— la valise ——— */
.valise{position:sticky;top:18px;background:linear-gradient(180deg,rgba(45,13,20,.96),rgba(32,9,14,.96));
  border:1px solid var(--ligne);border-radius:4px;padding:26px 24px 24px;box-shadow:0 30px 70px rgba(0,0,0,.45)}
.valise h2{font-family:var(--titre);font-weight:400;font-size:22px;margin:0;text-align:center}
.compte{text-align:center;color:var(--or);font-size:11px;letter-spacing:.26em;text-transform:uppercase;margin:7px 0 20px}
ul.dedans{list-style:none;margin:0;padding:0}
ul.dedans li{display:flex;align-items:flex-start;gap:10px;padding:11px 0;
  border-top:1px solid rgba(247,241,232,.08);font-size:13.5px;line-height:1.5}
ul.dedans li:first-child{border-top:0}
.coche{flex:0 0 auto;width:16px;height:16px;border-radius:50%;margin-top:3px;
  border:1px solid rgba(247,241,232,.22);display:grid;place-items:center;font-size:9px;color:var(--nuit)}
li.ok .coche{background:var(--or);border-color:var(--or)}
li.ok .coche::after{content:"✓"}
.ligne-txt{flex:1 1 auto;min-width:0;color:rgba(247,241,232,.38)}
li.ok .ligne-txt{color:var(--creme)}
.ligne-txt em{font-style:normal;display:block;font-size:12px;color:var(--doux);margin-top:1px}
.trait{height:1px;background:var(--ligne);margin:20px 0 0}
.total{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding-top:16px;font-size:14px;color:var(--doux)}
.ticket{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding-top:8px}
.ticket span{font-family:var(--titre);font-size:20px}
.ticket strong{font-family:var(--titre);font-weight:500;color:var(--or);font-size:38px;line-height:1}
.bouton{display:block;width:100%;text-align:center;margin-top:20px;background:var(--rouge);color:var(--creme);
  border:0;border-radius:2px;padding:16px 20px;letter-spacing:.14em;text-transform:uppercase;
  font-family:var(--texte);font-size:11.5px;cursor:pointer;transition:background .25s ease,opacity .25s ease}
.bouton:hover:not(:disabled){background:#a4283a}
.bouton:disabled{opacity:.34;cursor:not-allowed}
.mention{margin:28px auto 0;max-width:30em;color:rgba(247,241,232,.42);font-size:12px;line-height:1.65;text-align:center}
.pied{padding-bottom:clamp(50px,8vw,90px)}
</style>

<div class="halo"></div>
<canvas id="neige"></canvas>

<main>
  <header>
    <p class="sur">Édition de Noël · 2026</p>
    <h1>La valise <em>de Noël</em></h1>
    <p class="prix-haut"><b>400.–</b> · vous choisissez vous-même</p>
    <p class="chapeau">Cinq choix. Vous cliquez, ça part dans votre valise.</p>
  </header>

  <div class="grille">
    <section id="etapes"></section>

    <aside class="valise">
      <h2>Ma valise</h2>
      <p class="compte"><span id="fait">0</span> / 5 choisis</p>
      <ul class="dedans" id="dedans"></ul>
      <div class="trait"></div>
      <p class="total"><span>Valeur totale</span><span>693.–</span></p>
      <p class="ticket"><span>Le ticket</span><strong>400.–</strong></p>
      <button class="bouton" id="go" disabled>Je prends mon billet</button>
    </aside>
  </div>

  <div class="pied">
    <p class="mention">📷 Photo non contractuelle — les nuances peuvent varier légèrement en raison du travail artisanal.</p>
  </div>
</main>

<script>
(function(){
  var ETAPES=[
   {t:"1 base en acier unique — spéciale Noël", court:"Base acier spéciale Noël", v:"valeur 100.–",
    o:[{n:"extra small",c:"#cfd3d6"},{n:"small",c:"#cfd3d6"},{n:"large",c:"#cfd3d6"}]},
   {t:"1 Aura medium en argent 925", court:"Aura medium argent", v:"valeur 119.–",
    o:[{n:"bordeaux",c:"#6E1B2A"},{n:"céleste",c:"#A8C8E0"},{n:"authentique rose gold",c:"#E3B7A0"},
       {n:"coquelicot",c:"#D4342B"},{n:"sucre d'orge",c:"#F2A9B8"}]},
   {t:"1 pack de 2 minis Aura", court:"Pack de 2 minis Aura", v:"valeur 120.–",
    o:[{n:"coquelicot",c:"#D4342B"},{n:"sucre d'orge",c:"#F2A9B8"},{n:"givré",c:"#E8EEF2"},
       {n:"céleste",c:"#A8C8E0"},{n:"bordeaux",c:"#6E1B2A"}]},
   {t:"1 deux tiers en argent Aurheart", court:"Deux tiers Aurheart", v:"valeur 177.–",
    o:[{n:"rouge",c:"#9E1B2F"},{n:"sucre d'orge",c:"#F2A9B8"},{n:"givré",c:"#E8EEF2"},
       {n:"céleste",c:"#A8C8E0"},{n:"azure",c:"#4E8FD0"},{n:"white",c:"#F4F4F2"}]},
   {t:"1 deux tiers en argent Auraline", court:"Deux tiers Auraline", v:"valeur 177.–",
    o:[{n:"rouge",c:"#9E1B2F"},{n:"sucre d'orge",c:"#F2A9B8"},{n:"givré",c:"#E8EEF2"},{n:"white",c:"#F4F4F2"}]}
  ];
  var choix=new Array(ETAPES.length).fill(null);
  var zone=document.getElementById('etapes'), dedans=document.getElementById('dedans'),
      fait=document.getElementById('fait'), go=document.getElementById('go');

  ETAPES.forEach(function(e,i){
    var s=document.createElement('div'); s.className='etape';
    var h='<div class="tete"><span class="num">'+(i+1)+'</span><span class="quoi">'+e.t+'</span><span class="val">'+e.v+'</span></div><div class="opts">';
    e.o.forEach(function(op,j){
      h+='<button type="button" class="opt" aria-pressed="false" data-e="'+i+'" data-o="'+j+'"><i style="background:'+op.c+'"></i>'+op.n+'</button>';
    });
    s.innerHTML=h+'</div>'; zone.appendChild(s);
  });

  function rendu(){
    dedans.innerHTML='';
    ETAPES.forEach(function(e,i){
      var li=document.createElement('li');
      var pris=choix[i]!==null;
      li.className=pris?'ok':'';
      li.innerHTML='<span class="coche"></span><span class="ligne-txt">'+e.court+
        (pris?'<em>'+e.o[choix[i]].n+'</em>':'<em>à choisir</em>')+'</span>';
      dedans.appendChild(li);
    });
    var n=choix.filter(function(x){return x!==null}).length;
    fait.textContent=n; go.disabled = n<ETAPES.length;
  }

  zone.addEventListener('click',function(ev){
    var b=ev.target.closest('.opt'); if(!b) return;
    var i=+b.dataset.e, j=+b.dataset.o;
    choix[i] = (choix[i]===j) ? null : j;
    zone.querySelectorAll('.opt[data-e="'+i+'"]').forEach(function(x){
      x.setAttribute('aria-pressed', (+x.dataset.o===choix[i])?'true':'false');
    });
    rendu();
  });
  rendu();

  // la neige
  var c=document.getElementById('neige');
  if(c){
    var x=c.getContext('2d'), f=[], L=0, H=0, doux=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function taille(){ L=c.width=innerWidth*devicePixelRatio; H=c.height=innerHeight*devicePixelRatio;
      c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; }
    taille(); addEventListener('resize',taille);
    var n=doux?26:70;
    for(var i=0;i<n;i++) f.push({x:Math.random(),y:Math.random(),r:(Math.random()*1.7+.5)*devicePixelRatio,
      v:(Math.random()*.00035+.00012),o:Math.random()*.45+.12,d:Math.random()*6.28});
    (function dessine(t){
      x.clearRect(0,0,L,H);
      for(var i=0;i<f.length;i++){ var p=f[i];
        p.y+=p.v; if(p.y>1.05){p.y=-.05;p.x=Math.random();}
        var dx=Math.sin(t*0.00016+p.d)*0.006;
        x.beginPath(); x.arc((p.x+dx)*L,p.y*H,p.r,0,6.2832);
        x.fillStyle='rgba(247,241,232,'+p.o+')'; x.fill();
      }
      requestAnimationFrame(dessine);
    })(0);
  }
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
