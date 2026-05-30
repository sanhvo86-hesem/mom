/* ════════════════════════════════════════════════════════════════════════════
 * ArchetypeKit — L4 Module Archetype renderer (Lego-SSOT, top of the stack)
 *
 * window.ArchetypeKit.render(archetypeKey, packet) → full module-shell HTML.
 *
 * A "build packet" maps each zone to {block, slots}. ArchetypeKit validates the
 * zone's block against the archetype's allowed block, then delegates each zone
 * to BlockKit.render — so a whole module surface is assembled from L3 blocks
 * (which are assembled from L2 components), never hand-written HTML.
 *
 *   const html = ArchetypeKit.render('workspace-projection', {
 *     shell:   { slots: { title: 'Đơn hàng', tabs: [{label:'Tất cả', active:true}] } },
 *     kpis:    { slots: { tiles: [{label:'OTD', value:'95%', tone:'success'}] } },
 *     toolbar: { slots: { filters:[{label:'Tất cả',active:true}], search:'Tìm…' } },
 *     list:    { slots: { columns:['Mã','Tên'], rows:[['SO-1','A']] } }
 *   });
 *
 * Rules:
 *   - Only PUBLISHED archetypes render; unknown/draft → visible o3-empty fallback.
 *   - A zone may only use the block the archetype declares for it (override via
 *     packet.<zone>.block must equal the declared block_key, else fallback).
 *   - Required zones missing → fallback naming the zone (never silent).
 *   - The shell zone wraps the other zones in its body slot.
 *   - Depends on window.BlockKit (00bd). Load AFTER 00be + 00bd.
 * ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var REGISTRY = (typeof window !== 'undefined' && window.__HM_ARCHETYPE_REGISTRY__) || null;

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fallback(msg) {
    if (typeof window !== 'undefined' && window.BlockKit) {
      return window.BlockKit.render('empty.state', { icon: '⚠️', title: msg, hint: 'ArchetypeKit: kiểm tra archetype_key + zone trong 00be-archetype-registry.js' });
    }
    return '<div class="o3-empty" role="status"><div class="o3-empty__title">' + esc(msg) + '</div></div>';
  }

  var ArchetypeKit = {
    load: function () {
      REGISTRY = (typeof window !== 'undefined' && window.__HM_ARCHETYPE_REGISTRY__) || REGISTRY;
      return Promise.resolve(REGISTRY);
    },
    get: function (key) {
      if (!REGISTRY || !Array.isArray(REGISTRY.archetypes)) return null;
      for (var i = 0; i < REGISTRY.archetypes.length; i++) {
        if (REGISTRY.archetypes[i].archetype_key === key) return REGISTRY.archetypes[i];
      }
      return null;
    },
    list: function (routeClass) {
      if (!REGISTRY || !Array.isArray(REGISTRY.archetypes)) return [];
      return REGISTRY.archetypes
        .filter(function (a) { return a.status === 'published' && (!routeClass || a.route_class === routeClass); })
        .map(function (a) { return a.archetype_key; });
    },

    /** Render a full module shell from an archetype + build packet. */
    render: function (archetypeKey, packet) {
      packet = packet || {};
      var a = ArchetypeKit.get(archetypeKey);
      if (!a) return fallback('Archetype không tồn tại: ' + archetypeKey);
      if (a.status !== 'published') return fallback('Archetype chưa published: ' + archetypeKey);
      var BK = (typeof window !== 'undefined') ? window.BlockKit : null;
      if (!BK) return fallback('BlockKit chưa nạp (cần 00bd trước 00bf)');

      var zones = a.zones || {};

      // Required-zone check.
      for (var zname in zones) {
        if (!Object.prototype.hasOwnProperty.call(zones, zname)) continue;
        if (zones[zname].required && !packet[zname]) {
          return fallback('Thiếu zone bắt buộc "' + zname + '" cho archetype ' + archetypeKey);
        }
      }

      // Render one zone via its declared block (packet may override slots only).
      function renderZone(zname) {
        var zdef = zones[zname];
        var pz = packet[zname];
        if (!zdef || !pz) return '';
        // a packet may name a block; it must match the archetype's declared block
        var blockKey = pz.block || zdef.block;
        if (pz.block && pz.block !== zdef.block) {
          return fallback('Zone "' + zname + '" chỉ cho phép block ' + zdef.block + ' (nhận ' + pz.block + ')');
        }
        return BK.render(blockKey, pz.slots || {});
      }

      // Body = the ordered non-shell zones concatenated.
      var order = Array.isArray(a.zone_order) ? a.zone_order : [];
      var bodyParts = [];
      order.forEach(function (zname) {
        if (zname === 'shell') return;
        var html = renderZone(zname);
        if (html) bodyParts.push(html);
      });
      // include any required/ present zones not in zone_order (e.g. aside) after ordered ones
      for (var z in zones) {
        if (!Object.prototype.hasOwnProperty.call(zones, z)) continue;
        if (z === 'shell') continue;
        if (order.indexOf(z) !== -1) continue;
        if (!packet[z]) continue;
        var h = renderZone(z);
        if (h) bodyParts.push(h);
      }
      var body = bodyParts.join('');

      // Shell wraps the body. If the archetype has a shell zone, render it with
      // its slots + injected body; else return the body bare.
      if (zones.shell && packet.shell) {
        var shellSlots = Object.assign({}, (packet.shell.slots || {}), { body: body });
        return BK.render(zones.shell.block, shellSlots);
      }
      return body;
    },

    mount: function (el, archetypeKey, packet) {
      if (!el) return;
      el.innerHTML = ArchetypeKit.render(archetypeKey, packet);
    }
  };

  window.ArchetypeKit = ArchetypeKit;
})();
