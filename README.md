# 🚀 Solar System Explorer

An interactive solar system simulation built for young space explorers (ages ~8–13).
No installs, no build step — pure HTML, CSS, and JavaScript.

## How to run

**Easiest:** just double-click `index.html` (or drag it into any browser).

**Or serve it locally:**

```bash
cd solar-system
python3 -m http.server 8000
# then open http://localhost:8000
```

## What's inside

### 🪐 Explore
A live animation of all 8 planets orbiting the Sun. Orbital **speeds are real**
(Mercury really does lap Neptune hundreds of times!), while sizes and distances
are compressed so everything fits on screen.

- **Click any planet (or the Sun)** to open its fact card: size, distance,
  temperature, day/year length, moons, fun facts, and even what you'd weigh there.
- **Speed slider** — from 1 to 90 Earth days per second. Crank it up to watch
  Neptune finally complete an orbit!
- **Pause**, toggle **names** and **orbit lines**.
- A simulation clock counts elapsed days and years.
- A rotating "Did you know?" fact ticker at the bottom.

### 📏 Compare Sizes
True-to-scale planet size comparison (Jupiter vs. tiny Mercury!) plus a
true-to-scale distance map showing just how empty space really is.

### 🧠 Quiz
An 8-question multiple-choice quiz drawn from a 16-question bank, with
explanations for every answer and a best-score tracker saved in the browser.

## Facts sources

Planetary data (diameters, distances, periods, temperatures, moon counts)
is based on NASA planetary fact sheets, current as of 2025.
