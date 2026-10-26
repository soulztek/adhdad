// ADHD-friendly helpers for ADHDad: never-miss-twice streaks, XP levels, variable rewards, rotations, gentle patterns.
// Pure functions only (no React) so they can be unit-tested with plain Node.

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
export function isoDay(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function plusDays(d: Date, n: number): Date { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
/** ISO date of the Monday that starts d's week. */
export function weekKey(d: Date): string { return isoDay(plusDays(d, -((d.getDay() + 6) % 7))); }
/** Whole days since 2026-01-01 (local), used for daily rotations. */
export function dayIndex(d: Date): number { return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(2026, 0, 1).getTime()) / 86400000 + 0.5); }
export function rotate<T>(arr: T[], d: Date, offset = 0): T { const n = arr.length; const i = ((dayIndex(d) + offset) % n + n) % n; return arr[i]; }

export interface StreakInfo {
  /** Days done inside the current chain (today counts once it is done). */
  streak: number;
  /** Misses in a row right now (0 or 1 while the chain is alive). */
  missRun: number;
  /** True when this week's freeze is still unused. */
  freezeLeft: boolean;
  /** Dates a freeze covered. */
  frozen: string[];
  /** Days done out of the last 14 (today included). */
  last14: number;
}

/**
 * Never-miss-twice streak.
 * - A single missed day never ends the chain.
 * - Two misses in a row end it, unless the week's freeze (1 per Mon-Sun week) covers the second miss.
 * - Today is "pending" until it is done, so an unfinished today never counts as a miss.
 */
export function streakInfo(test: (d: Date) => boolean, today: Date, lookback = 400): StreakInfo {
  let chain = 0; let missRun = 0;
  const used = new Set<string>(); const frozen: string[] = [];
  for (let i = lookback; i >= 1; i--) {
    const d = plusDays(today, -i);
    if (test(d)) { chain += 1; missRun = 0; continue; }
    if (chain === 0) continue;
    const wk = weekKey(d);
    if (missRun >= 1 && !used.has(wk)) { used.add(wk); frozen.push(isoDay(d)); continue; }
    missRun += 1;
    if (missRun >= 2) { chain = 0; missRun = 0; }
  }
  if (test(today)) { chain += 1; missRun = 0; }
  let last14 = 0;
  for (let i = 0; i < 14; i++) if (test(plusDays(today, -i))) last14 += 1;
  return { streak: chain, missRun, freezeLeft: !used.has(weekKey(today)), frozen, last14 };
}

// ---------- Dad levels (advanced by XP) ----------
export const LEVELS: { name: string; xp: number; blurb: string }[] = [
  { name: "Rookie Dad", xp: 0, blurb: "Showing up is the whole game." },
  { name: "Steady Dad", xp: 500, blurb: "Small reps, most days." },
  { name: "Present Dad", xp: 1500, blurb: "Phone down, eyes up." },
  { name: "Dad Coach", xp: 3500, blurb: "You run the family huddle." },
  { name: "Legend Dad", xp: 7000, blurb: "The kids will remember this." },
];
export function levelOf(xp: number) {
  let i = 0;
  LEVELS.forEach((l, j) => { if (xp >= l.xp) i = j; });
  const cur = LEVELS[i]; const next = LEVELS[i + 1];
  const frac = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { idx: i, cur, next, frac, toNext: next ? next.xp - xp : 0 };
}
export const XP = { item: 10, full: 20, min: 10, chore: 10, reminder: 10, vitA: 5, hug: 5, connect: 10, checkin: 10, phoneUnder: 15, block: 5, workout: 40, workoutMin: 20, snack: 10, boss: 50, reset: 5 };
/** Daily caps so tapping +1 forever doesn't farm XP. */
export const CAP = { vitA: 10, hug: 10 };

