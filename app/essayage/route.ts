import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Essai de la bague sur la main — la bague est construite en volume et éclairée par un studio virtuel.
// Le repérage de la main se fait sur le téléphone : rien n'est envoyé ailleurs.
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
#gl{position:absolute;inset:0;width:100%;height:100%}
.haut{position:absolute;top:0;left:0;right:0;padding:calc(14px + env(safe-area-inset-top,0px)) 18px 14px;
  background:linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,0));text-align:center;pointer-events:none}
.haut .k{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#CFCAC2}
.haut h1{margin:6px 0 0;font-size:19px;font-weight:200;letter-spacing:.01em}
.bas{position:absolute;left:0;right:0;bottom:0;padding:14px 14px calc(16px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(0deg,rgba(0,0,0,.66),rgba(0,0,0,0))}
.msg{text-align:center;font-size:13px;font-weight:300;color:#E8E4DE;min-height:19px;margin-bottom:8px}
.pal{display:flex;gap:9px;overflow-x:auto;padding:2px 2px 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.pal::-webkit-scrollbar{display:none}
.pa{flex:0 0 auto;width:36px;height:36px;border-radius:50%;border:2px solid transparent;background-size:cover;
  background-position:center;cursor:pointer;padding:0;outline:none}
.pa.on{border-color:#F4F3F1}
.lig{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#A9A49C;margin:7px 0 4px;text-align:center}
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
  <canvas id="gl"></canvas>
  <div class="haut"><div class="k">mood</div><h1>J'essaie ma Chromaline</h1></div>
  <div class="bas">
    <div class="msg" id="msg">Montre ta main devant la caméra.</div>
    <div class="lig">La couleur des minis</div>
    <div class="pal" id="palCanal"></div>
  </div>
</div>

<div class="demarrer" id="demarrer">
  <h2>J'essaie ma Chromaline</h2>
  <p>On va allumer la caméra pour poser la bague sur ton annulaire. Rien n'est enregistré, rien ne quitte ton téléphone.</p>
  <button id="go">Allumer la caméra</button>
</div>

<script type="importmap">
{"imports":{
  "three":"https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/"
}}
</script>
<script>
window.addEventListener('error', function(e){
  var d=document.getElementById('demarrer');
  if(d) d.querySelector('p').textContent='Souci de chargement : '+(e.message||'');
});
</script>
<script type="module">
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const video = document.getElementById('cam');
const toile = document.getElementById('gl');
const msg   = document.getElementById('msg');

/* ---------- le studio et la bague en volume ---------- */

const rendu = new THREE.WebGLRenderer({ canvas: toile, alpha: true, antialias: true });
rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
rendu.toneMapping = THREE.ACESFilmicToneMapping;
rendu.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const cam3d = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000);
cam3d.position.set(0, 0, 1000);

// un studio virtuel : deux boites a lumiere au-dessus, un sol sombre.
// C'est ce decor qui donne a l'acier ses stries claires et sombres.
function studio(){
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  const ciel = x.createLinearGradient(0, 0, 0, 512);
  ciel.addColorStop(0.00, '#9A9A9E'); ciel.addColorStop(0.42, '#6E6E72');
  ciel.addColorStop(0.52, '#232326'); ciel.addColorStop(1.00, '#0C0C0E');
  x.fillStyle = ciel; x.fillRect(0, 0, 1024, 512);
  // les deux boites a lumiere
  for (const [cx, cy, w, h] of [[300, 120, 360, 120], [760, 150, 300, 100]]) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, '#E9E9EC'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, w, h, 0, 0, 6.3); x.fill();
  }
  // un reflet sombre horizontal : c'est lui qui dessine la ligne noire sur le metal poli
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 248, 1024, 26);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const pmrem = new THREE.PMREMGenerator(rendu);
scene.environment = pmrem.fromEquirectangular(studio()).texture;

// un grain fin, pour l'aluminium brosse des bandes de couleur
function grainBrosse(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 512, 32);
  for (let i = 0; i < 2600; i++) {
    const v = 120 + Math.random() * 110;
    x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.5)';
    x.fillRect(Math.random() * 512, Math.random() * 32, 1 + Math.random() * 14, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 1);
  return t;
}

const key  = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-1, 2, 2);  scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(2, -1, 1); scene.add(fill);

const METAUX = {
  acier:  { color: 0xD8DADC, roughness: 0.055 },
  orrose: { color: 0xE0A585, roughness: 0.075 },
  noir:   { color: 0x2A2A2C, roughness: 0.075 }
};
const CANAUX = {
  acier: 0xA8ADB1, turquoise: 0x3FB3B2, belipastel: 0xCF94C8, rouge: 0xC2424F,
  marine: 0x3F4B80, emeraude: 0x1F7A68, abricot: 0xD99C6D
};

// Cotes reelles d'une Chromaline taille 58 :
//   tour interieur 58 mm  ->  diametre interieur 18.46 mm
//   epaisseur du metal 1.5 mm  ->  diametre exterieur 21.46 mm
//   largeur totale 9 mm, lue dans la tranche : acier 2.0 | couleur 1.4 | pierres 2.2 | couleur 1.4 | acier 2.0
const DEXT = 21.46, U = 2 / DEXT;              // tout est ramene a un rayon exterieur de 1
const R = 1, ri = 18.46 * U / 2, hw = 4.5 * U; // rayon exterieur, rayon interieur, demi-largeur
const aA = 2.0 * U, aC = 1.4 * U, aP = 2.2 * U;
const b1 = hw - aA, b2 = b1 - aC;              // frontieres : acier|couleur a b1, couleur|pierres a b2
const ar = 0.35 * U;                           // arrondi des bords

function revolu(pts){
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 160);
  g.computeVertexNormals();
  return g;
}

