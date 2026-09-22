export const dynamic = 'force-static';

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>mood XS MAX</title><meta name="robots" content="noindex,nofollow"></head><body style="margin:0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap">
<style>
:root{
  --serif:'Cormorant Garamond','Times New Roman',serif;
  --sans:'Helvetica Neue',Helvetica,Arial,sans-serif;
  --ivory:#f8f5f0;
  --cream:#f2ede6;
  --dark:#1a1a18;
  --mid:#888680;
  --light:#e8e2d8;
  --gold:#a8864a;
  --stage:#0b0b0c;
  --stage-soft:#141415;
  --on-stage:#f4f2ee;
  --on-stage-mid:#8e8c88;
  --c-acier:#c9c9c7;
  --c-bleu:#2f5cff;
  --c-gold:#d69a78;
  --c-black:#9a9a98;
}
*,*::before,*::after{box-sizing:border-box}
body{
  margin:0;background:var(--ivory);color:var(--dark);
  font-family:var(--sans);line-height:1.5;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
img,video{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
h1,h2,h3,p{margin:0}

/* ---------- utilitaires typo ---------- */
.eyebrow{
  font-size:10px;letter-spacing:3.2px;text-transform:uppercase;
  font-family:var(--serif);font-style:italic;color:var(--mid);
}
.stage .eyebrow{color:var(--on-stage-mid)}
.display{
  font-family:var(--serif);font-weight:300;line-height:.98;
  letter-spacing:-.02em;text-wrap:balance;
}
.h-xxl{font-size:clamp(38px,6.2vw,92px)}
.line{
  white-space:nowrap;font-style:normal;font-weight:300;
  font-size:clamp(17px,4.5vw,76px);letter-spacing:-.005em;line-height:1.05;
  color:#fff;
}
.h-xl{font-size:clamp(30px,4.4vw,62px)}
.h-l{font-size:clamp(25px,3vw,42px)}
.lede{
  font-family:var(--serif);font-style:normal;font-weight:300;
  font-size:clamp(15px,1.35vw,18px);color:var(--mid);line-height:1.6;
  max-width:44ch;
}
.stage .lede{color:var(--on-stage-mid)}
.link{
  font-family:var(--sans);font-size:11px;letter-spacing:3px;text-transform:uppercase;
  border-bottom:1px solid currentColor;padding-bottom:3px;display:inline-block;
  transition:color .25s,border-color .25s;
}
.link:hover,.link:focus-visible{color:var(--gold);border-color:var(--gold)}
:focus-visible{outline:2px solid var(--gold);outline-offset:4px}

/* ---------- bandes ---------- */
.band{padding-block:clamp(48px,6vw,92px);padding-left:24px;padding-right:24px}
.band-ivory{background:var(--ivory)}
.band-cream{background:var(--cream)}
.wrap{max-width:1180px;margin:0 auto}
.center{text-align:center}
.stage{background:var(--stage);color:var(--on-stage)}

/* ---------- barre haute ---------- */
.topbar{
  position:fixed;left:0;right:0;top:0;z-index:60;
  display:flex;align-items:center;justify-content:space-between;
  gap:16px;padding:14px 24px;padding-top:calc(14px + env(safe-area-inset-top,0px));
  background:rgba(11,11,12,0);
  transition:background .5s ease,backdrop-filter .5s ease,transform .5s ease;
  transform:translateY(-100%);pointer-events:none;
}
.topbar.on{background:rgba(11,11,12,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transform:none;pointer-events:auto}
.topbar img{width:96px}
.topbar .link{color:#f4f2ee;font-size:10px}

/* ---------- hero ---------- */
.hero{
  background:var(--stage);color:var(--on-stage);text-align:center;
  padding:clamp(62px,8vw,104px) 24px clamp(30px,3.6vw,48px);
  position:relative;overflow:hidden;
}
.hero::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse 62% 58% at 50% 34%,rgba(255,255,255,.09),transparent 66%);
  pointer-events:none;
}
.hero>*{position:relative}
.hero .eyebrow{color:var(--on-stage-mid)}
.hero .lede{color:var(--on-stage-mid)}
.hero .link{color:var(--on-stage);border-color:rgba(244,242,238,.55)}
.hero .link:hover{color:var(--gold);border-color:var(--gold)}
.hero .eyebrow{display:block;margin-bottom:18px}
.hero .display{margin-bottom:18px}
.hero .display em{font-style:italic}
.hero .lede{margin:0 auto 26px;max-width:none;white-space:nowrap;font-size:clamp(11px,1.22vw,19px)}
.hero-rule{
  width:min(460px,70%);height:1px;background:rgba(244,242,238,.22);margin:30px auto 0;
  transform-origin:center;
}

/* ---------- podium 4 bagues ---------- */
.podium{
  background:var(--stage);padding:clamp(8px,1.6vw,22px) 24px clamp(58px,6.4vw,88px);
  position:relative;overflow:hidden;
}
.podium::before{
  content:"";position:absolute;inset:-20% -10% auto -10%;height:120%;
  background:radial-gradient(ellipse at 50% 38%,rgba(255,255,255,.10),transparent 62%);
  pointer-events:none;
}
.podium-grid{
  position:relative;max-width:1180px;margin:0 auto;
  display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,2vw,28px);
}
.pod{
  position:relative;text-align:center;border:0;background:none;padding:0;
  color:var(--on-stage);cursor:pointer;font:inherit;
}
.pod-media{position:relative;display:block;min-height:80px}
.pod-media img{
  width:100%;transition:transform .7s cubic-bezier(.2,.7,.2,1),filter .7s ease;
  filter:drop-shadow(0 22px 26px rgba(0,0,0,.55));
}
.pod-media video{
  position:absolute;inset:0;width:100%;height:100%;object-fit:contain;
  opacity:0;transition:opacity .45s ease;
}
.pod.live video{opacity:1}
.pod.live img{opacity:0}
.pod:hover .pod-media img,.pod:focus-visible .pod-media img{transform:translateY(-8px) scale(1.04)}
.pod-mirror{
  display:block;height:clamp(34px,4.6vw,68px);margin-top:-2px;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.34),transparent);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.34),transparent);
}
.pod-mirror img{transform:scaleY(-1);width:100%}
.pod-name{
  display:block;margin-top:14px;font-size:11px;letter-spacing:2.6px;text-transform:uppercase;
  color:var(--on-stage-mid);transition:color .3s;
}
.pod:hover .pod-name{color:var(--on-stage)}
.podium-note{
  position:relative;text-align:center;margin-top:clamp(28px,4vw,48px);
  color:var(--on-stage-mid);font-family:var(--serif);font-style:italic;font-size:15px;
}

