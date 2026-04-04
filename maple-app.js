// ════════════════════════════════════════════════════════
//  MAPLE — app.js
//  UI controller. Handles all DOM interaction, security,
//  PWA registration, and wires brain.js to the interface.
// ════════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════
//  SECURITY CONFIG
// ════════════════════════════════════════════════════════

const SECURITY = Object.freeze({
  MAX_INPUT:           4000,   // chars per message
  MIN_INPUT:           1,
  MAX_MSG_PER_WINDOW:  15,     // messages in rate window
  RATE_WINDOW_MS:      15000,  // 15 seconds
  LOCKOUT_MS:          30000,  // 30 second lockout
  TYPING_DELAY_MIN:    400,    // ms — feels natural
  TYPING_DELAY_MAX:    1200
});

// ════════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════════

const State = {
  // Current session
  session: {
    id:       `s_${Date.now()}`,
    title:    'New conversation',
    messages: [],
    created:  Date.now()
  },

  // UI state
  isReplying:   false,
  isLockedOut:  false,
  sidebarOpen:  false,

  // Rate limiting
  msgTimestamps: [],
  lockoutTimer:  null,

  // Active panel ('memory' | 'settings' | null)
  activePanel: null
};

// ════════════════════════════════════════════════════════
//  DOM REFERENCES
// ════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);

const DOM = {
  messages:       $('messages'),
  userInput:      $('user-input'),
  sendBtn:        $('send-btn'),
  charCount:      $('char-count'),
  statusText:     $('status-text'),
  statusPulse:    document.querySelector('.status-pulse'),
  chatTitle:      $('chat-title'),
  historyList:    $('history-list'),
  memoryCount:    $('memory-count-badge'),
  welcomeScreen:  $('welcome-screen'),

  // Memory panel
  memoryPanel:    $('memory-panel'),
  memoryList:     $('memory-list'),
  memoryEmpty:    $('memory-empty'),
  memoryInput:    $('memory-input'),
  memoryAddBtn:   $('memory-add-btn'),

  // Settings panel
  settingsPanel:  $('settings-panel'),
  settingsName:   $('settings-name'),
  autolearnToggle:$('autolearn-toggle'),
  styleSelect:    $('style-select'),

  // Backdrop
  backdrop:       $('panel-backdrop'),

  // Sidebar
  sidebar:        $('sidebar'),
  overlay:        $('sidebar-overlay')
};

// ════════════════════════════════════════════════════════
//  SECURITY UTILITIES
// ════════════════════════════════════════════════════════

function sanitize(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, SECURITY.MAX_INPUT);
}

function checkRateLimit() {
  if (State.isLockedOut) return false;
  const now = Date.now();
  State.msgTimestamps = State.msgTimestamps.filter(
    t => now - t < SECURITY.RATE_WINDOW_MS
  );
  if (State.msgTimestamps.length >= SECURITY.MAX_MSG_PER_WINDOW) {
    activateLockout();
    return false;
  }
  State.msgTimestamps.push(now);
  return true;
}

function activateLockout() {
  State.isLockedOut = true;
  DOM.userInput.disabled = true;
  DOM.userInput.placeholder = 'Slow down a bit… try again in 30 seconds.';
  DOM.sendBtn.disabled = true;
  addBotMessage("You're sending messages very quickly. Please take a moment — I'll be ready again in 30 seconds. 🌸", false);
  if (State.lockoutTimer) clearTimeout(State.lockoutTimer);
  State.lockoutTimer = setTimeout(() => {
    State.isLockedOut = false;
    State.msgTimestamps = [];
    DOM.userInput.disabled = false;
    DOM.userInput.placeholder = 'Ask Maple anything…';
    DOM.sendBtn.disabled = false;
    DOM.userInput.focus();
  }, SECURITY.LOCKOUT_MS);
}

// ════════════════════════════════════════════════════════
//  STATUS INDICATOR
// ════════════════════════════════════════════════════════

function setStatus(text, thinking = false) {
  DOM.statusText.textContent = text;
  if (thinking) {
    DOM.statusPulse.classList.add('thinking');
  } else {
    DOM.statusPulse.classList.remove('thinking');
  }
}

