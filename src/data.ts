// Content and defaults for ADHDad (no React).
import { CheckIn } from "./adhd";

export type Mode = "full" | "min";
export interface Chore { id: string; name: string; freq: "daily" | "weekly" | "days"; days: number[]; who: string; }
export interface Reminder { id: string; name: string; time: string; days: number[]; perKid?: boolean; }
export interface DayRec {
  c: Record<string, boolean>;
  mode: Record<string, Mode>;
  min: Record<string, boolean>;
  vitA?: number; hugs?: number;
  check?: CheckIn;
  screen?: { total?: number; social?: number };
  ex?: Record<string, boolean>;
}
export interface BrainItem { id: string; text: string; done?: boolean; }
export interface Store {
  v: 1;
  days: Record<string, DayRec>;
  chores: Chore[];
  reminders: Reminder[];
  ifThen: string[];
  brain: BrainItem[];
  badges: { id: string; date: string }[];
  rewards: { date: string; kind: string; id: string; title: string; body: string }[];
  startDate?: string;
}
export interface Ui {
  name?: string; kids: string[]; dark?: boolean; workoutDays: number[]; workoutTime: string; dinnerTime: string;
  socialTarget: number; kindSeen?: string; kidHelper?: boolean; breath?: "box" | "478";
}

export const STORE_KEY = "adhdad-v1";
export const UI_KEY = "adhdad-ui";
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const DEFAULT_UI: Ui = { kids: ["Kid 1", "Kid 2"], workoutDays: [1, 3, 5], workoutTime: "06:30", dinnerTime: "18:00", socialTarget: 45, breath: "box" };

export const DEFAULT_CHORES: Chore[] = [
  { id: "dishes", name: "Dishes", freq: "daily", days: [], who: "all" },
  { id: "laundry", name: "Laundry (one load, start to folded)", freq: "days", days: [1, 4], who: "dad" },
  { id: "trash", name: "Trash night: bins to the curb", freq: "days", days: [2], who: "dad" },
  { id: "tidy", name: "Tidy 10 min (timer on, everyone helps)", freq: "daily", days: [], who: "all" },
  { id: "bath", name: "Kids' bath", freq: "days", days: [0, 2, 4], who: "dad" },
  { id: "lunches", name: "Lunches for tomorrow", freq: "days", days: [0, 1, 2, 3, 4], who: "dad" },
  { id: "toys", name: "Pick up toys", freq: "daily", days: [], who: "kid0" },
  { id: "groceries", name: "Groceries", freq: "weekly", days: [6], who: "dad" },
  { id: "bills", name: "Bills check (10 min)", freq: "weekly", days: [0], who: "dad" },
  { id: "yard", name: "Yard", freq: "weekly", days: [6], who: "all" },
];

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: "school", name: "Check the school folder / app", time: "16:30", days: [1, 2, 3, 4, 5] },
  { id: "ask", name: "Ask about their day with a specific question", time: "17:30", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "special", name: "10 min 1-on-1 'special time'", time: "18:45", days: [0, 1, 2, 3, 4, 5, 6], perKid: true },
  { id: "good", name: "Catch them being good and say it", time: "19:00", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "story", name: "Read a bedtime story", time: "19:45", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "weekend", name: "Plan a weekend activity", time: "20:15", days: [4] },
  { id: "date", name: "Date night with your partner", time: "20:00", days: [5] },
];
export const REM_MIN: Record<string, number> = { special: 25, story: 20, date: 120, weekend: 15, ask: 15, school: 10, good: 10 };

/** Core daily checklist on Today. `min` = the Minimum version. */
export const TODAY_ITEMS: { key: string; label: string; min?: string; sub?: string }[] = [
  { key: "checkin", label: "30-second mind check-in", sub: "Mind tab, 6 taps" },
  { key: "move", label: "Move", min: "1 round / about 5 min" },
  { key: "rem:special", label: "10 min 1-on-1 special time with each kid", min: "2 min each: their choice, phone away" },
  { key: "vitA", label: "Vitamin A: 3 affirmations", min: "1 affirmation counts" },
  { key: "hug", label: "One 20-second hug", sub: "Tap to start the hug timer" },
  { key: "x:dinner", label: "Phone away at dinner", min: "Phone face-down for the first 10 min" },
  { key: "x:floor", label: "5-minute floor play", min: "2 minutes on the floor, their game" },
  { key: "t:charger", label: "9:00 PM: phone on the charger outside the bedroom" },
];
export const MINABLE = ["move", "rem:special", "vitA", "x:dinner", "x:floor"];

export const CONNECT_MOMENTS: { key: string; label: string; sub: string; timer?: number }[] = [
  { key: "x:floor", label: "5-minute floor play", sub: "Get on the floor, play their game, no phone", timer: 300 },
  { key: "rem:ask", label: "Ask the question of the day", sub: "" },
  { key: "x:gratitude", label: "Gratitude round at dinner", sub: "" },
  { key: "rem:good", label: "Catch them being good and say it", sub: "Name the exact thing they did" },
  { key: "rem:story", label: "Read a bedtime story", sub: "Phone in another room" },
];

