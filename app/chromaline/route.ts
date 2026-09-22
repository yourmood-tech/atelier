export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>mood Chromaline</title><meta name="robots" content="noindex,nofollow"></head><body style="margin:0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@200;300;400;500&display=swap">
<style>
:root{
  --serif:'Playfair Display','Times New Roman',serif;
  --sans:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
  --paper:#fdfcfa;
  --cream:#f5f1ea;
  --ink:#191917;
  --mid:#8b8880;
  --line:#e6e0d6;
  --c:#b9bdc0;          /* la couleur choisie par la cliente */
  --ct:#b9bdc0;         /* la couleur du titre, qui défile toute seule */
  --c-soft:#eef0f1;
}
*,*::before,*::after{box-sizing:border-box}
body{
  margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--sans);font-weight:300;line-height:1.6;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
img,video{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
h1,h2,h3,p{margin:0}
:focus-visible{outline:2px solid var(--c);outline-offset:4px}

.wrap{max-width:1180px;margin:0 auto;padding-inline:24px}
.band{padding-block:clamp(56px,7vw,110px)}
.band-cream{background:var(--cream)}
.center{text-align:center}

.eyebrow{
  display:block;font-size:10px;letter-spacing:3.2px;text-transform:uppercase;
  color:var(--mid);font-weight:400;
}
.display{font-family:var(--serif);font-weight:400;line-height:1.08;letter-spacing:-.012em;text-wrap:balance}
.h1{font-size:clamp(34px,5.2vw,74px)}
.h2{font-size:clamp(26px,3.4vw,46px)}
.h3{font-size:clamp(19px,1.9vw,25px)}
.lede{font-size:clamp(14px,1.05vw,16px);color:var(--mid);line-height:1.75;max-width:52ch}
.btn{
  display:inline-block;background:var(--ink);color:#fff;border:0;border-radius:999px;
  padding:16px 36px;font-family:var(--sans);font-weight:500;font-size:12px;
  letter-spacing:2.6px;text-transform:uppercase;cursor:pointer;
  box-shadow:0 12px 28px rgba(25,25,23,.18);
  transition:transform .25s,box-shadow .25s,background .35s;
}
.btn:hover{transform:translateY(-2px);box-shadow:0 18px 36px rgba(25,25,23,.26);background:#000}
.btn-c{background:var(--c);color:#fff;box-shadow:0 12px 28px rgba(0,0,0,.16)}
.btn-c:hover{background:var(--c);filter:brightness(.94)}

/* ---------- ouverture : fond blanc, la bague qui change de couleur ---------- */
.hero{
  position:relative;overflow:hidden;background:#fff;text-align:center;
  padding-block:clamp(48px,6vw,92px) clamp(40px,5vw,70px);
}
.hero::before{
  content:"";position:absolute;left:0;right:0;bottom:0;height:46%;
  background:radial-gradient(ellipse 60% 100% at 50% 100%,var(--c-soft),transparent 72%);
  transition:background 1.1s ease;pointer-events:none;opacity:.75;
}
.hero-in{position:relative}
.hero .eyebrow{margin-bottom:16px}
.hero .h1{margin:0 0 10px}
.hero .nom{
  font-size:clamp(40px,7.4vw,112px);letter-spacing:-.02em;line-height:1.05;
  display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:nowrap;
}
.hero .sous{
  font-family:var(--serif);font-size:clamp(19px,2.2vw,32px);color:var(--ink);
  margin:0 0 16px;letter-spacing:-.005em;
}
.hero .h1 .tint{color:var(--ct);transition:color 1.1s ease}
.hero .lede{margin:0 auto 26px;text-align:center}

.stage{
  position:relative;display:inline-block;vertical-align:middle;
  width:clamp(96px,17vw,258px);aspect-ratio:1/1;
  margin:0 0 0 clamp(-14px,-1.6vw,-6px);
}
.stage-big{
  display:block;width:100%;max-width:520px;margin:0 auto;
  border-radius:6px;overflow:hidden;
}
.choix{
  display:grid;grid-template-columns:0.9fr 1.1fr;align-items:center;
  gap:clamp(20px,3.4vw,56px);max-width:960px;margin:clamp(10px,2vw,26px) auto 0;
  text-align:left;
}
.choix-txt .sous{margin:0 0 12px;text-align:left}
.choix-txt .lede{margin:0 0 22px;text-align:left;max-width:40ch}
.choix-txt .sw-name{margin:0 0 10px}
.choix-txt .swatches{justify-content:flex-start;margin:0 0 20px}
.choix-txt .price{margin:0 0 14px}
.choix-txt .hero-note{margin-top:14px}
@media (max-width:820px){
  .choix{grid-template-columns:1fr;text-align:center}
  .choix-txt{order:2}
  .choix .stage-big{order:1}
  .choix-txt .swatches{justify-content:center}
  .choix-txt .sous,.choix-txt .lede{text-align:center;margin-left:auto;margin-right:auto}
}
.stage video, .stage img{
  position:absolute;inset:0;width:100%;height:100%;object-fit:contain;
  opacity:0;transition:opacity 1.1s ease;
}
.stage video{mix-blend-mode:multiply;}   /* le fond blanc du film disparaît */

.stage video.on, .stage img.on{opacity:1}
@keyframes flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.hero-copy .h1{margin:14px 0 18px}
.hero-copy .lede{margin-bottom:26px}
.price{font-family:var(--serif);font-size:clamp(24px,2.3vw,32px);margin:0 0 6px}
.price small{font-size:13px;font-family:var(--sans);color:var(--mid);letter-spacing:.04em;margin-left:8px}
.hero-note{font-size:11.5px;color:var(--mid);margin-top:14px;letter-spacing:.02em}

.swatches{display:flex;flex-wrap:wrap;gap:12px;margin:6px 0 20px;justify-content:center}
.sw{
  width:34px;height:34px;border-radius:50%;border:1px solid var(--line);
  background:var(--sc);cursor:pointer;padding:0;position:relative;
  transition:transform .25s,box-shadow .25s;
}
.sw::after{
  content:"";position:absolute;inset:-5px;border-radius:50%;
  border:1px solid transparent;transition:border-color .25s;
}
.sw:hover{transform:translateY(-2px)}
.sw[aria-pressed="true"]::after{border-color:var(--sc)}
.sw[aria-pressed="true"]{box-shadow:0 6px 14px rgba(0,0,0,.14)}
.sw-name{font-size:12px;letter-spacing:2.4px;text-transform:uppercase;color:var(--ink);min-height:18px}

/* ---------- finesse ---------- */
.two{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,64px);align-items:center}
.mouv{align-items:stretch}
.mouv .film{display:flex;flex-direction:column;overflow:hidden}
.mouv .film video{flex:1 1 auto;width:100%;min-height:0;object-fit:cover;display:block}
.mouv .film .cap{background:#0d0d0d;color:#8e8c88}
@media (max-width:900px){ .mouv .film video{height:min(78vh,620px);flex:none} }
.figure{background:#fff;border:1px solid var(--line);border-radius:4px;overflow:hidden}
.figure img{width:100%}
.duos{position:relative;display:block;width:100%;aspect-ratio:1100/738}
.duos img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.1s ease}
.duos img.on{opacity:1}
.cap{font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:var(--mid);padding:12px 16px;text-align:center}
.mm-num{font-family:var(--serif);font-size:clamp(56px,7vw,104px);line-height:.9;letter-spacing:-.03em;font-variant-numeric:lining-nums}
.mm-num small{font-size:.2em;letter-spacing:.14em;color:var(--mid);margin-left:.14em;vertical-align:.9em}
.ticks{display:flex;gap:26px;margin-top:22px;flex-wrap:wrap}
.atouts{margin:clamp(16px,2vw,22px) 0 0;padding:0;list-style:none;max-width:52ch}
.atouts li{
  position:relative;padding-left:22px;margin-bottom:9px;
  font-size:clamp(13px,1vw,14.5px);color:var(--mid);line-height:1.65;
}
.acheter{max-width:520px}
.acheter .etape{font-size:10px;letter-spacing:3.2px;text-transform:uppercase;color:var(--mid);margin:0 0 8px}
.acheter .choix-nom{font-family:var(--serif);font-size:22px;margin:0 0 12px}
.acheter .swatches{justify-content:flex-start;margin:0 0 10px}
.acheter .mini{font-size:12px;color:var(--mid);line-height:1.6;margin:6px 0 0}
.acheter .mini a{border-bottom:1px solid var(--line)}
.tailles{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px}
.tailles button{
  font:inherit;font-size:12.5px;min-width:46px;padding:9px 6px;cursor:pointer;
  background:#fff;border:1px solid var(--line);border-radius:3px;color:var(--ink);
  transition:border-color .2s,background .2s,color .2s;
}
.tailles button:hover{border-color:var(--c)}
.tailles button[aria-pressed="true"]{background:var(--c);border-color:var(--c);color:#fff}
.lien-guide a{border-bottom:1px solid var(--ink);color:var(--ink)}
.pilule{
  display:inline-block;margin:14px 0 8px;padding:13px 24px;border:1px solid var(--ink);
  border-radius:999px;font-size:13px;color:var(--ink);transition:background .2s,color .2s;
}
.pilule:hover{background:var(--ink);color:#fff}
.filet{border:0;border-top:1px solid var(--line);margin:22px 0}
.powerpay{
  background:var(--cream);border-radius:6px;padding:13px 16px;margin:14px 0 0;
  font-size:13.5px;color:var(--mid);
}
.powerpay b{color:var(--ink);font-weight:500}
.powerpay a{color:var(--ink);border-bottom:1px solid var(--ink)}
.btn-achat{
  display:block;text-align:center;margin:16px 0 0;background:#111;color:#fff;
  border-radius:10px;padding:22px 20px;font-size:14px;font-weight:500;
  letter-spacing:2.6px;text-transform:uppercase;transition:background .25s,transform .25s;
}
.btn-achat:hover{background:#000;transform:translateY(-1px)}
.secu{margin:20px 0 10px;text-align:center;font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:var(--mid)}
.logos{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:center}
.logos img{height:30px;width:auto;border-radius:5px}
.rassure{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}
.prix{margin:22px 0 0;font-family:var(--serif)}
.prix s{color:var(--mid);font-size:19px;margin-right:12px}
.prix b{font-weight:400;font-size:40px}
.btn-large{padding:18px 40px;font-size:12.5px}
.paiements{font-size:11.5px;color:var(--mid);letter-spacing:.06em;margin:6px 0 0}
.rassure{margin:4px 0 0;padding:0;list-style:none}
.rassure li{font-size:12.5px;color:var(--mid);position:relative;padding-left:20px}
.rassure li::before{content:"\\2713";position:absolute;left:0;color:var(--c);transition:color .8s ease}
.atouts li::before{
  content:"";position:absolute;left:0;top:.62em;width:10px;height:1px;background:var(--c);
  transition:background .8s ease;
}
.tick{font-size:13px;color:var(--mid)}
.tick b{display:block;color:var(--ink);font-weight:400;font-size:15px;font-family:var(--serif)}

/* ---------- le clic ---------- */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.6vw,34px);margin-top:clamp(28px,4vw,52px)}
.step{--pad:clamp(18px,2.4vw,30px);background:#fff;border:1px solid var(--line);border-radius:4px;padding:var(--pad);text-align:center;overflow:hidden;display:flex;flex-direction:column}
.step .n{
  display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;
  background:var(--c);color:#fff;font-size:12px;font-weight:500;margin-bottom:14px;
  transition:background .5s ease;
}
.step h3{font-family:var(--serif);font-size:19px;margin-bottom:8px}
.step p{font-size:13.5px;color:var(--mid);line-height:1.6}
.step .geste{
  display:block;width:100%;margin-top:auto;padding-top:clamp(16px,2vw,24px);
  border-radius:3px;
}

/* ---------- les sept ---------- */
.seven{
  display:grid;grid-template-columns:repeat(7,1fr);gap:clamp(6px,0.8vw,14px);
  margin-top:clamp(28px,4vw,48px);
  width:100vw;margin-left:calc(50% - 50vw);
  padding-inline:clamp(10px,1.2vw,20px);
}
.card{
  background:#fff;border:1px solid var(--line);border-radius:4px;overflow:hidden;
  cursor:pointer;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s;
}
.card:hover{transform:translateY(-6px);box-shadow:0 18px 34px rgba(25,25,23,.10)}
.card{position:relative;border:0;background:none}
.card .duo{display:block;position:relative;aspect-ratio:1/1;overflow:hidden;border-radius:4px;background:#fff}
.card .duo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .55s ease,transform 1.2s cubic-bezier(.2,.7,.2,1)}
.card .duo .main{opacity:0}
.card:hover .duo .main,.card:focus-visible .duo .main{opacity:1;transform:scale(1.03)}
.card:hover .duo .carte,.card:focus-visible .duo .carte{opacity:0}
.card .nm{display:block;padding:12px 4px 4px;text-align:center;font-size:10.5px;letter-spacing:1.8px;text-transform:uppercase;color:var(--mid);line-height:1.4}
.card .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--sc);margin-right:5px;vertical-align:1px}

/* ---------- portées ---------- */
.gal{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(8px,1.4vw,16px)}
.gal figure{position:relative;margin:0;overflow:hidden;border-radius:4px;background:var(--cream);aspect-ratio:4/5}
.gal img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.7,.2,1)}
.gal figure:hover img{transform:scale(1.05)}

.reel{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,1.4vw,16px);margin-top:clamp(16px,2vw,24px)}
.reel figure{position:relative;margin:0;overflow:hidden;border-radius:4px;background:#111;aspect-ratio:9/16;cursor:pointer}
.reel video{width:100%;height:100%;object-fit:cover}

/* ---------- avis ---------- */
.avis{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,2vw,26px);margin-top:clamp(26px,3.4vw,44px)}
.avis blockquote{
  margin:0;background:#fff;border:1px solid var(--line);border-radius:4px;
  padding:clamp(20px,2.4vw,30px);
}
.stars{color:var(--c);letter-spacing:3px;font-size:13px;transition:color .5s}
.avis h4{font-family:var(--serif);font-weight:400;font-size:17px;margin:12px 0 10px}
.avis p{font-size:13.5px;color:var(--mid);line-height:1.65}
.avis cite{display:block;margin-top:14px;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:var(--ink);font-style:normal}

