import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Essai de la bague sur la main, par la caméra du téléphone.
// Repérage de la main en local (rien ne sort du téléphone), la bague est posée sur l'annulaire.
const PAGE = String.raw`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>J'essaie ma bague mood</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%;background:#0E0E0E;color:#F4F3F1;overflow:hidden}
body{font-family:'Jost','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}
#scene{position:fixed;inset:0;background:#000}
#cam{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#dessin{position:absolute;inset:0;width:100%;height:100%}
.haut{position:absolute;top:0;left:0;right:0;padding:calc(14px + env(safe-area-inset-top,0px)) 18px 14px;
  background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,0));text-align:center;pointer-events:none}
.haut .k{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#CFCAC2}
.haut h1{margin:6px 0 0;font-size:19px;font-weight:200;letter-spacing:.01em}
.bas{position:absolute;left:0;right:0;bottom:0;padding:16px 18px calc(18px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(0deg,rgba(0,0,0,.62),rgba(0,0,0,0))}
.msg{text-align:center;font-size:13px;font-weight:300;color:#E8E4DE;min-height:20px}
.reglages{display:flex;align-items:center;gap:14px;margin-top:12px}
.reglages label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#CFCAC2;white-space:nowrap}
.reglages input{flex:1;accent-color:#F4F3F1}
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
  <div class="haut"><div class="k">mood</div><h1>J'essaie ma bague</h1></div>
  <div class="bas">
    <div class="msg" id="msg">Montre ta main devant la caméra.</div>

  </div>
</div>

<div class="demarrer" id="demarrer">
  <h2>J'essaie ma bague</h2>
  <p>On va allumer la caméra pour poser la bague sur ton annulaire. Rien n'est enregistré, rien ne quitte ton téléphone.</p>
  <button id="go">Allumer la caméra</button>
</div>

<script type="module">
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const video = document.getElementById('cam');
const cv = document.getElementById('dessin');
const cx = cv.getContext('2d');
const msg = document.getElementById('msg');


const bague = new Image();
bague.src = '/essayage/bague.png';

let detecteur = null;

function cadre(){
  const r = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cv.clientWidth * r);
  cv.height = Math.round(cv.clientHeight * r);
}
window.addEventListener('resize', cadre);

const DEMO = new URLSearchParams(location.search).has('demo');

async function demarre(){
  const d = document.getElementById('demarrer');
  d.querySelector('button').textContent = 'Un instant…';
  try {
    if (DEMO) {
      video.src = '/essayage/main.mp4';
      video.loop = true; video.muted = true; video.playsInline = true;
      await new Promise(r => { video.onloadeddata = r; video.load(); });
      const tt = parseFloat(new URLSearchParams(location.search).get('t') || '0');
      if (tt > 0) { await new Promise(r => { video.onseeked = r; video.currentTime = tt; }); }
      else { await video.play(); }
    } else {
    const flux = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
    });
    video.srcObject = flux;
    await video.play();
    }
    const fichiers = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    detecteur = await HandLandmarker.createFromOptions(fichiers, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: DEMO ? "CPU" : "GPU" },
      runningMode: "VIDEO", numHands: 1
    });
    d.remove();
    cadre();
    if (DEMO) { for (let i=0;i<6;i++){ await new Promise(r=>setTimeout(r,120)); tour(); } setInterval(tour, 90); }
    else requestAnimationFrame(boucle);
  } catch (e) {
    if (DEMO) { msg.textContent = 'ERR ' + (e && e.message ? e.message : e); }
    d.querySelector('p').textContent = "La caméra n'a pas pu s'allumer. Vérifie que tu l'as autorisée pour ce site.";
    d.querySelector('button').textContent = 'Réessayer';
  }
}
document.getElementById('go').addEventListener('click', demarre);
if (DEMO) demarre();

// la vidéo est affichée en « remplir le cadre » : on calcule le même recadrage pour le dessin
function place(x, y){
  const vw = video.videoWidth, vh = video.videoHeight;
  const cw = cv.width, ch = cv.height;
  const e = Math.max(cw / vw, ch / vh);
  const dw = vw * e, dh = vh * e;
  const ox = (cw - dw) / 2, oy = (ch - dh) / 2;
  return [ox + x * dw, oy + y * dh];
}

let dernier = -1;
// lissage : la bague suit la main sans trembler
let L = null;
function lisse(o, k){
  if (!L) { L = Object.assign({}, o); return L; }
  for (const c in o){
    if (c === 'a'){ // l'angle : on passe par le plus court chemin
      let d = o.a - L.a;
      while (d >  Math.PI) d -= 2*Math.PI;
      while (d < -Math.PI) d += 2*Math.PI;
      L.a += d * k;
    } else L[c] += (o[c] - L[c]) * k;
  }
  return L;
}

function boucle(t){
  requestAnimationFrame(boucle);
  if (t === dernier) return;
  dernier = t;
  tour();
}

function tour(){
  if (!detecteur || video.readyState < 2) return;
  if (cv.width !== cv.clientWidth * Math.min(window.devicePixelRatio||1,2)) cadre();

  const res = detecteur.detectForVideo(video, performance.now());
  cx.clearRect(0, 0, cv.width, cv.height);

  if (!res.landmarks || !res.landmarks.length) {
    msg.textContent = DEMO ? ('aucune main — image ' + video.currentTime.toFixed(1) + 's') : "Montre ta main devant la caméra.";
    return;
  }
  msg.textContent = "Tourne doucement la main pour voir la bague sous tous les angles.";

  const m = res.landmarks[0];
  const base = m[13];   // depart de l'annulaire
  const pli  = m[14];   // premiere articulation
  const majB = m[9];    // depart du majeur
  const aurB = m[17];   // depart de l'auriculaire

  const [bx, by] = place(base.x, base.y);
  const [px, py] = place(pli.x, pli.y);
  const [mx, my] = place(majB.x, majB.y);
  const [ax, ay] = place(aurB.x, aurB.y);

  // largeur du doigt : moyenne des deux ecarts entre departs de doigts voisins
  const doigt = 0.5 * (Math.hypot(mx - bx, my - by) + Math.hypot(ax - bx, ay - by));

  const brut = {
    x: bx + (px - bx) * 0.34,
    y: by + (py - by) * 0.34,
    a: Math.atan2(py - by, px - bx) - Math.PI / 2,
    d: doigt
  };
  const S = lisse(brut, 0.25);

  if (bague.complete && bague.naturalWidth) {
    const w = S.d * 1.06;                                       // la bague epouse le doigt
    const h = w * (bague.naturalHeight / bague.naturalWidth);   // ses 9 mm de large

    cx.save();
    cx.translate(S.x, S.y);
    cx.rotate(S.a);

    // ombre : elle epouse la forme de la bague, pas un rectangle
    cx.save();
    cx.globalAlpha = 0.5;
    cx.filter = 'blur(' + Math.max(2, w * 0.045) + 'px) brightness(0)';
    cx.drawImage(bague, -w / 2, -h / 2 + h * 0.10, w, h);
    cx.restore();

    cx.drawImage(bague, -w / 2, -h / 2, w, h);

    // les bords s'enroulent autour du doigt : on les assombrit
    const g1 = cx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g1.addColorStop(0,    'rgba(0,0,0,.45)');
    g1.addColorStop(0.14, 'rgba(0,0,0,0)');
    g1.addColorStop(0.86, 'rgba(0,0,0,0)');
    g1.addColorStop(1,    'rgba(0,0,0,.45)');
    cx.globalCompositeOperation = 'source-atop';
    cx.fillStyle = g1;
    cx.fillRect(-w / 2, -h / 2, w, h);
    cx.globalCompositeOperation = 'source-over';

    cx.restore();
  }
}
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
