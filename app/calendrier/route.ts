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
.maison{position:relative;margin:0 auto}
.maison img{width:100%;height:auto;display:block;max-height:calc(100vh - 215px);object-fit:contain;margin:0 auto}

.duo{display:grid;grid-template-columns:1.38fr .62fr;gap:28px;align-items:start;margin-top:22px}
@media(max-width:900px){.duo{grid-template-columns:1fr;gap:26px}}
@media(min-width:901px){.liste{max-height:calc(100vh - 215px);overflow:auto}}
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
.z{position:absolute;border:2px solid transparent;border-radius:5px;cursor:pointer;transition:.16s;background:transparent}
.z:hover{border-color:rgba(184,145,47,.75);background:rgba(255,255,255,.14)}
.z.on{border-color:#B8912F;background:rgba(184,145,47,.26);box-shadow:0 0 0 2px rgba(255,255,255,.55) inset}
.z .v{position:absolute;right:4px;top:4px;width:17px;height:17px;border-radius:50%;background:#B8912F;color:#fff;
  font-size:11px;display:none;align-items:center;justify-content:center}
.z.on .v{display:flex}
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
.pied{text-align:center;padding:14px 18px 24px;font-size:10px;letter-spacing:.14em;color:#8DA3B5}
</style></head><body>

<header>
  <div class="kick">décembre 2026</div>
  <h1>Le calendrier<br><em>mood</em></h1>
  <p class="sous">Vingt-quatre cases. Derrière chacune, une surprise — un polymère, un aluminium, un serti.</p>
</header>

<div class="wrap">
  <div class="duo">
    <div class="maison"><img src="/calendrier/maison.jpg" alt="Le calendrier mood, maison de 24 tiroirs"><div class="zones" id="zones"></div></div>
    <aside class="liste" id="liste"></aside>
  </div>
  <div class="barre" id="barre">
    <span class="cpt"><b id="n">0</b> case<span id="s"></span> choisie<span id="s2"></span></span>
    <span class="mini">4 au minimum</span>
    <button class="bt" id="valider" disabled>Ajouter à mon calendrier</button>
  </div>
  <div class="panier" id="panier"></div>
  <p class="pied">Maquette — les pièces ne sont pas encore définitives</p>
</div>
<script>
var CASES=[{"n": 1, "t": "Les douceurs", "m": "Acier découpé", "z": [22.5, 20.5, 38.5, 31.5]}, {"n": 2, "t": "Rencontrent le givre", "m": "Polymère", "z": [38.5, 20.5, 53.5, 31.5]}, {"n": 3, "t": "Le rouge apparaît", "m": "Aluminium", "z": [53.5, 20.5, 70.5, 31.5]}, {"n": 4, "t": "Avec la neige", "m": "Polymère", "z": [70.5, 20.5, 86.0, 31.5]}, {"n": 5, "t": "Noël s'éveille", "m": "Polymère", "z": [13.5, 32.0, 35.0, 42.5]}, {"n": 6, "t": "Vêtu de bleu", "m": "Clip & Drop", "z": [35.0, 32.0, 47.0, 42.5]}, {"n": 7, "t": "Une lueur", "m": "Nacre", "z": [47.0, 32.0, 65.5, 42.5]}, {"n": 8, "t": "Brille doucement", "m": "Acier découpé", "z": [65.5, 32.0, 87.0, 42.5]}, {"n": 9, "t": "Le ciel s'embrase", "m": "Polymère", "z": [13.5, 43.5, 27.5, 58.0]}, {"n": 10, "t": "Sur les Alpes", "m": "Polymère", "z": [27.5, 43.5, 47.5, 53.5]}, {"n": 11, "t": "Une lumière", "m": "Clip & Drop", "z": [47.5, 43.5, 70.0, 53.5]}, {"n": 12, "t": "Perce la nuit", "m": "Aluminium", "z": [70.0, 43.5, 87.0, 53.5]}, {"n": 13, "t": "Sous le sapin", "m": "Polymère", "z": [13.5, 58.5, 27.5, 66.0]}, {"n": 14, "t": "La glace scintille", "m": "Aura", "z": [28.0, 54.5, 50.0, 65.0]}, {"n": 15, "t": "Les cerfs avancent", "m": "Aluminium", "z": [50.0, 54.5, 66.0, 65.0]}, {"n": 16, "t": "Sous les étoiles", "m": "Aluminium", "z": [66.0, 54.5, 87.0, 65.0]}, {"n": 17, "t": "Un éclat", "m": "Clip & Drop", "z": [13.5, 66.5, 38.5, 77.0]}, {"n": 18, "t": "Traverse la forêt", "m": "Acier", "z": [38.5, 66.5, 50.5, 77.0]}, {"n": 19, "t": "Les flocons dansent", "m": "Aluminium serti", "z": [50.5, 66.5, 65.0, 77.0]}, {"n": 20, "t": "Dans le bleu", "m": "Nacre", "z": [65.0, 66.5, 87.0, 77.0]}, {"n": 21, "t": "Noël scintille", "m": "Acier", "z": [13.5, 78.0, 30.5, 89.0]}, {"n": 22, "t": "Une dernière fois", "m": "Clip & Drop", "z": [30.5, 78.0, 50.5, 89.0]}, {"n": 23, "t": "La magie commence", "m": "Aura", "z": [50.5, 78.0, 66.0, 89.0]}, {"n": 24, "t": "À minuit", "m": "Aluminium serti", "z": [66.0, 78.0, 87.0, 89.0]}], ORDRE=["Acier découpé", "Polymère", "Aluminium", "Aluminium serti", "Aura", "Clip & Drop", "Nacre", "Acier"], pris={};
var zones=document.getElementById("zones"), liste=document.getElementById("liste");
liste.innerHTML='<div class="lg"><span><i class="p or"></i>impairs · doré</span><span><i class="p glace"></i>pairs · bleu glacé</span></div>';
ORDRE.forEach(function(m){
  var l=CASES.filter(function(c){return c.m===m;}).sort(function(a,b){return a.n-b.n;});
  if(!l.length) return;
  var sec=document.createElement("section"); sec.className="grp";
  sec.innerHTML='<h3>'+m+'</h3><ul>'+l.map(function(c){
    return '<li data-n="'+c.n+'"><span class="n '+(c.n%2?'or':'glace')+'">'+(c.n<10?'0':'')+c.n+'</span><span class="t">'+c.t+'</span></li>';
  }).join('')+'</ul>';
  liste.appendChild(sec);
});
CASES.forEach(function(c){
  var z=document.createElement("div"); z.className="z"; z.dataset.n=c.n;
  z.style.left=c.z[0]+"%"; z.style.top=c.z[1]+"%";
  z.style.width=(c.z[2]-c.z[0])+"%"; z.style.height=(c.z[3]-c.z[1])+"%";
  z.title=c.n+" · "+c.t;
  z.innerHTML='<span class="v">✓</span>';
  zones.appendChild(z);
});
function bascule(n){
  if(pris[n]) delete pris[n]; else pris[n]=true;
  var z=zones.querySelector('[data-n="'+n+'"]'); if(z) z.classList.toggle("on",!!pris[n]);
  var li=liste.querySelector('li[data-n="'+n+'"]'); if(li) li.classList.toggle("on",!!pris[n]);
  maj();
}
zones.addEventListener("click",function(e){ var z=e.target.closest(".z"); if(z) bascule(+z.dataset.n); });
liste.addEventListener("click",function(e){ var li=e.target.closest("li[data-n]"); if(li) bascule(+li.dataset.n); });
function maj(){
  var n=Object.keys(pris).length;
  document.getElementById("n").textContent=n;
  document.getElementById("s").textContent=n>1?"s":"";
  document.getElementById("s2").textContent=n>1?"s":"";
  document.getElementById("valider").disabled = n<4;
}
document.getElementById("valider").onclick=function(){
  var l=Object.keys(pris).map(Number).sort(function(a,b){return a-b;});
  var p=document.getElementById("panier");
  p.innerHTML='<b>Mon calendrier</b> · '+l.length+' cases : '+l.map(function(n){
    var c=CASES.find(function(x){return x.n===n;}); return n+" "+c.t; }).join(" · ");
  p.style.display="block";
}
maj();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
