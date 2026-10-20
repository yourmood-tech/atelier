export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Crée ton calendrier mood</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root{--nuit:#16283A;--bleu:#2E5375;--glace:#E3EEF6;--papier:#FAF8F4;--or:#B8912F;--orclair:#E6CB92;--doux:#6A7A86}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{background:linear-gradient(180deg,#2C465E,#16283A 60%);color:#F6F2E9;font-family:Poppins,system-ui,sans-serif;font-weight:300;min-height:100vh}
.wrap{width:min(1180px,100%);margin:0 auto;padding:0 18px}
header.hero{text-align:center;padding:52px 18px 26px}
.kick{font-size:10px;letter-spacing:.42em;text-transform:uppercase;color:var(--orclair)}
h1{font-family:Playfair Display,serif;font-weight:400;font-size:clamp(34px,5.4vw,58px);margin:14px 0 0;line-height:1.08}
h1 em{font-style:italic;color:var(--orclair)}
.sous{max-width:46ch;margin:16px auto 0;font-size:14px;line-height:1.85;color:#CBD9E4}

/* la maison */
.maison{position:relative;margin:34px auto 0;max-width:860px}
.toit{height:0;border-left:430px solid transparent;border-right:430px solid transparent;border-bottom:150px solid #1F3A52;margin:0 auto;filter:drop-shadow(0 -6px 18px rgba(0,0,0,.3))}
.toit-neige{position:absolute;top:0;left:0;right:0;height:150px;pointer-events:none;
  background-image:radial-gradient(2px 2px at 30% 60%,#fff,transparent),radial-gradient(1.6px 1.6px at 55% 40%,#fff,transparent),radial-gradient(1.8px 1.8px at 70% 72%,#fff,transparent);opacity:.5}
.corps{background:linear-gradient(180deg,#24405A,#1B3148);border-radius:0 0 14px 14px;padding:22px;box-shadow:0 26px 70px rgba(0,0,0,.45)}
.portes{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
@media(max-width:760px){.portes{grid-template-columns:repeat(4,1fr);gap:9px}.toit{border-left-width:48vw;border-right-width:48vw;border-bottom-width:92px}}
.porte{position:relative;aspect-ratio:1/1.12;border-radius:9px;border:1px solid rgba(230,203,146,.30);
  background:linear-gradient(170deg,rgba(255,255,255,.07),rgba(255,255,255,.02));cursor:pointer;overflow:hidden;
  display:flex;align-items:center;justify-content:center;transition:.2s}
.porte:hover{border-color:var(--orclair);transform:translateY(-2px)}
.porte .num{font-family:Playfair Display,serif;font-size:clamp(17px,2.2vw,26px);color:var(--orclair)}
.porte.pleine{border-color:rgba(230,203,146,.65)}
.porte.pleine img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.porte.pleine .num{position:absolute;top:5px;left:7px;font-size:12px;color:#fff;text-shadow:0 1px 5px rgba(0,0,0,.8);z-index:2}
.porte .coche{position:absolute;right:5px;bottom:5px;width:18px;height:18px;border-radius:50%;background:var(--orclair);color:#16283A;
  font-size:11px;display:none;align-items:center;justify-content:center;z-index:2}
.porte.pleine .coche{display:flex}

/* le tiroir de choix */
.tiroir{position:fixed;inset:0;background:rgba(10,18,28,.78);display:none;align-items:center;justify-content:center;padding:18px;z-index:50}
.tiroir.on{display:flex}
.boite{background:var(--papier);color:var(--nuit);border-radius:16px;max-width:860px;width:100%;padding:26px;max-height:90vh;overflow:auto}
.boite h3{font-family:Playfair Display,serif;font-weight:400;font-size:26px;margin:0;color:var(--bleu)}
.boite .jour{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:var(--or)}
.choix{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
@media(max-width:700px){.choix{grid-template-columns:repeat(2,1fr)}}
.ch{border:1px solid rgba(46,83,117,.16);border-radius:11px;overflow:hidden;cursor:pointer;background:#fff;transition:.18s;text-align:center}
.ch:hover{border-color:var(--or);transform:translateY(-2px)}
.ch img{width:100%;aspect-ratio:1/1;object-fit:contain;background:#F2F6F9;display:block}
.ch .nm{font-size:10.5px;letter-spacing:.06em;padding:9px 8px 12px;color:#43637E}
.vide{display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;color:#9DB0BF;font-size:11px;background:#F2F6F9}
.fermer{float:right;border:0;background:none;font-size:26px;color:var(--doux);cursor:pointer;line-height:1}

/* la barre du bas */
.barre{position:sticky;bottom:0;margin-top:30px;background:rgba(16,28,42,.94);border-top:1px solid rgba(230,203,146,.25);
  padding:14px 18px;display:flex;align-items:center;justify-content:center;gap:22px;flex-wrap:wrap}
.compte{font-family:Playfair Display,serif;font-size:20px}
.compte b{color:var(--orclair);font-weight:400}
.prix{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#9FB6C7}
.bt{appearance:none;border:1px solid var(--orclair);background:var(--orclair);color:#16283A;font-family:Poppins;font-size:13px;
  letter-spacing:.08em;padding:12px 26px;border-radius:999px;cursor:pointer}
.bt[disabled]{opacity:.35;cursor:default}
.bt.vide{background:none;color:var(--orclair)}
.pied{text-align:center;padding:26px 18px 60px;font-size:11px;color:#8FA6B8;letter-spacing:.1em}
</style></head><body>

<header class="hero">
  <div class="kick">précommande · décembre 2026</div>
  <h1>Crée ton<br><em>calendrier mood</em></h1>
  <p class="sous">Vingt-quatre cases, et derrière chacune le bijou que tu as choisi. Ouvre une case, prends celui qui te parle — on le fabrique pour toi.</p>
</header>

<div class="wrap">
  <div class="maison">
    <div class="toit"></div><div class="toit-neige"></div>
    <div class="corps"><div class="portes" id="portes"></div></div>
  </div>

  <div class="barre">
    <span class="compte"><b id="n">0</b> / 24 cases remplies</span>
    <span class="prix" id="prix">prix à venir</span>
    <button class="bt vide" id="vider">Tout vider</button>
    <button class="bt" id="valider" disabled>Je commande mon calendrier</button>
  </div>

  <p class="pied">Maquette — les pièces proposées et le prix ne sont pas encore définitifs.</p>
</div>

<div class="tiroir" id="tiroir"><div class="boite">
  <button class="fermer" id="fermer">×</button>
  <div class="jour" id="t-jour"></div><h3 id="t-titre"></h3>
  <div class="choix" id="t-choix"></div>
</div></div>

<script>
var CASES=[{"n": 1, "t": "les douceurs", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bague_metallique_a_motifs_ajoures_en_diagonale.png?v=1791289235"}, {"n": 2, "t": "Rencontrent le givre", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Six_anneaux_givres_colores_alignes.png?v=1791289311"}, {"n": 3, "t": "le rouge apparaît", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bracelet_rouge_a_rayures_diagonales.png?v=1791289349"}, {"n": 4, "t": "Avec la neige", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bracelet_givre_aux_flocons_turquoise.png?v=1791289386"}, {"n": 5, "t": "Noël s'éveille", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bracelet_bordeaux_aux_motifs_nordiques.png?v=1791289425"}, {"n": 6, "t": "Vetu de bleu", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/06_vetu_de_bleu.png?v=1791289513"}, {"n": 7, "t": "une lueur", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/07_une_lueur.png?v=1791289546"}, {"n": 8, "t": "brille doucement", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bague_en_acier_aux_flocons_ajoures.png?v=1791289584"}, {"n": 9, "t": "le ciel s'embrase", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Anneaux_pastel_givres_alignes.png?v=1791289644"}, {"n": 10, "t": "sur les Alpes", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bague_blanche_gravee_paysage_hivernal.png?v=1791289690"}, {"n": 11, "t": "Une lumière", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/11_une_lumiere.png?v=1791289751"}, {"n": 12, "t": "Perce la nuit", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Anneau_bleu_glace_grave_d_un_paysage_hivernal.png?v=1791289833"}, {"n": 13, "t": "sous le sapin", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bague_en_resine_givree_aux_motifs_de_pin.png?v=1791289876"}, {"n": 14, "t": "la glace scintille", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/14_la_glace_scintille.png?v=1791289908"}, {"n": 15, "t": "les cerfs avancent", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Anneau_en_titane_grave_foret_doree.png?v=1791289947"}, {"n": 16, "t": "sous les étoiles", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bracelet_bleu_etoile_minimaliste.png?v=1791289983"}, {"n": 17, "t": "un éclat", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/17_un_eclat.png?v=1791290002"}, {"n": 18, "t": "traverse la forêt", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bracelet_metallique_aux_sapins_colores.png?v=1791290040"}, {"n": 19, "t": "les flocons dansent", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Bague_givree_en_acier_et_lilas.png?v=1791290154"}, {"n": 20, "t": "dans le bleu", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/20_dans_le_bleu.png?v=1791290188"}, {"n": 21, "t": "Noël scintille", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Alliance_rose_dore_gravee_de_flocons.png?v=1791290228"}, {"n": 22, "t": "Une dernière fois", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/22_une_derniere_fois.png?v=1791290255"}, {"n": 23, "t": "la magie commence", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/23_la_magie_commence.png?v=1791290279"}, {"n": 24, "t": "a minuit", "img": "https://cdn.shopify.com/s/files/1/0798/2303/files/Capture_d_ecran_2026-10-06_a_14.38.48.png?v=1791290344"}];
var choisi={};
var portes=document.getElementById("portes");
CASES.forEach(function(c){
  var d=document.createElement("div"); d.className="porte"; d.dataset.n=c.n;
  d.innerHTML='<span class="num">'+c.n+'</span><span class="coche">✓</span>';
  d.onclick=function(){ ouvre(c); };
  portes.appendChild(d);
});
var tiroir=document.getElementById("tiroir");
document.getElementById("fermer").onclick=function(){ tiroir.classList.remove("on"); };
tiroir.onclick=function(e){ if(e.target===tiroir) tiroir.classList.remove("on"); };
function ouvre(c){
  document.getElementById("t-jour").textContent=c.n+" décembre";
  document.getElementById("t-titre").textContent=c.t;
  var z=document.getElementById("t-choix"); z.innerHTML="";
  // 4 propositions par case — à remplir avec les vraies pièces
  for(var i=1;i<=4;i++){
    (function(i){
      var e=document.createElement("div"); e.className="ch";
      var img = (i===1 && c.img) ? '<img src="'+c.img+'" alt="">' : '<div class="vide">pièce '+i+'<br>à définir</div>';
      e.innerHTML=img+'<div class="nm">PROPOSITION '+i+'</div>';
      e.onclick=function(){ prend(c,i,(i===1&&c.img)?c.img:null); };
      z.appendChild(e);
    })(i);
  }
  tiroir.classList.add("on");
}
function prend(c,i,img){
  choisi[c.n]={i:i,img:img};
  var p=portes.querySelector('[data-n="'+c.n+'"]');
  p.classList.add("pleine");
  p.innerHTML='<span class="num">'+c.n+'</span><span class="coche">✓</span>'+(img?'<img src="'+img+'" alt="">':'');
  p.onclick=function(){ ouvre(c); };
  tiroir.classList.remove("on");
  maj();
}
function maj(){
  var n=Object.keys(choisi).length;
  document.getElementById("n").textContent=n;
  document.getElementById("valider").disabled = n<24;
}
document.getElementById("vider").onclick=function(){
  choisi={};
  portes.querySelectorAll(".porte").forEach(function(p){
    p.classList.remove("pleine");
    p.innerHTML='<span class="num">'+p.dataset.n+'</span><span class="coche">✓</span>';
  });
  CASES.forEach(function(c){ var p=portes.querySelector('[data-n="'+c.n+'"]'); p.onclick=function(){ouvre(c);} });
  maj();
};
maj();
</script></body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
