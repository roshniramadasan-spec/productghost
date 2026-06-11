// All facts an 11-year-old explorer needs, in one place.
// orbitDays = real orbital period in Earth days (drives the animation speed).
// orbitFrac = fraction of the canvas radius used for the orbit (compressed, not to scale).
// drawRadius = on-screen pixel radius (not to scale — real scale would be invisible!).
// surfaceGravity = relative to Earth (used for the "your weight here" stat).

const SUN = {
  name: "Sun",
  tagline: "Our very own star — a giant ball of glowing gas!",
  type: "Star (yellow dwarf)",
  diameter: "1,392,700 km (109 Earths across)",
  distance: "0 km — it IS the center!",
  temp: "5,500 °C at the surface, 15 million °C in the core",
  day: "About 27 Earth days (it spins too!)",
  year: "It takes 230 million years to orbit the Milky Way",
  moons: "0 — but 8 planets orbit it",
  surfaceGravity: 27.9,
  drawRadius: 30,
  colors: ["#fff7c0", "#ffd24d", "#ff9500"],
  facts: [
    "The Sun holds 99.8% of all the mass in the solar system.",
    "About 1,300,000 Earths could fit inside the Sun.",
    "Sunlight takes 8 minutes and 20 seconds to reach Earth.",
    "The Sun is 4.6 billion years old — about halfway through its life."
  ]
};

