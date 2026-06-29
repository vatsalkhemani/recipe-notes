// One-off: captures product screenshots for the README using system Chrome.
// Run against an E2E-mode dev server (NEXT_PUBLIC_E2E_MODE=true) so it has a
// fake signed-in user and a localStorage-backed store we can seed.
//
// To regenerate:
//   npm i -D puppeteer-core
//   NEXT_PUBLIC_E2E_MODE=true PORT=3100 npm run dev   # in another terminal
//   node scripts/screenshots.mjs
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3100";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const now = Date.now();
const recipes = [
  {
    id: "r1", emoji: "🫓", title: "Aloo Paratha", learntFrom: "Mom",
    tags: ["breakfast", "vegetarian"], servings: 4,
    ingredients: ["2 cups whole wheat flour", "3 boiled potatoes", "1 tsp ajwain", "Salt to taste", "Ghee for cooking"],
    steps: [
      { text: "Knead a soft dough with flour, water and a pinch of salt. Rest 15 min.", durationMin: 15 },
      { text: "Mash potatoes with ajwain, salt and chopped coriander.", durationMin: 5 },
      { text: "Stuff the dough, roll gently, and cook on a hot tawa with ghee till golden.", durationMin: 8 },
    ],
    totalTimeMin: 28, transcript: "So for aloo paratha, pehle aata gooth lo...",
    audioUrl: null, audioPath: null, coverPhotoUrl: null, coverPhotoPath: null,
    createdAt: now, updatedAt: now,
  },
  {
    id: "r2", emoji: "🍛", title: "Rajma Chawal", learntFrom: "Ravi uncle",
    tags: ["lunch", "curry", "vegetarian"], servings: 3,
    ingredients: ["1 cup rajma (soaked overnight)", "2 onions", "3 tomatoes", "Ginger-garlic paste", "Rajma masala"],
    steps: [
      { text: "Pressure cook soaked rajma till soft.", durationMin: 25 },
      { text: "Make a thick onion-tomato masala with ginger-garlic.", durationMin: 12 },
      { text: "Add rajma, simmer till gravy thickens. Serve with rice.", durationMin: 15 },
    ],
    totalTimeMin: 52, transcript: "Rajma ke liye raat ko bhigo dena...",
    audioUrl: null, audioPath: null, coverPhotoUrl: null, coverPhotoPath: null,
    createdAt: now - 1000, updatedAt: now - 1000,
  },
  {
    id: "r3", emoji: "☕", title: "Adrak Chai", learntFrom: "Dadi",
    tags: ["drinks", "quick"], servings: 2,
    ingredients: ["2 cups water", "1 cup milk", "2 tsp tea leaves", "Grated ginger", "Sugar"],
    steps: [
      { text: "Boil water with grated ginger and tea leaves.", durationMin: 4 },
      { text: "Add milk and sugar, boil till it rises. Strain and serve.", durationMin: 3 },
    ],
    totalTimeMin: 7, transcript: "Chai mein adrak kuta hua daalna...",
    audioUrl: null, audioPath: null, coverPhotoUrl: null, coverPhotoPath: null,
    createdAt: now - 2000, updatedAt: now - 2000,
  },
  {
    id: "r4", emoji: "🥗", title: "Sprout Salad", learntFrom: "Neha",
    tags: ["snack", "healthy", "quick"], servings: 2,
    ingredients: ["1 cup moong sprouts", "1 onion", "1 tomato", "Lemon juice", "Chaat masala"],
    steps: [
      { text: "Chop onion, tomato and cucumber finely.", durationMin: 5 },
      { text: "Toss with sprouts, lemon juice and chaat masala.", durationMin: 2 },
    ],
    totalTimeMin: 7, transcript: "Sprout salad simple hai...",
    audioUrl: null, audioPath: null, coverPhotoUrl: null, coverPhotoPath: null,
    createdAt: now - 3000, updatedAt: now - 3000,
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--font-render-hinting=none"],
});

const page = await browser.newPage();
await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2, isMobile: true });

// First load to establish the origin, then seed localStorage and reload.
await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate((data) => {
  localStorage.setItem("recipe-notes:e2e:e2e-user", JSON.stringify(data));
}, recipes);
await page.reload({ waitUntil: "networkidle2" });
// Hide the Next.js dev-tools badge so it doesn't appear in screenshots.
await page.addStyleTag({
  content: "nextjs-portal, [data-next-badge-root], [data-nextjs-dev-tools-button] { display: none !important; }",
});
await sleep(1200);

// 1. Grid
await page.screenshot({ path: `${OUT}/01-grid.png` });
console.log("captured grid");

// 2. Detail — click the first card
await page.click(".grid button");
await sleep(900);
await page.screenshot({ path: `${OUT}/02-detail.png` });
console.log("captured detail");

// 3. Cook Mode — Start cooking, then go to first step
await page.evaluate(() => {
  const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => /Start cooking/i.test(x.textContent));
  b?.click();
});
await sleep(800);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /^Next/.test(x.textContent.trim()));
  b?.click();
});
await sleep(800);
await page.screenshot({ path: `${OUT}/03-cook-mode.png` });
console.log("captured cook mode");

await browser.close();
console.log("done");
