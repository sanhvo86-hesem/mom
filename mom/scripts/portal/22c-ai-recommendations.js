/* ===================================================================
   22c-ai-recommendations.js
   HESEM MOM Portal — AI Recommendation Panels
   Reusable AI-powered analysis panels for NCR root cause analysis,
   schedule optimization, and operator guidance.
   Integrates with quality-exception-hub, production-dispatch,
   and mobile-shopfloor modules.
   Must load AFTER 22-ai-quality-scheduling.js.
   =================================================================== */

(function(){
'use strict';

/* ── helpers (same pattern as parent module) ──────────── */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }
function _api(action, payload, method){
  if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000);
  return fetch('api.php?action='+encodeURIComponent(action),{method:method||'POST',credentials:'include',headers:{'Content-Type':'application/json',...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})}).then(function(r){return r.json();});
}
function _toast(msg, type){ if(typeof showToast==='function') return showToast(msg, type); }

/* ── loading state HTML ───────────────────────────────── */
function _loadingHtml(message){
  return '<div class="ai-loading">' + _esc(message || _t('Dang phan tich...', 'Analyzing...')) + '</div>';
}

/* ── error state HTML ─────────────────────────────────── */
function _errorHtml(message){
  return '<div style="text-align:center;padding:var(--space-6) var(--space-4);color:var(--red)">'
    + '<div style="font-size:1.25rem;margin-bottom:var(--space-2)">&#9888;</div>'
    + '<div style="font-size:var(--text-sm)">' + _esc(message || _t('Loi phan tich', 'Analysis error')) + '</div>'
  + '</div>';
}

/* ── probability bar ──────────────────────────────────── */
function _probabilityBar(probability, label){
  var pct = Math.min(100, Math.max(0, Math.round(probability)));
  var color = pct >= 70 ? 'var(--red)' : pct >= 40 ? 'var(--amber)' : 'var(--green)';
  return '<div style="margin-bottom:var(--space-2)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">'
      + '<span style="font-size:var(--text-xs);font-weight:var(--font-semibold)">' + _esc(label || '') + '</span>'
      + '<span style="font-size:var(--text-xs);font-weight:var(--font-bold);color:' + color + '">' + pct + '%</span>'
    + '</div>'
    + '<div style="height:8px;background:var(--bg-surface-alt);border-radius:var(--radius-full);overflow:hidden">'
      + '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:var(--radius-full);transition:width 0.3s"></div>'
    + '</div>'
  + '</div>';
}

/* ── confidence badge ─────────────────────────────────── */
function _confidenceBadge(confidence){
  var pct = Math.round(confidence || 0);
  var cls = pct >= 70 ? 'high-confidence' : pct >= 40 ? 'medium-confidence' : 'low-confidence';
  return '<span class="ai-prediction-badge ' + cls + '">'
    + pct + '% '
    + '<span class="ai-confidence-bar"><span class="ai-confidence-fill" style="width:' + pct + '%"></span></span>'
  + '</span>';
}

/* ── feedback section ─────────────────────────────────── */
function _feedbackHtml(analysisId){
  return '<div class="ai-feedback-section">'
    + '<span class="ai-feedback-label">' + _t('Huu ich?', 'Helpful?') + '</span>'
    + '<button class="ai-feedback-btn" data-action="ai-feedback" data-analysis="' + _esc(analysisId) + '" data-value="positive" title="' + _t('Co', 'Yes') + '">&#128077;</button>'
    + '<button class="ai-feedback-btn" data-action="ai-feedback" data-analysis="' + _esc(analysisId) + '" data-value="negative" title="' + _t('Khong', 'No') + '">&#128078;</button>'
  + '</div>';
}

/* ================================================================
   window.HmAiRecommend — Public API
   ================================================================ */