// ════════════════════════════════════════════════════════
//  TEXTAREA AUTO-RESIZE
// ════════════════════════════════════════════════════════

function resizeTextarea() {
  DOM.userInput.style.height = 'auto';
  DOM.userInput.style.height = Math.min(DOM.userInput.scrollHeight, 160) + 'px';
}

// ════════════════════════════════════════════════════════
//  WELCOME SCREEN
// ════════════════════════════════════════════════════════

function hideWelcome() {
  if (DOM.welcomeScreen && DOM.welcomeScreen.parentNode) {
    DOM.welcomeScreen.style.opacity = '0';
    DOM.welcomeScreen.style.transform = 'translateY(-8px)';
    DOM.welcomeScreen.style.transition = 'opacity 0.25s, transform 0.25s';
    setTimeout(() => {
      if (DOM.welcomeScreen.parentNode) {
        DOM.welcomeScreen.parentNode.removeChild(DOM.welcomeScreen);
      }
    }, 250);
  }
}

// ════════════════════════════════════════════════════════
//  MESSAGE RENDERING
// ════════════════════════════════════════════════════════

function addUserMessage(text) {
  hideWelcome();

  const row = document.createElement('div');
  row.className = 'message-row user';

  const bubble = document.createElement('div');
  bubble.className = 'bubble user';
  // SECURITY: textContent for all user input
  bubble.textContent = text;

  row.appendChild(bubble);
  DOM.messages.appendChild(row);
  scrollToBottom();

  // Save to session
  State.session.messages.push({ role: 'user', text, time: Date.now() });
  if (State.session.messages.length === 1) {
    State.session.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
    DOM.chatTitle.textContent = State.session.title;
  }
}

function addBotMessage(htmlContent, showLearnedTag = false) {
  const row = document.createElement('div');
  row.className = 'message-row bot';

  const avatar = document.createElement('div');
  avatar.className = 'maple-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = '🌸';

  const wrapper = document.createElement('div');

  const bubble = document.createElement('div');
  bubble.className = 'bubble bot';
  // Bot content is from our trusted brain — safe to use innerHTML
  bubble.innerHTML = htmlContent;

  if (showLearnedTag) {
    const tag = document.createElement('div');
    tag.className = 'memory-learned-tag';
    tag.innerHTML = '🌸 Saved to memory';
    bubble.appendChild(tag);
  }

  wrapper.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(wrapper);
  DOM.messages.appendChild(row);
  scrollToBottom();

  // Save to session (store plain-ish version)
  State.session.messages.push({ role: 'bot', text: bubble.textContent, time: Date.now() });
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.className = 'maple-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = '🌸';

  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  row.appendChild(avatar);
  row.appendChild(bubble);
  DOM.messages.appendChild(row);
  scrollToBottom();
}

function hideTyping() {
  const el = $('typing-indicator');
  if (el) el.remove();
}

function scrollToBottom() {
  DOM.messages.scrollTop = DOM.messages.scrollHeight;
}

// ════════════════════════════════════════════════════════
//  SEND PIPELINE
// ════════════════════════════════════════════════════════

function sendMessage() {
  if (State.isReplying || State.isLockedOut) return;
  if (!checkRateLimit()) return;

  const raw  = DOM.userInput.value;
  const safe = sanitize(raw).trim();

  if (safe.length < SECURITY.MIN_INPUT) return;

  // Render user message
  addUserMessage(safe);
  DOM.userInput.value = '';
  DOM.userInput.style.height = 'auto';
  DOM.charCount.textContent = '0 / 4000';
  DOM.sendBtn.disabled = true;

  // Thinking state
  State.isReplying = true;
  setStatus('Thinking…', true);
  showTyping();

  // Get auto-learn setting
  const autoLearn = MapleSettings.get('autoLearn') !== false;

  // Natural delay before reply
  const delay = SECURITY.TYPING_DELAY_MIN +
    Math.random() * (SECURITY.TYPING_DELAY_MAX - SECURITY.TYPING_DELAY_MIN);

  setTimeout(() => {
    hideTyping();

    // Process through brain
    const result = MapleBrain.process(safe, { autoLearn });

    // Show reply
    addBotMessage(result.html, result.learned.length > 0);

    // If new memories were learned, refresh the memory panel
    if (result.learned.length > 0) {
      refreshMemoryPanel();
    }

    // Save session to history
    MapleHistory.saveSession(State.session);
    refreshHistory();

    // Reset state
    State.isReplying = false;
    setStatus('Ready');
    DOM.sendBtn.disabled = DOM.userInput.value.trim().length === 0;
    DOM.userInput.focus();
  }, delay);
}