/* ---------- bande de preuve ---------- */
.proof{
  background:var(--ivory);border-block:1px solid var(--light);
  display:flex;flex-wrap:wrap;justify-content:center;gap:10px 0;
  padding:18px 24px;
}
.proof span{
  font-variant-numeric:lining-nums;font-size:10.5px;letter-spacing:2.6px;text-transform:uppercase;color:var(--mid);
  padding:0 clamp(12px,2.4vw,30px);border-right:1px solid var(--light);
}
.proof span:last-child{border-right:0}

/* ---------- 11 mm ---------- */
.mm{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,5vw,72px);align-items:center}
.mm-fig{position:relative;background:var(--stage);padding:clamp(28px,4vw,54px);display:grid;place-items:center}
.mm-fig img{width:min(420px,88%)}
.mm-caliper{
  width:min(420px,88%);margin-top:26px;position:relative;height:34px;color:#cfcdc8;
}
.mm-caliper .rail{
  position:absolute;top:8px;left:0;height:1px;background:currentColor;
  width:0;transition:width 1.1s cubic-bezier(.2,.8,.2,1) .15s;
}
.in .mm-caliper .rail{width:100%}
.mm-caliper .tick{position:absolute;top:1px;width:1px;height:15px;background:currentColor;opacity:0;transition:opacity .4s ease .9s}
.in .mm-caliper .tick{opacity:1}
.mm-caliper .tick.l{left:0}
.mm-caliper .tick.r{right:0}
.mm-caliper .val{font-variant-numeric:lining-nums;
  position:absolute;top:18px;left:50%;transform:translateX(-50%);
  font-family:var(--serif);font-size:19px;letter-spacing:.06em;
}
.mm-num{font-family:var(--serif);font-variant-numeric:lining-nums;letter-spacing:.01em;font-weight:300;font-size:clamp(58px,8vw,116px);line-height:.8;letter-spacing:-.04em}
.mm-num small{font-size:.22em;letter-spacing:.12em;margin-left:.12em;vertical-align:.9em;color:var(--mid)}

