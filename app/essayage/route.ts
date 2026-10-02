import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Essai de la bague sur la main.
// La caméra reconnaît la main, la cliente touche le doigt qu'elle veut, et la vraie photo
// de la Chromaline s'accroche à ce doigt-là. Tout se calcule sur le téléphone.
// Réglages éprouvés sur une vraie vidéo de main : la bague se pose à 58 % de la première
// phalange, et sa longueur vaut 55 % de cette phalange.
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
#dessin{position:absolute;inset:0;width:100%;height:100%}
.haut{position:absolute;top:0;left:0;right:0;padding:calc(14px + env(safe-area-inset-top,0px)) 18px 16px;
  background:linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,0));text-align:center;pointer-events:none}
.haut .k{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#CFCAC2}
.haut h1{margin:6px 0 0;font-size:19px;font-weight:200;letter-spacing:.01em}
.bas{position:absolute;left:0;right:0;bottom:0;padding:14px 14px calc(16px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(0deg,rgba(0,0,0,.7),rgba(0,0,0,0));pointer-events:none}
.msg{text-align:center;font-size:13.5px;font-weight:300;line-height:1.5;color:#EFEBE5}
.demarrer{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
  background:#0E0E0E;padding:24px;text-align:center;z-index:5}
.demarrer p{margin:0;max-width:30ch;font-size:15px;font-weight:300;line-height:1.6;color:#CFCAC2}
.demarrer button{height:52px;padding:0 34px;border:0;border-radius:2px;background:#F4F3F1;color:#1A1A1A;
  font-family:inherit;font-size:12px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}
.demarrer h2{margin:0;font-size:26px;font-weight:200;letter-spacing:-.01em}
</style>
</head><body>

<div id="scene">
  <video id="cam" autoplay muted playsinline></video>
  <canvas id="dessin"></canvas>
  <div class="haut"><div class="k">mood</div><h1>J'essaie ma Chromaline</h1></div>
  <div class="bas"><div class="msg" id="msg">Montre ta main bien à plat devant la caméra.</div></div>
</div>

<div class="demarrer" id="demarrer">
  <h2>J'essaie ma Chromaline</h2>
  <p>On allume la caméra, tu montres ta main, puis tu touches le doigt où tu veux la bague. Rien n'est enregistré, rien ne quitte ton téléphone.</p>
  <button id="go">Allumer la caméra</button>
</div>

<script type="module">
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

var video = document.getElementById('cam');
var cv = document.getElementById('dessin');
var cx = cv.getContext('2d');
var msg = document.getElementById('msg');

// réglages éprouvés sur une vraie main
var POS = 0.58;     // où la bague se pose sur la première phalange
// on mesure la vraie largeur du doigt sur l'image, dans une copie réduite de la caméra
var mini = document.createElement('canvas'); mini.width = 320; mini.height = 180;
var mx = mini.getContext('2d', { willReadFrequently: true });
var pix = null;
var DOIGTS = [[2,3,'pouce'],[5,6,'index'],[9,10,'majeur'],[13,14,'annulaire'],[17,18,'auriculaire']];

var bague = new Image();
bague.src = '/essayage/chromaline.png';

var detecteur = null, choisi = -1, L = null, dernier = -1, doigtsEcran = [];

function cadre(){
  var r = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cv.clientWidth * r);
  cv.height = Math.round(cv.clientHeight * r);
}
window.addEventListener('resize', cadre);

function place(x, y){
  var vw = video.videoWidth, vh = video.videoHeight;
  var e = Math.max(cv.width / vw, cv.height / vh);
  var dw = vw * e, dh = vh * e;
  return [(cv.width - dw) / 2 + x * dw, (cv.height - dh) / 2 + y * dh];
}

cv.addEventListener('click', function(ev){
  if (!doigtsEcran.length) return;
  var r = cv.getBoundingClientRect();
  var px = (ev.clientX - r.left) * (cv.width / r.width);
  var py = (ev.clientY - r.top) * (cv.height / r.height);
  var best = -1, dmin = 1e9;
  for (var i = 0; i < doigtsEcran.length; i++) {
    var d = Math.hypot(doigtsEcran[i].cx - px, doigtsEcran[i].cy - py);
    if (d < dmin) { dmin = d; best = i; }
  }
  choisi = best; L = null;
});

function poseBague(){
  var l = L.l, h = l / (bague.naturalWidth / bague.naturalHeight);
  cx.save();
  cx.translate(L.x, L.y);
  cx.rotate(L.a);
  cx.shadowColor = 'rgba(0,0,0,.42)'; cx.shadowBlur = h * 0.45; cx.shadowOffsetY = h * 0.13;
  cx.drawImage(bague, -l / 2, -h / 2, l, h);
  cx.restore();
}

function repere(d){
  cx.save();
  cx.translate(d.cx, d.cy); cx.rotate(d.a);
  cx.strokeStyle = 'rgba(255,255,255,.75)'; cx.lineWidth = Math.max(2, d.l * 0.03);
  cx.setLineDash([d.l * 0.11, d.l * 0.09]);
  cx.beginPath(); cx.moveTo(-d.l / 2, 0); cx.lineTo(d.l / 2, 0); cx.stroke();
  cx.restore();
}

function boucle(t){
  requestAnimationFrame(boucle);
  if (!detecteur || video.readyState < 2) return;
  if (t === dernier) return; dernier = t;
  if (cv.width !== Math.round(cv.clientWidth * Math.min(window.devicePixelRatio||1,2))) cadre();

  var res;
  try { res = detecteur.detectForVideo(video, performance.now()); } catch (e) { return; }
  cx.clearRect(0, 0, cv.width, cv.height);

  if (!res || !res.landmarks || !res.landmarks.length) {
    if (choisi < 0) msg.textContent = "Montre ta main bien à plat devant la caméra.";
    doigtsEcran = [];
    return;
  }

  var m = res.landmarks[0];

  // on photographie une version réduite de l'image pour y mesurer les doigts
  mini.height = Math.round(320 * video.videoHeight / video.videoWidth);
  mx.drawImage(video, 0, 0, mini.width, mini.height);
  try { pix = mx.getImageData(0, 0, mini.width, mini.height); } catch (e) { pix = null; }

  function couleur(x, y){
    var i = (Math.round(y) * pix.width + Math.round(x)) * 4;
    return [pix.data[i], pix.data[i+1], pix.data[i+2]];
  }
  function largeurDoigt(cxn, cyn, ux, uy, maxi){
    if (!pix) return 0;
    var X = cxn * pix.width, Y = cyn * pix.height;
    if (X < 1 || Y < 1 || X > pix.width-2 || Y > pix.height-2) return 0;
    var ref = couleur(X, Y), total = 0;
    for (var sgn = -1; sgn <= 1; sgn += 2) {
      var d = 0;
      while (d < maxi) {
        d++;
        var x = X + ux * d * sgn, y = Y + uy * d * sgn;
        if (x < 0 || y < 0 || x >= pix.width || y >= pix.height) break;
        var p = couleur(x, y);
        if (Math.abs(p[0]-ref[0]) + Math.abs(p[1]-ref[1]) + Math.abs(p[2]-ref[2]) > 78) break;
      }
      total += d;
    }
    return total;
  }
  // une largeur de doigt « type », déduite de la largeur de la main
  var refN = Math.hypot(m[5].x - m[17].x, (m[5].y - m[17].y) * pix.height / pix.width) / 4.2;

  doigtsEcran = DOIGTS.map(function(D){
    var A = place(m[D[0]].x, m[D[0]].y);
    var B = place(m[D[1]].x, m[D[1]].y);
    var cx0 = A[0] + (B[0]-A[0]) * POS, cy0 = A[1] + (B[1]-A[1]) * POS;

    // la mesure se fait dans l'image réduite
    var an = [m[D[0]].x * pix.width, m[D[0]].y * pix.height];
    var bn = [m[D[1]].x * pix.width, m[D[1]].y * pix.height];
    var vx = bn[0]-an[0], vy = bn[1]-an[1];
    var ln = Math.hypot(vx, vy) || 1;
    var ux = -vy/ln, uy = vx/ln;
    var pouce = (D[2] === 'pouce');
    var mxw = refN * pix.width * (pouce ? 2.2 : 1.6);
    var mnw = refN * pix.width * 0.6;
    var mes = largeurDoigt((an[0] + vx*POS)/pix.width, (an[1] + vy*POS)/pix.height, ux, uy, Math.round(mxw*1.4));
    if (!(mes > mnw && mes < mxw)) mes = refN * pix.width * (pouce ? 1.35 : 1.0);

    // on convertit cette mesure en pixels d'écran
    var ech = Math.hypot(B[0]-A[0], B[1]-A[1]) / ln;

    return {
      cx: cx0, cy: cy0,
      a: Math.atan2(B[1]-A[1], B[0]-A[0]) + Math.PI/2,
      l: mes * ech * 1.06,
      nom: D[2]
    };
  });

  if (choisi < 0) {
    msg.textContent = "Touche le doigt où tu veux la bague.";
    doigtsEcran.forEach(repere);
    return;
  }

  var d = doigtsEcran[choisi];
  if (!L) L = { x: d.cx, y: d.cy, a: d.a, l: d.l };
  else {
    var da = d.a - L.a;
    while (da >  Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    L.a += da * 0.3;
    L.x += (d.cx - L.x) * 0.35; L.y += (d.cy - L.y) * 0.35; L.l += (d.l - L.l) * 0.25;
  }
  msg.textContent = "Sur ton " + d.nom + ". Touche un autre doigt pour changer.";
  if (bague.complete && bague.naturalWidth) poseBague();
}

document.getElementById('go').addEventListener('click', async function(){
  var dm = document.getElementById('demarrer');
  dm.querySelector('button').textContent = 'Un instant…';
  try {
    var flux = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
    });
    video.srcObject = flux;
    await video.play();
    var f = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    detecteur = await HandLandmarker.createFromOptions(f, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO", numHands: 1
    });
    dm.remove();
    cadre();
    requestAnimationFrame(boucle);
  } catch (e) {
    dm.querySelector('p').textContent = "Ça n'a pas démarré : " + (e && e.message ? e.message : e);
    dm.querySelector('button').textContent = 'Réessayer';
  }
});
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
