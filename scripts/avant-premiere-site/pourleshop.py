# Recopie la page /avant-premiere (mood-tools) dans une page de la boutique, styles enfermés sous #moodavp
import re,sys,json,urllib.request
src=urllib.request.urlopen(urllib.request.Request("https://mood-tools.yourmood.net/avant-premiere",headers={"User-Agent":"Mozilla/5.0"})).read().decode()
css="\n".join(re.findall(r"<style>([\s\S]*?)</style>",src)); css=re.sub(r"/\*[\s\S]*?\*/","",css)
js="\n".join(re.findall(r"<script>([\s\S]*?)</script>",src))
corps=re.search(r"<body>([\s\S]*?)</body>",src).group(1); corps=re.sub(r"<script>[\s\S]*?</script>","",corps)
fonts=re.search(r'<link href="https://fonts[^>]+>',src).group(0)
def enferme(c):
  out="";i=0
  while i<len(c):
    m=re.compile(r"@(media|keyframes|supports)[^{]*\{").search(c,i); acc=c.find("{",i)
    if acc<0: out+=c[i:];break
    if m and m.start()<acc:
      d=1;j=m.end()
      while j<len(c) and d>0:
        d+= 1 if c[j]=="{" else -1 if c[j]=="}" else 0; j+=1
      inner=c[m.end():j-1]; out+=c[i:m.start()]+m.group(0)+(inner if m.group(1)=="keyframes" else enferme(inner))+"}"; i=j; continue
    d=1;j=acc+1
    while j<len(c) and d>0:
      d+= 1 if c[j]=="{" else -1 if c[j]=="}" else 0; j+=1
    sel=c[i:acc].strip(); body=c[acc+1:j-1]
    if sel:
      ns=[]
      for x in sel.split(","):
        x=x.strip()
        if x in("body","html",":root","html,body"): ns.append("#moodavp")
        elif x.startswith("@") or not x: ns.append(x)
        else: ns.append("#moodavp "+x)
      out+=",".join(ns)+"{"+body+"}"
    i=j
  return out
c=enferme(css)
c+="""
#moodavp{margin:0;padding:0;overflow-x:clip}
.main-content .section-header,.page-content .section-header,.template-page .section-header{display:none!important}
.page-width--narrow,.page-content .page-width{max-width:none!important;padding-left:0!important;padding-right:0!important}
#moodavp nav{position:relative}
#moodavp h1,#moodavp h2{font-family:Jost,'Helvetica Neue',sans-serif!important;text-transform:none}
#moodavp img{max-width:100%}
#moodavp .ph img{max-width:none}
#moodavp a{text-decoration:none}
"""
html=fonts+'\n<div id="moodavp">\n<style>'+c+'</style>\n'+corps+'\n<script>(function(){'+js+'})();</script>\n</div>'
open("/tmp/amila-work/avp/body-shop.html","w").write(html)
print(len(html)//1024,"Ko ; règles non enfermées:",len(re.findall(r"(^|\})\s*(body|h1|header|section|nav)\s*\{",c)))