/* ---------- final ---------- */
.final{position:relative;overflow:hidden;text-align:center;padding-block:clamp(64px,8vw,120px)}
.final::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 60% at 50% 40%,var(--c-soft),transparent 72%);
  transition:background .8s ease;
}
.final > *{position:relative}
.final .lede{margin:16px auto 30px}
.foot{padding:0 24px 44px;text-align:center;font-size:10.5px;letter-spacing:2.4px;text-transform:uppercase;color:var(--mid)}

/* ---------- révélation douce ---------- */
.reveal{opacity:1;transform:translateY(16px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
.reveal.in{transform:none}
.d1{transition-delay:.08s}.d2{transition-delay:.16s}

@media (max-width:900px){
  .hero-in,.two{grid-template-columns:1fr}
  .seven{grid-template-columns:repeat(2,1fr);padding-inline:16px}
  .steps{grid-template-columns:1fr}
  .gal,.avis{grid-template-columns:1fr}
  .reel{grid-template-columns:repeat(2,1fr)}
}
@media (prefers-reduced-motion:reduce){
  *{transition-duration:.001ms!important;animation:none!important}
  .reveal{transform:none}
}
</style>

<section class="hero">
  <div class="wrap hero-in">
    <span class="eyebrow">mood · pack découverte</span>
    <h1 class="display h1 nom">
      <span class="tint">Chromaline</span><span class="stage" id="stage" aria-hidden="true"></span>
    </h1>

    <div class="choix">
      <div class="choix-txt">
        <p class="sous">Une bague. Sept humeurs.</p>
        <p class="lede">9 mm à peine, en argent 925 et acier chirurgical. Trois anneaux de couleur dans le pack — tu changes d'humeur comme tu changes d'avis.</p>
        <p class="sw-name" id="colorName">Acier froissé</p>
        <div class="swatches" id="swatches" role="group" aria-label="Choisir la couleur"></div>
        <p class="price">197<small>CHF · pack découverte, 3 anneaux inclus</small></p>
        <p><a class="btn btn-c" id="buy" href="https://www.yourmood.net/products/bague-mood-chromaline-avec-anneaux-interchangeables-set-complet">Je choisis la mienne</a></p>
        <p class="hero-note">Argent 925 · acier 316L · 9 mm · garantie à vie · échange gratuit 15 jours</p>
      </div>
      <div class="stage stage-big" id="stageBig"></div>
    </div>
  </div>
</section>

<section class="band band-cream">
  <div class="wrap two">
    <div class="reveal">
      <span class="eyebrow">La signature Chromaline</span>
      <p class="mm-num" style="margin:16px 0 18px">9<small>mm</small></p>
      <h2 class="display h2" style="margin-bottom:18px">La plus fine de toutes.</h2>
      <p class="lede">Même les mains les plus fines la portent. On a repris le système mood au complet — le clic breveté, la base à ouverture, les anneaux qui se changent — et on l'a glissé dans une silhouette deux fois plus discrète.</p>
      <div class="ticks">
        <span class="tick"><b>9 mm</b>de largeur</span>
        <span class="tick"><b>925</b>argent massif</span>
        <span class="tick"><b>316L</b>acier chirurgical</span>
        <span class="tick"><b>À vie</b>garantie</span>
      </div>
    </div>
    <figure class="figure reveal d1" style="margin:0">
      <span class="duos" id="duos">
        <img class="on" src="/chromaline/duo-1.jpg" alt="La Shiny Love et la Chromaline côte à côte, blanc">
        <img src="/chromaline/duo-2.jpg" alt="La Shiny Love et la Chromaline côte à côte, rose gold">
        <img src="/chromaline/duo-3.jpg" alt="La Shiny Love et la Chromaline côte à côte, turquoise">
        <img src="/chromaline/duo-4.jpg" alt="La Shiny Love et la Chromaline côte à côte, lilas">
      </span>
      <figcaption class="cap">Shiny Love · Chromaline</figcaption>
    </figure>
  </div>
</section>

<section class="band">
  <div class="wrap two mouv">
    <div class="reveal">
      <span class="eyebrow">La création</span>
      <h2 class="display h2" style="margin:14px 0 18px">Chromaline, en mouvement.</h2>
      <p class="lede">Succombe au charme de Chromaline, la création exclusive signée mood. Conçue pour les femmes audacieuses, créatives et passionnées de mode, cette bague réinvente notre concept iconique dans une silhouette d'une finesse absolue.</p>
      <p class="lede" style="margin-top:14px">Tu aimais l'idée de pouvoir changer de style au gré de tes envies, mais tu cherchais un modèle plus délicat ? Chromaline est la réponse.</p>
      <ul class="atouts">
        <li>Largeur ultra-fine de 9 mm — même les mains les plus fines la portent</li>
        <li>Base en argent 925 et acier chirurgical 316L, hypoallergénique</li>
        <li>7 combos de couleurs modulables — aluminium anodisé, à combiner sans limite</li>
        <li>Effet galbé, lumineux, infiniment sophistiqué</li>
        <li>Le clic mood breveté — le même geste, la même durabilité</li>
      </ul>
    </div>
    <figure class="figure reveal d1 film" style="background:#0d0d0d;margin:0">
      <video src="https://cdn.shopify.com/videos/c/o/v/ed958f4f94f84fc38bf80ba505be60f6.mov"
             autoplay muted loop playsinline preload="metadata"
             aria-label="La bague Chromaline en mouvement"></video>
      <figcaption class="cap">Le clic breveté depuis 2004 — ouvre, choisis, referme.</figcaption>
    </figure>
  </div>
</section>

<section class="band band-cream" id="achat">
  <div class="wrap two">
    <div class="stage stage-big reveal" id="stageAchat"></div>

    <div class="acheter reveal d1">
      <p class="etape">1 &middot; Couleur</p>
      <p class="choix-nom" id="colorName2">Acier froiss&eacute;</p>
      <div class="swatches" id="swatches2" role="group" aria-label="Choisir la couleur"></div>
      <p class="mini">*la couleur des anneaux peut l&eacute;g&egrave;rement varier selon la lumi&egrave;re ambiante.</p>

      <p class="etape" style="margin-top:26px">2 &middot; Taille</p>
      <div class="tailles" id="tailles" role="group" aria-label="Choisir la taille"></div>
      <p class="mini lien-guide"><a href="https://www.yourmood.net/pages/guide-des-tailles">Voir le guide des tailles</a></p>
      <a class="pilule" href="https://www.yourmood.net/search?q=baguier">Je ne connais pas ma taille &rarr; recevoir un baguier gratuit</a>
      <p class="mini">&#10003; En cas de mauvaise taille, nous &eacute;changeons la bague sans discussion.</p>

      <hr class="filet">

      <p class="prix"><s>479 CHF</s><b>197 CHF</b></p>
      <p class="mini">Prix du pack d&eacute;couverte &middot; 1 base ultra fine + 3 anneaux inclus</p>

      <p class="powerpay">ou paie en 3&times; <b>65.67 CHF</b> avec Powerpay &middot; <a href="https://www.yourmood.net/pages/powerpay">en savoir plus</a></p>

      <a class="btn-achat" href="https://www.yourmood.net/products/bague-mood-chromaline-avec-anneaux-interchangeables-set-complet">Je m&rsquo;offre ma bague mood</a>

      <p class="secu">Paiement 100 % s&eacute;curis&eacute;</p>
      <div class="logos">
        <img src="https://cdn.shopify.com/s/files/1/0798/2303/files/logo-visa_93cd5991-8218-4067-abc6-40be4fe10b45.jpg" alt="Visa" loading="lazy">
        <img src="https://cdn.shopify.com/s/files/1/0798/2303/files/logo-mastercard_10d0177a-4960-4fec-b517-c98ed9541838.jpg" alt="Mastercard" loading="lazy">
        <img src="https://cdn.shopify.com/s/files/1/0798/2303/files/logo-twint_4ba05e68-0d6c-4e14-b8a8-f92559ce234c.jpg" alt="TWINT" loading="lazy">
        <img src="https://cdn.shopify.com/s/files/1/0798/2303/files/logo-paypal.jpg" alt="PayPal" loading="lazy">
        <img src="https://cdn.shopify.com/s/files/1/0798/2303/files/logo-applepay.jpg" alt="Apple Pay" loading="lazy">
        <img src="https://cdn.shopify.com/s/files/1/0798/2303/files/logo-klarna.jpg" alt="Klarna" loading="lazy">
      </div>

      <hr class="filet">

      <ul class="rassure">
        <li>Argent 925 &middot; Acier 316L &middot; 9 mm</li>
        <li>&Eacute;change gratuit 15 jours</li>
        <li>Garantie &agrave; vie</li>
        <li>Swiss design depuis 2004</li>
      </ul>
    </div>
  </div>
</section>



<section class="band">
  <div class="wrap center">
    <span class="eyebrow">Le geste</span>
    <h2 class="display h2 reveal" style="margin:14px 0 12px">Le clic mood, en plus délicat.</h2>
    <p class="lede reveal d1" style="margin:0 auto">Trois anneaux dans le pack. Tu ouvres, tu glisses, tu referme. Cinq secondes, sans outil, sans bijoutier.</p>
    <div class="steps">
      <div class="step reveal"><span class="n">1</span><h3>Tu ouvres</h3><p>La base s'ouvre sur son clip intégré, fabriqué en Suisse depuis 2004.</p><img class="geste" src="/chromaline/geste-1.jpg" alt="Étape 1 : tu ouvres" loading="lazy"></div>
      <div class="step reveal d1"><span class="n">2</span><h3>Tu glisses</h3><p>L'anneau de couleur prend sa place au centre, entre les deux rangs de zircons.</p><img class="geste" src="/chromaline/geste-2.jpg" alt="Étape 2 : tu glisses" loading="lazy"></div>
      <div class="step reveal d2"><span class="n">3</span><h3>Tu refermes</h3><p>Le clic. La bague est scellée, la couleur est à toi jusqu'à la prochaine envie.</p><img class="geste" src="/chromaline/geste-3.jpg" alt="Étape 3 : tu refermes" loading="lazy"></div>
    </div>
  </div>
</section>

<section class="band band-cream">
  <div class="wrap center">
    <span class="eyebrow">Sept couleurs</span>
    <h2 class="display h2 reveal" style="margin:14px 0 12px">Choisis ton humeur du jour.</h2>
    <p class="lede reveal d1" style="margin:0 auto">Passe sur une humeur — tu la vois au doigt. Clique, et elle remonte en haut de page.</p>
    <div class="seven" id="seven"></div>
  </div>
</section>



<section class="band band-cream">
  <div class="wrap center">
    <span class="eyebrow">18 000+ avis vérifiés · 4.8 / 5</span>
    <h2 class="display h2 reveal" style="margin:14px 0 0">Ce qu'en disent celles qui la portent.</h2>
    <div class="avis">
      <blockquote class="reveal">
        <div class="stars">★★★★★</div>
        <h4>Enfin la version fine que j'attendais</h4>
        <p>Je connais le concept mood depuis des années, mais la bague était trop large pour ma main. Quand j'ai vu Chromaline, je l'ai tout de suite commandée. Fine, élégante, exactement ce que je cherchais.</p>
        <cite>Isabelle Schutzbach</cite>
      </blockquote>
      <blockquote class="reveal d1">
        <div class="stars">★★★★★</div>
        <h4>Le concept mood en version délicate</h4>
        <p>J'admirais les bagues mood depuis longtemps mais je les trouvais un peu massives pour moi. Avec Chromaline, je change tout — même liberté de style, une finesse qui va aux mains discrètes comme les miennes.</p>
        <cite>Edith Balmer</cite>
      </blockquote>
      <blockquote class="reveal d2">
        <div class="stars">★★★★★</div>
        <h4>Un cadeau parfait</h4>
        <p>Offerte à ma femme pour notre anniversaire. Elle avait toujours dit que les bagues mood étaient trop larges pour elle. Avec Chromaline, elle a trouvé sa version. On a déjà commandé deux couleurs de plus.</p>
        <cite>Pierre Vaucher</cite>
      </blockquote>
    </div>
  </div>
</section>

<section class="final">
  <div class="wrap">
    <span class="eyebrow">Pack découverte</span>
    <h2 class="display h1" style="margin:14px 0 0">Prête à porter la plus fine ?</h2>
    <p class="lede center" style="max-width:46ch">Une base en argent 925 et acier, trois anneaux de couleur, un écrin. 197 CHF, garantie à vie.</p>
    <a class="btn btn-c" href="https://www.yourmood.net/products/bague-mood-chromaline-avec-anneaux-interchangeables-set-complet">Je choisis la mienne</a>
  </div>
</section>

<p class="foot">Mood Collection · Orbe · Suisse · maquette</p>

<script>
(function(){
  var CDN='https://cdn.shopify.com/s/files/1/0798/2303/files/';
  var COLORS=[
    {k:'acier',   nom:'Acier froissé',          c:'#a8adb1', soft:'#eef0f1', img:'chromaline-acier.jpg',      film:'acier', humeur:'Minimaliste'},
    {k:'turq',    nom:'Turquoise',             c:'#3fb3b2', soft:'#e4f4f3', img:'chromaline-turquoise.jpg',  film:'turquoise', humeur:'Serein(e)'},
    {k:'beli',    nom:'Belipastel',            c:'#cf94c8', soft:'#f6ebf5', img:'chromaline-belipastel.jpg', film:'belipastel', humeur:'Rêveur(se)'},
    {k:'rouge',   nom:'Rouge Swiss Edition',   c:'#c2424f', soft:'#f8e8e9', img:'chromaline-swiss-red.jpg',  film:'swiss-red', humeur:'Audacieux(se)'},
    {k:'marine',  nom:'Bleu Marine',           c:'#3f4b80', soft:'#e9ebf4', img:'chromaline-bleu-marine.jpg',film:'bleu-marine', humeur:'Assuré(e)'},
    {k:'emeraude',nom:'Émeraude',              c:'#1f7a68', soft:'#e4f1ee', img:'chromaline-emeraude.jpg',   film:'emeraude', humeur:'Précieux(se)'},
    {k:'abricot', nom:'Abricot',               c:'#d99c6d', soft:'#faeee4', img:'chromaline-abricot.jpg',    film:'abricot', humeur:'Solaire'}
  ];

  var root=document.documentElement;
  var stage=document.getElementById('stage');
  var stageBig=document.getElementById('stageBig');
  var stageAchat=document.getElementById('stageAchat');
  var sws2=document.getElementById('swatches2');
  var nom2=document.getElementById('colorName2');
  var nom=document.getElementById('colorName');
  var sws=document.getElementById('swatches');
  var seven=document.getElementById('seven');
  var current=0;

  /* pastilles */
  [sws, sws2].forEach(function(hote){
    if(!hote) return;
    COLORS.forEach(function(col,i){
      var b=document.createElement('button');
      b.type='button'; b.className='sw'; b.style.setProperty('--sc',col.c);
      b.setAttribute('aria-pressed', i===0?'true':'false');
      b.setAttribute('aria-label', col.nom);
      b.addEventListener('click',function(){ choisir(i); });
      hote.appendChild(b);
    });
  });

  /* les tailles */
  var tailles=document.getElementById('tailles');
  if(tailles){
    ['50','52','54','56','58','60','62','64','66','68','70','72'].forEach(function(t){
      var b=document.createElement('button');
      b.type='button'; b.textContent=t;
      b.setAttribute('aria-pressed', t==='58'?'true':'false');
      b.addEventListener('click',function(){
        tailles.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed','false'); });
        b.setAttribute('aria-pressed','true');
      });
      tailles.appendChild(b);
    });
  }

  /* les sept en grand */
  COLORS.forEach(function(col,i){
    var d=document.createElement('button');
    d.type='button'; d.className='card'; d.style.setProperty('--sc',col.c);
    d.innerHTML='<span class="duo">'+
                  '<img class="carte" src="/chromaline/carte-'+col.film+'.jpg" alt="Nuancier '+col.humeur+'" loading="lazy">'+
                  '<img class="main" src="/chromaline/main-'+col.film+'.jpg" alt="Bague mood Chromaline '+col.nom+' portée au doigt" loading="lazy">'+
                '</span>'+
                '<span class="nm"><i class="dot"></i>'+col.nom+'</span>';
    d.addEventListener('click',function(){
      choisir(i);
      document.querySelector('.hero').scrollIntoView({behavior:'smooth',block:'start'});
    });
    seven.appendChild(d);
  });


  /* les sept petits films empilés : celui de la couleur choisie tourne, les autres attendent */
  var couches=[], couchesBig=[];
  function poser(hote, liste, enPhoto){
    if(!hote) return;
    COLORS.forEach(function(col,i){
      var el;
      if(enPhoto){
        el=document.createElement('img');
        el.src='/chromaline/fond-'+col.film+'.jpg';
        el.alt='Bague mood Chromaline '+col.nom+', argent 925 et zircons';
        el.loading = i===0 ? 'eager' : 'lazy';
      } else {
        el=document.createElement('video');
        el.src='/chromaline/'+col.film+'.mp4';
        el.muted=true; el.loop=true; el.playsInline=true; el.setAttribute('playsinline','');
        el.preload = i===0 ? 'auto' : 'none';
        el.setAttribute('aria-label','Bague mood Chromaline '+col.nom+' qui tourne');
      }
      if(i===0){ el.className='on'; }
      hote.appendChild(el);
      liste.push(el);
    });
  }
  poser(stage, couches, false);       /* le titre : la bague qui tourne */
  poser(stageBig, couchesBig, true);  /* le choix des couleurs : les photos */
  var couchesAchat=[];
  poser(stageAchat, couchesAchat, true);
  function jouerListe(liste,i){
    liste.forEach(function(v,k){
      if(!v.play) return;
      if(k===i){ if(v.preload==='none') v.preload='auto'; var q=v.play(); if(q&&q.catch) q.catch(function(){}); }
      else { v.pause(); }
    });
  }
  function jouer(i){ jouerListe(couches,i); }
  jouer(0);

  /* la cliente choisit : photo, nom, pastilles, bouton, halo */
  function choisir(i){
    current=i;
    var col=COLORS[i];
    root.style.setProperty('--c',col.c);
    root.style.setProperty('--c-soft',col.soft);
    nom.textContent=col.nom;
    if(nom2) nom2.textContent=col.nom;
    for(var kb=0;kb<couchesBig.length;kb++) couchesBig[kb].classList.toggle('on',kb===i);
    for(var ka=0;ka<couchesAchat.length;ka++) couchesAchat[ka].classList.toggle('on',ka===i);
    [sws,sws2].forEach(function(hote){
      if(!hote) return;
      var bs=hote.querySelectorAll('.sw');
      for(var k2=0;k2<bs.length;k2++) bs[k2].setAttribute('aria-pressed', k2===i?'true':'false');
    });
  }

  /* le titre vit sa vie : la bague tourne et change de couleur en boucle */
  var titre=0;
  function titreCouleur(i){
    titre=i;
    root.style.setProperty('--ct',COLORS[i].c);
    for(var k=0;k<couches.length;k++) couches[k].classList.toggle('on',k===i);
    jouer(i);
  }
  /* les deux bagues côte à côte : elles changent en parallèle */
  var duos=document.querySelectorAll('#duos img'), duoIdx=0;
  function duoSuivant(){
    if(!duos.length) return;
    duoIdx=(duoIdx+1)%duos.length;
    for(var k=0;k<duos.length;k++) duos[k].classList.toggle('on',k===duoIdx);
  }

  titreCouleur(0);
  choisir(0);
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    setInterval(function(){ titreCouleur((titre+1)%COLORS.length); duoSuivant(); },5200);
  }

  /* révélation douce */
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{rootMargin:'0px 0px -10% 0px',threshold:.1});
  document.querySelectorAll('.reveal').forEach(function(el){
    if(el.getBoundingClientRect().top < window.innerHeight*0.95) el.classList.add('in');
    else io.observe(el);
  });
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0, must-revalidate' } });
}
