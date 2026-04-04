// ════════════════════════════════════════════════════════
//  MAPLE — brain.js
//  The AI brain. No external API. Pure JS intelligence.
//
//  Architecture:
//    1. Knowledge base (what Maple knows)
//    2. Memory engine (what Maple learns & stores)
//    3. NLP processor (understanding input)
//    4. Response generator (composing replies)
//    5. Auto-learner (extracting facts from conversation)
// ════════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════
//  PART 1 — MAPLE'S BUILT-IN KNOWLEDGE BASE
//  Organized by domain. Each entry has patterns + a
//  response function (can use memory context dynamically).
// ════════════════════════════════════════════════════════

const MAPLE_KNOWLEDGE = Object.freeze([

  // ── Identity / greeting ──────────────────────────────
  {
    domain: 'identity',
    patterns: ['who are you', 'what are you', 'introduce yourself', 'tell me about yourself', 'what is maple', 'what can you do'],
    respond: (ctx) => {
      const name = ctx.userName ? `, ${ctx.userName}` : '';
      return `I'm Maple 🌸 — your personal AI assistant${name}.\n\nI'm built to help you with **anything** — thinking through problems, explaining concepts, planning tasks, writing, coding, or just having a conversation.\n\nWhat makes me different: I **learn as we talk**. The more you share with me, the better I understand you and the more useful I become.`;
    }
  },

  {
    domain: 'greeting',
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'good night', 'sup', 'yo', 'hiya'],
    respond: (ctx) => {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const name = ctx.userName ? `, ${ctx.userName}` : '';
      const greets = [
        `${timeGreet}${name}! 🌸 What's on your mind today?`,
        `Hey${name}! Great to see you. What can I help with?`,
        `Hi${name}! I'm here and ready. What do you need?`,
        `${timeGreet}${name}! How can I make your day a little better?`
      ];
      return greets[Math.floor(Math.random() * greets.length)];
    }
  },

  {
    domain: 'farewell',
    patterns: ['bye', 'goodbye', 'see you', 'later', 'take care', 'goodnight', 'good night', 'gtg', 'ttyl'],
    respond: (ctx) => {
      const name = ctx.userName ? `, ${ctx.userName}` : '';
      return `Take care${name}! 🌸 Come back anytime — I'll be here.`;
    }
  },

  {
    domain: 'thanks',
    patterns: ['thank you', 'thanks', 'thank', 'appreciate', 'helpful', 'great answer', 'perfect', 'awesome', 'nice'],
    respond: () => {
      const replies = [
        "You're very welcome! Anything else I can help with?",
        "Happy to help! What else is on your mind?",
        "Of course! Is there anything else you'd like to explore?",
        "Glad that helped! 🌸 Let me know if you need more."
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }
  },

  // ── Time & date ──────────────────────────────────────
  {
    domain: 'datetime',
    patterns: ['what time', 'current time', 'what day', 'what date', 'today\'s date', 'what year', 'day is it', 'time is it'],
    respond: () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return `Right now it's **${timeStr}** on **${dateStr}**.`;
    }
  },

  // ── Math ─────────────────────────────────────────────
  {
    domain: 'math',
    patterns: ['calculate', 'compute', 'what is', 'solve', 'math', 'plus', 'minus', 'times', 'divided', 'percent', 'square root', 'power of'],
    respond: (ctx, raw) => {
      return MapleMath.tryCompute(raw);
    }
  },

  // ── Memory / learning ────────────────────────────────
  {
    domain: 'memory_query',
    patterns: ['what do you know about me', 'what do you remember', 'what have i told you', 'my information', 'my details', 'do you remember'],
    respond: (ctx) => {
      const memories = ctx.memories || [];
      if (memories.length === 0) {
        return `I don't have any saved memories about you yet. As we chat, I'll learn things about you — or you can go to **Memory** in the sidebar to add facts manually.`;
      }
      const lines = memories.slice(0, 10).map(m => `- ${m.text}`).join('\n');
      return `Here's what I know about you so far:\n\n${lines}\n\nYou can manage these in the **Memory** panel.`;
    }
  },

  {
    domain: 'memory_save',
    patterns: ['remember that', 'remember this', 'save this', 'keep in mind', 'don\'t forget', 'note that', 'my name is', 'i am', 'i\'m a', 'i live', 'i work', 'i study', 'i like', 'i love', 'i hate', 'i prefer', 'i\'m studying', 'i go to'],
    respond: (ctx, raw) => {
      // This intent signals the auto-learner to save from this message
      return `Got it — I've saved that to my memory. I'll keep that in mind going forward. 🌸`;
    }
  },

  // ── Planning & productivity ───────────────────────────
  {
    domain: 'planning',
    patterns: ['help me plan', 'make a plan', 'schedule', 'organize', 'to do', 'todo', 'task list', 'priorities', 'what should i do', 'help me organize'],
    respond: (ctx) => {
      return `I'd love to help you plan! To build the best plan for you, tell me:\n\n1. **What's the goal?** (e.g., finish a project, study for an exam, plan your week)\n2. **What's your deadline?** (if any)\n3. **What resources/time do you have?**\n\nShare those details and I'll put together a structured plan for you.`;
    }
  },

  // ── Study / school ───────────────────────────────────
  {
    domain: 'study',
    patterns: ['study', 'exam', 'quiz', 'test', 'assignment', 'homework', 'course', 'class', 'lecture', 'professor', 'university', 'college', 'school', 'subject', 'topic', 'learn', 'explain', 'understand', 'concept'],
    respond: (ctx, raw) => {
      const topic = MapleLang.extractTopic(raw, ['explain', 'study', 'understand', 'learn', 'what is', 'how does', 'tell me about', 'help me with']);
      if (topic) {
        return `Happy to help you understand **${topic}**!\n\nTo give you the best explanation, could you tell me:\n- What level are you at with this? (beginner / familiar / advanced)\n- What specific part is confusing?\n- Are you studying for an exam, or just curious?\n\nThe more context you give me, the more targeted I can be.`;
      }
      return `I'm great at helping with studying and coursework! Tell me:\n- **What subject or topic** do you need help with?\n- **What's your level?** (first year, second year, etc.)\n- **What specifically** are you struggling with?\n\nI'll do my best to break it down clearly.`;
    }
  },

  // ── Coding ───────────────────────────────────────────
  {
    domain: 'coding',
    patterns: ['code', 'program', 'script', 'function', 'bug', 'error', 'debug', 'python', 'java', 'javascript', 'html', 'css', 'algorithm', 'data structure', 'loop', 'array', 'class', 'object', 'variable', 'syntax', 'compile', 'run', 'terminal', 'git', 'github'],
    respond: (ctx, raw) => {
      const lang = MapleLang.detectLanguage(raw);
      const langNote = lang ? ` I noticed you mentioned **${lang}** — ` : ' ';
      return `I can help with code!${langNote}To give you the most useful answer:\n\n- **What are you trying to build or fix?**\n- **Paste your code** (or the error message) if you have one\n- **What have you already tried?**\n\nI'll walk you through it step by step.`;
    }
  },

  // ── Game dev ─────────────────────────────────────────
  {
    domain: 'gamedev',
    patterns: ['game', 'unity', 'blender', 'game dev', 'game development', '3d', 'model', 'animation', 'render', 'asset', 'sprite', 'shader', 'physics', 'gameplay', 'mechanics', 'level design', 'character', 'texture'],
    respond: (ctx, raw) => {
      return `Game dev! Love it. What are you working on?\n\nI can help with:\n- **Unity** (C# scripting, components, scenes)\n- **Blender** (modeling, UV unwrapping, animation)\n- **Game design** (mechanics, level design, player feel)\n- **Asset pipeline** (Blender → Unity workflow)\n- **General concepts** (physics, rendering, optimization)\n\nTell me more about your project and what you need help with.`;
    }
  },

  // ── Writing ───────────────────────────────────────────
  {
    domain: 'writing',
    patterns: ['write', 'draft', 'essay', 'letter', 'email', 'proposal', 'report', 'document', 'paragraph', 'intro', 'conclusion', 'proofread', 'edit', 'improve', 'rephrase', 'rewrite'],
    respond: (ctx, raw) => {
      return `I can help you write! Tell me:\n\n- **What type of document?** (essay, email, proposal, report…)\n- **Who is the audience?** (professor, recruiter, client, general…)\n- **What's the tone?** (formal, casual, persuasive…)\n- **Any specific requirements?** (word count, format, deadline)\n\nIf you already have a draft, paste it and I'll refine it for you.`;
    }
  },

  // ── Cloud / tech ──────────────────────────────────────
  {
    domain: 'cloud_tech',
    patterns: ['cloud', 'aws', 'google cloud', 'azure', 'ibm', 'kubernetes', 'docker', 'linux', 'server', 'api', 'rest', 'database', 'sql', 'networking', 'cisco', 'cybersecurity', 'ethical hacker', 'penetration', 'firewall'],
    respond: (ctx, raw) => {
      return `Happy to dive into tech topics! I can cover cloud platforms (AWS, GCP, IBM), networking fundamentals, Linux, APIs, databases, and cybersecurity/ethical hacking concepts.\n\nWhat specifically do you want to explore or understand?`;
    }
  },

  // ── Motivation ────────────────────────────────────────
  {
    domain: 'motivation',
    patterns: ['motivate', 'inspire', 'encourage', 'feeling down', 'stressed', 'overwhelmed', 'tired', 'burnout', 'give up', 'can\'t do it', 'struggling', 'hard time', 'anxious', 'worried'],
    respond: (ctx) => {
      const name = ctx.userName ? ` ${ctx.userName}` : '';
      return `Hey${name} — I hear you. It's okay to feel that way sometimes. 🌸\n\nHere's what I know: the fact that you're still showing up, still trying, still here — that already says a lot about you.\n\nWant to talk through what's going on? Sometimes putting it into words makes things clearer. Or if you'd rather just get moving — tell me what's on your plate and we'll tackle it together, one step at a time.`;
    }
  },

  // ── Recommendations ───────────────────────────────────
  {
    domain: 'recommend',
    patterns: ['recommend', 'suggest', 'what should i', 'best way to', 'how do i', 'advice', 'tips', 'tricks', 'resources', 'tools'],
    respond: (ctx, raw) => {
      const topic = MapleLang.extractTopic(raw, ['recommend', 'suggest', 'best way to', 'how do i', 'advice on', 'tips for', 'resources for', 'tools for']);
      if (topic) {
        return `I'd love to give you recommendations for **${topic}**. To make sure my suggestions actually fit you:\n\n- What's your current experience level with this?\n- What's your goal (learning, doing it for work, personal project)?\n- Any constraints? (time, tools, budget)\n\nGive me those details and I'll give you a solid, specific list.`;
      }
      return `Happy to make recommendations! What topic or area do you need suggestions for?`;
    }
  },

  // ── Hackathon / projects ──────────────────────────────
  {
    domain: 'hackathon',
    patterns: ['hackathon', 'project', 'build', 'mvp', 'prototype', 'idea', 'startup', 'portfolio', 'side project', 'demo', 'submission'],
    respond: (ctx) => {
      return `Projects and hackathons — great! I can help you:\n\n- **Brainstorm and refine your idea**\n- **Plan the architecture** (what to build, what to skip)\n- **Write code** for specific features\n- **Polish your pitch** or README\n- **Debug** when things go wrong\n- **Prioritize** what to finish before the deadline\n\nWhat are you working on? Tell me the idea and where you're at.`;
    }
  },

  // ── General fallback with memory ─────────────────────
  {
    domain: 'general',
    patterns: [],  // fallback — matches anything not caught above
    respond: (ctx, raw) => {
      return null; // signals the engine to use the generative fallback
    }
  }
]);


