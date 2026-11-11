/* ============================================================
   lab.js · 函数实验室
   表达式绘制 + 参数滑块 + 数值工具（导数 / 极限逼近 / 积分 / 零点）
   ============================================================ */

window.Lab = (function () {

  let plotter, f = () => NaN, src = 'sin(x)/x';
  let a = 1, b = 1, x0 = 0, lastErr = '';
  let showTangent = false, showSecant = false, showGrid = true;
  let raf = null;

  const PRESETS = [
    { name: 'sin(x)/x', expr: 'sin(x)/x', x0: 0, view: [-6, 6] },
    { name: 'x·sin(1/x)', expr: 'x*sin(1/x)', x0: 0, view: [-1, 1] },
    { name: 'sin(1/x)', expr: 'sin(1/x)', x0: 0, view: [-0.6, 0.6] },
    { name: '|x|/x', expr: 'abs(x)/x', x0: 0, view: [-3, 3] },
    { name: 'x²sin(1/x)', expr: 'x^2*sin(1/x)', x0: 0, view: [-1, 1] },
    { name: '(1+x)^(1/x)', expr: '(1+x)^(1/x)', x0: 0, view: [-0.9, 4] },
    { name: '(1−cos x)/x²', expr: '(1-cos(x))/x^2', x0: 0, view: [-4, 4] },
    { name: 'x^x', expr: 'x^x', x0: 0.5, view: [0, 2.5] },
    { name: 'tan x', expr: 'tan(x)', x0: 1.5708, view: [-1.6, 4.6] },
    { name: 'ln|x|', expr: 'ln(abs(x))', x0: 0, view: [-3, 3] },
    { name: 'e^(−1/x²)', expr: 'exp(-1/x^2)', x0: 0, view: [-2, 2] },
    { name: 'sin(ax)/(bx)', expr: 'sin(a*x)/(b*x)', x0: 0, view: [-8, 8] }
  ];

  const $ = id => document.getElementById(id);

  function compileAndDraw(keepView) {
    $('exprEcho').textContent = 'f(x) = ' + src;
    try {
      const c = window.Expr.compile(src);
      f = c.f;
      lastErr = '';
    } catch (e) {
      lastErr = e.message;
      f = () => NaN;
    }
    if (!keepView) {
      // 保持 x 范围，重算 y 范围
      plotter.autoRangeY(x => f(x, { a, b }));
    }
    draw();
    updateNumbers();
    updateLimitTable();
  }

  function draw() {
    if (!plotter) return;
    plotter.clear();
    const g = x => f(x, { a, b });
    if (showGrid) plotter.grid(true);

    if (lastErr) {
      plotter.ctx.save();
      plotter.ctx.fillStyle = '#A4382B';
      plotter.ctx.font = '12px "Segoe UI", sans-serif';
      plotter.ctx.fillText('表达式有误：' + lastErr, 16, plotter.h - 18);
      plotter.ctx.restore();
      return;
    }

    plotter.curve(g, '#1D3B63', 1.9);

    const y0 = g(x0);

    if (showSecant && isFinite(y0)) {
      const h = 1;
      const x1 = x0 + h, y1 = g(x1);
      if (isFinite(y1)) {
        plotter.line(x0, y0, x1, y1, '#9C7A22', 1.3, [4, 3]);
        plotter.dot(x1, y1, '#9C7A22', 3);
      }
    }

    if (showTangent && isFinite(y0)) {
      const k = window.Expr.deriv(g, x0);
      if (isFinite(k)) {
        const span = (plotter.xmax - plotter.xmin) * 0.42;
        const xa = x0 - span, xb = x0 + span;
        plotter.line(xa, y0 + k * (xa - x0), xb, y0 + k * (xb - x0), '#A4382B', 1.4, [5, 3]);
      }
    }

    if (isFinite(x0)) {
      plotter.vline(x0, '#C9C4B7', [3, 4]);
      if (isFinite(y0)) {
        plotter.dot(x0, y0, '#A4382B', 4.5, true);
        plotter.label(x0, y0, 'x₀', '#A4382B', 8, -12);
      }
    }
  }

  function metric(k, v, hl) {
    return `<div class="metric${hl ? ' hl' : ''}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  }

  function updateNumbers() {
    const g = x => f(x, { a, b });
    const y0 = g(x0);
    const d1 = window.Expr.deriv(g, x0);
    const d2 = window.Expr.deriv2(g, x0);
    const L = g(x0 - 1e-6), R = g(x0 + 1e-6);
    const F = window.Expr.fmt;

    // 函数在该点无定义时，导数值没有意义，不能显示成 0
    const dash = '—';
    const okAt = isFinite(y0);
    $('numGrid').innerHTML =
      metric('f(x₀)', F(y0), true) +
      metric('f′(x₀) 数值', okAt ? F(d1) : dash) +
      metric('f″(x₀) 数值', okAt ? F(d2) : dash) +
      metric('左极限近似', F(L)) +
      metric('右极限近似', F(R)) +
      metric('差商 (h = 0.01)', okAt ? F((g(x0 + 0.01) - g(x0)) / 0.01) : dash);

    // 积分与统计
    const xa = plotter.xmin, xb = plotter.xmax;
    const I = window.Expr.integrate(g, xa, xb, 1e-7);
    const I2 = window.Expr.integrate(g, x0, x0 + 1, 1e-7);
    let mx = -Infinity, mn = Infinity, cnt = 0;
    for (let i = 0; i <= 500; i++) {
      const x = xa + (xb - xa) * i / 500;
      const v = g(x);
      if (isFinite(v)) { cnt++; if (v > mx) mx = v; if (v < mn) mn = v; }
    }
    const roots = window.Expr.scanRoots(g, xa, xb, 800).filter(r => isFinite(g(r)));
    const droots = window.Expr.scanRoots(x => window.Expr.deriv(g, x), xa, xb, 400);

    $('numGrid2').innerHTML =
      metric(`∫ 在 [${F(xa, 2)}, ${F(xb, 2)}]`, F(I), true) +
      metric('∫ 在 [x₀, x₀+1]', F(I2)) +
      metric('区间最大值', cnt ? F(mx) : '—') +
      metric('区间最小值', cnt ? F(mn) : '—') +
      metric('零点个数（数值）', roots.length) +
      metric('驻点个数（数值）', droots.length);
  }

  function updateLimitTable() {
    const g = x => f(x, { a, b });
    const F = window.Expr.fmt;
    let rowsL = '<tr><th>x₀ − h</th><th>f(x)</th></tr>';
    let rowsR = '<tr><th>x₀ + h</th><th>f(x)</th></tr>';
    const lastL = [], lastR = [];
    for (let k = 1; k <= 6; k++) {
      const h = Math.pow(10, -k);
      const xl = x0 - h, xr = x0 + h;
      const vl = g(xl), vr = g(xr);
      lastL.push(vl); lastR.push(vr);
      rowsL += `<tr><td>${F(xl, 10)}</td><td>${F(vl)}</td></tr>`;
      rowsR += `<tr><td>${F(xr, 10)}</td><td>${F(vr)}</td></tr>`;
    }
    $('tblLeft').innerHTML = rowsL;
    $('tblRight').innerHTML = rowsR;

    const L = lastL[lastL.length - 1], R = lastR[lastR.length - 1];
    const el = $('limitVerdict');
    if (!isFinite(L) && !isFinite(R)) {
      el.innerHTML = '两侧数值都趋于无界或未定义，此处可能发散或为无穷间断。';
    } else if (!isFinite(L) || !isFinite(R)) {
      el.innerHTML = '仅一侧有有限逼近值，另一侧无界——单侧极限不存在，双侧极限不存在。';
    } else if (Math.abs(L - R) < 1e-3 * Math.max(1, Math.abs(L))) {
      el.innerHTML = `两侧逼近值趋于同一数 <b>${F((L + R) / 2)}</b>。数值上强烈提示极限存在（教材上仍须给出 ε-δ 证明）。`;
    } else {
      el.innerHTML = `左右逼近值不同（${F(L)} vs ${F(R)}），<b>双侧极限不存在</b>。`;
    }
  }

  function updateReadout(mx, my) {
    if (mx === null) {
      $('plotReadout').innerHTML = `x₀ = ${window.Expr.fmt(x0)}　f(x₀) = ${window.Expr.fmt(f(x0, { a, b }))}`;
      return;
    }
    $('plotReadout').innerHTML =
      `x = ${mx.toFixed(4)}　y = ${window.Expr.fmt(my, 4)}<br>` +
      `f(x) = ${window.Expr.fmt(f(mx, { a, b }), 4)}`;
  }

  function init() {
    plotter = new window.Plotter($('plotCanvas'));
    plotter.onChange = () => { draw(); updateNumbers(); };
    plotter.cursorCb = (mx, my) => updateReadout(mx, my);

    // 预设按钮
    const pw = $('presets');
    PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'preset';
      btn.textContent = p.name;
      btn.addEventListener('click', () => {
        $('fnInput').value = p.expr;
        src = p.expr;
        x0 = p.x0;
        $('x0Input').value = String(p.x0);
        plotter.setRange(p.view[0], p.view[1], -1, 1);
        // 先编译新函数，再按新函数自动确定纵轴范围
        compileAndDraw(false);
        plotter.setHome();
      });
      pw.appendChild(btn);
    });

    // 表达式输入
    let timer = null;
    $('fnInput').addEventListener('input', e => {
      src = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(() => compileAndDraw(false), 260);
    });

    // 参数滑块
    ['a', 'b'].forEach(k => {
      const el = $(k === 'a' ? 'paramA' : 'paramB');
      const out = $(k === 'a' ? 'paramAOut' : 'paramBOut');
      el.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        if (k === 'a') a = v; else b = v;
        out.textContent = v.toFixed(2);
        draw(); updateNumbers(); updateLimitTable();
      });
    });

    // 观察点
    $('x0Input').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (isFinite(v)) { x0 = v; draw(); updateNumbers(); updateLimitTable(); updateReadout(null); }
    });

    $('btnCenter').addEventListener('click', () => {
      const half = (plotter.xmax - plotter.xmin) / 2;
      plotter.setRange(x0 - half, x0 + half, plotter.ymin, plotter.ymax);
      draw();
    });

    ['showTangent', 'showSecant', 'showGrid'].forEach(id => {
      $(id).addEventListener('change', e => {
        if (id === 'showTangent') showTangent = e.target.checked;
        if (id === 'showSecant') showSecant = e.target.checked;
        if (id === 'showGrid') showGrid = e.target.checked;
        draw();
      });
    });

    $('btnZoomIn').addEventListener('click', () => { plotter.zoom(1 / 1.4); });
    $('btnZoomOut').addEventListener('click', () => { plotter.zoom(1.4); });
    $('btnHome').addEventListener('click', () => {
      plotter.goHome(); draw(); updateNumbers();
    });

    // 子标签
    document.querySelectorAll('#labTabs .tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#labTabs .tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('#view-lab .tab-panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        $('tab-' + t.dataset.tab).classList.add('active');
      });
    });

    plotter.setRange(-6, 6, -1.6, 2);
    compileAndDraw(true);
    plotter.setHome();
    updateReadout(null);
  }

  function onShow() {
    if (!plotter) return;
    plotter.resize();
    draw(); updateNumbers(); updateLimitTable(); updateReadout(null);
  }

  window.addEventListener('resize', () => { if (plotter) { plotter.resize(); draw(); } });

  return { init, onShow, plot: () => plotter };
})();
