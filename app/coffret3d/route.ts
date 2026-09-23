export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>mood — coffret bague 3D</title><meta name="robots" content="noindex,nofollow"></head><body style="margin:0">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Poppins:wght@300;400;500&display=swap">
<style>
:root{
  --serif:'Playfair Display','Times New Roman',serif;
  --sans:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
  --paper:#fbfaf8; --ink:#191917; --mid:#8b8880; --line:#e6e0d6; --c:#49c6c6;
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-weight:300}
h1,p{margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:clamp(22px,3vw,40px) 24px}
.tete{text-align:center;margin-bottom:clamp(14px,2vw,22px)}
.eyebrow{display:block;font-size:10px;letter-spacing:3.2px;text-transform:uppercase;color:var(--mid);margin-bottom:10px}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(28px,4vw,50px);line-height:1.1}
.sous{color:var(--mid);font-size:14px;margin-top:10px}

.scene{
  position:relative;background:#f4f4f2;border:1px solid var(--line);border-radius:8px;
  overflow:hidden;aspect-ratio:16/10;min-height:340px;cursor:grab;
}
.scene.tient{cursor:grabbing}
.scene canvas{display:block;width:100%;height:100%}
.aide{
  position:absolute;left:50%;bottom:12px;transform:translateX(-50%);
  font-size:10.5px;letter-spacing:2.2px;text-transform:uppercase;color:var(--mid);
  background:rgba(255,255,255,.88);padding:7px 14px;border-radius:999px;pointer-events:none;
}
.barre{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px}
.bt{
  font:inherit;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;cursor:pointer;
  background:#fff;border:1px solid var(--line);border-radius:999px;padding:11px 22px;color:var(--ink);
  transition:border-color .2s,background .2s,color .2s;
}
.bt:hover{border-color:var(--c)}
.bt[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}

