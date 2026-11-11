/* ============================================================
   graph.js · 知识图谱渲染
   按章分带、带内自动换行的有向无环图：节点 = 知识点，箭头 = 前置依赖
   宽度自适应容器，窗口变化时自动重排
   ============================================================ */

window.Graph = (function () {

  const NS = 'http://www.w3.org/2000/svg';
  const NODE_H = 46;
  const LINE_H = 64;
  const GAP = 24;
  const LABEL_W = 104;
  const TOP = 18;

  let svg, W, H;
  let layout = {};
  let edgeEls = [];
  let nodeEls = {};
  let selected = null;

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function nodeWidth(node) {
    return Math.min(202, Math.max(106, 32 + node.title.length * 12.4));
  }

  /* 与 style.css 里的移动端断点保持一致：窄屏 + 触屏才走手机版列表。
     仅把窗口拉窄的桌面浏览器仍用原来的有向图。 */
  const MOBILE_MQ = '(max-width: 860px) and (pointer: coarse)';
  const isMobile = () => window.matchMedia(MOBILE_MQ).matches;

  /* 移动端：纵向按章分组列表。窄屏下把有向图压到手机宽度会挤成
     两三个字的节点，横向拖动也很难对准，列表反而更快找到知识点。 */
  function buildMobile() {
    const host = document.getElementById('mapCanvas');
    svg = document.getElementById('mapSvg');
    svg.innerHTML = '';
    svg.style.display = 'none';
    layout = {}; edgeEls = []; nodeEls = {};

    let list = host.querySelector('.map-list');
    if (!list) {
      list = document.createElement('div');
      list.className = 'map-list';
      host.appendChild(list);
    }
    list.innerHTML = '';

    const kb = window.KB;
    kb.chapters.forEach(ch => {
      const group = document.createElement('div');
      group.className = 'ml-group';
      group.dataset.ch = ch.id;

      const head = document.createElement('div');
      head.className = 'ml-ch';
      head.innerHTML = `<span class="ml-idx">${ch.idx}</span>` +
        `<span class="ml-name">${ch.title}</span>` +
        `<span class="ml-count">${kb.byChapter[ch.id].length}</span>`;
      group.appendChild(head);

      kb.byChapter[ch.id].forEach(n => {
        const btn = document.createElement('button');
        btn.className = 'ml-item';
        btn.dataset.id = n.id;
        btn.innerHTML =
          `<span class="ml-bar" style="background:${n.level === 'core' ? ch.color : '#CFCABC'}"></span>` +
          `<span class="ml-body"><span class="ml-t">${n.title}</span>` +
          `<span class="ml-s">${n.sub}</span></span>` +
          `<span class="ml-arrow">›</span>`;
        btn.addEventListener('click', () => select(n.id, true));
        group.appendChild(btn);
        nodeEls[n.id] = btn;
      });
      list.appendChild(group);
    });

    if (selected && nodeEls[selected]) nodeEls[selected].classList.add('sel');
  }

  /* 移动端搜索后：把没有命中项的章节整组收起，并更新计数 */
  function syncMobileGroups() {
    const q = (document.getElementById('mapSearch') || {}).value || '';
    document.querySelectorAll('#mapCanvas .ml-group').forEach(g => {
      const items = Array.from(g.querySelectorAll('.ml-item'));
      const shown = items.filter(i => !i.classList.contains('dim'));
      g.style.display = (q.trim() && !shown.length) ? 'none' : '';
      const c = g.querySelector('.ml-count');
      if (c) c.textContent = String(shown.length);
    });
  }

  function build() {
    svg = document.getElementById('mapSvg');
    const host = document.getElementById('mapCanvas');
    const oldList = host.querySelector('.map-list');
    if (oldList) oldList.remove();
    svg.style.display = '';
    if (isMobile()) { buildMobile(); return; }
    svg.innerHTML = '';
    layout = {};
    edgeEls = [];
    nodeEls = {};

    const kb = window.KB;
    const avail = Math.max(520, (host.clientWidth || 1000) - LABEL_W - 34);

    // ---- 布局：带内换行 ----
    let y = TOP;
    const bands = [];
    kb.chapters.forEach((ch) => {
      const list = kb.byChapter[ch.id];
      let x = LABEL_W, line = 0;
      list.forEach(n => {
        const w = nodeWidth(n);
        if (x + w > LABEL_W + avail && x > LABEL_W) { line++; x = LABEL_W; }
        layout[n.id] = {
          x, y: y + 10 + line * LINE_H, w, h: NODE_H, ch
        };
        x += w + GAP;
      });
      const h = 10 + (line + 1) * LINE_H + 4;
      bands.push({ ch, y, h });
      y += h;
    });

    W = LABEL_W + avail + 34;
    H = y + 18;
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    // ---- defs ----
    const defs = el('defs');
    defs.innerHTML = `
      <marker id="arwDim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="#D2CDC0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </marker>
      <marker id="arwHot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="#1D3B63" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </marker>`;
    svg.appendChild(defs);

    // ---- 分带背景 ----
    const gBg = el('g', {});
    bands.forEach((b, i) => {
      if (i % 2 === 1) {
        gBg.appendChild(el('rect', {
          x: 0, y: b.y, width: W, height: b.h, fill: '#FBF9F4'
        }));
      }
      gBg.appendChild(el('line', {
        x1: 0, y1: b.y, x2: W, y2: b.y, stroke: '#EEEAE0', 'stroke-width': 1
      }));
    });
    svg.appendChild(gBg);

    // ---- 章节标签 ----
    const gCh = el('g', {});
    bands.forEach(b => {
      const g = el('g', { style: 'cursor:pointer' });
      const idx = el('text', {
        x: 22, y: b.y + 28, fill: '#B4B0A6',
        'font-family': 'Consolas, monospace', 'font-size': 10, 'letter-spacing': '.08em'
      });
      idx.textContent = b.ch.idx;
      const t = el('text', {
        x: 22, y: b.y + 47, fill: b.ch.color,
        'font-family': 'Georgia, Songti SC, SimSun, serif', 'font-size': 12.5, 'letter-spacing': '.04em'
      });
      t.textContent = b.ch.title;
      g.appendChild(idx); g.appendChild(t);
      g.addEventListener('click', () => {
        const first = window.KB.byChapter[b.ch.id][0];
        if (first) select(first.id, true);
      });
      gCh.appendChild(g);
    });
    svg.appendChild(gCh);

    // ---- 依赖边 ----
    const gEdge = el('g', {});
    kb.nodes.forEach(n => {
      (n.deps || []).forEach(dep => {
        const a = layout[dep], b = layout[n.id];
        if (!a || !b) return;
        const x1 = a.x + a.w, y1 = a.y + NODE_H / 2;
        const x2 = b.x - 5, y2 = b.y + NODE_H / 2;
        let d;
        if (Math.abs(y1 - y2) < 4 && x2 > x1) {
          d = `M${x1} ${y1} C${x1 + 16} ${y1}, ${x2 - 14} ${y2}, ${x2} ${y2}`;
        } else if (x2 > x1 + 12) {
          const dx = Math.min(60, (x2 - x1) * 0.5 + 16);
          d = `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        } else {
          d = `M${x1} ${y1} C${x1 + 58} ${y1}, ${x2 - 58} ${y2}, ${x2} ${y2}`;
        }
        const p = el('path', {
          d, class: 'map-edge', stroke: '#D2CDC0', 'stroke-width': 1,
          'marker-end': 'url(#arwDim)', 'stroke-opacity': '.75'
        });
        p.dataset.src = dep;
        p.dataset.dst = n.id;
        gEdge.appendChild(p);
        edgeEls.push(p);
      });
    });
    svg.appendChild(gEdge);

    // ---- 节点 ----
    const gNode = el('g', {});
    kb.nodes.forEach(n => {
      const L = layout[n.id];
      const g = el('g', { class: 'map-node', transform: `translate(${L.x},${L.y})` });
      g.dataset.id = n.id;

      g.appendChild(el('rect', {
        class: 'node-box', x: 0, y: 0, width: L.w, height: L.h,
        rx: 6, ry: 6, fill: '#FFFFFF', stroke: '#DBD6C9', 'stroke-width': 1
      }));
      g.appendChild(el('rect', {
        x: 0, y: 6, width: 2.5, height: L.h - 12, rx: 1.2,
        fill: n.level === 'core' ? L.ch.color : '#CFCABC'
      }));

      const t1 = el('text', {
        x: 12, y: 20,
        'font-family': 'Segoe UI, PingFang SC, Microsoft YaHei, sans-serif',
        'font-size': 12.3, fill: '#22232a'
      });
      t1.textContent = n.title;

      const t2 = el('text', {
        x: 12, y: 35, 'font-size': 9.5, fill: '#A5A196',
        'font-family': 'Consolas, monospace', 'letter-spacing': '.02em'
      });
      t2.textContent = n.sub;

      g.appendChild(t1); g.appendChild(t2);

      g.addEventListener('click', () => select(n.id, true));
      g.addEventListener('mouseenter', () => focus(n.id, true));
      g.addEventListener('mouseleave', () => focus(selected, false));

      gNode.appendChild(g);
      nodeEls[n.id] = g;
    });
    svg.appendChild(gNode);

    // 恢复选中态
    if (selected && nodeEls[selected]) {
      nodeEls[selected].classList.add('sel');
      focus(selected, false);
    }
  }

  function focus(id, dimOthers) {
    if (!id) {
      edgeEls.forEach(e => { e.classList.remove('hot'); e.classList.remove('mute'); });
      Object.values(nodeEls).forEach(e => e.classList.remove('far'));
      return;
    }
    const near = new Set([id]);
    (window.KB.byId[id].deps || []).forEach(d => near.add(d));
    window.KB.nodes.forEach(n => { if ((n.deps || []).includes(id)) near.add(n.id); });

    edgeEls.forEach(e => {
      const hot = e.dataset.src === id || e.dataset.dst === id;
      e.classList.toggle('hot', hot);
      e.classList.toggle('mute', !hot);
    });
    Object.entries(nodeEls).forEach(([nid, e]) => {
      e.classList.toggle('far', dimOthers && !near.has(nid));
      e.classList.remove('dim');
    });
  }

  function select(id, fromUser) {
    if (!window.KB.byId[id]) return;   // 旧链接或失效 id 不应让整页崩掉
    selected = id;
    Object.values(nodeEls).forEach(e => e.classList.remove('sel'));
    if (nodeEls[id]) nodeEls[id].classList.add('sel');
    focus(id, false);
    if (window.onNodeSelect) window.onNodeSelect(id, !!fromUser);
  }

  function filter(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) {
      Object.values(nodeEls).forEach(e => e.classList.remove('dim', 'far'));
      if (isMobile()) syncMobileGroups();
      focus(selected, false);
      return 0;
    }
    let hit = 0;
    window.KB.nodes.forEach(n => {
      const hay = (n.title + ' ' + n.sub + ' ' + (n.idea || '') + ' ' +
        (n.traps || []).join(' ') + ' ' + (n.cond || []).join(' ')).toLowerCase();
      const ok = hay.includes(q);
      if (ok) hit++;
      if (nodeEls[n.id]) {
        nodeEls[n.id].classList.toggle('dim', !ok);
        nodeEls[n.id].classList.remove('far');
      }
    });
    edgeEls.forEach(e => e.classList.add('mute'));
    if (isMobile()) syncMobileGroups();
    return hit;
  }

  let rt = null;
  function init() {
    build();
    if (window.KB.nodes[0]) select(window.KB.nodes[0].id);
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { build(); }, 180);
    });
  }

  return { init, select, filter, layout: () => layout };
})();
