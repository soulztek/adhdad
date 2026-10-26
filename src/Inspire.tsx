// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { I } from "./Shell";

/** Daily inspiration cards. Order matters: the first card is the app's opening page. */
export const INSPIRE = [
  { src: "./inspire/1-preach-the-gospel.webp", w: 452, h: 678, bg: "#090909", alt: "Saint Francis of Assisi: Preach the Gospel at all times. If necessary, use words.", quote: "Preach the Gospel at all times. If necessary, use words.", by: "Saint Francis of Assisi" },
  { src: "./inspire/2-psalm-103-13.webp", w: 1080, h: 1080, bg: "#1b1626", alt: "Father and child silhouette at sunset with Psalm 103:13", quote: "As a father has compassion on his children, so the Lord has compassion on those who fear him.", by: "Psalm 103:13" },
  { src: "./inspire/3-train-like-2.webp", w: 554, h: 554, bg: "#2a1610", alt: "Jalen Brunson: To be #1, you have to train like you're #2.", quote: "To be #1, you have to train like you're #2.", by: "Jalen Brunson" },
  { src: "./inspire/4-mets-ny.webp", w: 640, h: 1387, bg: "#1b1337", alt: "Neon Mets NY logo over the New York skyline", quote: "Let's go Mets!", by: "Ya gotta believe" },
];

const roundBtn = (disabled: boolean) => ({ width: 44, height: 44, borderRadius: 22, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, flex: "0 0 auto", boxShadow: "var(--shadow)" });

export function InspirePage(props: { dateLabel: string; opening: boolean; onDone: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const n = INSPIRE.length;
  const go = (i: number) => { const el = track.current; if (!el) return; const j = Math.max(0, Math.min(n - 1, i)); el.scrollTo({ left: j * el.clientWidth, behavior: "smooth" }); setIdx(j); };
  useEffect(() => {
    const el = track.current; if (!el) return;
    const on = () => { const j = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); setIdx((p) => (p === j ? p : j)); };
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(idx + 1); else if (e.key === "ArrowLeft") go(idx - 1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [idx]);
  const cur = INSPIRE[idx];
  return (
    <div role="dialog" aria-modal="true" aria-label="Daily inspiration" className="fadein" style={{ position: "fixed", inset: 0, zIndex: 90, background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 14px) 0 calc(env(safe-area-inset-bottom) + 16px)" }}>
      <div style={{ maxWidth: 560, width: "100%", margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{I("sun", 20)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.3, lineHeight: "23px" }}>Daily inspiration</div>
          <div style={{ fontSize: 12.5, color: "var(--text3)" }}>{props.dateLabel}</div>
        </div>
        <button onClick={props.onDone} aria-label={props.opening ? "Skip to Home" : "Close"} style={{ ...roundBtn(false), boxShadow: "none", border: "none", background: "var(--fill2)" }}>{I("x", 18)}</button>
      </div>
      <div ref={track} className="noscrollbar" style={{ flex: 1, minHeight: 0, display: "flex", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", marginTop: 14 }}>
        {INSPIRE.map((c, i) => (
          <div key={c.src} aria-hidden={i !== idx} style={{ flex: "0 0 100%", scrollSnapAlign: "center", scrollSnapStop: "always", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px", boxSizing: "border-box", minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0, width: "100%", maxWidth: 520, borderRadius: 24, background: c.bg, boxShadow: "var(--shadow)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={c.src} alt={c.alt} width={c.w} height={c.h} draggable={false} loading={i < 2 ? "eager" : "lazy"} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none" }} />
            </div>
            <div style={{ width: "100%", maxWidth: 520, padding: "14px 4px 0", textAlign: "center", minHeight: 62, boxSizing: "border-box" }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: "21px", letterSpacing: -0.1 }}>{`\u201C${c.quote}\u201D`}</div>
              <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 3 }}>{c.by}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 560, width: "100%", margin: "0 auto", padding: "14px 20px 0", display: "grid", gap: 14, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous" style={roundBtn(idx === 0)}>{I("back", 20, 2)}</button>
          <div role="tablist" aria-label="Cards" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {INSPIRE.map((c, i) => <button key={i} role="tab" aria-selected={i === idx} aria-label={`Card ${i + 1} of ${n}`} onClick={() => go(i)} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, border: "none", padding: 0, background: i === idx ? "var(--accent)" : "var(--border-strong)", transition: "width .2s ease, background .2s ease", cursor: "pointer" }} />)}
          </div>
          <button onClick={() => go(idx + 1)} disabled={idx === n - 1} aria-label="Next" style={roundBtn(idx === n - 1)}>{I("chev", 20, 2)}</button>
        </div>
        <button onClick={props.onDone} style={{ minHeight: 54, borderRadius: 27, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontSize: 16, fontWeight: 600, letterSpacing: -0.1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 18px rgba(232,115,74,0.28)" }}>
          {props.opening ? "Start my day" : "Back to my day"}{I("chev", 18, 2)}
        </button>
      </div>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }} aria-live="polite">{`Card ${idx + 1} of ${n}: ${cur.quote}`}</span>
    </div>
  );
}

/** Small Home card that reopens the carousel. */
export function InspireCard(props: { onOpen: () => void }) {
  const c = INSPIRE[0];
  return (
    <button onClick={props.onOpen} aria-label="Open daily inspiration" style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 20, border: "none", background: "var(--card)", boxShadow: "var(--shadow)", color: "var(--text)", textAlign: "left", cursor: "pointer", width: "100%" }}>
      <span style={{ width: 46, height: 46, borderRadius: 14, background: c.bg, overflow: "hidden", flex: "0 0 auto", display: "flex" }}><img src={c.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12, color: "var(--text3)" }}>Daily inspiration</span>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, lineHeight: "19px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Preach the Gospel at all times</span>
      </span>
      <span style={{ color: "var(--text3)", flex: "0 0 auto", paddingRight: 4 }}>{I("chev", 18, 2)}</span>
    </button>
  );
}