.reglages{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;
  margin-top:clamp(18px,2.4vw,28px);
}
.reg{background:#fff;border:1px solid var(--line);border-radius:6px;padding:16px 18px}
.reg label{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:12px;color:var(--mid)}
.reg b{font-family:var(--serif);font-weight:400;font-size:20px;color:var(--ink)}
.reg input{width:100%;margin-top:10px;accent-color:var(--c)}
.fixe{background:#fff;border:1px dashed var(--line)}
.note{margin-top:18px;font-size:12.5px;color:var(--mid);text-align:center;line-height:1.7}
</style>

<div class="wrap">
  <div class="tete">
    <span class="eyebrow">mood · maquette</span>
    <h1>Le coffret bague</h1>
    <p class="sous">Fais-le tourner avec la souris. Règle les mesures toi-même, en centimètres.</p>
  </div>

  <div class="scene" id="scene"><span class="aide">Glisse pour tourner · molette pour zoomer</span></div>

  <div class="barre">
    <button class="bt" id="btTourne" aria-pressed="true" type="button">Rotation auto</button>
    <button class="bt" id="btOuvre" type="button">Ouvrir les tiroirs</button>
  </div>

  <div class="reglages">
    <div class="reg fixe">
      <label>Diamètre extérieur <b>15,28 cm</b></label>
    </div>
    <div class="reg fixe">
      <label>Face du tiroir <b>3 × 3 cm</b></label>
    </div>
    <div class="reg">
      <label>Hauteur du coffret <b id="vH">6,0 cm</b></label>
      <input type="range" id="rH" min="30" max="100" value="60">
    </div>
    <div class="reg">
      <label>Diamètre du trou <b id="vT">9,5 cm</b></label>
      <input type="range" id="rT" min="50" max="125" value="95">
    </div>
    <div class="reg">
      <label>Nombre de tiroirs <b id="vN">8</b></label>
      <input type="range" id="rN" min="4" max="16" value="8">
    </div>
    <div class="reg">
      <label>Profondeur du tiroir <b id="vP">1,6 cm</b></label>
      <input type="range" id="rP" min="8" max="30" value="16">
    </div>
  </div>

  <p class="note">Seul le diamètre extérieur et la face des tiroirs sont fixés — ce sont tes chiffres. Tout le reste se règle ci-dessus : bouge les curseurs jusqu'à ce que ce soit juste, et dis-moi les valeurs.</p>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function(){
  var hote=document.getElementById('scene');
  if(!window.THREE || !hote) return;

  var D_EXT=15.28, R_EXT=D_EXT/2;        /* centimètres */
  var FACE=3.0;                           /* face du tiroir : 3 × 3 cm */

  var scene=new THREE.Scene(); scene.background=new THREE.Color(0xf4f4f2);
  var cam=new THREE.PerspectiveCamera(34, 16/10, 0.5, 400);
  var moteur=new THREE.WebGLRenderer({antialias:true});
  moteur.setPixelRatio(Math.min(window.devicePixelRatio,2));
  hote.appendChild(moteur.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.30));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9cfd2, 0.55));
  var l1=new THREE.DirectionalLight(0xffffff, 0.95); l1.position.set(18,26,22); scene.add(l1);
  var l2=new THREE.DirectionalLight(0xffffff, 0.38); l2.position.set(-22,8,-14); scene.add(l2);
  var l3=new THREE.DirectionalLight(0xffffff, 0.22); l3.position.set(4,-18,10); scene.add(l3);

  var laque=new THREE.MeshStandardMaterial({color:0x4fc7c7, metalness:0.12, roughness:0.16});
  var laqueClaire=new THREE.MeshStandardMaterial({color:0x62d4d2, metalness:0.10, roughness:0.20});
  var creux=new THREE.MeshStandardMaterial({color:0x1b6a6b, metalness:0.05, roughness:0.75});
  var sol=new THREE.Mesh(new THREE.PlaneGeometry(200,200),
          new THREE.MeshStandardMaterial({color:0xececeb, metalness:0, roughness:0.95}));
  sol.rotation.x=-Math.PI/2; sol.position.y=-0.01; scene.add(sol);

  var objet=new THREE.Group(); scene.add(objet);
  var lesTiroirs=[];

  function construire(H, D_TROU, N, PROF){
    while(objet.children.length) objet.remove(objet.children[0]);
    lesTiroirs=[];
    var R_INT=D_TROU/2, r=Math.min(1.5, H/2.6);

    /* le corps : profil arrondi tourné autour de l'axe */
    var p=[], n=10;
    p.push(new THREE.Vector2(R_INT, 0));
    p.push(new THREE.Vector2(R_EXT-r, 0));
    for(var i=1;i<=n;i++){ var a=-Math.PI/2+(Math.PI/2)*(i/n);
      p.push(new THREE.Vector2(R_EXT-r+Math.cos(a)*r, r+Math.sin(a)*r)); }
    p.push(new THREE.Vector2(R_EXT, H-r));
    for(var j=1;j<=n;j++){ var b=(Math.PI/2)*(j/n);
      p.push(new THREE.Vector2(R_EXT-r+Math.cos(b)*r, H-r+Math.sin(b)*r)); }
    p.push(new THREE.Vector2(R_INT+0.35, H));
    p.push(new THREE.Vector2(R_INT, H-0.5));
    p.push(new THREE.Vector2(R_INT, 0));
    var corps=new THREE.Mesh(new THREE.LatheGeometry(p,180), laque);
    objet.add(corps);

    /* la bande plate où sortent les tiroirs */
    var hBande=FACE+0.5;
    var bande=new THREE.Mesh(
      new THREE.CylinderGeometry(R_EXT-0.05, R_EXT-0.05, hBande, 180, 1, true), laqueClaire);
    bande.position.y=H/2; objet.add(bande);

    /* les tiroirs */
    for(var k=0;k<N;k++){
      var ang=(k/N)*Math.PI*2;
      var g=new THREE.Group(); g.rotation.y=ang; objet.add(g);

      /* le logement sombre */
      var lg=new THREE.Mesh(new THREE.BoxGeometry(FACE, FACE, PROF), creux);
      lg.position.set(0, H/2, R_EXT-0.05-PROF/2); g.add(lg);

      /* le tiroir lui-même : corps + façade + encoche */
      var t=new THREE.Group(); g.add(t);
      var corpsT=new THREE.Mesh(new THREE.BoxGeometry(FACE-0.12, FACE-0.12, PROF-0.1), laqueClaire);
      corpsT.position.set(0, H/2, R_EXT-0.05-PROF/2); t.add(corpsT);
      var faceT=new THREE.Mesh(new THREE.BoxGeometry(FACE, FACE, 0.22), laque);
      faceT.position.set(0, H/2, R_EXT-0.05+0.11); t.add(faceT);
      var enc=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.3,20), creux);
      enc.rotation.x=Math.PI/2; enc.position.set(FACE/2-0.55, H/2, R_EXT+0.05); t.add(enc);

      lesTiroirs.push(t);
    }
    objet.position.y=0;
  }

  var H=6.0, D_TROU=9.5, N=8, PROF=1.6;
  construire(H, D_TROU, N, PROF);

  cam.position.set(0, 11, 30); cam.lookAt(0, 2.6, 0);
  objet.rotation.y=0.35;

  function taille(){ var w=hote.clientWidth,h=hote.clientHeight;
    moteur.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); }
  taille(); window.addEventListener('resize', taille);

  var tient=false, xP=0, yP=0, auto=true, ouvert=false, inclin=0.35;
  hote.addEventListener('pointerdown', function(e){ tient=true; hote.classList.add('tient'); xP=e.clientX; yP=e.clientY; });
  window.addEventListener('pointerup', function(){ tient=false; hote.classList.remove('tient'); });
  window.addEventListener('pointermove', function(e){
    if(!tient) return;
    objet.rotation.y += (e.clientX-xP)*0.01;
    inclin = Math.max(-0.2, Math.min(1.2, inclin + (e.clientY-yP)*0.006));
    cam.position.y = 4 + inclin*22; cam.lookAt(0, 2.6, 0);
    xP=e.clientX; yP=e.clientY;
  });
  hote.addEventListener('wheel', function(e){
    e.preventDefault();
    cam.position.z=Math.max(14, Math.min(70, cam.position.z + e.deltaY*0.03));
    cam.lookAt(0,2.6,0);
  }, {passive:false});

  var bT=document.getElementById('btTourne'), bO=document.getElementById('btOuvre');
  bT.addEventListener('click', function(){ auto=!auto; bT.setAttribute('aria-pressed', auto?'true':'false'); });
  bO.addEventListener('click', function(){ ouvert=!ouvert; bO.setAttribute('aria-pressed', ouvert?'true':'false'); });

  function curseur(id, aff, min, div, unite, maj){
    var r=document.getElementById(id), v=document.getElementById(aff);
    function montre(){
      var x=parseFloat(r.value)/div;
      v.textContent = unite==='cm' ? x.toFixed(1).replace('.',',')+' cm' : String(Math.round(x));
      maj(x);
    }
    r.addEventListener('input', montre); montre();
  }
  function refaire(){ construire(H, D_TROU, N, PROF); }
  curseur('rH','vH',0,10,'cm', function(x){ H=x; refaire(); });
  curseur('rT','vT',0,10,'cm', function(x){ D_TROU=Math.min(x, D_EXT-2.2); refaire(); });
  curseur('rN','vN',0,1,'n',  function(x){ N=Math.round(x); refaire(); });
  curseur('rP','vP',0,10,'cm', function(x){ PROF=x; refaire(); });

  function boucle(){
    requestAnimationFrame(boucle);
    if(auto && !tient) objet.rotation.y += 0.004;
    for(var i=0;i<lesTiroirs.length;i++){
      var but = ouvert ? PROF*0.8 : 0;
      lesTiroirs[i].position.z += (but - lesTiroirs[i].position.z)*0.08;
    }
    moteur.render(scene, cam);
  }
  boucle();
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0, must-revalidate' } });
}
