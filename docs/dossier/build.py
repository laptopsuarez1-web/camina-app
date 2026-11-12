import re,base64,sys
def scale_fonts(s,f=1.22):
    return re.sub(r'font-size:\s*([\d.]+)px', lambda m: f"font-size:{round(float(m.group(1))*f,1)}px", s)
def icons(s):
    def rep(m):
        svg=open('a/ic/'+m.group(1)+'.svg','rb').read()
        return "url('data:image/svg+xml;base64,"+base64.b64encode(svg).decode()+"')"
    return re.sub(r"url\(a/ic/([\w-]+)\.svg\)", rep, s)
c=open('base.css').read(); c=scale_fonts(c)
c=c.replace(".num { width: 30px; height: 30px;",".num { width: 36px; height: 36px;").replace(".ic { width: 34px; height: 34px;",".ic { width: 42px; height: 42px;").replace(".ic i { display: block; width: 19px; height: 19px;",".ic i { display: block; width: 23px; height: 23px;")
open('base2.css','w').write(c)
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read().replace('href="base.css"','href="base2.css"')
s=scale_fonts(s); s=icons(s)
for a,b in [("width:58mm;transform:rotate(4deg)","width:68mm;transform:rotate(4deg)"),("right:84mm;top:40mm;width:52mm","right:84mm;top:40mm;width:58mm"),
            ('class="phone" style="width:42mm"','class="phone" style="width:50mm"'),
            ('class="phone" style="width:56mm;transform:translateY(-6mm)"','class="phone" style="width:62mm;transform:translateY(-6mm)"'),('class="phone" style="width:56mm;transform:translateY(8mm)"','class="phone" style="width:62mm;transform:translateY(8mm)"'),
            ('class="phone" style="width:56mm"><img src="a/app-ruta2.jpg">','class="phone" style="width:64mm"><img src="a/app-ruta2.jpg">'),('class="phone" style="width:52mm;transform:translateY(10mm)"','class="phone" style="width:58mm;transform:translateY(10mm)"'),
            ('class="phone" style="width:40mm"','class="phone" style="width:43mm"'),
            (".step .phone { width: 44mm }",".step .phone { width: 50mm }")]:
    s=s.replace(a,b)
s=re.sub(r"\.tipo \.t \{ font-family: Montserrat; font-weight: 900; font-size: [\d.]+px",".tipo .t { font-family: Montserrat; font-weight: 900; font-size: 21px",s)
open(dst,'w').write(s)
