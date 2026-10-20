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
.kick{font-size:10px;letter-spacing:.42em;text-transform:uppercase;color:var(--or)}
h1{font-family:Playfair Display,serif;font-weight:400;font-size:clamp(26px,3.4vw,40px);margin:9px 0 0;line-height:1.1;color:#2B4D6B}
h1 em{font-style:italic;color:#A8863A}
.sous{max-width:52ch;margin:10px auto 0;font-size:12px;line-height:1.7;color:#52728C}
.intro{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;
  background:radial-gradient(120% 90% at 50% 40%,#2F5B85 0%,#1B3A58 55%,#12273D 100%);
  perspective:1700px;transition:opacity .55s ease}
.intro.parti{opacity:0;pointer-events:none}
.carte{position:relative;width:min(46vh,310px);aspect-ratio:760/992;transform-style:preserve-3d;transform-origin:left center;
  opacity:0;transform:translateY(20px) scale(.955);transition:opacity .95s ease,transform .95s cubic-bezier(.2,.7,.3,1)}
.intro.pret .carte{opacity:1;transform:none}
.intro.tourne .carte{transition:transform 1.2s cubic-bezier(.55,.03,.3,1);transform:rotateY(-132deg)}
.carte .f{position:absolute;inset:0;border-radius:5px;overflow:hidden;backface-visibility:hidden;
  box-shadow:0 34px 78px rgba(6,20,36,.6)}
.carte .f img{width:100%;height:100%;display:block}
.carte .dos{transform:rotateY(180deg);background:#F3EBDB;
  background-image:linear-gradient(135deg,rgba(184,145,47,.10) 0%,rgba(184,145,47,0) 55%)}
.bienvenue{margin:0;text-align:center;padding:0 22px;font-family:Playfair Display,serif;font-weight:400;
  font-size:clamp(17px,2.5vw,27px);line-height:1.5;color:#F4EADA;opacity:0;transition:opacity 1s ease .55s}
.bienvenue em{font-style:italic;color:#E7C56A}
.intro.pret .bienvenue{opacity:1}
.intro.tourne .bienvenue{opacity:0;transition:opacity .45s ease}
.maison{position:relative;margin:0 auto;width:min(100%,calc((100vh - 255px) * 1442 / 1091));aspect-ratio:1442/1091}
.maison img{width:100%;height:100%;display:block;object-fit:fill}

.duo{display:grid;grid-template-columns:1.38fr .62fr;gap:28px;align-items:start;margin-top:22px}
@media(max-width:900px){.duo{grid-template-columns:1fr;gap:26px}}
@media(min-width:901px){.liste{max-height:calc(100vh - 255px);overflow:auto}}
.liste{background:#fff;border:1px solid rgba(46,83,117,.10);border-radius:14px;padding:16px 18px;box-shadow:0 14px 40px rgba(46,83,117,.08);columns:2;column-gap:20px}
@media(max-width:900px){.liste{columns:2}}@media(max-width:560px){.liste{columns:1}}
.lg{column-span:all;display:flex;gap:14px;flex-wrap:wrap;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#8DA3B5;
  padding-bottom:9px;border-bottom:1px solid rgba(46,83,117,.10);margin-bottom:4px}
.lg span{display:flex;align-items:center;gap:7px}
i.p{width:9px;height:9px;border-radius:50%;display:inline-block}
i.or,.n.or{background:linear-gradient(145deg,#E6CB92,#B8912F)}
i.glace,.n.glace{background:linear-gradient(145deg,#DCE9F3,#A9C4D8)}
.grp{margin-top:10px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid}
.grp h3{font-family:Playfair Display,serif;font-weight:400;font-size:12.5px;color:#2B4D6B;margin:0 0 4px}
.grp ul{list-style:none;margin:0;padding:0}
.grp li{display:flex;align-items:center;gap:8px;padding:2.5px 0;font-size:10.8px;line-height:1.3;color:#43637E}
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
.z.pris .ph{box-shadow:inset 0 0 0 2.5px #E7C56A, inset 0 0 16px rgba(0,0,0,.5)}
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
.grp li .t{flex:1}
.grp li .px{font-size:10.5px;color:#9DB0BF;white-space:nowrap}
.grp li.on .px{color:#A8863A}
.tot{margin-left:2px}
.tot b{font-family:Playfair Display,serif;color:#A8863A;font-weight:400}
.grp li{cursor:pointer;border-radius:6px;padding:2.5px 6px;margin-left:-6px;transition:.14s}
.grp li:hover{background:rgba(184,145,47,.10)}
.grp li.on{background:rgba(184,145,47,.18);color:#2B4D6B}
.grp li.on .t{font-weight:500}
.barre{position:sticky;bottom:0;margin-top:10px;background:rgba(255,255,255,.94);border-top:1px solid rgba(46,83,117,.12);
  padding:12px 18px;display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;border-radius:12px 12px 0 0}
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

.pied{text-align:center;padding:14px 18px 24px;font-size:10px;letter-spacing:.14em;color:#8DA3B5}
</style></head><body>

<div class="intro" id="intro">
  <div class="carte" id="carte">
    <div class="f"><img src="/calendrier/carte-cerf.jpg" alt="Carte de Noël mood"></div>
    <div class="f dos"></div>
  </div>
  <p class="bienvenue">Bienvenue dans l'univers de Noël de <em>mood</em>…</p>
</div>
<script>
(function(){
  var intro=document.getElementById("intro"); if(!intro) return;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ intro.classList.add("pret"); }); });
  var parti=false;
  function tourner(){
    if(parti) return; parti=true;
    intro.classList.add("tourne");
    setTimeout(function(){ intro.classList.add("parti"); },1150);
    setTimeout(function(){ if(intro.parentNode) intro.parentNode.removeChild(intro); },1750);
  }
  var minuteur=setTimeout(tourner,3000);
  intro.addEventListener("click",function(){ clearTimeout(minuteur); tourner(); });
})();
</script>

<header>
  <div class="kick">décembre 2026</div>
  <h1>Le calendrier<br><em>mood</em></h1>
  <p class="sous">Vingt-quatre cases. Derrière chacune, une surprise — un polymère, un aluminium, un serti.</p>
</header>

<div class="wrap">
  <div class="duo">
    <div class="maison"><img src="/calendrier/boite.jpg" alt="Le calendrier mood, 24 tiroirs"><div class="zones" id="zones"></div></div>
    <aside class="liste" id="liste"></aside>
  </div>
  <div class="barre" id="barre">
    <span class="cpt"><b id="n">0</b> case<span id="s"></span> choisie<span id="s2"></span></span>
    <span class="mini">4 au minimum</span>
    <span class="cpt tot">Total <b id="total">—</b></span>
    <span class="mini">boîte et envoi 50.– compris</span>
    <button class="bt" id="valider" disabled>Ajouter à mon calendrier</button>
  </div>
  <div class="panier" id="panier"></div>
  <p class="pied">Maquette — les pièces ne sont pas encore définitives</p>
</div>
<script>
var CASES=[{"n":1,"t":"Les douceurs","m":"Acier découpé","z":[7.91,47.02,17.96,59.95],"d":"Acier découpé deux tiers","p":60},{"n":2,"t":"Rencontrent le givre","m":"Polymère","z":[17.96,47.02,28.5,59.95],"d":"Polymère, 6 mediums","p":55},{"n":3,"t":"Le rouge apparaît","m":"Aluminium","z":[28.5,47.02,38.63,59.95],"d":"Aluminium deux tiers","p":30},{"n":4,"t":"Avec la neige","m":"Polymère","z":[38.63,47.02,48.54,59.95],"d":"Polymère deux tiers","p":10},{"n":5,"t":"Noël s'éveille","m":"Polymère","z":[7.91,60.77,17.96,73.69],"d":"Polymère deux tiers","p":10},{"n":6,"t":"Vêtu de bleu","m":"Clip & Drop","z":[17.96,60.77,28.5,73.69],"d":"Clip","p":35},{"n":7,"t":"Une lueur","m":"Nacre","z":[28.5,60.77,38.63,73.69],"d":"Nacre deux tiers","p":70},{"n":8,"t":"Brille doucement","m":"Acier découpé","z":[38.63,60.77,48.54,73.69],"d":"Acier découpé deux tiers","p":60},{"n":9,"t":"Le ciel s'embrase","m":"Polymère","z":[7.91,74.52,17.96,88.18],"d":"Polymère, 6 mediums","p":55},{"n":10,"t":"Sur les Alpes","m":"Polymère","z":[17.96,74.52,28.5,88.18],"d":"Polymère deux tiers","p":10},{"n":11,"t":"Une lumière","m":"Clip & Drop","z":[28.5,74.52,38.63,88.18],"d":"Drop","p":60},{"n":12,"t":"Perce la nuit","m":"Aluminium","z":[38.63,74.52,48.54,88.18],"d":"Aluminium deux tiers","p":30},{"n":13,"t":"Sous le sapin","m":"Polymère","z":[51.94,47.02,61.86,59.95],"d":"Polymère deux tiers","p":10},{"n":14,"t":"La glace scintille","m":"Aura","z":[61.86,47.02,71.98,59.95],"d":"Aura medium","p":85},{"n":15,"t":"Les cerfs avancent","m":"Aluminium","z":[71.98,47.02,82.39,59.95],"d":"Aluminium deux tiers","p":30},{"n":16,"t":"Sous les étoiles","m":"Aluminium","z":[82.39,47.02,92.93,59.95],"d":"Aluminium deux tiers","p":30},{"n":17,"t":"Un éclat","m":"Clip & Drop","z":[51.94,60.77,61.86,73.69],"d":"Clip","p":35},{"n":18,"t":"Traverse la forêt","m":"Acier","z":[61.86,60.77,71.98,73.69],"d":"Acier deux tiers","p":50},{"n":19,"t":"Les flocons dansent","m":"Aluminium serti","z":[71.98,60.77,82.39,73.69],"d":"Aluminium deux tiers serti 4 diamants 1 mm","p":50},{"n":20,"t":"Dans le bleu","m":"Nacre","z":[82.39,60.77,92.93,73.69],"d":"Nacre deux tiers","p":70},{"n":21,"t":"Noël scintille","m":"Acier","z":[51.94,74.52,61.86,88.18],"d":"Acier deux tiers","p":50},{"n":22,"t":"Une dernière fois","m":"Clip & Drop","z":[61.86,74.52,71.98,88.18],"d":"Drop","p":60},{"n":23,"t":"La magie commence","m":"Aura","z":[71.98,74.52,82.39,88.18],"d":"Aura medium","p":85},{"n":24,"t":"À minuit","m":"Aluminium serti","z":[82.39,74.52,92.93,88.18],"d":"Aluminium deux tiers serti 4 diamants 1 mm","p":50}], IMG={1:"/calendrier/cases/01.jpg",2:"/calendrier/cases/02.jpg",4:"/calendrier/cases/04.jpg",6:"/calendrier/cases/06.jpg",8:"/calendrier/cases/08.jpg",10:"/calendrier/cases/10.jpg",12:"/calendrier/cases/12.jpg",14:"/calendrier/cases/14.jpg",16:"/calendrier/cases/16.jpg",18:"/calendrier/cases/18.jpg",20:"/calendrier/cases/20.jpg",22:"/calendrier/cases/22.jpg",24:"/calendrier/cases/24.jpg"}, ORDRE=["Acier découpé", "Polymère", "Aluminium", "Aluminium serti", "Aura", "Clip & Drop", "Nacre", "Acier"], pris={};
var zones=document.getElementById("zones"), liste=document.getElementById("liste");
liste.innerHTML='<div class="lg"><span><i class="p or"></i>impairs · doré</span><span><i class="p glace"></i>pairs · bleu glacé</span></div>';
ORDRE.forEach(function(m){
  var l=CASES.filter(function(c){return c.m===m;}).sort(function(a,b){return a.n-b.n;});
  if(!l.length) return;
  var sec=document.createElement("section"); sec.className="grp";
  sec.innerHTML='<h3>'+m+'</h3><ul>'+l.map(function(c){
    return '<li data-n="'+c.n+'"><span class="n '+(c.n%2?"or":"glace")+'">'+(c.n<10?"0":"")+c.n+'</span><span class="t">'+c.t+'</span><span class="px">'+c.p+'.–</span></li>';
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
    +'<span class="pr">'+c.p+'.–</span><span class="v">✓</span></div>';
  var porte='<div class="porte" style="background-image:url(/calendrier/boite.jpg);background-size:'+bs+';background-position:'+bp+'"></div>';
  z.innerHTML=ph+porte;
  zones.appendChild(z);
});
function maj(){
  var l=Object.keys(pris).map(Number).sort(function(a,b){return a-b;});
  var somme=l.reduce(function(t,x){ var c=CASES.find(function(y){return y.n===x;}); return t+(c?c.p:0); },0);
  document.getElementById("n").textContent=l.length;
  document.getElementById("s").textContent=l.length>1?"s":"";
  document.getElementById("s2").textContent=l.length>1?"s":"";
  document.getElementById("total").textContent=l.length?(somme+50)+".–":"—";
  document.getElementById("valider").disabled=l.length<4;
  return {l:l,somme:somme};
}
function marque(n){
  var z=zones.querySelector('[data-n="'+n+'"]'); if(z) z.classList.toggle("pris",!!pris[n]);
  var li=liste.querySelector('li[data-n="'+n+'"]'); if(li) li.classList.toggle("on",!!pris[n]);
}
function clic(n,deLaListe){
  var z=zones.querySelector('[data-n="'+n+'"]'); if(!z) return;
  if(deLaListe) z.scrollIntoView({behavior:"smooth",block:"center"});
  if(!z.classList.contains("ouvert")){ z.classList.add("ouvert"); return; }
  if(pris[n]) delete pris[n]; else pris[n]=true;
  marque(n); maj();
}
zones.addEventListener("click",function(e){ var z=e.target.closest(".z"); if(z) clic(+z.dataset.n,false); });
liste.addEventListener("click",function(e){ var li=e.target.closest("li[data-n]"); if(li) clic(+li.dataset.n,true); });
document.getElementById("valider").onclick=function(){
  var r=maj(), p=document.getElementById("panier");
  p.innerHTML='<b>Mon calendrier</b> · '+r.l.length+' cases<table class="rec">'
    +r.l.map(function(n){ var c=CASES.find(function(x){return x.n===n;});
      return '<tr><td>'+(n<10?"0":"")+n+'</td><td>'+c.t+'</td><td class="g">'+c.d+'</td><td class="px">'+c.p+'.–</td></tr>'; }).join('')
    +'<tr class="fr"><td></td><td colspan="2">Boîte et envoi</td><td class="px">50.–</td></tr>'
    +'<tr class="to"><td></td><td colspan="2">Total</td><td class="px">'+(r.somme+50)+'.–</td></tr></table>';
  p.style.display="block";
}


if(location.hash.indexOf("reperes")>=0) document.body.classList.add("reperes");
maj();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