/* ---------- avant / après ---------- */
.ba{position:relative;max-width:980px;margin:clamp(34px,5vw,60px) auto 0;user-select:none;touch-action:pan-y}
.ba-frame{position:relative;aspect-ratio:16/10;overflow:hidden;background:var(--stage)}
.ba-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ba-top{clip-path:inset(0 0 0 50%)}
.ba-handle{
  position:absolute;top:0;bottom:0;left:50%;width:2px;background:rgba(255,255,255,.9);
  transform:translateX(-1px);pointer-events:none;
}
.ba-handle::after{
  content:"";position:absolute;top:50%;left:50%;width:52px;height:52px;margin:-26px 0 0 -26px;
  border:1px solid rgba(255,255,255,.9);border-radius:50%;background:rgba(0,0,0,.18);
}
.ba-tag{
  position:absolute;bottom:16px;font-size:10.5px;letter-spacing:2.6px;text-transform:uppercase;
  color:#fff;background:rgba(0,0,0,.42);padding:7px 12px;
}
.ba-tag.l{left:16px}
.ba-tag.r{right:16px}
.ba-hint{margin-top:14px;text-align:center;font-size:10.5px;letter-spacing:2.6px;text-transform:uppercase;color:var(--mid)}

/* ---------- univers couleur (collant) ---------- */
.colors{position:relative;background:var(--stage)}
.colors-track{height:420vh}
.colors-sticky{
  position:sticky;top:0;height:100vh;overflow:hidden;
  display:grid;place-items:center;
}
.colors-glow{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 70% 62% at 50% 46%,var(--c,#c9c9c7),transparent 66%);
  opacity:.17;transition:background .9s ease,opacity .9s ease;
}
.colors-inner{position:relative;width:100%;max-width:1180px;padding:0 24px;text-align:center}
.colors-word{
  position:relative;height:1.05em;margin-bottom:clamp(6px,1.4vw,14px);
}
.colors-word span{
  position:absolute;inset:0;display:grid;place-items:center;font-style:normal;
  opacity:0;transform:translateY(16px);
  transition:opacity .55s ease,transform .55s cubic-bezier(.2,.7,.2,1);
  color:var(--on-stage);
}
.colors-word span.on{opacity:1;transform:none}
.colors-media{
  position:relative;height:min(56vh,470px);margin:clamp(14px,2.6vw,30px) auto 0;
  display:grid;place-items:center;
}
.colors-media video{
  position:absolute;height:100%;width:auto;max-width:none;object-fit:contain;
  opacity:0;transform:scale(.96);
  transition:opacity .6s ease,transform .8s cubic-bezier(.2,.7,.2,1);
  filter:drop-shadow(0 30px 40px rgba(0,0,0,.6));
}
.colors-media video.on{opacity:1;transform:none}
.colors-rail{
  position:absolute;right:clamp(16px,3vw,44px);top:50%;transform:translateY(-50%);
  display:flex;flex-direction:column;gap:14px;z-index:3;
}
.colors-rail i{
  display:block;width:9px;height:9px;border-radius:50%;
  background:rgba(255,255,255,.22);transition:background .4s,transform .4s;
}
.colors-rail i.on{background:var(--c,#fff);transform:scale(1.5)}
.colors-cap{margin-top:clamp(12px,2vw,20px);color:var(--on-stage-mid);font-family:var(--serif);font-style:italic;font-size:clamp(14px,1.2vw,17px)}

/* ---------- poli / mat ---------- */
.fin-switch{display:flex;justify-content:center;gap:0;margin:clamp(24px,3.4vw,40px) 0 clamp(28px,4vw,48px)}
.fin-switch button{
  font:inherit;font-size:10px;letter-spacing:3px;text-transform:uppercase;
  background:none;border:1px solid var(--light);color:var(--mid);
  padding:10px 22px;cursor:pointer;transition:all .3s;
}
.fin-switch button+button{border-left:0}
.fin-switch button[aria-pressed="true"]{background:var(--dark);border-color:var(--dark);color:var(--ivory)}
.fin-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(10px,2vw,26px)}
.fin-cell{background:var(--stage);padding:clamp(14px,2.2vw,28px);display:grid;place-items:center;aspect-ratio:1/1}
.fin-cell img{transition:opacity .45s ease}
.fin-cell.swap img{opacity:0}
.fin-name{margin-top:12px;text-align:center;font-size:10.5px;letter-spacing:2.6px;text-transform:uppercase;color:var(--mid)}

/* ---------- compositions ---------- */
.compo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,1.6vw,18px)}
.compo-cell{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--stage);cursor:pointer}
.compo-cell img,.compo-cell video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.compo-cell video{opacity:0;transition:opacity .45s ease}
.compo-cell.live video{opacity:1}
.compo-cell figcaption{
  position:absolute;left:0;right:0;bottom:0;padding:34px 14px 12px;
  background:linear-gradient(to top,rgba(10,10,11,.86),transparent);
  color:#f4f2ee;font-size:10.5px;letter-spacing:2.4px;text-transform:uppercase;text-align:center;
}