// ---------- Move ----------
export interface Exercise { id: string; name: string; demo: string; dose: string; cue: string; kid: string; equip: string; }
export const EXERCISES: Record<string, Exercise> = {
  goblet: { id: "goblet", name: "Goblet squat", demo: "goblet", dose: "8-10 reps", cue: "Bell at the chest, sit between the hips, chest tall. Pain-free depth only.", kid: "Kid does air squats facing you and counts out loud.", equip: "Kettlebell or dumbbell" },
  kbdl: { id: "kbdl", name: "Kettlebell deadlift", demo: "kbdl", dose: "8-10 reps", cue: "Bell between the feet, push the hips back, flat back, stand tall.", kid: "Kid 'checks your back is flat like a table' and gives a thumbs up.", equip: "Kettlebell" },
  swing: { id: "swing", name: "Kettlebell swing (light)", demo: "swing", dose: "10-12 reps", cue: "Light bell, two hands. It's a hip snap, not a squat or an arm lift.", kid: "Kid stays well clear: they're the 'swing referee' and count from the couch.", equip: "Light kettlebell" },
  press: { id: "press", name: "Dumbbell floor press", demo: "press", dose: "8-10 reps", cue: "Lie on the floor, elbows about 45 degrees. The floor keeps shoulders safe.", kid: "Kid does push-ups off the couch next to you.", equip: "Two dumbbells" },
  row: { id: "row", name: "One-arm dumbbell row", demo: "row", dose: "8-10 / side", cue: "Hand on the couch, flat back, pull the bell to your hip pocket.", kid: "Kid 'rows' a backpack or water bottle beside you.", equip: "Dumbbell + couch or bench" },
  ohp: { id: "ohp", name: "Dumbbell overhead press", demo: "ohp", dose: "8 reps", cue: "Ribs down, press up without arching. Seated is fine.", kid: "Kid presses two stuffed animals overhead.", equip: "Two dumbbells, chair if seated" },
  lunge: { id: "lunge", name: "Reverse lunge", demo: "lunge", dose: "6-8 / side", cue: "Step back, lower the back knee gently. Hold a wall for balance.", kid: "Lunge-race down the hallway together (bodyweight).", equip: "Bodyweight or light dumbbells" },
  farmer: { id: "farmer", name: "Farmer carry", demo: "farmer", dose: "30-40 s", cue: "Bells at your sides, tall posture, short steps.", kid: "Kid carries two water bottles and walks behind you.", equip: "Two dumbbells or kettlebells" },
  bridge: { id: "bridge", name: "Glute bridge", demo: "bridge", dose: "12-15 reps", cue: "Push through the heels, squeeze at the top, lower slowly.", kid: "Make a 'bridge' and let them crawl under it (carefully).", equip: "Floor" },
  deadbug: { id: "deadbug", name: "Dead bug", demo: "deadbug", dose: "6-8 / side", cue: "Low back pressed down, reach opposite arm and leg slowly, exhale.", kid: "Kid does it next to you; whoever giggles first loses.", equip: "Floor" },
  plank: { id: "plank", name: "Plank", demo: "plank", dose: "20-30 s", cue: "Elbows under shoulders, body in one line. Knees down is fine.", kid: "Kid times you with a slow countdown.", equip: "Floor" },
  birddog: { id: "birddog", name: "Bird dog", demo: "birddog", dose: "6 / side", cue: "All fours, reach opposite arm and leg, slow, no wobble.", kid: "Balance a small toy on your back; kid checks it stays put.", equip: "Floor" },
  suitcase: { id: "suitcase", name: "Suitcase carry", demo: "suitcase", dose: "20-30 s / side", cue: "One bell in one hand, stay perfectly upright, switch halfway.", kid: "Kid carries a backpack in one hand and copies you.", equip: "One dumbbell or kettlebell" },
};
export const SNACK_MOVES: Exercise[] = [
  { id: "squat", name: "Bodyweight squats", demo: "squat", dose: "1 min, easy pace", cue: "Sit back like into a chair, chest tall.", kid: "", equip: "" },
  { id: "arms", name: "Arm circles", demo: "arms", dose: "1 min", cue: "Small to big, forward then back.", kid: "", equip: "" },
  { id: "catcow", name: "Cat-cow", demo: "catcow", dose: "1 min", cue: "Round up, then let the belly drop, with your breath.", kid: "", equip: "" },
  { id: "incpush", name: "Incline push-ups", demo: "incpush", dose: "1 min, easy reps", cue: "Hands on a counter, body in one line.", kid: "", equip: "" },
  { id: "wgs", name: "World's greatest stretch", demo: "wgs", dose: "1 min, alternate sides", cue: "Big lunge, elbow down, rotate and reach up.", kid: "", equip: "" },
];
export const WORKOUTS: { id: string; name: string; focus: string; ex: string[] }[] = [
  { id: "A", name: "Workout A", focus: "Squat + push", ex: ["goblet", "press", "bridge", "deadbug", "farmer"] },
  { id: "B", name: "Workout B", focus: "Hinge + pull", ex: ["kbdl", "row", "lunge", "plank", "suitcase"] },
  { id: "C", name: "Workout C", focus: "Swing + press", ex: ["swing", "ohp", "goblet", "birddog", "suitcase"] },
];
export const FULL = { warm: 3, rounds: 3, perEx: 1.2, cool: 2 };
export const MINV = { warm: 1, rounds: 1, perEx: 1, cool: 0 };

export const FALLBACK_TINY: string[] = [
  "Drink a full glass of water.", "Put 5 things back where they belong.", "Send one 'thinking of you' text to your partner.",
  "Clear one surface (just one).", "Stand up and do 10 slow squats.", "Step outside for 2 minutes of daylight.",
  "Give one kid a 20-second hug.", "Write the one thing that's bugging you in the brain dump.",
];