// ---------- Variable rewards ----------
export const BADGES: { id: string; name: string; desc: string; icon: string }[] = [
  { id: "phonedown", name: "Phone down", desc: "Eyes up beat scrolling", icon: "phone" },
  { id: "huggernaut", name: "Huggernaut", desc: "Long hugs, no rush", icon: "hug" },
  { id: "vitamina", name: "Vitamin A dealer", desc: "Kind words handed out daily", icon: "heart" },
  { id: "showedup", name: "Showed up", desc: "Did the minimum on a meh day", icon: "check" },
  { id: "choreboss", name: "Chore boss", desc: "The house noticed", icon: "broom" },
  { id: "floorpro", name: "Floor pro", desc: "Down on the floor, playing", icon: "smile" },
  { id: "repairman", name: "Repair man", desc: "Owned it and made it right", icon: "shield" },
  { id: "ironDad", name: "Iron dad", desc: "Kettlebell reps stacking up", icon: "move" },
  { id: "nevertwice", name: "Never twice", desc: "Bounced back after a miss", icon: "trend" },
  { id: "calmcaptain", name: "Calm captain", desc: "Breathed before reacting", icon: "wind" },
  { id: "storyteller", name: "Storyteller", desc: "Bedtime stories on lock", icon: "book" },
  { id: "cleanstop", name: "Clean stop", desc: "Stopped when the plan said stop", icon: "timer" },
];
export const DAD_JOKES: string[] = [
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "I used to hate facial hair, but then it grew on me.",
  "What do you call a fake noodle? An impasta.",
  "Why did the scarecrow win an award? He was outstanding in his field.",
  "I only know 25 letters of the alphabet. I don't know y.",
  "What did the ocean say to the beach? Nothing, it just waved.",
  "Why can't a bicycle stand on its own? It's two tired.",
  "I would tell you a construction joke, but I'm still working on it.",
  "What do you call a bear with no teeth? A gummy bear.",
  "Did you hear about the kidnapping at school? It's fine, he woke up.",
  "Why did the kettlebell break up with the dumbbell? It needed more swing in its life.",
];
export const ADVENTURES: string[] = [
  "Flashlight walk around the block after dark.",
  "Living-room blanket fort + one movie, phones in another room.",
  "Backyard (or park) olympics: 5 silly events, homemade medals.",
  "Pancake art breakfast: everyone designs their own shape.",
  "Library trip: everyone picks one book for someone else.",
  "Sidewalk-chalk obstacle course, Dad has to do it too.",
  "Bike or scooter ride to get a treat.",
  "Indoor picnic on the floor, no table allowed.",
  "Nature scavenger hunt: 10 things, first to find them all picks dinner.",
  "Build the tallest tower you can from cups, blocks or pillows.",
  "Stargazing on a blanket for 15 minutes.",
  "Kids plan the whole Saturday morning (Dad says yes to 3 things).",
];
export const TREATS: string[] = [
  "Treat yourself: 20 guilt-free minutes of anything you like tonight.",
  "Treat yourself: your favorite coffee tomorrow morning.",
  "Treat yourself: a long hot shower with zero guilt.",
  "Treat yourself: pick the takeout this week.",
];
export interface Reward { kind: "badge" | "joke" | "adventure" | "treat"; id: string; title: string; body: string; icon: string; }
/** ~40% chance of a reward. `rnd` is injectable for tests. */
export function rollReward(owned: string[], rnd: () => number = Math.random): Reward | null {
  if (rnd() >= 0.4) return null;
  const left = BADGES.filter((b) => owned.indexOf(b.id) < 0);
  const kinds: Reward["kind"][] = left.length ? ["badge", "joke", "adventure", "treat"] : ["joke", "adventure", "treat"];
  const kind = kinds[Math.floor(rnd() * kinds.length) % kinds.length];
  if (kind === "badge") { const b = left[Math.floor(rnd() * left.length) % left.length]; return { kind, id: b.id, title: `Badge unlocked: ${b.name}`, body: `${b.desc}. It's on your badge shelf in More.`, icon: "award" }; }
  if (kind === "joke") { const i = Math.floor(rnd() * DAD_JOKES.length) % DAD_JOKES.length; return { kind, id: `joke${i}`, title: "Dad joke unlocked", body: DAD_JOKES[i], icon: "smile" }; }
  if (kind === "adventure") { const i = Math.floor(rnd() * ADVENTURES.length) % ADVENTURES.length; return { kind, id: `adv${i}`, title: "Mini family adventure unlocked", body: ADVENTURES[i], icon: "mapPin" }; }
  const i = Math.floor(rnd() * TREATS.length) % TREATS.length;
  return { kind, id: `treat${i}`, title: "Nice work", body: TREATS[i], icon: "gift" };
}

