'use strict';

// ==================== DEVICE CAPABILITY DETECTOR ====================
const Device = (() => {
  const cores = navigator.hardwareConcurrency || 2;
  const mem = navigator.deviceMemory || 1;   // GB (only Chrome)
  const mobile = window.innerWidth < 768;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLow = reduced || cores <= 2 || mem < 2 || (mobile && cores <= 4);
  const isMid = !isLow && (cores <= 4 || mem < 4 || mobile);
  const isHigh = !isLow && !isMid;

  return { isLow, isMid, isHigh, mobile, reduced, cores, mem };
})();

// ==================== FPS THROTTLE HELPER ====================
function createThrottledRAF(fn, targetFPS) {
  const interval = 1000 / targetFPS;
  let last = 0;
  function loop(now) {
    if (now - last >= interval) { last = now; fn(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ==================== MATRIX RAIN ====================
class MatrixRain {
  constructor() {
    // Skip on very low-end or reduced motion
    if (Device.isLow) return;

    this.canvas = document.getElementById('matrix-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.chars = '01アイウエオABCDEF{}[]<>/;:=+-*&'.split('');
    this.fontSize = Device.mobile ? 11 : 13;

    // Mid-end: slower, fewer chars
    this.speed = Device.isMid ? 0.3 : 0.45;
    this.opacity = Device.isMid ? 0.04 : 0.055;

    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    // FPS cap: 24fps on mid, 30fps on high — saves CPU
    const fps = Device.isMid ? 24 : 30;
    createThrottledRAF(() => this.draw(), fps);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.cols = Math.floor(this.canvas.width / this.fontSize);
    this.drops = Array.from({ length: this.cols }, () => Math.random() * -100);
  }

  draw() {
    this.ctx.fillStyle = `rgba(0,0,0,${this.opacity})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = `${this.fontSize}px JetBrains Mono, monospace`;

    for (let i = 0; i < this.drops.length; i++) {
      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      const y = this.drops[i] * this.fontSize;
      this.ctx.fillStyle = `rgba(0,255,65,${Math.random() * 0.3 + 0.06})`;
      this.ctx.fillText(char, i * this.fontSize, y);
      if (y > this.canvas.height && Math.random() > 0.975) this.drops[i] = 0;
      this.drops[i] += this.speed;
    }
  }
}

// ==================== NEURAL NETWORK ====================
class NeuralNetwork {
  constructor() {
    // Completely skip on low-end
    if (Device.isLow) {
      const c = document.getElementById('neural-canvas');
      if (c) c.style.display = 'none';
      return;
    }

    this.canvas = document.getElementById('neural-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.mouse = { x: -9999, y: -9999 };

    this.resize();
    this.spawnNodes();
    this.bindEvents();

    // FPS cap: 30fps on mid, 60fps on high
    const fps = Device.isMid ? 30 : 60;
    createThrottledRAF(() => this.draw(), fps);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawnNodes() {
    // Node density: low on mid, higher on high-end
    const area = window.innerWidth * window.innerHeight;
    const density = Device.isMid ? 28000 : 12000;
    const count = Math.min(Math.floor(area / density), Device.isMid ? 40 : 90);

    const colors = ['#00ff41', '#00f5d4', '#7c5cfc'];
    this.nodes = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * (Device.isMid ? 0.25 : 0.35),
      vy: (Math.random() - 0.5) * (Device.isMid ? 0.25 : 0.35),
      r: Math.random() * 1.5 + 0.8,
      pulse: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }

  bindEvents() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { this.resize(); this.spawnNodes(); }, 300);
    }, { passive: true });

    // Mouse only on non-mobile (saves event overhead)
    if (!Device.mobile) {
      window.addEventListener('mousemove', e => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }, { passive: true });
      window.addEventListener('mouseleave', () => {
        this.mouse.x = -9999; this.mouse.y = -9999;
      });
    } else {
      window.addEventListener('touchmove', e => {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }, { passive: true });
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const maxDist = Device.isMid ? 100 : 120;
    const mouseInf = Device.isMid ? 120 : 160;

    for (const n of this.nodes) {
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += 0.018;

      // Mouse repulsion
      const mdx = n.x - this.mouse.x;
      const mdy = n.y - this.mouse.y;
      const md = Math.hypot(mdx, mdy);
      if (md < mouseInf && md > 0) {
        const force = ((mouseInf - md) / mouseInf) * 0.7;
        n.vx += (mdx / md) * force;
        n.vy += (mdy / md) * force;
      }

      const speed = Math.hypot(n.vx, n.vy);
      if (speed > 1.4) { n.vx *= 1.4 / speed; n.vy *= 1.4 / speed; }

      if (n.x < 0 || n.x > this.canvas.width) n.vx *= -1;
      if (n.y < 0 || n.y > this.canvas.height) n.vy *= -1;
      n.x = Math.max(0, Math.min(this.canvas.width, n.x));
      n.y = Math.max(0, Math.min(this.canvas.height, n.y));

      // Draw node (skip pulse animation on mid for perf)
      const r = Device.isMid ? n.r : n.r * (0.5 + Math.sin(n.pulse) * 0.4);
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      this.ctx.fillStyle = n.color;
      if (Device.isHigh) {
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = n.color;
      }
      this.ctx.fill();
      if (Device.isHigh) this.ctx.shadowBlur = 0;
    }

    // Draw connections
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i], b = this.nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < maxDist) {
          const op = (1 - d / maxDist) * 0.45;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `rgba(0,255,65,${op})`;
          this.ctx.lineWidth = op * 1.2;
          this.ctx.stroke();
        }
      }

      // Mouse lines — high-end only
      if (Device.isHigh) {
        const n = this.nodes[i];
        const md = Math.hypot(n.x - this.mouse.x, n.y - this.mouse.y);
        if (md < mouseInf) {
          const op = (1 - md / mouseInf) * 0.75;
          this.ctx.beginPath();
          this.ctx.moveTo(n.x, n.y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.strokeStyle = `rgba(0,245,212,${op})`;
          this.ctx.lineWidth = op * 2;
          this.ctx.stroke();
        }
      }
    }
  }
}

// ==================== GLITCH TEXT ====================
class GlitchText {
  constructor() {
    if (Device.reduced) return; // respect user preference

    this.target = document.querySelector('.glitch-name');
    if (!this.target) return;
    this.original = this.target.dataset.text || this.target.textContent;
    this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*';
    this.glitching = false;

    // Less frequent on low-end
    const interval = Device.isLow ? 8000 : Device.isMid ? 6000 : 4000;
    setInterval(() => this.triggerGlitch(), interval);
  }

  triggerGlitch() {
    if (this.glitching) return;
    this.glitching = true;
    let iter = 0;
    const iv = setInterval(() => {
      this.target.textContent = this.original
        .split('')
        .map((c, i) => {
          if (i < iter) return c;
          return c === ' ' ? ' ' : this.chars[Math.floor(Math.random() * this.chars.length)];
        })
        .join('');
      if (iter >= this.original.length) {
        clearInterval(iv);
        this.target.textContent = this.original;
        this.glitching = false;
      }
      iter += 0.45;
    }, 28);
  }
}

// ==================== TERMINAL ====================
class HackerTerminal {
  constructor() {
    this.output = document.getElementById('hacker-terminal');
    if (!this.output) return;

    this.queue = [
      { text: 'Initializing portfolio_v5.exe...', color: '#00ff41', delay: 0 },
      { text: '> Loading modules: [████████████] 100%', color: '#00f5d4', delay: 700 },
      { text: '', delay: 1100 },
      { text: '$ whoami', color: '#00ff41', delay: 1300 },
      { text: '  Md Abdullah Ali — Backend Dev / Full Stack Engineer', color: '#e8e8ff', delay: 1900 },
      { text: '  📍 Sandip University — B.Sc Computer Science (2018-2022)', color: '#6e6e9a', delay: 2300 },
      { text: '', delay: 2700 },
      { text: '$ cat experience.log', color: '#00ff41', delay: 2900 },
      { text: '  ▶ Quest Innovative Solutions (Jan 2024 – Dec 2025)', color: '#f7df1e', delay: 3300 },
      { text: '    └─ Backend Dev @ Kochi | Kafka · Docker · K8s · Redis', color: '#00f5d4', delay: 3600 },
      { text: '  ▶ Tech Nova Solutions (Aug 2022 – Nov 2023)', color: '#f7df1e', delay: 4000 },
      { text: '    └─ Full Stack Dev @ Bangalore | Node.js · React · AWS', color: '#00f5d4', delay: 4300 },
      { text: '', delay: 4700 },
      { text: '$ cat tech_stack.config', color: '#00ff41', delay: 4900 },
      { text: '  ┌──────────────────────────────────────┐', color: '#444', delay: 5200 },
      { text: '  │  Node.js / NestJS  ██████████████ 90% │', color: '#68a063', delay: 5400 },
      { text: '  │  React / Next.js   █████████████░ 85% │', color: '#61dafb', delay: 5600 },
      { text: '  │  MongoDB / MySQL   █████████████░ 88% │', color: '#00f5d4', delay: 5800 },
      { text: '  │  Docker / AWS      ████████████░░ 80% │', color: '#ff9900', delay: 6000 },
      { text: '  │  JavaScript / TS   ██████████████ 92% │', color: '#f7df1e', delay: 6200 },
      { text: '  └──────────────────────────────────────┘', color: '#444', delay: 6400 },
      { text: '', delay: 6700 },
      { text: '$ ping world.open --port=opportunities', color: '#00ff41', delay: 6900 },
      { text: '  Reply from world.open: time=1ms TTL=64', color: '#00f5d4', delay: 7300 },
      { text: '  STATUS: ✓ Available — mdabdullah031999@gmail.com', color: '#00ff41', delay: 7700 },
      { text: '', delay: 8000 },
      { text: '$ _', color: '#00ff41', delay: 8200, blink: true },
    ];

    // On low-end: use requestIdleCallback so it doesn't block main thread
    if ('requestIdleCallback' in window && Device.isLow) {
      window.requestIdleCallback(() => this.run());
    } else {
      this.run();
    }
  }

  run() {
    const frag = document.createDocumentFragment();
    this.queue.forEach(item => {
      setTimeout(() => {
        if (!item.text && !item.blink) {
          this.output.appendChild(document.createElement('br')); return;
        }
        const line = document.createElement('div');
        line.className = 'h-line' + (item.blink ? ' blink-cursor' : '');
        line.style.color = item.color || '#00ff41';
        line.textContent = item.text;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
      }, item.delay);
    });
  }
}

// ==================== TYPEWRITER ====================
class TypeWriter {
  constructor() {
    this.el = document.getElementById('heroRole');
    if (!this.el) return;
    this.texts = ['Backend Developer 🖥️', 'Full Stack Engineer 💻', 'Microservices Architect ⚙️', 'Cloud & DevOps Engineer ☁️', 'Open Source Contributor 🌟'];
    this.idx = 0; this.c = 0; this.del = false;
    this.type();
  }

  type() {
    const cur = this.texts[this.idx];
    this.el.textContent = this.del ? cur.substring(0, this.c--) : cur.substring(0, this.c++);
    let d = this.del ? 45 : 85;
    if (!this.del && this.c === cur.length + 1) { d = 2400; this.del = true; }
    else if (this.del && this.c === 0) { this.del = false; this.idx = (this.idx + 1) % this.texts.length; d = 500; }
    setTimeout(() => this.type(), d);
  }
}

// ==================== SCROLL ANIMATIONS (IntersectionObserver) ====================
class ScrollAnimator {
  constructor() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('animated');
          obs.unobserve(e.target); // unobserve after animating — saves memory
        }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-animate]').forEach(el => obs.observe(el));
  }
}

// ==================== COUNTER ====================
class Counter {
  constructor() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { this.animate(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.counter-number, .stat-number, .count-number').forEach(el => obs.observe(el));
  }

  animate(el) {
    const target = parseInt(el.dataset.target);
    const duration = 2000;
    const steps = duration / 16;
    const step = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = Math.floor(cur);
      if (cur >= target) clearInterval(t);
    }, 16);
  }
}

// ==================== SKILL BARS ====================
class SkillBars {
  constructor() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.width = e.target.dataset.width + '%';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('.skill-progress').forEach(b => obs.observe(b));
  }
}

// ==================== 3D TILT (High-end + non-touch only) ====================
class CardTilt {
  constructor() {
    // Skip on low-end & touch devices
    if (Device.isLow || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('.project-card, .contact-card, .timeline-content, .counter-item, .service-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        card.style.transform = `perspective(900px) rotateX(${-dy * 7}deg) rotateY(${dx * 7}deg) translateZ(14px)`;
      }, { passive: true });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
      });
      card.addEventListener('mouseenter', () => { card.style.transition = 'none'; });
    });
  }
}

// ==================== ABOUT IMAGE TILT ====================
class AboutTilt {
  constructor() {
    if (Device.isLow || window.matchMedia('(hover: none)').matches) return;
    const card = document.querySelector('.about-image-card');
    if (!card) return;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      card.style.transform = `rotateY(${dx * 12}deg) rotateX(${-dy * 9}deg) translateZ(24px)`;
    }, { passive: true });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1)';
    });
  }
}

// ==================== NAVBAR ====================
class Navbar {
  constructor() {
    this.nav = document.getElementById('navbar');
    this.toggle = document.getElementById('navToggle');
    this.menu = document.getElementById('navMenu');
    this.links = document.querySelectorAll('.nav-link');
    this.ticking = false;
    this.init();
  }

  init() {
    // Use passive scroll + rAF throttle for smooth performance
    window.addEventListener('scroll', () => {
      if (!this.ticking) {
        requestAnimationFrame(() => {
          this.nav.classList.toggle('scrolled', window.scrollY > 50);
          this.updateActive();
          this.ticking = false;
        });
        this.ticking = true;
      }
    }, { passive: true });

    this.toggle?.addEventListener('click', () => {
      this.toggle.classList.toggle('active');
      this.menu.classList.toggle('open');
      document.body.style.overflow = this.menu.classList.contains('open') ? 'hidden' : '';
    });

    this.links.forEach(l => l.addEventListener('click', () => {
      this.toggle?.classList.remove('active');
      this.menu?.classList.remove('open');
      document.body.style.overflow = '';
    }));

    document.addEventListener('click', e => {
      if (this.menu?.classList.contains('open') &&
        !this.menu.contains(e.target) && !this.toggle?.contains(e.target)) {
        this.toggle?.classList.remove('active');
        this.menu?.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  updateActive() {
    let cur = '';
    document.querySelectorAll('section[id]').forEach(s => {
      if (window.scrollY >= s.offsetTop - 220) cur = s.id;
    });
    this.links.forEach(l => l.classList.toggle('active', l.dataset.section === cur));
  }
}

// ==================== GITHUB GRAPH ====================
class GithubGraph {
  constructor() {
    const c = document.getElementById('github-graph');
    if (!c) return;

    // Use DocumentFragment for single DOM write
    const frag = document.createDocumentFragment();
    const weeks = Device.mobile ? 18 : 26;

    for (let w = 0; w < weeks; w++) {
      const col = document.createElement('div');
      col.className = 'gh-col';
      for (let d = 0; d < 7; d++) {
        const cell = document.createElement('div');
        cell.className = 'gh-cell';
        const r = Math.random();
        cell.dataset.level = r > 0.94 ? 4 : r > 0.84 ? 3 : r > 0.70 ? 2 : r > 0.52 ? 1 : 0;
        col.appendChild(cell);
      }
      frag.appendChild(col);
    }
    c.appendChild(frag); // single reflow
  }
}

// ==================== CUSTOM CURSOR ====================
class CursorGlow {
  constructor() {
    this.glow = document.getElementById('cursorGlow');
    this.dot = document.getElementById('cursorDot');

    // Disable on touch/mobile
    if (!this.glow || Device.mobile || window.matchMedia('(hover: none)').matches) {
      this.glow?.remove();
      this.dot?.remove();
      document.body.style.cursor = 'auto';
      return;
    }

    this.gx = 0; this.gy = 0;
    this.gax = 0; this.gay = 0;
    this.dx = 0; this.dy = 0;

    window.addEventListener('mousemove', e => {
      this.dx = e.clientX; this.dy = e.clientY;
      this.gx = e.clientX; this.gy = e.clientY;
    }, { passive: true });

    this.loop();
  }

  loop() {
    if (this.dot) {
      this.dot.style.left = this.dx + 'px';
      this.dot.style.top = this.dy + 'px';
    }
    // Laggy glow — skip on mid to save GPU
    if (this.glow) {
      this.gax += (this.gx - this.gax) * (Device.isMid ? 0.18 : 0.12);
      this.gay += (this.gy - this.gay) * (Device.isMid ? 0.18 : 0.12);
      this.glow.style.left = this.gax + 'px';
      this.glow.style.top = this.gay + 'px';
    }
    requestAnimationFrame(() => this.loop());
  }
}

// ==================== PROJECT FILTER ====================
class ProjectFilter {
  constructor() {
    this.btns = document.querySelectorAll('.filter-btn');
    this.cards = document.querySelectorAll('.project-card');
    if (!this.btns.length) return;

    this.btns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;

        this.cards.forEach(card => {
          const show = filter === 'all' || card.dataset.category === filter;
          card.classList.toggle('hidden', !show);
        });
      });
    });
  }
}

// ==================== BACK TO TOP ====================
class BackToTop {
  constructor() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          btn.classList.toggle('visible', window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
}

// ==================== SCANLINES ====================
class ScanlineEffect {
  constructor() {
    if (Device.isLow) return; // skip on low-end
    const scanlines = document.querySelector('.scanlines');
    if (!scanlines) return;
    setInterval(() => {
      if (Math.random() > 0.96) {
        scanlines.style.opacity = '0.1';
        setTimeout(() => { scanlines.style.opacity = '0.04'; }, 70);
      }
    }, 2400);
  }
}

// ==================== CV DOWNLOAD BTN ====================
function initDownloadBtn() {
  const btn = document.getElementById('downloadCvBtn');
  if (!btn) return;
  btn.addEventListener('click', e => {
    e.preventDefault();
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;Preparing...';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-check"></i>&nbsp;CV Ready Soon!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }, 1200);
  });
}

// ==================== PERFORMANCE OBSERVER (logs LCP) ====================
function observeWebVitals() {
  if (!('PerformanceObserver' in window)) return;
  try {
    const obs = new PerformanceObserver(list => {
      list.getEntries().forEach(e => {
        if (e.entryType === 'largest-contentful-paint') {
          console.log(`%c⚡ LCP: ${Math.round(e.startTime)}ms`, 'color:#00f5d4;font-family:monospace;');
        }
      });
    });
    obs.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) { }
}

// ==================== INIT (staggered to avoid main-thread jam) ====================
document.addEventListener('DOMContentLoaded', () => {
  // Critical — run immediately
  new Navbar();
  new TypeWriter();
  new HackerTerminal();
  new BackToTop();
  new ProjectFilter();
  new CursorGlow();

  // Slightly deferred — after first paint
  setTimeout(() => {
    new MatrixRain();
    new NeuralNetwork();
    new GlitchText();
  }, 200);

  // Non-critical — idle time
  const idle = 'requestIdleCallback' in window ? requestIdleCallback : fn => setTimeout(fn, 500);
  idle(() => {
    new ScrollAnimator();
    new Counter();
    new SkillBars();
    new CardTilt();
    new AboutTilt();
    new GithubGraph();
    new ScanlineEffect();
    initDownloadBtn();
    observeWebVitals();
  });

  // Console branding
  if (Device.isHigh) {
    console.log('%c  ▄ █ █ █   ▄   ▄▄   █ █ █ █ ▄ █ █ █ ', 'color:#00ff41;font-family:monospace;font-size:10px;');
    console.log('%c  Md Abdullah Ali — Backend / Full Stack Dev', 'color:#00f5d4;font-family:monospace;font-size:11px;font-weight:bold;');
    console.log('%c  📧 mdabdullah031999@gmail.com', 'color:#7c5cfc;font-family:monospace;font-size:10px;');
    console.log('%c  📱 +966 573894307', 'color:#00ff41;font-family:monospace;font-size:10px;');
    console.log(`%c  🖥️  Device tier: ${Device.isHigh ? 'HIGH' : Device.isMid ? 'MID' : 'LOW'} (${Device.cores} cores, ${Device.mem}GB RAM)`,
      'color:#6e6e9a;font-family:monospace;font-size:9px;');
  }
});