const bague = new THREE.Group();

// 1 — le corps en metal : bords arrondis, gorge creusee au centre
const matMetal = new THREE.MeshPhysicalMaterial({
  color: 0xBFC4C8, metalness: 1, roughness: 0.035, envMapIntensity: 1.9
});
const Rg = R - 0.5 * U;                        // fond de la gorge (ou se logent couleur et pierres)
bague.add(new THREE.Mesh(revolu([
  [ri, -hw], [R - ar, -hw], [R, -hw + ar],
  [R, b1], [Rg, b1 - 0.1 * U],
  [Rg, -b1 + 0.1 * U], [R, -b1],
  [R, hw - ar], [R - ar, hw], [ri, hw], [ri, -hw]
].map(([x, y]) => [x, -y])), matMetal));

// 2 — les deux bandes de couleur, mates
const grain = grainBrosse();
const matCanal = new THREE.MeshPhysicalMaterial({
  color: CANAUX.turquoise, metalness: 0.35, roughness: 0.52, roughnessMap: grain,
  envMapIntensity: 0.9
});
for (const sgn of [-1, 1]) {
  const y0 = Math.min(sgn * b1, sgn * b2), y1 = Math.max(sgn * b1, sgn * b2);
  bague.add(new THREE.Mesh(revolu([
    [Rg, y0 + 0.02 * U], [R - 0.08 * U, y0 + 0.12 * U],
    [R - 0.08 * U, y1 - 0.12 * U], [Rg, y1 - 0.02 * U]
  ]), matCanal));
}

// 3 — la rangee de pierres : vrais brillants (table, couronne, pavillon), serties jointives
const matPierre = new THREE.MeshPhysicalMaterial({
  color: 0xFFFFFF, metalness: 0, roughness: 0.01, transmission: 1, thickness: 0.9,
  ior: 2.42, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0,
  envMapIntensity: 3.2, flatShading: true
});
const matGriffe = new THREE.MeshPhysicalMaterial({ color: 0xCFD4D8, metalness: 1, roughness: 0.05, envMapIntensity: 1.8 });

const dp = 2.0 * U, rp = dp / 2;
// un brillant : couronne (du bord vers la table) + pavillon (du bord vers la pointe)
const gCour = new THREE.CylinderGeometry(rp * 0.58, rp, rp * 0.52, 16, 1);
const gPav  = new THREE.ConeGeometry(rp, rp * 1.05, 16, 1);
const gBord = new THREE.CylinderGeometry(rp, rp, rp * 0.09, 16, 1);
const gBille = new THREE.SphereGeometry(rp * 0.21, 10, 8);

