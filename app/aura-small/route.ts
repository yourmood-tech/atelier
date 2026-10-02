import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const PAGE = String.raw`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aura small — mood</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{margin:0;background:#F4F3F1;color:#1A1A1A;font-family:'Jost','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}
.tete{padding:48px 24px 10px;text-align:center}
.tete .k{font-size:10px;letter-spacing:.42em;text-transform:uppercase;color:#8C8880}
.tete h1{font-size:clamp(30px,4.4vw,50px);font-weight:200;letter-spacing:-.02em;margin:10px 0 0}
.wrap{max-width:1500px;margin:0 auto;padding:18px 24px 60px;display:flex;gap:30px;align-items:flex-start}
.gauche{flex:0 0 440px;position:sticky;top:20px}
.photo{position:relative;width:440px;height:440px;border-radius:4px;overflow:hidden;background:#EDEBE8}
.photo img{width:100%;height:100%;object-fit:cover;display:block}
.nom{margin-top:14px;font-size:19px;font-weight:300}
.lab{font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:#8C8880;margin:20px 0 10px}
.pal{display:flex;gap:10px}
.pa{width:42px;height:42px;border-radius:50%;border:1px solid rgba(0,0,0,.18);cursor:pointer;padding:0;transition:.18s}
.pa:hover{transform:scale(1.1)}
.pa.on{box-shadow:0 0 0 2px #fff,0 0 0 4px #1A1A1A}
.sub{margin-top:9px;font-size:13px;color:#6B665E}
.droite{flex:1 1 auto}
.g{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.c{cursor:pointer;text-align:center;border:0;background:none;padding:0;font:inherit}
.c .p{display:block;aspect-ratio:1/1;overflow:hidden;border-radius:3px;background:#EDEBE8}
.c .p img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.c:hover .p img{transform:scale(1.06)}
.c.on .p{outline:2px solid #1A1A1A;outline-offset:2px}
.c .n{display:block;margin-top:9px;font-size:12.5px;font-weight:300;color:#1A1A1A}
@media(max-width:1100px){.g{grid-template-columns:repeat(4,1fr)}}
@media(max-width:900px){.wrap{flex-direction:column}.gauche{position:static;flex:1 1 auto;width:100%}.photo{width:100%;height:auto;aspect-ratio:1/1}.g{grid-template-columns:repeat(3,1fr)}}
footer{padding:30px 0 40px;text-align:center;color:#8C8880;font-size:10px;letter-spacing:.24em;text-transform:uppercase}
</style></head><body>
<div class="tete"><div class="k">Version small</div><h1>Je teste mon Aura</h1></div>
<div class="wrap">
  <div class="gauche">
    <div class="photo"><img id="img" src="" alt="Aura"></div>
    <div class="nom" id="nom"></div>
    <div class="lab">La couleur de la base</div>
    <div class="pal" id="base">
      <button type="button" class="pa on" data-b="acier" title="Acier" style="background:#C9CCCF"></button>
      <button type="button" class="pa" data-b="orrose" title="Or rose" style="background:#E2A882"></button>
      <button type="button" class="pa" data-b="noir" title="Noir" style="background:#1B1B1B"></button>
    </div>
    <div class="sub" id="basenom">Acier</div>
  </div>
  <div class="droite"><div class="g" id="grille"></div></div>
</div>
<footer>mood</footer>
<script>
var DATA={"fullblack": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-fullblack-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-fullblack-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-fullblack-noir.jpg?width=1100"}, "obscura": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-obscura-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-obscura-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-obscura-noir.jpg?width=1100"}, "celeste": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-celeste-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-celeste-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-celeste-noir.jpg?width=1100"}, "turquoise": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-lagoon-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-lagoon-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-lagoon-noir.jpg?width=1100"}, "lagoon": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-turquoise-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-turquoise-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-turquoise-noir.jpg?width=1100"}, "royal": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-royal-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-royal-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-royal-noir.jpg?width=1100"}, "caraibe": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-caraibe-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-caraibe-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-caraibe-noir.jpg?width=1100"}, "mentalo": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-mentalo-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-mentalo-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-mentalo-noir.jpg?width=1100"}, "desbois": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-desbois-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-desbois-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-desbois-noir.jpg?width=1100"}, "indonesie": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-indonesie-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-indonesie-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-indonesie-noir.jpg?width=1100"}, "champagne": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-champagne-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-champagne-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-champagne-noir.jpg?width=1100"}, "ambre": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-ambre-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-ambre-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-ambre-noir.jpg?width=1100"}, "kabricot": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-kabricot-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-kabricot-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-kabricot-noir.jpg?width=1100"}, "sakura": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-sakura-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-sakura-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-sakura-noir.jpg?width=1100"}, "soraura": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-soraura-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-soraura-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-soraura-noir.jpg?width=1100"}, "fushia": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-fushia-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-fushia-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-fushia-noir.jpg?width=1100"}, "rubis": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-rubis-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-rubis-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-rubis-noir.jpg?width=1100"}, "rosegold": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-rosegold-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-rosegold-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-rosegold-noir.jpg?width=1100"}, "authentique": {"acier": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-authentique-acier.jpg?width=1100", "orrose": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-authentique-orrose.jpg?width=1100", "noir": "https://cdn.shopify.com/s/files/1/0798/2303/files/aura-cfg-small-authentique-noir.jpg?width=1100"}}, NOM={"fullblack": "Obscura Full Black", "obscura": "Obscura", "celeste": "Céleste", "turquoise": "Turquoise", "lagoon": "Lagoon", "royal": "Royal", "caraibe": "Caraïbe", "mentalo": "Mentalo", "desbois": "des Bois", "indonesie": "Indonésie", "champagne": "Champagne", "ambre": "Ambre", "kabricot": "Kabricot", "sakura": "Sakura", "soraura": "SorAura", "fushia": "Fushia", "rubis": "Rubis", "rosegold": "Authentique Rose Gold", "authentique": "Authentique"}, ORDRE=["fullblack", "obscura", "celeste", "turquoise", "lagoon", "royal", "caraibe", "mentalo", "desbois", "indonesie", "champagne", "ambre", "kabricot", "sakura", "soraura", "fushia", "rubis", "rosegold", "authentique"];
var BN={acier:'Acier',orrose:'Or rose',noir:'Noir'};
var a=ORDRE[0], b='acier';
var grille=document.getElementById('grille');
ORDRE.forEach(function(k){
  var el=document.createElement('button');
  el.type='button'; el.className='c'; el.dataset.a=k;
  el.innerHTML='<span class="p"><img src="'+DATA[k].acier+'" alt="'+NOM[k]+'"></span><span class="n">'+NOM[k]+'</span>';
  el.addEventListener('click', function(){ a=k; rendu(); });
  grille.appendChild(el);
});
Array.prototype.forEach.call(document.querySelectorAll('#base .pa'), function(x){
  x.addEventListener('click', function(){ b=x.dataset.b; rendu(); });
});
function rendu(){
  if(!DATA[a][b]) b='acier';
  document.getElementById('img').src=DATA[a][b];
  document.getElementById('nom').textContent=NOM[a];
  document.getElementById('basenom').textContent=BN[b];
  Array.prototype.forEach.call(document.querySelectorAll('#base .pa'), function(x){ x.className='pa'+(x.dataset.b===b?' on':''); });
  Array.prototype.forEach.call(document.querySelectorAll('.c'), function(x){ x.className='c'+(x.dataset.a===a?' on':''); });
  Array.prototype.forEach.call(document.querySelectorAll('.c img'), function(x){ var k=x.parentNode.parentNode.dataset.a; x.src=DATA[k][b]||DATA[k].acier; });
}
rendu();
</script>
</body></html>`;
export async function GET() {
  return new NextResponse(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
}