// ---------- Weekly family boss challenge (Sunday) ----------
export const BOSSES: { name: string; how: string }[] = [
  { name: "Phone-free family hour", how: "Every phone in a basket for 60 minutes. Board game, walk, or just hang out." },
  { name: "Family walk + one question each", how: "30-minute walk. Everyone asks one question nobody has asked before." },
  { name: "Cook dinner together", how: "Kids pick the meal, everyone gets one job, phones stay in the basket." },
  { name: "Screen-free game night", how: "Cards, board game or charades. Loser does the dishes with Dad." },
  { name: "Backyard or park olympics", how: "Five silly events, homemade medals, Dad competes too." },
  { name: "Gratitude round + dessert", how: "Everyone says three things they liked about the week, then dessert." },
];
export function bossOf(d: Date): { name: string; how: string } { const wk = Math.floor(dayIndex(plusDays(d, -((d.getDay() + 6) % 7))) / 7); return BOSSES[((wk % BOSSES.length) + BOSSES.length) % BOSSES.length]; }

// ---------- Connection content ----------
export const AFFIRMATIONS_KIDS: string[] = [
  "I love being your dad.", "I noticed how hard you tried on that.", "You make me laugh every day.", "I'm proud of how kind you were.",
  "You can do hard things.", "I love spending time with you.", "Nothing you do could make me stop loving you.", "I like the way your brain works.",
  "Thank you for helping, that made my day easier.", "You were brave today.", "Mistakes are how we learn. I make them too.", "I'm glad you're you.",
  "I believe in you.", "You have great ideas.",
];
export const AFFIRMATIONS_PARTNER: string[] = [
  "Thank you for everything you do for this family.", "I noticed how patient you were tonight.", "You're a great parent.", "I love doing life with you.",
  "I appreciate you, and I don't say it enough.", "You looked great today.", "I'm on your team.", "I'm proud of you.",
];
export const QUESTIONS: string[] = [
  "What made you laugh today?", "Who did you sit with at lunch?", "What was the hardest part of your day?", "What's something you learned that surprised you?",
  "If you were the teacher tomorrow, what would you teach?", "Who was kind to you today? Were you kind to someone?", "What was the best 5 minutes of your day?",
  "What's one thing you'd change about today?", "Did anything make you feel proud?", "What game did you play at recess?",
  "If you could have any superpower tomorrow, which one and why?", "What's something you're looking forward to this week?",
  "Was anyone left out today?", "What's a question you asked today?", "Rose, bud, thorn: one good thing, one you're excited for, one hard thing?",
  "If today was a color, what color was it?", "What's something that made you feel brave?", "What do you want to do together this weekend?",
  "What did you do today that helped someone?", "What's the funniest thing a friend said?", "Teach me one new word you heard today.",
];
export const GRATITUDE_PROMPTS: string[] = [
  "One thing that made you smile today.", "Someone who helped you today.", "Something about our home you love.", "A food you're grateful for.",
  "Something you're looking forward to.", "Something that was hard but went OK.", "A person in our family and why.",
];

// ---------- If-then plans ----------
export const IF_THEN_DEFAULT: string[] = [
  "If I walk in the door from work, then 10-second pause + one long hug before my phone.",
  "If I feel lazy, then I do just the minimum.",
  "If it's 9:00 PM, then phone goes on the charger outside the bedroom.",
  "If I snap at the kids, then I repair within the hour (\"I'm sorry I yelled, I love you\").",
  "If I miss a day, then tomorrow is the minimum, no catch-up.",
];