/* ---------- trois proportions ---------- */
.trio img{width:100%}
.trio-labels{display:grid;grid-template-columns:repeat(3,1fr);margin-top:16px}
.trio-labels span{font-variant-numeric:lining-nums;text-align:center;font-size:10.5px;letter-spacing:2.6px;text-transform:uppercase;color:var(--mid)}
.trio-labels span b{display:block;font-weight:400;color:var(--dark)}

/* ---------- défilé de mains ---------- */
.marquee{overflow:hidden;background:var(--cream);padding-block:clamp(40px,5vw,70px)}
.marquee-row{display:flex;gap:14px;width:max-content;animation:slide 64s linear infinite}
.marquee-row.rev{animation-direction:reverse;margin-top:14px;animation-duration:78s}
.marquee-row img{width:clamp(180px,22vw,290px);aspect-ratio:4/5;object-fit:cover}
@keyframes slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ---------- final ---------- */
.final{
  background:var(--stage);color:var(--on-stage);text-align:center;
  padding:clamp(86px,12vw,160px) 24px;position:relative;overflow:hidden;
}
.final::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 50% at 50% 30%,rgba(255,255,255,.08),transparent 65%);
}
.final>*{position:relative}
.final .link{color:var(--on-stage);border-color:var(--on-stage)}
.final .link:hover{color:var(--gold);border-color:var(--gold)}
.final img.mark{width:132px;margin:0 auto clamp(30px,4vw,48px)}
.foot{
  background:var(--stage);color:var(--on-stage-mid);text-align:center;
  padding:0 24px calc(40px + env(safe-area-inset-bottom,0px));
  font-size:10.5px;letter-spacing:2.4px;text-transform:uppercase;
}

/* ---------- révélations ---------- */
.js .reveal{opacity:.001;transform:translateY(22px);transition:opacity .9s ease,transform .9s cubic-bezier(.2,.7,.2,1)}
.js .reveal.in{opacity:1;transform:none}
.js .reveal.d1{transition-delay:.09s}
.js .reveal.d2{transition-delay:.18s}
.js .reveal.d3{transition-delay:.27s}

/* ---------- ouverture ---------- */
.js .hero .eyebrow,.js .hero h1,.js .hero .lede,.js .hero .link,.js .hero-rule{
  opacity:0;transform:translateY(26px);
  animation:rise .95s cubic-bezier(.2,.7,.2,1) forwards;
}
.js .hero h1{animation-delay:.10s}
.js .hero .lede{animation-delay:.24s}
.js .hero .link{animation-delay:.34s}
.js .hero-rule{animation-delay:.44s;transform:scaleX(.2)}
@keyframes rise{to{opacity:1;transform:none}}
.js .hero-rule{animation-name:draw}
@keyframes draw{to{opacity:1;transform:scaleX(1)}}