const PLANETS = [
  {
    name: "Mercury",
    tagline: "The smallest planet and the fastest around the Sun!",
    type: "Rocky planet",
    diameter: "4,879 km",
    distance: "57.9 million km (0.4 AU)",
    temp: "-173 °C at night to 427 °C in the day",
    day: "59 Earth days",
    year: "88 Earth days",
    moons: "0",
    surfaceGravity: 0.38,
    orbitDays: 88,
    orbitFrac: 0.15,
    drawRadius: 5,
    colors: ["#d8d0c5", "#9c8f80", "#6e6258"],
    facts: [
      "A year on Mercury is shorter than its day — it orbits the Sun faster than it spins!",
      "Its surface is covered in craters, just like our Moon.",
      "Even though it's closest to the Sun, Venus is actually hotter.",
      "Mercury has no atmosphere to trap heat, so nights are freezing."
    ]
  },
  {
    name: "Venus",
    tagline: "The hottest planet — Earth's evil twin!",
    type: "Rocky planet",
    diameter: "12,104 km",
    distance: "108.2 million km (0.7 AU)",
    temp: "About 465 °C — hot enough to melt lead!",
    day: "243 Earth days (longer than its year!)",
    year: "225 Earth days",
    moons: "0",
    surfaceGravity: 0.91,
    orbitDays: 225,
    orbitFrac: 0.22,
    drawRadius: 8,
    colors: ["#f7e7b8", "#e8c477", "#c98f3d"],
    facts: [
      "Venus spins backwards — the Sun rises in the west there!",
      "Its thick clouds of carbon dioxide trap heat like a giant greenhouse.",
      "Venus is the brightest natural object in our night sky after the Moon.",
      "Its clouds contain droplets of sulfuric acid. No umbrella can help you there!"
    ]
  },
  {
    name: "Earth",
    tagline: "Home sweet home — the only planet known to have life!",
    type: "Rocky planet",
    diameter: "12,756 km",
    distance: "149.6 million km (1 AU)",
    temp: "Average 15 °C — just right!",
    day: "24 hours",
    year: "365.25 days",
    moons: "1 (the Moon)",
    surfaceGravity: 1,
    orbitDays: 365.25,
    orbitFrac: 0.30,
    drawRadius: 9,
    colors: ["#9bd1ff", "#3f8fd2", "#1b4f8a"],
    facts: [
      "About 71% of Earth's surface is covered by water.",
      "Earth is the only planet not named after a Greek or Roman god.",
      "The extra 0.25 day in our year is why we have a leap day every 4 years!",
      "Earth's core is as hot as the surface of the Sun — about 5,400 °C."
    ]
  },
  {
    name: "Mars",
    tagline: "The Red Planet — our next home, maybe?",
    type: "Rocky planet",
    diameter: "6,792 km",
    distance: "227.9 million km (1.5 AU)",
    temp: "Average -63 °C",
    day: "24.6 hours (almost like Earth!)",
    year: "687 Earth days",
    moons: "2 (Phobos and Deimos)",
    surfaceGravity: 0.38,
    orbitDays: 687,
    orbitFrac: 0.38,
    drawRadius: 7,
    colors: ["#f0a878", "#d1603d", "#8f3a22"],
    facts: [
      "Mars is red because its soil is full of rusty iron dust.",
      "It has the tallest volcano in the solar system — Olympus Mons, 3× taller than Mount Everest!",
      "Robot rovers like Perseverance are exploring Mars right now.",
      "Dust storms on Mars can cover the entire planet for weeks."
    ]
  },
  {
    name: "Jupiter",
    tagline: "The king of planets — bigger than all the others combined!",
    type: "Gas giant",
    diameter: "142,984 km (11 Earths across)",
    distance: "778.5 million km (5.2 AU)",
    temp: "Average -110 °C in the clouds",
    day: "Just 9.9 hours — the shortest day of any planet!",
    year: "11.9 Earth years",
    moons: "95 known moons!",
    surfaceGravity: 2.53,
    orbitDays: 4333,
    orbitFrac: 0.52,
    drawRadius: 20,
    colors: ["#f3e2c7", "#d9a86c", "#a5703f"],
    facts: [
      "The Great Red Spot is a storm bigger than Earth that has raged for over 300 years.",
      "Jupiter has no solid surface — you couldn't stand on it!",
      "Its moon Ganymede is the biggest moon in the solar system, larger than Mercury.",
      "Jupiter acts like a giant shield, pulling in comets and asteroids that might hit Earth."
    ]
  },
  {
    name: "Saturn",
    tagline: "The jewel of the solar system, famous for its rings!",
    type: "Gas giant",
    diameter: "120,536 km",
    distance: "1.43 billion km (9.5 AU)",
    temp: "Average -140 °C",
    day: "10.7 hours",
    year: "29.4 Earth years",
    moons: "146 known moons — the most of any planet!",
    surfaceGravity: 1.07,
    orbitDays: 10759,
    orbitFrac: 0.66,
    drawRadius: 17,
    hasRings: true,
    colors: ["#f7ecca", "#e0c084", "#b08e4f"],
    facts: [
      "Saturn's rings are made of billions of chunks of ice and rock.",
      "The rings are huge but super thin — only about 10 meters thick in places!",
      "Saturn is so light it would float in a giant bathtub of water.",
      "Its moon Titan has lakes and rivers — but of liquid methane, not water."
    ]
  },
  {
    name: "Uranus",
    tagline: "The sideways planet that rolls around the Sun!",
    type: "Ice giant",
    diameter: "51,118 km",
    distance: "2.87 billion km (19.2 AU)",
    temp: "Average -195 °C — the coldest planet!",
    day: "17.2 hours (spinning on its side)",
    year: "84 Earth years",
    moons: "28 known moons",
    surfaceGravity: 0.89,
    orbitDays: 30687,
    orbitFrac: 0.80,
    drawRadius: 12,
    colors: ["#d8f4f4", "#9adfe3", "#4fa8b5"],
    facts: [
      "Uranus is tipped over on its side — it probably got knocked over by a giant crash long ago.",
      "Each pole gets 42 years of sunlight, then 42 years of darkness!",
      "It looks blue-green because of methane gas in its atmosphere.",
      "Uranus was the first planet discovered with a telescope, in 1781."
    ]
  },
  {
    name: "Neptune",
    tagline: "The windy blue giant at the edge of the planets!",
    type: "Ice giant",
    diameter: "49,528 km",
    distance: "4.5 billion km (30 AU)",
    temp: "Average -200 °C",
    day: "16.1 hours",
    year: "165 Earth years",
    moons: "16 known moons",
    surfaceGravity: 1.14,
    orbitDays: 60190,
    orbitFrac: 0.94,
    drawRadius: 12,
    colors: ["#9fc1ff", "#4f74d8", "#27418f"],
    facts: [
      "Neptune has the fastest winds in the solar system — over 2,000 km/h!",
      "It was found using math before anyone saw it through a telescope.",
      "One Neptune year is 165 Earth years — it has only completed one orbit since being discovered in 1846.",
      "Sunlight on Neptune is 900 times dimmer than on Earth."
    ]
  }
];

// Real diameters in km, used for the true-scale size comparison.
const DIAMETERS_KM = {
  Mercury: 4879, Venus: 12104, Earth: 12756, Mars: 6792,
  Jupiter: 142984, Saturn: 120536, Uranus: 51118, Neptune: 49528
};

// Real average distances from the Sun in millions of km, for the distance strip.
const DISTANCES_MKM = {
  Mercury: 57.9, Venus: 108.2, Earth: 149.6, Mars: 227.9,
  Jupiter: 778.5, Saturn: 1432, Uranus: 2867, Neptune: 4515
};