// ---------- Gentle patterns (no diagnoses) ----------
export interface CheckIn { mood?: number; energy?: number; focus?: number; irrit?: number; sleep?: number; meds?: "yes" | "no" | "na"; note?: string; }
/** Returns gentle, non-diagnostic pattern notes from check-ins (oldest -> newest), plus optional moved-day flags. */
export function patternNotes(checks: (CheckIn | undefined)[], moved?: boolean[]): string[] {
  const notes: string[] = [];
  const full = checks.filter((c): c is CheckIn => !!c);
  const roughSnappy = full.filter((c) => c.sleep !== undefined && c.sleep < 3 && c.irrit !== undefined && c.irrit >= 4).length;
  if (roughSnappy >= 2) notes.push("Rough sleep days tend to be snappier days; plan the minimum and protect bedtime.");
  const lowSleepFocus = full.filter((c) => c.sleep !== undefined && c.sleep < 3 && c.focus !== undefined && c.focus <= 2).length;
  if (lowSleepFocus >= 2) notes.push("Low-sleep days often line up with low focus. Put the one important task first on those days.");
  if (moved && moved.length === checks.length) {
    const a: number[] = []; const b: number[] = [];
    checks.forEach((c, i) => { if (c && c.mood !== undefined) (moved[i] ? a : b).push(c.mood); });
    if (a.length >= 3 && b.length >= 3) {
      const avg = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
      if (avg(a) - avg(b) >= 0.5) notes.push(`On days you moved, mood averaged ${avg(a).toFixed(1)} vs ${avg(b).toFixed(1)}. Even a 5-min snack counts.`);
    }
  }
  const over = full.filter((c) => c.irrit !== undefined && c.irrit >= 4).length;
  if (over >= 4 && full.length >= 7 && notes.length === 0) notes.push("Overwhelm has been high on several days. Smaller lists and a breathing reset may help.");
  return notes;
}

/** Parses "95", "1:35", "1h 35m", "1h", "35m" into minutes. */
export function parseMinutes(s: string): number | undefined {
  const t = (s || "").trim().toLowerCase();
  if (!t) return undefined;
  let m = t.match(/^(\d+):(\d{1,2})$/); if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = t.match(/^(?:(\d+)\s*h(?:rs?|ours?)?)?\s*(?:(\d+)\s*m(?:in(?:s|utes)?)?)?$/);
  if (m && (m[1] || m[2])) return Number(m[1] || 0) * 60 + Number(m[2] || 0);
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t));
  return undefined;
}
export function fmtMin(n: number): string { const h = Math.floor(n / 60); const m = Math.round(n % 60); return h ? `${h}h ${m}m` : `${m}m`; }

export const WHY_SOURCES: { title: string; site: string; href: string }[] = [
  { title: "Lally et al. 2010: How habits form in the real world (missing one day did not derail habit formation)", site: "doi.org", href: "https://doi.org/10.1002/ejsp.674" },
  { title: "Gawrilow & Gollwitzer 2008: If-then plans improve response inhibition in ADHD", site: "doi.org", href: "https://doi.org/10.1007/s10608-007-9150-1" },
  { title: "Exercise and executive function in adults with ADHD (meta-analysis)", site: "europepmc.org", href: "https://europepmc.org/article/med/41638541" },
  { title: "Time perception in ADHD (meta-analysis)", site: "pubmed.ncbi.nlm.nih.gov", href: "https://pubmed.ncbi.nlm.nih.gov/34923055/" },
  { title: "CHADD: ADHD and sleep disorders", site: "chadd.org", href: "https://chadd.org/about-adhd/adhd-and-sleep-disorders-diagnosis-and-management/" },
  { title: "Self-compassion and mental health in adults with ADHD", site: "pmc.ncbi.nlm.nih.gov", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9790285/" },
];

// ---------- Soft chime (Web Audio) ----------
let ac: any = null;
export function chime() {
  try {
    const C: any = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!C) return;
    ac = ac || new C();
    if (ac.state === "suspended") ac.resume();
    const t0 = ac.currentTime;
    [880, 1318.5].forEach((f, i) => {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      const s = t0 + i * 0.16;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.12, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.9);
      o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + 0.95);
    });
  } catch (_e) {}
}
export function buzz() { try { if ((globalThis as any).navigator && navigator.vibrate) navigator.vibrate([200, 80, 200]); } catch (_e) {} }