@media (max-width:820px){
  .hero .lede{white-space:normal;max-width:46ch;font-size:15px}
  .line{white-space:normal}
}
@media (max-width:900px){
  .mm{grid-template-columns:1fr}
  .fin-grid,.compo-grid{grid-template-columns:repeat(2,1fr)}
  .podium-grid{grid-template-columns:repeat(2,1fr);gap:18px}
  .colors-media{height:34vh}
}
@media (max-width:480px){
  .proof span{border-right:0;padding:0 10px}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  .js .reveal{opacity:1;transform:none}
  .js .hero .eyebrow,.js .hero h1,.js .hero .lede,.js .hero .link,.js .hero-rule{opacity:1;transform:none;animation:none}
  .marquee-row{animation:none}
}
</style>

<header class="topbar" id="topbar">
  <img src="/xsmax/img/logo-blanc.png" alt="mood">
  <a class="link" href="#final">Je découvre la XS MAX</a>
</header>

<section class="hero">
  <span class="eyebrow">Mood Collection · Nouveauté · Base XS MAX</span>
  <h1 class="display line">XS au centre. MAX autour.</h1>
  <p class="lede">La nouvelle base mood, aux bords larges — 11 mm. Quatre couleurs, deux finitions, et un centre qui reste délicat.</p>
  <a class="link" href="#couleurs">Je découvre la XS MAX</a>
  <div class="hero-rule"></div>
</section>

<section class="podium">
  <div class="podium-grid" id="podium">
    <div class="pod" role="button" tabindex="0" data-color="acier">
      <span class="pod-media">
        <img src="/xsmax/img/ring-acier-poli.png" alt="Base mood XS MAX en acier 316L, finition polie">
        <video src="/xsmax/vid/turn-acier.mp4" muted loop playsinline preload="none"></video>
      </span>
      <span class="pod-mirror"><img src="/xsmax/img/ring-acier-poli.png" alt="" aria-hidden="true"></span>
      <span class="pod-name">acier</span>
    </div>
    <div class="pod" role="button" tabindex="0" data-color="bleu">
      <span class="pod-media">
        <img src="/xsmax/img/ring-bleu-poli.png" alt="Base mood XS MAX bleu électrique, finition polie">
        <video src="/xsmax/vid/turn-bleu.mp4" muted loop playsinline preload="none"></video>
      </span>
      <span class="pod-mirror"><img src="/xsmax/img/ring-bleu-poli.png" alt="" aria-hidden="true"></span>
      <span class="pod-name">bleu électrique</span>
    </div>
    <div class="pod" role="button" tabindex="0" data-color="gold">
      <span class="pod-media">
        <img src="/xsmax/img/ring-gold-poli.png" alt="Base mood XS MAX gold, finition polie">
        <video src="/xsmax/vid/turn-gold.mp4" muted loop playsinline preload="none"></video>
      </span>
      <span class="pod-mirror"><img src="/xsmax/img/ring-gold-poli.png" alt="" aria-hidden="true"></span>
      <span class="pod-name">gold</span>
    </div>
    <div class="pod" role="button" tabindex="0" data-color="black">
      <span class="pod-media">
        <img src="/xsmax/img/ring-black-poli.png" alt="Base mood XS MAX black, finition polie">
        <video src="/xsmax/vid/turn-black.mp4" muted loop playsinline preload="none"></video>
      </span>
      <span class="pod-mirror"><img src="/xsmax/img/ring-black-poli.png" alt="" aria-hidden="true"></span>
      <span class="pod-name">black</span>
    </div>
  </div>
  <p class="podium-note">Passe sur une bague — elle tourne.</p>
</section>

<div class="proof">
  <span>Marque suisse</span><span>Depuis 2004</span><span>Base garantie à vie</span>
  <span>75 000+ clientes</span><span>4.8 / 5 · 17 800 avis</span><span>1 000 000+ anneaux vendus</span>
</div>

