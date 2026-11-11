/* ============================================================
   tutor.js · AI 助教
   本地检索式问答：从 38 张知识卡片中匹配、按意图组织答案
   可选接入 OpenAI 兼容接口；无网络时功能不受影响
   ============================================================ */

window.Tutor = (function () {

  const $ = id => document.getElementById(id);
  const CFG_KEY = 'ab.llmcfg.v1';

  let log = [];
  let cfg = { base: '', key: '', model: '' };

  const SUGGEST = [
    '洛必达法则什么时候会失效？',
    '为什么可导一定连续，连续不一定可导？',
    '拉格朗日中值定理的三个条件分别有什么用？',
    '二重极限为什么要考虑路径？',
    '正项级数比值判别法什么时候失效？',
    '全微分和偏导数存在的区别是什么？'
  ];

  const STOP = new Set(['的', '了', '是', '在', '和', '与', '有', '为', '什么', '怎么', '如何', '为什么',
    '时候', '可以', '一个', '这个', '那个', '我们', '它', '吗', '呢', '啊', '请', '问', '一下', '以及',
    '还是', '就是', '不是', '能不', '不能', '会不', '会不']);

  function tokens(q) {
    const s = q.toLowerCase().replace(/[，。？、；：""''（）()\[\]{}]/g, ' ');
    const out = new Set();
    (s.match(/[a-z][a-z0-9]*/g) || []).forEach(t => out.add(t));
    const cjk = s.match(/[\u4e00-\u9fff]+/g) || [];
    cjk.forEach(run => {
      if (run.length <= 4 && !STOP.has(run)) out.add(run);
      for (let i = 0; i + 2 <= run.length; i++) {
        const bg = run.slice(i, i + 2);
        if (!STOP.has(bg)) out.add(bg);
      }
    });
    return [...out];
  }

  function scoreNode(n, terms, rawQuery) {
    // 关键词索引命中：口语提问里常见的同义说法
    const kwList = (window.KB.kw && window.KB.kw[n.id]) || [];
    let kwBonus = 0;
    kwList.forEach(k => {
      if (rawQuery.includes(k.toLowerCase())) kwBonus += 18;
    });

    const title = n.title.toLowerCase();
    const sub = (n.sub || '').toLowerCase();
    const idea = (n.idea || '').toLowerCase();
    const cond = (n.cond || []).join(' ').toLowerCase();
    const traps = (n.traps || []).join(' ').toLowerCase();
    const ctr = (n.counter || '').toLowerCase();
    const fml = (n.formula || '').toLowerCase();

    let s = 0;
    terms.forEach(t => {
      if (t.length < 2) return;
      if (title.includes(t)) s += 14;
      if (sub.includes(t)) s += 6;
      if (idea.includes(t)) s += 5;
      if (traps.includes(t)) s += 4;
      if (cond.includes(t)) s += 3;
      if (ctr.includes(t)) s += 3;
      if (fml.includes(t)) s += 2;
    });
    return s + kwBonus;
  }

  function detectIntent(q) {
    if (/为什么|错|反例|失效|不成立|不能|注意|误区|陷阱|坑/.test(q)) return 'trap';
    if (/条件|前提|什么时候|何时|能用|适用|要求|需要/.test(q)) return 'cond';
    if (/怎么|如何|求|计算|步骤|方法|证明|算/.test(q)) return 'method';
    if (/区别|不同|对比|关系/.test(q)) return 'diff';
    return 'def';
  }

  function katexHtml(tex, display) {
    if (!window.katex) return tex;
    try { return katex.renderToString(tex, { displayMode: !!display, throwOnError: false }); }
    catch (e) { return tex; }
  }

  function buildAnswer(q, hits) {
    if (!hits.length) {
      return {
        html: `<p>没有在知识库里匹配到足够接近的卡片。</p>
          <p style="color:var(--ink-3)">可以换个说法，或直接用更具体的术语提问，例如：
          「洛必达」「一致连续」「比值判别法」「全微分」。也可以到「知识图谱」里按章节浏览。</p>`,
        hits: []
      };
    }

    const intent = detectIntent(q);
    const top = hits[0].node;
    const rest = hits.slice(1, 3).map(h => h.node);

    let html = '';

    if (top.formula) {
      html += `<div class="formula-box" style="margin-bottom:12px">${katexHtml(top.formula, true)}</div>`;
    }

    html += `<p>${top.idea || ''}</p>`;

    if (intent === 'trap') {
      const cs = (top.cond || []).slice(0, 2);
      if (cs.length) {
        html += `<p style="margin-top:10px"><b>先看结论成立的前提：</b></p>
          <ul style="margin:0 0 8px;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.9">
          ${cs.map(c => `<li style="margin-bottom:3px">${rawText(c)}</li>`).join('')}</ul>`;
      }
      const traps = (top.traps || []).slice(0, 3);
      if (traps.length) {
        html += `<p style="margin-top:10px"><b style="color:var(--crimson)">最容易出问题的地方：</b></p>
          <ul style="margin:0 0 10px;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.8">
          ${traps.map(t => `<li style="margin-bottom:4px">${rawText(t)}</li>`).join('')}</ul>`;
      }
      if (top.counter) {
        html += `<p><b style="color:var(--crimson)">典型反例：</b>${top.counter}</p>`;
      }
    } else if (intent === 'cond') {
      if ((top.cond || []).length) {
        html += `<p style="margin-top:10px"><b>成立条件：</b></p>
          <ul style="margin:0 0 10px;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.8">
          ${top.cond.map(c => `<li style="margin-bottom:4px">${rawText(c)}</li>`).join('')}</ul>`;
      }
      const t = (top.traps || [])[0];
      if (t) html += `<p style="color:var(--ink-2)"><b>附带提醒：</b>${rawText(t)}</p>`;
    } else if (intent === 'method') {
      if ((top.cond || []).length) {
        html += `<p style="margin-top:8px"><b>前提先确认：</b></p>
          <ul style="margin:0 0 8px;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.8">
          ${top.cond.slice(0, 3).map(c => `<li style="margin-bottom:3px">${rawText(c)}</li>`).join('')}</ul>`;
      }
      const t = (top.traps || [])[0];
      if (t) html += `<p style="color:var(--crimson)"><b>常见踩坑：</b>${rawText(t)}</p>`;
    } else if (intent === 'diff') {
      html += `<p style="margin-top:8px"><b>关键区别：</b></p>
        <ul style="margin:0 0 8px;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.8">
        ${(top.cond || []).concat(top.traps || []).slice(0, 4).map(c => `<li style="margin-bottom:3px">${rawText(c)}</li>`).join('')}</ul>`;
    } else {
      const t = (top.traps || [])[0];
      if (t) html += `<p style="color:var(--ink-2)"><b>一处易错：</b>${rawText(t)}</p>`;
    }

    if (rest.length) {
      html += `<p style="margin-top:10px;font-size:12.5px;color:var(--ink-2)">
        <b>相关知识：</b>${rest.map(n => n.title).join('、')}。需要的话我可以继续展开其中任一个。</p>`;
    }

    return {
      html,
      hits: hits.slice(0, 3).map(h => ({ id: h.node.id, title: h.node.title, score: Math.round(h.score) }))
    };
  }

  function rawText(s) {
    return String(s || '');
  }

  /* ---------- 渲染 ---------- */

  function addUser(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `<div class="bubble"></div>`;
    div.querySelector('.bubble').textContent = text;
    $('chatLog').appendChild(div);
    scrollBottom();
  }

  function addBot(payload, mode) {
    const div = document.createElement('div');
    div.className = 'msg bot';
    const srcChips = payload.hits.length
      ? payload.hits.map(h => `<span class="chip accent" data-node="${h.id}" style="cursor:pointer">${h.title}</span>`).join('')
      : '';
    div.innerHTML = `
      <div class="who"><span class="ava">析</span>分析助教 · ${mode || '本地检索'}</div>
      <div class="bubble">${payload.html}
        ${srcChips ? `<div class="src"><span>命中卡片</span>${srcChips}<span style="margin-left:auto;opacity:.7">点击可跳转图谱</span></div>` : ''}
      </div>`;
    $('chatLog').appendChild(div);
    if (window.renderMath) window.renderMath(div);
    div.querySelectorAll('[data-node]').forEach(el => {
      el.addEventListener('click', () => {
        if (window.App) window.App.go('map', el.dataset.node);
      });
    });
    scrollBottom();
  }

  function scrollBottom() {
    const el = $('chatLog');
    // 视图未激活时不滚动，否则会把外层页面（此时显示的是别的模块）拉到底
    if (!el.offsetParent) return;
    el.scrollTop = el.scrollHeight;
    // 移动端整页滚动模式下 chatLog 不是滚动容器，改为滚动外层 .views
    if (el.clientHeight >= el.scrollHeight) {
      const sc = document.getElementById('views');
      if (sc) sc.scrollTop = sc.scrollHeight;
    }
  }

  function updateStats() {
    const q = log.filter(x => x.role === 'user').length;
    const avg = log.filter(x => x.hits)
      .reduce((s, x) => s + x.hits.length, 0) / Math.max(1, log.filter(x => x.hits).length);
    $('tutorStats').innerHTML = `
      <div class="metric"><div class="k">提问数</div><div class="v">${q}</div></div>
      <div class="metric"><div class="k">平均命中</div><div class="v">${avg ? avg.toFixed(1) : '—'}</div></div>`;
  }

  /* ---------- 主流程 ---------- */

  function ask(text) {
    text = (text || '').trim();
    if (!text) return;
    addUser(text);
    log.push({ role: 'user', text, ts: new Date().toISOString() });

    const terms = tokens(text);
    const scored = window.KB.nodes
      .map(n => ({ node: n, score: scoreNode(n, terms, text.toLowerCase()) }))
      .filter(x => x.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (onlineMode()) {
      addTyping();
      callOnline(text, scored).then(ans => {
        removeTyping();
        addBot({ html: ans, hits: scored.slice(0, 3).map(s => ({ id: s.node.id, title: s.node.title, score: Math.round(s.score) })) }, '在线模型 + 本地检索');
        log.push({ role: 'bot', mode: 'online', text: ans, hits: [], ts: new Date().toISOString() });
        updateStats();
      }).catch(err => {
        removeTyping();
        const payload = buildAnswer(text, scored);
        addBot(payload, '本地检索（在线调用失败）');
        log.push({ role: 'bot', mode: 'local-fallback', text: payload.html, hits: payload.hits, error: String(err), ts: new Date().toISOString() });
        updateStats();
      });
      return;
    }

    const payload = buildAnswer(text, scored);
    setTimeout(() => {
      addBot(payload, '本地检索');
      log.push({ role: 'bot', mode: 'local', text: payload.html, hits: payload.hits, ts: new Date().toISOString() });
      updateStats();
    }, 220);
  }

  function addTyping() {
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.id = 'typing';
    div.innerHTML = `<div class="who"><span class="ava">析</span>分析助教</div><div class="bubble" style="color:var(--ink-3)">检索中…</div>`;
    $('chatLog').appendChild(div);
    scrollBottom();
  }
  function removeTyping() {
    const t = $('typing');
    if (t) t.remove();
  }

  function onlineMode() {
    return !!(cfg.base && cfg.key && cfg.model);
  }

  async function callOnline(q, scored) {
    const ctx = scored.map(s => `【${s.node.title}】${rawText(s.node.idea || '')} 条件：${(s.node.cond || []).join('；')} 易错：${(s.node.traps || []).join('；')}`).join('\n');
    const sys = `你是工科数学分析的助教。只依据下面给出的知识卡片作答，不得编造定理或公式。回答控制在 200 字内，先给结论再给条件与易错点。若卡片信息不足，明确说"知识库中没有相关内容"。\n\n${ctx}`;
    const url = cfg.base.replace(/\/$/, '') + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: q }],
        temperature: 0.2
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const txt = data.choices && data.choices[0] && data.choices[0].message.content;
    if (!txt) throw new Error('返回格式异常');
    return txt.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('');
  }

  function loadCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      if (raw) cfg = Object.assign(cfg, JSON.parse(raw));
    } catch (e) {}
    $('modeChip').textContent = onlineMode() ? '在线模型' : '本地检索';
    $('modeChip').className = 'chip ' + (onlineMode() ? 'jade' : 'accent');
    if (window.App) window.App.setMode(onlineMode() ? '在线模型模式' : '本地检索模式');
  }

  function saveCfg(base, key, model) {
    cfg = { base, key, model };
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
    loadCfg();
  }

  function exportLog() {
    if (!log.length) { window.App.toast('还没有对话记录'); return; }
    const data = {
      exportedAt: new Date().toISOString(),
      mode: onlineMode() ? 'online+local' : 'local',
      knowledgeCards: window.KB.nodes.length,
      turns: log.filter(x => x.role === 'user').length,
      records: log
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '助教测试对话记录.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    window.App.toast(`已导出 ${log.length} 条记录`);
  }

  function clear() {
    log = [];
    $('chatLog').innerHTML = '';
    greet();
    updateStats();
  }

  function greet() {
    const payload = {
      html: `<p>我是分析助教，背后是 ${window.KB.nodes.length} 张人工校对的知识卡片。</p>
        <p style="color:var(--ink-2)">我会先在你的问题里找关键词，定位到对应知识点，再按你问的类型（条件 / 易错 / 方法 / 区别）组织答案。
        找不到就直说找不到——<b>不编造</b>。</p>
        <p style="color:var(--ink-3);font-size:12.5px">试试下面这些问题，或者直接问我某个定理的前提。</p>`,
      hits: []
    };
    addBot(payload, onlineMode() ? '在线模型 + 本地检索' : '本地检索');
  }

  function init() {
    loadCfg();
    greet();
    updateStats();

    const box = $('suggest');
    SUGGEST.forEach(s => {
      const b = document.createElement('button');
      b.textContent = s;
      b.addEventListener('click', () => ask(s));
      box.appendChild(b);
    });

    $('btnSend').addEventListener('click', () => {
      const v = $('chatInput').value;
      $('chatInput').value = '';
      ask(v);
    });

    $('chatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = $('chatInput').value;
        $('chatInput').value = '';
        ask(v);
      }
    });

    $('btnExportChat').addEventListener('click', exportLog);
    $('btnClearChat').addEventListener('click', clear);
  }

  return { init, ask, loadCfg, saveCfg, onlineMode, onShow: updateStats };
})();