const N = Math.max(18, Math.round(Math.PI * (DEXT - 1.5) / 2.0));
const Rp = Rg + rp * 0.40;
for (let i = 0; i < N; i++) {
  const t = (i / N) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
  const dir = new THREE.Vector3(c, 0, sn);
  const poser = (mesh, dist) => {
    mesh.position.copy(dir).multiplyScalar(Rp + dist);
    mesh.lookAt(0, 0, 0); mesh.rotateX(Math.PI / 2);
    bague.add(mesh);
  };
  poser(new THREE.Mesh(gPav,  matPierre), -rp * 0.60);
  poser(new THREE.Mesh(gBord, matPierre), -rp * 0.03);
  poser(new THREE.Mesh(gCour, matPierre),  rp * 0.27);
  // les petites billes qui tiennent la pierre, de chaque cote
  for (const k of [-1, 1]) {
    const b = new THREE.Mesh(gBille, matGriffe);
    const tb = t + (k * Math.PI / N);
    b.position.set(Math.cos(tb) * (Rp + rp * 0.10), 0, Math.sin(tb) * (Rp + rp * 0.10));
    bague.add(b);
  }
}

const porteur = new THREE.Group();
porteur.add(doigt3d);
porteur.add(bague);
porteur.visible = false;
scene.add(porteur);

/* ---------- les choix visibles ---------- */

const BASES = [['acier', 'Acier'], ['orrose', 'Or rose'], ['noir', 'Noir']];
const LISTE_CANAUX = [['acier','Acier froissé'],['turquoise','Turquoise'],['belipastel','Belipastel'],
  ['rouge','Rouge Swiss Edition'],['marine','Bleu Marine'],['emeraude','Émeraude'],['abricot','Abricot']];

function palette(el, liste, couleur, choisi, action){
  el.innerHTML = '';
  liste.forEach(([k, nom]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pa' + (k === choisi ? ' on' : ''); b.title = nom;
    b.style.background = '#' + couleur(k).toString(16).padStart(6, '0');
    b.onclick = () => { action(k); [...el.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); };
    el.appendChild(b);
  });
}
palette(document.getElementById('palCanal'), LISTE_CANAUX, k => CANAUX[k], 'turquoise',
  k => matCanal.color.setHex(CANAUX[k]));

/* ---------- caméra et repérage de la main ---------- */

let detecteur = null;

function cadre(){
  const l = toile.clientWidth, h = toile.clientHeight;
  rendu.setSize(l, h, false);
  cam3d.left = -l / 2; cam3d.right = l / 2; cam3d.top = h / 2; cam3d.bottom = -h / 2;
  cam3d.updateProjectionMatrix();
}
window.addEventListener('resize', cadre);

const DEMO = new URLSearchParams(location.search).has('demo');
const VITRINE = new URLSearchParams(location.search).has('vitrine');

if (VITRINE) {
  document.getElementById('demarrer').remove();
  document.getElementById('cam').style.display = 'none';
  document.querySelector('.bas').style.background = 'none';
  document.getElementById('scene').style.background = '#EFEFEF';
  msg.textContent = '';
  const ang = parseFloat(new URLSearchParams(location.search).get('a') || '28');
  cadre();
  const cote = Math.min(toile.clientWidth, toile.clientHeight) * 0.40;
  porteur.visible = true;
  porteur.position.set(0, 0, 0);
  porteur.scale.setScalar(cote);
  porteur.rotation.set(0, 0, 0);
  porteur.rotateZ(Math.PI / 2);                       // l'axe du trou a l'horizontale
  porteur.rotateX(ang * Math.PI / 180);               // on la tourne de trois quarts
  doigt3d.visible = false;
  const dessine = () => { rendu.render(scene, cam3d); requestAnimationFrame(dessine); };
  dessine();
}

