export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Maquette « Ma première bague mood » — guide ultra simple pour les nouvelles clientes.
// Compatibilités = table dictée par Amila (addon → small/large ; deux tiers → extra small seul, ou small/large + medium/2 minis ; medium → par 2 sur extra small, par 3 sur small/large).

const S = 'https://cdn.shopify.com/s/files/1/0798/2303/';
const P = 'https://www.yourmood.net/products/';

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Ma première bague mood</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@200;300;400;500&display=swap">
<style>
:root{--ink:#191917;--mid:#8b8880;--line:#e9e9ec;--cream:#f6f5f2;--acc:#1f6f78;--acc-soft:#e6f1f2}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font-family:'Poppins',Helvetica,Arial,sans-serif;font-weight:300;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
h1,h2,h3,p{margin:0}
.wrap{max-width:1080px;margin:0 auto;padding-inline:20px}
.serif{font-family:'Playfair Display',Georgia,serif;font-weight:400}

/* Ouverture */
.hero{text-align:center;padding:clamp(56px,9vw,110px) 0 clamp(36px,5vw,60px)}
.hero .k{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--mid)}
.hero h1{font-size:clamp(34px,6vw,62px);line-height:1.08;margin:14px 0 18px}
.hero p{max-width:560px;margin:0 auto;color:#55534e;font-size:clamp(15px,1.6vw,17px)}
.steps-nav{display:flex;justify-content:center;gap:10px;margin-top:30px;flex-wrap:wrap}
.steps-nav span{border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:13px;color:#55534e}
.steps-nav b{font-weight:500;color:var(--acc);margin-right:6px}

/* Étapes */
.step{padding:clamp(44px,6vw,80px) 0;border-top:1px solid var(--line)}
.step-h{display:flex;align-items:baseline;gap:16px;margin-bottom:8px}
.num{font-family:'Playfair Display',serif;font-size:clamp(44px,6vw,64px);line-height:1;color:var(--acc)}
.step h2{font-size:clamp(24px,3.4vw,36px)}
.step .sub{color:#55534e;margin:0 0 30px;max-width:640px}

/* ① bases */
.bases{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.base{border:1.5px solid var(--line);border-radius:18px;padding:14px 14px 18px;cursor:pointer;background:#fff;text-align:center;transition:border-color .2s,box-shadow .2s,transform .2s;font:inherit;color:inherit}
.base:hover{transform:translateY(-2px)}
.base.on{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-soft)}
.base .ph{aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--cream);margin-bottom:12px}
.base .ph img{width:100%;height:100%;object-fit:cover}
.base h3{font-size:18px;font-weight:500}
.base .mm{font-size:13px;color:var(--mid)}
.base .pr{margin-top:6px;font-weight:400}
.base .pick{display:inline-block;margin-top:10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--mid)}
.base.on .pick{color:var(--acc);font-weight:500}

/* ② ce qui va dessus */
.combo-t{font-size:14px;color:var(--mid);margin-bottom:12px}
.combos{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:38px}
.combo{background:var(--cream);border-radius:16px;padding:18px 16px;text-align:center}
.band{display:flex;gap:3px;height:var(--h);width:140px;margin:6px auto 14px;padding:3px;border-radius:8px;background:linear-gradient(180deg,#d9dadc,#b9bbbe 55%,#d4d5d7);flex-direction:column}
.band i{display:block;border-radius:4px}
.combo b{display:block;font-weight:500;font-size:15px}
.combo small{color:var(--mid);font-size:12.5px}
.fmt{margin-bottom:30px}
.fmt h3{font-size:17px;font-weight:500;margin-bottom:4px}
.fmt .fx{font-size:13px;color:var(--mid);margin-bottom:12px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.card{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;transition:transform .2s}
.card:hover{transform:translateY(-2px)}
.card .ph{aspect-ratio:1;background:var(--cream)}
.card .ph img{width:100%;height:100%;object-fit:cover}
.card .tx{padding:10px 12px 12px}
.card .n{font-size:14px;line-height:1.35}
.card .p{font-size:14px;font-weight:500;margin-top:3px}
.tag{display:inline-block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;background:var(--acc);color:#fff;border-radius:999px;padding:2px 8px;margin-bottom:5px}

/* ③ taille */
.size{display:grid;grid-template-columns:1fr 1.2fr;gap:30px;align-items:center}
.size .ph{border-radius:18px;overflow:hidden;background:var(--cream);aspect-ratio:1}
.size .ph img{width:100%;height:100%;object-fit:cover}
.size ol{padding-left:20px;margin:0 0 22px;color:#3b3a37}
.size li{margin-bottom:8px}
.btn{display:inline-block;background:var(--ink);color:#fff;border-radius:999px;padding:13px 26px;font-size:14px;letter-spacing:.04em}
.btn.alt{background:#fff;color:var(--ink);border:1px solid var(--ink)}

/* Première bague toute prête */
.ready{background:var(--cream);padding:clamp(48px,6vw,84px) 0;text-align:center}
.ready h2{font-size:clamp(26px,3.6vw,38px);margin-bottom:8px}
.ready .sub{color:#55534e;margin:0 auto 30px;max-width:560px}
.packs{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:left}
.pack{background:#fff;border-radius:18px;padding:20px}
.pack h3{font-size:17px;font-weight:500;margin-bottom:10px}
.pack ul{list-style:none;padding:0;margin:0 0 14px;font-size:14px}
.pack li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line)}
.pack .tot{display:flex;justify-content:space-between;font-weight:500;font-size:16px}

.trust{display:flex;justify-content:center;gap:clamp(14px,3vw,40px);flex-wrap:wrap;padding:30px 20px 60px;font-size:13.5px;color:#55534e;text-align:center}
.trust b{display:block;font-family:'Playfair Display',serif;font-weight:400;font-size:22px;color:var(--ink)}

@media (max-width:760px){
  .bases,.combos,.cards,.packs{grid-template-columns:1fr 1fr}
  .size{grid-template-columns:1fr}
  .combos .combo:last-child:nth-child(odd),.packs .pack:last-child:nth-child(odd){grid-column:1/-1}
}
@media (max-width:420px){.bases{grid-template-columns:1fr}.base{display:grid;grid-template-columns:96px 1fr;gap:12px;text-align:left;align-items:center}.base .ph{margin:0}}
</style></head><body>

<header class="hero wrap">
  <div class="k">Nouvelle chez mood ?</div>
  <h1 class="serif">Ta première bague mood,<br><em>en 3 étapes</em></h1>
  <p>Une base en acier, des anneaux qui se clipsent dessus. Tu changes de couleur selon ton humeur&nbsp;: c'est le clic mood.</p>
  <div class="steps-nav"><span><b>1</b>Ta base</span><span><b>2</b>Tes anneaux</span><span><b>3</b>Ta taille</span></div>
</header>

<section class="step wrap" id="s1">
  <div class="step-h"><span class="num">1</span><h2 class="serif">Choisis ta base</h2></div>
  <p class="sub">C'est la bague du dessous, en acier 316L, garantie à vie. Elle existe en 3 largeurs&nbsp;: plus elle est large, plus tu peux y mettre d'anneaux.</p>
  <div class="bases" id="bases">
    <button class="base" data-b="xs"><div class="ph"><img src="${S}files/5_a2568555-f82a-4e68-88bd-2be742201eaa.jpg?v=1774281033&width=600" alt="Base extra small"></div><div><h3>Extra small</h3><div class="mm">9 mm · fine et discrète</div><div class="pr">dès 220.–</div><span class="pick">Je choisis</span></div></button>
    <button class="base on" data-b="s"><div class="ph"><img src="${S}files/arrondie-small-3-couleurs.gif?v=1791564086" alt="Base small"></div><div><h3>Small</h3><div class="mm">11 mm · la plus choisie</div><div class="pr">250.–</div><span class="pick">Je choisis</span></div></button>
    <button class="base" data-b="l"><div class="ph"><img src="${S}files/base-large-3-couleurs.gif?v=1791563649" alt="Base large"></div><div><h3>Large</h3><div class="mm">13 mm · affirmée</div><div class="pr">250.–</div><span class="pick">Je choisis</span></div></button>
  </div>
</section>

<section class="step wrap" id="s2">
  <div class="step-h"><span class="num">2</span><h2 class="serif">Choisis tes anneaux</h2></div>
  <p class="sub" id="s2sub"></p>
  <div class="combo-t">Ce que tu peux mettre sur ta base&nbsp;:</div>
  <div class="combos" id="combos"></div>
  <div id="fmts"></div>
</section>

<section class="step wrap" id="s3">
  <div class="step-h"><span class="num">3</span><h2 class="serif">Trouve ta taille</h2></div>
  <div class="size">
    <div class="ph"><img src="${S}files/1_119dc8bd-5d95-46d1-b028-72af06d51129.jpg?v=1748004400&width=700" alt="Baguier mood"></div>
    <div>
      <p class="sub" style="margin-bottom:16px">Tu ne connais pas ta taille&nbsp;? Pas de souci.</p>
      <ol>
        <li>Commande le <b>baguier gratuit</b>, on te l'envoie.</li>
        <li>Glisse-le sur ton doigt et lis ta taille.</li>
        <li>Ou passe dans une de nos 6 boutiques&nbsp;: on la prend avec toi.</li>
      </ol>
      <a class="btn" href="${P}multisizer-baguier-gratuit" target="_blank" rel="noopener">Je reçois le baguier gratuit</a>
    </div>
  </div>
</section>

<section class="ready">
  <div class="wrap">
    <h2 class="serif">Ou prends une première bague toute prête</h2>
    <p class="sub">Trois idées pour commencer, tout compris.</p>
    <div class="packs">
      <div class="pack"><h3>La fine</h3><ul><li><span>Base extra small</span><span>220.–</span></li><li><span>Deux tiers aluminium</span><span>45.–</span></li></ul><div class="tot"><span>Total</span><span>265.–</span></div></div>
      <div class="pack"><h3>La colorée</h3><ul><li><span>Base small</span><span>250.–</span></li><li><span>Addon aluminium</span><span>54.–</span></li></ul><div class="tot"><span>Total</span><span>304.–</span></div></div>
      <div class="pack"><h3>La brillante</h3><ul><li><span>Base extra small</span><span>220.–</span></li><li><span>Aura Authentique</span><span>199.–</span></li><li><span>Medium aluminium</span><span>28.–</span></li></ul><div class="tot"><span>Total</span><span>447.–</span></div></div>
    </div>
  </div>
</section>

<div class="trust"><div><b>Garantie à vie</b>sur ta base</div><div><b>75 000+</b>Mood Lovers</div><div><b>6 boutiques</b>en Suisse</div><div><b>Depuis 2004</b>à Orbe</div></div>

<script>
var S='${S}', P='${P}';
var IMG=function(u){return S+u+(u.indexOf('?')>-1?'&':'?')+'width=500';};
var F={
  addon:{t:'Addon',x:'L\\'anneau large : il habille ta base à lui tout seul.',c:[
    ['Addon aluminium rouge','54.–','files/visuel_rouge2.jpg?v=1756475489','addon-aluminium-anodise-rouge'],
    ['Addon 3D Edelweiss','249.–','files/Capture_d_ecran_2024-07-29_a_20.23.54.png?v=1722277636','addon-3d-edelweiss'],
    ['Addon Neige éternelle','295.–','files/Bague_argentee_texturee_en_gros_plan.png?v=1792069449','anneau-addon-en-argent-925-neige-eternelle-pour-bague-mood-interchangeable-special-20-ans']]},
  dt:{t:'Deux tiers',x:'Il remplit une base extra small, ou se marie avec un medium sur une base small ou large.',c:[
    ['Deux tiers aluminium aubergine','45.–','products/addon-2-3-aluminium-addon-deux-tiers-en-aluminium-aubergine-1.jpg?v=1748004052','addon-deux-tiers-en-aluminium-aubergine'],
    ['Auraline','259.–','files/Nouveaute_2.jpg?v=1774338716','anneau-addon-deux-tiers-auraline-en-argent-925-serti-de-zircons'],
    ['Willow','295.–','files/Design_sans_titre_-_2025-05-07T083445.986.jpg?v=1772635795','anneau-deux-tiers-willow-en-argent-poli-serti-de-zircons-pour-bague-mood-interchangeable-copy']]},
  med:{t:'Medium',x:'L\\'anneau du milieu : on en met plusieurs pour jouer les couleurs.',c:[
    ['Aura Authentique','199.–','files/ChatGPT_Image_25_juin_2026_09_19_27.png?v=1782372244','anneau-medium-full-zircons-pour-bague-mood',1],
    ['Medium aluminium rouge','28.–','files/visuel_rouge3.jpg?v=1770115442','addon-medium-en-aluminium-anodise-rouge'],
    ['Medium Neige éternelle','169.–','files/Anneauargentetexturesurfondsombre.png?v=1792070592','anneau-addon-medium-en-argent-925-neige-eternelle-pour-bague-mood-interchangeable-special-20-ans']]},
  mini:{t:'Minis',x:'Les petits anneaux fins, le petit truc en plus.',c:[
    ['Mini aluminium turquoise','30.–','files/mini_aluminium_turquoise.jpg?v=1771836290','1-mini-en-aluminium-turquoise-pour-bague-mood-interchangeable-offre-du-20-decembre-2025'],
    ['Mini aluminium émeraude','30.–','files/mini_aluminium_emeraude.jpg?v=1771836254','1-mini-en-aluminium-emeraude-pour-bague-mood-interchangeable-offre-du-20-decembre-2025'],
    ['2 minis Aura Authentique','225.–','files/8_64a3d1dc-b977-4d6b-994d-77f7c7f02389.png?v=1767621405','anneau-addon-mini-mini-aura-authentique-en-argent-925-serti-de-zircons-pour-bague-mood-interchangeable']]}
};
/* couleurs des petits schémas : une couleur par format */
var COL={addon:'#1f6f78',dt:'#c9a46a',med:'#d98c9a',mini:'#7d8fb3'};
var BASES={
  xs:{n:'extra small',h:58,f:['dt','med','mini'],k:[
    {b:'1 deux tiers',s:'tout seul',p:[['dt',1]]},
    {b:'2 mediums',s:'deux couleurs',p:[['med',1],['med',1]]},
    {b:'1 medium + 2 minis',s:'le mix',p:[['med',1],['mini',.5],['mini',.5]]}]},
  s:{n:'small',h:72,f:['addon','dt','med','mini'],k:[
    {b:'1 addon',s:'tout seul',p:[['addon',1]]},
    {b:'1 deux tiers + 1 medium',s:'ou + 2 minis',p:[['dt',2],['med',1]]},
    {b:'3 mediums',s:'trois couleurs',p:[['med',1],['med',1],['med',1]]}]},
  l:{n:'large',h:84,f:['addon','dt','med','mini'],k:[
    {b:'1 addon',s:'tout seul',p:[['addon',1]]},
    {b:'1 deux tiers + 1 medium',s:'ou + 2 minis',p:[['dt',2],['med',1]]},
    {b:'3 mediums',s:'trois couleurs',p:[['med',1],['med',1],['med',1]]}]}
};
function band(k,h){var s='<div class="band" style="--h:'+h+'px">';for(var i=0;i<k.p.length;i++){s+='<i style="flex:'+k.p[i][1]+';background:'+COL[k.p[i][0]]+'"></i>';}return s+'</div>';}
function draw(b){
  var B=BASES[b];
  document.getElementById('s2sub').textContent='Sur une base '+B.n+', voici ce qui va. Les meilleures ventes en premier.';
  var c='';for(var i=0;i<B.k.length;i++){c+='<div class="combo">'+band(B.k[i],B.h)+'<b>'+B.k[i].b+'</b><small>'+B.k[i].s+'</small></div>';}
  document.getElementById('combos').innerHTML=c;
  var f='';
  for(var j=0;j<B.f.length;j++){var m=F[B.f[j]];
    f+='<div class="fmt"><h3><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:'+COL[B.f[j]]+';margin-right:8px"></span>'+m.t+'</h3><div class="fx">'+m.x+'</div><div class="cards">';
    for(var q=0;q<m.c.length;q++){var it=m.c[q];
      f+='<a class="card" href="'+P+it[3]+'" target="_blank" rel="noopener"><div class="ph"><img loading="lazy" src="'+IMG(it[2])+'" alt=""></div><div class="tx">'+(it[4]?'<span class="tag">N°1 des ventes</span>':'')+'<div class="n">'+it[0]+'</div><div class="p">'+it[1]+'</div></div></a>';}
    f+='</div></div>';}
  document.getElementById('fmts').innerHTML=f;
}
var btns=document.querySelectorAll('.base');
for(var i=0;i<btns.length;i++){btns[i].addEventListener('click',function(){
  for(var j=0;j<btns.length;j++)btns[j].classList.remove('on');
  this.classList.add('on');draw(this.getAttribute('data-b'));
  if(window.innerWidth<760)document.getElementById('s2').scrollIntoView({behavior:'smooth'});
});}
draw('s');
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0, must-revalidate' } });
}
