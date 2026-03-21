// INIT
// ═══════════════════════════════════════════════════
initLang();
initLogin();
checkSession();
try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){}
setTimeout(function(){ try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){} }, 180);
setTimeout(function(){ try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){} }, 900);
