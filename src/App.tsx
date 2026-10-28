// @ts-nocheck
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav, CARD, I, Icon, IconDot, MenuRow, NAV_BOTTOM, NAV_H, ScreenTitle, SectionTitle, StatCard, Bar, Chip, Thumb, Tick, WorkoutCard } from "./Shell";
import { Section, Segmented, Callout, BulletList, LinkCards, useGrokTheme } from "./kit";
import { DemoBlock, demoThumb } from "./Demo";
import { InspirePage, InspireCard } from "./Inspire";
import { FEDB_USED } from "./demos.generated";
import { streakInfo, isoDay, plusDays, weekKey, levelOf, LEVELS, XP, CAP, rollReward, BADGES, ADVENTURES, DAD_JOKES, IF_THEN_DEFAULT, WHY_SOURCES, AFFIRMATIONS_KIDS, AFFIRMATIONS_PARTNER, QUESTIONS, GRATITUDE_PROMPTS, bossOf, rotate, dayIndex, patternNotes, parseMinutes, fmtMin } from "./adhd";
import { Store, Ui, DayRec, Chore, Reminder, STORE_KEY, UI_KEY, DEFAULT_UI, DEFAULT_CHORES, DEFAULT_REMINDERS, REM_MIN, TODAY_ITEMS, MINABLE, CONNECT_MOMENTS, EXERCISES, SNACK_MOVES, WORKOUTS, FULL, MINV, DAY_SHORT, DAY_LONG, WEEK_ORDER, FALLBACK_TINY } from "./data";
import { useCloud } from "./sync/cloud";
import { AccountCard, HouseholdCard } from "./sync/AccountCard";
import { Ring, ModeSwitch, PillButton, TapItem, CapNote, NextChip, SessionTimer, TimerSheet, Toast, Rating, TrendChart, Breather, ModeChip, DayPicker, fieldStyle, hm, fmtHour, fmtIn, mmss } from "./ui";

// ---------- storage ----------
function emptyStore(): Store { return { v: 1, days: {}, chores: DEFAULT_CHORES, reminders: DEFAULT_REMINDERS, ifThen: IF_THEN_DEFAULT, brain: [], badges: [], rewards: [] }; }
function normalize(p: any): Store {
  const e = emptyStore();
  return {
    v: 1, days: p && typeof p.days === "object" && p.days ? p.days : {},
    chores: Array.isArray(p?.chores) ? p.chores : e.chores, reminders: Array.isArray(p?.reminders) ? p.reminders : e.reminders,
    ifThen: Array.isArray(p?.ifThen) ? p.ifThen : e.ifThen, brain: Array.isArray(p?.brain) ? p.brain : [],
    badges: Array.isArray(p?.badges) ? p.badges : [], rewards: Array.isArray(p?.rewards) ? p.rewards : [], startDate: p?.startDate,
  };
}
function loadStore(): { store: Store; ok: boolean } {
  try { const raw = window.localStorage.getItem(STORE_KEY); return { store: raw ? normalize(JSON.parse(raw)) : emptyStore(), ok: true }; } catch (_e) { return { store: emptyStore(), ok: false }; }
}
function normUi(u: any): Ui { const d = DEFAULT_UI; return { ...d, ...(u || {}), kids: Array.isArray(u?.kids) && u.kids.length ? u.kids : d.kids, workoutDays: Array.isArray(u?.workoutDays) ? u.workoutDays : d.workoutDays }; }
function loadUi(): Ui { try { return normUi(JSON.parse(window.localStorage.getItem(UI_KEY) || "{}")); } catch (_e) { return normUi({}); } }
const EMPTY_DAY: DayRec = { c: {}, mode: {}, min: {} };
function uid(): string { return Math.random().toString(36).slice(2, 9); }
function shortDate(d: Date): string { return `${d.getMonth() + 1}/${d.getDate()}`; }

// ---------- scoring ----------
function isWorkoutDay(ui: Ui, d: Date): boolean { return ui.workoutDays.indexOf(d.getDay()) >= 0; }
function workoutFor(ui: Ui, d: Date) {
  const order = WEEK_ORDER.filter((x) => ui.workoutDays.indexOf(x) >= 0);
  const i = order.indexOf(d.getDay());
  const wk = Math.floor(dayIndex(plusDays(d, -((d.getDay() + 6) % 7))) / 7);
  return WORKOUTS[((Math.max(0, i) + wk * order.length) % WORKOUTS.length + WORKOUTS.length) % WORKOUTS.length];
}
function choreDue(ch: Chore, d: Date): boolean { return ch.freq === "daily" || ch.freq === "weekly" || (ch.freq === "days" && ch.days.indexOf(d.getDay()) >= 0); }
function weeklyDoneOn(store: Store, ch: Chore, d: Date): string | null {
  const start = new Date(weekKey(d) + "T00:00:00");
  for (let i = 0; i < 7; i++) { const x = plusDays(start, i); const r = store.days[isoDay(x)]; if (r && r.c[`chore:${ch.id}`]) return isoDay(x); }
  return null;
}
function isCheckDone(c: any): boolean { return !!c && ["mood", "energy", "focus", "irrit", "sleep"].every((k) => typeof c[k] === "number"); }
function doneCount(rec?: DayRec): number { if (!rec) return 0; return Object.keys(rec.c || {}).filter((k) => rec.c[k]).length + (rec.check && isCheckDone(rec.check) ? 1 : 0) + ((rec.vitA || 0) > 0 ? 1 : 0) + ((rec.hugs || 0) > 0 ? 1 : 0); }
/** A day counts for the streak when any Minimum is done, or 3+ things are ticked. */
function dayCounts(store: Store, d: Date): boolean { const r = store.days[isoDay(d)]; if (!r) return false; if (r.min && Object.values(r.min).some((v) => !!v)) return true; return doneCount(r) >= 3; }
function computeXp(store: Store, ui: Ui): number {
  let xp = 0;
  Object.keys(store.days).forEach((date) => {
    const r = store.days[date]; if (!r) return;
    Object.keys(r.c || {}).forEach((k) => {
      if (!r.c[k]) return; const isMin = r.min && r.min[k];
      if (k === "move") xp += isMin ? XP.workoutMin : XP.workout;
      else if (k === "snack") xp += isMin ? XP.min / 2 : XP.snack;
      else if (k === "boss") xp += XP.boss;
      else if (k.startsWith("b:")) xp += XP.block;
      else if (k.startsWith("chore:")) xp += XP.chore;
      else if (k.startsWith("rem:")) xp += XP.reminder;
      else if (k.startsWith("reset:")) xp += XP.reset;
      else if (MINABLE.indexOf(k) >= 0) xp += isMin ? XP.min : XP.full;
      else xp += XP.item;
    });
    xp += Math.min(CAP.vitA, r.vitA || 0) * XP.vitA + Math.min(CAP.hug, r.hugs || 0) * XP.hug;
    if (isCheckDone(r.check)) xp += XP.checkin;
    if (r.screen && typeof r.screen.social === "number" && r.screen.social <= ui.socialTarget) xp += XP.phoneUnder;
  });
  return xp;
}

