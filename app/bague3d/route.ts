export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>mood — bague à boîtes 3D</title><meta name="robots" content="noindex,nofollow"></head><body style="margin:0">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Poppins:wght@300;400;500&display=swap">
<style>
:root{
  --serif:'Playfair Display','Times New Roman',serif;
  --sans:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
  --paper:#fbfaf8; --ink:#191917; --mid:#8b8880; --line:#e6e0d6; --c:#4fc3c0;
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-weight:300}
h1,h2,p{margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:clamp(24px,3vw,44px) 24px}
.tete{text-align:center;margin-bottom:clamp(16px,2vw,26px)}
.eyebrow{display:block;font-size:10px;letter-spacing:3.2px;text-transform:uppercase;color:var(--mid);margin-bottom:10px}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(28px,4vw,52px);line-height:1.1}
.sous{color:var(--mid);font-size:14px;margin-top:10px}

.scene{
  position:relative;background:#fff;border:1px solid var(--line);border-radius:8px;
  overflow:hidden;aspect-ratio:16/10;min-height:340px;cursor:grab;
}
.scene.tient{cursor:grabbing}
.scene canvas{display:block;width:100%;height:100%}
.aide{
  position:absolute;left:50%;bottom:14px;transform:translateX(-50%);
  font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:var(--mid);
  background:rgba(255,255,255,.86);padding:7px 14px;border-radius:999px;pointer-events:none;
}

.barre{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:16px}
.bt{
  font:inherit;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;cursor:pointer;
  background:#fff;border:1px solid var(--line);border-radius:999px;padding:11px 22px;color:var(--ink);
  transition:border-color .2s,background .2s,color .2s;
}
.bt:hover{border-color:var(--c)}
.bt[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}

