export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>mood — Noël serti</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Poppins:wght@200;300;400;500&display=swap">
<style>
:root{--serif:'Cormorant Garamond',Georgia,serif;--sans:'Poppins','Helvetica Neue',Arial,sans-serif;--night:#1b1822}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--night);color:#fff;font-family:var(--sans);font-weight:300;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{display:block;max-width:100%}a{color:inherit;text-decoration:none}h1,h2,p{margin:0}

/* neige */
.snow{position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden}
.snow i{position:absolute;top:-12px;width:var(--s);height:var(--s);border-radius:50%;background:#fff;opacity:var(--o);filter:blur(.4px);animation:fall var(--d) linear var(--w) infinite}
@keyframes fall{to{transform:translate3d(var(--x),110vh,0)}}

/* entrée */
.hero{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px 20px 60px;
  background:radial-gradient(ellipse at 50% 30%,#3a2f45 0%,#221d2b 45%,var(--night) 80%)}
.kicker{font-size:11px;letter-spacing:.42em;text-transform:uppercase;opacity:.75}
.hero h1{font-family:var(--serif);font-style:italic;font-weight:300;font-size:clamp(46px,9vw,108px);line-height:1.02;margin:22px 0 18px}
.hero p{font-size:15px;opacity:.82;max-width:520px}
.deco{display:flex;align-items:center;gap:14px;margin:26px 0 44px;opacity:.85}
.deco span{width:70px;height:1px;background:linear-gradient(90deg,transparent,#fff)}
.deco span:last-child{transform:scaleX(-1)}
.star{width:10px;height:10px;background:#fff;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)}
.strip{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;max-width:980px}
.strip a{width:150px;border-radius:14px;overflow:hidden;position:relative;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.strip a:hover{transform:translateY(-6px)}
.strip img{aspect-ratio:4/5;object-fit:cover;width:100%}
.strip b{position:absolute;left:0;right:0;bottom:0;padding:22px 8px 9px;font-family:var(--serif);font-style:italic;font-weight:400;font-size:17px;background:linear-gradient(transparent,rgba(0,0,0,.55))}
.scroll{margin-top:46px;font-size:11px;letter-spacing:.3em;text-transform:uppercase;opacity:.6;animation:bob 2.4s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(6px)}}

/* sections */
.piece{min-height:100svh;display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:clamp(30px,6vw,90px);padding:80px clamp(20px,7vw,110px);background:var(--bg);color:var(--fg)}
.piece.rev .visu{order:2}
.visu{position:relative;border-radius:22px;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.45)}
.visu img{width:100%;aspect-ratio:4/5;object-fit:cover;transition:opacity 1s ease}
.visu img+img{position:absolute;inset:0;opacity:0}
.visu img.on{opacity:1}
.dots{position:absolute;bottom:16px;left:0;right:0;display:flex;gap:9px;justify-content:center;z-index:2}
.dots button{width:9px;height:9px;border-radius:50%;border:1px solid #fff;background:transparent;padding:0;cursor:pointer;opacity:.8}
.dots button.on{background:#fff}
.txt{max-width:470px}
.txt .kicker{opacity:.7}
.txt h2{font-family:var(--serif);font-style:italic;font-weight:300;font-size:clamp(44px,6vw,78px);line-height:1.02;margin:16px 0 8px}
.txt .mat{display:flex;align-items:center;gap:12px;font-size:11px;letter-spacing:.34em;text-transform:uppercase;opacity:.85;margin-bottom:26px}
.txt .mat i{width:44px;height:1px;background:currentColor;opacity:.6}
.txt .mat .star{background:currentColor}
.txt p.story{font-size:15.5px;opacity:.9}
.txt .stones{margin-top:16px;font-size:13px;opacity:.7}
.buy{display:flex;align-items:center;gap:22px;margin-top:34px;flex-wrap:wrap}
.price{font-family:var(--serif);font-size:30px;font-weight:400}
.price small{font-family:var(--sans);font-size:12px;letter-spacing:.12em;opacity:.7;margin-right:6px;text-transform:uppercase}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 30px;border-radius:999px;background:var(--fg);color:var(--bg);font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:400;transition:transform .35s,box-shadow .35s}
.btn:hover{transform:translateY(-2px);box-shadow:0 12px 26px -10px rgba(0,0,0,.4)}
.btn .star{width:9px;height:9px;background:currentColor}

/* apparition au défilement */
.rv{opacity:0;transform:translateY(34px);transition:opacity 1.1s ease,transform 1.1s cubic-bezier(.2,.8,.2,1)}
.rv.in{opacity:1;transform:none}
.txt.rv{transition-delay:.15s}

/* fin */
.fin{padding:110px 20px 120px;text-align:center;background:radial-gradient(ellipse at 50% 0%,#2c2536,var(--night) 70%)}
.fin h2{font-family:var(--serif);font-style:italic;font-weight:300;font-size:clamp(34px,5vw,56px);line-height:1.1}
.fin p{opacity:.75;margin:16px auto 0;max-width:460px;font-size:14.5px}
.fin img{width:170px;margin:52px auto 0}

@media (max-width:820px){
  .piece{grid-template-columns:1fr;padding:56px 16px 70px;gap:30px;min-height:auto}
  .piece.rev .visu{order:0}
  .txt{max-width:none;text-align:center}
  .txt .mat,.buy{justify-content:center}
  .strip a{width:calc(33.3% - 8px)}
  .strip b{font-size:14px}
}
@media (prefers-reduced-motion:reduce){.snow{display:none}.rv{opacity:1;transform:none;transition:none}.scroll{animation:none}}
</style></head><body>

<div class="snow" id="snow" aria-hidden="true"></div>

<header class="hero">
  <div class="kicker">Collection Noël serti 2026</div>
  <h1>Cinq histoires d'hiver</h1>
  <p>Gravées sur l'aluminium, serties à la main, pierre par pierre… à clipser sur ta bague mood.</p>
  <div class="deco"><span></span><div class="star"></div><span></span></div>
  <nav class="strip">
    <a href="#etoiles"><img src="/noel-serti/etoiles.jpg" alt="Étoiles de décembre"><b>Étoiles de décembre</b></a>
    <a href="#douceur"><img src="/noel-serti/douceur.jpg" alt="Douceur d'hiver"><b>Douceur d'hiver</b></a>
    <a href="#ours"><img src="/noel-serti/ours.jpg" alt="Ours céleste"><b>Ours céleste</b></a>
    <a href="#village"><img src="/noel-serti/village-2.jpg" alt="Village des étoiles"><b>Village des étoiles</b></a>
    <a href="#fils"><img src="/noel-serti/fils.jpg" alt="Les fils du bonheur"><b>Les fils du bonheur</b></a>
  </nav>
  <div class="scroll">Je découvre ↓</div>
</header>

<section class="piece" id="etoiles" style="--bg:#6e0d16;--fg:#fff">
  <div class="visu rv"><img src="/noel-serti/etoiles.jpg" alt="Étoiles de décembre, deux tiers en aluminium rouge serti" loading="lazy"></div>
  <div class="txt rv">
    <div class="kicker">Deux tiers</div>
    <h2>Étoiles de décembre</h2>
    <div class="mat"><div class="star"></div><i></i>Aluminium serti<i></i><div class="star"></div></div>
    <p class="story">Sept étoiles gravées sur un anneau rouge, comme celles qui guident les nuits de décembre. Chacune porte un diamant en son cœur. Simple, lumineux, tout l'esprit de Noël ✨</p>
    <div class="stones">7 diamants · aluminium rouge</div>
    <div class="buy"><div class="price">119.–</div><a class="btn" href="https://www.yourmood.net/products/etoiles-de-decembre-deux-tiers-en-aluminium-rouge-serti-de-7-diamants" target="_top">Je découvre <span class="star"></span></a></div>
  </div>
</section>

<section class="piece rev" id="douceur" style="--bg:#2b2e35;--fg:#fff">
  <div class="visu rv"><img src="/noel-serti/douceur.jpg" alt="Douceur d'hiver, deux tiers en aluminium anthracite serti" loading="lazy"></div>
  <div class="txt rv">
    <div class="kicker">Deux tiers</div>
    <h2>Douceur d'hiver</h2>
    <div class="mat"><div class="star"></div><i></i>Aluminium serti<i></i><div class="star"></div></div>
    <p class="story">Une guirlande d'hiver court tout autour de l'anneau anthracite : flocons de neige, petites étoiles et perles reliées par un fil léger. Au cœur de quatre flocons, un saphir bleu ; sur quatre perles, un diamant. Une douceur pour les soirées au coin du feu 🤍</p>
    <div class="stones">Saphirs bleus et diamants · aluminium anthracite</div>
    <div class="buy"><div class="price">165.–</div><a class="btn" href="https://www.yourmood.net/products/douceur-dhiver-deux-tiers-en-aluminium-anthracite-serti-de-diamants-et-saphirs-bleus" target="_top">Je découvre <span class="star"></span></a></div>
  </div>
</section>

<section class="piece" id="ours" style="--bg:#b8cfe4;--fg:#22324f">
  <div class="visu rv"><img src="/noel-serti/ours.jpg" alt="Ours céleste, addon ou deux tiers en aluminium myrtille serti" loading="lazy"></div>
  <div class="txt rv">
    <div class="kicker">Addon ou deux tiers</div>
    <h2>Ours céleste</h2>
    <div class="mat"><div class="star"></div><i></i>Aluminium serti<i></i><div class="star"></div></div>
    <p class="story">Une famille d'ours polaires avance sous le ciel d'hiver, entre les sapins enneigés et les montagnes, sous la lune et les étoiles. Sur l'aluminium myrtille, les diamants brillent comme les étoiles de la nuit polaire 💙</p>
    <div class="stones">Diamants · aluminium myrtille</div>
    <div class="buy"><div class="price"><small>dès</small>110.–</div><a class="btn" href="https://www.yourmood.net/products/ours-celeste-addon-ou-deux-tiers-en-aluminium-myrtille-serti-de-diamants" target="_top">Je découvre <span class="star"></span></a></div>
  </div>
</section>

<section class="piece rev" id="village" style="--bg:#e6dce8;--fg:#3f2b52">
  <div class="visu rv" data-slides>
    <img class="on" src="/noel-serti/village-2.jpg" alt="Village des étoiles dans une boule à neige" loading="lazy">
    <img src="/noel-serti/village-1.jpg" alt="Village des étoiles sous la boule à neige" loading="lazy">
    <img src="/noel-serti/village-3.jpg" alt="Village des étoiles penché dans la boule à neige" loading="lazy">
    <div class="dots"><button class="on" aria-label="Image 1"></button><button aria-label="Image 2"></button><button aria-label="Image 3"></button></div>
  </div>
  <div class="txt rv">
    <div class="kicker">Addon</div>
    <h2>Village des étoiles</h2>
    <div class="mat"><div class="star"></div><i></i>Aluminium serti<i></i><div class="star"></div></div>
    <p class="story">Tout Noël sur un seul anneau : le traîneau du Père Noël sous la lune, les maisons enneigées, les sapins, les cerfs, le petit pont, les lanternes et les bonshommes de neige. Les saphirs roses, orange et jaunes s'allument comme des lumières dans la nuit lilas ⛄</p>
    <div class="stones">Saphirs et diamants · aluminium lilas cashmere</div>
    <div class="buy"><div class="price">685.–</div><a class="btn" href="https://www.yourmood.net/products/village-des-etoiles-addon-en-aluminium-lilas-cashmere-serti-de-saphirs-et-diamants" target="_top">Je découvre <span class="star"></span></a></div>
  </div>
</section>

<section class="piece" id="fils" style="--bg:#c49a8c;--fg:#fff">
  <div class="visu rv"><img src="/noel-serti/fils.jpg" alt="Les fils du bonheur, addon ou deux tiers en aluminium noisette serti" loading="lazy"></div>
  <div class="txt rv">
    <div class="kicker">Addon ou deux tiers</div>
    <h2>Les fils du bonheur</h2>
    <div class="mat"><div class="star"></div><i></i>Aluminium serti<i></i><div class="star"></div></div>
    <p class="story">Des guirlandes de perles et de pendeloques suspendues tout autour de l'anneau noisette, comme les décorations qu'on accroche au sapin. Au bout des fils, cinq diamants brillent comme de petites boules de Noël 🎄</p>
    <div class="stones">5 diamants · aluminium noisette</div>
    <div class="buy"><div class="price"><small>dès</small>135.–</div><a class="btn" href="https://www.yourmood.net/products/les-fils-du-bonheur-addon-ou-deux-tiers-en-aluminium-noisette-serti-de-diamants" target="_top">Je découvre <span class="star"></span></a></div>
  </div>
</section>

<footer class="fin">
  <div class="deco" style="justify-content:center;margin:0 0 30px"><span></span><div class="star"></div><span></span></div>
  <h2>Un clic, et l'hiver change de mood</h2>
  <p>Chaque anneau se clipse sur ta bague mood en un geste. Serti à la main, pierre par pierre.</p>
  <img src="/noel-serti/logo-blanc.png" alt="mood">
</footer>

<script>
(function(){
  // neige légère
  var s=document.getElementById('snow'),n=window.innerWidth<700?28:55;
  for(var i=0;i<n;i++){var e=document.createElement('i');var z=Math.random();
    e.style.cssText='left:'+(Math.random()*100)+'vw;--s:'+(2+z*4)+'px;--o:'+(.25+z*.55)+';--d:'+(9+Math.random()*12)+'s;--w:-'+(Math.random()*20)+'s;--x:'+(Math.random()*80-40)+'px';
    s.appendChild(e);}
  // apparition au défilement
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}})},{threshold:.15});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
  // les 3 images du village
  document.querySelectorAll('[data-slides]').forEach(function(box){
    var imgs=box.querySelectorAll('img'),dots=box.querySelectorAll('.dots button'),k=0,t;
    function go(j){imgs[k].classList.remove('on');dots[k].classList.remove('on');k=j;imgs[k].classList.add('on');dots[k].classList.add('on');}
    function auto(){clearInterval(t);t=setInterval(function(){go((k+1)%imgs.length)},4200);}
    dots.forEach(function(d,j){d.addEventListener('click',function(){go(j);auto();})});auto();
  });
})();
</script>
</body></html>
`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