async function demarre(){
  const d = document.getElementById('demarrer');
  d.querySelector('button').textContent = 'Un instant…';
  try {
    if (DEMO) {
      video.src = '/essayage/main.mp4'; video.loop = true; video.muted = true; video.playsInline = true;
      await video.play();
    } else {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
      });
      video.srcObject = flux;
      await video.play();
    }
    const fichiers = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    detecteur = await HandLandmarker.createFromOptions(fichiers, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: DEMO ? "CPU" : "GPU"
      },
      runningMode: "VIDEO", numHands: 1
    });
    d.remove();
    cadre();
    requestAnimationFrame(boucle);
  } catch (e) {
    d.querySelector('p').textContent = "La caméra n'a pas pu s'allumer. Vérifie que tu l'as autorisée pour ce site.";
    d.querySelector('button').textContent = 'Réessayer';
  }
}
document.getElementById('go').addEventListener('click', demarre);

// la vidéo remplit le cadre : on reproduit le même recadrage
function place(x, y){
  const vw = video.videoWidth, vh = video.videoHeight;
  const cw = toile.clientWidth, ch = toile.clientHeight;
  const e = Math.max(cw / vw, ch / vh);
  const dw = vw * e, dh = vh * e;
  return [x * dw - dw / 2, -(y * dh - dh / 2)];
}

const axe = new THREE.Vector3(), nrm = new THREE.Vector3(), xx = new THREE.Vector3(), zz = new THREE.Vector3();
const p0 = new THREE.Vector3(), p5 = new THREE.Vector3(), p17 = new THREE.Vector3();
const a13 = new THREE.Vector3(), a14 = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3();
const mat = new THREE.Matrix4(), cible = new THREE.Quaternion(), pos = new THREE.Vector3();
let ech = 0, pret = false, dernier = -1;

const W3 = (o, p) => o.set(p.x, -p.y, -p.z);

function boucle(t){
  requestAnimationFrame(boucle);
  if (!detecteur || video.readyState < 2) return;
  if (t === dernier) return; dernier = t;

  const res = detecteur.detectForVideo(video, performance.now());

  if (!res.landmarks || !res.landmarks.length) {
    msg.textContent = "Montre ta main devant la caméra.";
    porteur.visible = false;
    rendu.render(scene, cam3d);
    return;
  }
  msg.textContent = "Tourne doucement la main.";
  porteur.visible = true;

  const m = res.landmarks[0];
  const W = res.worldLandmarks[0];

  const [bx, by] = place(m[13].x, m[13].y);
  const [px, py] = place(m[14].x, m[14].y);
  const [mx, my] = place(m[9].x,  m[9].y);
  const [ax, ay] = place(m[17].x, m[17].y);
  const doigt = 0.5 * (Math.hypot(mx - bx, my - by) + Math.hypot(ax - bx, ay - by));

  pos.set(bx + (px - bx) * 0.34, by + (py - by) * 0.34, 0);
  const e = doigt * 0.54;

  // l'axe du trou suit le doigt tel qu'on le voit, et s'incline selon sa profondeur
  W3(a13, W[13]); W3(a14, W[14]);
  u.copy(a14).sub(a13).normalize();                 // direction du doigt dans l'espace
  const dz = Math.max(-0.95, Math.min(0.95, u.z));  // sa part de profondeur
  const plat = Math.sqrt(1 - dz * dz);
  const lx = (px - bx), ly = (py - by), ln = Math.hypot(lx, ly) || 1;
  axe.set(lx / ln * plat, ly / ln * plat, dz).normalize();

  W3(p0, W[0]); W3(p5, W[5]); W3(p17, W[17]);
  u.copy(p5).sub(p0); v.copy(p17).sub(p0);
  nrm.copy(u).cross(v).normalize();
  if (nrm.z < 0) nrm.negate();                      // la paume regarde toujours du bon cote
  zz.copy(nrm).addScaledVector(axe, -nrm.dot(axe));
  if (zz.lengthSq() < 1e-6) zz.set(0, 0, 1).addScaledVector(axe, -axe.z);
  zz.normalize();
  xx.copy(axe).cross(zz).normalize();
  mat.makeBasis(xx, axe, zz);
  cible.setFromRotationMatrix(mat);

  if (!pret) { porteur.quaternion.copy(cible); porteur.position.copy(pos); ech = e; pret = true; }
  else {
    porteur.quaternion.slerp(cible, 0.3);
    porteur.position.lerp(pos, 0.3);
    ech += (e - ech) * 0.25;
  }
  porteur.scale.setScalar(ech);

  rendu.render(scene, cam3d);
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
