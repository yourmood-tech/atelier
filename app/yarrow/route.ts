export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Yarrow</title><meta name="robots" content="noindex,nofollow"></head><body>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Poppins:wght@200;300;400&display=swap">
<style>
:root{
  --encre:#ffffff; --creme:#1a1714; --or:#9d7742; --doux:rgba(26,23,20,.58);
  --ligne:rgba(26,23,20,.14);
  --titre:'Cormorant Garamond',Georgia,serif;
  --texte:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--encre);color:var(--creme);font-family:var(--texte);font-weight:300;
  line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;display:block}
.wrap{width:min(1180px,100%);margin:0 auto;padding:0 20px}

/* ouverture */
.hero{position:relative;height:34svh;min-height:250px;max-height:420px;display:grid;place-items:center;overflow:hidden}
.hero img,.hero video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  animation:resp 26s ease-in-out infinite alternate}
@keyframes resp{from{transform:scale(1.03)}to{transform:scale(1.13)}}
.hero::after{content:"";position:absolute;inset:0;
  background:linear-gradient(rgba(10,10,9,.52),rgba(10,10,9,.12) 38%,rgba(10,10,9,.88))}
.hero .txt{position:relative;z-index:2;text-align:center;padding:0 20px;color:#fff}
.sur{font-size:10px;letter-spacing:.48em;text-transform:uppercase;color:#e2c091;margin:0 0 12px}
h1{font-family:var(--titre);font-weight:300;font-size:clamp(40px,7vw,88px);line-height:.95;margin:0}
.hero .sous{margin:12px auto 0;max-width:28em;font-family:var(--titre);font-style:italic;
  font-size:clamp(14px,1.6vw,19px);color:rgba(255,255,255,.92);line-height:1.4}

/* manifeste, serré */
.manif{padding:clamp(34px,4vw,52px) 0 clamp(30px,4vw,46px);text-align:center}
.manif p{font-family:var(--titre);font-size:clamp(20px,2.7vw,29px);line-height:1.5;max-width:21em;margin:0 auto}
.manif p + p{margin-top:.75em}
.manif .pt{margin-top:1.1em;font-family:var(--texte);font-size:13px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--or)}

/* la mosaïque, bord à bord */
.mosaique{display:flex;flex-direction:column;gap:3px;
  margin-top:clamp(28px,4vw,52px)}
.p{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;align-items:center;
  background:none;border:0;padding:0;margin:0;color:inherit;font:inherit;text-align:left;
  cursor:pointer;width:100%}
@media(min-width:900px){
  .p{grid-template-columns:1fr 1fr 1.3fr 1.5fr}
}
.vis{position:relative;overflow:hidden;background:#f2efe9;aspect-ratio:1/1;min-width:0}
.vis.film{grid-column:auto;aspect-ratio:3/2}
.vis img{width:100%;height:100%;object-fit:cover;transition:transform 1.8s cubic-bezier(.2,.7,.2,1);display:block}
.vis .dessous{position:absolute;inset:0}
.vis .dessus{position:absolute;inset:0;transition:opacity .5s ease}
.vis:hover .dessus{opacity:0}
.vis:hover img{transform:scale(1.04)}
.vis video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}

.p .ombre{display:none}
.p .leg{padding:clamp(18px,2.5vw,34px) clamp(18px,2.4vw,34px);min-width:0;grid-column:1/-1}
@media(min-width:900px){.p .leg{grid-column:auto}}
.p .nom{display:block;font-family:var(--titre);font-size:clamp(26px,3.4vw,46px);line-height:1.05}
.p .mot{display:block;font-size:14px;color:var(--doux);margin-top:12px;line-height:1.7;max-width:26em}
.p .px{display:block;font-size:11px;letter-spacing:.26em;color:var(--or);margin-top:18px;
  text-transform:uppercase}

/* bande pleine largeur */
.bande{position:relative;height:clamp(340px,52vw,620px);overflow:hidden;margin-top:3px}
.bande img{width:100%;height:100%;object-fit:cover}
.bande .mot2{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;
  background:linear-gradient(rgba(10,10,9,.45),rgba(10,10,9,.62))}
.bande .mot2{color:#fff}
.bande .mot2 p{font-family:var(--titre);font-style:italic;font-size:clamp(24px,4vw,46px);
  max-width:16em;margin:0;line-height:1.35}

/* le détail, deux colonnes collées */
.detail{display:grid;grid-template-columns:1fr;margin-top:3px}
@media(min-width:900px){.detail{grid-template-columns:1.05fr .95fr}}
.detail .img{min-height:360px;position:relative;overflow:hidden}
.detail .img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.detail .bloc{background:#f6f3ee;padding:clamp(40px,5vw,72px) clamp(24px,4vw,60px);display:flex;flex-direction:column;justify-content:center}
.detail h2{font-family:var(--titre);font-weight:300;font-size:clamp(32px,4.4vw,50px);margin:0 0 6px}
.detail .sous2{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--or);margin:0 0 20px}
.detail p.intro{color:rgba(26,23,20,.74);font-size:14.5px;margin:0 0 22px;max-width:32em}
.fiche{list-style:none;margin:0;padding:0}
.fiche li{display:flex;gap:16px;padding:10px 0;border-top:1px solid rgba(26,23,20,.12);font-size:13.5px}
.fiche li:first-child{border-top:0}
.fiche b{flex:0 0 130px;font-weight:300;color:var(--or);font-size:9.5px;letter-spacing:.2em;
  text-transform:uppercase;padding-top:3px}
.fiche span{flex:1 1 auto;color:rgba(26,23,20,.82)}
.carats{font-family:var(--titre);font-size:clamp(50px,7vw,92px);line-height:1;color:var(--or);margin:26px 0 0}
.carats small{display:block;font-family:var(--texte);font-size:10px;letter-spacing:.3em;
  text-transform:uppercase;color:var(--doux);margin-top:8px}

/* fin */
.fin{position:relative;height:clamp(520px,70vw,760px);overflow:hidden;margin-top:3px}
.fin img{width:100%;height:100%;object-fit:cover}
.fin .dedans{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;color:#fff;
  background:linear-gradient(rgba(10,10,9,.40),rgba(10,10,9,.82))}
.fin h2{font-family:var(--titre);font-weight:300;font-size:clamp(34px,5.5vw,62px);margin:0}
.fin .px2{font-family:var(--titre);font-size:clamp(44px,8vw,84px);color:#e8c48d;margin:14px 0 2px;line-height:1}
.fin .inc{font-size:12px;color:rgba(255,255,255,.72);letter-spacing:.06em;margin:0}
.bouton{display:inline-block;margin-top:26px;text-decoration:none;background:#e8c48d;color:#2a200f;
  padding:17px 44px;letter-spacing:.2em;text-transform:uppercase;font-size:10.5px;
  transition:background .3s ease,transform .3s ease}
.bouton:hover{background:#d8b985;transform:translateY(-2px)}
.mentions{margin:24px auto 0;max-width:30em;font-size:11px;color:rgba(255,255,255,.55);line-height:1.65}

/* visionneuse */
.vue{position:fixed;inset:0;z-index:50;background:rgba(255,255,255,.985);display:none;flex-direction:column;padding:18px}
.vue.on{display:flex}
.vue .haut{display:flex;align-items:center;justify-content:space-between;gap:14px}
.vue .haut h3{font-family:var(--titre);font-weight:300;font-size:clamp(22px,3.2vw,32px);margin:0}
.vue .fermer{background:none;border:1px solid var(--ligne);color:var(--creme);width:42px;height:42px;
  border-radius:50%;cursor:pointer;font-size:16px}
.vue .fermer:hover{border-color:var(--or);color:var(--or)}
.vue .grand{flex:1 1 auto;min-height:0;display:grid;place-items:center;padding:12px 0}
.vue .grand img{max-width:100%;max-height:100%;object-fit:contain}
.vue .bande2{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
.vue .bande2::-webkit-scrollbar{display:none}
.vue .bande2 button{flex:0 0 auto;width:68px;height:68px;padding:0;border:1px solid transparent;
  background:none;cursor:pointer;opacity:.45;transition:opacity .3s,border-color .3s}
.vue .bande2 button.on,.vue .bande2 button:hover{opacity:1;border-color:var(--or)}
.vue .bande2 img{width:100%;height:100%;object-fit:cover}
.vue .pied{text-align:center;padding-top:12px}
.vue .pied a{display:inline-block;background:var(--or);color:#16120b;text-decoration:none;
  padding:14px 34px;letter-spacing:.2em;text-transform:uppercase;font-size:10.5px}
</style>

<section class="hero">
  <video id="herovid" autoplay muted loop playsinline preload="auto" poster=""></video>
  <div class="txt">
    <p class="sur">mood joaillerie</p>
    <h1>Yarrow</h1>
    <p class="sous">Une pluie de pierres, posée une à une, à la main.</p>
  </div>
</section>

<div class="wrap">
  <section class="manif">
    <p>Des pierres de tailles et de couleurs différentes, serties une par une sur trois grains d'argent. Sans alignement, sans symétrie — comme des fleurs tombées sur la neige.</p>
    <p class="pt">Douze variations · argent 925 · atelier d'Orbe</p>
  </section>
</div>

<div class="mosaique" id="mosaique"></div>

<section class="bande">
  <img id="bandeimg" alt="">
  <div class="mot2"><p>Aucune Yarrow ne ressemble tout à fait à une autre.</p></div>
</section>

<section class="detail">
  <div class="img"><img id="detimg" alt=""></div>
  <div class="bloc">
    <h2>Le détail</h2>
    <p class="sous2">Yarrow, la première</p>
    <p class="intro">Cent-quatre pierres sur un seul anneau. Rubis, diamants, améthystes, saphirs oranges, mauves et bruns, topazes. Chacune choisie pour sa taille et sa teinte, chacune posée à la main.</p>
    <ul class="fiche">
      <li><b>Matière</b><span>Argent 925</span></li>
      <li><b>Format</b><span>Deux tiers, pour bague mood</span></li>
      <li><b>Sertissage</b><span>Trois grains</span></li>
      <li><b>Pureté</b><span>G-H, VS-SI pour les diamants</span></li>
      <li><b>Fabrication</b><span>Suisse, atelier d'Orbe</span></li>
      <li><b>Garantie</b><span>2 ans</span></li>
    </ul>
    <p class="carats">1,177<small>carat au total</small></p>
  </div>
</section>

<section class="fin">
  <img id="finimg" alt="">
  <div class="dedans"><div>
    <h2>Porter une Yarrow</h2>
        <p class="inc">Toutes les tailles, de 50 à 72 · Atelier d’Orbe</p>
    <a class="bouton" id="lienfin" href="#">Voir les Yarrow</a>
    <p class="mentions">📷 Photos non contractuelles — les pierres étant naturelles, les nuances varient d'une pièce à l'autre.</p>
  </div></div>
</section>

<div class="vue" id="vue">
  <div class="haut"><h3 id="vtitre"></h3><button class="fermer" id="vfermer" aria-label="Fermer">✕</button></div>
  <div class="grand"><img id="vgrand" alt=""></div>
  <div class="bande2" id="vbande"></div>
  <div class="pied"><a id="vlien" href="#">Voir la fiche</a></div>
</div>

<script>
(function(){
  var P=[{"h": "https://moodjoaillerie.net/products/bagues-mood-joaillerie-pour-femme", "t": "Yarrow Black and White", "h1": "/yarrow/bw-b2.jpg", "h2": "/yarrow/bw-a2.jpg", "v": "/yarrow/tuile-blackwhite.mp4", "p": "2350.00", "m": "Nuit et neige. Le noir et le blanc, sans transition.", "i": "/yarrow/bw-b.jpg", "g": ["/yarrow/bw-b.jpg", "/yarrow/bw-a.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9685_modif_carre-web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1245_modif_carre_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9682_modif__carre_Web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1238_modif_carre-web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9665_modif_carre_Web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1235._modif_carre-web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1244_modif_carre_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1240_modif_carre_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9641_modif_carre_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9672_modif_carre_web_354bc01c-8be2-49da-ab47-9a805595fdad.jpg"]}, {"h": "https://moodjoaillerie.net/products/nereide-piece-dexception-mood-joaillerie", "t": "Yarrow Néréide", "p": "2466.00", "m": "Née de l’écume. Blancs, roses et champagne.", "h1": "/yarrow/nereide-b2.jpg", "h2": "/yarrow/nereide-a2.jpg", "v": "/yarrow/tuile-nereide.mp4", "i": "/yarrow/nereide-b.jpg", "g": ["/yarrow/nereide-b.jpg", "https://cdn.shopify.com/s/files/1/0772/9813/files/premium-studio-1780041812387.png", "https://cdn.shopify.com/s/files/1/0772/9813/files/premium-studio-1780042170531.png", "/yarrow/nereide-a2.jpg", "/yarrow/nereide-b2.jpg"]}, {"h": "https://moodjoaillerie.net/products/bague-femme-luxe-diamants-swiss-made", "t": "Yarrow White", "h1": "/yarrow/white-b2.jpg", "h2": "/yarrow/white-a2.jpg", "v": "/yarrow/tuile-white.mp4", "p": "2350.00", "m": "La plus silencieuse. Rien que du blanc.", "i": "/yarrow/white-b.jpg", "g": ["/yarrow/white-b.jpg", "/yarrow/white-a.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/yarrowwhite2_914e030f-df35-4f1f-84ef-82bbf532e181.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/yarrowwhite.jpg"]}, {"h": "https://moodjoaillerie.net/products/bague-femme-luxe-mood-joaillerie-pierres-precieuses", "t": "Yarrow Vert", "h1": "/yarrow/vert-b2.jpg", "h2": "/yarrow/vert-a2.jpg", "v": "/yarrow/tuile-vert.mp4", "p": "", "m": "Une clairière après la pluie.", "i": "/yarrow/vert-2.jpg", "g": ["/yarrow/vert-2.jpg", "/yarrow/vert.jpg"]}, {"h": "https://moodjoaillerie.net/products/anneau-en-argent-glitter-deux-tiers-yarrow-athena-avec-saphirs-bleus-pour-bague-mood-de-luxe", "t": "Yarrow Athéna", "p": "1725.00", "m": "Un ciel de nuit sur une neige éternelle.", "h1": "/yarrow/athena-b2.jpg", "h2": "/yarrow/athena-a2.jpg", "v": "/yarrow/tuile-athena.mp4", "i": "/yarrow/athena-2.jpg", "g": ["/yarrow/athena-2.jpg", "/yarrow/athena.jpg", "/yarrow/athena-a2.jpg", "/yarrow/athena-b2.jpg"]}, {"h": "https://moodjoaillerie.net/products/bagues-moodjoaillerie-luxe-pour-femme", "t": "Yarrow Glacé", "h1": "/yarrow/glace-b2.jpg", "h2": "/yarrow/glace-a2.jpg", "v": "/yarrow/tuile-glace.mp4", "p": "2350.00", "m": "Le bleu sous la glace.", "i": "/yarrow/glace-b.jpg", "g": ["/yarrow/glace-b.jpg", "/yarrow/glace-a.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/glace.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/glace4.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrowglace.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/glace3.web.jpg"]}, {"h": "https://moodjoaillerie.net/products/bague-femme-luxe-prestigieuse-suissemade", "t": "Yarrow Purple", "h1": "/yarrow/purple-b2.jpg", "h2": "/yarrow/purple-a2.jpg", "v": "/yarrow/tuile-purple.mp4", "p": "2350.00", "m": "Du mauve le plus pâle au violet le plus profond.", "i": "/yarrow/purple-b.jpg", "g": ["/yarrow/purple-b.jpg", "/yarrow/purple-a.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1930_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1904_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1923_modi_webf.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1927_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1910_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1919_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_2146_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/MG_2177_modif_web_1.jpg"]}, {"h": "https://moodjoaillerie.net/products/yarrow", "t": "Yarrow", "h1": "/yarrow/yarrow-a2.jpg", "h2": "/yarrow/yarrow-b2.jpg", "v": "/yarrow/tuile-arcenciel.mp4", "p": "2350.00", "m": "La première. Tout le printemps dans un anneau.", "i": "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow52.web.jpg", "g": ["/yarrow/yarrow-a.jpg", "/yarrow/yarrow-b.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow52.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow2.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow6.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow7.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow5.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow4.web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow3-web.jpg"]}, {"h": "", "t": "Yarrow Rose Gold", "h1": "/yarrow/rosegold-b2.jpg", "h2": "/yarrow/rosegold-a2.jpg", "v": "/yarrow/tuile-rosegold.mp4", "p": "", "m": "Or rose brossé, et la lumière qui s’y pose.", "i": "/yarrow/rosegold-2.jpg", "g": ["/yarrow/rosegold-2.jpg", "/yarrow/rosegold.jpg"]}, {"h": "https://moodjoaillerie.net/products/moodjoaillerie-bague-femme-luxe-bijouterie", "t": "Yarrow love", "h1": "/yarrow/love-b2.jpg", "h2": "/yarrow/love-a2.jpg", "v": "/yarrow/tuile-love.mp4", "p": "2350.00", "m": "Les roses, les fuchsias, les rouges, sur un argent froissé.", "i": "/yarrow/love-b.jpg", "g": ["/yarrow/love-b.jpg", "/yarrow/love-a.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6100_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6130_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6080_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6095_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6135_modif_web.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6111_modif_web.jpg"]}, {"h": "https://moodjoaillerie.net/products/bague-femme-mood-joaillerie-luxe-exception", "t": "Yarrow Arc-en-ciel", "h1": "/yarrow/arcenciel-a2.jpg", "h2": "/yarrow/arcenciel-b2.jpg", "v": "/yarrow/tuile-orangerose.mp4", "p": "", "m": "De l’ambre au fuchsia, toutes les couleurs qui descendent.", "i": "/yarrow/arcenciel.jpg", "g": ["/yarrow/arcenciel.jpg", "/yarrow/arcenciel-2.jpg"]}, {"h": "https://moodjoaillerie.net/products/yarrow-sucre-dorge", "t": "Yarrow Sucre d'orge", "h1": "/yarrow/sucre-a2.jpg", "h2": "/yarrow/sucre-b2.jpg", "v": "/yarrow/tuile-sucredorge.mp4", "p": "2350.00", "m": "Rouge et blanc, comme un bâton de sucre d’orge.", "i": "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4347-modif.jpg", "g": ["/yarrow/sucre-a.jpg", "/yarrow/sucre-b.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4332-modif.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4343-modif.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4353-modif.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4349-modif.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4325-modif.jpg", "https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4347-modif.jpg"]}];
  var B='https://www.yourmood.net/products/';
  function u(x,w){ if(x.charAt(0)==='/') return x; return x+(x.indexOf('?')>-1?'&':'?')+'width='+w; }
  (function(){var v=document.getElementById('herovid');v.poster=u(P[0].i,1600);v.src='/yarrow/hero.mp4';v.play().catch(function(){});})();
  document.getElementById('bandeimg').src=u(P[4].g[2]||P[4].i,1800);
  document.getElementById('detimg').src=u(P[0].g[3]||P[0].i,1400);
  document.getElementById('finimg').src=u(P[7].g[1]||P[7].i,1800);
  document.getElementById('lienfin').href='https://moodjoaillerie.net/collections/all?q=yarrow';

  var m=document.getElementById('mosaique');
  P.forEach(function(p,k){
    var b=document.createElement('button');
    b.className='p p'+k+(p.i.charAt(0)==='/'?' clair':''); b.dataset.k=k;
    var vis=[];
    var photos=(p.g&&p.g.length?p.g:[p.i]);
    for(var q=0;q<photos.length && vis.length<2;q++){
      var survol = (q===0?p.h1:(q===1?p.h2:null));
      if(survol){
        vis.push('<span class="vis"><img class="dessous" loading="lazy" src="'+u(survol,900)+'" alt="'+p.t+'">'+
                 '<img class="dessus" loading="lazy" src="'+u(photos[q],900)+'" alt="'+p.t+'"></span>');
      } else {
        vis.push('<span class="vis"><img loading="lazy" src="'+u(photos[q],900)+'" alt="'+p.t+'"></span>');
      }
    }
    while(vis.length<2) vis.push('<span class="vis"></span>');
    var film=p.v?'<span class="vis film"><video src="'+p.v+'" autoplay muted loop playsinline preload="metadata"></video></span>':'<span class="vis"></span>';
    b.innerHTML=vis.join('')+'<span class="leg">'+
      '<span class="nom">'+p.t+'</span>'+
      '<span class="mot">'+p.m+'</span>'+
      '</span>'+film;
    m.appendChild(b);
  });

  var vue=document.getElementById('vue'),vt=document.getElementById('vtitre'),
      vg=document.getElementById('vgrand'),vb=document.getElementById('vbande'),
      vl=document.getElementById('vlien');
  function montre(p,i){ vg.src=u(p.g[i],1600);
    Array.prototype.forEach.call(vb.children,function(c,j){c.classList.toggle('on',j===i);}); }
  function ouvre(k){ var p=P[k];
    vt.textContent=p.t; if(p.h){vl.style.display='';vl.href=(p.h.indexOf('http')===0?p.h:B+p.h);vl.textContent='Voir la pièce';}else{vl.style.display='none';}
    vb.innerHTML='';
    p.g.forEach(function(x,i){ var t=document.createElement('button');
      t.innerHTML='<img src="'+u(x,200)+'" alt="">'; t.onclick=function(){montre(p,i);}; vb.appendChild(t); });
    montre(p,0); vue.classList.add('on'); document.body.style.overflow='hidden'; }
  m.addEventListener('click',function(e){
    var b=e.target.closest('.p'); if(!b) return;
    var p=P[+b.dataset.k];
    if(p && p.h){ window.open(p.h.indexOf('http')===0?p.h:B+p.h,'_blank','noopener'); }
    else { ouvre(+b.dataset.k); }
  });
  function ferme(){ vue.classList.remove('on'); document.body.style.overflow=''; }
  document.getElementById('vfermer').onclick=ferme;
  vue.addEventListener('click',function(e){ if(e.target===vue) ferme(); });
  addEventListener('keydown',function(e){ if(e.key==='Escape') ferme(); });
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
