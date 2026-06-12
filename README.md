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

### Explore
A live, immersive animation of all 8 planets orbiting the Sun in a tilted
3D-style perspective. Orbital **speeds are real** (Mercury really does lap
Neptune hundreds of times!), while sizes and distances are compressed so
everything fits on screen.

- **Swipe / drag** to spin the whole solar system and change the viewing angle.
- **Pinch or scroll** to zoom — from the full system all the way down to
  close-up planet views.
- **Tap any planet (or the Sun)** to fly to it. Up close you'll see its major
  moons orbiting with their names — Io, Europa, Ganymede and Callisto around
  Jupiter; Titan, Rhea, Enceladus and Mimas around Saturn; backwards-orbiting
  Triton around Neptune, and more. A fact card opens with size, distance,
  temperature, day/year length, moons, fun facts, and what you'd weigh there.
- Jupiter and Saturn show banded cloud tops (and the Great Red Spot); Saturn's
  rings tilt with the camera and pass in front of and behind the planet.
- **Speed slider** (1–90 Earth days per second), **pause**, **zoom buttons**,
  **reset view**, and toggles for names and orbit lines.
- A simulation clock counts elapsed days and years, and a rotating
  "Did you know?" fact ticker runs along the bottom.

### Compare Sizes
True-to-scale planet size comparison (Jupiter vs. tiny Mercury!) plus a
true-to-scale distance map showing just how empty space really is.

### Quiz
An 8-question multiple-choice quiz drawn from an 18-question bank (including
moon questions), with explanations for every answer and a best-score tracker
saved in the browser.

## Facts sources

Planetary data (diameters, distances, periods, temperatures, moon counts)
is based on NASA planetary fact sheets, current as of 2025.
