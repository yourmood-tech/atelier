import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Maquette de la page « On n'en a jamais trop » — lien à montrer à l'équipe.
const PAGE = String.raw`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>On n'en a jamais trop — mood</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#B5E0DD;color:#10201F;}
body{font-family:'Jost','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5}
a{color:inherit;text-decoration:none}
.w{max-width:1180px;margin:0 auto;padding:0 32px}
:root{--turq:#B5E0DD;--turq-fonce:#5FA9A4;--gris:#41615F}

header.h{padding:0;text-align:center;overflow:hidden}
.txtcol .sub{margin-left:auto;margin-right:0}
.txtcol .prixligne{justify-content:flex-end}
.scene{display:grid;grid-template-columns:270px 1fr 270px;gap:0;align-items:center;min-height:min(86vh,720px)}
.centre{padding-top:18px;padding-bottom:18px}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.txtcol{text-align:right}
.vidcol video{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;border-radius:3px;background:#C4E7E4}
@media(max-width:900px){.duo{grid-template-columns:1fr;gap:18px}.txtcol{text-align:center}.vidcol{order:-1}}
.col{position:relative;height:min(86vh,720px);overflow:hidden}
.col:before,.col:after{content:"";position:absolute;left:0;right:0;height:130px;z-index:2;pointer-events:none}
.col:before{top:0;background:linear-gradient(#B5E0DD,rgba(181,224,221,0))}
.col:after{bottom:0;background:linear-gradient(rgba(181,224,221,0),#B5E0DD)}
.piste{display:flex;flex-direction:column;gap:12px;padding:0 6px}
.piste img{width:100%;height:268px;object-fit:cover;display:block;border-radius:2px}
.bas .piste{animation:descend 42s linear infinite}
.haut .piste{animation:monte 42s linear infinite}
@keyframes descend{from{transform:translateY(-1680px)}to{transform:translateY(0)}}
@keyframes monte{from{transform:translateY(0)}to{transform:translateY(-1680px)}}
@media (prefers-reduced-motion:reduce){.piste{animation:none}}
.kick{font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:var(--gris)}
h1{font-size:clamp(40px,6.6vw,84px);line-height:.96;font-weight:200;margin:16px 0 0;letter-spacing:-.025em}
h1 b{font-weight:500}
.sub{font-size:16px;font-weight:300;color:#274543;max-width:46ch;margin:18px auto 0}
.prixligne{display:flex;align-items:baseline;justify-content:center;gap:16px;margin:22px 0 0}
.avant{font-size:17px;color:#5C8480;text-decoration:line-through;font-weight:300}
.apres{font-size:40px;font-weight:500;letter-spacing:-.02em}
.cta{display:inline-flex;align-items:center;height:56px;padding:0 38px;margin-top:18px;background:#10201F;color:#EAF7F6;
 font-size:11px;letter-spacing:.24em;text-transform:uppercase;border-radius:2px;transition:.3s}
.cta:hover{background:#FFFFFF;color:#10201F}
.compte{margin-top:12px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--gris)}

.massue{margin:52px 0 0;background:#10201F;color:#EAF7F6;padding:52px 0}
.massue p{max-width:20ch;margin:0 auto;text-align:center;font-size:clamp(26px,3.6vw,44px);font-weight:200;line-height:1.24;letter-spacing:-.01em}
.massue p b{font-weight:500}

section{padding:52px 0 0}
.eb{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gris);text-align:center}
h2{font-size:clamp(24px,3.1vw,36px);font-weight:200;text-align:center;margin:10px 0 0;letter-spacing:-.015em}
.lede{max-width:56ch;margin:14px auto 0;text-align:center;color:#274543;font-weight:300}

.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(16,32,31,.16);margin-top:28px;border:1px solid rgba(16,32,31,.16)}
.trio .tc{position:relative;background:#C4E7E4;text-align:center;overflow:hidden;min-height:178px;display:flex;align-items:center;justify-content:center}
.trio .tc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s ease}
.trio .tc:hover img{opacity:1}
.trio .txt{position:relative;z-index:2;padding:26px 22px;transition:.5s}
.trio .tc:hover .txt{background:rgba(16,32,31,.58);color:#EAF7F6;backdrop-filter:blur(1px)}
.trio .tc:hover .t{color:#EAF7F6}
.trio .t{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--gris)}
.trio .d{margin-top:14px;font-size:19px;font-weight:300;line-height:1.45}

.grille{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}
.p{display:block;text-align:center}
.pim{display:block;position:relative;aspect-ratio:1/1;background:#B5E0DD;border-radius:2px;overflow:hidden}
.pim img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.2,.7,.2,1)}
.p:hover .pim img{transform:scale(1.06)}
.pvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s ease;z-index:2}
.p:hover .pvid{opacity:1}
.pq{display:inline-block;margin-top:14px;font-size:11px;letter-spacing:.2em;color:#EAF7F6;background:#10201F;padding:3px 9px;border-radius:99px}
.pn{display:block;margin-top:8px;font-size:14px;font-weight:300}
.pp{display:block;margin-top:3px;font-size:13px;color:var(--gris)}

.boite{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center;margin-top:8px}
.boite.sanspho{grid-template-columns:1fr;max-width:760px;margin-left:auto;margin-right:auto;text-align:center}
.boite.sanspho .eb,.boite.sanspho h3{text-align:center!important}
.boite .ph{aspect-ratio:4/3;border-radius:3px;overflow:hidden;background:#C4E7E4}
.boite .ph img{width:100%;height:100%;object-fit:cover;display:block}
.boite h3{font-size:clamp(24px,3vw,34px);font-weight:200;margin:0 0 16px;letter-spacing:-.01em}
.boite p{color:#274543;font-weight:300;margin:0 0 12px}

.calc{margin-top:26px;border:1px solid rgba(16,32,31,.18);border-radius:3px;max-width:640px;margin-left:auto;margin-right:auto;background:#C4E7E4}
.calc .l{display:flex;justify-content:space-between;padding:12px 24px;border-bottom:1px solid rgba(16,32,31,.12);font-weight:300;font-size:15px}
.calc .l:last-child{border:0}
.calc .tot{background:#10201F;color:#EAF7F6;font-weight:400}
.calc .tot span:last-child{font-weight:500}

.chiffres{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(16,32,31,.16);margin-top:26px;border:1px solid rgba(16,32,31,.16)}
.chiffres .ch{position:relative;background:#C4E7E4;text-align:center;overflow:hidden;min-height:152px;display:flex;align-items:center;justify-content:center}
.chiffres .ch img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s ease}
.chiffres .ch:hover img{opacity:1}
.chiffres .in{position:relative;z-index:2;padding:24px 10px;width:100%;transition:.5s}
.chiffres .ch:hover .in{background:rgba(16,32,31,.6);color:#EAF7F6}
.chiffres .ch:hover .q{color:#EAF7F6}
.sv{max-height:0;overflow:hidden;opacity:0;transition:.45s;font-size:12px;letter-spacing:.06em;margin-top:0}
.chiffres .ch:hover .sv{max-height:60px;opacity:1;margin-top:8px}
.chiffres .n{font-size:34px;font-weight:300;letter-spacing:-.02em}
.chiffres .q{margin-top:6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gris)}

.grandeim{position:relative;margin-top:0;border-radius:3px;overflow:hidden;background:#C4E7E4}
.gvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s ease}
.grandeim:hover .gvid{opacity:1}
.grandeim img{width:100%;display:block}

.ruban{margin-top:52px;overflow:hidden;position:relative}
.ruban:before,.ruban:after{content:"";position:absolute;top:0;bottom:0;width:90px;z-index:2;pointer-events:none}
.ruban:before{left:0;background:linear-gradient(90deg,#B5E0DD,rgba(181,224,221,0))}
.ruban:after{right:0;background:linear-gradient(270deg,#B5E0DD,rgba(181,224,221,0))}
.rp{display:flex;gap:12px;width:max-content;will-change:transform}
.rp img{height:230px;width:auto;object-fit:contain;border-radius:2px;display:block}

@media(max-width:900px){.rp img{height:150px}}
.faq{max-width:760px;margin:24px auto 0}
.faq details{border-bottom:1px solid rgba(16,32,31,.16);padding:13px 0}
.faq summary{cursor:pointer;list-style:none;font-size:16px;font-weight:400}
.faq summary::-webkit-details-marker{display:none}
.faq p{margin:12px 0 0;color:#274543;font-weight:300}

.fin{margin-top:56px;background:#10201F;color:#EAF7F6;padding:58px 0;text-align:center}
.fin h2{color:#EAF7F6;margin:0}
.fin .cta{background:#EAF7F6;color:#10201F;margin-top:30px}
.fin .cta:hover{background:var(--turq)}
footer{padding:20px 0 34px;text-align:center;color:#41615F;font-size:11px;letter-spacing:.2em;text-transform:uppercase}

@media(max-width:900px){
 .scene{grid-template-columns:1fr}
 .col{display:none}
 .w{padding:0 20px}
 .trio,.grille,.chiffres{grid-template-columns:repeat(2,1fr)}
 .boite{grid-template-columns:1fr;gap:26px}
}
</style>
</head><body>

<header class="h">
<div class="scene">
  <div class="col bas"><div class="piste"><img loading="eager" src="/box/col-dt.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""><img loading="eager" src="/box/col-blanc.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""><img loading="eager" src="/box/col-dt.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""><img loading="eager" src="/box/col-blanc.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""></div></div>
  <div class="w centre">
  <div class="duo">
   <div class="txtcol">
  <div class="kick">Deux jours · 300 box</div>
  <h1>On n'en a<br><b>jamais trop.</b></h1>
  <p class="sub">Sept essentiels mood. Ceux que vous portez déjà, ceux que vous cherchez au fond du tiroir le matin. Réunis neufs, dans une boîte de rangement turquoise clair.</p>
  <div class="prixligne"><span class="avant">512.–</span><span class="apres">160.–</span></div>
  <a class="cta" href="https://www.yourmood.net/products/on-nen-a-jamais-trop-7-essentiels-mood-tout-neufs-dans-la-nouvelle-boite-turquoise">Je prends la mienne</a>
  <div class="compte">Il reste <b id="reste">300</b> box sur 300</div>
   </div>
   <div class="vidcol"><video src="/box/boite-fermeture.mp4" autoplay muted loop playsinline preload="auto"></video></div>
  </div>
  </div>
  <div class="col haut"><div class="piste"><img loading="eager" src="/box/col-dt.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""><img loading="eager" src="/box/col-blanc.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""><img loading="eager" src="/box/col-dt.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""><img loading="eager" src="/box/col-blanc.jpg" alt=""><img loading="eager" src="/box/col-med.jpg" alt=""><img loading="eager" src="/box/col-mini.jpg" alt=""></div></div>
</div>
</header>

<div class="massue"><div class="w">
  <p>Vous les avez déjà&nbsp;?<br><b>C'est précisément pour ça qu'on les a choisis.</b></p>
</div></div>

<section><div class="w">
  <div class="grandeim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/mood-amelioration-1790665605561.jpg?width=1600" alt="La box On n'en a jamais trop"><video class="gvid" src="/box/boite-et-anneaux.mp4" muted loop playsinline preload="none"></video></div>
</div></section>

<section><div class="w">
  <div class="eb">Le principe</div>
  <h2>Il y a des choses qu'on possède déjà<br>et qu'on adore racheter.</h2>
  <div class="trio">
    <div class="tc"><img loading="lazy" src="/box/trio-1.jpg" alt=""><div class="txt"><div class="t">La chemise</div><div class="d">Blanche. Impeccable. La même que la précédente.</div></div></div>
    <div class="tc"><img loading="lazy" src="/box/trio-2.jpg" alt=""><div class="txt"><div class="t">Les baskets</div><div class="d">Exactement le modèle d'avant, en blanc qui n'a rien vu.</div></div></div>
    <div class="tc"><img loading="lazy" src="/box/trio-3.jpg" alt=""><div class="txt"><div class="t">Les chaussettes blanches</div><div class="d">On en a déjà plein. On en rachète quand même.</div></div></div>
  </div>
  <p class="lede">Ce n'est pas de la nouveauté. C'est mieux&nbsp;: le plaisir de retrouver ce qu'on aime, parfaitement neuf.<br>Vos froissés, vous les connaissez. Ils ont attrapé toutes les lumières. On vous les remet entre les mains — neufs.</p>
</div></section>

<section><div class="w">
  <div class="eb">Dans la box</div>
  <h2>Sept bijoux et la boîte de rangement.</h2>
  <div class="grille"><a class="p" href="https://www.yourmood.net/products/deux-tiers-acier-froisse" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/box_oo_2_turquoise_b0c59ec8-9aca-4ed4-9ded-a31622d3c459.png?width=1000" alt="Deux tiers en acier froissé"><video class="pvid" src="/box/base-acier-brossee-zoom.mp4" autoplay muted loop playsinline preload="none"></video></span>
      <span class="pq">×1</span><span class="pn">Deux tiers en acier froissé</span><span class="pp">109.–</span></a><a class="p" href="https://www.yourmood.net/products/medium-en-acier-froisse" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/box_oo_2_turquoise_a2a206c6-b079-4fbe-9b56-5e7a6cdd8b07.png?width=1000" alt="Medium en acier froissé"><video class="pvid" src="/box/duo-brossee-polie.mp4" autoplay muted loop playsinline preload="none"></video></span>
      <span class="pq">×2</span><span class="pn">Medium en acier froissé</span><span class="pp">77.– pièce</span></a><a class="p" href="https://www.yourmood.net/products/mini-acier-froisse" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/box_oo_2_turquoise_a116e152-d2d2-4f3e-83d3-67c502189c49.png?width=1000" alt="Mini en acier froissé"><video class="pvid" src="/box/duo-fines.mp4" autoplay muted loop playsinline preload="none"></video></span>
      <span class="pq">×2</span><span class="pn">Mini en acier froissé</span><span class="pp">60.– pièce</span></a><a class="p" href="https://www.yourmood.net/products/addon-medium-blanc" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/box_oo_2_turquoise_cee0fe29-58fd-43d0-865a-5b674e3fd38e.png?width=1000" alt="Medium blanc"><video class="pvid" src="/box/duo-blanches-zoom.mp4" autoplay muted loop playsinline preload="none"></video></span>
      <span class="pq">×2</span><span class="pn">Medium blanc</span><span class="pp">15.– pièce</span></a></div>
</div></section>

<section><div class="w">
  <div class="boite sanspho">
    <div>
      <div class="eb" style="text-align:left">La boîte de rangement</div>
      <h3 style="text-align:left">Turquoise clair. Elle ne demande la permission à personne, surtout pas à octobre.</h3>
      <p>Assez belle pour rester dehors&nbsp;: sur la commode, à côté du lit, là où on la voit.</p>
      <p>Dedans, le froissé fait le reste — il attrape le peu de soleil qui traîne et le renvoie. Et le blanc, c'est le neuf.</p>
    </div>
  </div>
</div></section>

<section><div class="w">
  <div class="eb">Le compte</div>
  <h2>512.– de bijoux. 160.–.</h2>
  <div class="calc">
    <div class="l"><span>1 deux tiers en acier froissé</span><span>109.–</span></div>
    <div class="l"><span>2 medium en acier froissé</span><span>154.–</span></div>
    <div class="l"><span>2 minis en acier froissé</span><span>120.–</span></div>
    <div class="l"><span>2 medium blancs</span><span>30.–</span></div>
    <div class="l"><span>La boîte de rangement turquoise</span><span>99.–</span></div>
    <div class="l tot"><span>La box</span><span>160.–</span></div>
  </div>
  <p class="lede">Pas de petite ristourne, pas de calcul compliqué. On voulait finir septembre en beauté.</p>
</div></section>

<section><div class="w">
  <div class="chiffres">
    <div class="ch"><img loading="lazy" src="/box/empilees.jpg" alt=""><div class="in"><div class="n" id="ch-box">300</div><div class="q">box</div><div class="sv" id="sv-box">300 / 300 encore disponibles</div></div></div>
    <div class="ch"><div class="in"><div class="n">2</div><div class="q">jours</div><div class="sv" id="sv-temps">—</div></div></div>
    <div class="ch"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/box_oo_2_turquoise_39f77588-94cc-4e35-9b45-02b9771ae502.png?width=1200" alt=""><div class="in"><div class="n">7</div><div class="q">essentiels</div></div></div>
    <div class="ch"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/box_oo_2_turquoise_04ed00ca-cbce-43db-a19b-34b57026ea53.png?width=1200" alt=""><div class="in"><div class="n">160.–</div><div class="q">la box</div></div></div>
  </div>
</div></section>

<div class="ruban"><div class="rp"><img loading="lazy" src="/box/ru-01.jpg" alt=""><img loading="lazy" src="/box/ru-02.jpg" alt=""><img loading="lazy" src="/box/ru-03.jpg" alt=""><img loading="lazy" src="/box/ru-04.jpg" alt=""><img loading="lazy" src="/box/ru-05.jpg" alt=""><img loading="lazy" src="/box/ru-06.jpg" alt=""><img loading="lazy" src="/box/ru-07.jpg" alt=""><img loading="lazy" src="/box/ru-08.jpg" alt=""><img loading="lazy" src="/box/ru-09.jpg" alt=""><img loading="lazy" src="/box/ru-10.jpg" alt=""><img loading="lazy" src="/box/ru-11.jpg" alt=""><img loading="lazy" src="/box/ru-01.jpg" alt=""><img loading="lazy" src="/box/ru-02.jpg" alt=""><img loading="lazy" src="/box/ru-03.jpg" alt=""><img loading="lazy" src="/box/ru-04.jpg" alt=""><img loading="lazy" src="/box/ru-05.jpg" alt=""><img loading="lazy" src="/box/ru-06.jpg" alt=""><img loading="lazy" src="/box/ru-07.jpg" alt=""><img loading="lazy" src="/box/ru-08.jpg" alt=""><img loading="lazy" src="/box/ru-09.jpg" alt=""><img loading="lazy" src="/box/ru-10.jpg" alt=""><img loading="lazy" src="/box/ru-11.jpg" alt=""></div></div>

<section><div class="w">
  <div class="eb">Questions</div>
  <h2>Ce qu'on nous demande déjà.</h2>
  <div class="faq">
    <details open><summary>Ce sont des nouveautés&nbsp;?</summary><p>Non, et c'est volontaire. Ce sont nos essentiels — les pièces les plus portées de la maison.</p></details>
    <details><summary>J'en ai déjà plusieurs, ça vaut le coup&nbsp;?</summary><p>C'est exactement pour vous qu'on l'a faite. Un froissé neuf n'a pas la même lumière qu'un froissé porté trois ans.</p></details>
    <details><summary>Pourquoi 160.– au lieu de 512.–&nbsp;?</summary><p>Parce qu'on voulait finir septembre en beauté, et qu'on a assumé un geste franc.</p></details>
    <details><summary>Combien de temps&nbsp;?</summary><p>300 box, deux jours. On affiche ce qu'il reste.</p></details>
  </div>
</div></section>

<div class="fin"><div class="w">
  <h2>On ne remplace pas ses préférés.<br>On les rachète.</h2>
  <a class="cta" href="https://www.yourmood.net/products/on-nen-a-jamais-trop-7-essentiels-mood-tout-neufs-dans-la-nouvelle-boite-turquoise">Je prends la mienne — 160.–</a>
</div></div>

<footer>mood collection · Orbe · Suisse</footer>
<script>
(function(){
  var g=document.querySelector('.grandeim'), v=g&&g.querySelector('.gvid');
  if(g&&v){ g.addEventListener('mouseenter',function(){ v.play().catch(function(){}); });
            g.addEventListener('mouseleave',function(){ v.pause(); }); }
})();
(function(){
  var p=document.querySelector('.rp'); if(!p) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var x=0, moitie=0, dernier=0;
  function mesure(){ var w=p.scrollWidth/2; if(w>50) moitie=w; }
  mesure();
  window.addEventListener('load',mesure);
  window.addEventListener('resize',mesure);
  Array.prototype.forEach.call(p.querySelectorAll('img'),function(im){
    if(im.complete) mesure(); else im.addEventListener('load',mesure);
  });
  var essais=0, t=setInterval(function(){ mesure(); if(++essais>20) clearInterval(t); },700);
  function pas(t){
    requestAnimationFrame(pas);
    if(!dernier){ dernier=t; return; }
    var dt=Math.min(t-dernier,64); dernier=t;
    if(!moitie){ mesure(); return; }
    x -= dt*0.035;                 // vitesse douce
    if(x <= -moitie) x += moitie;  // boucle invisible
    p.style.transform='translateX('+x+'px)';
  }
  requestAnimationFrame(pas);
})();
fetch('/api/box-reste').then(function(r){return r.json()}).then(function(d){
  if(typeof d.reste!=='number') return;
  var e=document.getElementById('reste'); if(e) e.textContent=d.reste;
  var b=document.getElementById('ch-box'); if(b) b.textContent=d.reste;
  var s=document.getElementById('sv-box'); if(s) s.textContent=d.reste+' / '+d.total+' encore disponibles';
}).catch(function(){});
(function(){
  var fin=new Date('2026-10-01T00:00:00+02:00').getTime();
  var el=document.getElementById('sv-temps'); if(!el) return;
  function tic(){
    var r=fin-Date.now();
    if(r<=0){ el.textContent='C’est terminé.'; return; }
    var m=Math.floor(r/60000), h=Math.floor(m/60), mm=m%60;
    el.textContent = h>0 ? ('encore '+h+' h '+mm+' min') : ('encore '+mm+' min');
  }
  tic(); setInterval(tic,30000);
})();
</script>
</body></html>`;

export async function GET() {
  return new NextResponse(PAGE, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
}