// Rotating "did you know" facts for the ticker.
const TICKER_FACTS = [
  "💡 Did you know? Click any planet (or the Sun!) to learn all about it.",
  "💡 One million Earths could fit inside the Sun!",
  "💡 A day on Venus is longer than its whole year!",
  "💡 Jupiter's Great Red Spot is a storm bigger than Earth.",
  "💡 Saturn would float in water — if you had a big enough bathtub.",
  "💡 Neptune's winds blow faster than a fighter jet!",
  "💡 Uranus rolls around the Sun on its side, like a ball.",
  "💡 Mars has the tallest volcano in the solar system: Olympus Mons.",
  "💡 Sunlight takes over 4 hours to reach Neptune.",
  "💡 Mercury zooms around the Sun in just 88 days!",
  "💡 The Moon is slowly drifting away from Earth — about 4 cm every year.",
  "💡 Space is silent — there's no air to carry sound!"
];

// Quiz question bank. 8 random questions are picked each round.
const QUIZ_QUESTIONS = [
  { q: "Which planet is closest to the Sun?", answers: ["Mercury", "Venus", "Earth", "Mars"], correct: 0,
    why: "Mercury orbits just 58 million km from the Sun." },
  { q: "Which planet is the HOTTEST?", answers: ["Mercury", "Venus", "Mars", "Jupiter"], correct: 1,
    why: "Venus's thick clouds trap heat like a greenhouse — about 465 °C!" },
  { q: "Which planet is famous for its beautiful rings?", answers: ["Jupiter", "Neptune", "Saturn", "Uranus"], correct: 2,
    why: "Saturn's rings are made of billions of pieces of ice and rock." },
  { q: "Which planet do we call the Red Planet?", answers: ["Venus", "Jupiter", "Mercury", "Mars"], correct: 3,
    why: "Mars looks red because of rusty iron dust on its surface." },
  { q: "Which is the BIGGEST planet in the solar system?", answers: ["Jupiter", "Saturn", "Neptune", "Earth"], correct: 0,
    why: "Jupiter is so big that 11 Earths could line up across it!" },
  { q: "How long does it take Earth to orbit the Sun once?", answers: ["24 hours", "1 year", "1 month", "88 days"], correct: 1,
    why: "One trip around the Sun = one year = 365.25 days." },
  { q: "Which planet spins on its side?", answers: ["Neptune", "Mars", "Uranus", "Venus"], correct: 2,
    why: "Uranus is tipped over — probably from a giant collision long ago." },
  { q: "Which planet has the MOST moons?", answers: ["Earth", "Mars", "Jupiter", "Saturn"], correct: 3,
    why: "Saturn has 146 known moons — the record holder!" },
  { q: "What is the Sun?", answers: ["A star", "A planet", "A moon", "A comet"], correct: 0,
    why: "The Sun is a star — a giant ball of glowing hot gas." },
  { q: "Which planet has the fastest winds in the solar system?", answers: ["Earth", "Neptune", "Mercury", "Saturn"], correct: 1,
    why: "Neptune's winds can blow over 2,000 km/h!" },
  { q: "How many planets are in our solar system?", answers: ["7", "9", "8", "10"], correct: 2,
    why: "There are 8 planets. Pluto was reclassified as a dwarf planet in 2006." },
  { q: "How long does sunlight take to reach Earth?", answers: ["1 second", "1 hour", "1 day", "About 8 minutes"], correct: 3,
    why: "Light travels 150 million km from the Sun to us in about 8 minutes." },
  { q: "Which planet could float in a giant bathtub of water?", answers: ["Saturn", "Mercury", "Earth", "Mars"], correct: 0,
    why: "Saturn is mostly gas and less dense than water, so it would float!" },
  { q: "What are Saturn's rings made of?", answers: ["Gold and silver", "Ice and rock", "Fire and gas", "Sand"], correct: 1,
    why: "The rings are billions of chunks of ice and rock, big and small." },
  { q: "Which planet is known as Earth's twin because of its size?", answers: ["Mars", "Mercury", "Venus", "Neptune"], correct: 2,
    why: "Venus is almost the same size as Earth — but way too hot to visit!" },
  { q: "A 'year' on a planet means the time it takes to...", answers: ["Spin once", "Cool down", "Grow bigger", "Orbit the Sun once"], correct: 3,
    why: "A year = one full trip around the Sun. Spinning once = one day." }
];
