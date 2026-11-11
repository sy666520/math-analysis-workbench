/* ============================================================
   expr.js · 表达式解析与求值
   自研词法 + 递归下降，支持隐式乘法（2x、3sin(x)）、一元负号、右结合幂
   不依赖 eval，可在离线环境下安全运行
   ============================================================ */

window.Expr = (function () {

  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    cot: x => 1 / Math.tan(x), sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x),
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    ln: Math.log, log: Math.log10, lg: Math.log10, exp: Math.exp,
    sqrt: Math.sqrt, abs: Math.abs, sign: Math.sign,
    floor: Math.floor, ceil: Math.ceil, round: Math.round
  };

  const CONSTS = { pi: Math.PI, e: Math.E };

  function tokenize(src) {
    const out = [];
    let i = 0;
    const s = String(src);
    while (i < s.length) {
      const c = s[i];
      if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        if (s[j] === 'e' || s[j] === 'E') {
          let k = j + 1;
          if (s[k] === '+' || s[k] === '-') k++;
          if (/[0-9]/.test(s[k] || '')) {
            while (k < s.length && /[0-9]/.test(s[k])) k++;
            j = k;
          }
        }
        const num = parseFloat(s.slice(i, j));
        if (isNaN(num)) throw new Error('数字格式错误：' + s.slice(i, j));
        out.push({ t: 'num', v: num });
        i = j;
        continue;
      }
      if (/[A-Za-z\u0370-\u03ff]/.test(c)) {
        let j = i;
        while (j < s.length && /[A-Za-z0-9_\u0370-\u03ff]/.test(s[j])) j++;
        out.push({ t: 'id', v: s.slice(i, j) });
        i = j;
        continue;
      }
      if ('+-*/^(),'.includes(c)) {
        out.push({ t: c });
        i++;
        continue;
      }
      throw new Error('无法识别的字符「' + c + '」');
    }

    // 插入隐式乘法：2x、3(x)、x(、)(、)x、2pi
    const res = [];
    for (let k = 0; k < out.length; k++) {
      const cur = out[k], prev = out[k - 1];
      if (prev) {
        const prevEnds = prev.t === 'num' || prev.t === ')' ||
          (prev.t === 'id' && !(prev.v in FUNCS));
        const curStarts = cur.t === 'num' || cur.t === '(' ||
          (cur.t === 'id');
        // 函数名后接 ( 是调用，不插乘号
        const isFnCall = prev.t === 'id' && (prev.v in FUNCS) && cur.t === '(';
        if (prevEnds && curStarts && !isFnCall) res.push({ t: '*' });
      }
      res.push(cur);
    }
    return res;
  }

  function parse(src) {
    const toks = tokenize(src);
    let p = 0;

    function peek() { return toks[p]; }
    function eat(t) { if (toks[p] && toks[p].t === t) { p++; return true; } return false; }

    function parseExpr() {
      let node = parseTerm();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        const op = toks[p++].t;
        node = { k: 'bin', op, a: node, b: parseTerm() };
      }
      return node;
    }

    function parseTerm() {
      let node = parseUnary();
      while (peek() && (peek().t === '*' || peek().t === '/')) {
        const op = toks[p++].t;
        node = { k: 'bin', op, a: node, b: parseUnary() };
      }
      return node;
    }

    function parseUnary() {
      if (peek() && peek().t === '-') { p++; return { k: 'neg', a: parseUnary() }; }
      if (peek() && peek().t === '+') { p++; return parseUnary(); }
      return parsePower();
    }

    function parsePower() {
      const base = parsePrimary();
      if (peek() && peek().t === '^') {
        p++;
        return { k: 'bin', op: '^', a: base, b: parseUnary() };
      }
      return base;
    }

    function parsePrimary() {
      const tk = peek();
      if (!tk) throw new Error('表达式不完整');
      if (tk.t === 'num') { p++; return { k: 'num', v: tk.v }; }
      if (tk.t === '(') {
        p++;
        const inner = parseExpr();
        if (!eat(')')) throw new Error('缺少右括号');
        return inner;
      }
      if (tk.t === 'id') {
        p++;
        const name = tk.v;
        if (peek() && peek().t === '(') {
          if (!(name in FUNCS)) throw new Error('未知函数「' + name + '」');
          p++;
          const arg = parseExpr();
          if (!eat(')')) throw new Error('缺少右括号');
          return { k: 'fn', name, a: arg };
        }
        if (name in CONSTS) return { k: 'num', v: CONSTS[name] };
        if (name === 'x' || name === 'y' || name === 't' || name === 'a' || name === 'b' || name === 'n') {
          return { k: 'var', name };
        }
        if (name in FUNCS) throw new Error('函数「' + name + '」后需要括号');
        throw new Error('未知标识符「' + name + '」');
      }
      throw new Error('无法解析的记号「' + tk.t + '」');
    }

    const ast = parseExpr();
    if (p < toks.length) throw new Error('表达式尾部有多余内容');
    return ast;
  }

  function evalNode(node, scope) {
    switch (node.k) {
      case 'num': return node.v;
      case 'var': {
        const v = scope[node.name];
        return v === undefined ? NaN : v;
      }
      case 'neg': return -evalNode(node.a, scope);
      case 'fn': return FUNCS[node.name](evalNode(node.a, scope));
      case 'bin': {
        const a = evalNode(node.a, scope), b = evalNode(node.b, scope);
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '^': return Math.pow(a, b);
        }
      }
    }
    return NaN;
  }

  /* 编译：返回 { f(x, extra), ast } */
  function compile(src) {
    const ast = parse(src);
    const f = (x, extra) => {
      const scope = Object.assign({ x, t: x }, extra || {});
      try { return evalNode(ast, scope); } catch (e) { return NaN; }
    };
    return { ast, f };
  }

  /* 数值工具 */

  function deriv(f, x, h) {
    h = h || 1e-5;
    const a = f(x + h), b = f(x - h);
    return (a - b) / (2 * h);
  }

  function deriv2(f, x, h) {
    h = h || 1e-4;
    return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
  }

  /* 自适应 Simpson 数值积分 */
  function integrate(f, a, b, eps) {
    eps = eps || 1e-8;
    function simpson(x0, x1) {
      const m = (x0 + x1) / 2;
      return (x1 - x0) / 6 * (f(x0) + 4 * f(m) + f(x1));
    }
    function rec(x0, x1, whole, depth) {
      const m = (x0 + x1) / 2;
      const left = simpson(x0, m), right = simpson(m, x1);
      if (depth <= 0 || Math.abs(left + right - whole) < 15 * eps) {
        return left + right + (left + right - whole) / 15;
      }
      return rec(x0, m, left, depth - 1) + rec(m, x1, right, depth - 1);
    }
    if (!isFinite(a) || !isFinite(b)) return NaN;
    const base = rec(a, b, simpson(a, b), 20);
    if (isFinite(base)) return base;

    // 退化情形：函数在网格点上无定义（如 x^2sin(1/x) 在 0 处）时改用中点法，
    // 中点不落在端点上，可绕开可去奇点
    const n = 2000, h = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = f(a + (i + 0.5) * h);
      if (!isFinite(v)) return NaN;
      sum += v;
    }
    return sum * h;
  }

  /* 在 [a,b] 上扫描 f 的变号点，返回近似根 */
  function scanRoots(f, a, b, n) {
    n = n || 600;
    const roots = [];
    let px = a, pv = f(a);
    for (let i = 1; i <= n; i++) {
      const x = a + (b - a) * i / n;
      const v = f(x);
      if (isFinite(pv) && isFinite(v)) {
        if (pv === 0) { roots.push(px); }
        else if (pv * v < 0) {
          // 二分细化
          let lo = px, hi = x, flo = pv;
          for (let k = 0; k < 60; k++) {
            const mid = (lo + hi) / 2;
            const fm = f(mid);
            if (!isFinite(fm)) break;
            if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
          }
          roots.push((lo + hi) / 2);
        }
      }
      px = x; pv = v;
    }
    // 去重
    const out = [];
    roots.forEach(r => { if (!out.some(o => Math.abs(o - r) < 1e-6)) out.push(r); });
    return out;
  }

  /* 数值格式化 */
  function fmt(v, digits) {
    if (v === null || v === undefined) return '—';
    if (typeof v !== 'number') return String(v);
    if (Number.isNaN(v)) return '未定义';
    if (!isFinite(v)) return v > 0 ? '+∞' : '−∞';
    if (v === 0) return '0';
    const av = Math.abs(v);
    if (av < 1e-4 || av >= 1e6) return v.toExponential(3).replace('e', '×10^');
    const d = digits === undefined ? 6 : digits;
    let s = v.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  return { compile, parse, deriv, deriv2, integrate, scanRoots, fmt, FUNCS };
})();