<section class="band band-ivory">
  <div class="wrap mm">
    <div class="reveal">
      <span class="eyebrow">La différence</span>
      <p class="mm-num" style="margin:18px 0 22px">11<small>mm</small></p>
      <h2 class="display h-l" style="margin-bottom:20px">Deux millimètres.<br>Tout change.</h2>
      <p class="lede">Le milieu ne bouge pas : ton centre reste aussi fin qu'avant. Ce sont les bords qui grandissent — et toute la main change d'allure.</p>
    </div>
    <div class="mm-fig reveal d1">
      <img src="/xsmax/img/ring-acier-poli.png" alt="Base mood XS MAX en acier, vue de profil">
      <div class="mm-caliper">
        <span class="rail"></span><span class="tick l"></span><span class="tick r"></span>
        <span class="val">11 mm</span>
      </div>
    </div>
  </div>

  <div class="wrap ba reveal" id="ba">
    <div class="ba-frame">
      <img src="/xsmax/img/tz-xs.jpg" alt="La base mood XS portée au doigt">
      <img class="ba-top" id="baTop" src="/xsmax/img/tz-xsmax.jpg" alt="La base mood XS MAX portée au même doigt">
      <span class="ba-handle" id="baHandle"></span>
      <span class="ba-tag l">XS</span><span class="ba-tag r">XS MAX</span>
    </div>
    <p class="ba-hint">Glisse pour comparer</p>
  </div>
</section>

<section class="colors stage" id="couleurs">
  <div class="colors-track" id="colorsTrack">
    <div class="colors-sticky">
      <div class="colors-glow" id="glow"></div>
      <div class="colors-rail" id="rail" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
      <div class="colors-inner">
        <span class="eyebrow">Quatre couleurs</span>
        <div class="colors-word display h-xl" id="word" style="margin-top:14px">
          <span class="on">acier</span><span>bleu électrique</span><span>gold</span><span>black</span>
        </div>
        <div class="colors-media" id="media">
          <video class="on" src="/xsmax/vid/turn-acier.mp4" muted loop playsinline autoplay></video>
          <video src="/xsmax/vid/turn-bleu.mp4" muted loop playsinline autoplay></video>
          <video src="/xsmax/vid/turn-gold.mp4" muted loop playsinline autoplay></video>
          <video src="/xsmax/vid/turn-black.mp4" muted loop playsinline autoplay></video>
        </div>
        <p class="colors-cap" id="cap">Acier chirurgical 316L, poli miroir.</p>
      </div>
    </div>
  </div>
</section>

<section class="band band-cream">
  <div class="wrap center">
    <span class="eyebrow">Deux finitions</span>
    <h2 class="display h-l reveal" style="margin-top:16px">Brillante ou sourde.</h2>
    <div class="fin-switch" role="group" aria-label="Choisir la finition">
      <button type="button" id="btnPoli" aria-pressed="true">Poli</button>
      <button type="button" id="btnMat" aria-pressed="false">Mat</button>
    </div>
    <div class="fin-grid reveal" id="finGrid">
      <div>
        <div class="fin-cell"><img data-poli="/xsmax/img/ring-acier-poli.png" data-mat="/xsmax/img/ring-acier-mat.png" src="/xsmax/img/ring-acier-poli.png" alt="Base XS MAX acier"></div>
        <p class="fin-name">acier</p>
      </div>
      <div>
        <div class="fin-cell"><img data-poli="/xsmax/img/ring-bleu-poli.png" data-mat="/xsmax/img/ring-bleu-mat.png" src="/xsmax/img/ring-bleu-poli.png" alt="Base XS MAX bleu électrique"></div>
        <p class="fin-name">bleu électrique</p>
      </div>
      <div>
        <div class="fin-cell"><img data-poli="/xsmax/img/ring-gold-poli.png" data-mat="/xsmax/img/ring-gold-mat.png" src="/xsmax/img/ring-gold-poli.png" alt="Base XS MAX gold"></div>
        <p class="fin-name">gold</p>
      </div>
      <div>
        <div class="fin-cell"><img data-poli="/xsmax/img/ring-black-poli.png" data-mat="/xsmax/img/ring-black-mat.png" src="/xsmax/img/ring-black-poli.png" alt="Base XS MAX black"></div>
        <p class="fin-name">black</p>
      </div>
    </div>
  </div>
</section>

