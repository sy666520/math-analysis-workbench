/* ============================================================
   theorem.js · 定理条件检验器
   用数值方法逐条检验中值定理的前提，并定位 ξ
   教学要点：「条件不满足」只说明定理不能直接用，不等于结论一定错
   ============================================================ */

window.Theorem = (function () {

  const $ = id => document.getElementById(id);
  const N = 400;

  const THMS = [
    {
      id: 'rolle', name: '罗尔中值定理', needG: false,
      formula: String.raw`f\in C[a,b],\ f\ \text{在}(a,b)\text{可导},\ f(a)=f(b)\ \Longrightarrow\ \exists\,\xi\in(a,b):\ f'(\xi)=0`
    },
    {
      id: 'lagrange', name: '拉格朗日中值定理', needG: false,
      formula: String.raw`f\in C[a,b],\ f\ \text{在}(a,b)\text{可导}\ \Longrightarrow\ \exists\,\xi\in(a,b):\ f'(\xi)=\frac{f(b)-f(a)}{b-a}`
    },
    {
      id: 'cauchy', name: '柯西中值定理', needG: true,
      formula: String.raw`\exists\,\xi\in(a,b):\ \frac{f'(\xi)}{g'(\xi)}=\frac{f(b)-f(a)}{g(b)-g(a)}`
    },
    {
      id: 'integral', name: '积分中值定理', needG: false,
      formula: String.raw`f\in C[a,b]\ \Longrightarrow\ \exists\,\xi\in[a,b]:\ \int_a^b f=f(\xi)(b-a)`
    }
  ];

  const PRESETS = {
    rolle: [
      { name: 'x²−1 于 [−1,1]', f: 'x^2-1', a: -1, b: 1 },
      { name: 'x³−3x 于 [−2,0]', f: 'x^3-3*x', a: -2, b: 0 },
      { name: '|x| 于 [−1,1]（不可导）', f: 'abs(x)', a: -1, b: 1 },
      { name: 'x 于 [0,1]（端点不等）', f: 'x', a: 0, b: 1 }
    ],
    lagrange: [
      { name: 'x³−3x 于 [−1,1]', f: 'x^3-3*x', a: -1, b: 1 },
      { name: 'sin x 于 [0,3]', f: 'sin(x)', a: 0, b: 3 },
      { name: '1/x 于 [−1,1]（断裂）', f: '1/x', a: -1, b: 1 },
      { name: 'x·sin(1/x) 于 [−1,1]', f: 'x*sin(1/x)', a: -1, b: 1 }
    ],
    cauchy: [
      { name: 'f=x³, g=x² 于 [1,2]', f: 'x^3', g: 'x^2', a: 1, b: 2 },
      { name: 'f=sin x, g=x 于 [0,2]', f: 'sin(x)', g: 'x', a: 0, b: 2 },
      { name: 'f=x², g=x³ 于 [−1,1]', f: 'x^2', g: 'x^3', a: -1, b: 1 }
    ],
    integral: [
      { name: 'sin x 于 [0,3]', f: 'sin(x)', a: 0, b: 3 },
      { name: 'x² 于 [0,2]', f: 'x^2', a: 0, b: 2 },
      { name: '1/x 于 [−1,1]（无界）', f: '1/x', a: -1, b: 1 }
    ]
  };

  let plotter, cur = 'rolle';

  function curThm() { return THMS.find(t => t.id === cur); }

  function buildThmList() {
    const box = $('thmList');
    box.innerHTML = '';
    THMS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'nav-item' + (t.id === cur ? ' active' : '');
      b.style.fontSize = '12.5px';
      b.innerHTML = `<span>${t.name}</span>`;
      b.addEventListener('click', () => {
        cur = t.id;
        buildThmList();
        $('thmGWrap').style.display = t.needG ? 'block' : 'none';
        $('thmTitle').textContent = t.name;
        renderFormula();
        buildPresets();
        $('thmResult').innerHTML = '<div class="empty">点击「检验条件并求解 ξ」开始</div>';
        plotter.clear(); plotter.grid(true);
      });
      box.appendChild(b);
    });
  }

  function renderFormula() {
    const t = curThm();
    const el = $('thmFormula');
    if (window.katex) {
      try { katex.render(t.formula, el, { throwOnError: false, displayMode: false }); }
      catch (e) { el.textContent = t.name; }
    }
  }

  function buildPresets() {
    const box = $('thmPresets');
    box.innerHTML = '';
    (PRESETS[cur] || []).forEach(p => {
      const b = document.createElement('button');
      b.className = 'preset';
      b.textContent = p.name;
      b.addEventListener('click', () => {
        $('thmF').value = p.f;
        $('thmA').value = String(p.a);
        $('thmB').value = String(p.b);
        if (p.g) $('thmG').value = p.g;
        run();
      });
      box.appendChild(b);
    });
  }

  /* ---------- 数值检验 ---------- */

  function sample(fn, a, b, n) {
    const xs = [], ys = [];
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * i / n;
      xs.push(x); ys.push(fn(x));
    }
    return { xs, ys, h: (b - a) / n };
  }

  function checkContinuous(s) {
    const bad = s.ys.filter(v => !isFinite(v)).length;
    if (bad > 0) {
      return { ok: false, note: `区间内有 ${bad} 个采样点无定义或发散（如 ${fmtPts(s)}）` };
    }
    const diffs = [];
    for (let i = 1; i < s.ys.length; i++) diffs.push(Math.abs(s.ys[i] - s.ys[i - 1]));
    const sorted = [...diffs].sort((x, y) => x - y);
    const med = sorted[Math.floor(sorted.length / 2)];
    const max = sorted[sorted.length - 1];
    if (med > 0 && max > 60 * med && max > 0.02 * (Math.abs(s.ys[0]) + 1)) {
      return { ok: false, note: '检测到采样间存在跳变，疑似间断点' };
    }
    return { ok: true, note: '采样点全部有限且无跳变' };
  }

  function fmtPts(s) {
    const idx = s.ys.findIndex(v => !isFinite(v));
    return idx >= 0 ? 'x ≈ ' + s.xs[idx].toFixed(3) : '';
  }

  function checkDifferentiable(s, a, b) {
    let worst = 0, worstX = null, nonFinite = 0;
    for (let i = 1; i < s.ys.length - 1; i++) {
      const dl = (s.ys[i] - s.ys[i - 1]) / s.h;
      const dr = (s.ys[i + 1] - s.ys[i]) / s.h;
      if (!isFinite(dl) || !isFinite(dr)) { nonFinite++; continue; }
      if (Math.abs(dl) > 1e5 || Math.abs(dr) > 1e5) { nonFinite++; continue; }
      const d = Math.abs(dr - dl) / (1 + Math.abs(dl) + Math.abs(dr));
      if (d > worst) { worst = d; worstX = s.xs[i]; }
    }
    if (nonFinite > 0) {
      return { ok: false, note: `有 ${nonFinite} 个内点处数值导数无界，疑似不可导` };
    }
    if (worst > 0.12) {
      return { ok: false, note: `在 x ≈ ${worstX.toFixed(3)} 处左、右导数明显不一致（尖点）` };
    }
    return { ok: true, note: '内点左右导数一致（数值判据）' };
  }

  /* ---------- 主流程 ---------- */

  function run() {
    if (!plotter) return;
    const thm = curThm();
    const fs = $('thmF').value.trim();
    const gs = $('thmG').value.trim();
    const a = parseFloat($('thmA').value);
    const b = parseFloat($('thmB').value);

    if (!isFinite(a) || !isFinite(b) || b <= a) {
      $('thmResult').innerHTML = `<div class="verdict fail"><strong>区间无效</strong>：需要 a &lt; b。</div>`;
      return;
    }

    let f, g = null;
    try { f = window.Expr.compile(fs).f; }
    catch (e) {
      $('thmResult').innerHTML = `<div class="verdict fail"><strong>f(x) 解析失败</strong>：${e.message}</div>`;
      return;
    }
    if (thm.needG) {
      try { g = window.Expr.compile(gs).f; }
      catch (e) {
        $('thmResult').innerHTML = `<div class="verdict fail"><strong>g(x) 解析失败</strong>：${e.message}</div>`;
        return;
      }
    }

    const sf = sample(f, a, b, N);
    const conds = [];

    const cCont = checkContinuous(sf);
    conds.push({ ok: cCont.ok, text: 'f 在 [a, b] 上连续', note: cCont.note });

    const cDiff = checkDifferentiable(sf, a, b);
    conds.push({ ok: cDiff.ok, text: 'f 在 (a, b) 内可导', note: cDiff.note });

    let k = 0, xi = [], concl = '', yi = null;

    const dF = x => window.Expr.deriv(f, x, 1e-6);

    if (thm.id === 'rolle') {
      const eq = Math.abs(f(a) - f(b)) <= 1e-9 * (1 + Math.abs(f(a)));
      conds.push({
        ok: eq, text: 'f(a) = f(b)',
        note: eq ? `端点值均为 ${window.Expr.fmt(f(a), 5)}` : `f(a) = ${window.Expr.fmt(f(a), 5)}，f(b) = ${window.Expr.fmt(f(b), 5)}`
      });
      xi = window.Expr.scanRoots(dF, a + (b - a) * 1e-4, b - (b - a) * 1e-4, 800);
      concl = String.raw`f'(\xi)=0`;
      k = 0;
    }

    if (thm.id === 'lagrange') {
      k = (f(b) - f(a)) / (b - a);
      conds.push({
        ok: true, text: '弦斜率 k 有定义',
        note: `k = [f(b) − f(a)]/(b − a) = ${window.Expr.fmt(k, 6)}`
      });
      xi = window.Expr.scanRoots(x => dF(x) - k, a + (b - a) * 1e-4, b - (b - a) * 1e-4, 800);
      concl = String.raw`f'(\xi)=\frac{f(b)-f(a)}{b-a}`;
    }

    if (thm.id === 'cauchy') {
      const sg = sample(g, a, b, N);
      const cgCont = checkContinuous(sg);
      const cgDiff = checkDifferentiable(sg, a, b);
      const dG = x => window.Expr.deriv(g, x, 1e-6);
      let gzero = 0;
      for (let i = 1; i < N; i++) {
        const x = a + (b - a) * i / N;
        const v = dG(x);
        if (!isFinite(v) || Math.abs(v) < 1e-6) gzero++;
      }
      conds.push({ ok: cgCont.ok, text: 'g 在 [a, b] 上连续', note: cgCont.note });
      conds.push({ ok: cgDiff.ok, text: 'g 在 (a, b) 内可导', note: cgDiff.note });
      conds.push({
        ok: gzero === 0, text: "g'(x) ≠ 0 于 (a, b)",
        note: gzero === 0 ? '内点数值导数处处非零' : `有 ${gzero} 个内点满足 g′(x) ≈ 0`
      });
      const gb = g(b) - g(a);
      const denomOk = Math.abs(gb) > 1e-12;
      if (!denomOk) conds.push({ ok: false, text: 'g(b) − g(a) ≠ 0', note: '分母为零，比值无定义' });
      k = denomOk ? (f(b) - f(a)) / gb : NaN;
      conds.push({ ok: denomOk, text: '比值有定义', note: denomOk ? `比值 = ${window.Expr.fmt(k, 6)}` : '—' });
      xi = window.Expr.scanRoots(x => dF(x) - k * dG(x), a + (b - a) * 1e-4, b - (b - a) * 1e-4, 800);
      concl = String.raw`\frac{f'(\xi)}{g'(\xi)}=\frac{f(b)-f(a)}{g(b)-g(a)}`;
    }

    if (thm.id === 'integral') {
      const I = window.Expr.integrate(f, a, b, 1e-8);
      k = I / (b - a);
      conds.push({ ok: isFinite(k), text: '积分收敛', note: `∫ = ${window.Expr.fmt(I, 6)}，平均值 = ${window.Expr.fmt(k, 6)}` });
      xi = window.Expr.scanRoots(x => f(x) - k, a, b, 900);
      concl = String.raw`f(\xi)=\frac{1}{b-a}\int_a^b f`;
    }

    const allOk = conds.every(c => c.ok);

    // 剔除不可导点：数值导数在尖点处会给出 0 的假象（如 |x| 在 0 处）
    if (thm.id !== 'integral') {
      const hh = Math.max((b - a) * 1e-4, 1e-9);
      xi = xi.filter(x => {
        const dl = (f(x) - f(x - hh)) / hh;
        const dr = (f(x + hh) - f(x)) / hh;
        if (!isFinite(dl) || !isFinite(dr)) return false;
        return Math.abs(dr - dl) <= 0.02 * (1 + Math.abs(dl) + Math.abs(dr));
      });
    }

    const xiIn = xi.filter(x => x > a + (b - a) * 1e-3 && x < b - (b - a) * 1e-3);
    const shown = xiIn.length ? xiIn : xi;

    /* ---- 绘图 ---- */
    plotter.resize();
    plotter.setRange(a - (b - a) * 0.35, b + (b - a) * 0.35, 0, 1);
    plotter.autoRangeY(f, 0.97);
    const yA = f(a), yB = f(b);
    let y0 = Math.min(plotter.ymin, yA, yB), y1 = Math.max(plotter.ymax, yA, yB);
    plotter.setRange(a - (b - a) * 0.35, b + (b - a) * 0.35, y0, y1);
    plotter.clear();
    plotter.grid(true);

    // 区间阴影
    const c = plotter.ctx;
    c.save();
    c.fillStyle = 'rgba(29,59,99,.04)';
    c.fillRect(plotter.X(a), 0, plotter.X(b) - plotter.X(a), plotter.h);
    c.restore();

    plotter.curve(f, '#1D3B63', 1.9);

    if (thm.needG && g) {
      plotter.curve(g, '#7A6420', 1.5, [5, 4]);
    }

    // 弦
    if (isFinite(yA) && isFinite(yB) && thm.id !== 'integral') {
      plotter.line(a, yA, b, yB, '#9C7A22', 1.6, [6, 4]);
      plotter.label(b, yB, '弦', '#9C7A22', 8, 12);
    }

    if (thm.id === 'integral') {
      // 绘制平均值水平线
      plotter.line(a, k, b, k, '#9C7A22', 1.6, [6, 4]);
    }

    plotter.vline(a, '#C9C4B7', [3, 4]);
    plotter.vline(b, '#C9C4B7', [3, 4]);
    plotter.dot(a, yA, '#55534D', 3.5);
    plotter.dot(b, yB, '#55534D', 3.5);

    if (shown.length) {
      const xi0 = shown[0];
      const yF = f(xi0);
      if (thm.id !== 'integral') {
        const slope = dF(xi0);
        const span = (plotter.xmax - plotter.xmin) * 0.4;
        plotter.line(xi0 - span, yF - slope * span, xi0 + span, yF + slope * span, '#A4382B', 1.5, [6, 4]);
      }
      plotter.vline(xi0, '#A4382B', [2, 3]);
      plotter.dot(xi0, yF, '#A4382B', 5);
      plotter.label(xi0, yF, 'ξ', '#A4382B', 8, -12);

      shown.slice(1, 4).forEach(xx => {
        plotter.dot(xx, f(xx), '#A4382B', 3.5, true);
      });
    }

    /* ---- 结果面板 ---- */
    const F = window.Expr.fmt;
    let html = '';

    const condHtml = conds.map(cc => `
      <div class="cond">
        <span class="${cc.ok ? 'ok' : 'no'}">${cc.ok ? '✓' : '✗'}</span>
        <span><b>${cc.text}</b>　<span style="color:var(--ink-3)">${cc.note || ''}</span></span>
      </div>`).join('');

    if (allOk) {
      html += `<div class="verdict pass"><strong>条件全部满足，定理可以适用。</strong>
        结论成立：存在 <b>ξ ≈ ${shown.length ? F(shown[0], 6) : '（数值未定位）'}</b>，
        使 $\displaystyle ${concl}$。</div>`;
    } else {
      const failed = conds.filter(x => !x.ok).map(x => x.text);
      html += `<div class="verdict fail"><strong>有 ${failed.length} 条前提不满足，本定理不能直接使用。</strong>
        失效的条件：${failed.join('；')}。<br>
        注意：这只说明<b>不能用这个定理推出结论</b>，并不意味着结论一定不成立——
        条件是充分的，不是必要的。请查看下方"实际观察"。</div>`;
    }

    html += `<div class="cond-list">${condHtml}</div>`;

    if (shown.length) {
      const vals = shown.slice(0, 3).map(x =>
        `ξ ≈ ${F(x, 6)}，f(ξ) = ${F(f(x), 6)}` + (thm.id !== 'integral' ? `，f′(ξ) = ${F(dF(x), 6)}` : '')
      ).join('<br>');
      html += `<div class="block"><h4>实际观察（无论定理是否适用）</h4>
        <p>在 (a, b) 内数值扫描到 ${shown.length} 个满足结论的点：<br>${vals}</p>
        ${!allOk ? '<p style="color:var(--ink-3)">结论仍然成立，正好说明该定理的条件是充分非必要，不可反过来用"条件不满足"去否定结论。</p>' : ''}
        </div>`;
    } else if (!allOk) {
      html += `<div class="block"><h4>实际观察</h4>
        <p>在 (a, b) 内<b>未找到</b>满足结论的点。这与"条件不满足"是一致的：
        本例恰好可以说明该条件确实不能被去掉。</p></div>`;
    }

    html += `<p class="hint" style="margin-top:14px;line-height:1.8">
      判定方式：在区间上取 ${N} 个采样点检验连续性与左右导数一致性，再扫描导数变号定位 ξ。
      这是<b>经验证据</b>，可作为理解工具，不能替代课堂上的严格证明。</p>`;

    $('thmResult').innerHTML = html;
    if (window.renderMath) window.renderMath($('thmResult'));

    $('thmReadout').innerHTML =
      `a = ${F(a, 4)}　b = ${F(b, 4)}<br>` +
      `f(a) = ${F(yA, 4)}　f(b) = ${F(yB, 4)}<br>` +
      (thm.id !== 'rolle' && isFinite(k) ? `k = ${F(k, 4)}` : '');
  }

  function init() {
    plotter = new window.Plotter($('thmCanvas'));
    plotter.onChange = () => {};
    buildThmList();
    buildPresets();
    renderFormula();
    $('thmTitle').textContent = curThm().name;
    $('btnCheck').addEventListener('click', run);
    ['thmF', 'thmG', 'thmA', 'thmB'].forEach(id => {
      $(id).addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    });
  }

  function onShow() {
    if (!plotter) return;
    plotter.resize();
  }

  window.addEventListener('resize', () => { if (plotter) plotter.resize(); });

  return { init, onShow, plot: () => plotter };
})();
