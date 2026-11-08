import json,sys,re
a=json.load(open(sys.argv[1]))
out=[];S=set()
def add(x):
    x=x.strip(" ·:،,-+()|*«»؛")
    if not x or x in S: return
    if not re.search(r'[ء-يپ-ۓ]',x): return
    if len(x)==1: return
    S.add(x); out.append(x)
for s in a:
    parts=[p for p in re.split(r'،\s*| / | · ',s)]
    if len(parts)>1 and all(len(p.split())<=4 for p in parts) and not re.search(r'[.؛]',s):
        for p in parts:
            # strip parenthetical
            m=re.match(r'^(.*?)\s*\((.*?)\)?$',p.strip())
            if m: add(m.group(1)); add(m.group(2))
            else: add(p)
    else:
        add(s)
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
for i,x in enumerate(out): print(i,x)