// ════════════════════════════════════════════════════════
//  PART 2 — MATH ENGINE
//  Safely evaluates simple math expressions from natural language.
// ════════════════════════════════════════════════════════

const MapleMath = {
  tryCompute(input) {
    // Extract math expression from natural language
    const clean = input
      .toLowerCase()
      .replace(/what is|calculate|compute|solve|equals|equal to/gi, '')
      .replace(/plus/gi, '+')
      .replace(/minus|subtract/gi, '-')
      .replace(/times|multiplied by|multiply/gi, '*')
      .replace(/divided by|over/gi, '/')
      .replace(/percent of/gi, '/100*')
      .replace(/squared/gi, '**2')
      .replace(/cubed/gi, '**3')
      .replace(/square root of/gi, 'Math.sqrt(')
      .trim();

    // Only allow safe characters
    const safeExpr = clean.replace(/[^0-9+\-*/().% \t]/g, '');

    if (!safeExpr || safeExpr.trim().length < 1) {
      return `I can help with math! Try something like:\n- *"What is 15% of 240?"*\n- *"Calculate 144 divided by 12"*\n- *"What is 2 to the power of 8?"*`;
    }

    try {
      // Safe evaluation — only numbers and operators allowed through
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${safeExpr})`)();
      if (typeof result !== 'number' || !isFinite(result)) {
        return `Hmm, I couldn't compute that. Try phrasing it like "What is 10 + 5?" or "Calculate 20% of 150".`;
      }
      const rounded = Math.round(result * 1e10) / 1e10;
      return `The answer is **${rounded.toLocaleString()}**.`;
    } catch {
      return `I had trouble parsing that expression. For math, try something like:\n- *"What is 25 times 4?"*\n- *"Calculate 200 divided by 8"*`;
    }
  }
};