<section class="band stage">
  <div class="wrap center">
    <span class="eyebrow">MAX de composition</span>
    <h2 class="display h-l reveal" style="margin:16px auto 10px;max-width:14ch">Un petit espace.<br>Énormément de possibilités.</h2>
    <p class="lede reveal d1" style="margin:0 auto clamp(30px,4vw,52px)">Quatre minis, deux medium, un deux tiers, trois anneaux — la même base, quatre humeurs.</p>
    <div class="compo-grid reveal d2">
      <figure class="compo-cell" data-v>
        <img src="/xsmax/img/fz-minis.jpg" alt="Quatre mini addons sur une base XS MAX">
        <video src="/xsmax/vid/vz-minis.mp4" muted loop playsinline preload="none"></video>
        <figcaption>4 minis</figcaption>
      </figure>
      <figure class="compo-cell" data-v>
        <img src="/xsmax/img/fz-medium.jpg" alt="Deux medium addons sur une base XS MAX">
        <video src="/xsmax/vid/vz-medium.mp4" muted loop playsinline preload="none"></video>
        <figcaption>2 medium</figcaption>
      </figure>
      <figure class="compo-cell" data-v>
        <img src="/xsmax/img/fz-deuxtiers.jpg" alt="Un addon deux tiers sur une base XS MAX">
        <video src="/xsmax/vid/vz-deuxtiers.mp4" muted loop playsinline preload="none"></video>
        <figcaption>1 deux tiers</figcaption>
      </figure>
      <figure class="compo-cell" data-v>
        <img src="/xsmax/img/fz-trois.jpg" alt="Trois anneaux sur une base XS MAX">
        <video src="/xsmax/vid/vz-trois.mp4" muted loop playsinline preload="none"></video>
        <figcaption>3 anneaux</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="band band-ivory">
  <div class="wrap center trio">
    <span class="eyebrow">Trois proportions</span>
    <h2 class="display h-l reveal" style="margin:16px 0 clamp(30px,4vw,48px)">Trouve la tienne.</h2>
    <div class="reveal d1">
      <img src="/xsmax/img/trois-bases2.jpg" alt="Les trois bases mood côte à côte : XS, XS MAX et large">
      <div class="trio-labels"><span><b>base xs</b>9 mm</span><span><b>base xs max</b>11 mm</span><span><b>base large</b>13 mm</span></div>
    </div>
  </div>
</section>

<div class="marquee" aria-hidden="true">
  <div class="marquee-row" id="row1"></div>
  <div class="marquee-row rev" id="row2"></div>
</div>

<section class="final" id="final">
  <img class="mark" src="/xsmax/img/logo-blanc.png" alt="mood">
  <h2 class="display line" style="margin-bottom:22px">XS au centre. MAX autour.</h2>
  <p class="lede" style="margin:0 auto 34px">Acier 316L, 11 mm, garantie à vie.<br>Quatre couleurs, deux finitions, treize tailles.</p>
  <a class="link" href="#couleurs">Je découvre la XS MAX</a>
</section>

<p class="foot">Mood Collection · Orbe · Suisse · maquette de lancement</p>

