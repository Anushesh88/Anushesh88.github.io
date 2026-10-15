(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------------- Neural-network particle field ---------------- */
  function initNetwork() {
    const canvas = $("#net");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const hero = canvas.parentElement;
    const mouse = { x: -9999, y: -9999 };
    let w, h, dpr, nodes = [], running = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.floor((w * h) / 14000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
        hue: Math.random() < 0.5 ? 188 : 275,
      }));
    }

    const LINK = 130;
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        // gentle pull toward the cursor
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 200 * 200) {
          n.vx += dx * 0.00004;
          n.vy += dy * 0.00004;
        }
        n.vx *= 0.995; n.vy *= 0.995;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 65%, ${(1 - d / LINK) * 0.28})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const md = Math.hypot(mouse.x - a.x, mouse.y - a.y);
        if (md < 180) {
          ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - md / 180) * 0.55})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `hsla(${n.hue}, 95%, 70%, 0.9)`;
        ctx.shadowColor = `hsla(${n.hue}, 95%, 60%, 1)`;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

    if (reduceMotion) { running = false; frame(); return; }
    // pause when hero is off-screen
    new IntersectionObserver(([e]) => {
      const was = running;
      running = e.isIntersecting;
      if (running && !was) requestAnimationFrame(frame);
    }).observe(hero);
    requestAnimationFrame(frame);
  }

  /* ---------------- Name scramble ---------------- */
  function scramble(el) {
    const target = el.dataset.scramble;
    if (!target || reduceMotion) return;
    const glyphs = "!<>-_\\/[]{}=+*^?#01ABCDEFXYZ";
    // a quick left-to-right glitch wave, time-based so it always finishes in under a second
    const queue = [...target].map((ch, i) => {
      const start = i * 35 + Math.random() * 40;
      return { ch, start, end: start + 140 + Math.random() * 160 };
    });
    let t0;
    function tick(now) {
      if (t0 === undefined) t0 = now;
      const t = now - t0;
      let out = "", done = 0;
      for (const q of queue) {
        if (t >= q.end || q.ch === " ") { out += q.ch; done++; }
        else if (t >= q.start) out += `<span class="glitch-char">${glyphs[Math.floor(Math.random() * glyphs.length)]}</span>`;
        else out += q.ch;
      }
      el.innerHTML = out;
      if (done < queue.length) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    setTimeout(() => requestAnimationFrame(tick), 250);
  }

  /* ---------------- Typed role rotator ---------------- */
  function typed() {
    const el = $("#typed");
    if (!el) return;
    const words = ["computer vision models", "RAG pipelines", "recommender engines", "multimodal models", "scalable backends"];
    if (reduceMotion) { el.textContent = words[0]; return; }
    let w = 0, i = words[0].length, deleting = true;
    function step() {
      const word = words[w];
      el.textContent = word.slice(0, i);
      let delay = deleting ? 45 : 85;
      if (deleting) {
        i--;
        if (i < 0) { deleting = false; w = (w + 1) % words.length; i = 0; delay = 300; }
      } else {
        i++;
        if (i > words[w].length) { deleting = true; i = words[w].length; delay = 1800; }
      }
      setTimeout(step, delay);
    }
    setTimeout(step, 1800);
  }

  /* ---------------- Reveal on scroll + counters ---------------- */
  function reveals() {
    // stagger siblings
    const groups = new Map();
    $$(".reveal").forEach((el) => {
      const p = el.parentElement;
      const idx = groups.get(p) || 0;
      el.style.setProperty("--d", `${Math.min(idx * 0.08, 0.5)}s`);
      groups.set(p, idx + 1);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        // drop the stagger delay once revealed so hover/tilt transitions feel instant
        setTimeout(() => e.target.style.setProperty("--d", "0s"), 1500);
        $$("[data-count]", e.target).concat(e.target.matches("[data-count]") ? [e.target] : []).forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = end.toFixed(dec) + suffix; return; }
    const dur = 1600, t0 = performance.now();
    (function tick(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (end * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------------- Nav: scroll state, hide, active link, progress ---------------- */
  function nav() {
    const navEl = $("#nav");
    const bar = $(".progress");
    const links = $$(".nav-links a");
    const sections = links.map((a) => $(a.getAttribute("href")));
    let lastY = 0;

    function onScroll() {
      const y = window.scrollY;
      navEl.classList.toggle("scrolled", y > 30);
      navEl.classList.toggle("hidden", y > lastY && y > 400 && !navEl.classList.contains("open"));
      lastY = y;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      let current = -1;
      sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) current = i; });
      links.forEach((a, i) => a.classList.toggle("active", i === current));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const burger = $("#burger");
    burger.addEventListener("click", () => {
      const open = !navEl.classList.contains("open");
      navEl.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    links.forEach((a) => a.addEventListener("click", () => {
      navEl.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }));
  }

  /* ---------------- Custom cursor ---------------- */
  function cursor() {
    if (!finePointer || reduceMotion) return;
    const dot = $(".cursor-dot"), ring = $(".cursor-ring");
    let mx = 0, my = 0, rx = 0, ry = 0;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add("has-cursor");
      dot.style.transform = `translate(${mx - 3}px, ${my - 3}px)`;
    });
    document.addEventListener("pointerleave", () => document.body.classList.remove("has-cursor"));
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      const size = ring.offsetWidth;
      ring.style.transform = `translate(${rx - size / 2}px, ${ry - size / 2}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => {
      ring.classList.toggle("hover", !!e.target.closest("a, button, .project"));
    });
  }

  /* ---------------- Card spotlight + tilt ---------------- */
  function cards() {
    $$(".glow-card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty("--mx", `${x}px`);
        card.style.setProperty("--my", `${y}px`);
        if (card.classList.contains("tilt") && finePointer && !reduceMotion) {
          const rx = ((y / r.height) - 0.5) * -6;
          const ry = ((x / r.width) - 0.5) * 6;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        }
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  function magnetic() {
    if (!finePointer || reduceMotion) return;
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------------- Project filters ---------------- */
  function filters() {
    const buttons = $$(".filter");
    const items = $$("#projectGrid .project");
    buttons.forEach((b) => b.addEventListener("click", () => {
      const f = b.dataset.filter;
      buttons.forEach((x) => {
        const on = x === b;
        x.classList.toggle("active", on);
        x.setAttribute("aria-selected", String(on));
      });
      items.forEach((it) => {
        const show = f === "all" || it.dataset.tags.split(" ").includes(f);
        it.classList.toggle("is-hidden", !show);
        // a wide card alone in a filtered view looks odd; let it span normally
        it.classList.toggle("span-2", show && f === "all" && it.dataset.wide === "1");
      });
    }));
    items.forEach((it) => { if (it.classList.contains("span-2")) it.dataset.wide = "1"; });
  }

  /* ---------------- Copy email ---------------- */
  function copyEmail() {
    const toast = $("#toast");
    $$(".copy-email").forEach((btn) => btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.email);
        toast.textContent = "Email copied to clipboard ✓";
      } catch {
        toast.textContent = btn.dataset.email;
      }
      toast.classList.add("show");
      clearTimeout(copyEmail.t);
      copyEmail.t = setTimeout(() => toast.classList.remove("show"), 2200);
    }));
  }

  /* ---------------- Spinning ASCII torus (a nod to the ASCII reels project) ---------------- */
  function asciiDonut() {
    const pre = $("#asciiArt");
    if (!pre) return;
    const W = 56, H = 22, chars = ".,-~:;=!*#$@";
    let A = 1, B = 1, visible = false;
    function render() {
      const out = new Array(W * H).fill(" ");
      const z = new Array(W * H).fill(0);
      const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
      for (let j = 0; j < 6.28; j += 0.07) {
        const ct = Math.cos(j), st = Math.sin(j);
        for (let i = 0; i < 6.28; i += 0.02) {
          const sp = Math.sin(i), cp = Math.cos(i);
          const h = ct + 2;
          const D = 1 / (sp * h * sA + st * cA + 5);
          const t = sp * h * cA - st * sA;
          const x = Math.floor(W / 2 + 30 * D * (cp * h * cB - t * sB));
          const y = Math.floor(H / 2 + 12 * D * (cp * h * sB + t * cB));
          const o = x + W * y;
          const N = Math.floor(8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
          if (y >= 0 && y < H && x >= 0 && x < W && D > z[o]) {
            z[o] = D;
            out[o] = chars[Math.max(N, 0)];
          }
        }
      }
      let s = "";
      for (let k = 0; k < H; k++) s += out.slice(k * W, k * W + W).join("") + "\n";
      pre.textContent = s;
    }
    function loop() {
      if (!visible) return;
      A += 0.04; B += 0.02;
      render();
      setTimeout(() => requestAnimationFrame(loop), 40);
    }
    render();
    if (reduceMotion) return;
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) loop();
    }).observe(pre);
  }

  /* ---------------- Boot ---------------- */
  $("#year").textContent = new Date().getFullYear();
  initNetwork();
  scramble($(".name"));
  typed();
  reveals();
  nav();
  cursor();
  cards();
  magnetic();
  filters();
  copyEmail();
  asciiDonut();

  console.log(
    "%c Hey, curious dev! 👋 %c\nLike what you see? → anusheshjumale88@gmail.com",
    "background:linear-gradient(90deg,#22d3ee,#a855f7);color:#06060c;font-weight:700;padding:6px 10px;border-radius:6px",
    "color:#a855f7;font-family:monospace"
  );
})();
