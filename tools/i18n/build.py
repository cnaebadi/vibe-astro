import json,sys,os,runpy
name,mod=sys.argv[1],sys.argv[2]
H=os.path.dirname(os.path.abspath(__file__))
U=json.load(open(os.path.join(H,name+'.units.json')))
m=runpy.run_path(os.path.join(H,mod))
E=m['E']; X=m.get('EXTRA',{})
assert len(E)==len(U), (len(E),len(U))
d={}
for k,v in zip(U,E):
    if v is not None: d[k]=v
d.update(X)
extra=''
p=os.path.join(H,name+'.extra.js')
if os.path.exists(p): extra=open(p,encoding='utf-8').read()
out='window.I18N_EN = '+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\nwindow.I18N_EXACT = '+json.dumps(m.get('EXACT',{}),ensure_ascii=False)+';\n'+extra
open(os.path.join(H,name+'.dict.js'),'w',encoding='utf-8').write(out)
print(name,'entries',len(d))