// ════════════════════════════════════════════════════════
//  MEMORY PANEL
// ════════════════════════════════════════════════════════

function refreshMemoryPanel() {
  const memories = MapleMemory.load();
  DOM.memoryCount.textContent = memories.length;

  DOM.memoryList.innerHTML = '';

  if (memories.length === 0) {
    DOM.memoryEmpty.style.display = 'block';
    return;
  }

  DOM.memoryEmpty.style.display = 'none';

  memories.forEach(mem => {
    const item = document.createElement('div');
    item.className = 'memory-item';
    item.setAttribute('role', 'listitem');

    const icon = document.createElement('div');
    icon.className = 'memory-item-icon';
    icon.textContent = mem.source === 'auto' ? '🤖' : '✏️';
    icon.setAttribute('aria-label', mem.source === 'auto' ? 'auto-learned' : 'manually added');

    const content = document.createElement('div');
    content.style.flex = '1';

    const textEl = document.createElement('div');
    textEl.className = 'memory-item-text';
    // SECURITY: textContent for memory text (user-provided)
    textEl.textContent = mem.text;

    const sourceEl = document.createElement('div');
    sourceEl.className = 'memory-item-source';
    sourceEl.textContent = mem.source === 'auto'
      ? `Auto-learned · ${new Date(mem.timestamp).toLocaleDateString()}`
      : `Added manually · ${new Date(mem.timestamp).toLocaleDateString()}`;

    content.appendChild(textEl);
    content.appendChild(sourceEl);

    const delBtn = document.createElement('button');
    delBtn.className = 'memory-delete-btn';
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', `Delete memory: ${mem.text.slice(0, 30)}`);
    delBtn.addEventListener('click', () => {
      MapleMemory.delete(mem.id);
      refreshMemoryPanel();
    });

    item.appendChild(icon);
    item.appendChild(content);
    item.appendChild(delBtn);
    DOM.memoryList.appendChild(item);
  });
}

function openMemoryPanel() {
  refreshMemoryPanel();
  openPanel('memory');
}

// ════════════════════════════════════════════════════════
//  SETTINGS PANEL
// ════════════════════════════════════════════════════════

function openSettingsPanel() {
  const settings = MapleSettings.load();
  DOM.settingsName.value         = settings.userName || '';
  DOM.autolearnToggle.checked    = settings.autoLearn !== false;
  DOM.styleSelect.value          = settings.responseStyle || 'balanced';
  openPanel('settings');
}

function saveSettings() {
  MapleSettings.set('userName',       DOM.settingsName.value.slice(0, 50).trim());
  MapleSettings.set('autoLearn',      DOM.autolearnToggle.checked);
  MapleSettings.set('responseStyle',  DOM.styleSelect.value);
}

// ════════════════════════════════════════════════════════
//  PANEL CONTROLLER
// ════════════════════════════════════════════════════════

function openPanel(name) {
  State.activePanel = name;
  const panel = name === 'memory' ? DOM.memoryPanel : DOM.settingsPanel;
  const other = name === 'memory' ? DOM.settingsPanel : DOM.memoryPanel;

  other.hidden = true;
  panel.hidden = false;
  DOM.backdrop.classList.add('visible');

  // Accessible focus trap
  setTimeout(() => {
    const first = panel.querySelector('input, button, select');
    if (first) first.focus();
  }, 350);
}

function closePanel() {
  State.activePanel = null;
  DOM.memoryPanel.hidden = true;
  DOM.settingsPanel.hidden = true;
  DOM.backdrop.classList.remove('visible');
}

