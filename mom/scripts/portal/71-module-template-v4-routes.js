/* HESEM Operations Platform — module-template-v4 route adapter.
   Additive classic script. No production side effects by itself. */
(function(){
  'use strict';
  var BASE = '/ops';
  var ROUTE_CLASSES = Object.freeze({ SH:'SH', DL:'DL', ML:'ML', AC:'AC', AR:'AR', ERD:'ERD', NRD:'NRD', WS:'WS', SFW:'SFW', UNKNOWN:'UNKNOWN' });
  var allowedQuery = Object.freeze({
    SH:['q','scope','ctx_return','ctx_source'],
    DL:['q','scope','ctx_return','ctx_source'],
    ML:['tab','view','q','scope','ctx_return','ctx_source'],
    AC:['tab','q','scope','from','to','cursor','sort','filter','ctx_return','ctx_source'],
    AR:['tab','mode','panel','focus','compare','compare_basis','ctx_return','ctx_source'],
    ERD:['tab','mode','panel','focus','ctx_return','ctx_source'],
    NRD:['tab','mode','panel','focus','ctx_return','ctx_source'],
    WS:['tab','view','lane','group_by','scope','from','to','cursor','panel','focus','q','ctx_return','ctx_source'],
    SFW:['tab','view','lane','group_by','scope','from','to','cursor','panel','focus','q','ctx_return','ctx_source']
  });
  function dec(v){ try { return decodeURIComponent(v || ''); } catch(e){ return v || ''; } }
  function enc(v){ return encodeURIComponent(v == null ? '' : String(v)); }
  function cleanSegments(pathname){
    return String(pathname || '').split('?')[0].replace(/\/+/g,'/').replace(/\/$/,'').split('/').filter(Boolean).map(dec);
  }
  function queryToObject(search){
    var params = new URLSearchParams(search || '');
    var out = {};
    params.forEach(function(v,k){ if(out[k] == null) out[k] = v; else if(Array.isArray(out[k])) out[k].push(v); else out[k] = [out[k], v]; });
    return out;
  }
  function getAllowedQueryKeys(routeClass){ return allowedQuery[routeClass] || []; }
  function cleanQuery(routeClass, query){
    var allowed = getAllowedQueryKeys(routeClass), out = {}, rejected = [];
    Object.keys(query || {}).forEach(function(k){
      if(allowed.indexOf(k) >= 0 || k.indexOf('ctx_') === 0){ out[k] = query[k]; }
      else rejected.push(k);
    });
    return { query: out, rejected: rejected };
  }
  function parsePath(pathname, search){
    var seg = cleanSegments(pathname);
    var rawQuery = queryToObject(search || '');
    var res = { ok:true, routeClass:'UNKNOWN', params:{}, query:{}, rejectedQuery:[], pathname: pathname || '', canonicalPath:'', warnings:[] };
    if(seg.length === 0 || seg[0] !== 'ops') { res.ok = false; res.warnings.push('outside_ops_shell'); return res; }
    if(seg.length === 1){ res.routeClass='SH'; res.canonicalPath=BASE; }
    else if(seg[1] === 'records'){
      if(seg.length === 3){ res.routeClass='AC'; res.params.resource_family = seg[2]; res.canonicalPath = BASE + '/records/' + enc(seg[2]); }
      else if(seg.length === 4){ res.routeClass='AR'; res.params.resource_family = seg[2]; res.params.record_id = seg[3]; res.canonicalPath = BASE + '/records/' + enc(seg[2]) + '/' + enc(seg[3]); }
      else if(seg.length === 6 && seg[4] === 'drafts') { res.routeClass='ERD'; res.params.resource_family = seg[2]; res.params.record_id = seg[3]; res.params.draft_id = seg[5]; res.canonicalPath = BASE + '/records/' + enc(seg[2]) + '/' + enc(seg[3]) + '/drafts/' + enc(seg[5]); }
      else { res.ok = false; res.routeClass='UNKNOWN'; res.warnings.push('invalid_record_route'); }
    } else {
      res.params.domain = seg[1];
      if(seg.length === 2){ res.routeClass='DL'; res.canonicalPath = BASE + '/' + enc(seg[1]); }
      else if(seg.length === 3){ res.routeClass='ML'; res.params.module = seg[2]; res.canonicalPath = BASE + '/' + enc(seg[1]) + '/' + enc(seg[2]); }
      else if(seg.length === 5 && seg[3] === 'drafts'){ res.routeClass='NRD'; res.params.module = seg[2]; res.params.draft_id = seg[4]; res.canonicalPath = BASE + '/' + enc(seg[1]) + '/' + enc(seg[2]) + '/drafts/' + enc(seg[4]); }
      else if(seg.length === 4){ res.routeClass='WS'; res.params.module = seg[2]; res.params.workspace_family = seg[3]; res.canonicalPath = BASE + '/' + enc(seg[1]) + '/' + enc(seg[2]) + '/' + enc(seg[3]); }
      else if(seg.length === 6){ res.routeClass='SFW'; res.params.module = seg[2]; res.params.workspace_family = seg[3]; res.params.subject_type = seg[4]; res.params.subject_id = seg[5]; res.canonicalPath = BASE + '/' + enc(seg[1]) + '/' + enc(seg[2]) + '/' + enc(seg[3]) + '/' + enc(seg[4]) + '/' + enc(seg[5]); }
      else { res.ok = false; res.routeClass='UNKNOWN'; res.warnings.push('invalid_module_route'); }
    }
    var cleaned = cleanQuery(res.routeClass, rawQuery);
    res.query = cleaned.query; res.rejectedQuery = cleaned.rejected;
    return res;
  }
  function parseLocation(loc){ loc = loc || window.location; return parsePath(loc.pathname, loc.search); }
  function serializeQuery(query){
    var p = new URLSearchParams();
    Object.keys(query || {}).forEach(function(k){
      var v = query[k]; if(v == null || v === '') return;
      if(Array.isArray(v)) v.forEach(function(x){ p.append(k, x); }); else p.set(k, v);
    });
    var s = p.toString(); return s ? '?' + s : '';
  }
  function buildUrl(route){
    route = route || {}; var c = route.routeClass || route.class || 'SH', p = route.params || {}, q = route.query || {};
    var path = BASE;
    if(c === 'DL') path += '/' + enc(p.domain);
    else if(c === 'ML') path += '/' + enc(p.domain) + '/' + enc(p.module);
    else if(c === 'AC') path += '/records/' + enc(p.resource_family);
    else if(c === 'AR') path += '/records/' + enc(p.resource_family) + '/' + enc(p.record_id);
    else if(c === 'ERD') path += '/records/' + enc(p.resource_family) + '/' + enc(p.record_id) + '/drafts/' + enc(p.draft_id);
    else if(c === 'NRD') path += '/' + enc(p.domain) + '/' + enc(p.module) + '/drafts/' + enc(p.draft_id);
    else if(c === 'WS') path += '/' + enc(p.domain) + '/' + enc(p.module) + '/' + enc(p.workspace_family);
    else if(c === 'SFW') path += '/' + enc(p.domain) + '/' + enc(p.module) + '/' + enc(p.workspace_family) + '/' + enc(p.subject_type) + '/' + enc(p.subject_id);
    var cq = cleanQuery(c, q).query;
    return path + serializeQuery(cq);
  }
  function canonicalizeUrl(loc){ var r = parseLocation(loc); return r.canonicalPath + serializeQuery(r.query); }
  window.Hmv4Routes = { BASE: BASE, ROUTE_CLASSES: ROUTE_CLASSES, parsePath: parsePath, parseLocation: parseLocation, buildUrl: buildUrl, getAllowedQueryKeys: getAllowedQueryKeys, cleanQuery: cleanQuery, canonicalizeUrl: canonicalizeUrl };
})();
