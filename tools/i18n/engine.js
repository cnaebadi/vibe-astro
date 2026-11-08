/* ===== دوزبانه: فارسی (پیش‌فرض) / English =====
   متن‌ها در کد فارسی می‌مانند؛ در حالت انگلیسی، متن نمایش‌داده‌شده (DOM، ویژگی‌ها، بوم) با دیکشنری I18N_EN ترجمه می‌شود.
   منطق و داده‌های برنامه دست نمی‌خورند. */
(function(){
  var KEY = 'vibeLang', ATTRS = ['title','aria-label','placeholder','alt'];
  var DIG = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','٫':'.','٬':','};
  var FA_RE = /[؀-ۿ]/, DIG_RE = /[۰-۹٠-٩٫٬]/g;
  var L = /[ء-يٱ-ۓۺ-ۿ‌]/; /* حرف فارسی برای مرز کلمه */
  function digits(s){ return s.replace(DIG_RE, function(d){ return DIG[d]; }); }
  function norm(s){ return digits(s).replace(/\s+/g,' ').trim(); }

  var SRC = window.I18N_EN || {}, PAT = window.I18N_PAT || [], SKIP = '[data-i18n-skip]' + (window.I18N_SKIP ? ',' + window.I18N_SKIP : '');
  var D = Object.create(null), keys = [];
  Object.keys(SRC).forEach(function(k){ var n = norm(k); if(n && SRC[k] != null){ D[n] = SRC[k]; if(FA_RE.test(n)) keys.push(n); } });
  keys.sort(function(a,b){ return b.length - a.length; });
  var X = Object.create(null); Object.keys(window.I18N_EXACT || {}).forEach(function(k){ X[norm(k)] = window.I18N_EXACT[k]; });
  var esc = function(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); };
  var SUB = keys.length ? new RegExp('(^|[^\\u0621-\\u064A\\u0671-\\u06D3\\u06FA-\\u06FF\\u200C])(' + keys.map(esc).join('|') + ')(?=$|[^\\u0621-\\u064A\\u0671-\\u06D3\\u06FA-\\u06FF\\u200C])','g') : null;

  function punct(s){
    return s.replace(/‌/g,'').replace(/،\s?/g,', ').replace(/؛\s?/g,'; ').replace(/؟/g,'?').replace(/٪/g,'%').replace(/«\s?([^«»]*?)\s?»/g,'“$1”')
            .replace(/[←→]/g, function(a){ return a === '←' ? '→' : '←'; });
  }
  var cache = Object.create(null);
  function tr(text){
    if(!text || !(FA_RE.test(text) || /[←→]/.test(text))) return text;
    if(text in cache) return cache[text];
    var lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0], core = norm(text), out;
    var em = core.match(/^([\s·:،,.\-+()|*«»]*)([\s\S]*?)([\s·:،,.\-+()|*«»]*)$/);
    if(core in X) out = X[core];
    else if(core in D) out = D[core];
    else if(em[2] in D) out = em[1] + D[em[2]] + em[3];
    else {
      out = core;
      for(var i=0;i<PAT.length;i++){ var p = PAT[i]; if(p[0].test(out)){ out = out.replace(p[0], p[1]); break; } }
      if(FA_RE.test(out) && SUB){ out = out.replace(SUB, function(m, pre, k){ return pre + D[k]; }); }
      if(FA_RE.test(out) && SUB){ out = out.replace(SUB, function(m, pre, k){ return pre + D[k]; }); }
    }
    out = lead + punct(digits(out)).replace(/([.!?]\s+)([a-z])/g, function(m, p, c){ return p + c.toUpperCase(); }) + tail;
    cache[text] = out; return out;
  }

  var lang = window.__LANG === 'en' ? 'en' : 'fa', TXT = new WeakMap(), ATT = new WeakMap();
  function skip(el){ return el && el.closest && el.closest(SKIP); }
  function doText(n){
    var p = n.parentNode; if(!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TEXTAREA' || skip(p)) return;
    var rec = TXT.get(n), cur = n.data;
    if(rec && rec.tr === cur) return;           /* قبلاً ترجمه شده */
    var t = tr(cur); if(t === cur) return;
    if(p.childNodes.length === 1) t = t.replace(/^(\s*)([a-z])/, function(m, s, c){ return s + c.toUpperCase(); });
    TXT.set(n, {orig:cur, tr:t}); n.data = t;
  }
  function doAttrs(el){
    if(skip(el)) return;
    var rec = ATT.get(el);
    if(el !== document.documentElement && el.getAttribute('dir') === 'rtl'){
      if(!rec){ rec = {}; ATT.set(el, rec); }
      rec.dir = {orig:'rtl', tr:'ltr'}; el.setAttribute('dir', 'ltr');
    }
    if(el.hasAttribute('data-en') && !(rec && rec.__html != null)){
      if(!rec){ rec = {}; ATT.set(el, rec); }
      rec.__html = el.innerHTML; el.innerHTML = el.getAttribute('data-en');
    }
    for(var i=0;i<ATTRS.length;i++){
      var a = ATTRS[i], v = el.getAttribute(a); if(v == null) continue;
      if(rec && rec[a] && rec[a].tr === v) continue;
      var t = tr(v); if(t === v) continue;
      if(!rec){ rec = {}; ATT.set(el, rec); } rec[a] = {orig:v, tr:t}; el.setAttribute(a, t);
    }
  }
  function walk(root){
    if(root.nodeType === 3){ doText(root); return; }
    if(root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if(root.nodeType === 1) doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while((n = w.nextNode())){ if(n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function restore(){
    var w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while((n = w.nextNode())){
      if(n.nodeType === 3){ var r = TXT.get(n); if(r && r.tr === n.data) n.data = r.orig; TXT.delete(n); }
      else { var a = ATT.get(n); if(a){ for(var k in a){ if(k === '__html') n.innerHTML = a[k]; else if(n.getAttribute(k) === a[k].tr) n.setAttribute(k, a[k].orig); } ATT.delete(n); } }
    }
  }
  var mo = new MutationObserver(function(list){
    if(lang !== 'en') return;
    for(var i=0;i<list.length;i++){
      var m = list[i];
      if(m.type === 'characterData') doText(m.target);
      else if(m.type === 'attributes') doAttrs(m.target);
      else for(var j=0;j<m.addedNodes.length;j++) walk(m.addedNodes[j]);
    }
  });

  /* متن‌های روی بوم (canvas) */
  var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if(C){ ['fillText','strokeText','measureText'].forEach(function(f){ var o = C[f]; C[f] = function(t){ if(lang === 'en' && typeof t === 'string'){ var a = Array.prototype.slice.call(arguments); a[0] = tr(t); return o.apply(this, a); } return o.apply(this, arguments); }; }); }

  function apply(){
    var r = document.documentElement;
    r.lang = lang; r.dir = lang === 'en' ? 'ltr' : 'rtl';
    if(lang === 'en'){ walk(document.documentElement); mo.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTRS.concat(['dir'])}); }
    else { mo.disconnect(); restore(); }
    var tt = document.querySelector('title'); if(tt){ if(!tt.__fa) tt.__fa = tt.textContent; document.title = lang === 'en' ? tr(tt.__fa) : tt.__fa; }
    r.classList.remove('i18n-wait');
    [].forEach.call(document.querySelectorAll('[data-i18n-switch] [data-l]'), function(b){ b.setAttribute('aria-pressed', String(b.dataset.l === lang)); });
  }
  function set(l, save){
    var changed = l !== lang; lang = l; window.__LANG = l;
    if(save){ try { localStorage.setItem(KEY, l); } catch(e){} }
    if(changed){ apply(); if(typeof window.I18N_HOOK === 'function') try { window.I18N_HOOK(l); } catch(e){} try { window.dispatchEvent(new CustomEvent('langchange', {detail:l})); } catch(e){} try { window.dispatchEvent(new Event('resize')); } catch(e){} }
  }

  /* دکمه‌ی تغییر زبان */
  var tg = document.createElement('div');
  tg.className = 'i18n-tg'; tg.setAttribute('data-i18n-skip',''); tg.setAttribute('data-i18n-switch',''); tg.setAttribute('role','group'); tg.setAttribute('aria-label','Language / زبان');
  tg.innerHTML = '<button type="button" data-l="fa" lang="fa">فا</button><button type="button" data-l="en" lang="en">EN</button>';
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('[data-i18n-switch] [data-l]'); if(b){ e.stopPropagation(); set(b.dataset.l, true); } }, true);
  document.body.appendChild(tg);

  /* بار اول: پرسیدن زبان */
  var saved = null, canSave = true;
  try { saved = localStorage.getItem(KEY); } catch(e){ canSave = false; }
  if(canSave && saved !== 'fa' && saved !== 'en'){
    var ask = document.createElement('div');
    ask.className = 'i18n-ask'; ask.setAttribute('role','dialog'); ask.setAttribute('aria-modal','true'); ask.setAttribute('aria-labelledby','i18nT');
    ask.innerHTML = '<div class="box"><h2 id="i18nT"><span lang="fa" dir="rtl">زبان را انتخاب کن</span><span lang="en" dir="ltr">Choose your language</span></h2><p><span lang="fa" dir="rtl">بعداً هم هر وقت خواستی عوضش کن</span><span lang="en" dir="ltr">You can change it anytime later</span></p>' +
      '<div class="row"><button type="button" class="pri" data-l="fa" lang="fa">فارسی<small>Persian</small></button><button type="button" data-l="en" lang="en">English<small>انگلیسی</small></button></div></div>';
    var pick = function(l){ set(l, true); ask.remove(); document.removeEventListener('keydown', onKey, true); };
    var onKey = function(e){ if(e.key === 'Escape'){ e.stopPropagation(); pick('fa'); } };
    ask.addEventListener('click', function(e){ var b = e.target.closest('button'); if(b) pick(b.dataset.l); else if(e.target === ask) pick('fa'); });
    document.addEventListener('keydown', onKey, true);
    ask.setAttribute('data-i18n-skip','');
    document.body.appendChild(ask);
    setTimeout(function(){ var b = ask.querySelector('.pri'); if(b) b.focus(); }, 50);
  }
  window.I18N = { tr:tr, set:function(l){ set(l, true); }, get lang(){ return lang; } };
  apply();
})();
