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
    <div class="reglages">
      <label for="taille">Taille</label>
      <input id="taille" type="range" min="60" max="190" value="118">
      <label for="haut">Position</label>
      <input id="haut" type="range" min="10" max="70" value="38">
    </div>
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
const taille = document.getElementById('taille');
const haut = document.getElementById('haut');

const bague = new Image();
bague.src = '/essayage/bague.png';

let detecteur = null;

function cadre(){
  const r = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cv.clientWidth * r);
  cv.height = Math.round(cv.clientHeight * r);
}
window.addEventListener('resize', cadre);

document.getElementById('go').addEventListener('click', async () => {
  const d = document.getElementById('demarrer');
  d.querySelector('button').textContent = 'Un instant…';
  try {
    const flux = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
    });
    video.srcObject = flux;
    await video.play();
    const fichiers = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    detecteur = await HandLandmarker.createFromOptions(fichiers, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO", numHands: 1
    });
    d.remove();
    cadre();
    requestAnimationFrame(boucle);
  } catch (e) {
    d.querySelector('p').textContent = "La caméra n'a pas pu s'allumer. Vérifie que tu l'as autorisée pour ce site.";
    d.querySelector('button').textContent = 'Réessayer';
  }
});

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

function boucle(t){
  requestAnimationFrame(boucle);
  if (!detecteur || video.readyState < 2) return;
  if (cv.width !== cv.clientWidth * Math.min(window.devicePixelRatio||1,2)) cadre();
  if (t === dernier) return;
  dernier = t;

  const res = detecteur.detectForVideo(video, performance.now());
  cx.clearRect(0, 0, cv.width, cv.height);

  if (!res.landmarks || !res.landmarks.length) {
    msg.textContent = "Montre ta main devant la caméra.";
    return;
  }
  msg.textContent = "Tourne doucement la main pour voir la bague sous tous les angles.";

  const m = res.landmarks[0];
  const base = m[13];   // depart de l'annulaire
  const pli  = m[14];   // premiere articulation
  const majB = m[9];    // depart du majeur, pour mesurer la largeur du doigt

  const [bx, by] = place(base.x, base.y);
  const [px, py] = place(pli.x, pli.y);
  const [mx, my] = place(majB.x, majB.y);

  // la bague se pose entre la base et le pli, un peu au-dessus de la base
  const f = haut.value / 100;
  const cxp = bx + (px - bx) * f;
  const cyp = by + (py - by) * f;

  // largeur du doigt estimee par l'ecart entre annulaire et majeur
  const ecart = Math.hypot(mx - bx, my - by);
  const largeur = ecart * (taille.value / 100);

  const angle = Math.atan2(py - by, px - bx) - Math.PI / 2;

  if (bague.complete && bague.naturalWidth) {
    const ratio = bague.naturalHeight / bague.naturalWidth;
    const w = largeur, h = w * ratio;

    // 1 — la bague
    cx.save();
    cx.translate(cxp, cyp);
    cx.rotate(angle);
    cx.shadowColor = 'rgba(0,0,0,.4)';
    cx.shadowBlur = w * 0.05;
    cx.shadowOffsetY = w * 0.015;
    cx.drawImage(bague, -w / 2, -h / 2, w, h);
    cx.restore();

    // 2 — le doigt repasse par-dessus la moitie de la bague qui passe derriere lui
    const vw = video.videoWidth, vh = video.videoHeight;
    const ech = Math.max(cv.width / vw, cv.height / vh);
    const dw2 = vw * ech, dh2 = vh * ech;
    const ox2 = (cv.width - dw2) / 2, oy2 = (cv.height - dh2) / 2;
    const doigt = ecart * 0.62;        // largeur du doigt
    cx.save();
    cx.translate(cxp, cyp);
    cx.rotate(angle);
    cx.beginPath();
    cx.rect(-doigt / 2, -h * 0.75, doigt, h * 0.72);   // la bande du doigt, cote main
    cx.clip();
    cx.rotate(-angle);
    cx.translate(-cxp, -cyp);
    cx.drawImage(video, ox2, oy2, dw2, dh2);
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
