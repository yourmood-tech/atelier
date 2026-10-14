export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Yarrow</title><meta name="robots" content="noindex,nofollow"></head><body>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Poppins:wght@200;300;400&display=swap">
<style>
:root{
  --encre:#0d0c0b; --encre2:#151311; --creme:#f4f1ec; --or:#c3a271; --doux:rgba(244,241,236,.58);
  --ligne:rgba(195,162,113,.26);
  --titre:'Cormorant Garamond',Georgia,'Times New Roman',serif;
  --texte:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--encre);color:var(--creme);font-family:var(--texte);font-weight:300;
  line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;display:block}
.wrap{width:min(1240px,100%);margin:0 auto;padding:0 22px}

/* ——— ouverture ——— */
.hero{position:relative;min-height:88vh;display:grid;place-items:center;overflow:hidden}
.hero .ph{position:absolute;inset:0}
.hero .ph img{width:100%;height:100%;object-fit:cover;transform:scale(1.06);
  animation:resp 24s ease-in-out infinite alternate}
@keyframes resp{from{transform:scale(1.04)}to{transform:scale(1.14)}}
.hero::after{content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 42%,rgba(13,12,11,.18),rgba(13,12,11,.86) 72%),
             linear-gradient(rgba(13,12,11,.55),rgba(13,12,11,0) 32%,rgba(13,12,11,.92))}
.hero .txt{position:relative;z-index:2;text-align:center;padding:0 22px}
.sur{font-size:10.5px;letter-spacing:.46em;text-transform:uppercase;color:var(--or);margin:0 0 26px}
h1{font-family:var(--titre);font-weight:300;font-size:clamp(66px,16vw,190px);line-height:.92;
  margin:0;letter-spacing:.01em}
.hero .sous{margin:28px auto 0;max-width:30em;font-family:var(--titre);font-style:italic;
  font-size:clamp(19px,2.6vw,27px);color:rgba(244,241,236,.86);line-height:1.5}
.fleche{position:absolute;bottom:38px;left:50%;transform:translateX(-50%);z-index:2;
  font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--doux);animation:bas 2.6s ease-in-out infinite}
@keyframes bas{0%,100%{transform:translate(-50%,0);opacity:.55}50%{transform:translate(-50%,8px);opacity:1}}

/* ——— propos ——— */
.propos{padding:clamp(72px,11vw,150px) 0;text-align:center}
.propos p{font-family:var(--titre);font-size:clamp(21px,3vw,33px);line-height:1.62;
  max-width:19em;margin:0 auto;font-weight:300}
.propos p + p{margin-top:1.1em}
.filet{width:54px;height:1px;background:var(--or);margin:clamp(40px,6vw,66px) auto 0}

/* ——— la galerie ——— */
.titre2{text-align:center;padding-bottom:clamp(26px,4vw,46px)}
.titre2 h2{font-family:var(--titre);font-weight:300;font-size:clamp(34px,6vw,62px);margin:0}
.titre2 .n{margin:14px 0 0;font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:var(--or)}
.grille{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:clamp(14px,2vw,26px);
  padding-bottom:clamp(60px,9vw,120px)}
.piece{display:block;width:100%;position:relative;cursor:pointer;background:none;border:0;padding:0;text-align:left;color:inherit;font:inherit}
.piece .cadre{display:block;position:relative;aspect-ratio:1/1;overflow:hidden;background:#17150f}
.piece img{width:100%;height:100%;object-fit:cover;transition:transform 1.4s cubic-bezier(.2,.7,.2,1),filter .6s ease}
.piece:hover img{transform:scale(1.07)}
.piece .cadre::after{content:"";position:absolute;inset:0;border:1px solid rgba(244,241,236,.10);
  transition:border-color .5s ease}
.piece:hover .cadre::after{border-color:var(--or)}
.piece .nom{display:block;margin:16px 0 0;font-family:var(--titre);font-size:clamp(21px,2.4vw,27px);font-weight:400}
.piece .mot{display:block;margin:4px 0 0;font-size:13px;color:var(--doux);line-height:1.6;max-width:26em}
.piece .px{display:block;margin:10px 0 0;font-size:12px;letter-spacing:.2em;color:var(--or)}

/* ——— le détail ——— */
.detail{background:var(--encre2);padding:clamp(70px,10vw,140px) 0;border-top:1px solid var(--ligne);border-bottom:1px solid var(--ligne)}
.detail .wrap{display:grid;grid-template-columns:1fr;gap:clamp(34px,5vw,70px);align-items:center}
@media(min-width:900px){.detail .wrap{grid-template-columns:1fr 1fr}}
.detail h2{font-family:var(--titre);font-weight:300;font-size:clamp(34px,5vw,56px);margin:0 0 10px}
.detail .sous2{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--or);margin:0 0 26px}
.detail p{color:rgba(244,241,236,.80);max-width:34em;font-size:15px}
.fiche{list-style:none;margin:30px 0 0;padding:0}
.fiche li{display:flex;gap:18px;padding:13px 0;border-top:1px solid rgba(244,241,236,.09);font-size:14px}
.fiche li:first-child{border-top:0}
.fiche b{flex:0 0 150px;font-weight:300;color:var(--or);font-size:10.5px;letter-spacing:.2em;
  text-transform:uppercase;padding-top:3px}
