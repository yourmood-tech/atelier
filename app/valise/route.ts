export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>La valise de Noël</title><meta name="robots" content="noindex,nofollow"></head><body>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@200;300;400;500&display=swap">
<style>
:root{
  --nuit:#20090e; --creme:#f7f1e8; --or:#c9a46a; --rouge:#8e1f2f;
  --doux:rgba(247,241,232,.62); --ligne:rgba(201,164,106,.28);
  --titre:'Playfair Display',Georgia,'Times New Roman',serif;
  --texte:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
body{background:var(--nuit);color:var(--creme);font-family:var(--texte);font-weight:300;
  line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
#neige{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.halo{position:fixed;left:50%;top:-20vh;width:120vw;height:70vh;transform:translateX(-50%);
  background:radial-gradient(ellipse at center,rgba(142,31,47,.38),rgba(32,9,14,0) 68%);pointer-events:none;z-index:0}
main{position:relative;z-index:2;width:min(1280px,100%);margin:0 auto;padding:0 18px}

header{padding-block:clamp(26px,4vw,44px) clamp(10px,1.6vw,18px);text-align:center}
.sur{font-size:10px;letter-spacing:.36em;text-transform:uppercase;color:var(--or);margin:0 0 12px}
h1{font-family:var(--titre);font-weight:400;font-size:clamp(30px,5.4vw,52px);line-height:1.05;margin:0}
h1 em{font-style:italic;color:var(--or)}
.chapeau{margin:12px auto 0;max-width:40em;color:var(--doux);font-size:13.5px}
.brouillon{display:inline-block;margin-top:12px;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;
  color:rgba(247,241,232,.42);border:1px solid rgba(247,241,232,.16);border-radius:999px;padding:4px 12px}

/* ——— les cinq colonnes ——— */
.rangee{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:clamp(14px,2.2vw,24px)}
.col{min-width:0;display:flex;flex-direction:column}
.col h3{margin:0 0 2px;font-family:var(--titre);font-weight:400;font-size:14.5px;text-align:center;line-height:1.3}
.col .px{margin:0 0 9px;text-align:center;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--doux)}
.cage{position:relative;border:1px solid rgba(247,241,232,.11);border-radius:3px;overflow:hidden;
  background:rgba(45,13,20,.5)}
.cage::before,.cage::after{content:"";position:absolute;left:0;right:0;height:38px;pointer-events:none;z-index:2}
.cage::before{top:0;background:linear-gradient(rgba(32,9,14,.95),rgba(32,9,14,0))}
.cage::after{bottom:0;background:linear-gradient(rgba(32,9,14,0),rgba(32,9,14,.95))}
.piste{height:clamp(300px,46vh,430px);overflow-y:auto;scroll-behavior:smooth;scrollbar-width:none;
  padding:12px 10px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}
.piste::-webkit-scrollbar{display:none}
.carte{flex:0 0 auto;background:transparent;border:0;padding:0;cursor:pointer;font:inherit;
  color:var(--doux);text-align:center;transition:color .2s ease,transform .18s ease}
.carte:hover{color:var(--creme);transform:translateY(-2px)}
.rond{position:relative;width:100%;aspect-ratio:1/1;border-radius:3px;overflow:hidden;
  border:1px solid rgba(247,241,232,.14);display:grid;place-items:center;
  transition:border-color .2s ease,box-shadow .2s ease}
