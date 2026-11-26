export const dynamic = 'force-static';

// Maquette de lancement « Boîte Infinity OO N°3 » — univers blanc pur, film 3D à l'ouverture.
// Le site yourmood.net n'est pas touché : page de démonstration sur mood-tools.yourmood.net/infinity
const FICHE = 'https://www.yourmood.net/products/boite-infinity-oo-n-3-blanc';

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>mood · Infinity OO N°3</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Poppins:wght@100;200;300;400;500&display=swap">
<style>
:root{--ink:#0d0d0d;--mid:#8a8a8a;--line:#e9e9e9;--sans:'Poppins','Helvetica Neue',Arial,sans-serif;--serif:'Playfair Display',Georgia,serif}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#fff;color:var(--ink);font-family:var(--sans);font-weight:300;-webkit-font-smoothing:antialiased;overflow-x:hidden}
body.locked{overflow:hidden;height:100vh}
a{color:inherit}
/* ---------- entrée ---------- */
#intro{position:fixed;inset:0;z-index:50;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;transition:opacity 1.2s ease,visibility 1.2s}
#intro.gone{opacity:0;visibility:hidden}
#intro .logo{width:120px;opacity:0;animation:up 1.4s .2s ease forwards}
#intro svg{width:min(62vw,360px);overflow:visible}
#intro .inf{fill:none;stroke:var(--ink);stroke-width:1.1;stroke-dasharray:1200;stroke-dashoffset:1200;animation:draw 3.2s .5s cubic-bezier(.6,0,.2,1) forwards}
#intro .t{font-weight:100;letter-spacing:.6em;font-size:clamp(28px,5vw,54px);padding-left:.6em;opacity:0;animation:up 1.6s 1.4s ease forwards}
#intro .s{font-size:11px;letter-spacing:.45em;color:var(--mid);opacity:0;animation:up 1.4s 1.9s ease forwards}
#enter{margin-top:8px;position:relative;width:86px;height:86px;border-radius:50%;border:1px solid var(--ink);background:none;cursor:pointer;font:400 10px/1 var(--sans);letter-spacing:.35em;padding-left:.35em;color:var(--ink);opacity:0;animation:up 1.2s 2.6s ease forwards}
#enter::after{content:'';position:absolute;inset:-9px;border-radius:50%;border:1px solid rgba(0,0,0,.18);animation:pulse 2.4s 3s infinite}
#enter:hover{background:var(--ink);color:#fff}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes pulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.45);opacity:0}}
/* ---------- film ---------- */
#hero{position:relative;height:100vh;height:100svh;overflow:hidden;background:#fff}
#hero video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#hero .over{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding:0 24px 9vh;text-align:center;pointer-events:none}
#hero h1{font-weight:100;font-size:clamp(54px,13vw,190px);letter-spacing:.14em;padding-left:.14em;line-height:.9;opacity:0;transform:translateY(30px);transition:all 1.6s cubic-bezier(.2,.7,.2,1)}
#hero p{margin-top:18px;font-family:var(--serif);font-style:italic;font-size:clamp(18px,2.2vw,28px);opacity:0;transform:translateY(20px);transition:all 1.4s .4s ease}
#hero .cue{margin-top:34px;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--ink);text-decoration:none;pointer-events:auto;opacity:0;transition:opacity 1s 1s}
#hero .cue span{font-size:10px;letter-spacing:.45em;padding-left:.45em;text-transform:uppercase}
#hero .cue svg{animation:cue 1.8s ease-in-out infinite}
@keyframes cue{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
#hero.done h1,#hero.done p{opacity:1;transform:none}#hero.done .cue{opacity:1}
#hero .num{position:absolute;top:28px;left:28px;font-size:10px;letter-spacing:.4em;color:var(--mid)}
#son{position:fixed;top:22px;right:22px;z-index:40;width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.8);backdrop-filter:blur(8px);cursor:pointer;display:none;align-items:center;justify-content:center;gap:3px}
#son i{display:block;width:2px;background:var(--ink);height:6px;animation:eq 1s infinite ease-in-out}
#son i:nth-child(2){animation-delay:.2s}#son i:nth-child(3){animation-delay:.4s}
#son.off i{animation:none;height:2px}
@keyframes eq{0%,100%{height:4px}50%{height:16px}}
/* ---------- sections ---------- */
section{padding:8vh 24px;position:relative}
.wrap{max-width:1180px;margin:0 auto}
.k{font-size:10px;letter-spacing:.5em;color:var(--mid);text-transform:uppercase}
.big{font-weight:100;font-size:clamp(40px,6.4vw,92px);line-height:1.02;letter-spacing:-.01em;margin-top:22px}
.big em{font-family:var(--serif);font-weight:400}
.rv{opacity:0;transform:translateY(40px);transition:opacity 1.3s ease,transform 1.3s cubic-bezier(.2,.7,.2,1)}
.rv.in{opacity:1;transform:none}
/* intro texte */
#manifeste .wrap{display:grid;grid-template-columns:1.1fr 1fr;gap:6vw;align-items:end}
#manifeste p.lead{font-size:clamp(16px,1.4vw,19px);line-height:1.9;color:#333;max-width:520px}
/* configurateur */
#config{background:#fff;border-top:1px solid var(--line)}
#config .wrap{display:grid;grid-template-columns:1fr 1fr;gap:5vw;align-items:center}
.stage{position:relative;height:min(78vh,720px);display:flex;align-items:flex-end;justify-content:center}
.stage::after{content:'';position:absolute;bottom:4%;left:50%;width:44%;height:22px;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(0,0,0,.16),transparent 70%);filter:blur(4px)}
.stage img{position:absolute;bottom:5%;height:92%;width:auto;max-width:100%;object-fit:contain;opacity:0;transform:translateY(-30px);transition:opacity .7s ease,transform .9s cubic-bezier(.2,1.25,.3,1)}
.stage img.on{opacity:1;transform:none}
.floors{display:flex;gap:10px;margin:40px 0 34px}
.floors button{flex:1;height:64px;border:1px solid var(--line);background:#fff;cursor:pointer;font:200 26px/1 var(--sans);color:var(--ink);transition:all .35s}
.floors button:hover{border-color:var(--ink)}
.floors button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.prix{font-weight:100;font-size:clamp(64px,9vw,128px);line-height:1;letter-spacing:-.02em}
.prix small{font-size:.32em;letter-spacing:.1em;margin-left:6px}
.lbl{margin-top:12px;color:var(--mid);font-size:14px;letter-spacing:.06em}
.cta{display:inline-flex;align-items:center;gap:16px;margin-top:40px;padding:20px 34px;border:1px solid var(--ink);text-decoration:none;font-size:11px;letter-spacing:.4em;transition:all .4s}
.cta:hover{background:var(--ink);color:#fff}
.cta span{display:inline-block;width:28px;height:1px;background:currentColor;transition:width .4s}
.cta:hover span{width:44px}
/* la boîte en vrai */
#vraie{border-top:1px solid var(--line)}
#vraie .wrap{display:grid;grid-template-columns:.8fr 1.2fr;gap:6vw;align-items:center}
#vraie video{width:100%;max-height:82vh;object-fit:cover;display:block;background:#fff}
#vraie p.lead{font-size:clamp(16px,1.4vw,19px);line-height:1.9;color:#333;max-width:460px;margin-top:28px}
/* galerie */
#galerie{border-top:1px solid var(--line);padding-left:0;padding-right:0}
#galerie .wrap{padding:0 24px}
.rail{display:flex;gap:2px;margin-top:8vh;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:0 24px}
.rail::-webkit-scrollbar{display:none}
.rail figure{flex:0 0 min(42vw,560px);scroll-snap-align:center;overflow:hidden;background:#fff}
.rail img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;transition:transform 1.4s cubic-bezier(.2,.7,.2,1)}
.rail figure:hover img{transform:scale(1.06)}
.rail figcaption{padding:16px 2px 0;font-size:10px;letter-spacing:.4em;color:var(--mid)}

/* ---------- modularité (défilement) ---------- */
#modul{padding:0;border-top:1px solid var(--line)}
#modul .piste{position:relative}
#modul .scene{position:relative;padding:6vh 0;display:grid;grid-template-columns:1fr 1fr;align-items:center;overflow:hidden}
#modul .txt{padding:0 6vw}
#modul .vue{justify-self:center;display:flex;flex-direction:column;align-items:center}
#modul canvas{height:min(72vh,780px);width:auto;max-width:44vw;cursor:grab;touch-action:pan-y}
.curseur{width:min(360px,80vw);margin-top:26px;text-align:center}
.curseur input{-webkit-appearance:none;appearance:none;width:100%;height:2px;background:var(--line);outline:none;cursor:pointer}
.curseur input::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border-radius:50%;background:#fff;border:1px solid var(--ink);box-shadow:0 4px 14px rgba(0,0,0,.12);cursor:grab}
.curseur input::-moz-range-thumb{width:30px;height:30px;border-radius:50%;background:#fff;border:1px solid var(--ink);cursor:grab}
.curseur .aide{margin-top:14px;font-size:10px;letter-spacing:.35em;color:var(--mid);text-transform:uppercase;display:flex;justify-content:space-between}
#modul .etapes{margin-top:7vh;position:relative;height:130px}
#modul .etape{position:absolute;inset:0;opacity:0;transform:translateY(16px);transition:opacity .8s ease,transform .8s ease}
#modul .etape.on{opacity:1;transform:none}
#modul .etape b{display:block;font-weight:200;font-size:clamp(22px,2.4vw,34px)}
#modul .etape span{display:block;margin-top:10px;color:var(--mid);font-size:14px;line-height:1.8;max-width:380px}
#modul .barre{margin-top:28px;width:180px;height:1px;background:var(--line);position:relative}
#modul .barre i{position:absolute;left:0;top:0;height:1px;background:var(--ink);width:0}
/* ---------- configurateur v2 ---------- */
.pile{position:relative;height:min(78vh,720px);aspect-ratio:376/740;margin:0 auto}
.pile img{position:absolute;left:0;top:0;width:100%;height:100%;transition:transform .9s cubic-bezier(.2,1.2,.3,1),opacity .5s ease}
.pile::after{content:'';position:absolute;bottom:13%;left:50%;width:82%;height:20px;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(0,0,0,.14),transparent 70%);filter:blur(4px);z-index:-1}
.reglage{display:flex;align-items:center;gap:22px;margin:38px 0 10px}
.reglage button.pm{width:58px;height:58px;border-radius:50%;border:1px solid var(--ink);background:#fff;font:200 30px/1 var(--sans);cursor:pointer;transition:all .3s}
.reglage button.pm:hover{background:var(--ink);color:#fff}
.reglage button.pm:disabled{opacity:.2;cursor:default;background:#fff;color:var(--ink)}
.reglage .n{font-weight:100;font-size:64px;width:56px;text-align:center;line-height:1}
.points{display:flex;gap:10px;margin-left:6px}
.points i{width:9px;height:9px;border-radius:50%;border:1px solid var(--ink);cursor:pointer;transition:background .3s}
.points i.on{background:var(--ink)}
.capa{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:26px;border-top:1px solid var(--line)}
.capa div{padding:16px 10px 0 0}
.capa b{display:block;font-weight:200;font-size:34px;line-height:1;transition:transform .4s}
.capa b.pop{transform:scale(1.18)}
.capa span{display:block;margin-top:8px;font-size:10px;letter-spacing:.25em;color:var(--mid);text-transform:uppercase}
.capa em{font-style:normal;color:var(--mid);font-size:11px;display:block;margin-top:2px}
/* ---------- partout ---------- */
#partout{border-top:1px solid var(--line)}
#partout .tete{text-align:center;margin-bottom:6vh}
.edito{display:grid;grid-template-columns:repeat(3,1fr);gap:3vw 2vw;max-width:1280px;margin:0 auto}
.edito figure{position:relative;overflow:hidden}
.edito img{width:100%;display:block;aspect-ratio:1/1;object-fit:cover;transition:transform 1.6s cubic-bezier(.2,.7,.2,1)}
.edito figure:hover img{transform:scale(1.04)}
.edito figcaption{margin-top:14px;display:flex;justify-content:space-between;align-items:baseline;font-size:10px;letter-spacing:.4em;color:var(--mid);text-transform:uppercase}
.edito figcaption b{font-family:var(--serif);font-style:italic;font-weight:400;font-size:20px;letter-spacing:0;color:var(--ink);text-transform:none}

.edito .vide{aspect-ratio:1/1;border:1px dashed #d8d8d8;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:10px;letter-spacing:.3em}
/* ---------- grandit ---------- */
#grandit{border-top:1px solid var(--line);overflow:hidden}
#grandit .wrap{display:grid;grid-template-columns:1fr 1fr;gap:6vw;align-items:end}
#grandit p{font-size:clamp(16px,1.4vw,19px);line-height:1.9;color:#333;max-width:470px;margin-top:22px}
.marches{display:flex;align-items:flex-end;justify-content:center;gap:1.2vw;margin-top:6vh;padding:0 24px}
.marches figure{flex:0 1 220px;text-align:center}
.marches img{width:100%;display:block;opacity:0;transform:translateY(40px);transition:opacity 1s ease,transform 1.2s cubic-bezier(.2,.7,.2,1)}
.marches.in img{opacity:1;transform:none}
.marches.in figure:nth-child(2) img{transition-delay:.15s}.marches.in figure:nth-child(3) img{transition-delay:.3s}
.marches.in figure:nth-child(4) img{transition-delay:.45s}.marches.in figure:nth-child(5) img{transition-delay:.6s}
.marches figcaption{margin-top:16px;font-size:10px;letter-spacing:.35em;color:var(--mid)}
/* ---------- signature ---------- */
#signature{min-height:80vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:8vh 24px;position:relative;overflow:hidden}
#signature h2{font-weight:100;font-size:clamp(46px,8.5vw,130px);line-height:1.02;letter-spacing:-.01em}
#signature h2 span{display:block;opacity:0;transform:translateY(40px);transition:opacity 1.2s ease,transform 1.4s cubic-bezier(.2,.7,.2,1)}
#signature.in h2 span{opacity:1;transform:none}
#signature.in h2 span:nth-child(2){transition-delay:.35s}#signature.in h2 span:nth-child(3){transition-delay:.7s}
#signature h2 em{font-family:var(--serif)}
#signature p{margin-top:5vh;font-family:var(--serif);font-style:italic;font-size:clamp(18px,1.8vw,24px);color:#444}
#signature .halo{position:absolute;width:70vmin;height:70vmin;border-radius:50%;border:1px solid #f0f0f0;left:50%;top:50%;transform:translate(-50%,-50%);animation:halo 9s ease-in-out infinite}
#signature .halo.b{width:95vmin;height:95vmin;animation-delay:-4s}
@keyframes halo{0%,100%{transform:translate(-50%,-50%) scale(.96);opacity:.6}50%{transform:translate(-50%,-50%) scale(1.03);opacity:1}}
@media(prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .rv,.marches img,#signature h2 span{opacity:1!important;transform:none!important}
  #modul .piste{height:auto}#modul .scene{position:relative}
}
/* capacité */
#capacite{border-top:1px solid var(--line)}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);margin-top:9vh;border-top:1px solid var(--ink)}
.grid4 div{padding:34px 20px 10px 0;border-right:1px solid var(--line)}
.grid4 div:last-child{border-right:0}
.grid4 b{display:block;font-weight:100;font-size:clamp(56px,6vw,90px);line-height:1}
.grid4 span{display:block;margin-top:14px;font-size:13px;letter-spacing:.18em;text-transform:uppercase}
.grid4 i{display:block;margin-top:6px;font-style:normal;color:var(--mid);font-size:13px}
/* caractéristiques */
#carac{border-top:1px solid var(--line)}
.ligne{display:flex;justify-content:space-between;align-items:baseline;padding:28px 0;border-bottom:1px solid var(--line);font-size:clamp(18px,2vw,26px);font-weight:200}
.ligne:first-of-type{margin-top:8vh;border-top:1px solid var(--line)}
.ligne small{font-size:10px;letter-spacing:.4em;color:var(--mid)}
/* final */
#final{text-align:center;padding:22vh 24px 18vh;overflow:hidden}
#final .big{max-width:980px;margin:22px auto 0}
.defile{margin-top:6vh;white-space:nowrap;font-weight:100;font-size:clamp(40px,7vw,104px);color:#ececec;letter-spacing:.06em}
.defile div{display:inline-block;animation:defile 26s linear infinite}
@keyframes defile{to{transform:translateX(-50%)}}
footer{padding:40px 24px 60px;text-align:center}
footer img{width:96px;opacity:.9}
@media(max-width:820px){
  #manifeste .wrap,#config .wrap,#vraie .wrap{grid-template-columns:1fr}
  .rail figure{flex-basis:78vw}
  .stage{height:56vh}
  .grid4{grid-template-columns:1fr 1fr}
  #modul .scene{grid-template-columns:1fr;grid-template-rows:auto 1fr;padding-top:8vh}
  #modul canvas{height:50vh;max-width:80vw}
  #modul .etapes{height:110px;margin-top:3vh}
  .pile{height:36vh}
  #config .big{font-size:30px!important}
  .capa{grid-template-columns:1fr 1fr}
  .edito{grid-template-columns:1fr 1fr;gap:28px 12px}
  .edito figcaption{flex-direction:column;gap:4px}
  .edito figcaption b{font-size:16px}
  #grandit .wrap{grid-template-columns:1fr}
  .marches{gap:2vw}.grid4 div:nth-child(2){border-right:0}
  .grid4 div{border-bottom:1px solid var(--line)}
  .floors button{height:54px;font-size:22px}
}
</style></head><body class="locked">

<div id="intro">
  <img class="logo" src="/infinity/img/logo-mood.png" alt="mood">
  <svg viewBox="0 0 300 120"><path class="inf" d="M150 60 C 120 15, 40 15, 40 60 C 40 105, 120 105, 150 60 C 180 15, 260 15, 260 60 C 260 105, 180 105, 150 60 Z"/></svg>
  <div class="t">INFINITY</div>
  <div class="s">OO N°3 · LA BOÎTE QUI GRANDIT AVEC TOI</div>
  <button id="enter" aria-label="Entrer">ENTRER</button>
</div>
<button id="son" aria-label="Son"><i></i><i></i><i></i></button>
<audio id="music" src="/infinity/musique.m4a" loop preload="auto"></audio>

<header id="hero">
  <video id="film" src="/infinity/vid/infinity-film.mp4" muted playsinline preload="auto"></video>
  <div class="num">OO N°3</div>
  <div class="over"><h1>Infinity</h1><p>Votre collection grandit, votre boîte aussi.</p><a class="cue" href="#manifeste" aria-label="Découvrir la suite"><span>Découvrir</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M5 9l7 7 7-7"/></svg></a></div>
</header>

<section id="manifeste"><div class="wrap">
  <div class="rv"><div class="k">Nouveau · rangement modulable</div><h2 class="big">Un étage.<br>Deux étages…<br><em>ou cinq.</em></h2></div>
  <p class="lead rv">Infinity OO N°3, c’est la nouvelle boîte de rangement modulable mood, pensée pour s’adapter à votre collection, à vos envies et à votre quotidien. Ronde, épurée, élégante : à la maison, en voyage ou simplement dans votre sac, vos mood préférées restent toujours à portée de main.</p>
</div></section>


<section id="modul"><div class="piste"><div class="scene">
  <div class="txt">
    <div class="k">Le principe Infinity</div>
    <h2 class="big">Composez.<br>Empilez.<br><em>Emportez.</em></h2>
    <div class="etapes">
      <div class="etape on" data-a="0"><b>Une seule boîte.</b><span>Fermée, compacte, ronde. Elle tient dans la main.</span></div>
      <div class="etape" data-a=".22"><b>Le couvercle mood.</b><span>Il se soulève et coiffe toujours l’étage du haut, quelle que soit la hauteur de votre boîte.</span></div>
      <div class="etape" data-a=".4"><b>Chaque étage, un écrin.</b><span>Des fentes sur mesure et un emplacement pour votre base, à chaque niveau.</span></div>
      <div class="etape" data-a=".7"><b>Et tout se réassemble.</b><span>Les étages se clipsent les uns sur les autres. Ajoutez-en, retirez-en : la boîte suit votre collection.</span></div>
    </div>
    <div class="barre"><i id="modulBarre"></i></div>
  </div>
  <div class="vue"><canvas id="modulCanvas" width="360" height="886" aria-label="La boîte Infinity qui se sépare étage par étage puis se réassemble"></canvas>
  <div class="curseur"><input type="range" id="modulCurseur" min="0" max="79" value="0" aria-label="Glissez pour ouvrir la boîte"><div class="aide"><span>Fermée</span><span>Glissez</span><span>Refermée</span></div></div></div>
</div></div></section>

<section id="config"><div class="wrap">
  <div class="pile rv" id="pile" aria-live="polite"></div>
  <div class="rv">
    <div class="k">Composez votre Infinity</div>
    <h2 class="big" style="font-size:clamp(34px,4.4vw,62px)">Ajoutez.<br>Retirez.<br><em>Composez.</em></h2>
    <div class="reglage">
      <button class="pm" id="moins" aria-label="Retirer un étage">−</button>
      <div class="n" id="nb">1</div>
      <button class="pm" id="plus" aria-label="Ajouter un étage">+</button>
      <div class="points" id="points"><i class="on"></i><i></i><i></i><i></i><i></i></div>
    </div>
    <div class="lbl" id="lbl">1 étage + couvercle mood inclus</div>
    <div class="capa" aria-label="Capacité de rangement">
      <div><b id="c1">1</b><span>Base mood</span></div>
      <div><b id="c2">1</b><span>Addon</span></div>
      <div><b id="c3">2</b><span>Deux tiers</span></div>
      <div><b id="c4">2</b><span>Mediums</span><em id="c5">ou 4 minis</em></div>
    </div>
    <div class="prix" style="margin-top:34px"><span id="prix">49</span><small>.–</small></div>
    <a class="cta" id="ctaConfig" href="${FICHE}">JE COMPOSE MON INFINITY <span></span></a>
  </div>
</div></section>

<section id="vraie"><div class="wrap">
  <video class="rv" src="/infinity/vid/infinity-vraie.mp4" muted loop playsinline autoplay preload="metadata"></video>
  <div class="rv"><div class="k">Ouvrez · rangez · refermez</div><h2 class="big">Chaque étage,<br><em>un écrin.</em></h2>
  <p class="lead">Une mousse douce, des fentes sur mesure pour vos addons, deux tiers, mediums et minis, et un emplacement pour votre base. On ouvre, on choisit, on referme : votre collection est rangée, protégée, prête à partir avec vous.</p></div>
</div></section>

<section id="galerie">
  <div class="wrap rv"><div class="k">Infinity OO N°3 · Blanc</div><h2 class="big">Ronde. Douce. <em>Infinie.</em></h2></div>
  <div class="rail rv">
    <figure><img src="/infinity/img/visuel-1.webp" alt="Infinity fermée" loading="lazy"><figcaption>FERMÉE</figcaption></figure>
    <figure><img src="/infinity/img/visuel-2.webp" alt="Infinity ouverte" loading="lazy"><figcaption>OUVERTE</figcaption></figure>
    <figure><img src="/infinity/img/visuel-3.webp" alt="Infinity avec bagues" loading="lazy"><figcaption>AVEC VOS MOOD</figcaption></figure>
    <figure><img src="/infinity/img/visuel-4.webp" alt="Infinity 2 étages" loading="lazy"><figcaption>2 ÉTAGES</figcaption></figure>
    <figure><img src="/infinity/img/visuel-5.webp" alt="Infinity 1 étage" loading="lazy"><figcaption>1 ÉTAGE</figcaption></figure>
  </div>
</section>

<section id="partout">
  <div class="tete rv"><div class="k">Infinity vous accompagne</div><h2 class="big">Votre mood.<br>Partout. <em>À l’infini.</em></h2></div>
  <div class="edito">
    <figure class="e1 rv"><img src="/infinity/vie/sac-a-main.webp?v=4" alt="Infinity dans un sac à main" loading="lazy"><figcaption><b>Dans votre sac</b>LE QUOTIDIEN</figcaption></figure>
    <figure class="e2 rv"><img src="/infinity/vie/valise.webp?v=4" alt="Infinity dans une valise" loading="lazy"><figcaption><b>Dans la valise</b>LES VACANCES</figcaption></figure>
    <figure class="e3 rv"><img src="/infinity/vie/trousse.webp?v=4" alt="Infinity dans une trousse de toilette" loading="lazy"><figcaption><b>Dans la trousse</b>LE WEEK-END</figcaption></figure>
    <figure class="e4 rv"><img src="/infinity/vie/coiffeuse.webp?v=4" alt="Infinity sur une coiffeuse" loading="lazy"><figcaption><b>Sur la coiffeuse</b>VOTRE COLLECTION</figcaption></figure>
    <figure class="e5 rv"><img src="/infinity/vie/table-de-nuit.webp?v=4" alt="Infinity sur une table de nuit" loading="lazy"><figcaption><b>Sur la table de nuit</b>CHAQUE MATIN</figcaption></figure>
    <figure class="e6 rv"><img src="/infinity/vie/sac-de-sport.webp?v=4" alt="Infinity dans un sac de sport" loading="lazy"><figcaption><b>Dans le sac de sport</b>L’ENTRAÎNEMENT</figcaption></figure>
  </div>
</section>

<section id="grandit">
  <div class="wrap">
    <div class="rv"><div class="k">Une boîte qui grandit avec votre collection</div><h2 class="big">Aujourd’hui, un étage.<br><em>Demain, peut-être cinq.</em></h2></div>
    <div class="rv"><p>Votre collection évolue, vos envies aussi.</p><p>Infinity a été imaginée pour grandir avec vous. Choisissez aujourd’hui le nombre d’étages qui vous correspond et, prochainement, agrandissez votre boîte en ajoutant de nouveaux étages.</p><p><em style="font-family:var(--serif)">Parce que chez mood, les possibilités ne s’arrêtent jamais.</em></p></div>
  </div>
  <div class="marches" id="marches">
    <figure><img src="/infinity/img/pile-1.webp" alt="1 étage" loading="lazy"><figcaption>1</figcaption></figure>
    <figure><img src="/infinity/img/pile-2.webp" alt="2 étages" loading="lazy"><figcaption>2</figcaption></figure>
    <figure><img src="/infinity/img/pile-3.webp" alt="3 étages" loading="lazy"><figcaption>3</figcaption></figure>
    <figure><img src="/infinity/img/pile-4.webp" alt="4 étages" loading="lazy"><figcaption>4</figcaption></figure>
    <figure><img src="/infinity/img/pile-5.webp" alt="5 étages" loading="lazy"><figcaption>5</figcaption></figure>
  </div>
</section>

<section id="capacite"><div class="wrap">
  <div class="rv"><div class="k">Capacité de rangement</div><h2 class="big">Dans chaque étage.</h2></div>
  <div class="grid4 rv">
    <div><b>1</b><span>Base mood</span></div>
    <div><b>1</b><span>Addon</span></div>
    <div><b>2</b><span>Deux tiers</span></div>
    <div><b>2</b><span>Mediums</span><i>ou 4 minis</i></div>
  </div>
</div></section>

<section id="carac"><div class="wrap">
  <div class="rv"><div class="k">Caractéristiques</div><h2 class="big">Pensée pour <em>durer.</em></h2></div>
  <div class="rv">
    <div class="ligne">Couleur <small>BLANC</small></div>
    <div class="ligne">Format rond, compact et nomade <small>OO N°3</small></div>
    <div class="ligne">Système modulable et empilable <small>1 → 5 ÉTAGES</small></div>
    <div class="ligne">Compartiments adaptés aux bijoux mood <small>SUR MESURE</small></div>
    <div class="ligne">Couvercle mood inclus <small>TOUJOURS</small></div>
  </div>
</div></section>

<section id="signature">
  <div class="halo"></div><div class="halo b"></div>
  <h2><span>Toutes vos envies.</span><span>Toutes vos mood.</span><span><em>Partout.</em></span></h2>
  <p>Une collection sans limites mérite un écrin sans limites.</p>
  <a class="cta" href="#config">COMPOSER MON INFINITY <span></span></a>
  <div class="defile" aria-hidden="true"><div>COMPOSEZ · EMPILEZ · EMPORTEZ · COMPOSEZ · EMPILEZ · EMPORTEZ · </div><div>COMPOSEZ · EMPILEZ · EMPORTEZ · COMPOSEZ · EMPILEZ · EMPORTEZ · </div></div>
</section>
<footer><img src="/infinity/img/logo-mood.png" alt="mood"></footer>

<script>
(function(){
  var intro=document.getElementById('intro'),film=document.getElementById('film'),hero=document.getElementById('hero'),
      music=document.getElementById('music'),son=document.getElementById('son');
  function fadeTo(v,ms){var s=music.volume,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/ms);music.volume=Math.max(0,Math.min(1,s+(v-s)*k));if(k<1)requestAnimationFrame(f)})(t0)}
  document.getElementById('enter').addEventListener('click',function(){
    intro.classList.add('gone');document.body.classList.remove('locked');
    music.volume=0;music.play().catch(function(){});fadeTo(.8,1800);
    film.currentTime=0;film.play().catch(function(){});
    son.style.display='flex';
  });
  film.addEventListener('ended',function(){hero.classList.add('done');setTimeout(function(){fadeTo(.45,4000)},2500)});
  son.addEventListener('click',function(){if(music.paused){music.play();fadeTo(.6,800);son.classList.remove('off')}else{music.pause();son.classList.add('off')}});
  // apparitions au défilement
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.18});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
  var reduit=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // configurateur : la pile se construit étage par étage
  var PRIX=[49,59,69,79,89],pile=document.getElementById('pile'),N=1,PAS=99/740*100,
      nb=document.getElementById('nb'),lbl=document.getElementById('lbl'),pr=document.getElementById('prix'),
      moins=document.getElementById('moins'),plus=document.getElementById('plus'),pts=document.querySelectorAll('#points i'),cur=49;
  var etages=[],couv;
  for(var e=0;e<5;e++){var im=new Image();im.src='/infinity/img/etage.webp';im.alt='';im.style.zIndex=e+1;pile.appendChild(im);etages.push(im)}
  couv=new Image();couv.src='/infinity/img/couvercle.webp';couv.alt='couvercle mood';couv.style.zIndex=20;pile.appendChild(couv);
  function compte(to){var from=cur,t0=performance.now();cur=to;if(reduit){pr.textContent=to;return}(function f(t){var k=Math.min(1,(t-t0)/500);pr.textContent=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0)}
  function pop(id,v){var el=document.getElementById(id);if(el.textContent!=String(v)){el.textContent=v;el.classList.add('pop');setTimeout(function(){el.classList.remove('pop')},250)}}
  function regle(n){
    N=Math.max(1,Math.min(5,n));
    etages.forEach(function(im,i){
      if(i<N){im.style.opacity=1;im.style.transform='translateY(-'+(i*PAS)+'%)'}
      else{im.style.opacity=0;im.style.transform='translateY(-'+(i*PAS+18)+'%)'}
    });
    couv.style.transform='translateY(-'+(N*PAS)+'%)';
    nb.textContent=N;moins.disabled=N===1;plus.disabled=N===5;
    pts.forEach(function(p,i){p.classList.toggle('on',i<N)});
    lbl.textContent=N+(N>1?' étages':' étage')+' + couvercle mood inclus';
    pop('c1',N);pop('c2',N);pop('c3',2*N);pop('c4',2*N);document.getElementById('c5').textContent='ou '+(4*N)+' minis';
    compte(PRIX[N-1]);
  }
  moins.addEventListener('click',function(){regle(N-1)});plus.addEventListener('click',function(){regle(N+1)});
  pts.forEach(function(p,i){p.addEventListener('click',function(){regle(i+1)})});
  regle(1);
  // modularité : la boîte se sépare puis se réassemble au fil du défilement
  var cv=document.getElementById('modulCanvas'),cx=cv.getContext('2d'),piste=document.querySelector('#modul .piste'),
      barre=document.getElementById('modulBarre'),ets=document.querySelectorAll('#modul .etape'),IM=[],NF=80,dern=-1;
  for(var f=0;f<NF;f++){var ii=new Image();ii.src='/infinity/explode/x'+(f<10?'0':'')+f+'.webp';IM.push(ii)}
  function dessine(i){var im=IM[i];if(!im.complete||!im.naturalWidth){if(!im.complete)im.onload=function(){if(dern===i)dessine(i)};return}cx.clearRect(0,0,cv.width,cv.height);cx.drawImage(im,0,0,cv.width,cv.height)}
  var curs=document.getElementById('modulCurseur');
  function defile(){
    var i=+curs.value,p=i/(NF-1);if(i!==dern){dern=i;dessine(i)}
    barre.style.width=(p*100)+'%';
    var act=0;ets.forEach(function(el,k){if(p>=parseFloat(el.dataset.a))act=k});ets.forEach(function(el,k){el.classList.toggle('on',k===act)});
  }
  IM[0].onload=function(){defile()};curs.addEventListener('input',defile);
  // on peut aussi glisser directement sur la boîte
  var tire=null;cv.addEventListener('pointerdown',function(e){tire={x:e.clientX,v:+curs.value};cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing'});
  cv.addEventListener('pointermove',function(e){if(!tire)return;curs.value=Math.max(0,Math.min(NF-1,Math.round(tire.v+(e.clientX-tire.x)/4)));defile()});
  cv.addEventListener('pointerup',function(){tire=null;cv.style.cursor='grab'});
  // les cinq configurations montent en marche
  new IntersectionObserver(function(es){if(es[0].isIntersecting)document.getElementById('marches').classList.add('in')},{threshold:.3}).observe(document.getElementById('marches'));
  new IntersectionObserver(function(es){if(es[0].isIntersecting)document.getElementById('signature').classList.add('in')},{threshold:.35}).observe(document.getElementById('signature'));
  // la vidéo de la vraie boîte se lance quand on arrive dessus
  var vv=document.querySelector('#vraie video');
  new IntersectionObserver(function(es){es[0].isIntersecting?vv.play().catch(function(){}):vv.pause()},{threshold:.3}).observe(vv);
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
