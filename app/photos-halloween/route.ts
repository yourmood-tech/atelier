// Page d'édition des photos Halloween 2026 : ordre, cadrage, ajout, retrait.
const PAGE = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Photos Halloween 2026 — mood</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap">
<style>
*{box-sizing:border-box}
html,body{margin:0;background:#0b0b0e;color:#EDE8E4;font-family:Poppins,system-ui,sans-serif;font-weight:300}
.w{max-width:1180px;margin:0 auto;padding:28px 20px 90px}
h1{font-size:26px;font-weight:300;margin:0 0 6px}
.sub{color:#8b8490;font-size:13.5px;margin:0 0 26px;line-height:1.6}
.bloc{margin:0 0 34px;border-top:1px solid rgba(255,255,255,.1);padding-top:20px}
.bt{display:flex;align-items:baseline;gap:12px;margin-bottom:12px}
.bt h2{font-size:19px;font-weight:400;margin:0}
.bt span{font-size:12px;color:#8b8490}
.gr{display:flex;flex-wrap:wrap;gap:12px}
.ph{position:relative;width:150px}
.ph .im{width:150px;height:159px;border-radius:3px;overflow:hidden;background:#000;cursor:grab}
.ph img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.ph.drag{opacity:.35}
.ph .no{position:absolute;top:5px;left:5px;background:rgba(0,0,0,.72);border-radius:3px;
  font-size:12px;padding:1px 7px;color:#fff}
.ph .x{position:absolute;top:4px;right:4px;width:24px;height:24px;border:0;border-radius:50%;
  background:rgba(0,0,0,.72);color:#fff;font-size:15px;line-height:1;cursor:pointer}
.ph .x:hover{background:#b5242f}
.cad{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:5px}
.cad button{border:0;background:rgba(255,255,255,.07);color:#9b949f;height:17px;border-radius:2px;cursor:pointer;font-size:9px;padding:0}
.cad button.on{background:#E9E2D8;color:#0b0b0e}
.add{width:150px;height:159px;border:1px dashed rgba(255,255,255,.26);border-radius:3px;background:none;
  color:#8b8490;font-size:12.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:6px;text-align:center;padding:8px;font-family:inherit}
.add:hover{border-color:#E9E2D8;color:#E9E2D8}
.barre{position:fixed;left:0;right:0;bottom:0;background:rgba(8,8,11,.95);backdrop-filter:blur(10px);
  border-top:1px solid rgba(255,255,255,.1);padding:12px 20px;display:flex;gap:12px;align-items:center;justify-content:center}
.b{border:0;border-radius:3px;padding:11px 24px;font-family:inherit;font-size:13px;cursor:pointer}
.b1{background:#E9E2D8;color:#0b0b0e;font-weight:500}
.b2{background:rgba(255,255,255,.1);color:#EDE8E4}
.msg{font-size:12.5px;color:#8b8490}
.lect{background:#2a1f10;border:1px solid #6b5020;color:#e8cf95;padding:10px 14px;border-radius:3px;font-size:13px;margin-bottom:20px}
</style></head><body>
<div class="w">
  <h1>Photos Halloween 2026</h1>
  <p class="sub">Glisse une photo pour changer son rang &middot; la croix la retire &middot; les neuf petits carrés règlent le cadrage (quelle partie de la photo reste visible) &middot; « Ajouter » prend une photo depuis ton ordinateur.<br>Le premier de chaque ligne est celui qui s'affiche en premier sur la page Halloween.</p>
  <div id="lect"></div>
  <div id="app"></div>
</div>
<div class="barre">
  <button class="b b1" id="save">Enregistrer</button>
  <button class="b b2" id="reset">Repartir des photos de la boutique</button>
  <a class="b b2" href="/halloween" target="_blank" rel="noopener" style="text-decoration:none">Voir la page</a>
  <span class="msg" id="msg"></span>
</div>
<script>
var D=null, peut=false;
var POS=[["15% 15%","↖"],["50% 15%","↑"],["85% 15%","↗"],
         ["15% 50%","←"],["50% 50%","•"],["85% 50%","→"],
         ["15% 85%","↙"],["50% 85%","↓"],["85% 85%","↘"]];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function dessine(){
  var h='';
  D.pieces.forEach(function(p,pi){
    h+='<div class="bloc"><div class="bt"><h2>'+esc(p.nom)+'</h2><span>'+p.photos.length+' photo(s)</span></div><div class="gr" data-p="'+pi+'">';
    p.photos.forEach(function(ph,i){
      var pos=ph.pos||"50% 50%";
      h+='<div class="ph" draggable="true" data-p="'+pi+'" data-i="'+i+'">'+
         '<div class="im"><img src="'+esc(ph.src)+'" style="object-position:'+pos+'"></div>'+
         '<span class="no">'+(i+1)+'</span><button class="x" data-del="'+pi+','+i+'">&times;</button>'+
         '<div class="cad">'+POS.map(function(o){
            return '<button class="'+(o[0]===pos?'on':'')+'" data-pos="'+pi+','+i+','+o[0]+'">'+o[1]+'</button>';
         }).join('')+'</div></div>';
    });
    h+='<button class="add" data-add="'+pi+'">+<br>Ajouter<br>une photo</button></div></div>';
  });
  document.getElementById('app').innerHTML=h;
  brancher();
}
function brancher(){
  document.querySelectorAll('[data-del]').forEach(function(b){
    b.onclick=function(){ var a=b.dataset.del.split(','); D.pieces[+a[0]].photos.splice(+a[1],1); dessine(); };
  });
  document.querySelectorAll('[data-pos]').forEach(function(b){
    b.onclick=function(){ var a=b.dataset.pos.split(','); D.pieces[+a[0]].photos[+a[1]].pos=a[2]; dessine(); };
  });
  document.querySelectorAll('[data-add]').forEach(function(b){
    b.onclick=function(){
      var pi=+b.dataset.add;
      var inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.multiple=true;
      inp.onchange=function(){
        var fs=[].slice.call(inp.files||[]), reste=fs.length;
        if(!reste) return;
        fs.forEach(function(f){
          var r=new FileReader();
          r.onload=function(){ D.pieces[pi].photos.push({src:r.result,pos:"50% 50%"}); if(!--reste) dessine(); };
          r.readAsDataURL(f);
        });
      };
      inp.click();
    };
  });
  var src=null;
  document.querySelectorAll('.ph').forEach(function(el){
    el.ondragstart=function(e){ src=el; el.classList.add('drag'); e.dataTransfer.effectAllowed='move'; };
    el.ondragend=function(){ el.classList.remove('drag'); src=null; };
    el.ondragover=function(e){ e.preventDefault(); };
    el.ondrop=function(e){
      e.preventDefault(); if(!src||src===el) return;
      var a=+src.dataset.p, b=+src.dataset.i, c=+el.dataset.p, d=+el.dataset.i;
      if(a!==c) return;                       /* on ne mélange pas deux pièces */
      var L=D.pieces[a].photos, x=L.splice(b,1)[0];
      L.splice(d,0,x); dessine();
    };
  });
}
function msg(t){ document.getElementById('msg').textContent=t; setTimeout(function(){document.getElementById('msg').textContent='';},4000); }
fetch('/api/hw-photos').then(function(r){return r.json();}).then(function(d){
  D=d; peut=d.peutModifier;
  if(!peut) document.getElementById('lect').innerHTML='<div class="lect">Tu es en lecture seule — connecte-toi avec ton adresse @yourmood.net pour modifier.</div>';
  dessine();
});
document.getElementById('save').onclick=function(){
  msg('enregistrement…');
  fetch('/api/hw-photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pieces:D.pieces})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.error){ msg('impossible : '+d.error); return; }
      D.pieces=d.pieces; dessine(); msg('enregistré ✓');
    }).catch(function(){ msg('impossible d\\'enregistrer'); });
};
document.getElementById('reset').onclick=function(){
  if(!confirm('Repartir des photos de la boutique ? Tes réglages seront perdus.')) return;
  fetch('/api/hw-photos',{method:'DELETE'}).then(function(r){return r.json();}).then(function(d){
    if(d.error){ msg('impossible : '+d.error); return; }
    D.pieces=d.pieces; dessine(); msg('remis à zéro');
  });
};
</script>
</body></html>`;
export async function GET() {
  return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