<script>
(function(){
  var root=document.documentElement;
  root.classList.add('js');
  var slow=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* révélations */
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{rootMargin:'0px 0px -12% 0px',threshold:.12});
  document.querySelectorAll('.reveal, .mm-fig').forEach(function(el){
    var r=el.getBoundingClientRect();
    if(r.top < window.innerHeight*0.92){ el.classList.add('in'); } else { io.observe(el); }
  });

  /* barre haute */
  var bar=document.getElementById('topbar');
  var onScrollBar=function(){ bar.classList.toggle('on', window.scrollY>620); };
  onScrollBar();

  /* podium : la bague tourne au survol */
  document.querySelectorAll('.pod').forEach(function(p){
    var v=p.querySelector('video');
    var play=function(){ p.classList.add('live'); var q=v.play(); if(q&&q.catch) q.catch(function(){}); };
    var stop=function(){ p.classList.remove('live'); v.pause(); };
    p.addEventListener('mouseenter',play); p.addEventListener('focus',play);
    p.addEventListener('mouseleave',stop); p.addEventListener('blur',stop);
    p.addEventListener('click',function(){ p.classList.contains('live')?stop():play(); });
    p.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); p.classList.contains('live')?stop():play(); } });
  });

  /* compositions : la vidéo au survol */
  document.querySelectorAll('.compo-cell').forEach(function(c){
    var v=c.querySelector('video');
    var play=function(){ c.classList.add('live'); var q=v.play(); if(q&&q.catch) q.catch(function(){}); };
    var stop=function(){ c.classList.remove('live'); v.pause(); };
    c.addEventListener('mouseenter',play); c.addEventListener('mouseleave',stop);
    c.addEventListener('click',function(){ c.classList.contains('live')?stop():play(); });
  });

  /* poli / mat */
  var bp=document.getElementById('btnPoli'), bm=document.getElementById('btnMat');
  var imgs=document.querySelectorAll('#finGrid img');
  function setFin(kind){
    bp.setAttribute('aria-pressed', kind==='poli');
    bm.setAttribute('aria-pressed', kind==='mat');
    imgs.forEach(function(im){
      var cell=im.parentNode; cell.classList.add('swap');
      setTimeout(function(){ im.src=im.getAttribute('data-'+kind); cell.classList.remove('swap'); },220);
    });
  }
  bp.addEventListener('click',function(){setFin('poli');});
  bm.addEventListener('click',function(){setFin('mat');});

  /* avant / après */
  var ba=document.getElementById('ba'), top=document.getElementById('baTop'), hd=document.getElementById('baHandle');
  function setBA(x){
    var r=ba.querySelector('.ba-frame').getBoundingClientRect();
    var p=Math.max(4,Math.min(96,((x-r.left)/r.width)*100));
    top.style.clipPath='inset(0 0 0 '+p+'%)'; hd.style.left=p+'%';
  }
  var dragging=false;
  ba.addEventListener('pointerdown',function(e){dragging=true;setBA(e.clientX);});
  window.addEventListener('pointermove',function(e){ if(dragging) setBA(e.clientX); });
  window.addEventListener('pointerup',function(){dragging=false;});
  ba.addEventListener('pointermove',function(e){ if(!dragging && e.pointerType==='mouse') setBA(e.clientX); });

  /* univers couleur */
  var COLORS=[
    {c:'#c9c9c7',cap:"Acier chirurgical 316L, poli miroir."},
    {c:'#2f5cff',cap:"Bleu électrique — la couleur qui se voit à trois mètres."},
    {c:'#d69a78',cap:"Gold chaud, le reflet le plus doux de la gamme."},
    {c:'#8f8f8d',cap:"Black profond, pour celles qui n'aiment pas briller."}
  ];
  var track=document.getElementById('colorsTrack'),
      glow=document.getElementById('glow'),
      words=document.querySelectorAll('#word span'),
      vids=document.querySelectorAll('#media video'),
      dots=document.querySelectorAll('#rail i'),
      cap=document.getElementById('cap'),
      cur=-1;
  function setColor(i){
    if(i===cur) return; cur=i;
    glow.style.setProperty('--c',COLORS[i].c);
    document.querySelectorAll('#rail i').forEach(function(d,k){ d.classList.toggle('on',k===i); d.style.setProperty('--c',COLORS[i].c); });
    words.forEach(function(w,k){ w.classList.toggle('on',k===i); });
    vids.forEach(function(v,k){ v.classList.toggle('on',k===i); });
    cap.textContent=COLORS[i].cap;
  }
  function onScrollColors(){
    var r=track.getBoundingClientRect();
    var h=track.offsetHeight-window.innerHeight;
    var p=Math.max(0,Math.min(1,(-r.top)/(h||1)));
    setColor(Math.min(3,Math.floor(p*3.999)));
  }
  setColor(0);

  var ticking=false;
  window.addEventListener('scroll',function(){
    if(ticking) return; ticking=true;
    requestAnimationFrame(function(){ onScrollBar(); onScrollColors(); ticking=false; });
  },{passive:true});
  onScrollColors();

  /* défilé de mains */
  var r1=document.getElementById('row1'), r2=document.getElementById('row2'), html1='', html2='';
  for(var n=1;n<=14;n++){
    var s='/xsmax/img/hand-'+(n<10?'0':'')+n+'.jpg';
    if(n<=8) html1+='<img src="'+s+'" alt="">'; else html2+='<img src="'+s+'" alt="">';
  }
  r1.innerHTML=html1+html1; r2.innerHTML=html2+html2+html2;
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
