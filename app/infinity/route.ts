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
#hero .cue{margin-top:38px;width:1px;height:54px;background:linear-gradient(var(--ink),transparent);opacity:0;transition:opacity 1s 1s}
#hero.done h1,#hero.done p{opacity:1;transform:none}#hero.done .cue{opacity:1}
#hero .num{position:absolute;top:28px;left:28px;font-size:10px;letter-spacing:.4em;color:var(--mid)}
#son{position:fixed;top:22px;right:22px;z-index:40;width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.8);backdrop-filter:blur(8px);cursor:pointer;display:none;align-items:center;justify-content:center;gap:3px}
#son i{display:block;width:2px;background:var(--ink);height:6px;animation:eq 1s infinite ease-in-out}
#son i:nth-child(2){animation-delay:.2s}#son i:nth-child(3){animation-delay:.4s}
#son.off i{animation:none;height:2px}
@keyframes eq{0%,100%{height:4px}50%{height:16px}}
/* ---------- sections ---------- */
section{padding:16vh 24px;position:relative}
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
.defile{margin-top:12vh;white-space:nowrap;font-weight:100;font-size:clamp(40px,7vw,104px);color:#ececec;letter-spacing:.06em}
.defile div{display:inline-block;animation:defile 26s linear infinite}
@keyframes defile{to{transform:translateX(-50%)}}
footer{padding:40px 24px 60px;text-align:center}
footer img{width:96px;opacity:.9}
@media(max-width:820px){
  #manifeste .wrap,#config .wrap,#vraie .wrap{grid-template-columns:1fr}
  .rail figure{flex-basis:78vw}
  .stage{height:56vh}
  .grid4{grid-template-columns:1fr 1fr}.grid4 div:nth-child(2){border-right:0}
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
  <div class="over"><h1>Infinity</h1><p>Votre collection grandit, votre boîte aussi.</p><div class="cue"></div></div>
</header>

<section id="manifeste"><div class="wrap">
  <div class="rv"><div class="k">Nouveau · rangement modulable</div><h2 class="big">Un étage.<br>Deux étages…<br><em>ou cinq.</em></h2></div>
  <p class="lead rv">Infinity OO N°3, c’est la nouvelle boîte de rangement modulable mood, pensée pour s’adapter à votre collection, à vos envies et à votre quotidien. Ronde, épurée, élégante : à la maison, en voyage ou simplement dans votre sac, vos mood préférées restent toujours à portée de main.</p>
</div></section>

<section id="config"><div class="wrap">
  <div class="stage rv" id="stage">
    <img src="/infinity/img/pile-1.webp" alt="Infinity 1 étage" class="on">
    <img src="/infinity/img/pile-2.webp" alt="Infinity 2 étages">
    <img src="/infinity/img/pile-3.webp" alt="Infinity 3 étages">
    <img src="/infinity/img/pile-4.webp" alt="Infinity 4 étages">
    <img src="/infinity/img/pile-5.webp" alt="Infinity 5 étages">
  </div>
  <div class="rv">
    <div class="k">Composez votre Infinity</div>
    <h2 class="big" style="font-size:clamp(34px,4.4vw,62px)">Choisissez<br>le nombre d’étages.</h2>
    <div class="floors" id="floors"><button class="on">1</button><button>2</button><button>3</button><button>4</button><button>5</button></div>
    <div class="prix"><span id="prix">49</span><small>.–</small></div>
    <div class="lbl" id="lbl">1 étage + couvercle mood</div>
    <a class="cta" href="${FICHE}">JE DÉCOUVRE <span></span></a>
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

<section id="final">
  <div class="k rv">Infinity OO N°3</div>
  <h2 class="big rv">Une boîte. <em>Une infinité</em> de possibilités.</h2>
  <a class="cta rv" href="${FICHE}">JE COMPOSE MA BOÎTE <span></span></a>
  <div class="defile" aria-hidden="true"><div>COMPOSEZ · EMPILEZ · EMPORTEZ · COMPOSEZ · EMPILEZ · EMPORTEZ · </div><div>COMPOSEZ · EMPILEZ · EMPORTEZ · COMPOSEZ · EMPILEZ · EMPORTEZ · </div></div>
</section>
<footer><img src="/infinity/img/logo-mood.png" alt="mood"></footer>

<script>
(function(){
  var intro=document.getElementById('intro'),film=document.getElementById('film'),hero=document.getElementById('hero'),
      music=document.getElementById('music'),son=document.getElementById('son');
  function fadeTo(v,ms){var s=music.volume,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/ms);music.volume=s+(v-s)*k;if(k<1)requestAnimationFrame(f)})(t0)}
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
  // configurateur
  var prix=[49,59,69,79,89],imgs=document.querySelectorAll('#stage img'),btns=document.querySelectorAll('#floors button'),
      p=document.getElementById('prix'),l=document.getElementById('lbl'),cur=49;
  function count(to){var from=cur,t0=performance.now();cur=to;(function f(t){var k=Math.min(1,(t-t0)/500);p.textContent=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0)}
  btns.forEach(function(b,i){b.addEventListener('click',function(){
    btns.forEach(function(x){x.classList.remove('on')});b.classList.add('on');
    imgs.forEach(function(im,j){im.classList.toggle('on',j===i)});
    count(prix[i]);l.textContent=(i+1)+(i?' étages':' étage')+' + couvercle mood';
  })});
  // la pile grandit toute seule tant qu'on n'a pas cliqué
  var auto=0,stopped=false;btns.forEach(function(b){b.addEventListener('click',function(e){if(e.isTrusted)stopped=true})});
  var io2=new IntersectionObserver(function(es){if(es[0].isIntersecting&&!stopped&&!auto){auto=setInterval(function(){if(stopped){clearInterval(auto);return}var i=[].indexOf.call(btns,document.querySelector('#floors .on'));btns[(i+1)%5].click()},1600)}},{threshold:.5});
  io2.observe(document.getElementById('stage'));
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