// ════════════════════════════════════════════════════════
//  HISTORY PANEL
// ════════════════════════════════════════════════════════

function refreshHistory() {
  const sessions = MapleHistory.load();
  DOM.historyList.innerHTML = '';

  if (sessions.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;color:var(--text-muted);padding:8px 2px;';
    empty.textContent = 'No past conversations yet.';
    DOM.historyList.appendChild(empty);
    return;
  }

  sessions.forEach(session => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Conversation: ${session.title}`);

    const icon = document.createElement('span');
    icon.className = 'history-icon';
    icon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;

    const label = document.createElement('span');
    // SECURITY: textContent for session titles
    label.textContent = session.title;
    label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    item.appendChild(icon);
    item.appendChild(label);

    if (session.id === State.session.id) item.classList.add('active');

    DOM.historyList.appendChild(item);
  });
}

// ════════════════════════════════════════════════════════
//  NEW CHAT
// ════════════════════════════════════════════════════════

function startNewChat() {
  // Save current session if it has messages
  if (State.session.messages.length >= 2) {
    MapleHistory.saveSession(State.session);
  }

  // Reset state
  State.session = {
    id:       `s_${Date.now()}`,
    title:    'New conversation',
    messages: [],
    created:  Date.now()
  };

  // Clear messages and show welcome
  DOM.messages.innerHTML = '';

  const welcome = document.createElement('div');
  welcome.id = 'welcome-screen';
  welcome.setAttribute('aria-label', 'Welcome to Maple');
  welcome.innerHTML = `
    <div class="welcome-blossom" aria-hidden="true">🌸</div>
    <h1 class="welcome-title">Hi, I'm Maple</h1>
    <p class="welcome-sub">Your personal AI assistant. I learn as we talk<br>and remember what matters to you.</p>
    <div class="welcome-starters" role="list">
      <button class="starter-chip" role="listitem">What can you help me with?</button>
      <button class="starter-chip" role="listitem">Remember something about me</button>
      <button class="starter-chip" role="listitem">Help me plan my day</button>
      <button class="starter-chip" role="listitem">Explain something to me</button>
    </div>
  `;
  DOM.messages.appendChild(welcome);

  // Re-attach starter chip listeners
  attachStarterChips();

  DOM.chatTitle.textContent = 'Maple';
  DOM.userInput.value = '';
  DOM.userInput.style.height = 'auto';
  DOM.charCount.textContent = '0 / 4000';
  DOM.sendBtn.disabled = true;
  setStatus('Ready');

  refreshHistory();
  closeSidebar();
  DOM.userInput.focus();
}

// ════════════════════════════════════════════════════════
//  SIDEBAR (MOBILE)
// ════════════════════════════════════════════════════════

function openSidebar() {
  State.sidebarOpen = true;
  DOM.sidebar.classList.add('open');
  DOM.overlay.style.display = 'block';
  setTimeout(() => { DOM.overlay.style.opacity = '1'; }, 10);
}

function closeSidebar() {
  State.sidebarOpen = false;
  DOM.sidebar.classList.remove('open');
  DOM.overlay.style.opacity = '0';
  setTimeout(() => { DOM.overlay.style.display = 'none'; }, 300);
}

// ════════════════════════════════════════════════════════
//  STARTER CHIPS
// ════════════════════════════════════════════════════════

function attachStarterChips() {
  document.querySelectorAll('.starter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      DOM.userInput.value = chip.textContent;
      resizeTextarea();
      DOM.sendBtn.disabled = false;
      sendMessage();
    });
  });
}

// ════════════════════════════════════════════════════════
//  EXPORT DATA
// ════════════════════════════════════════════════════════

function exportData() {
  const data = {
    exported:  new Date().toISOString(),
    memories:  MapleMemory.load(),
    settings:  MapleSettings.load(),
    history:   MapleHistory.load()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `maple-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════
//  PWA — Service Worker Registration
// ════════════════════════════════════════════════════════

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('Maple: service worker registered'))
      .catch(err => console.warn('Maple: SW registration failed', err));
  }
}

