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

  // la photo fait 1042 sur 359 : sa hauteur represente les 9 mm de la bague.
  // Un annulaire fait environ 17 mm : la hauteur vaut donc 9/17 de la largeur du doigt,
  // et la longueur suit les proportions de la photo pour que les diamants restent ronds.
  var FORME = 1042 / 359;
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

    var h = doigt * RAPPORT;
    var l = h * FORME;
    bague.style.width = l + 'px';
    bague.style.height = h + 'px';
    bague.style.top = (y - h / 2) + 'px';
  }
  window.addEventListener('resize', dessine);
  larg.addEventListener('input', dessine);
  pos.addEventListener('input', dessine);

  var AIDE = 'Pose ton annulaire dans le repère, bien droit,<br>jusqu\'à en remplir toute la largeur.';
  var suit = false, taillePosee = 0;

  document.getElementById('ok').addEventListener('click', function(){
    taillePosee = window.innerWidth * 0.17 * (larg.value / 110);
    repere.classList.add('cache');
    reglages.classList.add('cache');
    msg.innerHTML = 'La bague suit ta main. Touche l\'écran pour recommencer.';
    suit = true;
    accroche();
    document.getElementById('scene').addEventListener('click', function(){
      suit = false;
      bague.style.transform = 'translateX(-50%)';
      repere.classList.remove('cache');
      reglages.classList.remove('cache');
      msg.innerHTML = AIDE;
      dessine();
    }, { once: true });
  });

  // le suivi de la main : il ne demarre qu'une fois la bague posee
  var detecteur = null, L = null;
  function accroche(){
    if (detecteur) { tourne(); return; }
    import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs').then(function(V){
      return V.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm')
        .then(function(f){
          return V.HandLandmarker.createFromOptions(f, {
            baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
            runningMode: 'VIDEO', numHands: 1
          });
        });
    }).then(function(d){ detecteur = d; tourne(); })
      .catch(function(){ msg.innerHTML = 'La bague reste fixe : le suivi de la main n\'a pas pu démarrer.'; });
  }

  function placeEcran(x, y){
    var vw = video.videoWidth, vh = video.videoHeight;
    var cw = window.innerWidth, ch = window.innerHeight;
    var e = Math.max(cw / vw, ch / vh);
    var dw = vw * e, dh = vh * e;
    return [(cw - dw) / 2 + x * dw, (ch - dh) / 2 + y * dh];
  }

  function tourne(){
    if (!suit) return;
    requestAnimationFrame(tourne);
    if (!detecteur || video.readyState < 2) return;
    var res = detecteur.detectForVideo(video, performance.now());
    if (!res.landmarks || !res.landmarks.length) return;
    var m = res.landmarks[0];
    var b = placeEcran(m[13].x, m[13].y);     // depart de l'annulaire
    var p = placeEcran(m[14].x, m[14].y);     // premiere articulation
    var mj = placeEcran(m[9].x, m[9].y);
    var au = placeEcran(m[17].x, m[17].y);
    var doigt = 0.5 * (Math.hypot(mj[0]-b[0], mj[1]-b[1]) + Math.hypot(au[0]-b[0], au[1]-b[1]));

    var cx = b[0] + (p[0] - b[0]) * 0.34;
    var cy = b[1] + (p[1] - b[1]) * 0.34;
    var ang = Math.atan2(p[1] - b[1], p[0] - b[0]) + Math.PI / 2;

    var o = { x: cx, y: cy, a: ang, d: doigt };
    if (!L) L = Object.assign({}, o);
    else {
      var da = o.a - L.a;
      while (da >  Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      L.a += da * 0.25;
      L.x += (o.x - L.x) * 0.25; L.y += (o.y - L.y) * 0.25; L.d += (o.d - L.d) * 0.2;
    }
    var h = L.d * RAPPORT, l = h * FORME;
    bague.style.width = l + 'px';
    bague.style.height = h + 'px';
    bague.style.left = '0px';
    bague.style.top = '0px';
    bague.style.transform = 'translate(' + (L.x - l/2) + 'px,' + (L.y - h/2) + 'px) rotate(' + L.a + 'rad)';
  }

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