.cotes{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;
  margin-top:clamp(18px,2.4vw,30px);
}
.cote{background:#fff;border:1px solid var(--line);border-radius:6px;padding:16px 18px}
.cote b{display:block;font-family:var(--serif);font-weight:400;font-size:22px}
.cote span{font-size:11.5px;color:var(--mid);letter-spacing:.02em}
.note{margin-top:18px;font-size:12.5px;color:var(--mid);text-align:center;line-height:1.7}
</style>

<div class="wrap">
  <div class="tete">
    <span class="eyebrow">mood · maquette 3D</span>
    <h1>La bague à boîtes</h1>
    <p class="sous">Fais-la tourner avec la souris. Toutes les cotes sont réelles, en millimètres.</p>
  </div>

  <div class="scene" id="scene">
    <span class="aide">Glisse pour tourner · molette pour zoomer</span>
  </div>

  <div class="barre">
    <button class="bt" id="btTourne" aria-pressed="true" type="button">Rotation auto</button>
    <button class="bt" id="btOuvre" type="button">Ouvrir les boîtes</button>
    <button class="bt" id="btCoupe" type="button">Vue en coupe</button>
  </div>

  <div class="cotes">
    <div class="cote"><b>15,28 mm</b><span>diamètre intérieur (taille 48)</span></div>
    <div class="cote"><b>11 mm</b><span>largeur du ruban</span></div>
    <div class="cote"><b>2 mm</b><span>épaisseur du métal</span></div>
    <div class="cote"><b>3 × 3 mm</b><span>chaque boîte</span></div>
    <div class="cote"><b>1,6 mm</b><span>profondeur de la boîte</span></div>
    <div class="cote"><b>10</b><span>boîtes tout autour</span></div>
  </div>

  <p class="note">La largeur du ruban n'était pas connue : j'ai pris 11 mm, la largeur d'une base mood XS MAX. Dis-moi la vraie valeur et je la change en une minute.</p>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function(){
  var hote=document.getElementById('scene');
  if(!window.THREE || !hote) return;

  /* ---- cotes réelles, en millimètres ---- */
  var D_INT=15.28, R_INT=D_INT/2, EP=2, R_EXT=R_INT+EP;
  var LARGEUR=11, N_BOITES=10, BOITE=3, PROF=1.6, BORD=1.6;

  var scene=new THREE.Scene(); scene.background=new THREE.Color(0xffffff);
  var cam=new THREE.PerspectiveCamera(32, 16/10, 1, 400);
  var moteur=new THREE.WebGLRenderer({antialias:true, alpha:false});
  moteur.setPixelRatio(Math.min(window.devicePixelRatio,2));
  hote.appendChild(moteur.domElement);

  /* ---- lumières de studio ---- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7dbde, 1.05));
  var l1=new THREE.DirectionalLight(0xffffff, 1.15); l1.position.set(30,40,45); scene.add(l1);
  var l2=new THREE.DirectionalLight(0xffffff, 0.55); l2.position.set(-40,10,-25); scene.add(l2);
  var l3=new THREE.DirectionalLight(0xffffff, 0.35); l3.position.set(0,-40,20); scene.add(l3);



  var acier=new THREE.MeshStandardMaterial({color:0xcfd4d8, metalness:0.32, roughness:0.22});
  var emailc=new THREE.MeshStandardMaterial({color:0x5ecfcb, metalness:0.08, roughness:0.42});
  var creux=new THREE.MeshStandardMaterial({color:0x1d5a5c, metalness:0.15, roughness:0.7});
  var couvercle=new THREE.MeshStandardMaterial({color:0xd6dade, metalness:0.32, roughness:0.26});

  var bague=new THREE.Group(); scene.add(bague);

  /* ---- le corps : profil tourné autour de l'axe ---- */
  function profil(rInt, rExt, demiL, rayonBord){
    var p=[], n=6;
    p.push(new THREE.Vector2(rInt, -demiL));
    p.push(new THREE.Vector2(rExt-rayonBord, -demiL));
    for(var i=1;i<=n;i++){
      var a=-Math.PI/2 + (Math.PI/2)*(i/n);
      p.push(new THREE.Vector2(rExt-rayonBord+Math.cos(a)*rayonBord, -demiL+rayonBord+Math.sin(a)*rayonBord));
    }
    p.push(new THREE.Vector2(rExt, demiL-rayonBord));
    for(var j=1;j<=n;j++){
      var b=(Math.PI/2)*(j/n);
      p.push(new THREE.Vector2(rExt-rayonBord+Math.cos(b)*rayonBord, demiL-rayonBord+Math.sin(b)*rayonBord));
    }
    p.push(new THREE.Vector2(rInt, demiL));
    p.push(new THREE.Vector2(rInt, -demiL));
    return p;
  }
  var corps=new THREE.Mesh(new THREE.LatheGeometry(profil(R_INT,R_EXT,LARGEUR/2,0.55),160), acier);
  bague.add(corps);

  /* ---- la bande de couleur, en retrait entre les deux bords acier ---- */
  var demiEmail=(LARGEUR/2)-BORD;
  var bande=new THREE.Mesh(
    new THREE.CylinderGeometry(R_EXT-0.12, R_EXT-0.12, demiEmail*2, 160, 1, true), emailc);
  bague.add(bande);

  /* ---- les boîtes ---- */
  var lesCouvercles=[];
  for(var k=0;k<N_BOITES;k++){
    var ang=(k/N_BOITES)*Math.PI*2;
    var g=new THREE.Group();
    g.rotation.y=ang;
    /* le creux */
    var c=new THREE.Mesh(new THREE.BoxGeometry(BOITE, BOITE, PROF), creux);
    c.position.set(0,0,R_EXT-0.12-PROF/2);
    g.add(c);
    /* le couvercle, articulé sur son bord haut */
    var charniere=new THREE.Group();
    charniere.position.set(0, BOITE/2, R_EXT-0.10);
    var cv=new THREE.Mesh(new THREE.BoxGeometry(BOITE, BOITE, 0.28), couvercle);
    cv.position.set(0, -BOITE/2, 0.14);
    charniere.add(cv);
    g.add(charniere);
    lesCouvercles.push(charniere);
    bague.add(g);
  }

  /* ---- cadrage ---- */
  bague.rotation.x=0.42; bague.rotation.z=0.18;
  cam.position.set(0, 14, 62); cam.lookAt(0,0,0);

  function taille(){
    var w=hote.clientWidth, h=hote.clientHeight;
    moteur.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();
  }
  taille(); window.addEventListener('resize', taille);

  /* ---- on tourne à la souris ---- */
  var tientSouris=false, xPrec=0, yPrec=0, auto=true, ouvert=false, coupe=false;
  function pos(e){ return e.touches? e.touches[0] : e; }
  hote.addEventListener('pointerdown', function(e){ tientSouris=true; hote.classList.add('tient'); xPrec=e.clientX; yPrec=e.clientY; });
  window.addEventListener('pointerup', function(){ tientSouris=false; hote.classList.remove('tient'); });
  window.addEventListener('pointermove', function(e){
    if(!tientSouris) return;
    bague.rotation.y += (e.clientX - xPrec)*0.01;
    bague.rotation.x += (e.clientY - yPrec)*0.01;
    xPrec=e.clientX; yPrec=e.clientY;
  });
  hote.addEventListener('wheel', function(e){
    e.preventDefault();
    cam.position.z = Math.max(28, Math.min(120, cam.position.z + e.deltaY*0.06));
  }, {passive:false});

  /* ---- les trois boutons ---- */
  var bT=document.getElementById('btTourne'), bO=document.getElementById('btOuvre'), bC=document.getElementById('btCoupe');
  bT.addEventListener('click', function(){ auto=!auto; bT.setAttribute('aria-pressed', auto?'true':'false'); });
  bO.addEventListener('click', function(){ ouvert=!ouvert; bO.setAttribute('aria-pressed', ouvert?'true':'false'); });
  bC.addEventListener('click', function(){
    coupe=!coupe; bC.setAttribute('aria-pressed', coupe?'true':'false');
    bande.material.transparent=coupe; bande.material.opacity=coupe?0.35:1;
    corps.material.transparent=coupe; corps.material.opacity=coupe?0.35:1;
    corps.material.needsUpdate=true; bande.material.needsUpdate=true;
  });

  /* ---- l'animation ---- */
  var cible=0;
  function boucle(){
    requestAnimationFrame(boucle);
    if(auto && !tientSouris) bague.rotation.y += 0.006;
    cible = ouvert ? -1.35 : 0;
    for(var i=0;i<lesCouvercles.length;i++){
      var c=lesCouvercles[i];
      c.rotation.x += (cible - c.rotation.x)*0.09;
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
