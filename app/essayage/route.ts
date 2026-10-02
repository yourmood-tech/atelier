import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Essai de la bague sur la main.
// La cliente pose son doigt dans un repère dessiné à l'écran : la vraie photo de la bague
// vient se placer dessus, à la bonne taille, sans rien avoir à deviner.
const PAGE = String.raw`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>J'essaie ma Chromaline</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%;background:#0E0E0E;color:#F4F3F1;overflow:hidden}
body{font-family:'Jost','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}
#scene{position:fixed;inset:0;background:#000;overflow:hidden}
#cam{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}

#repere{position:absolute;left:50%;transform:translateX(-50%);pointer-events:none;
  border:2px dashed rgba(255,255,255,.85);border-bottom:0;border-radius:999px 999px 0 0}
#bague{position:absolute;left:50%;transform:translateX(-50%);pointer-events:none;
  filter:drop-shadow(0 3px 8px rgba(0,0,0,.5))}

.haut{position:absolute;top:0;left:0;right:0;padding:calc(14px + env(safe-area-inset-top,0px)) 18px 16px;
  background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,0));text-align:center;pointer-events:none}
.haut .k{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#CFCAC2}
.haut h1{margin:6px 0 0;font-size:19px;font-weight:200;letter-spacing:.01em}
.bas{position:absolute;left:0;right:0;bottom:0;padding:16px 16px calc(18px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,0))}
.msg{text-align:center;font-size:13.5px;font-weight:300;line-height:1.5;color:#EFEBE5;margin-bottom:12px}
.lignes{display:flex;align-items:center;gap:12px;margin-top:6px}
.lignes label{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#B5B0A8;white-space:nowrap;width:72px}
.lignes input{flex:1;accent-color:#F4F3F1}
.ok{display:block;width:100%;height:50px;margin-top:14px;border:0;border-radius:2px;background:#F4F3F1;color:#1A1A1A;
  font-family:inherit;font-size:12px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}
.demarrer{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
  background:#0E0E0E;padding:24px;text-align:center;z-index:5}
.demarrer p{margin:0;max-width:30ch;font-size:15px;font-weight:300;line-height:1.6;color:#CFCAC2}
.demarrer button{height:52px;padding:0 34px;border:0;border-radius:2px;background:#F4F3F1;color:#1A1A1A;
  font-family:inherit;font-size:12px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}
.demarrer h2{margin:0;font-size:26px;font-weight:200;letter-spacing:-.01em}
.cache{display:none!important}
</style>
</head><body>

<div id="scene">
  <video id="cam" autoplay muted playsinline></video>
  <div id="repere"></div>
  <img id="bague" src="/essayage/chromaline.png" alt="Chromaline">
  <div class="haut"><div class="k">mood</div><h1>J'essaie ma Chromaline</h1></div>
  <div class="bas">
    <div class="msg" id="msg">Pose ton annulaire dans le repère, bien droit,<br>jusqu'à en remplir toute la largeur.</div>
    <div id="reglages">
      <div class="lignes"><label for="larg">Largeur</label><input id="larg" type="range" min="60" max="190" value="110"></div>
      <div class="lignes"><label for="pos">Hauteur</label><input id="pos" type="range" min="25" max="72" value="55"></div>
      <button class="ok" id="ok">C'est en place</button>
    </div>
  </div>
</div>

<div class="demarrer" id="demarrer">
  <h2>J'essaie ma Chromaline</h2>
  <p>On allume la caméra, tu poses ton doigt dans le repère, et la bague se met en place. Rien n'est enregistré, rien ne quitte ton téléphone.</p>
  <button id="go">Allumer la caméra</button>
</div>

<script>
(function(){
  var video = document.getElementById('cam');
  var repere = document.getElementById('repere');
  var bague = document.getElementById('bague');
  var msg = document.getElementById('msg');
  var larg = document.getElementById('larg');
  var pos = document.getElementById('pos');
  var reglages = document.getElementById('reglages');

  // une Chromaline fait 9 mm de large, un annulaire environ 17 mm : le rapport ne change jamais
  var RAPPORT = 9 / 17;

  function dessine(){
    var L = window.innerWidth, H = window.innerHeight;
    var doigt = L * 0.17 * (larg.value / 110);
    var y = H * (pos.value / 100);

    // le repere montre le doigt en entier : du bout jusque vers la main
    var hautDoigt = H * 0.13;
    repere.style.width = doigt + 'px';
    repere.style.top = hautDoigt + 'px';
    repere.style.height = (H * 0.74 - hautDoigt) + 'px';

    var l = doigt * 1.06;
    var h = l * RAPPORT;
    bague.style.width = l + 'px';
    bague.style.height = h + 'px';
    bague.style.top = (y - h / 2) + 'px';
  }
  window.addEventListener('resize', dessine);
  larg.addEventListener('input', dessine);
  pos.addEventListener('input', dessine);

  var AIDE = 'Pose ton annulaire dans le repère, bien droit,<br>jusqu\'à en remplir toute la largeur.';
  document.getElementById('ok').addEventListener('click', function(){
    repere.classList.add('cache');
    reglages.classList.add('cache');
    msg.innerHTML = 'Et voilà. Touche l\'écran pour revenir aux réglages.';
    document.getElementById('scene').addEventListener('click', function(){
      repere.classList.remove('cache');
      reglages.classList.remove('cache');
      msg.innerHTML = AIDE;
    }, { once: true });
  });

  document.getElementById('go').addEventListener('click', function(){
    var d = document.getElementById('demarrer');
    d.querySelector('button').textContent = 'Un instant…';
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
    }).then(function(flux){
      video.srcObject = flux;
      return video.play();
    }).then(function(){
      d.remove();
      dessine();
    }).catch(function(){
      d.querySelector('p').textContent = "La caméra n'a pas pu s'allumer. Vérifie que tu l'as autorisée pour ce site.";
      d.querySelector('button').textContent = 'Réessayer';
    });
  });

  // mode démonstration : la vidéo d'une main à la place de la caméra, pour juger le rendu
  if (new URLSearchParams(location.search).has('demo')) {
    var d = document.getElementById('demarrer');
    if (d) d.remove();
    video.src = '/essayage/main.mp4'; video.loop = true; video.muted = true; video.playsInline = true;
    video.play().catch(function(){});
  }
  dessine();
})();
</script>
</body></html>`;

export async function GET() {
  return new NextResponse(PAGE, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
}