window.HmAiRecommend = {

  /* ── renderPanel: generic recommendation panel ──────── */
  renderPanel: function(container, config){
    if(!container) return;
    config = config || {};
    var title = config.title || _t('Phan tich AI', 'AI Analysis');
    var endpoint = config.endpoint;
    var params = config.params || {};
    var onAction = config.onAction || function(){};

    container.innerHTML = '<div class="ai-recommend-panel">'
      + '<div class="ai-panel-header">'
        + '<h3>&#129302; ' + _esc(title) + '</h3>'
        + _confidenceBadge(0)
      + '</div>'
      + '<div class="ai-panel-body">' + _loadingHtml() + '</div>'
    + '</div>';

    if(!endpoint){
      container.querySelector('.ai-panel-body').innerHTML = _errorHtml(_t('Thieu endpoint', 'Missing endpoint'));
      return;
    }

    _api(endpoint, params).then(function(r){
      var body = container.querySelector('.ai-panel-body');
      if(!body) return;

      if(!r || !r.ok){
        body.innerHTML = _errorHtml(r && r.error ? r.error : undefined);
        return;
      }

      var html = '';

      /* Update confidence in header */
      var header = container.querySelector('.ai-panel-header');
      if(header && r.confidence){
        var oldBadge = header.querySelector('.ai-prediction-badge');
        if(oldBadge){
          var tmp = document.createElement('span');
          tmp.innerHTML = _confidenceBadge(r.confidence);
          oldBadge.replaceWith(tmp.firstChild);
        }
      }

      /* Root causes */
      if(r.root_causes && r.root_causes.length){
        html += '<div style="margin-bottom:var(--space-4)">';
        html += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin-bottom:var(--space-2)">' + _t('Nguyen nhan goc', 'Root Causes') + '</div>';
        r.root_causes.forEach(function(rc){
          html += _probabilityBar(rc.probability, rc.description || rc.cause || rc.name);
        });
        html += '</div>';
      }

      /* Suggestions / recommendations */
      if(r.suggestions && r.suggestions.length){
        html += '<div style="margin-bottom:var(--space-4)">';
        html += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin-bottom:var(--space-2)">' + _t('Khuyen nghi', 'Suggestions') + '</div>';
        html += '<ul style="margin:0;padding-left:var(--space-5);font-size:var(--text-sm);color:var(--text-primary)">';
        r.suggestions.forEach(function(s){
          html += '<li style="margin-bottom:var(--space-1)">' + _esc(typeof s === 'string' ? s : s.text || s.description || '') + '</li>';
        });
        html += '</ul></div>';
      }

      /* Similar issues */
      if(r.similar_issues && r.similar_issues.length){
        html += '<div style="margin-bottom:var(--space-4)">';
        html += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin-bottom:var(--space-2)">' + _t('Van de tuong tu', 'Similar Issues') + '</div>';
        r.similar_issues.forEach(function(si){
          html += '<div style="padding:var(--space-2) var(--space-3);background:var(--bg-surface-alt);border-radius:var(--radius-md);margin-bottom:var(--space-1);font-size:var(--text-xs)">';
          html += '<strong>' + _esc(si.id || si.ncr_id || '') + '</strong>';
          if(si.title || si.subject) html += ' &mdash; ' + _esc(si.title || si.subject);
          if(si.similarity) html += ' <span style="color:var(--text-tertiary)">(' + Math.round(si.similarity) + '% ' + _t('tuong tu', 'similar') + ')</span>';
          html += '</div>';
        });
        html += '</div>';
      }

      /* Actions */
      if(r.actions && r.actions.length){
        html += '<div style="margin-bottom:var(--space-3)">';
        html += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin-bottom:var(--space-2)">' + _t('Hanh dong', 'Actions') + '</div>';
        html += '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap">';
        r.actions.forEach(function(act, idx){
          html += '<button class="ai-action-btn" data-action="ai-apply-action" data-index="' + idx + '">'
            + _esc(typeof act === 'string' ? act : act.label || act.title || _t('Ap dung', 'Apply'))
          + '</button>';
        });
        html += '</div></div>';
      }

      /* Feedback */
      html += _feedbackHtml(r.analysis_id || endpoint);

      body.innerHTML = html;

      /* Bind action buttons */
      body.addEventListener('click', function(e){
        var actionBtn = e.target.closest('[data-action="ai-apply-action"]');
        if(actionBtn){
          var idx = parseInt(actionBtn.getAttribute('data-index'));
          var act = (r.actions || [])[idx];
          if(act) onAction(act, idx);
          return;
        }

        var feedbackBtn = e.target.closest('[data-action="ai-feedback"]');
        if(feedbackBtn){
          var analysisId = feedbackBtn.getAttribute('data-analysis');
          var value = feedbackBtn.getAttribute('data-value');
          _api('ai_feedback', { analysis_id:analysisId, value:value }).then(function(){
            feedbackBtn.classList.add('selected');
            if(value === 'negative') feedbackBtn.classList.add('negative');
            _toast(_t('Cam on phan hoi!', 'Thanks for the feedback!'), 'success');
          });
          return;
        }
      });

    }).catch(function(err){
      var body = container.querySelector('.ai-panel-body');
      if(body) body.innerHTML = _errorHtml(_t('Loi ket noi', 'Connection error'));
    });
  },

  /* ── renderNcrAnalysis: NCR-specific analysis ──────── */
  renderNcrAnalysis: function(container, ncrId){
    if(!container || !ncrId) return;

    this.renderPanel(container, {
      title: _t('Phan tich nguyen nhan NCR', 'NCR Root Cause Analysis'),
      endpoint: 'ai_rca_analyze',
      params: { ncr_id:ncrId },
      onAction: function(action, idx){
        if(action.type === 'assign_corrective'){
          _api('quality_exception_update', {
            id:ncrId,
            corrective_action:action.description || action.text
          }).then(function(r){
            if(r && r.ok){
              _toast(_t('Da ap dung hanh dong khac phuc', 'Corrective action applied'), 'success');
            } else {
              _toast(_t('Loi ap dung', 'Failed to apply'), 'error');
            }
          });
        } else if(action.type === 'create_capa'){
          _api('quality_exception_create', {
            type:'capa',
            subject:action.subject || _t('CAPA tu NCR ' + ncrId, 'CAPA from NCR ' + ncrId),
            description:action.description || '',
            linked_ncr:ncrId,
            severity:action.severity || 'major'
          }).then(function(r){
            if(r && r.ok){
              _toast(_t('Da tao CAPA', 'CAPA created'), 'success');
            } else {
              _toast(_t('Loi tao CAPA', 'Failed to create CAPA'), 'error');
            }
          });
        } else {
          _toast(_t('Hanh dong: ', 'Action: ') + _esc(action.label || action.title || ''), 'info');
        }
      }
    });
  },

  /* ── renderScheduleOptimization: production schedule ── */
  renderScheduleOptimization: function(container){
    if(!container) return;

    this.renderPanel(container, {
      title: _t('Toi uu lich trinh san xuat', 'Schedule Optimization'),
      endpoint: 'ai_schedule_optimize',
      params: {},
      onAction: function(action, idx){
        if(action.type === 'reschedule'){
          _api('schedule_slot_move', {
            slot_id:action.slot_id,
            new_machine:action.new_machine,
            new_start:action.new_start
          }).then(function(r){
            if(r && r.ok){
              _toast(_t('Da di chuyen slot', 'Slot moved'), 'success');
            } else {
              _toast(_t('Loi di chuyen', 'Move failed'), 'error');
            }
          });
        } else {
          _toast(_t('Hanh dong: ', 'Action: ') + _esc(action.label || ''), 'info');
        }
      }
    });
  },

  /* ── renderOperatorGuidance: compact machine tips ───── */
  renderOperatorGuidance: function(container, machineId){
    if(!container || !machineId) return;

    var panelId = 'ai-operator-guidance-' + _esc(machineId);

    container.innerHTML = '<div id="' + panelId + '" style="background:linear-gradient(135deg,var(--blue-bg) 0%,var(--bg-surface) 100%);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-3);position:relative">'
      + '<div style="display:flex;align-items:center;gap:var(--space-2)">'
        + '<span style="font-size:1rem">&#129302;</span>'
        + '<span style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--brand-2)">' + _t('Huong dan AI', 'AI Guidance') + '</span>'
        + '<div style="flex:1"></div>'
        + '<button data-action="ai-dismiss-guidance" data-panel="' + panelId + '" style="background:none;border:none;cursor:pointer;font-size:var(--text-sm);color:var(--text-tertiary);padding:var(--space-1)" title="' + _t('Dong', 'Dismiss') + '">&#10005;</button>'
      + '</div>'
      + '<div id="' + panelId + '-content" style="margin-top:var(--space-2)">'
        + '<div style="font-size:var(--text-xs);color:var(--text-secondary)">' + _t('Dang tai huong dan...', 'Loading guidance...') + '</div>'
      + '</div>'
    + '</div>';

    /* Fetch predictions for this machine */
    _api('ai_operator_guidance', { machine_id:machineId }).then(function(r){
      var content = container.querySelector('#' + panelId + '-content');
      if(!content) return;

      if(!r || !r.ok || !r.tips || !r.tips.length){
        content.innerHTML = '<div style="font-size:var(--text-xs);color:var(--text-tertiary)">' + _t('Khong co khuyen nghi', 'No recommendations at this time') + '</div>';
        return;
      }

      var html = '';
      r.tips.forEach(function(tip, idx){
        var icon = tip.severity === 'critical' ? '&#9888;' : tip.severity === 'warning' ? '&#9888;' : '&#128161;';
        var color = tip.severity === 'critical' ? 'var(--red)' : tip.severity === 'warning' ? 'var(--amber)' : 'var(--brand-2)';
        html += '<div style="display:flex;align-items:flex-start;gap:var(--space-2);margin-bottom:var(--space-1);font-size:var(--text-xs)">';
        html += '<span style="color:' + color + ';flex-shrink:0">' + icon + '</span>';
        html += '<span style="color:var(--text-primary)">' + _esc(tip.message || tip.text || '') + '</span>';
        html += '</div>';
      });

      if(r.active_predictions){
        html += '<div style="margin-top:var(--space-2);font-size:0.625rem;color:var(--text-tertiary)">'
          + _t('Du doan hoat dong: ', 'Active predictions: ') + r.active_predictions
        + '</div>';
      }

      content.innerHTML = html;
    }).catch(function(){
      var content = container.querySelector('#' + panelId + '-content');
      if(content){
        content.innerHTML = '<div style="font-size:var(--text-xs);color:var(--text-tertiary)">' + _t('Khong the tai huong dan', 'Could not load guidance') + '</div>';
      }
    });

    /* Dismiss handler */
    container.addEventListener('click', function(e){
      var dismissBtn = e.target.closest('[data-action="ai-dismiss-guidance"]');
      if(dismissBtn){
        var panelEl = container.querySelector('#' + dismissBtn.getAttribute('data-panel'));
        if(panelEl){
          panelEl.style.transition = 'opacity 0.2s, max-height 0.3s';
          panelEl.style.opacity = '0';
          panelEl.style.maxHeight = '0';
          panelEl.style.overflow = 'hidden';
          panelEl.style.padding = '0';
          panelEl.style.margin = '0';
          panelEl.style.border = 'none';
          setTimeout(function(){ if(panelEl.parentNode) panelEl.remove(); }, 300);
        }
      }
    });
  },

  /* ── injectIntoNcrDetail: callable by other modules ─── */
  injectIntoNcrDetail: function(parentEl, ncrId){
    if(!parentEl || !ncrId) return;
    /* Avoid duplicates */
    var existing = parentEl.querySelector('#ai-ncr-panel-' + ncrId);
    if(existing) return;

    var panel = document.createElement('div');
    panel.id = 'ai-ncr-panel-' + ncrId;
    panel.style.marginTop = 'var(--space-4, 16px)';
    parentEl.appendChild(panel);
    this.renderNcrAnalysis(panel, ncrId);
  },

  /* ── injectOperatorGuidance: callable by mobile module ─ */
  injectOperatorGuidance: function(parentEl, machineId){
    if(!parentEl || !machineId) return;
    var existing = parentEl.querySelector('#ai-operator-guidance-' + machineId);
    if(existing) return;

    var wrapper = document.createElement('div');
    wrapper.id = 'ai-op-wrapper-' + machineId;
    /* Insert at the top of the parent */
    if(parentEl.firstChild){
      parentEl.insertBefore(wrapper, parentEl.firstChild);
    } else {
      parentEl.appendChild(wrapper);
    }
    this.renderOperatorGuidance(wrapper, machineId);
  }
};

