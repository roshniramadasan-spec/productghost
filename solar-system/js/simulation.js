// Immersive orbital simulation on <canvas>.
//
// The solar system lives in a flat "world plane". A camera with azimuth
// (spin), tilt (3D perspective squash), zoom and a follow target projects
// it to the screen. Drag/swipe rotates, pinch/scroll zooms, tapping a body
// flies the camera to it — close enough to see its moons orbiting with names.
//
// Sizes and orbit spacing are compressed for visibility; orbital SPEEDS are
// true to life (each body's angular speed comes from its real period).

(function () {
  const canvas = document.getElementById("space");
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;

  // --- simulation state ---
  const SPEED_STEPS = [1, 5, 10, 30, 90]; // Earth days per real second
  let daysPerSecond = SPEED_STEPS[2];
  let paused = false;
  let showLabels = true;
  let showOrbits = true;
  let simDays = 0;
  let hovered = null;

  const MIN_ZOOM = 0.45, MAX_ZOOM = 90;

  PLANETS.forEach(p => {
    p.angle = Math.random() * TAU;
    p.moonFade = 0;
    p.dim = 1; // fades non-visited planets while the camera follows another
    (p.moonsList || []).forEach(m => { m.angle = Math.random() * TAU; });
  });
  let sunDim = 1;

  // --- camera ---
  const cam = {
    x: 0, y: 0,            // world position the camera looks at
    zoom: 1, targetZoom: 1,
    az: 0, azVel: 0,       // azimuth spin + swipe inertia
    tilt: 0.5,             // 1 = top-down, ~0.15 = nearly edge-on
    follow: null,          // body being visited (null = whole system)
    fly: null              // { sx, sy, t } fly-to animation state
  };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function ease(t) { return t * t * (3 - 2 * t); }

  // --- layout / background ---
  let cx = 0, cy = 0, minDim = 0, maxOrbit = 0;
  let stars = [];
  let nebula = null;

  function makeStars() {
    stars = [];
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const count = Math.floor((w * h) / 2800);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.3,
        layer: Math.random() < 0.5 ? 0.35 : 1,
        tw: Math.random() * TAU
      });
    }
  }

  function makeNebula() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    nebula = document.createElement("canvas");
    nebula.width = w; nebula.height = h;
    const nctx = nebula.getContext("2d");
    const hues = [[90, 60, 160], [40, 80, 150], [120, 50, 140], [30, 90, 120]];
    for (let i = 0; i < 5; i++) {
      const [r, g, b] = hues[i % hues.length];
      const x = Math.random() * w, y = Math.random() * h;
      const rad = (Math.random() * 0.35 + 0.25) * Math.max(w, h);
      const grad = nctx.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.10)`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      nctx.fillStyle = grad;
      nctx.fillRect(0, 0, w, h);
    }
  }

  function resize() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    cx = canvas.clientWidth / 2;
    cy = canvas.clientHeight / 2;
    minDim = Math.min(canvas.clientWidth, canvas.clientHeight);
    maxOrbit = minDim / 2 - 20;
    makeStars();
    makeNebula();
  }
  window.addEventListener("resize", resize);

  // --- world projection ---
  function orbitR(p) { return p.orbitFrac * maxOrbit; }

  function planetWorld(p) {
    const a = p.angle + cam.az;
    const r = orbitR(p);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * cam.tilt };
  }

  function moonWorld(p, m, pw) {
    const a = m.angle + cam.az;
    const r = p.drawRadius * m.dist;
    return { x: pw.x + Math.cos(a) * r, y: pw.y + Math.sin(a) * r * cam.tilt };
  }

  function toScreen(w) {
    return { x: cx + (w.x - cam.x) * cam.zoom, y: cy + (w.y - cam.y) * cam.zoom };
  }

  // --- focus / fly-to ---
  function focusZoom(body) {
    if (body === SUN) return clamp(minDim * 0.22 / SUN.drawRadius, 1, MAX_ZOOM);
    const moons = body.moonsList || [];
    const extent = moons.length
      ? body.drawRadius * (moons[moons.length - 1].dist + 1.5)
      : body.drawRadius * 2.8;
    return clamp(minDim * 0.46 / extent, 1.2, MAX_ZOOM);
  }

  const backBtn = document.getElementById("btn-back");

  function focusOn(body) {
    cam.follow = body;
    cam.targetZoom = focusZoom(body);
    cam.fly = { sx: cam.x, sy: cam.y, t: 0 };
    backBtn.classList.toggle("hidden", body === null);
    if (body) window.showInfoPanel(body);
  }

  function resetView() {
    cam.follow = null;
    cam.targetZoom = 1;
    cam.fly = { sx: cam.x, sy: cam.y, t: 0 };
    backBtn.classList.add("hidden");
  }
  backBtn.addEventListener("click", resetView);

  // exposed for the info panel and tests
  window.focusPlanet = name => {
    const body = name === "Sun" ? SUN : PLANETS.find(p => p.name === name);
    if (body) focusOn(body);
  };
  window.clearSelection = () => {}; // closing the panel keeps the camera where it is

  // --- drawing helpers ---
  function sunDirection(s) {
    const sun = toScreen({ x: 0, y: 0 });
    let dx = sun.x - s.x, dy = sun.y - s.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return { x: 0, y: -0.4 };
    return { x: dx / len, y: dy / len };
  }

  function drawSphere(s, r, colors, lit) {
    const g = ctx.createRadialGradient(
      s.x + lit.x * r * 0.45, s.y + lit.y * r * 0.45, r * 0.1,
      s.x, s.y, r
    );
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.6, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, TAU);
    ctx.fill();
  }

  function drawRings(p, s, r, back) {
    // [inner, outer, alpha] in planet radii; split into far/near halves so
    // the planet body sits between them
    const bands = [[1.45, 1.78, 0.32], [1.85, 2.2, 0.75], [2.26, 2.42, 0.4]];
    const a0 = back ? Math.PI : 0;
    const a1 = back ? TAU : Math.PI;
    for (const [r1, r2, alpha] of bands) {
      const mid = ((r1 + r2) / 2) * r;
      ctx.strokeStyle = `rgba(216,194,150,${alpha})`;
      ctx.lineWidth = Math.max((r2 - r1) * r, 0.6);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, mid, Math.max(mid * cam.tilt, 0.5), 0, a0, a1);
      ctx.stroke();
    }
  }

  function drawPlanet(p, s, r) {
    const lit = sunDirection(s);
    if (p.hasRings) drawRings(p, s, r, true);

    if (p.bands && r > 16) {
      // banded gas giant: cloud stripes clipped to the disc + shading overlay
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, TAU);
      ctx.clip();
      const n = p.bands.length;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = p.bands[i];
        ctx.fillRect(s.x - r, s.y - r + (2 * r * i) / n, 2 * r, (2 * r) / n + 1);
      }
      if (p.spot) {
        ctx.fillStyle = "#c0533a";
        ctx.beginPath();
        ctx.ellipse(s.x + r * 0.32, s.y + r * 0.38, r * 0.22, r * 0.12, 0, 0, TAU);
        ctx.fill();
      }
      const sh = ctx.createRadialGradient(
        s.x + lit.x * r * 0.55, s.y + lit.y * r * 0.55, r * 0.2,
        s.x, s.y, r * 1.02
      );
      sh.addColorStop(0, "rgba(255,255,255,0.10)");
      sh.addColorStop(0.55, "rgba(0,0,0,0)");
      sh.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = sh;
      ctx.fillRect(s.x - r, s.y - r, 2 * r, 2 * r);
      ctx.restore();
    } else {
      drawSphere(s, r, p.colors, lit);
    }

    if (p.hasRings) drawRings(p, s, r, false);
  }

  function drawSun(s, r, now) {
    const pulse = 1 + Math.sin(now / 900) * 0.04;
    const glow = ctx.createRadialGradient(s.x, s.y, r * 0.4, s.x, s.y, r * 3.2 * pulse);
    glow.addColorStop(0, "rgba(255,210,80,0.55)");
    glow.addColorStop(0.5, "rgba(255,150,30,0.16)");
    glow.addColorStop(1, "rgba(255,120,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 3.2 * pulse, 0, TAU);
    ctx.fill();

    const g = ctx.createRadialGradient(s.x - r * 0.2, s.y - r * 0.2, r * 0.1, s.x, s.y, r);
    g.addColorStop(0, SUN.colors[0]);
    g.addColorStop(0.65, SUN.colors[1]);
    g.addColorStop(1, SUN.colors[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, TAU);
    ctx.fill();
  }

  function label(text, x, y, alpha, size) {
    ctx.font = `${size || 12}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(238,242,255,${alpha})`;
    ctx.fillText(text, x, y);
  }

  // --- main draw ---
  function draw(now) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // parallax offsets driven by spin and camera travel
    const offX = cam.az * 140 + cam.x * cam.zoom * 0.04;
    const offY = cam.y * cam.zoom * 0.04;

    if (nebula) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(nebula, -((offX * 0.2) % 40), -((offY * 0.2) % 40), w + 40, h + 40);
      ctx.globalAlpha = 1;
    }

    for (const s of stars) {
      const px = ((s.x - offX * s.layer) % w + w) % w;
      const py = ((s.y - offY * s.layer) % h + h) % h;
      const twinkle = 0.55 + 0.45 * Math.sin(now / 700 + s.tw);
      ctx.fillStyle = `rgba(255,255,255,${twinkle * (0.4 + 0.6 * s.layer)})`;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, TAU);
      ctx.fill();
    }

    const origin = toScreen({ x: 0, y: 0 });

    // orbit paths (ellipses because of the tilt)
    if (showOrbits) {
      ctx.lineWidth = 1;
      for (const p of PLANETS) {
        const r = orbitR(p) * cam.zoom;
        const fade = clamp(2.2 - cam.zoom * 0.12, 0.25, 1) * (0.3 + 0.7 * sunDim);
        ctx.strokeStyle = `rgba(160,190,255,${0.14 * fade})`;
        ctx.beginPath();
        ctx.ellipse(origin.x, origin.y, r, Math.max(r * cam.tilt, 0.5), 0, 0, TAU);
        ctx.stroke();
      }
    }

    // collect bodies and depth-sort so near things draw over far things
    const items = [];
    items.push({
      depth: 0,
      draw: () => {
        ctx.globalAlpha = sunDim;
        drawSun(origin, SUN.drawRadius * cam.zoom, now);
        ctx.globalAlpha = 1;
      }
    });
    SUN._s = origin;
    SUN._r = SUN.drawRadius * cam.zoom;

    for (const p of PLANETS) {
      const pw = planetWorld(p);
      const ps = toScreen(pw);
      const pr = p.drawRadius * cam.zoom;
      p._s = ps; p._r = pr;
      items.push({
        depth: pw.y,
        draw: () => {
          ctx.globalAlpha = p.dim;
          drawPlanet(p, ps, pr);
          ctx.globalAlpha = 1;
        }
      });

      if (p.moonFade > 0.02 && p.moonsList) {
        // moon orbit rings
        if (showOrbits) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(160,190,255,${0.2 * p.moonFade})`;
          for (const m of p.moonsList) {
            const mr = p.drawRadius * m.dist * cam.zoom;
            ctx.beginPath();
            ctx.ellipse(ps.x, ps.y, mr, Math.max(mr * cam.tilt, 0.5), 0, 0, TAU);
            ctx.stroke();
          }
        }
        for (const m of p.moonsList) {
          const mw = moonWorld(p, m, pw);
          const ms = toScreen(mw);
          const mr = Math.max(m.r * cam.zoom, 1.2);
          m._s = ms; m._r = mr; m._fade = p.moonFade;
          const fade = p.moonFade * p.dim;
          items.push({
            depth: mw.y,
            draw: () => {
              ctx.globalAlpha = fade;
              drawSphere(ms, mr, m.color, sunDirection(ms));
              ctx.globalAlpha = 1;
            }
          });
        }
      }
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    // hover highlight
    if (hovered && hovered._s) {
      const hr = Math.max(hovered._r, 10) * (hovered.hasRings ? 2.5 : 1.25);
      ctx.strokeStyle = "rgba(120,210,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hovered._s.x, hovered._s.y, hr + 5, 0, TAU);
      ctx.stroke();
    }

    // labels on top
    if (showLabels) {
      label("Sun", origin.x, origin.y - SUN._r - 10, 0.85 * sunDim);
      for (const p of PLANETS) {
        const off = p._r * (p.hasRings ? 2.5 : 1) + 10;
        if (p.dim > 0.3) label(p.name, p._s.x, p._s.y - off, 0.85 * p.dim);
        if (p.moonFade > 0.25 && p.moonsList && p.dim > 0.3) {
          for (const m of p.moonsList) {
            label(m.name, m._s.x, m._s.y - m._r - 7, 0.8 * p.moonFade * p.dim, 11);
          }
        }
      }
    }

    // vignette for depth
    const vg = ctx.createRadialGradient(cx, cy, minDim * 0.45, cx, cy, Math.max(w, h) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,10,0.5)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // --- animation loop ---
  let lastTime = null;
  function frame(now) {
    if (lastTime === null) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (!paused) {
      const dDays = dt * daysPerSecond;
      simDays += dDays;
      for (const p of PLANETS) {
        p.angle += (TAU * dDays) / p.orbitDays;
        if (p.moonsList) {
          for (const m of p.moonsList) {
            // cap per-frame motion so fast inner moons stay watchable
            let dA = (TAU * dDays) / m.period;
            dA = clamp(dA, -0.3, 0.3);
            m.angle += dA;
          }
        }
      }
      updateClock();
    }

    // swipe inertia
    cam.az += cam.azVel * dt * 60;
    cam.azVel *= Math.exp(-dt * 4);

    // zoom easing
    cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 5);

    // camera position: cinematic fly-to, then lock onto the target
    const target = cam.follow && cam.follow !== SUN ? planetWorld(cam.follow) : { x: 0, y: 0 };
    if (cam.fly) {
      cam.fly.t += dt;
      const e = ease(Math.min(1, cam.fly.t / 1.1));
      cam.x = cam.fly.sx + (target.x - cam.fly.sx) * e;
      cam.y = cam.fly.sy + (target.y - cam.fly.sy) * e;
      if (cam.fly.t >= 1.1) cam.fly = null;
    } else {
      cam.x = target.x;
      cam.y = target.y;
    }

    // moons fade in when visiting their planet or when zoomed right in
    const followingPlanet = cam.follow && cam.follow !== SUN;
    for (const p of PLANETS) {
      const dimWant = followingPlanet && cam.follow !== p ? 0.12 : 1;
      p.dim += (dimWant - p.dim) * Math.min(1, dt * 3);
      if (!p.moonsList) continue;
      const want = cam.follow === p ? 1 : clamp((cam.zoom - 2.2) / 2, 0, 1);
      p.moonFade += (want - p.moonFade) * Math.min(1, dt * 3);
    }
    const sunWant = followingPlanet ? 0.3 : 1;
    sunDim += (sunWant - sunDim) * Math.min(1, dt * 3);

    draw(now);
    requestAnimationFrame(frame);
  }

  const clockEl = document.getElementById("sim-clock");
  function updateClock() {
    const years = simDays / 365.25;
    clockEl.textContent = years >= 1
      ? `Day ${Math.floor(simDays).toLocaleString()} (${years.toFixed(1)} Earth years)`
      : `Day ${Math.floor(simDays)}`;
  }

  // --- hit testing ---
  function bodyAt(mx, my) {
    // moons first (they're smaller), then planets, then the sun
    for (const p of PLANETS) {
      if (p.moonFade > 0.5 && p.moonsList) {
        for (const m of p.moonsList) {
          if (!m._s) continue;
          const hr = Math.max(m._r, 10);
          if ((mx - m._s.x) ** 2 + (my - m._s.y) ** 2 <= hr * hr) return p; // moons open their planet
        }
      }
    }
    for (const p of PLANETS) {
      if (!p._s) continue;
      const hr = Math.max(p._r, 14) * (p.hasRings ? 1.6 : 1);
      if ((mx - p._s.x) ** 2 + (my - p._s.y) ** 2 <= hr * hr) return p;
    }
    if (SUN._s) {
      const hr = Math.max(SUN._r, 16);
      if ((mx - SUN._s.x) ** 2 + (my - SUN._s.y) ** 2 <= hr * hr) return SUN;
    }
    return null;
  }

  // --- gestures (pointer events: mouse + touch unified) ---
  const pointers = new Map();
  let tapStart = null;
  let pinchDist = null;
  const hint = document.getElementById("gesture-hint");
  let hintDismissed = false;
  function dismissHint() {
    if (!hintDismissed) { hintDismissed = true; hint.classList.add("fade-out"); }
  }
  setTimeout(dismissHint, 9000);

  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      cam.azVel = 0;
    } else {
      tapStart = null;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    }
  });

  canvas.addEventListener("pointermove", e => {
    const prev = pointers.get(e.pointerId);

    if (!prev) {
      // plain mouse hover
      if (e.pointerType === "mouse") {
        const rect = canvas.getBoundingClientRect();
        hovered = bodyAt(e.clientX - rect.left, e.clientY - rect.top);
        canvas.style.cursor = hovered ? "pointer" : "grab";
      }
      return;
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      cam.az += dx * 0.005;
      cam.azVel = dx * 0.005;
      cam.tilt = clamp(cam.tilt + dy * 0.004, 0.15, 0.95);
      if (tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 9) {
        tapStart = null;
        dismissHint();
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist) {
        const ratio = d / pinchDist;
        cam.targetZoom = clamp(cam.targetZoom * ratio, MIN_ZOOM, MAX_ZOOM);
        cam.zoom = clamp(cam.zoom * ratio, MIN_ZOOM, MAX_ZOOM);
        dismissHint();
      }
      pinchDist = d;
    }
  });

  function pointerEnd(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = null;
    if (tapStart && performance.now() - tapStart.t < 450) {
      const rect = canvas.getBoundingClientRect();
      const body = bodyAt(tapStart.x - rect.left, tapStart.y - rect.top);
      if (body) {
        focusOn(body);
        dismissHint();
      }
    }
    tapStart = null;
  }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
    cam.targetZoom = clamp(cam.targetZoom * factor, MIN_ZOOM, MAX_ZOOM);
    dismissHint();
  }, { passive: false });

  // --- buttons / controls ---
  const pauseBtn = document.getElementById("btn-pause");
  const iconPause = document.getElementById("icon-pause");
  const iconPlay = document.getElementById("icon-play");
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    iconPause.classList.toggle("hidden", paused);
    iconPlay.classList.toggle("hidden", !paused);
  });

  document.getElementById("btn-zoom-in").addEventListener("click", () => {
    cam.targetZoom = clamp(cam.targetZoom * 1.5, MIN_ZOOM, MAX_ZOOM);
  });
  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    cam.targetZoom = clamp(cam.targetZoom / 1.5, MIN_ZOOM, MAX_ZOOM);
  });
  document.getElementById("btn-reset").addEventListener("click", resetView);

  const speedInput = document.getElementById("speed");
  const speedValue = document.getElementById("speed-value");
  speedInput.addEventListener("input", () => {
    daysPerSecond = SPEED_STEPS[speedInput.value];
    speedValue.textContent = `${daysPerSecond} day${daysPerSecond > 1 ? "s" : ""}/sec`;
  });

  document.getElementById("show-labels").addEventListener("change", e => { showLabels = e.target.checked; });
  document.getElementById("show-orbits").addEventListener("change", e => { showOrbits = e.target.checked; });

  resize();
  requestAnimationFrame(frame);
})();
