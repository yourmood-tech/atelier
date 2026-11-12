"""Fabrique public/guide/widget.js (le bonhomme posé sur yourmood.net) à partir de html/guide.html.
Relancer après chaque modification de la page d'essai :  python3 scripts/guide-widget.py
Le bonhomme vit dans une « bulle isolée » (shadow DOM) : le style du site ne le déforme pas, et lui ne touche pas au site.
Essai caché : il n'apparaît que si on ouvre une page avec ?guide=1 (retenu ensuite dans ce navigateur) ; ?guide=0 l'éteint.
"""
import re, json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
src = (R / "html/guide.html").read_text()
BASE = "https://mood-tools.yourmood.net"

css = src[src.index("<style>") + 7 : src.index("</style>")]
css = css.replace(":root{", ":host{all:initial;").replace("body{", ".apercu-inutile{")
css = re.sub(r"html,body\{[^}]*\}", "", css)
# à gauche (le service client reste à droite)
css = css.replace(".mascotte{position:fixed;right:18px;", ".mascotte{position:fixed;left:18px;")
css = css.replace(".bulle{position:fixed;right:150px;", ".bulle{position:fixed;left:150px;")
css = css.replace("border-radius:20px 20px 4px 20px", "border-radius:20px 20px 20px 4px").replace("transform-origin:bottom right;transition:.4s", "transform-origin:bottom left;transition:.4s")
css = css.replace(".bulle .x{position:absolute;top:-9px;left:-9px;", ".bulle .x{position:absolute;top:-9px;right:-9px;")
css = css.replace(".pastille{position:fixed;right:24px;", ".pastille{position:fixed;left:126px;")
css = css.replace(".panneau{position:fixed;right:18px;", ".panneau{position:fixed;left:18px;").replace("transform-origin:bottom right;transition:.3s", "transform-origin:bottom left;transition:.3s")
css = css.replace(".panneau{right:0;bottom:0;", ".panneau{left:0;bottom:0;")
css += "\n.racine{font-family:Poppins,Helvetica,Arial,sans-serif;font-weight:300;line-height:1.55;color:var(--ink);-webkit-font-smoothing:antialiased}\n.racine *,.racine *::before,.racine *::after{box-sizing:border-box}\n"
# sur yourmood.net : au-dessus du rond du service client (en bas à gauche)
css = css.replace(".mascotte{position:fixed;left:18px;bottom:14px;z-index:50;width:128px;height:118px;", ".mascotte{position:fixed;left:6px;bottom:84px;z-index:50;width:112px;height:104px;")
css = css.replace(".bulle{position:fixed;left:150px;bottom:40px;", ".bulle{position:fixed;left:122px;bottom:110px;")
css = css.replace(".pastille{position:fixed;left:126px;bottom:112px;", ".pastille{position:fixed;left:100px;bottom:170px;")
css = css.replace("@media (max-width:520px){.bulle{right:12px;bottom:140px;width:auto;left:12px;max-width:none}}", "@media (max-width:520px){.bulle{right:12px;bottom:196px;width:auto;left:12px;max-width:none}}")
for sel in [".mascotte{", ".bulle{", ".pastille{", ".panneau{"]:
    css = css.replace(sel, sel + "z-index:2147483000;", 1)

body = src[src.index('<div class="bulle"') : src.index("<script>")]
body = body.replace('src="/guide/', f'src="{BASE}/guide/').replace('poster="/guide/', f'poster="{BASE}/guide/')

js = src[src.index("<script>") + 8 : src.index("</script>")]
js = js.replace("var $=function(id){return document.getElementById(id);};", "var $=function(id){return RACINE.getElementById(id);};")
js = js.replace("'/guide/", f"'{BASE}/guide/").replace("'/api/guide", f"'{BASE}/api/guide")
js = js.replace("$('ouvrir2').onclick=ouvrir; ", "")
# pastille près de la mascotte quand elle disparaît
out = f"""/* bonhomme mood — fabriqué depuis html/guide.html par scripts/guide-widget.py, ne pas modifier à la main */
(function(){{
  try{{
    var q=new URLSearchParams(location.search).get('guide');
    if(q==='1') localStorage.setItem('moodGuideEssai','1');
    if(q==='0') localStorage.removeItem('moodGuideEssai');
    if(localStorage.getItem('moodGuideEssai')!=='1') return;   /* essai caché : invisible pour les clients */
  }}catch(e){{ return; }}
  if(window.__moodGuide) return; window.__moodGuide=1;
  var hote=document.createElement('div'); hote.id='mood-guide';
  var RACINE=hote.attachShadow({{mode:'open'}});
  RACINE.innerHTML='<style>'+{json.dumps(css)}+'</style><div class="racine">'+{json.dumps(body)}+'</div>';
  function go(){{ document.body.appendChild(hote);
{js}
  }}
  if(document.body) go(); else document.addEventListener('DOMContentLoaded',go);
}})();
"""
(R / "public/guide/widget.js").write_text(out)
print("widget.js", len(out))
