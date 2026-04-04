// INIT
// ═══════════════════════════════════════════════════
initLang();
initLogin();
checkSession();
try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){}
setTimeout(function(){ try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){} }, 180);
setTimeout(function(){ try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){} }, 900);

function reinforceEqmsTemplateEditorRoute(){
  try{
    if(typeof window._ecOpenEqmsTemplateEditor !== 'function') return;
    if(typeof window._renderFormBuilder === 'function' && !window._renderFormBuilder.__hesemEqmsRouteProxy) return;
    var proxy = function(formOrCode){
      var code = '';
      if(typeof formOrCode === 'string') code = formOrCode;
      else if(formOrCode && typeof formOrCode === 'object') code = formOrCode.form_code || formOrCode.code || '';
      window._ecOpenEqmsTemplateEditor(code || 'FRM-403-SCAR');
    };
    proxy.__hesemEqmsRouteProxy = true;
    window._renderFormBuilder = proxy;
  }catch(e){}
}

reinforceEqmsTemplateEditorRoute();
window.addEventListener('load', reinforceEqmsTemplateEditorRoute);
