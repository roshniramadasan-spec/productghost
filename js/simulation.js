// Animated orbital simulation on <canvas>.
// Orbit sizes and planet sizes are compressed for visibility — real scale
// would make planets invisible specks. Orbital SPEEDS are true to life:
// each planet's angular speed comes from its real orbital period.

(function () {
  const canvas = document.getElementById("space");
  const ctx = canvas.getContext("2d");

  // --- simulation state ---
  // Speed presets: how many Earth days pass per real second.
  const SPEED_STEPS = [1, 5, 10, 30, 90];
  let daysPerSecond = SPEED_STEPS[2];
  let paused = false;
  let showLabels = true;
  let showOrbits = true;
  let simDays = 0;            // elapsed simulation time in Earth days
  let hovered = null;         // planet currently under the cursor
  let selected = null;        // planet whose info panel is open

  // Give each planet a random starting position so they don't launch in a line.
  PLANETS.forEach(p => { p.angle = Math.random() * Math.PI * 2; });
  // Earth's moon, just for charm.
  const MOON = { angle: 0, orbitDays: 27.3 };

  // --- starfield (regenerated on resize) ---
  let stars = [];
  function makeStars() {
    stars = [];
    const count = Math.floor((canvas.width * canvas.height) / 3500);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.3 + 0.3,
        tw: Math.random() * Math.PI * 2   // twinkle phase
      });
    }
  }

  let cx = 0, cy = 0, maxOrbit = 0;
  function resize() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    cx = canvas.clientWidth / 2;
    cy = canvas.clientHeight / 2;
    maxOrbit = Math.min(cx, cy) - 20;
    makeStars();
  }
  window.addEventListener("resize", resize);

  function orbitRadius(p) { return p.orbitFrac * maxOrbit; }

  // Planets get a minimum clickable size even when orbits are tight.
  function planetPos(p) {
    const r = orbitRadius(p);
    return { x: cx + Math.cos(p.angle) * r, y: cy + Math.sin(p.angle) * r };
  }

  function drawBody(x, y, radius, colors) {
    const g = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.1, x, y, radius);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.6, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(now) {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // stars
    for (const s of stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(now / 700 + s.tw);
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x / devicePixelRatio, s.y / devicePixelRatio, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // orbit paths
    if (showOrbits) {
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      for (const p of PLANETS) {
        ctx.beginPath();
        ctx.arc(cx, cy, orbitRadius(p), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // sun with glow
    const glow = ctx.createRadialGradient(cx, cy, SUN.drawRadius * 0.5, cx, cy, SUN.drawRadius * 2.6);
    glow.addColorStop(0, "rgba(255,200,60,0.55)");
    glow.addColorStop(1, "rgba(255,140,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, SUN.drawRadius * 2.6, 0, Math.PI * 2);
    ctx.fill();
    drawBody(cx, cy, SUN.drawRadius, SUN.colors);
    if (hovered === SUN || selected === SUN) ring(cx, cy, SUN.drawRadius);
    if (showLabels) label("Sun", cx, cy - SUN.drawRadius - 8);

    // planets
    for (const p of PLANETS) {
      const { x, y } = planetPos(p);

      if (p.hasRings) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.4);
        ctx.strokeStyle = "rgba(222,195,140,0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.drawRadius * 1.9, p.drawRadius * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(222,195,140,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.drawRadius * 2.3, p.drawRadius * 0.85, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      drawBody(x, y, p.drawRadius, p.colors);

      if (p.name === "Earth") {
        const mx = x + Math.cos(MOON.angle) * (p.drawRadius + 8);
        const my = y + Math.sin(MOON.angle) * (p.drawRadius + 8);
        drawBody(mx, my, 2.5, ["#eee", "#bbb", "#888"]);
      }

      if (hovered === p || selected === p) ring(x, y, Math.max(p.drawRadius, p.hasRings ? p.drawRadius * 2.3 : 0));
      if (showLabels) label(p.name, x, y - p.drawRadius - (p.hasRings ? 14 : 8));
    }
  }

  function ring(x, y, r) {
    ctx.strokeStyle = "rgba(120,210,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  function label(text, x, y) {
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(text, x, y);
  }

  // --- animation loop ---
  let lastTime = null;
  function frame(now) {
    if (lastTime === null) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.1); // seconds, capped for tab-switch jumps
    lastTime = now;

    if (!paused) {
      const dDays = dt * daysPerSecond;
      simDays += dDays;
      for (const p of PLANETS) {
        p.angle += (Math.PI * 2 * dDays) / p.orbitDays;
      }
      MOON.angle += (Math.PI * 2 * dDays) / MOON.orbitDays;
      updateClock();
    }
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

  // --- interaction ---
  function bodyAt(mx, my) {
    for (const p of PLANETS) {
      const { x, y } = planetPos(p);
      const hitR = Math.max(p.drawRadius, 12) + (p.hasRings ? 8 : 0);
      if ((mx - x) ** 2 + (my - y) ** 2 <= hitR * hitR) return p;
    }
    if ((mx - cx) ** 2 + (my - cy) ** 2 <= SUN.drawRadius ** 2) return SUN;
    return null;
  }

  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    hovered = bodyAt(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hovered ? "pointer" : "default";
  });

  canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const body = bodyAt(e.clientX - rect.left, e.clientY - rect.top);
    if (body) {
      selected = body;
      window.showInfoPanel(body); // defined in ui.js
    }
  });

  // --- controls ---
  const pauseBtn = document.getElementById("btn-pause");
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "▶️" : "⏸️";
  });

  const speedInput = document.getElementById("speed");
  const speedValue = document.getElementById("speed-value");
  speedInput.addEventListener("input", () => {
    daysPerSecond = SPEED_STEPS[speedInput.value];
    speedValue.textContent = `${daysPerSecond} day${daysPerSecond > 1 ? "s" : ""}/sec`;
  });

  document.getElementById("show-labels").addEventListener("change", e => { showLabels = e.target.checked; });
  document.getElementById("show-orbits").addEventListener("change", e => { showOrbits = e.target.checked; });

  // Let ui.js clear the selection highlight when the panel closes.
  window.clearSelection = () => { selected = null; };

  resize();
  requestAnimationFrame(frame);
})();
