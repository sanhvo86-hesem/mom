/* ===================================================================
   22b-ai-chat-interface.js
   HESEM MOM Portal — AI Chat Interface
   Adds an "AI Assistant" tab to the AI Quality & Scheduling module.
   Provides natural-language querying of production data, OEE, NCRs,
   schedule info, and more via the ai_nl_query endpoint.
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

/* ── state ────────────────────────────────────────────── */
var chatState = {
  messages: [],
  conversationId: null,
  isStreaming: false,
  suggestedQuestions: [],
  historyLoaded: false,
  conversations: [],
  connected: true
};

/* ── simple markdown renderer ─────────────────────────── */
function _renderMarkdown(text){
  if(!text) return '';
  // Escape HTML first
  var out = _esc(text);

  // ```code blocks``` → <pre><code>
  out = out.replace(/```([\s\S]*?)```/g, function(m, code){
    return '<pre style="background:var(--bg-surface-alt);padding:var(--space-3);border-radius:var(--radius-md);overflow-x:auto;font-size:var(--text-xs);font-family:var(--font-mono,monospace);margin:var(--space-2) 0"><code>' + code.trim() + '</code></pre>';
  });

  // `inline code` → <code>
  out = out.replace(/`([^`]+)`/g, '<code style="background:var(--bg-surface-alt);padding:1px 4px;border-radius:var(--radius-sm);font-size:var(--text-xs);font-family:var(--font-mono,monospace)">$1</code>');

  // **bold** → <strong>
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Table: lines starting with |
  out = out.replace(/((?:^|\n)\|.+\|(?:\n\|.+\|)*)/g, function(block){
    var lines = block.trim().split('\n').filter(function(l){ return l.trim().length > 0; });
    if(lines.length < 2) return block;
    var html = '<table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);margin:var(--space-2) 0">';
    lines.forEach(function(line, idx){
      // skip separator line (|---|---|)
      if(/^\|[\s\-:]+\|$/.test(line.trim())) return;
      var cells = line.split('|').filter(function(c, ci, arr){ return ci > 0 && ci < arr.length - 1; });
      var tag = idx === 0 ? 'th' : 'td';
      var style = idx === 0
        ? 'padding:var(--space-2) var(--space-3);border-bottom:2px solid var(--border);text-align:left;font-weight:700;color:var(--text-secondary);font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.06em'
        : 'padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--border)';
      html += '<tr>';
      cells.forEach(function(c){ html += '<' + tag + ' style="' + style + '">' + c.trim() + '</' + tag + '>'; });
      html += '</tr>';
    });
    html += '</table>';
    return html;
  });

  // - list items → <ul><li>
  out = out.replace(/((?:^|\n)- .+(?:\n- .+)*)/g, function(block){
    var items = block.trim().split('\n');
    var html = '<ul style="margin:var(--space-2) 0;padding-left:var(--space-5);font-size:var(--text-sm)">';
    items.forEach(function(item){
      html += '<li style="margin-bottom:2px">' + item.replace(/^- /, '') + '</li>';
    });
    html += '</ul>';
    return html;
  });

  // Line breaks
  out = out.replace(/\n/g, '<br>');

  return out;
}

/* ── create message bubble ────────────────────────────── */
function _createBubble(role, content, timestamp){
  var cls = 'ai-chat-bubble ' + (role === 'user' ? 'user' : 'assistant');
  var timeStr = '';
  if(timestamp){
    var d = new Date(timestamp);
    if(!isNaN(d.getTime())){
      timeStr = '<div style="font-size:0.625rem;opacity:0.6;margin-top:var(--space-1)">' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + '</div>';
    }
  }
  var rendered = role === 'user' ? _esc(content) : _renderMarkdown(content);
  return '<div class="' + cls + '">' + rendered + timeStr + '</div>';
}

/* ── typing indicator ─────────────────────────────────── */
function _typingIndicator(){
  return '<div class="ai-chat-bubble assistant" id="ai-typing-indicator" style="display:flex;align-items:center;gap:var(--space-2)">'
    + '<span style="display:inline-block;width:6px;height:6px;border-radius:var(--radius-full);background:var(--text-tertiary);animation:ai-pulse 1.5s ease-in-out infinite"></span>'
    + '<span style="display:inline-block;width:6px;height:6px;border-radius:var(--radius-full);background:var(--text-tertiary);animation:ai-pulse 1.5s ease-in-out 0.2s infinite"></span>'
    + '<span style="display:inline-block;width:6px;height:6px;border-radius:var(--radius-full);background:var(--text-tertiary);animation:ai-pulse 1.5s ease-in-out 0.4s infinite"></span>'
    + '<span style="font-size:var(--text-xs);color:var(--text-tertiary);margin-left:var(--space-2)">' + _t('Dang xu ly...', 'Thinking...') + '</span>'
  + '</div>';
}

/* ── render suggestions ───────────────────────────────── */
function _renderSuggestions(container){
  var questions = chatState.suggestedQuestions.length
    ? chatState.suggestedQuestions
    : [
      _t('OEE hien tai cua tat ca may?', 'Current OEE for all machines?'),
      _t('NCR mo trong tuan nay?', 'Open NCRs this week?'),
      _t('May nao co OEE thap nhat?', 'Which machine has lowest OEE?'),
      _t('Lich san xuat hom nay?', 'Today\'s production schedule?')
    ];

  var html = '<div class="ai-suggested-questions">';
  questions.forEach(function(q){
    html += '<button data-action="ai-suggest" data-question="' + _esc(q) + '">' + _esc(q) + '</button>';
  });
  html += '</div>';
  container.innerHTML = html;
}

/* ── send message ─────────────────────────────────────── */
function _sendMessage(question, container){
  if(!question || !question.trim()) return;
  question = question.trim();

  // Add user message
  chatState.messages.push({ role:'user', content:question, timestamp:new Date().toISOString() });
  _paintMessages(container);

  // Show typing indicator
  chatState.isStreaming = true;
  var msgArea = container.querySelector('#ai-chat-messages');
  if(msgArea){
    msgArea.insertAdjacentHTML('beforeend', _typingIndicator());
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  // Disable send button
  var sendBtn = container.querySelector('#ai-chat-send');
  if(sendBtn) sendBtn.disabled = true;
  var input = container.querySelector('#ai-chat-input');
  if(input){ input.value = ''; input.disabled = true; }

  // Call API
  _api('ai_nl_query', {
    question: question,
    context_type: 'production_query',
    conversation_id: chatState.conversationId
  }).then(function(r){
    chatState.isStreaming = false;
    // Remove typing indicator
    var typing = container.querySelector('#ai-typing-indicator');
    if(typing) typing.remove();

    if(r && r.ok){
      var answer = r.answer || r.response || r.text || _t('Khong co phan hoi', 'No response');
      chatState.messages.push({ role:'assistant', content:answer, timestamp:new Date().toISOString() });
      if(r.conversation_id) chatState.conversationId = r.conversation_id;

      // Update suggested questions if provided
      if(r.suggested_questions && r.suggested_questions.length){
        chatState.suggestedQuestions = r.suggested_questions;
      }

      // Render data tables if present
      if(r.data && r.data.length){
        var tableContent = _renderDataTable(r.data, r.columns);
        chatState.messages.push({ role:'assistant', content:tableContent, timestamp:new Date().toISOString(), isHtml:true });
      }
    } else {
      chatState.messages.push({ role:'assistant', content:_t('Loi: Khong the xu ly yeu cau.', 'Error: Could not process the request.'), timestamp:new Date().toISOString() });
    }
    _paintMessages(container);
    _updateSuggestions(container);
    // Re-enable input
    if(sendBtn) sendBtn.disabled = false;
    if(input){ input.disabled = false; input.focus(); }
  }).catch(function(err){
    chatState.isStreaming = false;
    var typing = container.querySelector('#ai-typing-indicator');
    if(typing) typing.remove();
    chatState.messages.push({ role:'assistant', content:_t('Loi ket noi. Vui long thu lai.', 'Connection error. Please try again.'), timestamp:new Date().toISOString() });
    _paintMessages(container);
    if(sendBtn) sendBtn.disabled = false;
    if(input){ input.disabled = false; input.focus(); }
  });
}

/* ── render data table from API response ──────────────── */
function _renderDataTable(data, columns){
  if(!data || !data.length) return '';
  var cols = columns || Object.keys(data[0]);
  var html = '| ' + cols.join(' | ') + ' |\n';
  html += '| ' + cols.map(function(){ return '---'; }).join(' | ') + ' |\n';
  data.forEach(function(row){
    html += '| ' + cols.map(function(c){ return String(row[c] != null ? row[c] : '-'); }).join(' | ') + ' |\n';
  });
  return html;
}

/* ── paint messages area ──────────────────────────────── */
function _paintMessages(container){
  var msgArea = container.querySelector('#ai-chat-messages');
  if(!msgArea) return;

  var html = '';
  if(!chatState.messages.length){
    html += '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);text-align:center;padding:var(--space-8)">';
    html += '<div style="font-size:2rem;margin-bottom:var(--space-3)">🤖</div>';
    html += '<div style="font-size:var(--text-sm);font-weight:var(--font-semibold)">' + _t('Tro ly AI HESEM MOM', 'HESEM MOM AI Assistant') + '</div>';
    html += '<div style="font-size:var(--text-xs);margin-top:var(--space-1)">' + _t('Hoi bat ky cau hoi nao ve san xuat, chat luong, lich trinh...', 'Ask any question about production, quality, scheduling...') + '</div>';
    html += '</div>';
  } else {
    chatState.messages.forEach(function(msg){
      if(msg.isHtml){
        html += '<div class="ai-chat-bubble assistant">' + _renderMarkdown(msg.content) + '</div>';
      } else {
        html += _createBubble(msg.role, msg.content, msg.timestamp);
      }
    });
  }
  msgArea.innerHTML = html;
  msgArea.scrollTop = msgArea.scrollHeight;
}

/* ── update suggestions row ───────────────────────────── */
function _updateSuggestions(container){
  var suggestArea = container.querySelector('#ai-chat-suggestions');
  if(suggestArea) _renderSuggestions(suggestArea);
}

/* ── load conversation history ────────────────────────── */
function _loadHistory(container){
  _api('ai_conversation_history', null, 'GET').then(function(r){
    if(r && r.ok && r.conversations){
      chatState.conversations = r.conversations;
    }
    chatState.historyLoaded = true;
  }).catch(function(){
    chatState.historyLoaded = true;
  });
}

/* ── main render function ─────────────────────────────── */
function renderAiChat(container){
  var html = '';

  /* Header with title + connection status */
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border);background:var(--bg-surface-alt)">';
  html += '<div style="display:flex;align-items:center;gap:var(--space-2)">';
  html += '<span style="font-size:1.25rem">🤖</span>';
  html += '<span style="font-size:var(--text-sm);font-weight:var(--font-bold)">' + _t('Tro ly AI', 'AI Assistant') + '</span>';
  html += '</div>';
  html += '<div class="ai-status-label">';
  html += '<span class="ai-status-dot ' + (chatState.connected ? 'connected' : 'disconnected') + '"></span>';
  html += _t(chatState.connected ? 'Da ket noi' : 'Mat ket noi', chatState.connected ? 'Connected' : 'Disconnected');
  html += '</div>';
  html += '</div>';

  /* Chat container */
  html += '<div class="ai-chat-container" style="border:none;border-radius:0;box-shadow:none">';

  /* Messages area */
  html += '<div class="ai-chat-messages" id="ai-chat-messages" style="min-height:350px;max-height:500px"></div>';

  /* Suggested questions row */
  html += '<div id="ai-chat-suggestions"></div>';

  /* Input area */
  html += '<div class="ai-chat-input-area">';
  html += '<textarea id="ai-chat-input" rows="1" placeholder="' + _t('Nhap cau hoi...', 'Type your question...') + '" style="min-height:36px;max-height:100px"></textarea>';
  html += '<button id="ai-chat-send" title="' + _t('Gui', 'Send') + '">&#9654;</button>';
  html += '</div>';

  html += '</div>';

  /* Conversation history toggle */
  html += '<div style="padding:var(--space-3) var(--space-4);border-top:1px solid var(--border)">';
  html += '<details style="font-size:var(--text-xs);color:var(--text-secondary)">';
  html += '<summary style="cursor:pointer;font-weight:var(--font-semibold)">' + _t('Lich su hoi thoai', 'Conversation History') + '</summary>';
  html += '<div id="ai-chat-history" style="margin-top:var(--space-2);max-height:200px;overflow-y:auto"></div>';
  html += '</details>';
  html += '</div>';

  container.innerHTML = html;

  /* Paint initial messages */
  _paintMessages(container);

  /* Render suggestions */
  var suggestArea = container.querySelector('#ai-chat-suggestions');
  if(suggestArea) _renderSuggestions(suggestArea);

  /* Load history */
  _loadHistory(container);

  /* Bind events */
  _bindChatEvents(container);
}

/* ── event binding ────────────────────────────────────── */
function _bindChatEvents(container){
  /* Send button click */
  container.addEventListener('click', function(e){
    var sendBtn = e.target.closest('#ai-chat-send');
    if(sendBtn){
      var input = container.querySelector('#ai-chat-input');
      if(input && input.value.trim()){
        _sendMessage(input.value, container);
      }
      return;
    }

    /* Suggested question click */
    var suggestBtn = e.target.closest('[data-action="ai-suggest"]');
    if(suggestBtn){
      var question = suggestBtn.getAttribute('data-question');
      if(question){
        _sendMessage(question, container);
      }
      return;
    }

    /* History item click */
    var histItem = e.target.closest('[data-action="ai-load-conv"]');
    if(histItem){
      var convId = histItem.getAttribute('data-conv-id');
      _loadConversation(convId, container);
      return;
    }

    /* New conversation */
    var newConvBtn = e.target.closest('[data-action="ai-new-conv"]');
    if(newConvBtn){
      chatState.messages = [];
      chatState.conversationId = null;
      chatState.suggestedQuestions = [];
      _paintMessages(container);
      _updateSuggestions(container);
      return;
    }
  });

  /* Textarea enter to send (shift+enter for newline) */
  var input = container.querySelector('#ai-chat-input');
  if(input){
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        if(input.value.trim() && !chatState.isStreaming){
          _sendMessage(input.value, container);
        }
      }
    });

    /* Auto-resize textarea */
    input.addEventListener('input', function(){
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
  }

  /* History toggle: load when opened */
  var details = container.querySelector('details');
  if(details){
    details.addEventListener('toggle', function(){
      if(details.open){
        _renderHistory(container);
      }
    });
  }
}

/* ── load specific conversation ───────────────────────── */
function _loadConversation(convId, container){
  _api('ai_conversation_detail', {conversation_id:convId}, 'GET').then(function(r){
    if(r && r.ok){
      chatState.conversationId = convId;
      chatState.messages = (r.messages || []).map(function(m){
        return { role:m.role, content:m.content, timestamp:m.timestamp };
      });
      _paintMessages(container);
    }
  }).catch(function(){
    _toast(_t('Loi tai lich su', 'Error loading history'), 'error');
  });
}

/* ── render conversation history list ─────────────────── */
function _renderHistory(container){
  var histArea = container.querySelector('#ai-chat-history');
  if(!histArea) return;

  if(!chatState.conversations.length){
    histArea.innerHTML = '<div style="padding:var(--space-2);color:var(--text-tertiary);font-size:var(--text-xs)">' + _t('Chua co lich su', 'No history yet') + '</div>';
    return;
  }

  var html = '<button class="ai-action-btn" style="margin-bottom:var(--space-2);font-size:var(--text-xs);padding:var(--space-1) var(--space-3)" data-action="ai-new-conv">' + _t('Hoi thoai moi', 'New Conversation') + '</button>';
  chatState.conversations.forEach(function(conv){
    var preview = conv.preview || conv.title || _t('Hoi thoai', 'Conversation');
    html += '<div style="padding:var(--space-2);border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s" data-action="ai-load-conv" data-conv-id="' + _esc(conv.id) + '">';
    html += '<div style="font-weight:var(--font-semibold);font-size:var(--text-xs)">' + _esc(preview) + '</div>';
    if(conv.created_at){
      var d = new Date(conv.created_at);
      if(!isNaN(d.getTime())){
        html += '<div style="font-size:0.625rem;color:var(--text-tertiary)">' + String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() + '</div>';
      }
    }
    html += '</div>';
  });
  histArea.innerHTML = html;
}

/* ── Register with parent module ──────────────────────── */
window._aiChatRenderer = renderAiChat;

})();
