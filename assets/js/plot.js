/* ============================================================
   plot.js · Canvas 二维绘图引擎
   自适应坐标轴、网格、折线断点、交互平移缩放
   ============================================================ */

window.Plotter = (function () {

  const COL = {
    gridMinor: '#F1EEE5',
    gridMajor: '#E4E0D4',
    axis: '#B4B0A6',
    text: '#8B877D',
    curve: '#1D3B63',
    curve2: '#A4382B',
    accent: '#2E5580'
  };

  function niceStep(raw) {
    const exp = Math.floor(Math.log10(raw));
    const f = raw / Math.pow(10, exp);
    let m;
    if (f <= 1) m = 1; else if (f <= 2) m = 2; else if (f <= 5) m = 5; else m = 10;
    return m * Math.pow(10, exp);
  }

  function tickLabel(v, step) {
    if (Math.abs(v) < step * 1e-6) return '0';
    const d = Math.max(0, -Math.floor(Math.log10(step)));
    let s = v.toFixed(Math.min(d + 1, 8));
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  class Plotter {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.xmin = -6; this.xmax = 6;
      this.ymin = -3; this.ymax = 3;
      this.home = { xmin: -6, xmax: 6, ymin: -3, ymax: 3 };
      this.cursorCb = null;
      this._bindDrag();
      this._bindWheel();
      this._bindTouch();
      this.resize();
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    X(x) { return (x - this.xmin) / (this.xmax - this.xmin) * this.w; }
    Y(y) { return this.h - (y - this.ymin) / (this.ymax - this.ymin) * this.h; }
    invX(px) { return this.xmin + px / this.w * (this.xmax - this.xmin); }
    invY(py) { return this.ymin + (this.h - py) / this.h * (this.ymax - this.ymin); }

    setRange(xmin, xmax, ymin, ymax) {
      this.xmin = xmin; this.xmax = xmax;
      this.ymin = ymin; this.ymax = ymax;
    }

    setHome() { this.home = { xmin: this.xmin, xmax: this.xmax, ymin: this.ymin, ymax: this.ymax }; }
    goHome() { const h = this.home; this.setRange(h.xmin, h.xmax, h.ymin, h.ymax); }

    /* 依据函数在区间上的取值自动确定 y 范围 */
    autoRangeY(f, quantile) {
      const N = 400;
      const vals = [];
      for (let i = 0; i <= N; i++) {
        const x = this.xmin + (this.xmax - this.xmin) * i / N;
        const v = f(x);
        if (isFinite(v)) vals.push(v);
      }
      if (!vals.length) { this.setRange(this.xmin, this.xmax, -3, 3); return; }
      vals.sort((a, b) => a - b);
      const q = quantile === undefined ? 0.97 : quantile;
      const lo = vals[Math.floor((1 - q) / 2 * vals.length)];
      const hi = vals[Math.floor((1 + q) / 2 * vals.length)];
      let span = Math.max(Math.abs(hi - lo), 1e-6);
      const pad = span * 0.16;
      let y0 = lo - pad, y1 = hi + pad;
      if (Math.abs(y1 - y0) < 1e-9) { y0 -= 1; y1 += 1; }
      this.setRange(this.xmin, this.xmax, y0, y1);
    }

    clear() {
      const c = this.ctx;
      c.clearRect(0, 0, this.w, this.h);
      c.fillStyle = '#FFFFFF';
      c.fillRect(0, 0, this.w, this.h);
    }

    grid(showMinor) {
      const c = this.ctx;
      const sx = niceStep((this.xmax - this.xmin) / 9);
      const sy = niceStep((this.ymax - this.ymin) / 6);
      c.save();
      c.lineWidth = 1;

      if (showMinor) {
        c.strokeStyle = COL.gridMinor;
        c.beginPath();
        for (let x = Math.ceil(this.xmin / (sx / 2)) * (sx / 2); x <= this.xmax; x += sx / 2) {
          const px = Math.round(this.X(x)) + .5;
          c.moveTo(px, 0); c.lineTo(px, this.h);
        }
        for (let y = Math.ceil(this.ymin / (sy / 2)) * (sy / 2); y <= this.ymax; y += sy / 2) {
          const py = Math.round(this.Y(y)) + .5;
          c.moveTo(0, py); c.lineTo(this.w, py);
        }
        c.stroke();
      }

      c.strokeStyle = COL.gridMajor;
      c.beginPath();
      for (let x = Math.ceil(this.xmin / sx) * sx; x <= this.xmax; x += sx) {
        const px = Math.round(this.X(x)) + .5;
        c.moveTo(px, 0); c.lineTo(px, this.h);
      }
      for (let y = Math.ceil(this.ymin / sy) * sy; y <= this.ymax; y += sy) {
        const py = Math.round(this.Y(y)) + .5;
        c.moveTo(0, py); c.lineTo(this.w, py);
      }
      c.stroke();

      // 坐标轴
      const y0 = (this.ymin <= 0 && this.ymax >= 0) ? this.Y(0) : this.h;
      const x0 = (this.xmin <= 0 && this.xmax >= 0) ? this.X(0) : 0;
      c.strokeStyle = COL.axis;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, Math.round(y0) + .5); c.lineTo(this.w, Math.round(y0) + .5);
      c.moveTo(Math.round(x0) + .5, 0); c.lineTo(Math.round(x0) + .5, this.h);
      c.stroke();

      // 刻度数字
      c.fillStyle = COL.text;
      c.font = '10px "Cascadia Mono", Consolas, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'top';
      for (let x = Math.ceil(this.xmin / sx) * sx; x <= this.xmax; x += sx) {
        if (Math.abs(x) < sx * 1e-6) continue;
        const px = this.X(x);
        if (px < 16 || px > this.w - 16) continue;
        let ty = y0 + 4;
        if (ty > this.h - 14) ty = y0 - 14;
        c.fillText(tickLabel(x, sx), px, ty);
      }
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (let y = Math.ceil(this.ymin / sy) * sy; y <= this.ymax; y += sy) {
        if (Math.abs(y) < sy * 1e-6) continue;
        const py = this.Y(y);
        if (py < 12 || py > this.h - 12) continue;
        let tx = x0 - 6;
        if (tx < 26) tx = x0 + 6, c.textAlign = 'left';
        c.fillText(tickLabel(y, sy), tx, py);
        c.textAlign = 'right';
      }
      c.restore();
    }

    curve(f, color, width, dash) {
      const c = this.ctx;
      c.save();
      c.beginPath();
      c.rect(0, 0, this.w, this.h);
      c.clip();
      c.strokeStyle = color || COL.curve;
      c.lineWidth = width || 1.9;
      c.lineJoin = 'round';
      if (dash) c.setLineDash(dash);

      const N = Math.max(this.w * 2, 800);
      let started = false;
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        const px = i / N * this.w;
        const x = this.invX(px);
        const y = f(x);
        if (!isFinite(y) || Math.abs(y) > 1e7) {
          started = false;
          continue;
        }
        const py = this.Y(y);
        if (!started) { c.moveTo(px, py); started = true; }
        else c.lineTo(px, py);
      }
      c.stroke();
      c.restore();
    }

    line(x1, y1, x2, y2, color, width, dash) {
      const c = this.ctx;
      c.save();
      c.strokeStyle = color || COL.curve2;
      c.lineWidth = width || 1.4;
      if (dash) c.setLineDash(dash);
      c.beginPath();
      c.moveTo(this.X(x1), this.Y(y1));
      c.lineTo(this.X(x2), this.Y(y2));
      c.stroke();
      c.restore();
    }

    dot(x, y, color, r, hollow) {
      const c = this.ctx;
      c.save();
      c.beginPath();
      c.arc(this.X(x), this.Y(y), r || 4, 0, Math.PI * 2);
      if (hollow) {
        c.fillStyle = '#fff';
        c.fill();
        c.strokeStyle = color; c.lineWidth = 1.6; c.stroke();
      } else {
        c.fillStyle = color; c.fill();
      }
      c.restore();
    }

    vline(x, color, dash) {
      const c = this.ctx;
      c.save();
      c.strokeStyle = color; c.lineWidth = 1; c.setLineDash(dash || [3, 3]);
      c.beginPath();
      c.moveTo(this.X(x), 0); c.lineTo(this.X(x), this.h);
      c.stroke();
      c.restore();
    }

    label(x, y, text, color, dx, dy) {
      const c = this.ctx;
      c.save();
      c.font = '11px "Cascadia Mono", Consolas, monospace';
      c.fillStyle = color || COL.curve2;
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(text, this.X(x) + (dx || 6), this.Y(y) + (dy || -10));
      c.restore();
    }

    _bindDrag() {
      let dragging = false, lastX = 0, lastY = 0;
      const el = this.canvas;
      el.addEventListener('mousedown', e => {
        dragging = true; lastX = e.offsetX; lastY = e.offsetY;
        el.style.cursor = 'grabbing';
      });
      window.addEventListener('mouseup', () => {
        dragging = false; el.style.cursor = 'crosshair';
      });
      el.addEventListener('mousemove', e => {
        const pxX = this.invX(e.offsetX), pxY = this.invY(e.offsetY);
        if (dragging) {
          const dx = (e.offsetX - lastX) / this.w * (this.xmax - this.xmin);
          const dy = (e.offsetY - lastY) / this.h * (this.ymax - this.ymin);
          this.setRange(this.xmin - dx, this.xmax - dx, this.ymin + dy, this.ymax + dy);
          lastX = e.offsetX; lastY = e.offsetY;
          this.onChange && this.onChange();
        }
        if (this.cursorCb) this.cursorCb(pxX, pxY, e.offsetX, e.offsetY);
      });
      el.addEventListener('mouseleave', () => {
        if (this.cursorCb) this.cursorCb(null);
      });
      el.addEventListener('dblclick', () => { this.goHome(); this.onChange && this.onChange(); });
    }

    _bindWheel() {
      this.canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const k = e.deltaY > 0 ? 1.12 : 1 / 1.12;
        const mx = this.invX(e.offsetX), my = this.invY(e.offsetY);
        this.setRange(
          mx + (this.xmin - mx) * k, mx + (this.xmax - mx) * k,
          my + (this.ymin - my) * k, my + (this.ymax - my) * k
        );
        this.onChange && this.onChange();
      }, { passive: false });
    }

    /* 触屏：单指拖动平移，双指捏合缩放（缩放锚点在双指中点） */
    _bindTouch() {
      const el = this.canvas;
      let mode = 0;              // 0 无手势 / 1 平移 / 2 捏合
      let lastX = 0, lastY = 0;  // 上次触点（画布坐标）
      let lastDist = 0, lastMid = null;

      const pos = t => {
        const r = el.getBoundingClientRect();
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      };

      el.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          mode = 1;
          const p = pos(e.touches[0]);
          lastX = p.x; lastY = p.y;
        } else if (e.touches.length >= 2) {
          mode = 2;
          const a = pos(e.touches[0]), b = pos(e.touches[1]);
          lastDist = Math.hypot(a.x - b.x, a.y - b.y);
          lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        }
      }, { passive: true });

      el.addEventListener('touchmove', e => {
        e.preventDefault();
        if (mode === 1 && e.touches.length === 1) {
          const p = pos(e.touches[0]);
          const dx = (p.x - lastX) / this.w * (this.xmax - this.xmin);
          const dy = (p.y - lastY) / this.h * (this.ymax - this.ymin);
          this.setRange(this.xmin - dx, this.xmax - dx, this.ymin + dy, this.ymax + dy);
          lastX = p.x; lastY = p.y;
          this.onChange && this.onChange();
        } else if (mode === 2 && e.touches.length >= 2) {
          const a = pos(e.touches[0]), b = pos(e.touches[1]);
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          if (lastDist > 0 && d > 0) {
            // 双指张开（d 变大）→ 视野范围缩小 → 放大
            const k = lastDist / d;
            const mx = this.invX(mid.x), my = this.invY(mid.y);
            this.setRange(
              mx + (this.xmin - mx) * k, mx + (this.xmax - mx) * k,
              my + (this.ymin - my) * k, my + (this.ymax - my) * k
            );
            // 双指中点同时移动 → 平移
            if (lastMid) {
              const dx = (mid.x - lastMid.x) / this.w * (this.xmax - this.xmin);
              const dy = (mid.y - lastMid.y) / this.h * (this.ymax - this.ymin);
              this.setRange(this.xmin - dx, this.xmax - dx, this.ymin + dy, this.ymax + dy);
            }
            this.onChange && this.onChange();
          }
          lastDist = d; lastMid = mid;
        }
      }, { passive: false });

      const end = () => { mode = 0; };
      el.addEventListener('touchend', end, { passive: true });
      el.addEventListener('touchcancel', end, { passive: true });
    }

    zoom(k) {
      const mx = (this.xmin + this.xmax) / 2, my = (this.ymin + this.ymax) / 2;
      this.setRange(
        mx + (this.xmin - mx) * k, mx + (this.xmax - mx) * k,
        my + (this.ymin - my) * k, my + (this.ymax - my) * k
      );
      this.onChange && this.onChange();
    }
  }

  return Plotter;
})();