// ════════════════════════════════════════════════════════
//  PART 3 — LANGUAGE UTILITIES
//  Topic extraction, language detection, text helpers.
// ════════════════════════════════════════════════════════

const MapleLang = {
  // Extract the subject after a trigger phrase
  extractTopic(text, triggers) {
    const lower = text.toLowerCase();
    for (const trigger of triggers) {
      const idx = lower.indexOf(trigger);
      if (idx !== -1) {
        const after = text.slice(idx + trigger.length).trim();
        if (after.length > 1 && after.length < 80) return after;
      }
    }
    return null;
  },

  // Detect programming language mentions
  detectLanguage(text) {
    const langs = {
      python: 'Python', javascript: 'JavaScript', java: 'Java',
      'c++': 'C++', 'c#': 'C#', html: 'HTML', css: 'CSS',
      php: 'PHP', rust: 'Rust', go: 'Go', typescript: 'TypeScript',
      kotlin: 'Kotlin', swift: 'Swift', ruby: 'Ruby'
    };
    const lower = text.toLowerCase();
    for (const [key, val] of Object.entries(langs)) {
      if (lower.includes(key)) return val;
    }
    return null;
  },

  // Normalize text for matching
  normalize(text) {
    return text.toLowerCase()
      .replace(/[''`]/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[^a-z0-9 '".!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Score a KB entry against normalized input
  scoreEntry(entry, normalizedInput) {
    let score = 0;
    for (const pattern of entry.patterns) {
      if (normalizedInput.includes(pattern)) {
        score += pattern.split(' ').length * 2;
      }
    }
    return score;
  }
};


// ════════════════════════════════════════════════════════
//  PART 4 — MEMORY ENGINE
//  Stores facts in localStorage. Auto-learns from chat.
// ════════════════════════════════════════════════════════

const MapleMemory = {
  STORAGE_KEY: 'maple_memories_v1',

  // Load all memories from storage
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Save memories to storage
  save(memories) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(memories));
    } catch {
      console.warn('Maple: could not save memories');
    }
  },

  // Add a new memory fact
  add(text, source = 'manual') {
    if (!text || text.trim().length < 3) return false;
    const memories = this.load();

    // Deduplicate
    const exists = memories.some(m =>
      m.text.toLowerCase() === text.trim().toLowerCase()
    );
    if (exists) return false;

    memories.unshift({
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim().slice(0, 300),
      source, // 'manual' | 'auto'
      timestamp: Date.now()
    });

    // Cap at 200 memories
    this.save(memories.slice(0, 200));
    return true;
  },

  // Delete a memory by ID
  delete(id) {
    const memories = this.load().filter(m => m.id !== id);
    this.save(memories);
  },

  // Clear all memories
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  // Build a context string for injection into responses
  buildContext() {
    const memories = this.load();
    if (memories.length === 0) return '';
    return memories.slice(0, 15).map(m => m.text).join('. ');
  },

  // ── Auto-learner ──────────────────────────────────────
  // Extracts key facts from a user message and saves them
  autoLearn(text) {
    const patterns = [
      // Name
      { regex: /my name is ([a-z][a-z '-]{1,30})/i,         template: m => `User's name is ${MapleMemory._cap(m[1])}` },
      { regex: /i(?:'m| am) called ([a-z][a-z '-]{1,30})/i, template: m => `User goes by ${MapleMemory._cap(m[1])}` },
      // School / study
      { regex: /i(?:'m| am) (?:a |an )?student (?:at|in) ([^.!?]{3,60})/i, template: m => `Studies at ${m[1].trim()}` },
      { regex: /i(?:'m| am) studying ([^.!?]{3,50})/i,      template: m => `Studying ${m[1].trim()}` },
      { regex: /i(?:'m| am) (?:a |an )?(\w+ year) student/i, template: m => `Is a ${m[1]} student` },
      { regex: /my course is ([^.!?]{3,50})/i,              template: m => `Course: ${m[1].trim()}` },
      // Work / role
      { regex: /i work (?:at|for|in) ([^.!?]{3,60})/i,     template: m => `Works at ${m[1].trim()}` },
      { regex: /i(?:'m| am) (?:a |an )?([^.!?,]{3,40}) (?:dev|developer|engineer|designer|student|analyst)/i, template: m => `Role: ${m[0].trim()}` },
      // Location
      { regex: /i live in ([^.!?]{3,50})/i,                 template: m => `Lives in ${m[1].trim()}` },
      { regex: /i(?:'m| am) from ([^.!?]{3,50})/i,         template: m => `From ${m[1].trim()}` },
      // Preferences
      { regex: /i love ([^.!?]{3,50})/i,                    template: m => `Loves ${m[1].trim()}` },
      { regex: /i like ([^.!?]{3,50})/i,                    template: m => `Likes ${m[1].trim()}` },
      { regex: /i hate ([^.!?]{3,50})/i,                    template: m => `Dislikes ${m[1].trim()}` },
      { regex: /i prefer ([^.!?]{3,50})/i,                  template: m => `Prefers ${m[1].trim()}` },
      { regex: /my (?:favorite|favourite) (?:\w+ )?is ([^.!?]{3,50})/i, template: m => `Favorite: ${m[0].trim()}` },
      // Goals
      { regex: /my goal is (?:to )?([^.!?]{5,80})/i,       template: m => `Goal: ${m[1].trim()}` },
      { regex: /i(?:'m| am) trying to ([^.!?]{5,60})/i,    template: m => `Working on: ${m[1].trim()}` },
    ];

    const saved = [];
    for (const { regex, template } of patterns) {
      const match = text.match(regex);
      if (match) {
        const fact = template(match);
        if (fact && MapleMemory.add(fact, 'auto')) {
          saved.push(fact);
        }
      }
    }
    return saved;
  },

  _cap: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
};


// ════════════════════════════════════════════════════════
//  PART 5 — GENERATIVE FALLBACK ENGINE
//  When no KB entry matches, Maple generates a contextual
//  response using pattern analysis + memory context.
// ════════════════════════════════════════════════════════

const MapleGenerative = {
  // Question-type detection
  isQuestion(text) {
    return /^(what|how|why|when|where|who|which|can|could|should|would|is|are|do|does|did|will|won't|isn't|aren't)\b/i.test(text.trim()) ||
           text.trim().endsWith('?');
  },

  isRequestForHelp(text) {
    return /\b(help|assist|support|guide|show|explain|tell me|teach|walk me through)\b/i.test(text);
  },

  isOpinion(text) {
    return /\b(think|opinion|view|feel|believe|thoughts on|what do you)\b/i.test(text);
  },

  generate(userText, ctx) {
    const mem = ctx.memories || [];
    const memContext = mem.length > 0
      ? `Based on what I know about you — ${mem.slice(0, 5).map(m => m.text).join(', ')} — `
      : '';

    const name = ctx.userName ? ` ${ctx.userName}` : '';

    if (this.isOpinion(userText)) {
      const topic = MapleLang.extractTopic(userText, ['think about', 'opinion on', 'thoughts on', 'feel about', 'think of', 'view on']);
      return `${memContext}that's an interesting topic${name}${topic ? ` — **${topic}**` : ''}. I can offer balanced perspectives and relevant information, though my view comes from analyzing patterns rather than lived experience.\n\nWhat angle interests you most? I can explore the pros and cons, different schools of thought, or practical implications.`;
    }

    if (this.isQuestion(userText)) {
      return `${memContext}that's a great question${name}! I want to give you a thorough answer.\n\nCould you give me a bit more context? Specifically:\n- **What's the broader goal** behind this question?\n- **How much do you already know** about this topic?\n\nWith that, I can tailor my answer to exactly what you need.`;
    }

    if (this.isRequestForHelp(userText)) {
      return `I'm here to help${name}! 🌸 ${memContext}tell me more about what you need — the more specific you are, the better I can assist you.`;
    }

    // Generic thoughtful response
    const responses = [
      `That's interesting${name}! Tell me more — what's the context behind this?`,
      `I'd love to dig into that with you${name}. What specifically would be most useful to explore?`,
      `${memContext}I want to make sure I give you the most relevant response. Could you tell me a bit more about what you're looking for?`,
      `Let's talk about that${name}! What aspect would you like to focus on first?`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
};


// ════════════════════════════════════════════════════════
//  PART 6 — RESPONSE FORMATTING
//  Converts plain text with **bold**, *italic*, etc.
//  to safe HTML for display.
// ════════════════════════════════════════════════════════

const MapleFormat = {
  // Sanitize any user-sourced content (defense in depth)
  sanitize(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  // Render bot response (trusted content) with markdown-lite
  renderBotText(text) {
    let html = text
      // Code blocks first (before inline code)
      .replace(/```([\s\S]*?)```/g, (_, code) =>
        `<pre><code>${this.sanitize(code.trim())}</code></pre>`)
      // Inline code
      .replace(/`([^`]+)`/g, (_, code) =>
        `<code>${this.sanitize(code)}</code>`)
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Ordered lists (simple)
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Headings
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }
};


// ════════════════════════════════════════════════════════
//  PART 7 — MAIN BRAIN INTERFACE
//  The public API that app.js calls.
// ════════════════════════════════════════════════════════

const MapleBrain = {

  // Process a user message and return a response object
  process(userText, options = {}) {
    const autoLearn = options.autoLearn !== false;

    // Build context from memory
    const memories = MapleMemory.load();
    const userName  = MapleSettings.get('userName') || '';
    const style     = MapleSettings.get('responseStyle') || 'balanced';

    const ctx = { memories, userName, style };

    // Auto-learn from message if enabled
    let learnedFacts = [];
    if (autoLearn) {
      learnedFacts = MapleMemory.autoLearn(userText);
    }

    // Normalize input for matching
    const normalized = MapleLang.normalize(userText);

    // Score every KB entry
    let bestEntry = null;
    let bestScore = 0;

    for (const entry of MAPLE_KNOWLEDGE) {
      if (entry.domain === 'general') continue; // skip fallback in scoring
      const score = MapleLang.scoreEntry(entry, normalized);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    // Generate the response
    let responseText;

    if (bestScore > 0 && bestEntry) {
      const result = bestEntry.respond(ctx, userText);
      responseText = result !== null ? result : MapleGenerative.generate(userText, ctx);
    } else {
      responseText = MapleGenerative.generate(userText, ctx);
    }

    // Apply style modifier
    if (style === 'concise') {
      // Keep first paragraph only
      responseText = responseText.split('\n\n')[0];
    }

    return {
      text:    responseText,
      html:    MapleFormat.renderBotText(responseText),
      learned: learnedFacts,
      domain:  bestEntry ? bestEntry.domain : 'general'
    };
  }
};


// ════════════════════════════════════════════════════════
//  PART 8 — SETTINGS ENGINE
//  Persists user preferences in localStorage.
// ════════════════════════════════════════════════════════

const MapleSettings = {
  KEY: 'maple_settings_v1',

  defaults: Object.freeze({
    userName:      '',
    responseStyle: 'balanced',
    autoLearn:     true
  }),

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
    } catch {
      return { ...this.defaults };
    }
  },

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ ...this.load(), ...data }));
    } catch {
      console.warn('Maple: could not save settings');
    }
  },

  get(key) {
    return this.load()[key];
  },

  set(key, value) {
    this.save({ [key]: value });
  },

  reset() {
    localStorage.removeItem(this.KEY);
  }
};


// ════════════════════════════════════════════════════════
//  PART 9 — CONVERSATION HISTORY
//  Stores per-session history in localStorage.
// ════════════════════════════════════════════════════════

const MapleHistory = {
  KEY: 'maple_history_v1',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  save(sessions) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(sessions.slice(0, 20)));
    } catch {}
  },

  saveSession(session) {
    if (!session || !session.messages || session.messages.length < 2) return;
    const sessions = this.load().filter(s => s.id !== session.id);
    sessions.unshift(session);
    this.save(sessions);
  },

  clear() {
    localStorage.removeItem(this.KEY);
  }
};
