(function () {
  var canvas = document.getElementById('firefly-canvas');
  var ctx    = canvas.getContext('2d');
  var dpr    = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var flies  = [];
  var pointer = { x: 0, y: 0, active: false };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Warm-white & soft-pastel palette (warm dominant)
  var PALETTE = [
    [255, 236, 188], [255, 226, 160], [255, 244, 214],   // warm whites / amber
    [255, 236, 188], [255, 226, 160],                     // (weighted heavier)
    [196, 169, 228],                                      // lilac
    [156, 196, 232],                                      // blue
    [168, 216, 188],                                      // sage
    [230, 169, 204]                                       // pink
  ];

  function count() {
    if (window.innerWidth < 480) return 22;
    if (window.innerWidth < 768) return 34;
    return 52;
  }

  // ---- Fly --------------------------------------------------------

  function Fly(init) { this.reset(init); }

  Fly.prototype.reset = function (init) {
    this.x = Math.random() * W;
    // bias spawn toward lower half so density thins as they rise
    this.y = init
      ? H * (1 - Math.pow(Math.random(), 1.7))
      : H + 20 + Math.random() * 40;
    this.vy     = -(0.20 + Math.random() * 0.5);   // gentle upward drift
    this.vx     = (Math.random() - 0.5) * 0.16;
    this.phase  = Math.random() * Math.PI * 2;
    this.driftF = 0.008 + Math.random() * 0.018;   // sway frequency
    this.driftA = 0.5   + Math.random() * 1.4;     // sway amplitude
    this.size   = 1.1   + Math.random() * 2.2;
    this.glow   = this.size * (7 + Math.random() * 9);
    this.baseOp = 0.4   + Math.random() * 0.55;
    this.opacity = 0;
    this.blinkP = Math.random() * Math.PI * 2;
    this.blinkS = 0.02  + Math.random() * 0.05;    // blink speed
    this.life   = 0;
    this.curious = 0;
    this.flash  = 0;
    var c = PALETTE[(Math.random() * PALETTE.length) | 0];
    this.r = c[0]; this.g = c[1]; this.b = c[2];
  };

  Fly.prototype.update = function () {
    this.life++;
    var fadeIn     = Math.min(1, this.life / 55);
    // dim as they climb (ethereal thinning)
    var yr         = this.y / H;
    var heightFade = Math.pow(Math.max(0, Math.min(1, yr * 1.12)), 0.9);
    var blink      = 0.6 + 0.4 * Math.sin(this.blinkP + this.life * this.blinkS);
    this.opacity   = this.baseOp * fadeIn * heightFade * blink;

    // curious: drift toward pointer, brighten when close
    if (pointer.active) {
      var pdx = pointer.x - this.x, pdy = pointer.y - this.y;
      var pd  = Math.sqrt(pdx * pdx + pdy * pdy);
      var R   = 150;
      if (pd < R) {
        var k = 1 - pd / R;
        this.x += (pdx / (pd || 1)) * k * 0.55;
        this.y += (pdy / (pd || 1)) * k * 0.55;
        if (k > this.curious) this.curious = k;
      }
    }
    if (this.curious > 0.001) {
      this.opacity  = Math.min(1, this.opacity * (1 + this.curious * 1.1));
      this.curious *= 0.93;
    }

    // flash (from clicks)
    if (this.flash > 0.001) {
      this.opacity  = Math.min(1, this.opacity + this.flash * 0.7);
      this.flash   *= 0.95;
    }

    this.x += this.vx + Math.sin(this.phase + this.life * this.driftF) * this.driftA * 0.1;
    this.y += this.vy;
    if (this.y < -30) this.reset(false);  // recycle off the top
  };

  Fly.prototype.draw = function () {
    if (this.opacity < 0.01) return;
    var x = this.x, y = this.y, r = this.r, g = this.g, b = this.b, op = this.opacity;

    // outer glow
    var og = ctx.createRadialGradient(x, y, 0, x, y, this.glow);
    og.addColorStop(0,    'rgba(' + r + ',' + g + ',' + b + ',' + (op * 0.6)  + ')');
    og.addColorStop(0.45, 'rgba(' + r + ',' + g + ',' + b + ',' + (op * 0.16) + ')');
    og.addColorStop(1,    'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.beginPath();
    ctx.arc(x, y, this.glow, 0, Math.PI * 2);
    ctx.fillStyle = og;
    ctx.fill();

    // warm-white core
    var cg = ctx.createRadialGradient(x, y, 0, x, y, this.size * 2);
    cg.addColorStop(0,   'rgba(255,250,240,' + Math.min(1, op * 1.5) + ')');
    cg.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + op + ')');
    cg.addColorStop(1,   'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.beginPath();
    ctx.arc(x, y, this.size * 2, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();
  };

  // ---- resize / loop ----------------------------------------------

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flies = [];
    var n = count();
    for (var i = 0; i < n; i++) flies.push(new Fly(true));
  }

  var raf = null;

  function loop() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) { flies[i].update(); flies[i].draw(); }
    ctx.globalCompositeOperation = 'source-over';
    raf = window.requestAnimationFrame(loop);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) {
      flies[i].opacity = flies[i].baseOp * 0.85;
      flies[i].draw();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- pointer ----------------------------------------------------
  // <!> Bonjourr mounts this inside a `pointer-events: none` iframe (a
  // <!> background layer must never intercept clicks meant for the
  // <!> interface above it), so these pointer/click/keydown listeners are
  // <!> effectively inert there -- kept as-is anyway so the file still
  // <!> behaves identically if ever opened standalone.

  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }, { passive: true });

  window.addEventListener('pointerout', function (e) {
    if (!e.relatedTarget) pointer.active = false;
  });

  window.addEventListener('blur', function () { pointer.active = false; });

  // ---- release (click) --------------------------------------------

  function pickDim(n) {
    return flies
      .slice()
      .sort(function (a, b) { return a.opacity - b.opacity; })
      .slice(0, n);
  }

  function release(opts) {
    opts = opts || {};
    var n = Math.min(opts.count || 6, flies.length);
    pickDim(n).forEach(function (f) {
      if (opts.x != null) {
        f.x  = opts.x + (Math.random() - 0.5) * 26;
        f.y  = opts.y + (Math.random() - 0.5) * 18;
        f.vy = -(0.5  + Math.random() * 0.7);
        f.vx = (Math.random() - 0.5) * 0.6;
        f.size  = 1.5 + Math.random() * 1.6;
        f.flash = 1.1;
      } else {
        f.x  = Math.random() * W;
        f.y  = H * 0.62 + Math.random() * H * 0.38;
        f.vy = -(0.4  + Math.random() * 0.7);
        f.vx = (Math.random() - 0.5) * 0.5;
        f.size  = 1.5 + Math.random() * 1.6;
        f.flash = 1.1;
      }
      f.glow    = f.size * (9 + Math.random() * 8);
      f.life    = 60;
      f.baseOp  = 0.8 + Math.random() * 0.2;
      f.curious = 0;
    });
    if (reduceMotion) drawStatic();
  }

  window.addEventListener('click', function (e) {
    release({ x: e.clientX, y: e.clientY, count: 6 });
  });

  // keyboard easter egg: type "firefly" anywhere to burst
  var seq = '';
  window.addEventListener('keydown', function (e) {
    seq = (seq + e.key).slice(-7);
    if (/firefly$/.test(seq)) release({ count: 12 });
  });

  // ---- init -------------------------------------------------------

  resize();

  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (raf) window.cancelAnimationFrame(raf);
      resize();
      if (reduceMotion) drawStatic(); else loop();
    }, 180);
  }, { passive: true });

  if (reduceMotion) drawStatic(); else loop();

})();