/* ================================================================
   Auto-injection hooks for existing modules
   ================================================================ */

/* ── Hook: Quality Exception Hub NCR detail ───────────── */
/* Observe DOM changes to detect when an NCR detail view is rendered.
   The quality-exception-hub uses state.selectedId and renders a
   .qeh-detail element. We watch for that and inject the AI panel. */

var _ncrObserver = null;
var _lastInjectedNcrId = null;

function _setupNcrDetailObserver(){
  /* Look for the QEH container */
  if(_ncrObserver) return;

  var checkAndInject = function(){
    /* Find QEH detail views */
    var details = document.querySelectorAll('.qeh-detail');
    details.forEach(function(detail){
      /* Check if this detail has an NCR ID - look for ID text in the meta */
      var meta = detail.querySelector('.qeh-card-meta');
      if(!meta) return;
      var idSpan = meta.querySelector('span');
      if(!idSpan) return;
      var text = idSpan.textContent || '';
      var idMatch = text.match(/ID:\s*(.+)/);
      if(!idMatch) return;
      var ncrId = idMatch[1].trim();
      if(!ncrId || ncrId === _lastInjectedNcrId) return;

      /* Check for action buttons (transition buttons indicate this is a detail view, not a create form) */
      var transitionBtns = detail.querySelectorAll('[data-action="transition"]');
      if(!transitionBtns.length) return;

      _lastInjectedNcrId = ncrId;
      window.HmAiRecommend.injectIntoNcrDetail(detail, ncrId);
    });
  };

  /* Use MutationObserver to watch for detail rendering */
  _ncrObserver = new MutationObserver(function(mutations){
    var shouldCheck = false;
    for(var i = 0; i < mutations.length; i++){
      if(mutations[i].addedNodes.length){
        shouldCheck = true;
        break;
      }
    }
    if(shouldCheck){
      /* Debounce slightly */
      clearTimeout(_ncrObserver._debounce);
      _ncrObserver._debounce = setTimeout(checkAndInject, 200);
    }
  });

  /* Start observing once document is ready */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      _ncrObserver.observe(document.body, { childList:true, subtree:true });
    });
  } else {
    _ncrObserver.observe(document.body, { childList:true, subtree:true });
  }
}

/* ── Hook: Custom events (future modules can emit these) ─ */
document.addEventListener('ncr-detail-shown', function(e){
  if(e.detail && e.detail.ncrId && e.detail.container){
    window.HmAiRecommend.injectIntoNcrDetail(e.detail.container, e.detail.ncrId);
  }
});

document.addEventListener('machine-selected', function(e){
  if(e.detail && e.detail.machineId && e.detail.container){
    window.HmAiRecommend.injectOperatorGuidance(e.detail.container, e.detail.machineId);
  }
});

/* Initialize the NCR detail observer */
_setupNcrDetailObserver();

})();
