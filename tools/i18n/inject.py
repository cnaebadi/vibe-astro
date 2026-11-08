import sys,re,os
H=os.path.dirname(os.path.abspath(__file__))
target, dictjs = sys.argv[1], sys.argv[2]
s=open(target,encoding='utf-8').read()
s=re.sub(r'<!--i18n-head-->.*?<!--/i18n-head-->\n?','',s,flags=re.S)
s=re.sub(r'<!--i18n-->.*?<!--/i18n-->\n?','',s,flags=re.S)
head=open(os.path.join(H,'head.html'),encoding='utf-8').read()
m=re.search(r'<meta charset[^>]*>\n?',s); assert m
s=s[:m.end()]+head+s[m.end():]
body='<!--i18n-->\n<script>\n'+open(dictjs,encoding='utf-8').read()+'\n'+open(os.path.join(H,'engine.js'),encoding='utf-8').read()+'</script>\n<!--/i18n-->\n'
i=s.rfind('</body>'); assert i>0
s=s[:i]+body+s[i:]
open(target,'w',encoding='utf-8').write(s)
print('ok',target,len(s))
