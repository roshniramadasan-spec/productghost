// Info panel, tabs, size/distance comparison views, fact ticker, and quiz.

(function () {
  // ---------- tabs ----------
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "tab-" + btn.dataset.tab);
      });
    });
  });

  // ---------- info panel ----------
  const panel = document.getElementById("info-panel");
  const closeBtn = document.getElementById("close-panel");

  window.showInfoPanel = function (body) {
    document.getElementById("panel-name").textContent = body.name;
    document.getElementById("panel-tagline").textContent = body.tagline;
    document.getElementById("stat-type").textContent = body.type;
    document.getElementById("stat-diameter").textContent = body.diameter;
    document.getElementById("stat-distance").textContent = body.distance;
    document.getElementById("stat-temp").textContent = body.temp;
    document.getElementById("stat-day").textContent = body.day;
    document.getElementById("stat-year").textContent = body.year;
    document.getElementById("stat-moons").textContent = body.moons;

    // "If you weigh 35 kg on Earth..." — relatable gravity comparison.
    const kg = Math.round(35 * body.surfaceGravity);
    document.getElementById("stat-gravity").textContent =
      body.name === "Earth"
        ? "Exactly what your scale says!"
        : `If you weigh 35 kg on Earth, you'd weigh about ${kg} kg here`;

    const icon = document.getElementById("panel-icon");
    icon.style.background = `radial-gradient(circle at 35% 35%, ${body.colors[0]}, ${body.colors[1]} 60%, ${body.colors[2]})`;
    icon.classList.toggle("with-rings", !!body.hasRings);

    const list = document.getElementById("panel-facts");
    list.innerHTML = "";
    body.facts.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      list.appendChild(li);
    });

    panel.classList.remove("closed");
  };

  function closePanel() {
    panel.classList.add("closed");
    window.clearSelection();
  }
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });

  // ---------- fact ticker ----------
  const tickerText = document.getElementById("ticker-text");
  let tickerIndex = 0;
  setInterval(() => {
    tickerIndex = (tickerIndex + 1) % TICKER_FACTS.length;
    tickerText.style.opacity = 0;
    setTimeout(() => {
      tickerText.textContent = TICKER_FACTS[tickerIndex];
      tickerText.style.opacity = 1;
    }, 400);
  }, 8000);

  // ---------- size comparison (true scale) ----------
  const sizeRow = document.getElementById("size-row");
  const JUPITER_PX = 200; // Jupiter's on-screen diameter; everything scales from it
  PLANETS.forEach(p => {
    const px = Math.max((DIAMETERS_KM[p.name] / DIAMETERS_KM.Jupiter) * JUPITER_PX, 4);
    const cell = document.createElement("div");
    cell.className = "size-cell";
    const ball = document.createElement("div");
    ball.className = "size-ball";
    ball.style.width = ball.style.height = px + "px";
    ball.style.background = `radial-gradient(circle at 35% 35%, ${p.colors[0]}, ${p.colors[1]} 60%, ${p.colors[2]})`;
    ball.title = `${p.name}: ${DIAMETERS_KM[p.name].toLocaleString()} km across`;
    const name = document.createElement("p");
    name.innerHTML = `<strong>${p.name}</strong><br><small>${DIAMETERS_KM[p.name].toLocaleString()} km</small>`;
    cell.appendChild(ball);
    cell.appendChild(name);
    sizeRow.appendChild(cell);
  });

  // ---------- distance strip (true scale) ----------
  const strip = document.getElementById("distance-strip");
  PLANETS.forEach(p => {
    const marker = document.createElement("div");
    marker.className = "distance-marker";
    marker.style.left = (DISTANCES_MKM[p.name] / DISTANCES_MKM.Neptune) * 96 + 2 + "%";
    marker.innerHTML = `<span class="dot" style="background:${p.colors[1]}"></span><span class="dist-label">${p.name}</span>`;
    marker.title = `${p.name}: ${DISTANCES_MKM[p.name].toLocaleString()} million km from the Sun`;
    strip.appendChild(marker);
  });
  const sunMarker = document.createElement("div");
  sunMarker.className = "distance-marker sun-marker";
  sunMarker.style.left = "0.5%";
  sunMarker.innerHTML = `<span class="dot" style="background:#ffd24d"></span><span class="dist-label">Sun</span>`;
  strip.appendChild(sunMarker);

  // ---------- quiz ----------
  const startCard = document.getElementById("quiz-start");
  const questionCard = document.getElementById("quiz-question");
  const resultCard = document.getElementById("quiz-result");
  const answersBox = document.getElementById("answers");
  const feedbackEl = document.getElementById("quiz-feedback");
  const nextBtn = document.getElementById("btn-next");

  const QUIZ_LENGTH = 8;
  let quiz = [], current = 0, score = 0;

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showBestScore() {
    const best = localStorage.getItem("solar-quiz-best");
    document.getElementById("best-score").textContent =
      best ? `🏆 Your best score: ${best}/${QUIZ_LENGTH}` : "";
  }
  showBestScore();

  function startQuiz() {
    quiz = shuffled(QUIZ_QUESTIONS).slice(0, QUIZ_LENGTH).map(q => {
      // Shuffle the answers too, tracking where the correct one lands.
      const order = shuffled(q.answers.map((text, i) => ({ text, isCorrect: i === q.correct })));
      return { q: q.q, why: q.why, options: order };
    });
    current = 0;
    score = 0;
    startCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    questionCard.classList.remove("hidden");
    showQuestion();
  }

  function showQuestion() {
    const item = quiz[current];
    document.getElementById("quiz-progress").textContent =
      `Question ${current + 1} of ${QUIZ_LENGTH} · Score: ${score}`;
    document.getElementById("question-text").textContent = item.q;
    feedbackEl.textContent = "";
    feedbackEl.className = "quiz-feedback";
    nextBtn.classList.add("hidden");
    answersBox.innerHTML = "";

    item.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => pick(btn, opt, item));
      answersBox.appendChild(btn);
    });
  }

  function pick(btn, opt, item) {
    answersBox.querySelectorAll("button").forEach(b => {
      b.disabled = true;
      const chosen = item.options[[...answersBox.children].indexOf(b)];
      if (chosen.isCorrect) b.classList.add("correct");
    });
    if (opt.isCorrect) {
      score++;
      feedbackEl.textContent = `✅ Correct! ${item.why}`;
      feedbackEl.classList.add("good");
    } else {
      btn.classList.add("wrong");
      feedbackEl.textContent = `❌ Not quite. ${item.why}`;
      feedbackEl.classList.add("bad");
    }
    nextBtn.textContent = current + 1 < QUIZ_LENGTH ? "Next ➡️" : "See Results 🏁";
    nextBtn.classList.remove("hidden");
  }

  nextBtn.addEventListener("click", () => {
    current++;
    if (current < QUIZ_LENGTH) {
      showQuestion();
    } else {
      finishQuiz();
    }
  });

  function finishQuiz() {
    questionCard.classList.add("hidden");
    resultCard.classList.remove("hidden");
    const titles = [
      [8, "🌟 Perfect! You're a Space Genius!"],
      [6, "🚀 Amazing! Future astronaut alert!"],
      [4, "🛰️ Nice work, Space Cadet!"],
      [0, "🔭 Good start! Explore the planets and try again!"]
    ];
    document.getElementById("result-title").textContent = titles.find(([min]) => score >= min)[1];
    document.getElementById("result-text").textContent = `You scored ${score} out of ${QUIZ_LENGTH}!`;
    const best = Number(localStorage.getItem("solar-quiz-best") || 0);
    if (score > best) localStorage.setItem("solar-quiz-best", score);
    showBestScore();
  }

  document.getElementById("btn-start-quiz").addEventListener("click", startQuiz);
  document.getElementById("btn-retry").addEventListener("click", startQuiz);
})();
