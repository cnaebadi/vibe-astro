import re,sys,json
src=open(sys.argv[1],encoding='utf-8').read()
P=re.compile(r'[؀-ۿ]')
out=[]
# split script vs html
parts=re.split(r'(<script[^>]*>.*?</script>|<style[^>]*>.*?</style>)',src,flags=re.S)
for p in parts:
    if p.startswith('<style'): continue
    if p.startswith('<script'):
        # string literals
        for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"",p):
            s=m.group(1) if m.group(1) is not None else m.group(2)
            # split on html tags inside literals
            for seg in re.split(r'<[^>]*>',s):
                if P.search(seg): out.append(seg)
    else:
        for seg in re.split(r'<[^>]*>',p):
            if P.search(seg): out.append(seg)
        for m in re.finditer(r'(?:title|aria-label|placeholder|content|alt)="([^"]*)"',p):
            if P.search(m.group(1)): out.append(m.group(1))
seen=[];S=set()
for s in out:
    s=re.sub(r'\s+',' ',s).strip()
    # trim leading/trailing non-persian junk
    s=s.strip(" ·:،,-+()|")
    if s and s not in S and P.search(s): S.add(s); seen.append(s)
json.dump(seen,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False,indent=0)
print(len(seen), sum(len(x) for x in seen), sum(len(x.split()) for x in seen))