// ════════════════════════════════════════════════════════
//  EVENT LISTENERS
//  All attached via addEventListener — no inline handlers.
// ════════════════════════════════════════════════════════

function attachEvents() {

  // ── Send ──────────────────────────────────────────────
  DOM.sendBtn.addEventListener('click', sendMessage);

  DOM.userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  DOM.userInput.addEventListener('input', () => {
    resizeTextarea();
    const len = DOM.userInput.value.length;
    DOM.charCount.textContent = `${len} / 4000`;
    DOM.sendBtn.disabled = len === 0 || State.isReplying || State.isLockedOut;
  });

  // Enforce max length on paste
  DOM.userInput.addEventListener('paste', () => {
    setTimeout(() => {
      if (DOM.userInput.value.length > SECURITY.MAX_INPUT) {
        DOM.userInput.value = DOM.userInput.value.slice(0, SECURITY.MAX_INPUT);
        DOM.charCount.textContent = `${SECURITY.MAX_INPUT} / 4000`;
      }
    }, 0);
  });

  // ── Sidebar ───────────────────────────────────────────
  $('menu-btn').addEventListener('click', () => {
    State.sidebarOpen ? closeSidebar() : openSidebar();
  });

  DOM.overlay.addEventListener('click', closeSidebar);

  // ── New chat ──────────────────────────────────────────
  $('new-chat-btn').addEventListener('click', startNewChat);

  // ── Clear conversation ────────────────────────────────
  $('clear-btn').addEventListener('click', () => {
    if (State.session.messages.length === 0) return;
    if (confirm('Clear this conversation? Your memories won\'t be affected.')) {
      startNewChat();
    }
  });

  // ── Memory panel ──────────────────────────────────────
  $('memory-btn').addEventListener('click', openMemoryPanel);

  DOM.memoryAddBtn.addEventListener('click', () => {
    const val = DOM.memoryInput.value.trim().slice(0, 300);
    if (!val) return;
    const added = MapleMemory.add(val, 'manual');
    if (added) {
      DOM.memoryInput.value = '';
      refreshMemoryPanel();
    }
  });

  DOM.memoryInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') DOM.memoryAddBtn.click();
  });

  $('memory-clear-btn').addEventListener('click', () => {
    if (confirm('Clear all memories? Maple will start fresh.')) {
      MapleMemory.clear();
      refreshMemoryPanel();
    }
  });

  // ── Settings panel ────────────────────────────────────
  $('settings-btn').addEventListener('click', openSettingsPanel);

  DOM.settingsName.addEventListener('input', saveSettings);
  DOM.autolearnToggle.addEventListener('change', saveSettings);
  DOM.styleSelect.addEventListener('change', saveSettings);

  $('export-btn').addEventListener('click', exportData);

  $('reset-btn').addEventListener('click', () => {
    if (confirm('Reset everything? This clears all memories, settings, and history.')) {
      MapleMemory.clear();
      MapleSettings.reset();
      MapleHistory.clear();
      location.reload();
    }
  });

  // ── Close panels ──────────────────────────────────────
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
      saveSettings(); // auto-save on close
      closePanel();
    });
  });

  DOM.backdrop.addEventListener('click', () => {
    saveSettings();
    closePanel();
  });

  // ── Escape key closes panels / sidebar ───────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (State.activePanel) { saveSettings(); closePanel(); }
      else if (State.sidebarOpen) closeSidebar();
    }
  });
}

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════

function init() {
  // Attach all event listeners
  attachEvents();
  attachStarterChips();

  // Load and display history
  refreshHistory();

  // Update memory badge
  DOM.memoryCount.textContent = MapleMemory.load().length;

  // Register PWA service worker
  registerServiceWorker();

  // Set initial status
  setStatus('Ready');

  // Focus input on load (desktop)
  if (window.innerWidth > 680) {
    DOM.userInput.focus();
  }

  // Welcome Maple with a greeting if user has a name saved
  const userName = MapleSettings.get('userName');
  if (userName) {
    DOM.chatTitle.textContent = `Maple · ${userName}`;
  }
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
