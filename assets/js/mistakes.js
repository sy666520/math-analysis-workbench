/* ============================================================
   mistakes.js · 错题本
   记录「错在哪一步」而非「正确答案」，按 1/2/4/7/15 天间隔复习
   ============================================================ */

window.Mistakes = (function () {

  const KEY = 'ab.mistakes.v1';
  const DAY = 86400000;
  const INTERVALS = [1, 2, 4, 7, 15];
  const $ = id => document.getElementById(id);

  let items = [];
  let memoryOnly = false;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      memoryOnly = true;
      items = [];
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); }
    catch (e) { memoryOnly = true; }
  }

  function today0() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dateStr(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function stageLabel(m) {
    const s = m.stage || 0;
    if (s >= INTERVALS.length) return { txt: '已巩固', cls: 'jade' };
    if (s >= 3) return { txt: '较熟练', cls: 'jade' };
    if (s >= 1) return { txt: '复习中', cls: 'gold' };
    return { txt: '新错题', cls: 'crimson' };
  }

  function isDue(m) {
    return (m.next || 0) <= today0() + DAY - 1;
  }

  /* ---------- 渲染 ---------- */

  function renderStats() {
    const due = items.filter(isDue).length;
    const solid = items.filter(m => (m.stage || 0) >= 3).length;
    const tags = new Set(items.map(m => m.tag));
    $('nbStats').innerHTML = `
      <div class="stat"><div class="k">错题总数</div><div class="v">${items.length}<small>道</small></div></div>
      <div class="stat ${due ? 'warn' : 'good'}"><div class="k">今日待复习</div><div class="v">${due}<small>道</small></div></div>
      <div class="stat good"><div class="k">已进入长周期</div><div class="v">${solid}<small>道</small></div></div>
      <div class="stat"><div class="k">涉及知识点</div><div class="v">${tags.size}<small>个</small></div></div>`;
  }

  function renderBars() {
    const kb = window.KB;
    const counts = {};
    items.forEach(m => {
      const n = kb.byId[m.tag];
      if (!n) return;
      counts[n.ch] = (counts[n.ch] || 0) + 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    const rows = kb.chapters.map(ch => {
      const c = counts[ch.id] || 0;
      return `<div class="bar-item">
        <span class="nm" title="${ch.title}">${ch.title}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${c / max * 100}%;background:${ch.color}"></span></span>
        <span class="n">${c}</span>
      </div>`;
    }).join('');
    $('nbBars').innerHTML = items.length ? rows : '<div class="hint">还没有数据</div>';
  }

  function renderList() {
    const box = $('mistakeList');
    if (!items.length) {
      box.innerHTML = `<div class="empty">错题本还是空的。<br>点右上角「载入示例」可以先看看它长什么样。</div>`;
      $('nbFilterHint').textContent = '';
      return;
    }
    const sorted = [...items].sort((a, b) => (a.next || 0) - (b.next || 0));
    const dueCount = sorted.filter(isDue).length;
    $('nbFilterHint').textContent = dueCount ? `${dueCount} 道待复习，已按到期时间排序` : '暂无到期错题';

    box.innerHTML = sorted.map(m => {
      const node = window.KB.byId[m.tag];
      const ch = node ? window.KB.chapters.find(c => c.id === node.ch) : null;
      const st = stageLabel(m);
      const lv = ['', '会做但粗心', '理解有偏差', '概念没建立'][m.level || 2];
      return `<div class="mistake${isDue(m) ? ' due' : ''}" data-id="${m.id}">
        <div class="mistake-top">
          <span class="chip ${st.cls}">${st.txt}</span>
          <span class="chip">${node ? node.title : '未分类'}</span>
          <span class="chip" style="background:${ch ? ch.color + '14' : '#F1EFE8'};color:${ch ? ch.color : '#555'}">${lv}</span>
          <span class="date">${isDue(m) ? '待复习' : '下次 ' + dateStr(m.next)}</span>
        </div>
        <h4>${esc(m.title)}</h4>
        <div class="duo">
          <div><div class="lbl">错在哪一步</div><div class="wrong">${esc(m.wrong)}</div></div>
          <div><div class="lbl">纠正依据</div><div class="right">${esc(m.right)}</div></div>
        </div>
        <div class="mistake-foot">
          <button class="btn sm" data-act="ok">记住了</button>
          <button class="btn sm" data-act="again">还得再看</button>
          <button class="btn sm ghost" data-act="del" style="margin-left:auto;color:var(--crimson)">删除</button>
        </div>
      </div>`;
    }).join('');

    box.querySelectorAll('.mistake').forEach(el => {
      const id = el.dataset.id;
      el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.act;
          const m = items.find(x => x.id === id);
          if (!m) return;
          if (act === 'del') {
            items = items.filter(x => x.id !== id);
          } else if (act === 'ok') {
            m.stage = Math.min(INTERVALS.length, (m.stage || 0) + 1);
            const gap = INTERVALS[Math.min(m.stage, INTERVALS.length - 1)];
            m.next = Date.now() + gap * DAY;
          } else {
            m.stage = Math.max(0, (m.stage || 0) - 1);
            m.next = Date.now() + DAY;
          }
          save(); renderAll();
        });
      });
    });
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function renderAll() {
    renderStats(); renderList(); renderBars();
    if (window.App && window.App.refreshFoot) window.App.refreshFoot();
  }

  /* ---------- 表单 ---------- */

  function buildTagSelect() {
    const sel = $('mkTag');
    const kb = window.KB;
    sel.innerHTML = kb.chapters.map(ch =>
      `<optgroup label="${ch.idx} ${ch.title}">` +
      kb.byChapter[ch.id].map(n => `<option value="${n.id}">${n.title}</option>`).join('') +
      `</optgroup>`
    ).join('');
  }

  function addFromForm() {
    const title = $('mkTitle').value.trim();
    if (!title) { window.App.toast('先写下题目或错误做法'); return; }
    const m = {
      id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      wrong: $('mkWrong').value.trim(),
      right: $('mkRight').value.trim(),
      tag: $('mkTag').value,
      level: parseInt($('mkLevel').value, 10) || 2,
      created: Date.now(),
      stage: 0,
      next: Date.now() + DAY
    };
    items.unshift(m);
    save(); renderAll();
    $('mkTitle').value = ''; $('mkWrong').value = ''; $('mkRight').value = '';
    window.App.toast('已加入错题本，明天进入复习队列');
  }

  const SEED = [
    {
      title: '求 lim(x→0) (tan x − sin x)/x³，我直接等价替换 tan x ~ x，sin x ~ x，得 0',
      wrong: '在减法中逐项做等价无穷小替换',
      right: 'tan x − sin x = tan x(1 − cos x) ~ x · x²/2 = x³/2，故极限为 1/2。等价替换只对乘除因子成立。',
      tag: 'n7', level: 2
    },
    {
      title: '求 lim(x→∞) (x + sin x)/x，用洛必达得 (1 + cos x)/1，然后说极限不存在',
      wrong: '默认洛必达法则总能用，没检查"导数之比的极限存在"这一条',
      right: '原式 = 1 + sin x/x → 1。导数之比无极限说明洛必达失效，应改用夹逼或直接化简。',
      tag: 'n19', level: 3
    },
    {
      title: '判断 f(x,y)=xy/(x²+y²) 在原点是否连续，我算出 f_x=f_y=0 就说不连续但可微',
      wrong: '把"偏导存在"当成了"可微"',
      right: '函数在原点连不连续都不成立（沿 y=x 极限为 1/2），可微更无从谈起。偏导存在推不出连续。',
      tag: 'n33', level: 3
    }
  ];

  function seed() {
    const now = Date.now();
    const extra = SEED.map((s, i) => Object.assign({}, s, {
      id: 'seed' + i,
      created: now - i * 3600 * 1000,
      stage: i,
      next: i === 0 ? now - DAY : now + INTERVALS[i] * DAY
    }));
    items = items.concat(extra.filter(e => !items.some(x => x.title === e.title)));
    save(); renderAll();
    window.App.toast('已载入 3 道示例错题');
  }

  function exportMd() {
    if (!items.length) { window.App.toast('错题本是空的'); return; }
    const lines = ['# 数学分析错题本', '', `导出时间：${dateStr(Date.now())}　共 ${items.length} 道`, ''];
    items.forEach((m, i) => {
      const node = window.KB.byId[m.tag];
      lines.push(`## ${i + 1}. ${m.title}`);
      lines.push('');
      lines.push(`- 知识点：${node ? node.title : '未分类'}`);
      lines.push(`- 难度：${['', '会做但粗心', '理解有偏差', '概念没建立'][m.level || 2]}`);
      lines.push(`- 错因：${m.wrong || '—'}`);
      lines.push(`- 纠正：${m.right || '—'}`);
      lines.push(`- 记录日期：${dateStr(m.created)}　复习阶段：${m.stage || 0}/${INTERVALS.length}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '分析错题本.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    window.App.toast('已导出 Markdown');
  }

  function init() {
    load();
    buildTagSelect();
    renderAll();
    $('btnAddMistake').addEventListener('click', addFromForm);
    $('btnSeed').addEventListener('click', seed);
    $('btnExport').addEventListener('click', exportMd);
  }

  function counts() {
    return { total: items.length, due: items.filter(isDue).length };
  }

  return { init, counts, onShow: renderAll };
})();
