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
    window._renderFormBuilder = function(formOrCode){
      var code = '';
      if(typeof formOrCode === 'string') code = formOrCode;
      else if(formOrCode && typeof formOrCode === 'object') code = formOrCode.form_code || formOrCode.code || '';
      window._ecOpenEqmsTemplateEditor(code || 'FRM-403-SCAR');
    };
  }catch(e){}
}

reinforceEqmsTemplateEditorRoute();
setTimeout(reinforceEqmsTemplateEditorRoute, 300);
setTimeout(reinforceEqmsTemplateEditorRoute, 1200);
window.addEventListener('load', reinforceEqmsTemplateEditorRoute);