// ---------- small views ----------
function Card(props: { children: any; pad?: number; style?: any }) { return <div style={{ ...CARD, padding: props.pad ?? 16, display: "grid", gap: 12, ...(props.style || {}) }}>{props.children}</div>; }
function Label(props: { children: any }) { return <div style={{ fontSize: 12.5, color: "var(--text3)" }}>{props.children}</div>; }
function Counter(props: { icon: string; label: string; value: number; onPlus: () => void; onMinus: () => void }) {
  return (
    <div style={{ ...CARD, padding: 14, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)", fontWeight: 500 }}><IconDot name={props.icon} tone="accent" size={28} />{props.label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums", flex: 1 }}>{props.value}</span>
        <button onClick={props.onMinus} aria-label={`Remove one ${props.label}`} style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "var(--fill2)", color: "var(--text2)", fontSize: 18, cursor: "pointer" }}>−</button>
        <button onClick={props.onPlus} aria-label={`Add one ${props.label}`} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "var(--ink)", color: "var(--on-ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{I("plus", 18, 2.2)}</button>
      </div>
    </div>
  );
}
function MiniBars(props: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...props.values);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 64 }}>
      {props.values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 10, color: "var(--text3)" }}>{v || ""}</div>
          <div style={{ width: "100%", height: `${(v / max) * 60}%`, minHeight: 3, borderRadius: 5, background: i === props.values.length - 1 ? "var(--ink)" : v ? "var(--accent)" : "var(--fill2)" }} />
          <div style={{ fontSize: 10.5, color: "var(--text3)" }}>{props.labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

function BackupBox(props: { store: Store; ui: Ui; onImport: (s: Store, u?: Ui) => void }) {
  const [msg, setMsg] = useState<string>("");
  const doExport = () => {
    const blob = new Blob([JSON.stringify({ app: "adhdad", version: 1, exportedAt: new Date().toISOString(), data: props.store, ui: props.ui }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `adhdad-backup-${isoDay(new Date())}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg("Backup file saved. Keep it in Files or Google Drive.");
  };
  const doImport = (f?: File) => {
    if (!f) return; const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result)); const data = parsed && parsed.data ? parsed.data : parsed;
        if (!data || typeof data !== "object" || !("days" in data) || !("chores" in data)) throw new Error("bad");
        if (!window.confirm("Replace everything in ADHDad with this backup?")) return;
        props.onImport(normalize(data), parsed.ui ? normUi(parsed.ui) : undefined); setMsg("Backup restored.");
      } catch (_e) { setMsg("That file isn't an ADHDad backup."); }
    };
    r.readAsText(f);
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <PillButton full label="Export backup (JSON)" icon="download" onClick={doExport} />
      <label style={{ minHeight: 48, borderRadius: 999, background: "var(--fill2)", color: "var(--text)", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        Import backup
        <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { doImport(e.target.files ? e.target.files[0] : undefined); e.target.value = ""; }} />
      </label>
      {msg && <div style={{ fontSize: 13.5, color: "var(--link)" }}>{msg}</div>}
    </div>
  );
}

const CHECK_FIELDS: { k: string; label: string; low: string; high: string }[] = [
  { k: "mood", label: "Mood", low: "low", high: "great" },
  { k: "energy", label: "Energy", low: "drained", high: "charged" },
  { k: "focus", label: "Focus", low: "scattered", high: "locked in" },
  { k: "irrit", label: "Irritability / overwhelm", low: "calm", high: "a lot" },
  { k: "sleep", label: "Sleep last night", low: "rough", high: "great" },
];

export default function App() {
  const initial = useMemo(() => loadStore(), []);
  const [store, setStore] = useState<Store>(initial.store);
  const [saved, setSaved] = useState<boolean>(initial.ok);
  const [ui, setUi] = useState<Ui>(loadUi());
  const [now, setNow] = useState<Date>(new Date());
  const [nav, setNav] = useState<string>("home");
  // Opening page: daily inspiration, shown on the first launch of each day (flag lives in adhdad-ui).
  // Optional cloud sync (Settings › Account). Local-first: works without signing in.
  const cloud = useCloud("adhdad", store, ui, (s, u) => { setStore(s); setUi(u); }, normalize, normUi);
  const [inspire, setInspire] = useState<"open" | "view" | null>(() => (loadUi().inspireSeen === isoDay(new Date()) ? null : "open"));
  const [page, setPage] = useState<string | null>(null);
  const [famTab, setFamTab] = useState<string>("chores");
  const [mindTab, setMindTab] = useState<string>("checkin");
  const [moveDetail, setMoveDetail] = useState<string | null>(null);
  const [timerStart, setTimerStart] = useState<{ id: string; at: number } | null>(null);
  const [toasts, setToasts] = useState<any[]>([]);
  const [sheet, setSheet] = useState<any>(null);
  const [nameSheet, setNameSheet] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>("");
  const [editChores, setEditChores] = useState<boolean>(false);
  const [editRems, setEditRems] = useState<boolean>(false);
  const [ifEdit, setIfEdit] = useState<boolean>(false);
  const [qOff, setQOff] = useState<number>(0);
  const [span, setSpan] = useState<number>(14);
  const [brainDraft, setBrainDraft] = useState<string>("");
  const [oneTask, setOneTask] = useState<string | null>(null);
  const [openEx, setOpenEx] = useState<string | null>(null);
  const todayIso = isoDay(now);
  const rec: DayRec = store.days[todayIso] || EMPTY_DAY;
  const [scrDraft, setScrDraft] = useState<{ total: string; social: string }>({ total: rec.screen?.total !== undefined ? fmtMin(rec.screen.total) : "", social: rec.screen?.social !== undefined ? fmtMin(rec.screen.social) : "" });

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    const onVis = () => { if (document.visibilityState === "visible") setNow(new Date()); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  useEffect(() => { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(store)); setSaved(true); } catch (_e) { setSaved(false); } }, [store]);
  useEffect(() => { try { window.localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (_e) {} document.documentElement.setAttribute("data-theme", ui.dark ? "dark" : "light"); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", ui.dark ? "#0e100f" : "#f4f6f5"); }, [ui]);
  useEffect(() => { window.scrollTo(0, 0); }, [nav, page, moveDetail, famTab, mindTab]);
  useEffect(() => { if (!store.startDate) setStore((s) => ({ ...s, startDate: todayIso })); }, []);

  const xp = computeXp(store, ui);
  const lvl = levelOf(xp);
  const lvlRef = useRef<number>(lvl.idx);
  const pushToast = (t: any) => setToasts((q) => [...q, t].slice(-3));
  useEffect(() => { if (lvl.idx > lvlRef.current) pushToast({ title: `Level up: ${lvl.cur.name}`, body: lvl.cur.blurb, icon: "trophy", meta: `LEVEL ${lvl.idx + 1}` }); lvlRef.current = lvl.idx; }, [lvl.idx]);
  const kidName = (i: number) => (ui.kids[i] || "").trim() || `Kid ${i + 1}`;
  const momName = ((cloud.members.find((m) => m.app === "adhdiva") || {}) as any).display_name || "Mom";
  const whoLabel = (w: string) => (w === "dad" ? (ui.name || "Dad") : w === "mom" ? momName : w === "all" ? "Everyone" : w.startsWith("kid") ? kidName(Number(w.slice(3))) : w);

  // ---------- day mutations ----------
  const patchDay = (fn: (r: DayRec) => DayRec, date = todayIso) => setStore((s) => { const cur = s.days[date] || EMPTY_DAY; return { ...s, days: { ...s.days, [date]: fn({ ...cur, c: { ...cur.c }, mode: { ...(cur.mode || {}) }, min: { ...(cur.min || {}) } }) } }; });
  const modeOf = (k: string) => (rec.mode && rec.mode[k]) || "full";
  const setMode = (k: string, m: "full" | "min") => patchDay((r) => ({ ...r, mode: { ...r.mode, [k]: m } }));
  const reward = (xpGain: number) => {
    const owned = (store.badges || []).map((b) => b.id);
    const r = rollReward(owned);
    if (!r) return;
    setStore((s) => ({ ...s, rewards: [...s.rewards, { date: todayIso, kind: r.kind, id: r.id, title: r.title, body: r.body }], badges: r.kind === "badge" ? [...s.badges, { id: r.id, date: todayIso }] : s.badges }));
    pushToast({ title: r.title, body: r.body, icon: r.icon, meta: `+${xpGain} XP · BONUS` });
  };
  const toggle = (k: string, xpGain = 10, forceMin?: boolean) => {
    const on = !rec.c[k];
    const isMin = forceMin !== undefined ? forceMin : modeOf(k) === "min";
    patchDay((r) => ({ ...r, c: { ...r.c, [k]: on }, min: { ...r.min, [k]: on && isMin && (MINABLE.indexOf(k) >= 0 || k === "move" || k === "snack") } }));
    if (on) reward(xpGain);
  };
  const addCount = (field: "vitA" | "hugs", d: number) => {
    const before = rec[field] || 0;
    patchDay((r) => ({ ...r, [field]: Math.max(0, (r[field] || 0) + d) }));
    if (d > 0 && before === 0) reward(5);
  };
  const remKidKey = (id: string, i: number) => `rem:${id}:${i}`;
  const specialDone = ui.kids.length > 0 && ui.kids.every((_, i) => rec.c[remKidKey("special", i)]);
  const specialAny = ui.kids.some((_, i) => rec.c[remKidKey("special", i)]);
  const toggleSpecialAll = () => {
    const on = !specialDone; const isMin = modeOf("rem:special") === "min";
    patchDay((r) => { const c = { ...r.c }; ui.kids.forEach((_, i) => { c[remKidKey("special", i)] = on; }); return { ...r, c, min: { ...r.min, "rem:special": on && isMin } }; });
    if (on) reward(10);
  };

  // ---------- derived ----------
  const dow = now.getDay();
  const hourNow = now.getHours() + now.getMinutes() / 60;
  const wDay = isWorkoutDay(ui, now);
  const workout = workoutFor(ui, now);
  const moveKey = wDay ? "move" : "snack";
  const moveMode = modeOf(moveKey);
  const vitTarget = modeOf("vitA") === "min" ? 1 : 3;
  const dueChores = store.chores.filter((ch) => choreDue(ch, now) && !(ch.freq === "weekly" && weeklyDoneOn(store, ch, now) && weeklyDoneOn(store, ch, now) !== todayIso));
  const otherChores = store.chores.filter((ch) => dueChores.indexOf(ch) < 0);
  const remsToday = store.reminders.filter((r) => r.days.indexOf(dow) >= 0).sort((a, b) => hm(a.time) - hm(b.time));
  const remDone = (r: Reminder) => (r.perKid ? ui.kids.every((_, i) => rec.c[remKidKey(r.id, i)]) : !!rec.c[`rem:${r.id}`]);
  const dayInfo = streakInfo((d) => dayCounts(store, d), now);
  const todayCounts = dayCounts(store, now);
  const hadHistory = Object.keys(store.days).some((k) => k < isoDay(plusDays(now, -1)) && dayCounts(store, new Date(k + "T00:00:00")));
  const missedYesterday = !dayCounts(store, plusDays(now, -1));
  const showKind = hadHistory && missedYesterday && !todayCounts && ui.kindSeen !== todayIso;
  const question = rotate(QUESTIONS, now, qOff);
  const boss = bossOf(now);
  const isSunday = dow === 0;

  const wPlan = (mode: string) => { const P = mode === "min" ? MINV : FULL; const exs = workout.ex.map((id) => EXERCISES[id]); const items: { name: string; min: number }[] = [{ name: mode === "min" ? "Warm-up: 30 s squats + 30 s arm circles" : "Warm-up: squats, arm circles, cat-cow", min: P.warm }]; for (let r = 1; r <= P.rounds; r++) exs.forEach((e) => items.push({ name: `${P.rounds > 1 ? `Round ${r} · ` : ""}${e.name} (${e.dose})`, min: P.perEx })); if (P.cool) items.push({ name: "Cool-down: child's pose + hip flexor stretch", min: P.cool }); return { items, total: items.reduce((a, b) => a + b.min, 0) }; };
  const snackPlan = (mode: string) => { const items = mode === "min" ? [{ name: "Bodyweight squats", min: 0.5 }, { name: "Incline push-ups", min: 0.5 }] : SNACK_MOVES.map((m) => ({ name: m.name, min: 1 })); return { items, total: items.reduce((a, b) => a + b.min, 0) }; };

  // schedule for Now / Next
  const sched: { t: number; dur: number; label: string }[] = [];
  sched.push(wDay ? { t: hm(ui.workoutTime), dur: Math.round(wPlan(moveMode).total), label: `${workout.name} · ${workout.focus}` } : { t: hm(ui.workoutTime), dur: 5, label: "5-min movement snack" });
  remsToday.forEach((r) => sched.push({ t: hm(r.time), dur: REM_MIN[r.id] || 15, label: r.name.replace(/'/g, "") }));
  sched.push({ t: hm(ui.dinnerTime), dur: 45, label: "Dinner: phones away + gratitude" });
  sched.push({ t: 21, dur: 10, label: "Phone on the charger" });
  sched.sort((a, b) => a.t - b.t);
  const nowBlock = [...sched].reverse().find((b) => b.t <= hourNow && hourNow < b.t + b.dur / 60) || null;
  const nextBlock = sched.find((b) => b.t > hourNow) || null;

  // today checklist
  const todayRows = TODAY_ITEMS.map((it) => {
    if (it.key === "move") return { ...it, key: moveKey, label: wDay ? `${workout.name}: ${workout.focus} (${Math.round(wPlan("full").total)} min)` : "5-min movement snack", min: wDay ? "1 round, about 6 min" : "1 min: squats + incline push-ups" };
    return it;
  });
  const rowDone = (k: string) => k === "checkin" ? isCheckDone(rec.check) : k === "vitA" ? (rec.vitA || 0) >= vitTarget : k === "hug" ? (rec.hugs || 0) > 0 : k === "rem:special" ? (modeOf(k) === "min" ? specialAny : specialDone) : !!rec.c[k];
  const todayDone = todayRows.filter((r) => rowDone(r.key)).length;

  const tapRow = (k: string) => {
    if (k === "checkin") { setNav("mind"); setMindTab("checkin"); setPage(null); return; }
    if (k === "vitA") { if ((rec.vitA || 0) >= vitTarget) addCount("vitA", -(rec.vitA || 0)); else addCount("vitA", 1); return; }
    if (k === "hug") { if ((rec.hugs || 0) > 0) addCount("hugs", -(rec.hugs || 0)); else setSheet({ kind: "hug" }); return; }
    if (k === "rem:special") { toggleSpecialAll(); return; }
    toggle(k, k === "move" ? (moveMode === "min" ? XP.workoutMin : XP.workout) : 10);
  };
  const startMinimum = () => { patchDay((r) => { const m = { ...r.mode }; [...MINABLE, "move", "snack"].forEach((k) => (m[k] = "min")); return { ...r, mode: m }; }); setUi({ ...ui, kindSeen: todayIso }); setPage(null); setNav("today"); };

  // top 3
  const whoRank = (w: string) => (w === "dad" ? 0 : w === "all" ? 1 : w === "mom" ? 3 : 2);
  const topChore = dueChores.filter((c) => !rec.c[`chore:${c.id}`]).sort((a, b) => whoRank(a.who) - whoRank(b.who))[0] || dueChores[0];
  const moment = rotate(CONNECT_MOMENTS, now);
  const momentLabel = moment.key === "rem:ask" ? `Ask: "${question}"` : moment.key === "x:gratitude" ? `Gratitude round: ${rotate(GRATITUDE_PROMPTS, now).toLowerCase()}` : moment.label;

  // ---------- reusable blocks ----------
  const ifLines = store.ifThen;
  const setIf = (lines: string[]) => setStore((s) => ({ ...s, ifThen: lines }));
  const ifThenCard = (
    <Section heading="If-then plans" caption="Decide once, then let the plan decide.">
      {ifEdit ? (
        <div style={{ display: "grid", gap: 10 }}>
          {ifLines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <textarea value={l} rows={2} aria-label={`If-then plan ${i + 1}`} onChange={(e) => { const c = [...ifLines]; c[i] = e.target.value; setIf(c); }} style={{ ...fieldStyle, fontSize: 15, lineHeight: "20px", resize: "vertical", fontFamily: "inherit" }} />
              <button onClick={() => setIf(ifLines.filter((_, j) => j !== i))} aria-label={`Delete plan ${i + 1}`} style={{ width: 38, height: 38, flex: "0 0 auto", borderRadius: 19, border: "none", background: "var(--fill2)", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 4 }}>{I("trash", 16)}</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton small soft icon="plus" label="Add plan" onClick={() => setIf([...ifLines, "If ..., then ..."])} />
            <PillButton small soft label="Reset defaults" onClick={() => setIf(IF_THEN_DEFAULT)} />
            <PillButton small label="Done" onClick={() => setIfEdit(false)} />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {ifLines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 14, background: "var(--bg)", fontSize: 14, lineHeight: "20px" }}>
              <span style={{ color: "var(--accent)", flex: "0 0 auto", paddingTop: 1 }}>{I("zap", 16)}</span><span>{l}</span>
            </div>
          ))}
          <div><PillButton small soft icon="edit" label="Edit plans" onClick={() => setIfEdit(true)} /></div>
        </div>
      )}
    </Section>
  );

  const kindCard = showKind ? (
    <Card pad={18}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <IconDot name="sun" tone="accent" size={40} />
        <div style={{ flex: 1, display: "grid", gap: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: "21px" }}>Missed days are data, not character.</div>
          <div style={{ fontSize: 14.5, lineHeight: "20px" }}>Today: just the minimum.</div>
          <div style={{ fontSize: 12.5, lineHeight: "17px", color: "var(--text3)" }}>{dayInfo.streak > 0 ? `Your chain is still alive (${dayInfo.streak} ${dayInfo.streak === 1 ? "day" : "days"}). A minimum today keeps it.` : "One minimum today starts a fresh chain. No catch-up needed."}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={startMinimum} style={{ flex: 1, minHeight: 46, borderRadius: 999, border: "none", background: "var(--ink)", color: "var(--on-ink)", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{I("play", 12)}Start minimum</button>
        <button onClick={() => setUi({ ...ui, kindSeen: todayIso })} style={{ minHeight: 46, padding: "0 18px", borderRadius: 999, border: "none", background: "var(--fill2)", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Not now</button>
      </div>
    </Card>
  ) : null;

  const bossCard = (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconDot name="trophy" tone="ink" size={42} />
        <div style={{ flex: 1 }}>
          <Label>{isSunday ? "Family boss challenge · today" : "Family boss challenge · this Sunday"}</Label>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: "21px" }}>{boss.name}</div>
        </div>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: "19px", color: "var(--text2)" }}>{boss.how}</div>
      {isSunday && (rec.c.boss ? <CapNote title={`Boss beaten: +${XP.boss} XP`} text="That's the memory they'll keep. Phones can come back now." /> : <PillButton full label={`Boss beaten (+${XP.boss} XP)`} icon="trophy" onClick={() => toggle("boss", XP.boss)} />)}
    </Card>
  );

  function reminderRow(r: Reminder, first: boolean) {
    const kids = r.perKid ? (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ui.kids.map((_, i) => { const on = !!rec.c[remKidKey(r.id, i)]; return <button key={i} aria-pressed={on} onClick={() => toggle(remKidKey(r.id, i), XP.reminder)} style={{ height: 32, padding: "0 12px", borderRadius: 999, border: "none", background: on ? "var(--accent)" : "var(--fill2)", color: on ? "#fff" : "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>{on ? I("check", 13, 2.5) : null}{kidName(i)}</button>; })}
      </div>
    ) : null;
    const sub = `${fmtHour(hm(r.time))}${r.id === "ask" ? ` · "${question}"` : ""}`;
    return <TapItem key={r.id} first={first} label={r.name} sub={sub} done={remDone(r)} onTap={() => toggleRemAll(r)} right={kids} action={r.id === "special" ? { label: "10 min", onClick: () => setSheet({ kind: "special" }) } : undefined} />;
  }
  function toggleRemAll(r: Reminder) {
    if (r.id === "special") { toggleSpecialAll(); return; }
    if (!r.perKid) { toggle(`rem:${r.id}`, XP.reminder); return; }
    const on = !remDone(r);
    patchDay((x) => { const c = { ...x.c }; ui.kids.forEach((_, i) => { c[remKidKey(r.id, i)] = on; }); return { ...x, c }; });
    if (on) reward(10);
  }

  // ---------- Home ----------
  const greet = hourNow < 12 ? "Good morning" : hourNow < 17 ? "Good afternoon" : "Good evening";
  const goMove = () => { setNav("move"); setMoveDetail(wDay ? "workout" : "snack"); };
  const homeScreen = (
    <Fragment>
      <div style={{ padding: "calc(env(safe-area-inset-top) + 16px) 0 2px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { setNameDraft(ui.name || ""); setNameSheet(true); }} aria-label="Edit your name" style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", padding: 0, textAlign: "left", color: "var(--text)", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: "34px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{`Hi, ${ui.name || "Dad"}`}</span><span style={{ color: "var(--text3)", flex: "0 0 auto" }}>{I("edit", 15)}</span></div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 1 }}>{`${greet} · ${DAY_LONG[dow]} ${shortDate(now)}`}</div>
        </button>
        <button onClick={() => setPage("more")} aria-label="More" style={{ width: 44, height: 44, borderRadius: 22, border: "none", background: "var(--card)", boxShadow: "var(--shadow)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto" }}>{I("more", 20)}</button>
      </div>
      <InspireCard onOpen={() => setInspire("view")} />
      {kindCard}
      <div style={{ borderRadius: 24, background: "var(--nav)", color: "#fff", padding: 18, display: "grid", gap: 12, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 22, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{I("award", 22)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, opacity: 0.65, letterSpacing: 0.4 }}>{`LEVEL ${lvl.idx + 1} OF ${LEVELS.length}`}</div>
            <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.3 }}>{lvl.cur.name}</div>
          </div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{xp}</div><div style={{ fontSize: 11, opacity: 0.65 }}>XP</div></div>
        </div>
        <Bar value={lvl.frac} height={6} track="rgba(255,255,255,0.16)" />
        <div style={{ fontSize: 12.5, opacity: 0.75 }}>{lvl.next ? `${lvl.toNext} XP to ${lvl.next.name} · ${lvl.cur.blurb}` : "Top level. The kids will remember this."}</div>
      </div>
      <div style={{ ...CARD, padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
        {nowBlock ? (
          <Ring frac={(nowBlock.t + nowBlock.dur / 60 - hourNow) / Math.max(0.01, nowBlock.dur / 60)} size={60} stroke={6}>
            <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: "17px" }}>{Math.max(0, Math.round((nowBlock.t + nowBlock.dur / 60 - hourNow) * 60))}</div>
            <div style={{ fontSize: 9.5, color: "var(--text3)" }}>min</div>
          </Ring>
        ) : <IconDot name="clock" tone="soft" size={46} />}
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          <Label>{nowBlock ? `Now · until ${fmtHour(nowBlock.t + nowBlock.dur / 60)}` : "Now · open time"}</Label>
          <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: "19px" }}>{nowBlock ? nowBlock.label : hourNow >= 21.2 ? "Wind down. Phone stays on the charger." : "Nothing scheduled. Pick one small thing."}</div>
          {nextBlock ? <div><NextChip label={nextBlock.label} mins={(nextBlock.t - hourNow) * 60} /></div> : null}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <StatCard icon="flame" label="Streak" value={`${dayInfo.streak}`} unit={dayInfo.streak === 1 ? "day" : "days"} detail={`${dayInfo.last14} of last 14 days`} />
        <StatCard icon="check" label="Today" value={`${todayDone}`} unit={`/ ${todayRows.length}`} detail={todayCounts ? "Counts for the streak" : "3 ticks = a day that counts"} onClick={() => setNav("today")} />
      </div>
      <SectionTitle>Today's top 3</SectionTitle>
      <div style={{ ...CARD, padding: "6px 16px" }}>
        {topChore && <TapItem first label={topChore.name} sub={`Chore · ${whoLabel(topChore.who)}`} done={!!rec.c[`chore:${topChore.id}`]} onTap={() => toggle(`chore:${topChore.id}`, XP.chore)} />}
        <TapItem first={!topChore} label={momentLabel} sub={`Connection${moment.sub ? ` · ${moment.sub}` : ""}`} done={!!rec.c[moment.key]} onTap={() => toggle(moment.key, 10)} action={moment.timer ? { label: "Timer", onClick: () => setSheet({ kind: "floor" }) } : undefined} />
        <TapItem label={wDay ? `${workout.name}: ${workout.focus}` : "5-min movement snack"} sub={`Move · ${moveMode === "min" ? "Minimum version" : wDay ? `${Math.round(wPlan("full").total)} min, kettlebell + dumbbells` : "bodyweight, anywhere"}`} done={!!rec.c[moveKey]} onTap={goMove} action={{ label: "Go", onClick: goMove }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Counter icon="heart" label="Vitamin A" value={rec.vitA || 0} onPlus={() => addCount("vitA", 1)} onMinus={() => addCount("vitA", -1)} />
        <Counter icon="hug" label="Long hugs" value={rec.hugs || 0} onPlus={() => setSheet({ kind: "hug" })} onMinus={() => addCount("hugs", -1)} />
      </div>
      {isSunday && bossCard}
      {!saved && <Callout tone="warning">This browser isn't saving data (private mode?). Export a backup from More.</Callout>}
    </Fragment>
  );

  // ---------- Today ----------
  const todayScreen = (
    <Fragment>
      <ScreenTitle title="Today" sub={`${DAY_LONG[dow]} ${shortDate(now)} · ${todayDone} of ${todayRows.length} done`} />
      <div style={{ ...CARD, padding: 16, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: "var(--text3)" }}><span>{todayCounts ? "This day counts. Anything else is bonus." : "3 ticks (or any Minimum) and today counts."}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{`${Math.round((todayDone / todayRows.length) * 100)}%`}</span></div>
        <Bar value={todayDone / todayRows.length} height={6} />
      </div>
      <div style={{ ...CARD, padding: "6px 16px" }}>
        {todayRows.map((it, i) => (
          <TapItem key={it.key} first={i === 0} label={it.key === "vitA" ? `Vitamin A: ${vitTarget} affirmation${vitTarget > 1 ? "s" : ""} (${rec.vitA || 0} so far)` : it.label} sub={it.sub}
            done={rowDone(it.key)} onTap={() => tapRow(it.key)}
            minText={it.min} mode={it.min ? modeOf(it.key) : undefined} onMode={it.min ? (m) => setMode(it.key, m) : undefined} minDone={!!rec.min[it.key]}
            action={it.key === moveKey ? { label: "Open", onClick: goMove } : it.key === "hug" ? { label: "20 s", onClick: () => setSheet({ kind: "hug" }) } : it.key === "x:floor" ? { label: "Timer", onClick: () => setSheet({ kind: "floor" }) } : undefined} />
        ))}
      </div>
      {todayDone === todayRows.length && <CapNote title="All done. Stop here." text="That's the whole list. Go be bored with your kids." />}
      <Section heading="Chores due today" caption={`${dueChores.filter((c) => rec.c[`chore:${c.id}`]).length} of ${dueChores.length} done · edit in Family`}>
        <div style={{ display: "grid", marginTop: -6, marginBottom: -6 }}>
          {dueChores.map((ch, i) => <TapItem key={ch.id} first={i === 0} label={ch.name} sub={`${whoLabel(ch.who)}${ch.freq === "weekly" ? " · once this week" : ""}`} done={!!rec.c[`chore:${ch.id}`]} onTap={() => toggle(`chore:${ch.id}`, XP.chore)} />)}
        </div>
      </Section>
      <Section heading="Reminders today">
        <div style={{ display: "grid", marginTop: -6, marginBottom: -6 }}>
          {remsToday.map((r, i) => reminderRow(r, i === 0))}
        </div>
      </Section>
      {ifThenCard}
    </Fragment>
  );

  // ---------- Family ----------
  const updChore = (id: string, p: Partial<Chore>) => setStore((s) => ({ ...s, chores: s.chores.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  const updRem = (id: string, p: Partial<Reminder>) => setStore((s) => ({ ...s, reminders: s.reminders.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  const whoOpts = ["dad", ...(cloud.household || store.chores.some((c) => c.who === "mom") ? ["mom"] : []), ...ui.kids.map((_, i) => `kid${i}`), "all"];
  const dayList = (days: number[]) => WEEK_ORDER.filter((d) => days.indexOf(d) >= 0).map((d) => DAY_SHORT[d]).join(", ");
  const freqText = (c: Chore) => (c.freq === "daily" ? "Daily" : c.freq === "weekly" ? "Weekly" : c.days.length === 7 ? "Daily" : dayList(c.days) || "No days set");
  const trashBtn = (label: string, onClick: () => void) => <button onClick={onClick} aria-label={label} style={{ width: 46, height: 46, flex: "0 0 auto", borderRadius: 23, border: "none", background: "var(--fill2)", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{I("trash", 17)}</button>;
  const listHead = (title: string, right: string) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 4px" }}><span style={{ fontSize: 17, fontWeight: 600 }}>{title}</span><span style={{ fontSize: 12.5, color: "var(--text3)" }}>{right}</span></div>;
  const choresView = !editChores ? (
    <Fragment>
      <div style={{ ...CARD, padding: "6px 16px" }}>
        {listHead("Due today", `${dueChores.filter((c) => rec.c[`chore:${c.id}`]).length} of ${dueChores.length} · +${XP.chore} XP each`)}
        {dueChores.map((ch, i) => <TapItem key={ch.id} first={i === 0} label={ch.name} sub={`${freqText(ch)} · ${whoLabel(ch.who)}`} done={!!rec.c[`chore:${ch.id}`]} onTap={() => toggle(`chore:${ch.id}`, XP.chore)} />)}
        {dueChores.length === 0 && <div style={{ padding: "8px 0 14px", color: "var(--text3)", fontSize: 14 }}>Nothing due. Enjoy it.</div>}
      </div>
      {otherChores.length > 0 && (
        <Section heading="Not today" caption={`${otherChores.length} on other days or done this week`} collapsible defaultOpen={false}>
          <div style={{ display: "grid", gap: 6 }}>{otherChores.map((ch) => <div key={ch.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, padding: "6px 0", borderTop: "1px solid var(--border)" }}><span>{ch.name}</span><span style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>{ch.freq === "weekly" && weeklyDoneOn(store, ch, now) ? "Done this week" : freqText(ch)}</span></div>)}</div>
        </Section>
      )}
      <PillButton full soft icon="edit" label="Edit chores" onClick={() => setEditChores(true)} />
    </Fragment>
  ) : (
    <Fragment>
      {store.chores.map((ch) => (
        <div key={ch.id} style={{ ...CARD, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={ch.name} aria-label="Chore name" onChange={(e) => updChore(ch.id, { name: e.target.value })} style={fieldStyle} />
            {trashBtn(`Delete ${ch.name}`, () => setStore((s) => ({ ...s, chores: s.chores.filter((c) => c.id !== ch.id) })))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[["daily", "Daily"], ["weekly", "Weekly"], ["days", "Specific days"]].map(([v, l]) => <ModeChip key={v} on={ch.freq === v} label={l} onClick={() => updChore(ch.id, { freq: v as any, days: v === "days" && ch.days.length === 0 ? [dow] : ch.days })} />)}</div>
          {ch.freq === "days" && <DayPicker value={ch.days} onChange={(v) => updChore(ch.id, { days: v })} />}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 12.5, color: "var(--text3)", marginRight: 2 }}>Who</span>{whoOpts.map((w) => <ModeChip key={w} on={ch.who === w} label={whoLabel(w)} onClick={() => updChore(ch.id, { who: w })} />)}</div>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <PillButton soft icon="plus" label="Add chore" onClick={() => setStore((s) => ({ ...s, chores: [...s.chores, { id: uid(), name: "New chore", freq: "daily", days: [], who: "dad" }] }))} />
        <PillButton label="Done" onClick={() => setEditChores(false)} />
      </div>
    </Fragment>
  );

  const remindersView = (
    <Fragment>
      <div style={{ ...CARD, padding: 18, display: "grid", gap: 10, background: "var(--accent-subtle)", boxShadow: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--link)", letterSpacing: 0.4 }}>{I("chat", 15)}QUESTION OF THE DAY</div>
        <div style={{ fontSize: 19, fontWeight: 600, lineHeight: "25px", letterSpacing: -0.2 }}>{question}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <PillButton small label={rec.c["rem:ask"] ? "Asked" : "I asked it"} icon="check" onClick={() => toggle("rem:ask", XP.reminder)} />
          <PillButton small soft label="Another one" onClick={() => setQOff(qOff + 1)} />
        </div>
      </div>
      {!editRems ? (
        <Fragment>
          <div style={{ ...CARD, padding: "6px 16px" }}>
            {listHead("Today", `${remsToday.filter(remDone).length} of ${remsToday.length}`)}
            {remsToday.map((r, i) => reminderRow(r, i === 0))}
          </div>
          <Section heading="All reminders" caption="Time of day and which days" collapsible defaultOpen={false}>
            <div style={{ display: "grid", gap: 6 }}>{store.reminders.map((r) => <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, padding: "6px 0", borderTop: "1px solid var(--border)" }}><span>{r.name}</span><span style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>{`${fmtHour(hm(r.time))} · ${r.days.length === 7 ? "daily" : dayList(r.days)}`}</span></div>)}</div>
          </Section>
          <PillButton full soft icon="edit" label="Edit reminders" onClick={() => setEditRems(true)} />
        </Fragment>
      ) : (
        <Fragment>
          {store.reminders.map((r) => (
            <div key={r.id} style={{ ...CARD, padding: 14, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={r.name} aria-label="Reminder" onChange={(e) => updRem(r.id, { name: e.target.value })} style={fieldStyle} />
                {trashBtn(`Delete ${r.name}`, () => setStore((s) => ({ ...s, reminders: s.reminders.filter((c) => c.id !== r.id) })))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="time" value={r.time} aria-label="Time" onChange={(e) => updRem(r.id, { time: e.target.value || r.time })} style={{ ...fieldStyle, width: 140 }} />
                <ModeChip on={!!r.perKid} label="Each kid" onClick={() => updRem(r.id, { perKid: !r.perKid })} />
              </div>
              <DayPicker value={r.days} onChange={(v) => updRem(r.id, { days: v })} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <PillButton soft icon="plus" label="Add reminder" onClick={() => setStore((s) => ({ ...s, reminders: [...s.reminders, { id: uid(), name: "New reminder", time: "18:00", days: [0, 1, 2, 3, 4, 5, 6] }] }))} />
            <PillButton label="Done" onClick={() => setEditRems(false)} />
          </div>
        </Fragment>
      )}
    </Fragment>
  );

  const last7 = [6, 5, 4, 3, 2, 1, 0].map((i) => plusDays(now, -i));
  const affK = [0, 1, 2].map((o) => rotate(AFFIRMATIONS_KIDS, now, o * 5));
  const affP = rotate(AFFIRMATIONS_PARTNER, now);
  const quote = (text: string, to: string, i: number) => <div key={i} style={{ padding: "10px 12px", borderRadius: 14, background: "var(--bg)", fontSize: 14.5, lineHeight: "20px" }}>{`"${text}"`}<span style={{ color: "var(--text3)", fontSize: 12 }}>{`  · to ${to}`}</span></div>;
  const bigCount = (n: number) => <div style={{ textAlign: "right" }}><div style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: "28px" }}>{n}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>today</div></div>;
  const connectView = (
    <Fragment>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconDot name="heart" tone="accent" size={42} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Vitamin A (affirmation)</div><Label>Say one out loud, then tap +1</Label></div>
          {bigCount(rec.vitA || 0)}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {affK.map((a, i) => quote(a, kidName(i % ui.kids.length), i))}
          {quote(affP, "your partner", 9)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <PillButton icon="plus" label="Gave one" onClick={() => addCount("vitA", 1)} />
          <PillButton soft label="Undo" onClick={() => addCount("vitA", -1)} disabled={!rec.vitA} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>New affirmations every day.</div>
      </Card>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconDot name="hug" tone="accent" size={42} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>20-second hug</div><Label>Long enough for both of you to relax into it</Label></div>
          {bigCount(rec.hugs || 0)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PillButton icon="play" label="20-sec hug timer" onClick={() => setSheet({ kind: "hug" })} />
          <PillButton soft icon="plus" label="Log one" onClick={() => addCount("hugs", 1)} />
        </div>
      </Card>
      <div style={{ ...CARD, padding: "6px 16px" }}>
        <TapItem first label="Phone away at dinner" sub="In another room, not face-down on the table" done={!!rec.c["x:dinner"]} onTap={() => toggle("x:dinner", 10)} minText="Phone face-down for the first 10 min" mode={modeOf("x:dinner")} onMode={(m) => setMode("x:dinner", m)} minDone={!!rec.min["x:dinner"]} />
        <TapItem label="5-minute floor play" sub="Get on the floor, play their game" done={!!rec.c["x:floor"]} onTap={() => toggle("x:floor", 10)} action={{ label: "5 min", onClick: () => setSheet({ kind: "floor" }) }} />
        <TapItem label="Gratitude at dinner" sub={`Tonight: ${rotate(GRATITUDE_PROMPTS, now)}`} done={!!rec.c["x:gratitude"]} onTap={() => toggle("x:gratitude", 10)} />
      </div>
      <Section heading="Last 7 days" caption="Vitamin A's and hugs given">
        <div style={{ display: "grid", gap: 14 }}>
          <div><Label>Vitamin A</Label><MiniBars values={last7.map((d) => store.days[isoDay(d)]?.vitA || 0)} labels={last7.map((d) => DAY_SHORT[d.getDay()].slice(0, 1))} /></div>
          <div><Label>Hugs</Label><MiniBars values={last7.map((d) => store.days[isoDay(d)]?.hugs || 0)} labels={last7.map((d) => DAY_SHORT[d.getDay()].slice(0, 1))} /></div>
        </div>
      </Section>
      {bossCard}
    </Fragment>
  );

  const familyScreen = (
    <Fragment>
      <ScreenTitle title="Family" sub={`${ui.kids.map((_, i) => kidName(i)).join(" & ")} · rename kids in More › Settings`} />
      <Segmented options={[{ value: "chores", label: "Chores" }, { value: "reminders", label: "Parenting" }, { value: "connect", label: "Connect" }]} value={famTab} onChange={(v) => { setFamTab(v); setEditChores(false); setEditRems(false); }} />
      {famTab === "chores" && choresView}
      {famTab === "reminders" && remindersView}
      {famTab === "connect" && connectView}
    </Fragment>
  );

  // ---------- Move ----------
  const kidHelperNote = ui.kidHelper ? <Callout>Kid helper mode: kids join with bodyweight or a toy version, count reps, or referee. Keep them well clear of swinging bells.</Callout> : null;
  const exRow = (id: string, e: any, done: boolean, onTick?: () => void) => {
    const open = openEx === id;
    return (
      <div key={id} style={{ ...CARD, borderRadius: 18, padding: 10, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setOpenEx(open ? null : id)} aria-label={`Show ${e.name} demo`} style={{ border: "none", padding: 0, background: "transparent", cursor: "pointer", alignSelf: "flex-start" }}><Thumb src={demoThumb(e.demo)} size={60} /></button>
          <button onClick={() => setOpenEx(open ? null : id)} style={{ flex: 1, border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--text)", display: "grid", gap: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: "20px", color: done ? "var(--text3)" : "var(--text)" }}>{e.name}</span>
            <span style={{ fontSize: 12.5, color: "var(--text3)" }}>{e.dose}{e.equip ? ` · ${e.equip}` : ""}</span>
            <span style={{ fontSize: 13, lineHeight: "18px", color: "var(--text2)" }}>{e.cue}</span>
            {ui.kidHelper && e.kid && <span style={{ fontSize: 12.5, lineHeight: "17px", color: "var(--link)" }}>{`Kid helper: ${e.kid}`}</span>}
          </button>
          {onTick && <Tick done={done} onClick={onTick} label={done ? `Untick ${e.name}` : `Tick ${e.name}`} />}
        </div>
        {open && <DemoBlock id={e.demo} defaultOpen onClose={() => setOpenEx(null)} />}
      </div>
    );
  };
  const exDone = (id: string) => !!(rec.ex && rec.ex[id]);
  const tickEx = (id: string) => patchDay((r) => ({ ...r, ex: { ...(r.ex || {}), [id]: !(r.ex && r.ex[id]) } }));
  const detailView = () => {
    const isSnack = moveDetail === "snack";
    const key = isSnack ? "snack" : "move";
    const mode = modeOf(key);
    const plan = isSnack ? snackPlan(mode) : wPlan(mode);
    const list = isSnack ? (mode === "min" ? SNACK_MOVES.filter((m) => m.id === "squat" || m.id === "incpush") : SNACK_MOVES) : workout.ex.map((id) => EXERCISES[id]);
    const done = !!rec.c[key];
    const allTicked = list.every((e) => exDone(`${key}:${e.id}`));
    const timerId = `${key}:${mode}`;
    const xpG = isSnack ? (mode === "min" ? 5 : XP.snack) : mode === "min" ? XP.workoutMin : XP.workout;
    return (
      <Fragment>
        <ScreenTitle title={isSnack ? "Movement snack" : workout.name} sub={isSnack ? "5 minutes, bodyweight, anywhere" : `${workout.focus} · kettlebell, dumbbells, bodyweight`} onBack={() => { setMoveDetail(null); setOpenEx(null); }} />
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Today's version</div>
            <ModeSwitch mode={mode} onMode={(m) => { setMode(key, m); setTimerStart(null); }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <IconDot name={mode === "min" ? "zap" : "target"} tone={mode === "min" ? "accent" : "soft"} size={30} />
            <div style={{ flex: 1, display: "grid", gap: 2 }}>
              <Label>{mode === "min" ? "Minimum · counts as done for today and your streak" : "Full · switch to Minimum if today is hard"}</Label>
              <div style={{ fontSize: 14, lineHeight: "20px" }}>{isSnack ? (mode === "min" ? "1 minute: 30 s squats + 30 s incline push-ups." : "5 moves x 1 minute, easy pace. No sweat needed.") : mode === "min" ? `1 round of 5 moves, about ${Math.round(plan.total)} min.` : `3 rounds of 5 moves, about ${Math.round(plan.total)} min with warm-up and cool-down. Rest as needed.`}</div>
            </div>
          </div>
        </Card>
        <SessionTimer items={plan.items} totalMin={plan.total} startedAt={timerStart && timerStart.id === timerId ? timerStart.at : null} onStart={() => setTimerStart({ id: timerId, at: Date.now() })} onStop={() => setTimerStart(null)} />
        {!isSnack && <div style={{ ...CARD, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 500 }}>Do it with the kids</span><ModeChip on={!!ui.kidHelper} label={ui.kidHelper ? "Kid helper on" : "Kid helper off"} onClick={() => setUi({ ...ui, kidHelper: !ui.kidHelper })} /></div>}
        {!isSnack && kidHelperNote}
        <SectionTitle>{isSnack ? "Moves" : `Circuit${mode === "min" ? " · 1 round" : " · 3 rounds"}`}</SectionTitle>
        <div style={{ display: "grid", gap: 10 }}>{list.map((e) => exRow(`${key}:${e.id}`, e, exDone(`${key}:${e.id}`), () => tickEx(`${key}:${e.id}`)))}</div>
        {done ? <CapNote title={mode === "min" ? "Minimum done. That counts." : "Session done. Stop here."} text={isSnack ? "Movement snack logged. Back to your day." : "More today won't make you stronger; sleep and tomorrow's snack will."} /> : (
          <PillButton full label={`Done: ${mode === "min" ? "minimum" : "full"} (+${xpG} XP)`} icon="check" onClick={() => { toggle(key, xpG, mode === "min"); setTimerStart(null); }} />
        )}
        {done && <PillButton full soft label="Undo done" onClick={() => toggle(key)} />}
        {!done && allTicked && <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center" }}>All moves ticked. Tap Done to log it.</div>}
        <Callout>Joint-safe: light weights, pain-free range, 2-3 reps left in the tank. Sharp pain means stop. If you take ADHD medication, ask your doctor about timing and exercise.</Callout>
      </Fragment>
    );
  };
  const nextWorkoutDay = (() => { for (let i = 1; i <= 7; i++) { const d = plusDays(now, i); if (isWorkoutDay(ui, d)) return d; } return null; })();
  const weekStart = new Date(weekKey(now) + "T00:00:00");
  const exDoneN = workout.ex.filter((id) => exDone(`move:${id}`)).length;
  const moveScreen = moveDetail ? detailView() : (
    <Fragment>
      <ScreenTitle title="Move" sub="15-25 min at home · kettlebell, dumbbells, bodyweight" />
      <Card pad={14}>
        <Label>This week</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => { const date = plusDays(weekStart, i); const d = date.getDay(); const w = isWorkoutDay(ui, date) ? workoutFor(ui, date) : null; const r = store.days[isoDay(date)]; const ok = r && (r.c.move || r.c.snack); const isT = isoDay(date) === todayIso; return (
            <div key={i} style={{ display: "grid", justifyItems: "center", gap: 4, padding: "8px 0", borderRadius: 14, background: isT ? "var(--ink)" : "transparent", color: isT ? "var(--on-ink)" : "var(--text)" }}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{DAY_SHORT[d].slice(0, 2)}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{w ? w.id : "·"}</span>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: ok ? "var(--accent)" : "transparent" }} />
            </div>
          ); })}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>Letters = weights days (change in Settings). Every day: a 5-min movement snack.</div>
      </Card>
      {wDay ? (
        <WorkoutCard title={`Today: ${workout.name}`} badge={rec.c.move ? "Done" : moveMode === "min" ? "Minimum" : undefined} chips={[`${Math.round(wPlan(moveMode).total)} min`, `${workout.ex.length} moves`]} lines={[workout.focus, workout.ex.map((id) => EXERCISES[id].name).join(" · ")]} value={rec.c.move ? 1 : exDoneN / workout.ex.length} progressLabel={rec.c.move ? "Done" : `${exDoneN}/${workout.ex.length}`} thumb={demoThumb(EXERCISES[workout.ex[0]].demo)} onClick={() => setMoveDetail("workout")} />
      ) : (
        <div style={{ ...CARD, padding: 14, display: "flex", gap: 12, alignItems: "center" }}><IconDot name="calendar" size={40} /><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>No weights today</div><Label>{nextWorkoutDay ? `Next: ${workoutFor(ui, nextWorkoutDay).name} on ${DAY_LONG[nextWorkoutDay.getDay()]}` : "Pick workout days in Settings"}</Label></div></div>
      )}
      <WorkoutCard title="Movement snack" badge={rec.c.snack ? "Done" : "Daily"} chips={["5 min", "5 moves"]} lines={["Bodyweight, anywhere, no sweat", "Squats · arm circles · cat-cow · push-ups · stretch"]} value={rec.c.snack ? 1 : 0} progressLabel={rec.c.snack ? "Done" : "0/1"} thumb={demoThumb("wgs")} onClick={() => setMoveDetail("snack")} />
      <div style={{ ...CARD, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 500 }}>Kid helper mode</span><ModeChip on={!!ui.kidHelper} label={ui.kidHelper ? "On" : "Off"} onClick={() => setUi({ ...ui, kidHelper: !ui.kidHelper })} /></div>
      {kidHelperNote}
      <SectionTitle>All exercises</SectionTitle>
      <div style={{ display: "grid", gap: 10 }}>{Object.keys(EXERCISES).map((id) => exRow(`lib:${id}`, EXERCISES[id], false))}</div>
      <Callout>Beginner-friendly and joint-safe: start light, move slowly, stop 2-3 reps before it gets ugly. If you take ADHD medication, ask your doctor about timing and exercise.</Callout>
    </Fragment>
  );

  // ---------- Mind ----------
  const check = rec.check || {};
  const setCheck = (k: string, v: any) => {
    const wasDone = isCheckDone(rec.check);
    const next = { ...(rec.check || {}), [k]: v };
    patchDay((r) => ({ ...r, check: { ...(r.check || {}), [k]: v } }));
    if (!wasDone && isCheckDone(next)) reward(XP.checkin);
  };
  const days = Array.from({ length: span }, (_, i) => plusDays(now, i - span + 1));
  const dayLabels = days.map((d) => `${d.getMonth() + 1}/${d.getDate()}`);
  const series = (k: string) => days.map((d) => { const c = store.days[isoDay(d)]?.check; return c && typeof c[k] === "number" ? c[k] : null; });
  const notes = patternNotes(days.map((d) => store.days[isoDay(d)]?.check), days.map((d) => { const r = store.days[isoDay(d)]; return !!(r && (r.c.move || r.c.snack)); }));
  const noteCard = (title: string, tint: boolean) => notes.length > 0 ? <div style={{ ...CARD, padding: 16, display: "grid", gap: 8, ...(tint ? { background: "var(--accent-subtle)", boxShadow: "none" } : {}) }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 600 }}>{I("bulb", 18)}{title}</div>{notes.map((n, i) => <div key={i} style={{ fontSize: 14, lineHeight: "20px", color: "var(--text2)" }}>{n}</div>)}</div> : null;
  const checkinView = (
    <Fragment>
      <div style={{ ...CARD, padding: 16, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconDot name="mind" tone="accent" size={40} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>30-second check-in</div><Label>{isCheckDone(rec.check) ? `Saved · +${XP.checkin} XP` : "Tap a number for each. It saves as you go."}</Label></div>
          {isCheckDone(rec.check) && <span style={{ color: "var(--accent)" }}>{I("check", 22, 2.5)}</span>}
        </div>
        {CHECK_FIELDS.map((f) => <Rating key={f.k} label={f.label} low={f.low} high={f.high} value={check[f.k]} onPick={(n) => setCheck(f.k, n)} />)}
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>Meds taken</span><span style={{ fontSize: 11.5, color: "var(--text3)" }}>optional</span></div>
          <div style={{ display: "flex", gap: 6 }}>{[["yes", "Yes"], ["no", "No"], ["na", "N/A"]].map(([v, l]) => <ModeChip key={v} on={check.meds === v} label={l} onClick={() => setCheck("meds", check.meds === v ? undefined : v)} />)}</div>
        </div>
        <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>One line <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--text3)" }}>optional</span></span><input value={check.note || ""} maxLength={140} placeholder="e.g. short night, big meeting, kids sick" onChange={(e) => patchDay((r) => ({ ...r, check: { ...(r.check || {}), note: e.target.value } }))} style={fieldStyle} /></label>
      </div>
      {noteCard("Gentle pattern", false)}
    </Fragment>
  );
  const trendsView = (
    <Fragment>
      <Segmented options={[{ value: 14, label: "14 days" }, { value: 30, label: "30 days" }]} value={span} onChange={setSpan} />
      {notes.length > 0 ? noteCard("Patterns, not diagnoses", true) : <Callout>Patterns show up after a week or so of check-ins. These are notes, not diagnoses.</Callout>}
      {CHECK_FIELDS.map((f) => { const s = series(f.k); const vals = s.filter((v) => v !== null); const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "-"; return (
        <div key={f.k} style={{ ...CARD, padding: "14px 14px 8px", display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 15, fontWeight: 600 }}>{f.label}</span><span style={{ fontSize: 12.5, color: "var(--text3)", whiteSpace: "nowrap" }}>{`avg ${avg} · ${vals.length}/${span} days`}</span></div>
          <TrendChart name={f.label} values={s} labels={dayLabels} lo={1} hi={5} />
        </div>
      ); })}
    </Fragment>
  );
  const scr = rec.screen || {};
  const numSeries = (f: string) => days.map((d) => { const v = store.days[isoDay(d)]?.screen?.[f]; return typeof v === "number" ? v : null; });
  const socialSeries = numSeries("social");
  const totalSeries = numSeries("total");
  const saveScreen = () => {
    const total = parseMinutes(scrDraft.total); const social = parseMinutes(scrDraft.social);
    const wasUnder = typeof scr.social === "number" && scr.social <= ui.socialTarget;
    patchDay((r) => ({ ...r, screen: { total, social } }));
    setScrDraft({ total: total !== undefined ? fmtMin(total) : "", social: social !== undefined ? fmtMin(social) : "" });
    if (!wasUnder && typeof social === "number" && social <= ui.socialTarget) reward(XP.phoneUnder);
  };
  const phoneView = (
    <Fragment>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconDot name="phone" tone="accent" size={40} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Phone & social check</div><Label>{`Target: social under ${ui.socialTarget} min · +${XP.phoneUnder} XP when under`}</Label></div>
        </div>
        <div style={{ fontSize: 13, lineHeight: "18px", color: "var(--text2)", padding: "10px 12px", borderRadius: 14, background: "var(--bg)" }}>On your Samsung, <b>Settings › Digital Wellbeing and parental controls</b> shows today's screen time and minutes per app; tap an app › <b>App timer</b> to set a daily limit.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13, color: "var(--text3)" }}>Screen time today</span><input value={scrDraft.total} placeholder="e.g. 3h 20m" aria-label="Screen time today" onChange={(e) => setScrDraft({ ...scrDraft, total: e.target.value })} style={fieldStyle} /></label>
          <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13, color: "var(--text3)" }}>Social media</span><input value={scrDraft.social} placeholder="e.g. 40m" aria-label="Social media minutes today" onChange={(e) => setScrDraft({ ...scrDraft, social: e.target.value })} style={fieldStyle} /></label>
        </div>
        <PillButton full label="Save today's numbers" onClick={saveScreen} />
        {typeof scr.social === "number" && (scr.social <= ui.socialTarget ? <CapNote title={`Under target: ${fmtMin(scr.social)} of ${ui.socialTarget} min`} text={`+${XP.phoneUnder} XP. Your attention went to real life today.`} /> : <div style={{ padding: "12px 14px", borderRadius: 16, background: "var(--warn-bg)", fontSize: 13.5, lineHeight: "19px", color: "var(--text2)" }}>{`Social ${fmtMin(scr.social)} vs ${ui.socialTarget} min target. No shame, just data: try an App timer on the biggest app tonight.`}</div>)}
      </Card>
      <div style={{ ...CARD, padding: "6px 16px" }}>
        {listHead("Phone-free blocks", `+${XP.block} XP each`)}
        {[["b:wake", "Wake until after morning mobility"], ["b:dinner", "Dinner"], ["b:bed", "Bedtime hour"]].map(([k, l], i) => <TapItem key={k} first={i === 0} label={l} done={!!rec.c[k]} onTap={() => toggle(k, XP.block)} />)}
      </div>
      <Segmented options={[{ value: 14, label: "14 days" }, { value: 30, label: "30 days" }]} value={span} onChange={setSpan} />
      <div style={{ ...CARD, padding: "14px 14px 8px", display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Social media (min)</span><span style={{ fontSize: 12.5, color: "var(--text3)", whiteSpace: "nowrap" }}>{`${socialSeries.filter((v) => v !== null && v <= ui.socialTarget).length} days under`}</span></div>
        <TrendChart name="Social media minutes" values={socialSeries} labels={dayLabels} lo={0} hi={Math.ceil(Math.max(ui.socialTarget * 2, 30, ...socialSeries.filter((v) => v !== null)) / 30) * 30} target={ui.socialTarget} unit="m" height={130} />
      </div>
      <div style={{ ...CARD, padding: "14px 14px 8px", display: "grid", gap: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Total screen time (min)</div>
        <TrendChart name="Total screen time" values={totalSeries} labels={dayLabels} lo={0} hi={Math.ceil(Math.max(120, ...totalSeries.filter((v) => v !== null)) / 60) * 60} height={120} />
      </div>
    </Fragment>
  );
  const pickOne = () => {
    const c: string[] = [];
    todayRows.forEach((r) => { if (!rowDone(r.key) && r.key !== "t:charger" && r.key !== "checkin") c.push(r.min ? `Minimum: ${r.min}` : r.label); });
    dueChores.forEach((ch) => { if (!rec.c[`chore:${ch.id}`]) c.push(`Just 2 minutes of: ${ch.name.toLowerCase()}`); });
    store.brain.forEach((b) => { if (!b.done) c.push(b.text); });
    const pool = c.length ? c : FALLBACK_TINY;
    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && pick === oneTask) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    setOneTask(pick);
  };
  const addBrain = () => { const t = brainDraft.trim(); if (!t) return; setStore((s) => ({ ...s, brain: [{ id: uid(), text: t }, ...s.brain] })); setBrainDraft(""); };
  const resetView = (
    <Fragment>
      <Card pad={18}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><IconDot name="target" tone="ink" size={40} /><div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Overwhelmed? Pick ONE.</div><Label>One tiny next step. Ignore the rest for now.</Label></div></div>
        {oneTask && <div className="fadein" style={{ padding: "14px 16px", borderRadius: 16, background: "var(--accent-subtle)", fontSize: 16, fontWeight: 600, lineHeight: "22px" }}>{oneTask}</div>}
        <PillButton full label={oneTask ? "Pick a different one" : "Pick ONE for me"} icon="spark" onClick={pickOne} />
      </Card>
      <Card pad={18}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><IconDot name="wind" tone="accent" size={40} /><div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Breathing reset</div><Label>{`1-2 minutes · +${XP.reset} XP`}</Label></div></div>
        <Breather kind={ui.breath || "box"} onKind={(k) => setUi({ ...ui, breath: k })} onDone={() => { if (!rec.c["reset:breath"]) toggle("reset:breath", XP.reset); }} />
      </Card>
      <Card pad={18}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><IconDot name="note" tone="accent" size={40} /><div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Brain dump</div><Label>Get it out of your head. Saved on this phone.</Label></div></div>
        <form onSubmit={(e) => { e.preventDefault(); addBrain(); }} style={{ display: "flex", gap: 8 }}>
          <input value={brainDraft} onChange={(e) => setBrainDraft(e.target.value)} placeholder="Whatever's buzzing..." aria-label="Brain dump item" style={fieldStyle} />
          <button type="submit" style={{ minHeight: 46, padding: "0 18px", borderRadius: 999, border: "none", background: "var(--ink)", color: "var(--on-ink)", fontSize: 15, fontWeight: 600, cursor: "pointer", flex: "0 0 auto" }}>Add</button>
        </form>
        {store.brain.length > 0 && <div style={{ display: "grid" }}>{store.brain.map((b, i) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <Tick size={26} done={!!b.done} label={b.done ? `Untick ${b.text}` : `Tick ${b.text}`} onClick={() => setStore((s) => ({ ...s, brain: s.brain.map((x) => (x.id === b.id ? { ...x, done: !x.done } : x)) }))} />
            <span style={{ flex: 1, fontSize: 14.5, color: b.done ? "var(--text3)" : "var(--text)", textDecoration: b.done ? "line-through" : "none" }}>{b.text}</span>
            <button onClick={() => setStore((s) => ({ ...s, brain: s.brain.filter((x) => x.id !== b.id) }))} aria-label={`Delete ${b.text}`} style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: "transparent", color: "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{I("x", 15, 2)}</button>
          </div>
        ))}</div>}
        {store.brain.some((b) => b.done) && <div><PillButton small soft label="Clear done" onClick={() => setStore((s) => ({ ...s, brain: s.brain.filter((x) => !x.done) }))} /></div>}
      </Card>
    </Fragment>
  );
  const crisisCard = (
    <div style={{ padding: "14px 16px", borderRadius: 18, background: "var(--fill2)", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ color: "var(--text2)", paddingTop: 1 }}>{I("heart", 18)}</span>
      <div style={{ fontSize: 13.5, lineHeight: "19px", color: "var(--text2)" }}>If you're struggling, call or text <a href="tel:988" style={{ color: "var(--text)", fontWeight: 600 }}>988</a> (US). You don't have to be in crisis to reach out.</div>
    </div>
  );
  const mindScreen = (
    <Fragment>
      <ScreenTitle title="Mind" sub="ADHD check-ins · patterns, not diagnoses" />
      <Segmented options={[{ value: "checkin", label: "Check-in" }, { value: "trends", label: "Trends" }, { value: "phone", label: "Phone" }, { value: "reset", label: "Reset" }]} value={mindTab} onChange={setMindTab} />
      {mindTab === "checkin" && checkinView}
      {mindTab === "trends" && trendsView}
      {mindTab === "phone" && phoneView}
      {mindTab === "reset" && resetView}
      {crisisCard}
    </Fragment>
  );

  // ---------- More (opened from Home) ----------
  const owned = new Set(store.badges.map((b) => b.id));
  const advs = Array.from(new Set(store.rewards.filter((r) => r.kind === "adventure").map((r) => r.body)));
  const jokes = Array.from(new Set(store.rewards.filter((r) => r.kind === "joke").map((r) => r.body)));
  const moreTitles: Record<string, string> = { more: "More", settings: "Settings", badges: "Badge shelf", backup: "Backup", why: "Why it works", credits: "Credits" };
  const fieldLabel = (t: string) => <span style={{ fontSize: 13, color: "var(--text3)" }}>{t}</span>;
  const para = (children: any) => <div style={{ fontSize: 14, lineHeight: "20px", color: "var(--text2)" }}>{children}</div>;
  const moreScreen = page ? (
    <Fragment>
      <ScreenTitle title={moreTitles[page]} sub={page === "more" ? `${lvl.cur.name} · ${xp} XP` : undefined} onBack={() => setPage(page === "more" ? null : "more")} />
      {page === "more" && (
        <div style={{ display: "grid", gap: 10 }}>
          <MenuRow icon="sun" title="Daily inspiration" sub="Preach the Gospel, Psalm 103:13, Brunson, Mets" onClick={() => setInspire("view")} />
          <MenuRow icon="settings" title="Settings" sub={cloud.session ? `${cloud.email} · household, name, kids, dark mode` : "Sign in to sync, household, name, kids, dark mode"} onClick={() => setPage("settings")} />
          <MenuRow icon="award" title="Badge shelf" sub={`${owned.size} of ${BADGES.length} badges · ${advs.length} adventures`} onClick={() => setPage("badges")} />
          <MenuRow icon="download" title="Backup" sub="Export or import your data" onClick={() => setPage("backup")} />
          <MenuRow icon="bulb" title="Why it works" sub="The plain-language science" onClick={() => setPage("why")} />
          <MenuRow icon="info" title="Credits" sub="Exercise images and icons" onClick={() => setPage("credits")} />
          <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: 8 }}>{cloud.session ? "ADHDad · synced to your account · no tracking" : "ADHDad · everything stays on this phone · no tracking"}</div>
        </div>
      )}
      {page === "settings" && (
        <Fragment>
          <AccountCard cloud={cloud} appName="ADHDad" partnerApp="ADHDiva" />
          <HouseholdCard cloud={cloud} partnerApp="ADHDiva" />
          <Section heading="You">
            <label style={{ display: "grid", gap: 6 }}>{fieldLabel('Shown on Home as "Hi, ..."')}<input value={ui.name || ""} placeholder="Dad" onChange={(e) => setUi({ ...ui, name: e.target.value })} style={fieldStyle} /></label>
          </Section>
          <Section heading="Kids" caption="Used in chores, special time and affirmations">
            {ui.kids.map((k, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input value={k} aria-label={`Kid ${i + 1} name`} placeholder={`Kid ${i + 1}`} onChange={(e) => { const kids = [...ui.kids]; kids[i] = e.target.value; setUi({ ...ui, kids }); }} style={fieldStyle} />
                {ui.kids.length > 1 && trashBtn(`Remove ${kidName(i)}`, () => setUi({ ...ui, kids: ui.kids.filter((_, j) => j !== i) }))}
              </div>
            ))}
            <div><PillButton small soft icon="plus" label="Add a kid" onClick={() => setUi({ ...ui, kids: [...ui.kids, ""] })} /></div>
          </Section>
          <Section heading="Workouts" caption="Weights on these days; a 5-min snack every day">
            <DayPicker value={ui.workoutDays} onChange={(v) => setUi({ ...ui, workoutDays: v })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>{fieldLabel("Workout time")}<input type="time" value={ui.workoutTime} onChange={(e) => setUi({ ...ui, workoutTime: e.target.value || ui.workoutTime })} style={fieldStyle} /></label>
              <label style={{ display: "grid", gap: 6 }}>{fieldLabel("Dinner time")}<input type="time" value={ui.dinnerTime} onChange={(e) => setUi({ ...ui, dinnerTime: e.target.value || ui.dinnerTime })} style={fieldStyle} /></label>
            </div>
          </Section>
          <Section heading="Phone">
            <label style={{ display: "grid", gap: 6 }}>{fieldLabel("Daily social media target (minutes)")}<input value={String(ui.socialTarget)} inputMode="numeric" onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); setUi({ ...ui, socialTarget: isNaN(n) ? 0 : Math.min(600, n) }); }} style={fieldStyle} /></label>
          </Section>
          <Section heading="Look">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 15 }}>Dark mode</span><ModeChip on={!!ui.dark} label={ui.dark ? "On" : "Off"} onClick={() => setUi({ ...ui, dark: !ui.dark })} /></div>
          </Section>
        </Fragment>
      )}
      {page === "badges" && (
        <Fragment>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
            {BADGES.map((b) => { const on = owned.has(b.id); return (
              <div key={b.id} style={{ ...CARD, padding: "14px 8px", display: "grid", justifyItems: "center", gap: 6, textAlign: "center", opacity: on ? 1 : 0.5 }}>
                <IconDot name={on ? b.icon : "shield"} tone={on ? "ink" : "soft"} size={44} />
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: "17px" }}>{on ? b.name : "Locked"}</div>
                <div style={{ fontSize: 11.5, lineHeight: "15px", color: "var(--text3)" }}>{on ? b.desc : "Keep showing up"}</div>
              </div>
            ); })}
          </div>
          <Section heading="Mini family adventures" caption="Unlocked by rewards. Pick one for the weekend.">
            {advs.length ? <BulletList items={advs} /> : para("None yet. About 4 in 10 completions unlock a bonus.")}
          </Section>
          <Section heading="Dad jokes collected" collapsible defaultOpen={jokes.length > 0}>
            {jokes.length ? <BulletList items={jokes} /> : para("None yet.")}
          </Section>
          <Section heading="Dad levels">
            {LEVELS.map((l, i) => <div key={l.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderTop: i ? "1px solid var(--border)" : "none", fontWeight: i === lvl.idx ? 600 : 400 }}><span>{`${i + 1}. ${l.name}`}</span><span style={{ color: "var(--text3)" }}>{`${l.xp} XP`}</span></div>)}
          </Section>
        </Fragment>
      )}
      {page === "backup" && (
        <Section heading="Backup" caption={cloud.session ? "Your data also syncs to your account. A backup file is still a good safety net." : "Everything lives on this phone only unless you sign in to sync (Settings). Export now and then; import to restore or move to a new phone."}>
          <BackupBox store={store} ui={ui} onImport={(s, u) => { setStore(s); if (u) setUi(u); }} />
        </Section>
      )}
      {page === "why" && (
        <Fragment>
          <Section heading="The principles">
            <BulletList items={[
              "Never miss twice. Missing one day doesn't wreck a habit; a run of misses does. So after a miss, tomorrow is the minimum, not a catch-up marathon.",
              "Minimums beat motivation. One round, one affirmation or one hug keeps the chain alive on lazy days, and the chain is what builds the habit.",
              "If-then plans. Deciding \"if X, then Y\" ahead of time takes the decision out of the moment, which helps ADHD brains follow through.",
              "Make time visible. Rings, countdowns and the Next chip help with time blindness, so 'later' becomes an actual time.",
              "Move most days. Regular exercise is linked with better focus and executive function in adults with ADHD.",
              "Protect sleep. Sleep problems are common with ADHD and make everything harder, so the phone goes on the charger at 9.",
              "Be kind to yourself. Self-compassion is linked with better mental health in adults with ADHD. Missed days are data, not character.",
              "Variable rewards. A surprise badge, dad joke or family adventure about 4 in 10 times keeps a novelty-loving brain interested.",
            ]} />
          </Section>
          <Callout>If you take ADHD medication, ask your doctor about timing and exercise. ADHDad is a habit helper, not medical advice, and it doesn't diagnose anything.</Callout>
          <Section heading="Sources"><LinkCards links={WHY_SOURCES} /></Section>
        </Fragment>
      )}
      {page === "credits" && (
        <Fragment>
          <Section heading="Exercise images">
            {para(<Fragment>Demo images come from <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)" }}>free-exercise-db</a> by yuhonas, public domain under the Unlicense, turned into 2-frame animations. Used:</Fragment>)}
            <div style={{ fontSize: 13, lineHeight: "19px", color: "var(--text3)" }}>{FEDB_USED.join(" · ")}</div>
          </Section>
          <Section heading="Icons and design">{para("Line icons are inline SVGs adapted from Lucide (ISC license). The design system is shared with the Golf Speed Plan app.")}</Section>
          <Section heading="Privacy">{para("No analytics, no tracking. Your data is stored on this phone. If you sign in (optional), it is also saved to your own Supabase account; mood, check-ins, phone use and notes are visible only to you, and only chores and kids' names are shared with a household you join.")}</Section>
        </Fragment>
      )}
    </Fragment>
  ) : null;

  const sheetCfg = !sheet ? null : sheet.kind === "hug"
    ? { title: "20-second hug", sub: "Hold on until the chime. Breathe out together.", secs: 20, doneLabel: "+1 hug", onDone: () => addCount("hugs", 1) }
    : sheet.kind === "floor"
    ? { title: "5-minute floor play", sub: "Their game, their rules. Phone in another room.", secs: 300, doneLabel: "Log floor play", onDone: () => { if (!rec.c["x:floor"]) toggle("x:floor", 10); } }
    : { title: "10 min special time", sub: "One kid, their choice, no phone, no teaching.", secs: 600, doneLabel: "Done", onDone: () => {} };

  if (inspire) {
    const t = isoDay(new Date());
    return <InspirePage opening={inspire === "open"} dateLabel={`${DAY_LONG[new Date().getDay()]} ${shortDate(new Date())}`} onDone={() => { if (inspire === "open") { setNav("home"); setPage(null); } if (ui.inspireSeen !== t) setUi({ ...ui, inspireSeen: t }); setInspire(null); window.scrollTo(0, 0); }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main key={nav + (page || "") + (moveDetail || "")} className="fadein" style={{ maxWidth: 760, margin: "0 auto", padding: `0 16px calc(${NAV_BOTTOM} + ${NAV_H + 28}px)`, display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12 }}>
        {nav === "home" && !page && homeScreen}
        {nav === "home" && page && moreScreen}
        {nav === "today" && todayScreen}
        {nav === "family" && familyScreen}
        {nav === "move" && moveScreen}
        {nav === "mind" && mindScreen}
      </main>
      {toasts.length > 0 && <Toast key={toasts.length + toasts[0].title} t={toasts[0]} onClose={() => setToasts((q) => q.slice(1))} />}
      {sheetCfg && <TimerSheet {...sheetCfg} onClose={() => setSheet(null)} />}
      {nameSheet && (
        <div role="dialog" aria-modal="true" aria-label="Your name" onClick={() => setNameSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setUi({ ...ui, name: nameDraft.trim() }); setNameSheet(false); }} style={{ width: "100%", maxWidth: 520, background: "var(--card)", color: "var(--text)", borderRadius: "28px 28px 0 0", padding: "12px 20px calc(env(safe-area-inset-bottom) + 20px)", display: "grid", gap: 16, boxShadow: "0 -8px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)", margin: "0 auto" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconDot name="smile" tone="accent" size={52} />
              <div><div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -0.3 }}>What should we call you?</div><div style={{ fontSize: 13, color: "var(--text3)" }}>{`Shown on Home as "Hi, ${nameDraft.trim() || "Dad"}"`}</div></div>
            </div>
            <input autoFocus value={nameDraft} maxLength={30} placeholder="Dad" aria-label="Your name" onChange={(e) => setNameDraft(e.target.value)} style={{ minHeight: 50, fontSize: 17, padding: "0 16px", borderRadius: 14, border: "none", background: "var(--fill2)", color: "var(--text)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => setNameSheet(false)} style={{ minHeight: 50, borderRadius: 25, border: "none", background: "var(--fill2)", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="submit" style={{ minHeight: 50, borderRadius: 25, border: "none", background: "var(--ink)", color: "var(--on-ink)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Save</button>
            </div>
          </form>
        </div>
      )}
      <BottomNav value={nav} onChange={(v) => { setPage(null); setMoveDetail(null); setOpenEx(null); setNav(v); }} />
    </div>
  );
}
