/* ============================================================
   app.js · 应用装配
   视图路由、知识卡片详情渲染、KaTeX 行内公式、设置与提示
   ============================================================ */

window.App = (function () {

  const $ = id => document.getElementById(id);

  const VIEW_META = {
    map: { title: '知识图谱', desc: '按章组织知识点与前置依赖，点击节点查看定义、条件与易错点' },
    lab: { title: '函数实验室', desc: '输入任意函数，滑动参数观察极限、导数与积分行为' },
    theorem: { title: '定理检验', desc: '逐条检验中值定理的前提是否成立，并定位 ξ 的位置' },
    mistakes: { title: '错题本', desc: '记录错因与纠正依据，按遗忘曲线安排复习' },
    tutor: { title: 'AI 助教', desc: '在知识卡片中检索并组织答案，离线可用、结论可追溯' }
  };

  /* ---------- KaTeX 行内渲染 ---------- */
  function renderMath(root) {
    if (!window.katex || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(node => {
      const text = node.nodeValue;
      if (text.indexOf('$') === -1) return;
      const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
      let last = 0, m, dirty = false;
      const frag = document.createDocumentFragment();
      while ((m = re.exec(text))) {
        dirty = true;
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const tex = m[1] !== undefined ? m[1] : m[2];
        const span = document.createElement('span');
        try {
          span.innerHTML = katex.renderToString(tex, {
            displayMode: m[1] !== undefined,
            throwOnError: false,
            strict: false
          });
        } catch (e) {
          span.textContent = tex;
        }
        frag.appendChild(span);
        last = re.lastIndex;
      }
      if (!dirty) return;
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- 知识卡片详情 ---------- */
  function chapterOf(node) {
    return window.KB.chapters.find(c => c.id === node.ch);
  }

  const isNarrow = () => window.matchMedia('(max-width: 860px)').matches;

  /* 窄屏详情页：整页推入 + 返回。用 history 记录一层，
     这样安卓返回键、浏览器返回都是「回到列表」而不是退出整个站点。 */
  let npOpen = false;
  let npPushed = false;
  let npScroll = 0;
  let detailNodeId = null;

  function openNodePage(id, ch) {
    const page = $('nodePage');
    if (!page) return;
    $('npCrumb').textContent = ch ? `${ch.idx} · ${ch.title}` : '';
    const list = $('views');
    npScroll = list ? list.scrollTop : 0;
    page.classList.add('on');
    page.setAttribute('aria-hidden', 'false');
    $('nodePageBody').scrollTop = 0;
    npOpen = true;

    try {
      if (npPushed) history.replaceState({ np: id }, '', '#' + id);
      else { history.pushState({ np: id }, '', '#' + id); npPushed = true; }
    } catch (e) {}
  }

  function closeNodePage(fromPop, skipRestore) {
    if (!npOpen) return;
    npOpen = false;
    const page = $('nodePage');
    if (page) {
      page.classList.remove('on');
      page.setAttribute('aria-hidden', 'true');
    }
    // 回到列表时停在原来的位置：某些内核在 history 返回后会重置滚动，这里显式恢复
    if (!skipRestore && current === 'map') {
      const v = $('views');
      if (v) {
        v.scrollTop = npScroll;
        requestAnimationFrame(() => { if (current === 'map') v.scrollTop = npScroll; });
      }
    }
    if (!fromPop && npPushed) {
      npPushed = false;
      try { history.back(); } catch (e) {}
    }
  }

  function renderDetail(id, fromUser) {
    const node = window.KB.byId[id];
    if (!node) return;
    const ch = chapterOf(node);
    const deps = (node.deps || []).map(d => window.KB.byId[d]).filter(Boolean);
    const users = window.KB.nodes.filter(x => (x.deps || []).includes(id));
    const lv = node.level === 'core' ? '核心' : '进阶';

    let html = `
      <div class="detail-head">
        <div class="kicker">${ch.idx} · ${ch.title}</div>
        <h3>${node.title}</h3>
        <div class="tags">
          <span class="chip ${node.level === 'core' ? 'accent' : ''}">${lv}</span>
          <span class="chip">${node.sub}</span>
          <span class="chip">前置 ${deps.length}</span>
          <span class="chip">被引用 ${users.length}</span>
        </div>
      </div>`;

    if (node.formula) {
      html += `<div class="formula-box"></div>`;
    }

    html += `<div class="block"><h4>一句话定位</h4><p>${node.idea || ''}</p></div>`;

    if ((node.cond || []).length) {
      html += `<div class="block"><h4>成立条件</h4><ul class="checklist">
        ${node.cond.map(c => `<li>${c}</li>`).join('')}</ul></div>`;
    }

    if ((node.traps || []).length) {
      html += `<div class="block"><h4>常见错误</h4><ul class="checklist warn">
        ${node.traps.map(c => `<li>${c}</li>`).join('')}</ul></div>`;
    }

    if (node.counter) {
      html += `<div class="block"><h4>反例 / 陷阱实例</h4>
        <div class="counter-ex">${node.counter}</div></div>`;
    }

    if (deps.length) {
      html += `<div class="block"><h4>前置知识</h4><div class="related">
        ${deps.map(d => `<button data-goto="${d.id}">← ${d.title}</button>`).join('')}</div></div>`;
    }

    if (users.length) {
      html += `<div class="block"><h4>后续用到它</h4><div class="related">
        ${users.map(d => `<button data-goto="${d.id}">${d.title} →</button>`).join('')}</div></div>`;
    }

    html += `<div class="detail-actions">
      <button class="btn sm" data-act="mistake">记一道相关错题</button>
      <button class="btn sm ghost" data-act="ask">问助教</button>
    </div>`;

    // 宽屏：渲染进右侧面板；窄屏：渲染进独立详情页（点击即跳转，不再滚动长列表）
    const narrow = isNarrow();
    const body = narrow ? $('nodePageBody') : $('detailBody');
    detailNodeId = id;

    if (!narrow) {
      $('detailEmpty').style.display = 'none';
      $('detail').scrollTop = 0;
      body.style.display = 'block';
    }
    body.innerHTML = html;

    if (node.formula) {
      const fbox = body.querySelector('.formula-box');
      try { katex.render(node.formula, fbox, { displayMode: true, throwOnError: false, strict: false }); }
      catch (e) { fbox.textContent = node.formula; }
    }
    renderMath(body);

    body.querySelectorAll('[data-goto]').forEach(b => {
      b.addEventListener('click', () => window.Graph.select(b.dataset.goto, true));
    });

    const bm = body.querySelector('[data-act="mistake"]');
    if (bm) {
      bm.addEventListener('click', () => {
        go('mistakes');
        $('mkTag').value = id;
        $('mkTitle').focus();
        toast('已关联知识点「' + node.title + '」');
      });
    }

    const ba = body.querySelector('[data-act="ask"]');
    if (ba) {
      ba.addEventListener('click', () => {
        go('tutor');
        window.Tutor.ask(node.title + ' 的成立条件和常见错误是什么？');
      });
    }

    // 用户主动点选才推入详情页；初始化时的默认选中不跳转
    if (narrow) {
      if (fromUser) openNodePage(id, ch);
    } else if (npOpen) {
      closeNodePage(true);
    }
  }

  window.onNodeSelect = renderDetail;

  /* ---------- 路由 ---------- */
  let current = 'map';

  function go(view, nodeId) {
    if (!VIEW_META[view]) return;
    // 切换模块时先收起详情页，避免返回后残留在别的模块上
    if (npOpen && view !== 'map') closeNodePage(true, true);
    current = view;

    document.querySelectorAll('.nav-item[data-view]').forEach(b =>
      b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v =>
      v.classList.toggle('active', v.id === 'view-' + view));

    $('viewTitle').textContent = VIEW_META[view].title;
    $('viewDesc').textContent = VIEW_META[view].desc;

    // 切换模块时回到顶部，避免沿用上一个模块的滚动位置（移动端尤其明显）
    const scroller = $('views');
    if (scroller) scroller.scrollTop = 0;

    if (view === 'lab' && window.Lab) window.Lab.onShow();
    if (view === 'theorem' && window.Theorem) window.Theorem.onShow();
    if (view === 'mistakes' && window.Mistakes) window.Mistakes.onShow();
    if (view === 'tutor' && window.Tutor) window.Tutor.onShow();

    if (view === 'map' && nodeId) {
      setTimeout(() => window.Graph.select(nodeId), 0);
    }
    try { history.replaceState(null, '', '#' + view); } catch (e) {}
  }

  /* ---------- 底部状态 ---------- */
  function refreshFoot() {
    const c = window.Mistakes ? window.Mistakes.counts() : { total: 0, due: 0 };
    $('footStat').textContent = `${window.KB.nodes.length} 张卡片 · 错题 ${c.total} 道` +
      (c.due ? `（${c.due} 待复习）` : '');
  }

  function setMode(txt) {
    const el = $('footMode');
    if (el) el.textContent = txt;
  }

  /* ---------- 提示 ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
  }

  /* ---------- 设置 ---------- */
  function openSettings() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem('ab.llmcfg.v1') || '{}'); } catch (e) {}
    $('cfgBase').value = raw.base || '';
    $('cfgKey').value = raw.key || '';
    $('cfgModel').value = raw.model || '';
    $('settingsOverlay').classList.add('on');
  }

  function initSettings() {
    $('btnSettings').addEventListener('click', openSettings);
    $('btnCfgCancel').addEventListener('click', () => $('settingsOverlay').classList.remove('on'));
    $('settingsOverlay').addEventListener('click', e => {
      if (e.target.id === 'settingsOverlay') e.currentTarget.classList.remove('on');
    });
    $('btnCfgSave').addEventListener('click', () => {
      const base = $('cfgBase').value.trim().replace(/\/$/, '');
      // 只接受 https：密钥要随请求头发出去，明文 http 会把它暴露在链路上
      if (base && !/^https:\/\//i.test(base)) {
        toast('接口地址必须以 https:// 开头，否则密钥会在传输中明文暴露');
        return;
      }
      window.Tutor.saveCfg(
        base,
        $('cfgKey').value.trim(),
        $('cfgModel').value.trim()
      );
      $('settingsOverlay').classList.remove('on');
      toast(window.Tutor.onlineMode() ? '已切换到在线模型模式' : '已保存（本地检索模式）');
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    document.querySelectorAll('.nav-item[data-view]').forEach(b => {
      b.addEventListener('click', () => go(b.dataset.view));
    });

    window.Graph.init();
    window.Lab.init();
    window.Theorem.init();
    window.Mistakes.init();
    window.Tutor.init();
    initSettings();

    // 图谱搜索
    let t = null;
    $('mapSearch').addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => {
        const hit = window.Graph.filter(e.target.value);
        e.target.style.borderColor = e.target.value && hit === 0 ? '#A4382B' : '';
      }, 160);
    });
    $('mapReset').addEventListener('click', () => {
      $('mapSearch').value = '';
      window.Graph.filter('');
      window.Graph.select(window.KB.nodes[0].id);
    });

    // 数字键切换
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;
      const map = { '1': 'map', '2': 'lab', '3': 'theorem', '4': 'mistakes', '5': 'tutor' };
      if (map[e.key] && !e.metaKey && !e.ctrlKey) go(map[e.key]);
    });

    const hash = location.hash.replace('#', '');
    if (VIEW_META[hash]) go(hash);

    // 详情页返回：按钮与浏览器/安卓返回键都要能回到列表
    const back = $('npBack');
    if (back) back.addEventListener('click', () => closeNodePage(false));
    window.addEventListener('popstate', () => {
      if (npOpen) { npPushed = false; closeNodePage(true); }
    });

    // 横竖屏或窗口宽度跨过断点时，详情在「面板」与「独立页」之间换位置
    let wasNarrow = isNarrow();
    window.addEventListener('resize', () => {
      const now = isNarrow();
      if (now === wasNarrow) return;
      wasNarrow = now;
      if (!now) closeNodePage(true);
      if (detailNodeId) renderDetail(detailNodeId, false);
    });

    refreshFoot();
  }

  document.addEventListener('DOMContentLoaded', init);

  // 供各模块调用（theorem / tutor 在渲染完 HTML 后需要再跑一遍公式）
  window.renderMath = renderMath;

  return { go, toast, refreshFoot, setMode, renderMath, current: () => current };
})();
