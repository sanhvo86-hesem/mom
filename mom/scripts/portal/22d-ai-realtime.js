/* ===================================================================
   22d-ai-realtime.js
   HESEM MOM Portal - AI SSE Realtime Manager
   Server-Sent Events stream for AI predictions, schedule optimization,
   machine telemetry, and analysis completion notifications.
   Must load AFTER 22c-ai-recommendations.js.
   =================================================================== */

(function(){
'use strict';

/* ── helpers ──────────────────────────────────────────── */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }

window.HmAiStream = {
  _source: null,        // EventSource instance
  _handlers: {},        // {eventType: [handler1, handler2, ...]}
  _reconnectDelay: 1000, // current backoff delay
  _maxDelay: 30000,      // max backoff
  _status: 'disconnected', // connected, disconnected, reconnecting

  connect: function() {
    if (this._source) this.disconnect();
    this._status = 'reconnecting';
    this._updateStatusUI();

    try {
      var self = this;
      var url = ((window.HmRuntimePaths && HmRuntimePaths.apiBase) || '') +
                'api/events/stream?channels=ai,dashboard';
      this._source = new EventSource(url, { withCredentials: true });

      this._source.onopen = function() {
        self._status = 'connected';
        self._reconnectDelay = 1000; // reset backoff
        self._updateStatusUI();
      };

      this._source.onmessage = function(e) {
        try {
          var data = JSON.parse(e.data);
          var type = data.type || 'unknown';
          self._dispatch(type, data);
        } catch(err) { /* ignore parse errors */ }
      };

      this._source.onerror = function() {
        self._source.close();
        self._source = null;
        self._status = 'disconnected';
        self._updateStatusUI();
        // Reconnect with exponential backoff
        setTimeout(function() { self.connect(); }, self._reconnectDelay);
        self._reconnectDelay = Math.min(self._reconnectDelay * 2, self._maxDelay);
      };
    } catch(err) {
      this._status = 'disconnected';
      this._updateStatusUI();
    }
  },

  disconnect: function() {
    if (this._source) {
      this._source.close();
      this._source = null;
    }
    this._status = 'disconnected';
    this._updateStatusUI();
  },

  on: function(eventType, handler) {
    if (!this._handlers[eventType]) this._handlers[eventType] = [];
    this._handlers[eventType].push(handler);
  },

  off: function(eventType, handler) {
    if (!this._handlers[eventType]) return;
    this._handlers[eventType] = this._handlers[eventType].filter(function(h) { return h !== handler; });
  },

  _dispatch: function(type, data) {
    var handlers = this._handlers[type] || [];
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](data.data || data); } catch(e) { /* isolate handler errors */ }
    }
    // Also dispatch to wildcard handlers
    var wildcardHandlers = this._handlers['*'] || [];
    for (var j = 0; j < wildcardHandlers.length; j++) {
      try { wildcardHandlers[j](type, data.data || data); } catch(e) {}
    }
  },

  _updateStatusUI: function() {
    // Update all .ai-sse-status elements on the page
    var dots = document.querySelectorAll('.ai-sse-status');
    for (var i = 0; i < dots.length; i++) {
      dots[i].className = 'ai-status-dot ai-sse-status ' + this._status;
      var label = dots[i].nextElementSibling;
      if (label && label.classList.contains('ai-status-label')) {
        var labels = {connected: 'Connected', disconnected: 'Disconnected', reconnecting: 'Reconnecting...'};
        label.textContent = labels[this._status] || this._status;
      }
    }
  },

  getStatus: function() { return this._status; }
};

/* ── Register default event handlers ─────────────────── */
HmAiStream.on('ai.prediction.created', function(data) {
  // Update prediction count badge
  var badge = document.querySelector('.ai-active-count');
  if (badge) badge.textContent = parseInt(badge.textContent || '0') + 1;

  // Toast for critical/warning
  if (data.severity === 'critical') {
    if(typeof showToast === 'function') showToast(_t('CANH BAO AI: ' + (data.prediction_type || ''), 'AI ALERT: ' + (data.prediction_type || '')), 'error');
  } else if (data.severity === 'warning') {
    if(typeof showToast === 'function') showToast(_t('AI canh bao: ' + (data.prediction_type || ''), 'AI Warning: ' + (data.prediction_type || '')), 'warning');
  }
});

HmAiStream.on('ai.prediction.actioned', function(data) {
  if(typeof showToast === 'function') showToast(_t('AI da thuc hien: ' + (data.action_type || ''), 'AI Action: ' + (data.action_type || '')), 'info');
});

HmAiStream.on('ai.schedule.optimized', function(data) {
  var ganttTab = document.querySelector('[data-tab="gantt"], [data-key="gantt"]');
  if (ganttTab) {
    ganttTab.classList.add('ai-flash');
    setTimeout(function() { ganttTab.classList.remove('ai-flash'); }, 3000);
  }
});

HmAiStream.on('ai.analysis.completed', function(data) {
  if(typeof showToast === 'function') showToast(_t('Phan tich AI hoan tat', 'AI Analysis complete'), 'success');
});

/* ── Conditional auto-connect ─────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    // Only connect if AI is enabled (server sets window.HmAiEnabled)
    // and if EventSource is supported
    if (typeof EventSource !== 'undefined' && window.HmAiEnabled === true) {
      HmAiStream.connect();
    }
  }, 3000);
});

})();
