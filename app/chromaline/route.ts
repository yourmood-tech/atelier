export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>mood Chromaline</title><meta name="robots" content="noindex,nofollow"></head><body style="margin:0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,200;0,300;0,400;0,500;0,600;1,300;1,400&display=swap">
<style>
:root{
  --serif:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
  --sans:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
  --paper:#ffffff;
  --cream:#f6f6f7;
  --ink:#191917;
  --mid:#8b8880;
  --line:#e9e9ec;
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
.preuve{background:#fff;border-block:1px solid var(--line);padding:18px 0}
.preuve-in{
  display:flex;flex-wrap:wrap;align-items:center;justify-content:center;
  gap:clamp(12px,2vw,30px);text-align:center;
}
.preuve-i{
  display:inline-flex;align-items:center;gap:9px;
  font-size:clamp(14px,1.25vw,17px);color:var(--ink);font-weight:400;letter-spacing:.01em;
}
.etoiles{color:var(--c);font-style:normal;letter-spacing:2px;font-size:1.05em;transition:color .8s ease}
.suisse{width:20px;height:20px;flex:none;border-radius:4px}
.sep{width:1px;height:18px;background:var(--line)}
@media (max-width:700px){ .sep{display:none} .preuve-in{gap:10px 18px} }
.band-cream{background:var(--cream)}
.center{text-align:center}

.eyebrow{
  display:block;font-size:10px;letter-spacing:3.2px;text-transform:uppercase;
  color:var(--mid);font-weight:400;
}
.display{font-family:var(--serif);font-weight:300;line-height:1.1;letter-spacing:-.018em;text-wrap:balance}
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
#stageBig{aspect-ratio:1/1;background:#d9d9db}
#stageBig video{object-fit:cover;mix-blend-mode:normal}
#stageAchat{aspect-ratio:1/1;background:#e9e9ea}
#stageAchat img,#stageAchat video{object-fit:cover}
#stageAchat video{background:#e9e9ea}
.choix{
  display:grid;grid-template-columns:1.1fr 0.9fr;align-items:center;
  gap:clamp(20px,3.4vw,56px);max-width:960px;margin:clamp(10px,2vw,26px) auto 0;
  text-align:left;
}
.choix>.stage-big{order:1}
.choix>.choix-txt{order:2}
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
.reel{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,1.4vw,16px)}
.reel figure{position:relative;margin:0;overflow:hidden;border-radius:4px;background:#111;aspect-ratio:9/16;cursor:pointer}
.reel video{width:100%;height:100%;object-fit:cover;display:block}
.faq{max-width:840px;margin:0 auto}
.q{border-bottom:1px solid var(--line);padding:4px 0}
.q summary{
  cursor:pointer;list-style:none;padding:18px 34px 18px 0;position:relative;
  font-family:var(--serif);font-size:clamp(16px,1.5vw,20px);color:var(--ink);
}
.q summary::-webkit-details-marker{display:none}
.q summary::after{content:"+";position:absolute;right:6px;top:16px;font-size:20px;color:var(--c);transition:transform .25s,color .8s}
.q[open] summary::after{content:"\\2013"}
.q p{padding:0 10px 20px 0;font-size:14px;color:var(--mid);line-height:1.75}
.contacts{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,2vw,24px);max-width:940px;margin:0 auto}
.contact{
  background:#fff;border:1px solid var(--line);border-radius:6px;padding:clamp(20px,2.4vw,30px);
  display:grid;gap:8px;transition:transform .3s,box-shadow .3s;
}
.contact:hover{transform:translateY(-4px);box-shadow:0 16px 30px rgba(25,25,23,.08)}
.contact b{font-family:var(--serif);font-weight:400;font-size:17px}
.contact i{font-style:normal;font-size:12.5px;color:var(--mid)}
@media (max-width:820px){ .reel{grid-template-columns:repeat(2,1fr)} .contacts{grid-template-columns:1fr} }
.duo-cartes{display:grid;grid-template-columns:1fr 1fr;gap:clamp(16px,2.6vw,34px)}
.carte-info{
  margin:0;background:#fff;border:1px solid var(--line);border-radius:6px;overflow:hidden;
  display:flex;flex-direction:column;
}
.carte-info img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
.carte-info figcaption{padding:clamp(20px,2.6vw,32px)}
.carte-info .eyebrow{margin-bottom:10px}
.carte-info h3{margin:0 0 10px}
.carte-info p{font-size:14px;color:var(--mid);line-height:1.7}
@media (max-width:820px){ .duo-cartes{grid-template-columns:1fr} }
.two{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,64px);align-items:center}
.mouv{align-items:center}
.mouv .film{display:flex;flex-direction:column;overflow:hidden;aspect-ratio:1/1;max-height:560px}
.mouv .film video{flex:1 1 auto;width:100%;min-height:0;object-fit:cover;display:block}
.mouv .film .cap{background:#0d0d0d;color:#8e8c88;flex:none}
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


/* le titre : la photo à gauche, le texte à côté, sans aucun dégradé */
.hero2{display:grid;grid-template-columns:1.6fr 1fr;align-items:stretch;background:#fff}
.h2scene{position:relative;min-height:clamp(380px,42vw,600px);background:#efe9e2;overflow:hidden}
.h2bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:46% 48%;
  opacity:0;transition:opacity 1.1s ease}
.h2bg.on{opacity:1}
.h2txt{display:flex;align-items:center;padding:clamp(28px,3vw,54px) clamp(24px,3.4vw,60px)}
.h2inner{max-width:430px}
.h2eye{border-bottom:1px solid var(--ink);display:inline-block;padding-bottom:3px}
.h2titre{font-size:clamp(30px,3.6vw,54px);text-transform:uppercase;letter-spacing:-.012em;margin:12px 0 0;line-height:1.02}
.h2titre em{font-style:italic;text-transform:none;font-weight:400;font-size:.8em}
.h2lede{margin:16px 0 0;color:var(--ink);font-size:clamp(13px,.95vw,15px);line-height:1.75}
.h2prix{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:18px 0 0;
  font-family:var(--sans);font-weight:500;font-size:clamp(17px,1.4vw,22px);letter-spacing:.01em}
.h2note{font-size:11.5px;font-weight:300;color:var(--mid);letter-spacing:.02em}
.h2btn{margin-top:16px;padding:14px 30px}
.h2res{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px;
  font-size:11px;line-height:1.45;color:#6f6b64;text-align:center}
.h2r{display:flex;flex-direction:column;align-items:center;gap:7px}
.h2r svg{width:23px;height:23px;color:var(--ink)}
@media (max-width:900px){
  .hero2{grid-template-columns:1fr}
  .h2scene{min-height:0;height:76vw}
  .h2txt{padding:26px 22px 34px}
  .h2inner{max-width:none}
  .h2titre{font-size:clamp(30px,8.6vw,44px)}
}

/* le bandeau des avis */
.bavis{background:#76797c;padding:17px 0;overflow:hidden;transition:background 1.4s ease}
.bavis .avis-un{color:#fff}
.bavis .avis-un .et{color:#ffd77a}
.avis-piste{overflow:hidden;-webkit-mask-image:linear-gradient(to right,transparent,#000 6%,#000 94%,transparent)}
.avis-file{display:flex;gap:46px;width:max-content;animation:avisDefile 64s linear infinite}
.bavis:hover .avis-file{animation-play-state:paused}
.avis-un{display:flex;align-items:center;gap:12px;white-space:nowrap;font-size:14px;color:var(--ink);font-weight:300}
.avis-un b{font-weight:500}
.avis-un .et{color:#e8b53a;letter-spacing:1px;font-size:12px}
@keyframes avisDefile{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){ .avis-file{animation:none} }

/* le concept */
.concept{background:#fff;padding-block:clamp(26px,3.2vw,52px)}
.cp-in{display:grid;grid-template-columns:.74fr 1.26fr;gap:clamp(18px,2.6vw,44px);align-items:center}
.cp-titre{font-size:clamp(30px,3.5vw,50px);text-transform:uppercase;line-height:1.04;margin:14px 0 0;letter-spacing:-.012em}
.cp-lede{margin:18px 0 0;font-size:clamp(13px,.98vw,15.5px);line-height:1.8;color:var(--ink)}
.cp-sur{text-align:center;font-size:clamp(12.5px,1vw,15px);line-height:1.6;color:var(--ink);margin:0 0 6px}
.cp-scene{position:relative;aspect-ratio:1848/716}
.cp-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0}
.cp-img.on{opacity:1}
.cp-leg{display:grid;grid-template-columns:1.1fr 1.1fr 1fr;gap:12px;margin-top:2px;
  text-align:center;font-size:11.5px;line-height:1.5;color:var(--mid)}
.cp-leg b{color:var(--ink);font-weight:500}
@media (max-width:900px){
  .cp-in{grid-template-columns:1fr;gap:22px}
  .cp-titre{font-size:clamp(28px,8vw,40px)}
  .cp-leg{font-size:10.5px;gap:8px}
}

/* les trois gestes, en grand */
.geste3{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:start;
  gap:clamp(10px,1.6vw,30px);margin-top:clamp(26px,3vw,46px);text-align:left;
  width:min(1560px,92vw);position:relative;left:50%;transform:translateX(-50%)}
.g3{margin:0}
.g3 img{width:100%;aspect-ratio:3/1;object-fit:cover;border-radius:3px;display:block;
  box-shadow:0 14px 34px rgba(25,25,23,.10)}
.g3 figcaption{margin-top:16px;font-size:clamp(13px,1vw,15px);line-height:1.65;color:var(--mid)}
.g3 figcaption b{display:block;margin-bottom:5px;color:var(--ink);font-weight:500;
  font-size:11px;letter-spacing:2.2px;text-transform:uppercase}
.g3f{align-self:start;margin-top:5.5%;color:var(--mid);font-size:clamp(16px,1.6vw,24px);line-height:1}
@media (max-width:860px){
  .geste3{grid-template-columns:1fr;gap:22px;width:100%;position:static;transform:none}
  .g3f{display:none}
  .g3 img{aspect-ratio:3/1}
}

.geste-band{padding-top:clamp(6px,0.9vw,16px);padding-bottom:clamp(6px,0.9vw,16px)}
.geste-band .geste3{margin-top:0;gap:clamp(8px,1.1vw,20px)}
#achat{padding-top:clamp(14px,1.8vw,30px);padding-bottom:clamp(10px,1.2vw,22px);background:var(--c-soft);transition:background .8s ease}

/* la pellicule de photos sous la bague qui tourne */
.colvis{order:0;min-width:0;width:100%;max-width:520px;margin-inline:auto}
.colvis .stage-big{margin:0}
.pelli-bloc{position:relative;margin-top:10px;width:100%;max-width:100%}
.pelli{width:100%;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;
  -webkit-mask-image:linear-gradient(to right,transparent,#000 5%,#000 95%,transparent);
          mask-image:linear-gradient(to right,transparent,#000 5%,#000 95%,transparent)}
.pelli::-webkit-scrollbar{display:none}
.pelli-piste{display:flex;gap:10px;width:max-content}
.fl{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:30px;height:30px;
  border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#191917;cursor:pointer;
  font-size:19px;line-height:1;padding:0 0 2px;box-shadow:0 2px 10px rgba(0,0,0,.16);
  display:flex;align-items:center;justify-content:center;transition:background .2s ease}
.fl:hover{background:#fff}
.fl-g{left:2px}
.fl-d{right:2px}
.pelli button{flex:0 0 auto;padding:0;border:0;background:#f1f1f2;cursor:pointer;
  height:clamp(74px,8.4vw,122px);aspect-ratio:1/1;border-radius:3px;overflow:hidden;
  transition:opacity .3s ease}
.pelli button:hover{opacity:.82}
.pelli img{width:100%;height:100%;object-fit:cover;display:block}
#grandVue{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;z-index:3;
  cursor:zoom-out;background:#e9e9ea;mix-blend-mode:normal}
#stageAchat .fl{z-index:5}
.fermer-vue{position:absolute;top:10px;right:10px;z-index:4;width:30px;height:30px;border:0;border-radius:50%;
  background:rgba(255,255,255,.92);color:#191917;font-size:15px;line-height:1;cursor:pointer;
  box-shadow:0 2px 10px rgba(0,0,0,.14)}
@media (prefers-reduced-motion:reduce){ .pelli-piste{animation:none} }

/* le compte, sous le configurateur */
.compte{background:var(--c-soft);transition:background .8s ease;
  padding-top:0;padding-bottom:clamp(26px,3.2vw,54px);text-align:center;margin-top:-1px}
.compte-titre{font-size:clamp(26px,3.2vw,46px);font-weight:300;margin:10px 0 clamp(18px,2.2vw,30px)}
.compte-in{display:grid;grid-template-columns:1fr 1fr;gap:clamp(16px,2vw,30px);align-items:stretch;text-align:left}
.grille{border:1px solid rgba(25,25,23,.10);border-radius:4px;overflow:hidden;background:rgba(255,255,255,.42);
  display:flex;flex-direction:column}
.lg{display:flex;justify-content:space-between;align-items:center;gap:16px;flex:1;
  padding:clamp(13px,1.5vw,20px) clamp(14px,1.8vw,24px);font-size:clamp(13px,1vw,15.5px);
  border-bottom:1px solid rgba(25,25,23,.08)}
.lg:last-child{border-bottom:0}
.lg b{font-weight:400;white-space:nowrap}
.lg.tot{background:#14150f;color:#fff}
.lg.tot b{font-weight:500}
.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(8px,1.1vw,16px)}
.trio figure{margin:0;display:flex;flex-direction:column}
.trio img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:4px;display:block;background:#fff}
.trio figcaption{margin-top:9px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:var(--mid);text-align:center}
.minis{position:relative;display:block;width:100%;aspect-ratio:1/1;border-radius:4px;overflow:hidden;background:#fff}
.minis img{position:absolute;inset:0;height:100%;opacity:0;border-radius:0}
.minis img.on{opacity:1}
.compte-pied{margin:clamp(16px,2vw,26px) auto 0;max-width:620px;font-size:clamp(12.5px,.95vw,14.5px);color:var(--mid);line-height:1.65}
@media (max-width:860px){
  .compte-in{grid-template-columns:1fr}
}

/* les sept couleurs : l'anneau puis la main */
.card .carte,.card .portee{width:100%;display:block;border-radius:4px;background:var(--cream)}
.card .carte{aspect-ratio:1/1;object-fit:cover}
.card .portee{aspect-ratio:3/2;object-fit:cover;margin-top:6px}

/* le bandeau de reassurance + les questions */
.rassure{background:var(--cream);border-block:1px solid var(--line);padding-block:clamp(16px,2vw,26px)}
.rs-in{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(14px,2.4vw,42px);align-items:center}
.rs{display:flex;align-items:center;gap:10px;font-size:11.5px;line-height:1.35;color:var(--ink);text-align:left}
.rs svg{width:26px;height:26px;flex:0 0 auto;color:var(--ink)}
.rs i{font-style:normal}
.qa{padding-block:clamp(30px,3.6vw,58px)}
.qa-titre{font-size:clamp(22px,2.4vw,34px);text-transform:uppercase;letter-spacing:-.01em;margin:0 0 clamp(16px,2vw,26px)}
.qa-grille{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;align-content:start}
.qa-grille .q{border:1px solid var(--line);border-radius:3px;background:#fff;height:fit-content}
.qa-grille .q summary{display:flex;justify-content:space-between;align-items:center;gap:14px;
  cursor:pointer;list-style:none;padding:13px 16px;font-size:14px;line-height:1.4}
.qa-grille .q summary::-webkit-details-marker{display:none}
.qa-grille .q summary::marker{content:""}
.qa-grille .q summary em{font-style:normal;font-size:17px;color:var(--mid);line-height:1;transition:transform .25s ease;display:inline-block}
.qa-grille .q[open] summary em{transform:rotate(45deg)}
.qa-grille .q p{margin:0;padding:0 16px 15px;font-size:13px;line-height:1.7;color:var(--mid)}
@media (max-width:860px){
  .rs-in{gap:14px 18px}
  .qa-grille{grid-template-columns:1fr}
}

/* la fenetre du guide des tailles */
.gt-fond{position:fixed;inset:0;z-index:90;background:rgba(20,20,18,.55);display:flex;align-items:center;justify-content:center;padding:18px}
.gt-fond[hidden]{display:none}
.gt{position:relative;background:#fff;border-radius:6px;max-width:520px;width:100%;max-height:86vh;overflow:auto;padding:clamp(22px,3vw,34px)}
.gt h3{font-family:var(--serif);font-weight:400;font-size:21px;margin:0 0 8px}
.gt p{font-size:13.5px;color:var(--mid);line-height:1.6;margin:0 0 16px}
.gt table{width:100%;border-collapse:collapse;font-size:13px}
.gt th,.gt td{padding:7px 6px;text-align:left;border-bottom:1px solid var(--line)}
.gt th{font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--mid);font-weight:400}
.gt-x{position:absolute;top:10px;right:12px;border:0;background:none;font-size:24px;line-height:1;color:var(--mid);cursor:pointer}
.gt-pied{margin-top:16px!important;margin-bottom:0!important}
</style>

<section class="hero2">
  <div class="h2scene">
    <img class="h2bg on" src="/chromaline/hero-portee.jpg" alt="La bague mood fine portée au doigt" fetchpriority="high">
    <img class="h2bg" src="/chromaline/portee-froisse.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee-emeraude.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee-turquoise.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee-bleu.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee-marine.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee-rouge.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee-abricot.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee2-belipastel.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee2-abricot.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee2-gris.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee2-bleu.jpg" alt="" loading="lazy">
    <img class="h2bg" src="/chromaline/portee2-vert.jpg" alt="" loading="lazy">
  </div>
  <div class="h2txt">
    <div class="h2inner">
      <span class="eyebrow h2eye">Chromaline</span>
      <h1 class="display h2titre">La bague<br>mood fine<br><em>sertie de pierres</em></h1>
      <p class="h2lede">Une bague fine, élégante et unique.<br>Des pierres, des couleurs, des matières.<br>Un système interchangeable pour créer<br>des compositions qui vous ressemblent.</p>
      <p class="h2prix">CHF 197.–
        <span class="h2note"><em class="etoiles">&#9733;&#9733;&#9733;&#9733;&#9733;</em> 4.8/5 &middot; 18&nbsp;000+ avis</span>
      </p>
      <p style="margin:0"><a class="btn btn-c h2btn" href="#achat">Créer la mienne &nbsp;&rarr;</a></p>
      <div class="h2res">
        <span class="h2r"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 5h12v10H1zM13 8h4.5l3.5 3.5V15H13z"/><circle cx="5.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></svg>Livraison depuis<br>la Suisse</span>
        <span class="h2r"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 2.6 21 7v10l-9 4.4L3 17V7z"/><path d="M3 7l9 4.4L21 7M12 11.4V21.4"/></svg>Échange de taille<br>facile (30 jours)</span>
        <span class="h2r"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Paiement sécurisé<br>100% Suisse</span>
      </div>
    </div>
  </div>
</section>

<div class="preuve">
  <div class="wrap preuve-in">
    <span class="preuve-i"><em class="etoiles">&#9733;&#9733;&#9733;&#9733;&#9733;</em> 4.8 / 5 &middot; 18 000+ avis</span>
    <span class="sep"></span>
    <span class="preuve-i">75 000+ clientes</span>
    <span class="sep"></span>
    <span class="preuve-i"><svg class="suisse" viewBox="0 0 32 32" aria-label="Suisse" role="img"><rect width="32" height="32" rx="4" fill="#D52B1E"/><path d="M13.5 6.5h5v7h7v5h-7v7h-5v-7h-7v-5h7z" fill="#fff"/></svg> Concept suisse depuis 2004</span>
  </div>
</div>


<section class="bavis">
  <div class="avis-piste">
    <div class="avis-file" id="avisFile"></div>
  </div>
</section>

<section class="concept">
  <div class="wrap cp-in">
    <div class="cp-txt">
      <span class="eyebrow">Le concept</span>
      <h2 class="display cp-titre">Une bague<br>qui évolue<br>avec vous.</h2>
      <p class="cp-lede">Votre bague mood fine est un système.<br>Une base et des anneaux interchangeables<br>que vous pouvez choisir, changer et<br>recomposer selon vos envies.</p>
    </div>
    <div class="cp-vis">
      <p class="cp-sur">Des anneaux interchangeables<br>avec des pierres, des couleurs et des matières</p>
      <div class="cp-scene" id="cpScene">
        <img class="cp-img on" src="/chromaline/eclate/v2-acier.jpg" alt="La base mood, les anneaux et la composition montée">
        <img class="cp-img" src="/chromaline/eclate/v2-turquoise.jpg" alt="">
        <img class="cp-img" src="/chromaline/eclate/v2-lavande.jpg" alt="">
        <img class="cp-img" src="/chromaline/eclate/v2-marine.jpg" alt="">
        <img class="cp-img" src="/chromaline/eclate/v2-rouge.jpg" alt="">
        <img class="cp-img" src="/chromaline/eclate/v2-abricot.jpg" alt="">
      </div>
      <div class="cp-leg">
        <span><b>La base mood</b><br>avec système de clip intégré</span>
        <span><b>Les anneaux</b><br>à choisir selon vos envies</span>
        <span><b>Une composition unique</b><br>à l'infini</span>
      </div>
    </div>
  </div>
</section>

<section class="band geste-band">
  <div class="wrap center">
    <div class="geste3">
      <figure class="g3">
        <img src="/chromaline/geste-1.jpg" alt="Étape 1 : tu ouvres" loading="lazy">
        <figcaption><b>1 · Tu ouvres</b>La base s'ouvre sur son clip intégré, fabriqué en Suisse depuis 2004.</figcaption>
      </figure>
      <span class="g3f" aria-hidden="true">&rarr;</span>
      <figure class="g3">
        <img src="/chromaline/geste-2.jpg" alt="Étape 2 : tu glisses" loading="lazy">
        <figcaption><b>2 · Tu glisses</b>L'anneau de couleur prend sa place au centre, entre les deux rangs de zircons.</figcaption>
      </figure>
      <span class="g3f" aria-hidden="true">&rarr;</span>
      <figure class="g3">
        <img src="/chromaline/geste-3.jpg" alt="Étape 3 : tu refermes" loading="lazy">
        <figcaption><b>3 · Tu refermes</b>Le clic. La bague est scellée, la couleur est à toi jusqu'à la prochaine envie.</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="band band-cream" id="achat">
  <div class="wrap two">
    <div class="colvis reveal">
      <div class="stage stage-big" id="stageAchat"></div>
      <div class="pelli-bloc" id="pelli" hidden>
        <button type="button" class="fl fl-g" id="pelliG" aria-label="Photos pr&eacute;c&eacute;dentes">&lsaquo;</button>
        <div class="pelli" id="pelliVue"><div class="pelli-piste" id="pelliPiste"></div></div>
        <button type="button" class="fl fl-d" id="pelliD" aria-label="Photos suivantes">&rsaquo;</button>
      </div>
    </div>

    <div class="acheter reveal d1">
      <p class="etape">1 &middot; Couleur</p>
      <p class="choix-nom" id="colorName2">Acier froiss&eacute;</p>
      <div class="swatches" id="swatches2" role="group" aria-label="Choisir la couleur"></div>
      <p class="mini">*la couleur des anneaux peut l&eacute;g&egrave;rement varier selon la lumi&egrave;re ambiante.</p>

      <p class="etape" style="margin-top:26px">2 &middot; Taille</p>
      <div class="tailles" id="tailles" role="group" aria-label="Choisir la taille"></div>
      <p class="mini lien-guide"><a href="#" id="ouvrirGuide">Voir le guide des tailles</a></p>
      <a class="pilule" href="https://www.yourmood.net/cart/39295901663325:1" target="_blank" rel="noopener">Je ne connais pas ma taille &rarr; recevoir un baguier gratuit</a>
      <p class="mini">&#10003; En cas de mauvaise taille, nous &eacute;changeons la bague sans discussion.</p>

      <hr class="filet">

      <p class="prix"><s>509 CHF</s><b>197 CHF</b></p>
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

<section class="compte">
  <div class="wrap">
    <span class="eyebrow cp-eye">Le compte</span>
    <h2 class="display compte-titre">509.&#8212; de bijoux. 197.&#8212;.</h2>
    <div class="compte-in">
      <div class="grille">
        <div class="lg"><span>1 base extra small en acier 316L (9&#8239;mm)</span><b>250.&#8212;</b></div>
        <div class="lg"><span>1 mini &laquo;&nbsp;Aura Authentique&nbsp;&raquo; en argent 925 serti</span><b>199.&#8212;</b></div>
        <div class="lg"><span>2 minis en aluminium, la couleur de ton choix</span><b>60.&#8212;</b></div>
        <div class="lg tot"><span>Le pack d&eacute;couverte</span><b>197.&#8212;</b></div>
      </div>
      <div class="trio">
        <figure><img src="/chromaline/compte/base.jpg" alt="La base extra small en acier" loading="lazy"><figcaption>La base</figcaption></figure>
        <figure><img src="/chromaline/compte/aura.jpg" alt="Le mini Aura Authentique serti de zircons" loading="lazy"><figcaption>Le mini serti</figcaption></figure>
        <figure class="tmini" id="trioMini">
          <span class="minis">
            <img class="on" src="/chromaline/compte/mini-1.jpg" alt="Les minis en aluminium" loading="lazy">
            <img src="/chromaline/compte/mini-2.jpg" alt="" loading="lazy">
            <img src="/chromaline/compte/mini-3.jpg" alt="" loading="lazy">
            <img src="/chromaline/compte/mini-4.jpg" alt="" loading="lazy">
            <img src="/chromaline/compte/mini-5.jpg" alt="" loading="lazy">
            <img src="/chromaline/compte/mini-6.jpg" alt="" loading="lazy">
          </span>
          <figcaption>Les minis &middot; couleur &agrave; choix</figcaption>
        </figure>
      </div>
    </div>
    <p class="compte-pied">Pas de petite ristourne, pas de calcul compliqu&eacute;. Le pack co&ucirc;te moins cher que ses pi&egrave;ces prises s&eacute;par&eacute;ment.</p>
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
      <video id="filmMouvement" data-src="https://cdn.shopify.com/videos/c/o/v/ed958f4f94f84fc38bf80ba505be60f6.mov"
             muted loop playsinline preload="none"
             aria-label="La bague Chromaline en mouvement"></video>
      <figcaption class="cap">Le clic breveté depuis 2004 — ouvre, choisis, referme.</figcaption>
    </figure>
  </div>
</section>

<section class="rassure">
  <div class="wrap"><div class="rs-in"><span class="rs"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M12 3h12l5 6-11 12L7 9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 9h22M12 3l3 6-3 12M24 3l-3 6 3 12" fill="none" stroke="currentColor" stroke-width="1.1"/></svg><i>Bijou<br>interchangeable</i></span><span class="rs"><svg viewBox="0 0 36 36" aria-hidden="true"><rect x="4" y="4" width="28" height="28" rx="2" fill="currentColor"/><path d="M18 11v14M11 18h14" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg><i>Maison suisse<br>depuis 2004</i></span><span class="rs"><svg viewBox="0 0 36 36" aria-hidden="true"><rect x="5" y="13" width="26" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 13h30v5H3zM18 13v18" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M18 13c-4 0-7-1.5-7-4s4-2 7 4c3-5.5 7-6.5 7-4s-3 4-7 4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><i>&Eacute;change gratuit<br>si la taille ne convient pas (15 jours)</i></span><span class="rs"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M3 9h17v14H3zM20 14h6l5 5v4h-11z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="26" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="25" cy="26" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><i>Livraison rapide<br>depuis la Suisse</i></span><span class="rs"><svg viewBox="0 0 36 36" aria-hidden="true"><rect x="7" y="15" width="22" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 15v-4a6 6 0 0 1 12 0v4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="23" r="2" fill="currentColor"/></svg><i>Paiement s&eacute;curis&eacute;<br>100&nbsp;% suisse</i></span></div></div>
</section>

<section class="band qa">
  <div class="wrap">
    <h2 class="display qa-titre">Vos questions, nos r&eacute;ponses.</h2>
    <div class="qa-grille"><details class="q"><summary><span>Comment choisir ma taille de bague ?</span><em>+</em></summary><p>Les tailles vont de 50 à 72. Si tu connais déjà ta taille (en mm de tour de doigt), choisis-la directement. Sinon, mesure un anneau qui te va déjà avec une règle, ou consulte notre guide des tailles ci-dessus. Et surtout : l'échange est gratuit pendant 15 jours en cas de mauvaise taille, aucun stress.</p></details><details class="q"><summary><span>Et si je me trompe de taille ?</span><em>+</em></summary><p>Échange gratuit pendant 15 jours en cas de mauvaise taille — on s'occupe de tout. Tu nous écris, on t'envoie la bonne taille, tu renvoies la première. Simple.</p></details><details class="q"><summary><span>Quelle est la qualité de la bague ?</span><em>+</em></summary><p>La base Chromaline est en argent 925 et acier chirurgical 316L (hypoallergénique, inrayable), garantie à vie. Les anneaux interchangeables sont en aluminium anodisé, avec une palette de 7 combos de couleurs résistants à l'usure. Chaque bague est livrée avec sa carte d'authenticité.</p></details><details class="q"><summary><span>Combien de temps pour la livraison ?</span><em>+</em></summary><p>Nos créations sont fabriquées artisanalement, souvent après la commande. Les délais peuvent varier selon les pièces et la disponibilité des matériaux. En cas de besoin urgent (anniversaire, cadeau), contacte-nous — un traitement express peut être envisagé. Livraison en Suisse : 5 CHF, offerte dès 59 CHF d'achat.</p></details><details class="q"><summary><span>Puis-je acheter d'autres couleurs plus tard ?</span><em>+</em></summary><p>C'est tout le principe mood. Une fois ta base reçue, tu peux clipser n'importe quel addon de la collection — couleurs, métaux précieux, sertissages, éditions limitées. Plus de 40 variations existent déjà, et nous en sortons régulièrement.</p></details><details class="q"><summary><span>Puis-je payer en plusieurs fois ?</span><em>+</em></summary><p>Oui — paiement en 3× possible dès 100 CHF d'achat via Powerpay (Suisse uniquement), directement au moment du paiement. Carte bancaire, TWINT, PayPal et Apple/Google Pay sont aussi acceptés.</p></details><details class="q"><summary><span>Puis-je clipser des anneaux mood classiques sur la base Chromaline ?</span><em>+</em></summary><p>La base Chromaline est ultra fine (9 mm) et conçue pour les anneaux minis Chromaline. Les anneaux classiques mood (plus larges) ne sont pas compatibles — c'est ce qui fait toute la finesse du modèle.</p></details></div>
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



<section class="band">
  <div class="wrap center">
    <span class="eyebrow">Elles la portent</span>
    <h2 class="display h2 reveal" style="margin:14px 0 12px">La bague qui vit avec sa communauté.</h2>
    <p class="lede reveal d1" style="margin:0 auto clamp(24px,3vw,40px)">Passe sur une vidéo — elle démarre.</p>
    <div class="reel" id="reel"></div>
  </div>
</section>

<section class="band">
  <div class="wrap center">
    <span class="eyebrow">Une question ?</span>
    <h2 class="display h2 reveal" style="margin:14px 0 10px">On est là.</h2>
    <p class="lede reveal d1" style="margin:0 auto clamp(24px,3vw,40px)">L'équipe mood te répond, du lundi au vendredi.</p>
    <div class="contacts reveal">
      <a class="contact" href="mailto:contact@yourmood.net">
        <span class="eyebrow">Par email</span>
        <b>contact@yourmood.net</b>
        <i>Réponse sous 24 h</i>
      </a>
      <a class="contact" href="https://wa.me/41244544416">
        <span class="eyebrow">Sur WhatsApp</span>
        <b>+41 24 454 44 16</b>
        <i>Réponse dans la journée</i>
      </a>
      <a class="contact" href="https://www.facebook.com/groups/moodlovers">
        <span class="eyebrow">Rejoins la tribu</span>
        <b>Groupe Facebook Mood Lovers</b>
        <i>3 000+ membres actives</i>
      </a>
    </div>
  </div>
</section>

<p class="foot">Mood Collection · Orbe · Suisse · maquette</p>

<script>
(function(){
  var CDN='https://cdn.shopify.com/s/files/1/0798/2303/files/';
  var COLORS=[
    {k:'acier',   nom:'Acier froissé',          c:'#a8adb1', soft:'#eef0f1', img:'chromaline-acier.jpg',      film:'acier', humeur:'Minimaliste', vues:['gris-1','gris-2','gris-3','gris-4','gris-5'], portee:'gris-1', vnom:'Acier brossé'},
    {k:'turq',    nom:'Turquoise',             c:'#3fb3b2', soft:'#e4f4f3', img:'chromaline-turquoise.jpg',  film:'turquoise', humeur:'Serein(e)', vues:['turq-1','turq-2','turq-3','turq-4','turq-5'], portee:'turq-1', vnom:'Turquoise'},
    {k:'beli',    nom:'Belipastel',            c:'#cf94c8', soft:'#f6ebf5', img:'chromaline-belipastel.jpg', film:'belipastel', humeur:'Rêveur(se)', vues:['beli-1','beli-2','beli-3','beli-4','beli-5'], portee:'beli-1', vnom:'Belipastel'},
    {k:'rouge',   nom:'Rouge Swiss Edition',   c:'#c2424f', soft:'#f8e8e9', img:'chromaline-swiss-red.jpg',  film:'swiss-red', humeur:'Audacieux(se)', vues:['rouge-1','rouge-2','rouge-3','rouge-4','rouge-5'], portee:'rouge-1', vnom:'Rouge (Swiss Edition)'},
    {k:'marine',  nom:'Bleu Marine',           c:'#3f4b80', soft:'#e9ebf4', img:'chromaline-bleu-marine.jpg',film:'bleu-marine', humeur:'Assuré(e)', vues:['marine-1','marine-2','marine-3','marine-4','marine-5','marine-6','marine-7'], portee:'marine-3', vnom:'Bleu Marine'},
    {k:'emeraude',nom:'Émeraude',              c:'#1f7a68', soft:'#e4f1ee', img:'chromaline-emeraude.jpg',   film:'emeraude', humeur:'Précieux(se)', vues:['emer-1','emer-2','emer-3','emer-4','emer-5','emer-6'], portee:'emer-1', vnom:'Emeraude'},
    {k:'abricot', nom:'Abricot',               c:'#d99c6d', soft:'#faeee4', img:'chromaline-abricot.jpg',    film:'abricot', humeur:'Solaire', vues:['abri-1','abri-2','abri-3','abri-4','abri-5','abri-6'], portee:'abri-1', vnom:'Abricot'}
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
  var tailleChoisie='58';
  var tailles=document.getElementById('tailles');
  if(tailles){
    ['50','52','54','56','58','60','62','64','66','68','70','72'].forEach(function(t){
      var b=document.createElement('button');
      b.type='button'; b.textContent=t;
      b.setAttribute('aria-pressed', t==='58'?'true':'false');
      b.addEventListener('click',function(){
        tailles.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed','false'); });
        b.setAttribute('aria-pressed','true');
        tailleChoisie=t; majAchat();
      });
      tailles.appendChild(b);
    });
  }

  /* les sept en grand */
  COLORS.forEach(function(col,i){
    var d=document.createElement('button');
    d.type='button'; d.className='card'; d.style.setProperty('--sc',col.c);
    d.innerHTML='<img class="carte" src="/chromaline/carte-'+col.film+'.jpg" alt="Anneau Chromaline '+col.nom+'" loading="lazy">'+
                '<img class="portee" src="/chromaline/vues/'+col.portee+'.jpg" alt="Bague mood Chromaline '+col.nom+' portée au doigt" loading="lazy">'+
                '<span class="nm"><i class="dot"></i>'+col.nom+'</span>';
    d.addEventListener('click',function(){
      choisir(i);
      document.getElementById('achat').scrollIntoView({behavior:'smooth',block:'start'});
    });
    seven.appendChild(d);
  });


  /* les sept petits films empilés : celui de la couleur choisie tourne, les autres attendent */
  var couches=[], couchesBig=[];
  function poser(hote, liste, enPhoto, prefixe){
    if(!hote) return;
    COLORS.forEach(function(col,i){
      var el;
      if(enPhoto){
        el=document.createElement('img');
        el.src='/chromaline/'+(prefixe||'fond-')+col.film+'.jpg';
        el.alt='Bague mood Chromaline '+col.nom+', argent 925 et zircons';
        el.loading = i===0 ? 'eager' : 'lazy';
      } else {
        el=document.createElement('video');
        el.src='/chromaline/'+(prefixe||'')+col.film+'.mp4';
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
  poser(stageBig, couchesBig, false, 'achat-');  /* le premier bloc : la bague qui tourne */
  var couchesAchat=[];
  poser(stageAchat, couchesAchat, false, 'achat-');  /* le configurateur : la bague qui tourne */
  function jouerListe(liste,i){
    liste.forEach(function(v,k){
      if(!v.play) return;
      if(k===i){ if(v.preload==='none') v.preload='auto'; var q=v.play(); if(q&&q.catch) q.catch(function(){}); }
      else { v.pause(); }
    });
  }
  function jouer(i){ jouerListe(couches,i); }
  /* change de couleur sans recommencer : la nouvelle bague reprend au même moment du tour */
  function enchainer(liste,i){
    var t=0;
    liste.forEach(function(v){ if(v.play && !v.paused) t=v.currentTime; });
    liste.forEach(function(v,k){
      if(!v.play) return;
      if(k===i){
        v.preload='auto';
        var go=function(){ try{ v.currentTime = v.duration ? (t % v.duration) : t; }catch(e){} var q=v.play(); if(q&&q.catch) q.catch(function(){}); };
        if(v.readyState>=1) go(); else v.addEventListener('loadedmetadata',go,{once:true});
      } else { v.pause(); }
    });
  }
  jouer(0);

  /* la cliente choisit : photo, nom, pastilles, bouton, halo */
  /* le gros film ne se charge que lorsqu'il arrive a l'ecran */
  var gros=document.getElementById('filmMouvement');
  if(gros && 'IntersectionObserver' in window){
    var obs=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting && !gros.src){
          gros.src=gros.getAttribute('data-src'); gros.preload='auto';
          var q=gros.play(); if(q&&q.catch) q.catch(function(){});
          obs.disconnect();
        }
      });
    },{rootMargin:'300px'});
    obs.observe(gros);
  } else if(gros){ gros.src=gros.getAttribute('data-src'); }

  /* les minis du compte defilent */
  var tm=document.querySelectorAll('#trioMini .minis img');
  if(tm.length>1){
    var im=0;
    setInterval(function(){
      tm[im].classList.remove('on');
      im=(im+1)%tm.length;
      tm[im].classList.add('on');
    },1800);
  }

  var gFond=document.getElementById('guideTailles');
  var gOuvrir=document.getElementById('ouvrirGuide');
  var gFermer=document.getElementById('fermerGuide');
  if(gOuvrir&&gFond){
    gOuvrir.addEventListener('click',function(e){ e.preventDefault(); gFond.hidden=false; });
    gFond.addEventListener('click',function(e){ if(e.target===gFond) gFond.hidden=true; });
    if(gFermer) gFermer.addEventListener('click',function(){ gFond.hidden=true; });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') gFond.hidden=true; });
  }

  var pelli=document.getElementById('pelli');
  var pelliPiste=document.getElementById('pelliPiste');
  var pelliVue=document.getElementById('pelliVue');
  var pelliG=document.getElementById('pelliG');
  var pelliD=document.getElementById('pelliD');
  var grandVue=null, vuesCourantes=[], vueIndex=0;

  function fermerVue(){
    if(grandVue){ grandVue.remove(); grandVue=null; }
    if(stageAchat){
      var x=stageAchat.querySelector('.fermer-vue'); if(x) x.remove();
      var fl=stageAchat.querySelectorAll('.vue-fl');
      for(var i2=0;i2<fl.length;i2++) fl[i2].remove();
    }
  }

  function posePelli(i){
    if(!pelli||!pelliPiste) return;
    fermerVue();
    vuesCourantes=COLORS[i].vues||[];
    if(!vuesCourantes.length){ pelli.hidden=true; pelliPiste.innerHTML=''; return; }
    pelli.hidden=false;
    var html=vuesCourantes.map(function(v,k){
      return '<button type="button" data-k="'+k+'" aria-label="Voir cette photo en grand">'+
             '<img src="/chromaline/vues/mini/'+v+'.jpg" alt="" width="360" height="360" loading="lazy" decoding="async"></button>';
    }).join('');
    pelliPiste.innerHTML = html + html + html;
    if(pelliVue) pelliVue.scrollLeft = 0;
  }

  /* le defile avance tout seul et s'arrete sous la souris */
  var survol=false, pousse=false;
  if(pelliVue){
    pelliVue.addEventListener('mouseenter',function(){survol=true;});
    pelliVue.addEventListener('mouseleave',function(){survol=false;});
    setInterval(function(){
      if(survol || pousse || pelli.hidden) return;
      var tiers=pelliPiste.scrollWidth/3;
      if(!tiers) return;
      pelliVue.scrollLeft += 0.5;
      if(pelliVue.scrollLeft >= tiers*2) pelliVue.scrollLeft -= tiers;
    },16);
  }
  function glisser(sens){
    if(!pelliVue) return;
    var b=pelliPiste.querySelector('button');
    var pas=b ? (b.getBoundingClientRect().width+10)*2 : 220;
    pousse=true;
    pelliVue.scrollBy({left:sens*pas, behavior:'smooth'});
    setTimeout(function(){
      pousse=false;
      var tiers=pelliPiste.scrollWidth/3;
      if(!tiers) return;
      if(pelliVue.scrollLeft < 2) pelliVue.scrollLeft += tiers;
      if(pelliVue.scrollLeft >= tiers*2) pelliVue.scrollLeft -= tiers;
    },560);
  }
  if(pelliG) pelliG.addEventListener('click',function(){ glisser(-1); });
  if(pelliD) pelliD.addEventListener('click',function(){ glisser(1); });

  function ouvrirVue(k){
    if(!vuesCourantes.length) return;
    fermerVue();
    vueIndex=(k+vuesCourantes.length)%vuesCourantes.length;
    grandVue=document.createElement('img');
    grandVue.id='grandVue';
    grandVue.src='/chromaline/vues/'+vuesCourantes[vueIndex]+'.jpg';
    grandVue.alt='Bague mood Chromaline en photo';
    grandVue.title='Revenir a la bague qui tourne';
    grandVue.addEventListener('click',fermerVue);
    stageAchat.appendChild(grandVue);
    var x=document.createElement('button');
    x.type='button'; x.className='fermer-vue'; x.innerHTML='&times;';
    x.setAttribute('aria-label','Revenir a la bague qui tourne');
    x.addEventListener('click',function(ev){ ev.stopPropagation(); fermerVue(); });
    stageAchat.appendChild(x);
    [['fl-g','‹',-1],['fl-d','›',1]].forEach(function(o){
      var btn=document.createElement('button');
      btn.type='button'; btn.className='fl vue-fl '+o[0]; btn.innerHTML=o[1];
      btn.setAttribute('aria-label', o[2]<0?'Photo precedente':'Photo suivante');
      btn.addEventListener('click',function(ev){ ev.stopPropagation(); ouvrirVue(vueIndex+o[2]); });
      stageAchat.appendChild(btn);
    });
  }
  if(pelliPiste){
    pelliPiste.addEventListener('click',function(e){
      var b=e.target.closest('button[data-k]'); if(!b) return;
      ouvrirVue(+b.getAttribute('data-k'));
    });
  }

  var VARIANTES = {"50_Abricot": 63905921204601, "50_Acier brossé": 63905817330041, "50_Belipastel": 63905817428345, "50_Bleu Marine": 63905921139065, "50_Emeraude": 63905921171833, "50_Rouge (Swiss Edition)": 63905921106297, "50_Turquoise": 63905925497209, "52_Abricot": 63905921335673, "52_Acier brossé": 63905817461113, "52_Belipastel": 63905817559417, "52_Bleu Marine": 63905921270137, "52_Emeraude": 63905921302905, "52_Rouge (Swiss Edition)": 63905921237369, "52_Turquoise": 63905925529977, "54_Abricot": 63905921466745, "54_Acier brossé": 63905817592185, "54_Belipastel": 63905817690489, "54_Bleu Marine": 63905921401209, "54_Emeraude": 63905921433977, "54_Rouge (Swiss Edition)": 63905921368441, "54_Turquoise": 63905925562745, "56_Abricot": 63905921597817, "56_Acier brossé": 63905817723257, "56_Belipastel": 63905817821561, "56_Bleu Marine": 63905921532281, "56_Emeraude": 63905921565049, "56_Rouge (Swiss Edition)": 63905921499513, "56_Turquoise": 63905925595513, "58_Abricot": 63905921728889, "58_Acier brossé": 63905817854329, "58_Belipastel": 63905817952633, "58_Bleu Marine": 63905921663353, "58_Emeraude": 63905921696121, "58_Rouge (Swiss Edition)": 63905921630585, "58_Turquoise": 63905925628281, "60_Abricot": 63905921859961, "60_Acier brossé": 63905817985401, "60_Belipastel": 63905818083705, "60_Bleu Marine": 63905921794425, "60_Emeraude": 63905921827193, "60_Rouge (Swiss Edition)": 63905921761657, "60_Turquoise": 63905925661049, "62_Abricot": 63905921991033, "62_Acier brossé": 63905818116473, "62_Belipastel": 63905818214777, "62_Bleu Marine": 63905921925497, "62_Emeraude": 63905921958265, "62_Rouge (Swiss Edition)": 63905921892729, "62_Turquoise": 63905925693817, "64_Abricot": 63905922122105, "64_Acier brossé": 63905818247545, "64_Belipastel": 63905818345849, "64_Bleu Marine": 63905922056569, "64_Emeraude": 63905922089337, "64_Rouge (Swiss Edition)": 63905922023801, "64_Turquoise": 63905925726585, "66_Abricot": 63905922253177, "66_Acier brossé": 63905818378617, "66_Belipastel": 63905818476921, "66_Bleu Marine": 63905922187641, "66_Emeraude": 63905922220409, "66_Rouge (Swiss Edition)": 63905922154873, "66_Turquoise": 63905925759353, "68_Abricot": 63905922384249, "68_Acier brossé": 63905818509689, "68_Belipastel": 63905818607993, "68_Bleu Marine": 63905922318713, "68_Emeraude": 63905922351481, "68_Rouge (Swiss Edition)": 63905922285945, "68_Turquoise": 63905925792121, "70_Abricot": 63905922515321, "70_Acier brossé": 63905818640761, "70_Belipastel": 63905818739065, "70_Bleu Marine": 63905922449785, "70_Emeraude": 63905922482553, "70_Rouge (Swiss Edition)": 63905922417017, "70_Turquoise": 63905925824889, "72_Abricot": 63905922646393, "72_Acier brossé": 63905818771833, "72_Belipastel": 63905818870137, "72_Bleu Marine": 63905922580857, "72_Emeraude": 63905922613625, "72_Rouge (Swiss Edition)": 63905922548089, "72_Turquoise": 63905925857657};
  function lienAchat(){
    var col=COLORS[current], t=tailleChoisie;
    if(!t) return null;
    return VARIANTES[t+'_'+col.vnom] || null;
  }
  function majAchat(){
    var id=lienAchat();
    document.querySelectorAll('.btn-achat').forEach(function(a){
      if(id){ a.href='https://www.yourmood.net/cart/'+id+':1'; a.removeAttribute('aria-disabled'); }
      else   { a.href='#tailles'; a.setAttribute('aria-disabled','true'); }
    });
  }

  function choisir(i){
    current=i;
    posePelli(i);
    majAchat();
    var col=COLORS[i];
    root.style.setProperty('--c',col.c);
    root.style.setProperty('--c-soft',col.soft);
    if(nom) nom.textContent=col.nom;
    if(nom2) nom2.textContent=col.nom;
    for(var kb=0;kb<couchesBig.length;kb++) couchesBig[kb].classList.toggle('on',kb===i);
    for(var ka=0;ka<couchesAchat.length;ka++) couchesAchat[ka].classList.toggle('on',ka===i);
    enchainer(couchesAchat,i);
    enchainer(couchesBig,i);
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

  /* le mur de vidéos */
  var VIDS=["8ccc5d2feb60427f979a52826b86753d", "ce77b0ff357a4f86bdf0af4ca3714f6d", "365d3f179d73410486295791701a5bda", "2a074996716b48d5b0dc9ee8af292e41", "36518517700d4ed2af71c7ded61e9926", "7e5f470243ed4c68993e864428fb1093", "cd040d593f6c4f92ba9a50048094a5ad", "ed958f4f94f84fc38bf80ba505be60f6"];
  var reel=document.getElementById('reel');
  if(reel){
    VIDS.forEach(function(id){
      var f=document.createElement('figure');
      var v=document.createElement('video');
      v.src='https://cdn.shopify.com/videos/c/o/v/'+id+'.mov';
      v.muted=true; v.loop=true; v.playsInline=true; v.setAttribute('playsinline',''); v.preload='none';
      f.appendChild(v);
      var play=function(){ v.preload='auto'; var q=v.play(); if(q&&q.catch) q.catch(function(){}); };
      f.addEventListener('mouseenter',play);
      f.addEventListener('mouseleave',function(){ v.pause(); });
      f.addEventListener('click',function(){ v.paused?play():v.pause(); });
      reel.appendChild(f);
    });
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
<script>
(function(){
  var v = document.querySelectorAll('.h2scene .h2bg');
  if (v.length < 2) return;
  var i = 0;
  setInterval(function(){
    v[i].classList.remove('on');
    i = (i + 1) % v.length;
    v[i].classList.add('on');
  }, 3600);
})();
</script>
<script>
(function(){
  var A=[
    ["Martine A.","Je suis très heureuse de ma bague, c'est une incroyable découverte !"],
    ["Élodie D.","Les anneaux se clipsent parfaitement sur la bague, le rendu est très élégant et cela m'a donné envie de commander d'autres anneaux pour varier."],
    ["Alexia C.","J'ai des petits doigts, c'est moins large, ravie de l'avoir achetée."],
    ["Thomas D.","Service après-vente de très grande qualité, contact clientèle rapide et sympathique."],
    ["Anonyme","Je remercie mood pour sa gentillesse, ils me les ont échangées sans problème. Chaque envoi est bien emballé et prêt à être offert."],
    ["Samantha C.","Cliente depuis un certain temps, ça se passe toujours très bien et dans les temps."],
    ["Élodie D.","Concept tout simplement génial."],
    ["Joel D.","Suis content de ma première mood 😀"]
  ];
  var f=document.getElementById('avisFile');
  if(f){
    var html=A.map(function(a){
      return '<span class="avis-un"><em class="et">&#9733;&#9733;&#9733;&#9733;&#9733;</em> « '+a[1]+' » <b>'+a[0]+'</b></span>';
    }).join('');
    f.innerHTML = html + html;
  }
  var bande=document.querySelector('.bavis');
  if(bande){
    var TEINTES=['#76797c','#b978b1','#2fa3a2','#2a3c8c','#1f7a68'];
    var k=0;
    setInterval(function(){
      k=(k+1)%TEINTES.length;
      bande.style.background=TEINTES[k];
    },4200);
  }
  var v=document.querySelectorAll('#cpScene .cp-img');
  if(v.length>1){
    var i=0;
    setInterval(function(){
      var n=i, tours=0;
      do { n=(n+1)%v.length; tours++; } while(tours<v.length && !(v[n].complete && v[n].naturalWidth>0));
      if(!(v[n].complete && v[n].naturalWidth>0)) return;   /* jamais de trou : on garde la photo en place */
      v[i].classList.remove('on');
      i=n;
      v[i].classList.add('on');
    },2600);
  }
})();
</script>

<div class="gt-fond" id="guideTailles" hidden>
  <div class="gt" role="dialog" aria-modal="true" aria-label="Guide des tailles">
    <button type="button" class="gt-x" id="fermerGuide" aria-label="Fermer">&times;</button>
    <h3>Guide des tailles</h3>
    <p>Mesurez le diam&egrave;tre int&eacute;rieur d&rsquo;une bague qui vous va d&eacute;j&agrave; &mdash; c&rsquo;est la taille &agrave; choisir.</p>
    <table><thead><tr><th>Taille mood</th><th>&Oslash; int&eacute;rieur (mm)</th><th>EU</th><th>UK</th><th>US</th></tr></thead><tbody><tr><td>50</td><td>15,9</td><td>50</td><td>J½</td><td>5</td></tr><tr><td>52</td><td>16,6</td><td>52</td><td>L½</td><td>6</td></tr><tr><td>54</td><td>17,2</td><td>54</td><td>N</td><td>6¾</td></tr><tr><td>56</td><td>17,8</td><td>56</td><td>O½</td><td>7½</td></tr><tr><td>58</td><td>18,5</td><td>58</td><td>P½</td><td>8¼</td></tr><tr><td>60</td><td>19,1</td><td>60</td><td>R</td><td>9</td></tr><tr><td>62</td><td>19,7</td><td>62</td><td>S½</td><td>9¾</td></tr><tr><td>64</td><td>20,4</td><td>64</td><td>U</td><td>10½</td></tr><tr><td>66</td><td>21,0</td><td>66</td><td>V½</td><td>11¼</td></tr><tr><td>68</td><td>21,6</td><td>68</td><td>X</td><td>12</td></tr><tr><td>70</td><td>22,3</td><td>70</td><td>Y½</td><td>12¾</td></tr><tr><td>72</td><td>22,9</td><td>72</td><td>—</td><td>13½</td></tr></tbody></table>
    <p class="gt-pied">Toujours h&eacute;sitante ? Commande un <strong>baguier gratuit</strong> et prends ton temps.</p>
  </div>
</div>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0, must-revalidate' } });
}
