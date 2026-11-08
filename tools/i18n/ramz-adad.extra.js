window.I18N_HOOK = function(){
  /* بازسازی خروجی‌های پویا با زبان جدید */
  ['fDate','rdq'].forEach(function(id){ var el = document.getElementById(id); if(el) el.dispatchEvent(new Event('input', {bubbles:true})); });
};
(function(){ var st = document.createElement('style'); st.textContent = 'html[lang="en"] td .en{display:none}'; document.head.appendChild(st); })();
(function(){ var st = document.createElement('style'); st.textContent = 'html[data-layout="mobile"] .i18n-tg{bottom:calc(90px + env(safe-area-inset-bottom,0px))}'; document.head.appendChild(st); })();