.fiche span{flex:1 1 auto;color:rgba(244,241,236,.88)}
.carats{font-family:var(--titre);font-size:clamp(60px,10vw,120px);line-height:1;color:var(--or);margin:0}
.carats small{display:block;font-family:var(--texte);font-size:11px;letter-spacing:.3em;
  text-transform:uppercase;color:var(--doux);margin-top:12px}
.visuel-detail{position:relative;aspect-ratio:4/5;overflow:hidden}
.visuel-detail img{width:100%;height:100%;object-fit:cover}

/* ——— acheter ——— */
.fin{padding:clamp(76px,11vw,150px) 0;text-align:center}
.fin h2{font-family:var(--titre);font-weight:300;font-size:clamp(34px,6vw,62px);margin:0 0 10px}
.fin .px2{font-family:var(--titre);font-size:clamp(40px,7vw,74px);color:var(--or);margin:24px 0 6px}
.fin .inc{font-size:12.5px;color:var(--doux);letter-spacing:.06em}
.bouton{display:inline-block;margin-top:34px;text-decoration:none;background:var(--or);color:#17130c;
  padding:19px 48px;letter-spacing:.2em;text-transform:uppercase;font-size:11px;font-weight:400;
  transition:background .3s ease,transform .3s ease}
.bouton:hover{background:#d8b985;transform:translateY(-2px)}
.mentions{margin:40px auto 0;max-width:30em;font-size:11.5px;color:rgba(244,241,236,.4);line-height:1.7}

/* ——— la visionneuse ——— */
.vue{position:fixed;inset:0;z-index:50;background:rgba(9,8,7,.97);display:none;
  flex-direction:column;padding:22px}
.vue.on{display:flex}
.vue .haut{display:flex;align-items:center;justify-content:space-between;gap:16px;flex:0 0 auto}
.vue .haut h3{font-family:var(--titre);font-weight:300;font-size:clamp(23px,3.4vw,34px);margin:0}
.vue .fermer{background:none;border:1px solid var(--ligne);color:var(--creme);width:44px;height:44px;
  border-radius:50%;cursor:pointer;font-size:17px;line-height:1}
.vue .fermer:hover{border-color:var(--or);color:var(--or)}
.vue .grand{flex:1 1 auto;min-height:0;display:grid;place-items:center;padding:16px 0}
.vue .grand img{max-width:100%;max-height:100%;object-fit:contain}
.vue .bande{flex:0 0 auto;display:flex;gap:9px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
.vue .bande::-webkit-scrollbar{display:none}
.vue .bande button{flex:0 0 auto;width:74px;height:74px;padding:0;border:1px solid transparent;
  background:none;cursor:pointer;opacity:.5;transition:opacity .3s ease,border-color .3s ease}
.vue .bande button.on,.vue .bande button:hover{opacity:1;border-color:var(--or)}
.vue .bande img{width:100%;height:100%;object-fit:cover}
.vue .pied{flex:0 0 auto;text-align:center;padding-top:14px}
.vue .pied a{display:inline-block;background:var(--or);color:#17130c;text-decoration:none;
  padding:15px 38px;letter-spacing:.2em;text-transform:uppercase;font-size:11px}
</style>

<section class="hero">
  <div class="ph"><img id="heroimg" alt=""></div>
  <div class="txt">
    <p class="sur">mood joaillerie</p>
    <h1>Yarrow</h1>
    <p class="sous">Huit variations d'une même histoire : une pluie de pierres, posée une à une, à la main.</p>
  </div>
  <div class="fleche">découvrir</div>
</section>

<div class="wrap">
  <section class="propos">
    <p>On appelle ça un semis.</p>
    <p>Des pierres de tailles différentes, de couleurs différentes, serties une par une sur trois grains d'argent — sans alignement, sans symétrie. Comme des fleurs tombées sur la neige.</p>
    <p>Chaque Yarrow demande des heures d'atelier. Aucune n'est tout à fait identique à une autre.</p>
    <div class="filet"></div>
  </section>

  <section>
    <div class="titre2">
      <h2>Les huit Yarrow</h2>
      <p class="n">cliquez pour voir de près</p>
    </div>
    <div class="grille" id="grille"></div>
  </section>
</div>

<section class="detail">
  <div class="wrap">
    <div>
      <h2>Le détail</h2>
      <p class="sous2">Yarrow, la première</p>
      <p>Cent-quatre pierres sur un seul anneau. Rubis, diamants, améthystes, saphirs oranges, mauves et bruns, topazes. Chacune choisie pour sa taille et sa teinte, chacune posée à la main.</p>
      <ul class="fiche">
        <li><b>Matière</b><span>Argent 925</span></li>
        <li><b>Format</b><span>Deux tiers, pour bague mood interchangeable</span></li>
        <li><b>Sertissage</b><span>Trois grains</span></li>
        <li><b>Pierres</b><span>Rubis, diamants, améthystes, saphirs oranges, mauves et bruns, topazes</span></li>
        <li><b>Pureté</b><span>G-H, VS-SI pour les diamants</span></li>
        <li><b>Fabrication</b><span>Suisse, dans notre atelier d'Orbe</span></li>
        <li><b>Provenance</b><span>Fournisseur suisse reconnu, suivi strict des pierres</span></li>
        <li><b>Garantie</b><span>2 ans</span></li>
      </ul>
      <p class="carats" style="margin-top:38px">1,177<small>carat au total</small></p>
    </div>
    <div class="visuel-detail"><img id="detimg" alt=""></div>
  </div>
</section>

<div class="wrap">
  <section class="fin">
    <h2>Porter une Yarrow</h2>
    <p class="inc">Toutes les tailles, de 50 à 72. L'anneau se clipse sur votre base mood.</p>
    <p class="px2">2 350.–</p>
    <p class="inc">la pièce</p>
    <a class="bouton" id="lienfin" href="#">Voir les Yarrow</a>
    <p class="mentions">📷 Photos non contractuelles — les pierres étant naturelles, les nuances varient légèrement d'une pièce à l'autre. C'est ce qui fait qu'aucune Yarrow ne ressemble tout à fait à une autre.</p>
  </section>
</div>

<div class="vue" id="vue">
  <div class="haut"><h3 id="vtitre"></h3><button class="fermer" id="vfermer" aria-label="Fermer">✕</button></div>
  <div class="grand"><img id="vgrand" alt=""></div>
  <div class="bande" id="vbande"></div>
  <div class="pied"><a id="vlien" href="#">Voir la fiche</a></div>
</div>

<script>
(function(){
  var P=[{"h":"yarrow","t":"Yarrow","p":"2350.00","m":"La première. Rubis, saphirs oranges, améthystes — tout l'automne dans un anneau.","i":"https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow52.web.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow52.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow2.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow6.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow7.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow5.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow4.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrow3-web.jpg"]},{"h":"yarrow-glace","t":"Yarrow Glacé","p":"2350.00","m":"Le bleu sous la glace. Saphirs, topazes et diamants.","i":"https://cdn.shopify.com/s/files/1/0798/2303/products/glace4.web.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/products/glace.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/glace4.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/yarrowglace.web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/glace3.web.jpg"]},{"h":"yarrow-vertical","t":"Yarrow Vertical","p":"2350.00","m":"Les pierres prennent la hauteur.","i":"https://cdn.shopify.com/s/files/1/0798/2303/products/MG_3999_modif_web.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/products/MG_3971_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_4012_modif_web_44094c56-24e0-4325-8fc4-abea9153ebbf.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_4016_modif_web_47c5e52e-76f7-47ff-87d7-ed36d75c466b.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_3982_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_3984_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_3999_modif_web.jpg"]},{"h":"yarrow-purple","t":"Yarrow Purple","p":"2350.00","m":"Du mauve le plus pâle au violet profond.","i":"https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1904_modif_web.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1930_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1904_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1923_modi_webf.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1927_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1910_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1919_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_2146_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_2177_modif_web_1.jpg"]},{"h":"yarrow-black-and-white","t":"Yarrow Black and White","p":"2350.00","m":"Diamants noirs et diamants blancs, sans transition.","i":"https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1238_modif_carre-web.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9685_modif_carre-web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1245_modif_carre_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9682_modif__carre_Web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1238_modif_carre-web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9665_modif_carre_Web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1235._modif_carre-web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1244_modif_carre_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_1240_modif_carre_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9641_modif_carre_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/products/MG_9672_modif_carre_web_354bc01c-8be2-49da-ab47-9a805595fdad.jpg"]},{"h":"yarrow-white","t":"Yarrow White","p":"2350.00","m":"Rien que du blanc. La plus silencieuse.","i":"https://cdn.shopify.com/s/files/1/0798/2303/files/yarrowwhite2_914e030f-df35-4f1f-84ef-82bbf532e181.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/files/yarrowwhite2_914e030f-df35-4f1f-84ef-82bbf532e181.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/yarrowwhite.jpg"]},{"h":"yarrow-love","t":"Yarrow love","p":"2350.00","m":"Les roses, les fuchsias, les rouges.","i":"https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6111_modif_web.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6100_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6130_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6080_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6095_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6135_modif_web.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_6111_modif_web.jpg"]},{"h":"yarrow-sucre-dorge","t":"Yarrow Sucre d'orge","p":"2350.00","m":"Rubis et diamants, comme un bâton de sucre d'orge.","i":"https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4347-modif.jpg","g":["https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4332-modif.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4343-modif.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4353-modif.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4349-modif.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4325-modif.jpg","https://cdn.shopify.com/s/files/1/0798/2303/files/MG_4347-modif.jpg"]}];
  var B='https://www.yourmood.net/products/';
  function url(u,w){ return u + (u.indexOf('?')>-1?'&':'?') + 'width=' + w; }

  document.getElementById('heroimg').src=url(P[0].i,2000);
  document.getElementById('detimg').src=url(P[0].g[3]||P[0].i,1200);
  document.getElementById('lienfin').href=B+P[0].h;

  var g=document.getElementById('grille');
  P.forEach(function(p,k){
    var b=document.createElement('button');
    b.className='piece'; b.dataset.k=k;
    b.innerHTML='<span class="cadre"><img loading="lazy" src="'+url(p.i,900)+'" alt="'+p.t+'"></span>'+
      '<span class="nom">'+p.t+'</span>'+
      '<span class="mot">'+p.m+'</span>'+
      '<span class="px">'+p.p.replace('.00','')+'.–</span>';
    g.appendChild(b);
  });

  var vue=document.getElementById('vue'), vt=document.getElementById('vtitre'),
      vg=document.getElementById('vgrand'), vb=document.getElementById('vbande'),
      vl=document.getElementById('vlien');
  function ouvre(k){
    var p=P[k];
    vt.textContent=p.t; vl.href=B+p.h; vl.textContent='Voir la fiche · '+p.p.replace('.00','')+'.–';
    vb.innerHTML='';
    p.g.forEach(function(u,i){
      var t=document.createElement('button');
      t.innerHTML='<img src="'+url(u,200)+'" alt="">';
      t.onclick=function(){ montre(p,i); };
      vb.appendChild(t);
    });
    montre(p,0);
    vue.classList.add('on'); document.body.style.overflow='hidden';
  }
  function montre(p,i){
    vg.src=url(p.g[i],1600);
    Array.prototype.forEach.call(vb.children,function(c,j){ c.classList.toggle('on', j===i); });
  }
  g.addEventListener('click',function(e){
    var b=e.target.closest('.piece'); if(!b) return; ouvre(+b.dataset.k);
  });
  document.getElementById('vfermer').onclick=function(){ vue.classList.remove('on'); document.body.style.overflow=''; };
  vue.addEventListener('click',function(e){ if(e.target===vue){ vue.classList.remove('on'); document.body.style.overflow=''; }});
  addEventListener('keydown',function(e){ if(e.key==='Escape'){ vue.classList.remove('on'); document.body.style.overflow=''; }});
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