.rond img{width:100%;height:100%;object-fit:cover;display:block;background:#f3f1ee}
.rond .pastille{width:46%;aspect-ratio:1/1;border-radius:50%;display:block;
  box-shadow:0 0 0 1px rgba(32,9,14,.25) inset,0 8px 20px rgba(0,0,0,.45)}
.rond .avenir{position:absolute;bottom:6px;left:0;right:0;font-style:normal;font-size:8.5px;
  letter-spacing:.1em;text-transform:uppercase;color:rgba(247,241,232,.34)}
.rond .pt{font-family:var(--titre);font-size:30px;color:var(--or)}
.carte .nom{display:block;margin-top:6px;font-size:11.5px;line-height:1.3}
.carte[aria-pressed="true"] .rond{border-color:var(--or);box-shadow:0 0 0 1px var(--or)}
.carte[aria-pressed="true"]{color:var(--or)}
.carte[aria-pressed="true"] .rond::after{content:"✓";position:absolute;top:5px;right:7px;color:var(--or);font-size:12px}
.flh{position:absolute;left:50%;transform:translateX(-50%);width:30px;height:22px;border-radius:999px;
  border:1px solid var(--ligne);background:rgba(32,9,14,.9);color:var(--creme);cursor:pointer;
  display:grid;place-items:center;font-size:11px;line-height:1;z-index:3;transition:background .2s ease}
.flh:hover{background:var(--rouge)}
.flh.h{top:5px}.flh.b{bottom:5px}

/* ——— la barre du bas ——— */
.barre{position:sticky;bottom:0;z-index:4;margin-top:14px;
  background:linear-gradient(rgba(32,9,14,.80),rgba(32,9,14,.97));
  border-top:1px solid var(--ligne);
  padding:14px 0 calc(14px + env(safe-area-inset-bottom,0px));
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.resume{flex:1 1 320px;min-width:0;font-size:12.5px;color:rgba(247,241,232,.45);line-height:1.6}
.resume b{color:var(--creme);font-weight:400}
.resume .sep{color:var(--or);padding:0 6px}
.droite{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.chiffres{text-align:right;line-height:1.25}
.chiffres .barre-val{font-size:11.5px;color:var(--doux);text-decoration:line-through}
.chiffres .px400{font-family:var(--titre);font-size:30px;color:var(--or);display:block}
.bouton{background:var(--rouge);color:var(--creme);border:0;border-radius:2px;padding:15px 30px;
  letter-spacing:.14em;text-transform:uppercase;font-family:var(--texte);font-size:11px;cursor:pointer;
  transition:background .25s ease,opacity .25s ease;white-space:nowrap}
.bouton:hover:not(:disabled){background:#a4283a}
.bouton:disabled{opacity:.34;cursor:not-allowed}
.apres{width:100%;font-size:11.5px;color:var(--or);padding-top:6px}
.mention{margin:14px auto 26px;max-width:34em;color:rgba(247,241,232,.34);font-size:11px;text-align:center;line-height:1.6}

@media(max-width:860px){
  .rangee{grid-template-columns:repeat(2,1fr);gap:12px}
  .piste{height:clamp(240px,36vh,320px)}
}
@media(max-width:460px){ .rangee{grid-template-columns:1fr 1fr} .col h3{font-size:13px} }
</style>

<div class="halo"></div>
<canvas id="neige"></canvas>

<main>
  <header>
    <p class="sur">Édition de Noël · 2026</p>
    <h1>La valise <em>de Noël</em></h1>
    <p class="chapeau">Une base surprise, puis quatre choix. Faites défiler chaque colonne, cliquez — le prix ne bouge pas.</p>
    <span class="brouillon">Maquette — certaines pièces n'existent pas encore</span>
  </header>

  <div class="rangee" id="rangee"></div>

  <div class="barre">
    <p class="resume" id="resume"></p>
    <div class="droite">
      <div class="chiffres">
        <span class="barre-val">693.–</span>
        <span class="px400">400.–</span>
      </div>
      <button class="bouton" id="go" disabled>Je prends mon billet</button>
    </div>
    <p class="apres" id="apres"></p>
  </div>

  <p class="mention">📷 Photo non contractuelle — les nuances peuvent varier légèrement en raison du travail artisanal.</p>
</main>

<script>
(function(){
  var B='https://cdn.shopify.com/s/files/1/0798/2303/files/';
  var ETAPES=[
   {t:"La base", court:"Base", px:"100.–", pt:true,
    o:[{n:"extra small"},{n:"small"},{n:"large"}]},
   {t:"L'Aura medium", court:"Aura medium", px:"119.–",
    o:[{n:"bordeaux",c:"#6E1B2A"},
       {n:"céleste",c:"#A8C8E0",i:"IMG_6186.jpg"},
       {n:"authentique rose gold",c:"#E3B7A0",i:"ChatGPTImage10aout2026a14_23_27.png"},
       {n:"coquelicot",c:"#D4342B",i:"5_12c85b4f-0393-4d5e-a226-243736caf26c.jpg"},
       {n:"sucre d'orge",c:"#F2A9B8"}]},
   {t:"Les 2 minis Aura", court:"2 minis", px:"120.–",
    o:[{n:"coquelicot",c:"#D4342B"},{n:"sucre d'orge",c:"#F2A9B8"},{n:"givré",c:"#E8EEF2"},
       {n:"céleste",c:"#A8C8E0",i:"bague5.jpg"},{n:"bordeaux",c:"#6E1B2A"}]},
   {t:"Le deux tiers Aurheart", court:"Aurheart", px:"177.–",
    o:[{n:"rouge",c:"#9E1B2F",i:"Bague_eternite_en_saphir_rose.png"},
       {n:"sucre d'orge",c:"#F2A9B8"},{n:"givré",c:"#E8EEF2"},{n:"céleste",c:"#A8C8E0"},
       {n:"azure",c:"#4E8FD0",i:"visuels_site_3_cases_-45.jpg"},
       {n:"white",c:"#F4F4F2",i:"ChatGPT_Image_22_juil._2026_a_15_09_37.png"}]},
   {t:"Le deux tiers Auraline", court:"Auraline", px:"177.–",
    o:[{n:"rouge",c:"#9E1B2F"},{n:"sucre d'orge",c:"#F2A9B8"},{n:"givré",c:"#E8EEF2"},
       {n:"white",c:"#F4F4F2",i:"Nouveaute_2.jpg"}]}
  ];
  var choix=new Array(ETAPES.length).fill(null);
  var rangee=document.getElementById('rangee'), resume=document.getElementById('resume'),
      go=document.getElementById('go'), apres=document.getElementById('apres');

  ETAPES.forEach(function(e,i){
    var col=document.createElement('div'); col.className='col';
    var h='<h3>'+e.t+'</h3><p class="px">'+e.px+'</p>'+
          '<div class="cage"><button class="flh h" type="button" data-r="'+i+'" data-s="-1">▲</button>'+
          '<div class="piste" id="piste'+i+'">';
    e.o.forEach(function(op,j){
      var dedans = e.pt
        ? '<span class="pt">?</span>'
        : (op.i ? '<img src="'+B+op.i+'&width=420" alt="" loading="lazy">'
                : '<span class="pastille" style="background:'+op.c+'"></span><em class="avenir">photo à venir</em>');
      h+='<button type="button" class="carte" aria-pressed="false" data-e="'+i+'" data-o="'+j+'">'+
         '<span class="rond">'+dedans+'</span><span class="nom">'+op.n+'</span></button>';
    });
    h+='</div><button class="flh b" type="button" data-r="'+i+'" data-s="1">▼</button></div>';
    col.innerHTML=h; rangee.appendChild(col);
  });

  function rendu(){
    var bouts=ETAPES.map(function(e,i){
      return choix[i]===null
        ? e.court+' <span style="opacity:.55">— à choisir</span>'
        : e.court+' <b>'+e.o[choix[i]].n+'</b>';
    });
    resume.innerHTML=bouts.join('<span class="sep">·</span>');
    var n=choix.filter(function(x){return x!==null}).length;
    go.disabled=n<ETAPES.length;
    if(n<ETAPES.length) apres.textContent='';
  }

  rangee.addEventListener('click',function(ev){
    var fl=ev.target.closest('.flh');
    if(fl){ document.getElementById('piste'+fl.dataset.r)
      .scrollBy({top:(+fl.dataset.s)*180,behavior:'smooth'}); return; }
    var b=ev.target.closest('.carte'); if(!b) return;
    var i=+b.dataset.e, j=+b.dataset.o;
    choix[i]=(choix[i]===j)?null:j;
    rangee.querySelectorAll('.carte[data-e="'+i+'"]').forEach(function(x){
      x.setAttribute('aria-pressed',(+x.dataset.o===choix[i])?'true':'false');
    });
    rendu();
  });

  go.addEventListener('click',function(){
    var l=ETAPES.map(function(e,i){return e.court+' · '+e.o[choix[i]].n;}).join('  |  ');
    apres.innerHTML='Sur la vraie page, on partirait au paiement à 400.– avec&nbsp;: '+l;
  });

  rendu();

  var c=document.getElementById('neige');
  if(c){
    var x=c.getContext('2d'), f=[], L=0, H=0, doux=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function taille(){ L=c.width=innerWidth*devicePixelRatio; H=c.height=innerHeight*devicePixelRatio;
      c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; }
    taille(); addEventListener('resize',taille);
    var n=doux?24:60;
    for(var i=0;i<n;i++) f.push({x:Math.random(),y:Math.random(),r:(Math.random()*1.6+.5)*devicePixelRatio,
      v:(Math.random()*.00032+.00011),o:Math.random()*.42+.12,d:Math.random()*6.28});
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
