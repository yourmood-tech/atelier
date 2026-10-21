export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Le calendrier mood</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root{--bleu:#2E5375;--or:#B8912F;--orclair:#E6CB92;--doux:#6A7A86;--papier:#F7F5F0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{min-height:100vh;color:#2B4D6B;font-family:Poppins,system-ui,sans-serif;font-weight:300;
  background:linear-gradient(180deg,#DCE8F1 0%,#EFF4F8 46%,#F7F5F0 100%)}
.wrap{width:min(1320px,100%);margin:0 auto;padding:0 18px}
header{text-align:center;padding:26px 18px 4px}
.kick2{margin:7px 0 0;font-family:Playfair Display,serif;font-size:clamp(14px,1.7vw,19px);color:#A8863A}
.logo-i{height:.78em;width:auto;vertical-align:baseline;margin:0 .1em}
.sep{color:#C6D3DE;margin:0 .1em}
h1{font-family:Playfair Display,serif;font-weight:400;font-size:clamp(20px,2.6vw,31px);margin:0;line-height:1.3;color:#2B4D6B}
h1 em{font-style:italic;color:#A8863A}
.sous{max-width:min(96%,108ch);margin:9px auto 0;font-size:12px;line-height:1.7;color:#52728C}
.magie{position:fixed;inset:0;z-index:101;pointer-events:none;overflow:hidden}
.pa{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFF6DC 0%,#F0D38A 45%,#C9A33F 100%);
  box-shadow:0 0 7px rgba(235,200,120,.95),0 0 16px rgba(220,180,90,.55);
  opacity:0;animation:etincelle var(--d) cubic-bezier(.25,.6,.35,1) var(--r) forwards}
@keyframes etincelle{
  0%{opacity:0;transform:translate3d(0,0,0) scale(.3)}
  12%{opacity:1;transform:translate3d(0,-6vh,0) scale(1)}
  70%{opacity:.95}
  100%{opacity:0;transform:translate3d(var(--dx),var(--dy),0) scale(.35)}
}
.intro{position:fixed;inset:0;z-index:100;will-change:transform;box-shadow:0 26px 60px rgba(8,22,38,.55);
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:6vh 24px 8vh;
  background:#17345A url(/calendrier/accueil.gif) center/cover no-repeat;
  opacity:0;transition:opacity .8s ease}
.intro.pret{opacity:1}
.intro.tourne{transform:translateY(-101%);transition:transform 1.35s cubic-bezier(.72,.02,.3,1)}
.intro.parti{pointer-events:none}
.maison{position:relative;margin:0 auto;width:min(100%,calc((100vh - 290px) * 1441 / 1092));aspect-ratio:1441/1092}
.maison img{width:100%;height:100%;display:block;object-fit:fill}

.duo{display:grid;grid-template-columns:1.38fr .62fr;gap:28px;align-items:start;margin-top:22px}
@media(max-width:900px){.duo{grid-template-columns:1fr;gap:26px}}
@media(min-width:901px){.liste{overflow:hidden}}
.liste{background:#fff;border:1px solid rgba(46,83,117,.10);border-radius:14px;padding:16px 18px;box-shadow:0 14px 40px rgba(46,83,117,.08);columns:2;column-gap:20px}
@media(max-width:900px){.liste{columns:2}}@media(max-width:560px){.liste{columns:1}}
.lg{column-span:all;display:flex;gap:14px;flex-wrap:wrap;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#8DA3B5;
  padding-bottom:9px;border-bottom:1px solid rgba(46,83,117,.10);margin-bottom:4px}
.lg span{display:flex;align-items:center;gap:7px}
i.p{width:9px;height:9px;border-radius:50%;display:inline-block}
i.or,.n.or{background:linear-gradient(145deg,#E6CB92,#B8912F)}
i.glace,.n.glace{background:linear-gradient(145deg,#DCE9F3,#A9C4D8)}
.grp{margin-top:7px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid}
.grp h3{font-family:Playfair Display,serif;font-weight:400;font-size:14px;color:#2B4D6B;margin:0 0 4px}
.grp ul{list-style:none;margin:0;padding:0}
.grp li{display:flex;align-items:center;gap:8px;padding:2.5px 0;font-size:12.5px;line-height:1.3;color:#43637E}
.n{flex:none;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:Playfair Display,serif;font-size:9.5px;color:#2B4D6B;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
.n.or{color:#4A3A10}

.maison{position:relative}
.zones{position:absolute;inset:0}
.z{position:absolute;cursor:pointer;perspective:700px}
.reperes .z{outline:1.5px solid rgba(255,0,0,.9)}
.z .ph{position:absolute;inset:0;border-radius:3px;background-size:cover;background-position:center;background-color:#16293B;
  opacity:0;transform:scale(.86);transition:opacity .3s .26s,transform .45s .26s;
  box-shadow:inset 0 0 16px rgba(0,0,0,.5);overflow:hidden;
  display:flex;align-items:center;justify-content:center;text-align:center;
  font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45);padding:3px}
.z.ouvert .ph{opacity:1;transform:none}
.z.pris .ph{box-shadow:inset 0 0 0 3px #F3D98C, 0 0 18px 2px rgba(243,217,140,.85), inset 0 0 16px rgba(0,0,0,.45)}
.z.pris{z-index:6}
.rd.neuf{animation:pastilleOn 2.2s ease}
@keyframes pastilleOn{
  0%{transform:scale(.6);box-shadow:0 0 0 0 rgba(243,217,140,.9)}
  25%{transform:scale(1.14);box-shadow:0 0 16px 6px rgba(243,217,140,.95)}
  60%{transform:scale(1);box-shadow:0 0 10px 2px rgba(243,217,140,.6)}
  100%{transform:scale(1);box-shadow:0 0 0 0 rgba(243,217,140,0)}
}
.z .porte{position:absolute;inset:0;border-radius:3px;background-repeat:no-repeat;
  transform-origin:left center;backface-visibility:hidden;
  transition:transform .62s cubic-bezier(.34,.82,.36,1),box-shadow .62s}
.z:hover .porte{filter:brightness(1.14)}
.z.ouvert .porte{transform:rotateY(-104deg);box-shadow:7px 0 20px rgba(0,0,0,.4)}
.z.ouvert{z-index:5}
.z .att{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;
  font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.z .pr{position:absolute;left:0;right:0;bottom:0;padding:9px 0 3px;text-align:center;
  font-size:9px;letter-spacing:.05em;color:#fff;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.62))}
.z .v{position:absolute;right:3px;top:3px;width:15px;height:15px;border-radius:50%;background:#E7C56A;color:#2B4D6B;
  font-size:10px;display:none;align-items:center;justify-content:center;z-index:3}
.z.pris .v{display:flex}
.grp li{display:flex;align-items:baseline;gap:7px}
.grp li .t{flex:1;display:flex;flex-direction:column;min-width:0}
.grp li .t em{font-style:normal;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#A9BAC7;margin-top:1px}
.grp li .px{font-size:12px;color:#43637E;white-space:nowrap}
.grp li .av{font-size:9.5px;color:#C2CFDA;text-decoration:line-through;margin-right:3px}
.z .pr .av{text-decoration:line-through;opacity:.75;margin-right:4px;font-size:8px}
.eco{font-size:10px;letter-spacing:.06em;color:#A8863A;background:rgba(184,145,47,.12);
  border:1px solid rgba(184,145,47,.3);border-radius:999px;padding:4px 11px;white-space:nowrap}
.cpt .av{text-decoration:line-through;color:#B6C6D3;font-size:13px;margin-right:6px}
.rec td.av{text-align:right;color:#C2CFDA;text-decoration:line-through;font-size:10.5px;white-space:nowrap}
.grp li.on .px{color:#A8863A}
.tot{margin-left:2px}
.tot b{font-family:Playfair Display,serif;color:#A8863A;font-weight:400}
.grp li{cursor:pointer;border-radius:6px;padding:2.5px 6px;margin-left:-6px;transition:.14s}
.grp li:hover{background:rgba(184,145,47,.10)}
.grp li.on{background:rgba(184,145,47,.18);color:#2B4D6B}
.grp li.on .t{font-weight:500}
.choix{display:flex;align-items:center;gap:12px;min-width:0}
.choix .bte{height:78px;width:auto;display:block;flex:none;filter:drop-shadow(0 6px 14px rgba(20,45,70,.18))}
.ronds{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.rd{width:46px;height:46px;border-radius:50%;overflow:hidden;position:relative;flex:none;
  background:#EDF2F7;border:2px solid rgba(184,145,47,.75);cursor:pointer;transition:transform .14s}
.rd:hover{transform:translateY(-2px)}
.rd img{width:100%;height:100%;object-fit:cover;display:block}
.rd .j{position:absolute;left:0;right:0;bottom:0;background:rgba(20,38,56,.6);color:#fff;
  font-size:8.5px;text-align:center;line-height:13px}
.rd.att{display:flex;align-items:center;justify-content:center;font-size:9px;color:#9DB0BF;letter-spacing:.04em}
.rd.vide{border:1.5px dashed rgba(46,83,117,.3);background:transparent;cursor:default}
.rd.vide:hover{transform:none}
.fiche{max-width:min(96%,900px);margin:16px auto 0;text-align:center;padding:14px 22px 15px;
  background:rgba(255,255,255,.7);border:1px solid rgba(46,83,117,.1);border-radius:12px}
.fiche h2{font-family:Playfair Display,serif;font-weight:400;font-size:clamp(16px,1.9vw,21px);margin:0 0 5px;color:#2B4D6B}
.fiche p{margin:0;font-size:12px;line-height:1.6;color:#52728C}
.fiche .spec{margin-top:5px;font-size:10.5px;letter-spacing:.03em;color:#A8863A}
.fiche .note{margin-top:5px;font-size:9.5px;line-height:1.5;color:#A8B8C6;font-style:italic}
.barre{position:sticky;bottom:0;margin-top:10px;background:rgba(255,255,255,.94);border-top:1px solid rgba(46,83,117,.12);
  padding:10px 18px 12px;display:flex;flex-direction:column;align-items:center;gap:9px;border-radius:12px 12px 0 0}
.ligne{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;width:100%}
.tailles{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap}
.tailles .lt{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#8DA3B5;margin-right:3px}
.tb{appearance:none;border:1px solid rgba(46,83,117,.22);background:#fff;color:#43637E;font-family:Poppins;font-size:11.5px;
  min-width:34px;padding:5px 8px;border-radius:999px;cursor:pointer;transition:.14s}
.tb:hover{border-color:rgba(184,145,47,.6)}
.tb[aria-pressed="true"]{background:#B8912F;border-color:#B8912F;color:#fff}
.tb.inconnue{font-size:10.5px;letter-spacing:.02em;padding:5px 12px;color:#8DA3B5}
.tailles.manque .tb{border-color:rgba(184,145,47,.55)}
.cpt{font-family:Playfair Display,serif;font-size:17px;color:#2B4D6B}
.cpt b{color:#A8863A;font-weight:400}
.mini{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#8DA3B5}
.bt{appearance:none;border:1px solid #B8912F;background:#B8912F;color:#fff;font-family:Poppins;font-size:12.5px;
  letter-spacing:.06em;padding:11px 24px;border-radius:999px;cursor:pointer}
.bt[disabled]{opacity:.32;cursor:default}
.panier{display:none;margin-top:10px;background:#fff;border:1px solid rgba(184,145,47,.35);border-radius:12px;padding:14px 18px;font-size:12px;line-height:1.8;color:#43637E}
.panier b{font-family:Playfair Display,serif;font-weight:400;color:#2B4D6B}
.rec{width:100%;border-collapse:collapse;margin-top:9px;font-size:11.5px}
.rec td{padding:4px 6px;border-bottom:1px solid rgba(46,83,117,.08);vertical-align:baseline}
.rec td.g{color:#9DB0BF;font-size:10.5px}
.rec td.px{text-align:right;white-space:nowrap;color:#43637E}
.rec tr.fr td{color:#8DA3B5}
.rec tr.to td{font-family:Playfair Display,serif;font-size:14px;color:#2B4D6B;border-bottom:0;padding-top:8px}
.rec tr.to td.px{color:#A8863A}
.gain{margin:10px 0 0;text-align:right;font-size:11.5px;color:#43637E}
.gain b{font-family:Playfair Display,serif;font-size:15px;color:#A8863A;font-weight:400}

.pied{text-align:center;padding:14px 18px 24px;font-size:10px;letter-spacing:.14em;color:#8DA3B5}
</style></head><body>

<div class="intro" id="intro">

</div>
<script>
(function(){
  var intro=document.getElementById("intro"); if(!intro) return;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ intro.classList.add("pret"); }); });
  var parti=false;
  function tourner(){
    if(parti) return; parti=true;
    intro.classList.add("tourne");
    paillettes();
    setTimeout(function(){ intro.classList.add("parti"); },1350);
    setTimeout(function(){ if(intro.parentNode) intro.parentNode.removeChild(intro); },1600);
  }
  function paillettes(){
    var l=document.createElement("div"); l.className="magie"; document.body.appendChild(l);
    var n=window.innerWidth<700?130:240, h="";
    for(var i=0;i<n;i++){
      var t=3+Math.random()*11;                       // taille
      h+='<i class="pa" style="left:'+(Math.random()*100).toFixed(1)+'%;'
        +'top:'+(45+Math.random()*58).toFixed(1)+'%;'
        +'width:'+t.toFixed(1)+'px;height:'+t.toFixed(1)+'px;'
        +'--dx:'+(Math.random()*70-35).toFixed(0)+'px;'
        +'--dy:-'+(55+Math.random()*70).toFixed(0)+'vh;'
        +'--d:'+(1.3+Math.random()*1.4).toFixed(2)+'s;'
        +'--r:'+(Math.random()*.75).toFixed(2)+'s"></i>';
    }
    l.innerHTML=h;
    setTimeout(function(){ if(l.parentNode) l.parentNode.removeChild(l); },3400);
  }
  var minuteur=setTimeout(tourner,6600);
  intro.addEventListener("click",function(){ clearTimeout(minuteur); tourner(); });
})();
</script>

<header>
  <h1>Le calendrier <img class="logo-i" src="/calendrier/mood-mot.png" alt="mood"> <span class="sep">·</span> Notre poésie de Noël</h1>
  <p class="kick2">24 cases, 24 surprises.</p>
  <p class="sous">Des créations exclusives à prix magiques, avec parfois plus de 50&nbsp;% de réduction&nbsp;! Des prix qui ne reviendront pas.<br>
  Choisissez 4 addons minimum, nos lutins complètent les cases restantes avec de délicieux chocolats.</p>
</header>

<div class="wrap">
  <div class="duo">
    <div class="maison"><img src="/calendrier/boite-anim.gif" alt="Le calendrier mood, 24 tiroirs"><div class="zones" id="zones"></div></div>
    <aside class="liste" id="liste"></aside>
  </div>
  <section class="fiche">
    <h2>Un écrin féerique pour votre Noël</h2>
    <p>Un calendrier de l'Avent, 24 petits tiroirs et un village de Noël illuminé par de douces lumières LED.</p>
    <p class="spec">39,4 × 30 × 5 cm · 8 LED avec minuterie de 6 h · 2 piles AAA (non incluses)</p>
    <p class="note">Visuels d'illustration : le calendrier livré peut présenter quelques différences avec les images présentées.</p>
  </section>
  <div class="barre" id="barre">
    <div class="tailles" id="tailles"><span class="lt">Ma taille</span></div>
    <div class="ligne">
    <div class="choix"><img class="bte" src="/calendrier/coffret.gif" alt="La boîte du calendrier mood"><div class="ronds" id="ronds"></div></div>
    <span class="cpt"><b id="n">0</b> case<span id="s"></span> choisie<span id="s2"></span></span>
    <span class="mini">4 au minimum</span>
    <span class="cpt tot">Total <span class="av" id="avant"></span><b id="total">—</b></span>
    <span class="eco" id="eco" style="display:none"></span>
    <button class="bt" id="valider" disabled>Ajouter au panier</button>
    </div>
  </div>
  <div class="panier" id="panier"></div>
  <p class="pied">Maquette — les pièces ne sont pas encore définitives</p>
</div>
<script>
var CASES=[{"n":1,"t":"Les douceurs","m":"Acier découpé","z":[7.98,46.79,17.97,59.98],"d":"deux tiers acier découpé","p":60,"b":159,"f":"deux tiers"},{"n":2,"t":"Rencontrent le givre","m":"Polymère","z":[17.97,46.79,28.52,59.98],"d":"6 mediums polymère","p":55,"b":150,"f":"pack de 6 mediums"},{"n":3,"t":"Le rouge apparaît","m":"Aluminium","z":[28.52,46.79,38.86,59.98],"d":"pack de 2 minis alu rouge","p":30,"b":60,"f":"pack de 2 minis"},{"n":4,"t":"Avec la neige","m":"Polymère","z":[38.86,46.79,48.72,59.98],"d":"deux tiers polymère translucide","p":10,"b":35,"f":"deux tiers"},{"n":5,"t":"Noël s'éveille","m":"Polymère","z":[7.98,60.81,17.97,73.72],"d":"deux tiers polymère opaque","p":10,"b":35,"f":"deux tiers"},{"n":6,"t":"Vêtu de bleu","m":"Clip & Drop","z":[17.97,60.81,28.52,73.72],"d":"clip","p":35,"b":90,"f":"clip"},{"n":7,"t":"Une lueur","m":"Nacre","z":[28.52,60.81,38.86,73.72],"d":"deux tiers nacre","p":70,"b":157,"f":"deux tiers"},{"n":8,"t":"Brille doucement","m":"Acier découpé","z":[38.86,60.81,48.72,73.72],"d":"deux tiers acier découpé","p":60,"b":159,"f":"deux tiers"},{"n":9,"t":"Le ciel s'embrase","m":"Polymère","z":[7.98,74.54,17.97,88.64],"d":"6 mediums polymère","p":55,"b":150,"f":"pack de 6 mediums"},{"n":10,"t":"Sur les Alpes","m":"Polymère","z":[17.97,74.54,28.52,88.64],"d":"deux tiers polymère opaque","p":10,"b":35,"f":"deux tiers"},{"n":11,"t":"Une lumière","m":"Clip & Drop","z":[28.52,74.54,38.86,88.64],"d":"drop","p":60,"b":139,"f":"drop"},{"n":12,"t":"Perce la nuit","m":"Aluminium","z":[38.86,74.54,48.72,88.64],"d":"deux tiers alu myrtille","p":30,"b":75,"f":"deux tiers"},{"n":13,"t":"Sous le sapin","m":"Polymère","z":[51.98,46.79,61.83,59.98],"d":"deux tiers polymère translucide","p":10,"b":35,"f":"deux tiers"},{"n":14,"t":"La glace scintille","m":"Aura","z":[61.83,46.79,72.24,59.98],"d":"Aura medium","p":85,"b":199,"f":"medium"},{"n":15,"t":"Les cerfs avancent","m":"Aluminium","z":[72.24,46.79,83.07,59.98],"d":"deux tiers alu abricot","p":30,"b":75,"f":"deux tiers"},{"n":16,"t":"Sous les étoiles","m":"Aluminium","z":[83.07,46.79,93.68,59.98],"d":"deux tiers alu bleu pastel","p":30,"b":75,"f":"deux tiers"},{"n":17,"t":"Un éclat","m":"Clip & Drop","z":[51.98,60.81,61.83,73.72],"d":"clip","p":35,"b":90,"f":"clip"},{"n":18,"t":"Traverse la forêt","m":"Acier","z":[61.83,60.81,72.24,73.72],"d":"deux tiers acier bleu","p":50,"b":159,"f":"deux tiers"},{"n":19,"t":"Les flocons dansent","m":"Aluminium serti","z":[72.24,60.81,83.07,73.72],"d":"deux tiers alu noisette serti","p":50,"b":115,"f":"deux tiers"},{"n":20,"t":"Dans le bleu","m":"Nacre","z":[83.07,60.81,93.68,73.72],"d":"deux tiers nacre","p":70,"b":157,"f":"deux tiers"},{"n":21,"t":"Noël scintille","m":"Acier","z":[51.98,74.54,61.83,88.64],"d":"deux tiers acier rose gold","p":50,"b":159,"f":"deux tiers"},{"n":22,"t":"Une dernière fois","m":"Clip & Drop","z":[61.83,74.54,72.24,88.64],"d":"drop","p":60,"b":139,"f":"drop"},{"n":23,"t":"La magie commence","m":"Aura","z":[72.24,74.54,83.07,88.64],"d":"Aura medium","p":85,"b":199,"f":"medium"},{"n":24,"t":"À minuit","m":"Aluminium serti","z":[83.07,74.54,93.68,88.64],"d":"deux tiers alu anthracite serti","p":50,"b":115,"f":"deux tiers"}], IMG={1:"/calendrier/cases/01.jpg",2:"/calendrier/cases/02.jpg",3:"/calendrier/cases/03.jpg",4:"/calendrier/cases/04.jpg",5:"/calendrier/cases/05.jpg",6:"/calendrier/cases/06.jpg",7:"/calendrier/cases/07.jpg",8:"/calendrier/cases/08.jpg",9:"/calendrier/cases/09.jpg",10:"/calendrier/cases/10.jpg",11:"/calendrier/cases/11.jpg",12:"/calendrier/cases/12.jpg",13:"/calendrier/cases/13.jpg",14:"/calendrier/cases/14.jpg",15:"/calendrier/cases/15.jpg",16:"/calendrier/cases/16.jpg",17:"/calendrier/cases/17.jpg",18:"/calendrier/cases/18.jpg",19:"/calendrier/cases/19.jpg",20:"/calendrier/cases/20.jpg",21:"/calendrier/cases/21.jpg",22:"/calendrier/cases/22.jpg",23:"/calendrier/cases/23.jpg",24:"/calendrier/cases/24.jpg"}, ORDRE=["Acier découpé", "Polymère", "Aluminium", "Aluminium serti", "Aura", "Clip & Drop", "Nacre", "Acier"], pris={};
var REF={"1":{"50":"64948019233145","52":"64948019265913","54":"64948019298681","56":"64948019331449","58":"64948019364217","60":"64948019396985","62":"64948019429753","64":"64948019462521","66":"64948019495289","68":"64948019528057","70":"64948019560825","72":"64948019593593","taille inconnue":"64948019200377"},"2":{"50":"64948020052345","52":"64948020085113","54":"64948020117881","56":"64948020150649","58":"64948020183417","60":"64948020216185","62":"64948020248953","64":"64948020281721","66":"64948020314489","68":"64948020347257","70":"64948020380025","72":"64948020412793","taille inconnue":"64948020019577"},"3":{"50":"64948020511097","52":"64948020543865","54":"64948020576633","56":"64948020609401","58":"64948020642169","60":"64948020674937","62":"64948020707705","64":"64948020740473","66":"64948020773241","68":"64948020806009","70":"64948020838777","72":"64948020871545","taille inconnue":"64948020478329"},"4":{"50":"64948021035385","52":"64948021068153","54":"64948021100921","56":"64948021133689","58":"64948021166457","60":"64948021199225","62":"64948021231993","64":"64948021264761","66":"64948021297529","68":"64948021330297","70":"64948021363065","72":"64948021395833","taille inconnue":"64948021002617"},"5":{"50":"64948021625209","52":"64948021657977","54":"64948021690745","56":"64948021723513","58":"64948021756281","60":"64948021789049","62":"64948021821817","64":"64948021854585","66":"64948021887353","68":"64948021920121","70":"64948021952889","72":"64948021985657","taille inconnue":"64948021592441"},"6":{"Default Title":"64948022411641"},"7":{"50":"64948022477177","52":"64948022509945","54":"64948022542713","56":"64948022575481","58":"64948022608249","60":"64948022641017","62":"64948022673785","64":"64948022706553","66":"64948022739321","68":"64948022772089","70":"64948022804857","72":"64948022837625","taille inconnue":"64948022444409"},"8":{"50":"64948023361913","52":"64948023394681","54":"64948023427449","56":"64948023460217","58":"64948023492985","60":"64948023525753","62":"64948023558521","64":"64948023591289","66":"64948023624057","68":"64948023656825","70":"64948023689593","72":"64948023722361","taille inconnue":"64948023329145"},"9":{"50":"64948023918969","52":"64948023951737","54":"64948023984505","56":"64948024017273","58":"64948024050041","60":"64948024082809","62":"64948024115577","64":"64948024148345","66":"64948024181113","68":"64948024213881","70":"64948024246649","72":"64948024279417","taille inconnue":"64948023886201"},"10":{"50":"64948024410489","52":"64948024443257","54":"64948024476025","56":"64948024508793","58":"64948024541561","60":"64948024574329","62":"64948024607097","64":"64948024639865","66":"64948024672633","68":"64948024705401","70":"64948024738169","72":"64948024770937","taille inconnue":"64948024377721"},"11":{"Default Title":"64948025000313"},"12":{"50":"64948025098617","52":"64948025131385","54":"64948025164153","56":"64948025196921","58":"64948025229689","60":"64948025262457","62":"64948025295225","64":"64948025327993","66":"64948025360761","68":"64948025393529","70":"64948025426297","72":"64948025459065","taille inconnue":"64948025065849"},"13":{"50":"64948025655673","52":"64948025688441","54":"64948025721209","56":"64948025753977","58":"64948025786745","60":"64948025819513","62":"64948025852281","64":"64948025885049","66":"64948025917817","68":"64948025950585","70":"64948025983353","72":"64948026016121","taille inconnue":"64948025622905"},"14":{"50":"64948027163001","52":"64948027195769","54":"64948027228537","56":"64948027261305","58":"64948027294073","60":"64948027326841","62":"64948027359609","64":"64948027392377","66":"64948027425145","68":"64948027457913","70":"64948027490681","72":"64948027523449","taille inconnue":"64948027130233"},"15":{"50":"64948027588985","52":"64948027621753","54":"64948027654521","56":"64948027687289","58":"64948027720057","60":"64948027752825","62":"64948027785593","64":"64948027818361","66":"64948027851129","68":"64948027883897","70":"64948027916665","72":"64948027949433","taille inconnue":"64948027556217"},"16":{"50":"64948028047737","52":"64948028080505","54":"64948028113273","56":"64948028146041","58":"64948028178809","60":"64948028211577","62":"64948028244345","64":"64948028277113","66":"64948028309881","68":"64948028342649","70":"64948028375417","72":"64948028408185","taille inconnue":"64948028014969"},"17":{"Default Title":"64948028473721"},"18":{"50":"64948028572025","52":"64948028604793","54":"64948028637561","56":"64948028670329","58":"64948028703097","60":"64948028735865","62":"64948028768633","64":"64948028801401","66":"64948028834169","68":"64948028866937","70":"64948028899705","72":"64948028932473","taille inconnue":"64948028539257"},"19":{"50":"64948029096313","52":"64948029129081","54":"64948029161849","56":"64948029194617","58":"64948029227385","60":"64948029260153","62":"64948029292921","64":"64948029325689","66":"64948029358457","68":"64948029391225","70":"64948029423993","72":"64948029456761","taille inconnue":"64948029063545"},"20":{"50":"64948029587833","52":"64948029620601","54":"64948029653369","56":"64948029686137","58":"64948029718905","60":"64948029751673","62":"64948029784441","64":"64948029817209","66":"64948029849977","68":"64948029882745","70":"64948029915513","72":"64948029948281","taille inconnue":"64948029555065"},"21":{"50":"64948030013817","52":"64948030046585","54":"64948030079353","56":"64948030112121","58":"64948030144889","60":"64948030177657","62":"64948030210425","64":"64948030243193","66":"64948030275961","68":"64948030308729","70":"64948030341497","72":"64948030374265","taille inconnue":"64948029981049"},"22":{"Default Title":"64948030407033"},"23":{"50":"64948030472569","52":"64948030505337","54":"64948030538105","56":"64948030570873","58":"64948030603641","60":"64948030636409","62":"64948030669177","64":"64948030701945","66":"64948030734713","68":"64948030767481","70":"64948030800249","72":"64948030833017","taille inconnue":"64948030439801"},"24":{"50":"64948030898553","52":"64948030931321","54":"64948030964089","56":"64948030996857","58":"64948031029625","60":"64948031062393","62":"64948031095161","64":"64948031127929","66":"64948031160697","68":"64948031193465","70":"64948031226233","72":"64948031259001","taille inconnue":"64948030865785"}}, COFFRET="64948491288953";
var TAILLES=["taille inconnue","50","52","54","56","58","60","62","64","66","68","70","72"], taille=null;
var zones=document.getElementById("zones"), liste=document.getElementById("liste");
liste.innerHTML='<div class="lg"><span><i class="p or"></i>impairs · doré</span><span><i class="p glace"></i>pairs · bleu glacé</span></div>';
ORDRE.forEach(function(m){
  var l=CASES.filter(function(c){return c.m===m;}).sort(function(a,b){return a.n-b.n;});
  if(!l.length) return;
  var sec=document.createElement("section"); sec.className="grp";
  sec.innerHTML='<h3>'+m+'</h3><ul>'+l.map(function(c){
    return '<li data-n="'+c.n+'"><span class="n '+(c.n%2?"or":"glace")+'">'+(c.n<10?"0":"")+c.n+'</span><span class="t">'+c.t+'<em>'+c.f+'</em></span><span class="px"><span class="av">'+c.b+'.–</span>'+c.p+'.–</span></li>';
  }).join('')+'</ul>';
  liste.appendChild(sec);
});
CASES.forEach(function(c){
  var w=c.z[2]-c.z[0], h=c.z[3]-c.z[1];
  var z=document.createElement("div"); z.className="z"; z.dataset.n=c.n;
  z.style.left=c.z[0]+"%"; z.style.top=c.z[1]+"%"; z.style.width=w+"%"; z.style.height=h+"%";
  z.title=c.n+" · "+c.t;
  var bs=(10000/w).toFixed(1)+"% "+(10000/h).toFixed(1)+"%";
  var bp=(c.z[0]/(100-w)*100).toFixed(2)+"% "+(c.z[1]/(100-h)*100).toFixed(2)+"%";
  var src=IMG[c.n];
  var ph='<div class="ph"'+(src?' style="background-image:url('+src+')"':"")+'>'
    +(src?"":'<span class="att">photo à venir</span>')
    +'<span class="pr"><span class="av">'+c.b+'.–</span>'+c.p+'.–</span><span class="v">✓</span></div>';
  var porte='<div class="porte" style="background-image:url(/calendrier/boite-anim.gif);background-size:'+bs+';background-position:'+bp+'"></div>';
  z.innerHTML=ph+porte;
  zones.appendChild(z);
});
function maj(){
  var l=Object.keys(pris).map(Number).sort(function(a,b){return a-b;});
  var somme=l.reduce(function(t,x){ var c=CASES.find(function(y){return y.n===x;}); return t+(c?c.p:0); },0);
  document.getElementById("n").textContent=l.length;
  document.getElementById("s").textContent=l.length>1?"s":"";
  document.getElementById("s2").textContent=l.length>1?"s":"";
  var boutique=l.reduce(function(t,x){ var c=CASES.find(function(y){return y.n===x;}); return t+(c?c.b:0); },0);
  document.getElementById("total").textContent=l.length?(somme+50)+".–":"—";
  document.getElementById("avant").textContent=l.length?boutique+".–":"";
  var eco=document.getElementById("eco"), diff=boutique-(somme+50);
  if(l.length && diff>0){ eco.style.display=""; eco.textContent="tu économises "+diff+".–"; } else eco.style.display="none";
  document.getElementById("valider").disabled = l.length<4 || !taille;
  var zt=document.getElementById("tailles"); if(zt) zt.classList.toggle("manque", l.length>=4 && !taille);
  var r=document.getElementById("ronds"), h="";
  l.forEach(function(n){
    var c=CASES.find(function(y){return y.n===n;}), src=IMG[n];
    h+='<div class="rd'+(src?"":" att")+'" data-n="'+n+'" title="'+n+' décembre · '+c.t+'">'
      +(src?'<img src="'+src+'" alt=""><span class="j">'+(n<10?"0":"")+n+'</span>':(n<10?"0":"")+n)
      +'</div>';
  });
  for(var k=l.length;k<4;k++) h+='<div class="rd vide"></div>';
  r.innerHTML=h;
  if(dernier!==null){
    var nv=r.querySelector('.rd[data-n="'+dernier+'"]');
    if(nv){ nv.classList.add("neuf"); etincelles(nv); }
    dernier=null;
  }
  return {l:l,somme:somme,boutique:boutique};
}
var dernier=null;
function etincelles(el){
  var b=el.getBoundingClientRect(), l=document.createElement("div"); l.className="magie"; document.body.appendChild(l);
  var h="";
  for(var i=0;i<16;i++){
    var t=2+Math.random()*5, ang=Math.random()*Math.PI*2, d=18+Math.random()*34;
    h+='<i class="pa" style="left:'+(b.left+b.width/2)+'px;top:'+(b.top+b.height/2)+'px;'
      +'width:'+t.toFixed(1)+'px;height:'+t.toFixed(1)+'px;'
      +'--dx:'+(Math.cos(ang)*d).toFixed(0)+'px;--dy:'+(Math.sin(ang)*d-14).toFixed(0)+'px;'
      +'--d:'+(0.9+Math.random()*0.8).toFixed(2)+'s;--r:'+(Math.random()*.25).toFixed(2)+'s"></i>';
  }
  l.innerHTML=h;
  setTimeout(function(){ if(l.parentNode) l.parentNode.removeChild(l); },2200);
}
function marque(n){
  var z=zones.querySelector('[data-n="'+n+'"]'); if(z) z.classList.toggle("pris",!!pris[n]);
  var li=liste.querySelector('li[data-n="'+n+'"]'); if(li) li.classList.toggle("on",!!pris[n]);
}
var minuteurs={};
function refermePlusTard(n,z){
  clearTimeout(minuteurs[n]);
  minuteurs[n]=setTimeout(function(){ if(!pris[n]) z.classList.remove("ouvert"); },10000);
}
function clic(n,deLaListe){
  var z=zones.querySelector('[data-n="'+n+'"]'); if(!z) return;
  if(deLaListe) z.scrollIntoView({behavior:"smooth",block:"center"});
  if(!z.classList.contains("ouvert")){ z.classList.add("ouvert"); refermePlusTard(n,z); return; }
  if(pris[n]){ delete pris[n]; refermePlusTard(n,z); } else { clearTimeout(minuteurs[n]); pris[n]=true; dernier=n; }
  marque(n); maj();
}
zones.addEventListener("click",function(e){ var z=e.target.closest(".z"); if(z) clic(+z.dataset.n,false); });
liste.addEventListener("click",function(e){ var li=e.target.closest("li[data-n]"); if(li) clic(+li.dataset.n,true); });
document.getElementById("ronds").addEventListener("click",function(e){
  var r=e.target.closest(".rd[data-n]"); if(!r) return;
  var n=+r.dataset.n; delete pris[n]; marque(n); maj();
});
function versPanier(){
  var r=maj(); if(r.l.length<4 || !taille) return;
  var ids=[], manque=[];
  r.l.forEach(function(n){
    var v=REF[n]; if(!v){ manque.push(n); return; }
    var id = v[taille] || v["Default Title"] || v[Object.keys(v)[0]];
    if(!id){ manque.push(n); return; }
    ids.push(id+":1");
  });
  if(manque.length){ document.getElementById("panier").style.display="block";
    document.getElementById("panier").innerHTML="<b>Pas encore commandable</b> · cases "+manque.join(", ");
    return; }
  ids.push(COFFRET+":1");
  window.location.href="https://www.yourmood.net/cart/"+ids.join(",")+"?storefront=true";
}
document.getElementById("valider").onclick=function(){
  var r=maj(), p=document.getElementById("panier");
  p.innerHTML='<b>Mon calendrier</b> · '+r.l.length+' cases · taille '+(taille==="taille inconnue"?"à définir ensemble":taille)+'<table class="rec">'
    +r.l.map(function(n){ var c=CASES.find(function(x){return x.n===n;});
      return '<tr><td>'+(n<10?"0":"")+n+'</td><td>'+c.t+'</td><td class="g">'+c.d+'</td><td class="av">'+c.b+'.–</td><td class="px">'+c.p+'.–</td></tr>'; }).join('')
    +'<tr class="fr"><td></td><td colspan="3">Le coffret</td><td class="px">50.–</td></tr>'
    +'<tr class="to"><td></td><td colspan="2">Total</td><td class="av">'+r.boutique+'.–</td><td class="px">'+(r.somme+50)+'.–</td></tr></table>'
    +'<p class="gain">Valeur en boutique '+r.boutique+'.– · tu économises <b>'+(r.boutique-r.somme-50)+'.–</b></p>';
  p.style.display="block";
  versPanier();
}


;(function(){
  var zt=document.getElementById("tailles");
  TAILLES.forEach(function(t){
    var b=document.createElement("button"); b.className="tb"; b.dataset.t=t; b.setAttribute("aria-pressed","false");
    if(t==="taille inconnue"){ b.textContent="je ne la connais pas"; b.classList.add("inconnue"); } else b.textContent=t;
    zt.appendChild(b);
  });
  zt.addEventListener("click",function(e){
    var b=e.target.closest(".tb"); if(!b) return;
    taille = (taille===b.dataset.t) ? null : b.dataset.t;
    zt.querySelectorAll(".tb").forEach(function(x){ x.setAttribute("aria-pressed",(x.dataset.t===taille)?"true":"false"); });
    maj();
  });
})();
function hauteurs(){
  var m=document.querySelector(".maison"), l=document.getElementById("liste"); if(!m||!l) return;
  var large=window.matchMedia("(min-width:901px)").matches;
  l.style.height = large ? Math.round(m.getBoundingClientRect().height)+"px" : "";
}
window.addEventListener("resize",hauteurs);
setTimeout(hauteurs,150); setTimeout(hauteurs,900);
if(location.hash.indexOf("reperes")>=0) document.body.classList.add("reperes");
maj();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
