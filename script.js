/* CGLD Christmas Pageant ’26 — front-end logic (vanilla JS, no build step) */
"use strict";

/* ===== 1. CONFIG — edit these values ===== */
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxPGrg1HMvSrdE3w89QTXGwUPmNo6OCm64YXZiHVMVDzVn453N6D_UObd0z32IYF3Wb/exec",  // ← paste your Apps Script Web App URL (ends in /exec)
  EVENT_DATE: "2026-12-11T18:00:00", // Friday, 11 Dec 2026, 6PM — from the poster; change if the time changes
  STATS_REFRESH_MS: 60000
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, "0");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: k => { try { localStorage.removeItem(k); } catch {} }
};

/* ===== 2. Fairy lights ===== */
(() => {
  const box = $(".lights"), cols = ["#ff4d5a", "#ffd25a", "#6fdc8c", "#fff2c4"];
  for (let i = 0; i < Math.floor(innerWidth / 38); i++) {
    const b = document.createElement("i");
    b.style.cssText = `--c:${cols[i % 4]};animation-delay:${(i % 5) * 0.4}s`;
    box.appendChild(b);
  }
})();

/* ===== 3. Snowfall (skipped when reduced motion is requested) ===== */
(() => {
  const cv = $("#snow");
  if (reduceMotion) return cv.remove();
  const cx = cv.getContext("2d");
  let w, h;
  const size = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; };
  size(); addEventListener("resize", size);
  const flakes = Array.from({ length: innerWidth < 700 ? 35 : 70 }, () => ({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    r: Math.random() * 2.5 + 0.8, s: Math.random() * 0.8 + 0.4, d: Math.random() * 6.28
  }));
  (function tick() {
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = "rgba(255,255,255,.85)";
    cx.beginPath();
    for (const f of flakes) {
      f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.4;
      if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w; }
      cx.moveTo(f.x + f.r, f.y); cx.arc(f.x, f.y, f.r, 0, 6.283);
    }
    cx.fill();
    requestAnimationFrame(tick);
  })();
})();

/* ===== 4. Countdown ===== */
(() => {
  const target = new Date(CONFIG.EVENT_DATE).getTime(), box = $("#countdown");
  if (isNaN(target)) return box.remove();
  const timer = setInterval(update, 1000);
  function update() {
    const ms = target - Date.now();
    if (ms <= 0) {
      clearInterval(timer);
      box.innerHTML = `<p class="cd-done">${Date.now() - target < 864e5
        ? "🎄 The celebration is today — see you there!"
        : "🎄 Thank you for celebrating Christmas Pageant ’26 with us!"}</p>`;
      return;
    }
    const s = Math.floor(ms / 1000);
    const set = (k, v) => { $(`[data-cd="${k}"]`).textContent = pad(v); };
    set("d", Math.floor(s / 86400)); set("h", Math.floor(s % 86400 / 3600));
    set("m", Math.floor(s % 3600 / 60)); set("s", s % 60);
  }
  update();
})();

/* ===== 5. Live statistics (aggregate numbers only) ===== */
const nf = new Intl.NumberFormat("en-IN");
function countTo(el, to) {
  const from = Number(el.dataset.v) || 0;
  el.dataset.v = to;
  if (reduceMotion || from === to) { el.textContent = nf.format(to); return; }
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min((t - t0) / 1200, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = nf.format(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
async function loadStats() {
  const note = $("#stats-note");
  try {
    if (!CONFIG.APPS_SCRIPT_URL) throw new Error("not configured");
    const r = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=stats&t=${Date.now()}`);
    const d = await r.json();
    if (!d.ok) throw new Error("bad response");
    countTo($("#stat-reg"), d.registrations);
    countTo($("#stat-guests"), d.confirmedGuests);
    note.textContent = "";
  } catch {
    note.textContent = "The live count can’t be reached right now. Please check back soon.";
  }
}
loadStats();
setInterval(loadStats, CONFIG.STATS_REFRESH_MS);

/* ===== 6. RSVP form ===== */
const PHONE_RE = /^(?:\+91|91|0)?[6-9]\d{9}$|^\+\d{8,15}$/; // keep identical to Code.gs
const form = $("#rsvp-form"), btn = $("#submit"), msg = $("#form-msg"), hc = $("#headcount");
let busy = false;

// One submission ID per RSVP, kept until the server confirms it. A retry or refresh re-sends
// the same ID, so the backend can ignore the duplicate.
function submissionId() {
  let id = ls.get("rsvpPending");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "" + Math.random()).replace(/[^A-Za-z0-9]/g, "");
    ls.set("rsvpPending", id);
  }
  return id;
}

$$("[data-step]").forEach(b => b.addEventListener("click", () => {
  hc.value = Math.min(20, Math.max(1, (parseInt(hc.value, 10) || 1) + Number(b.dataset.step)));
}));

function validate(d) {
  const e = {};
  if (d.name.length < 2) e.name = "Enter your name.";
  if (!PHONE_RE.test(d.phone)) e.phone = "Enter a 10-digit Indian mobile number, or an international number starting with +.";
  if (!Number.isInteger(d.headcount) || d.headcount < 1 || d.headcount > 20) e.headcount = "Enter a headcount between 1 and 20.";
  if (!d.food) e.food = "Choose Vegetarian or Non-vegetarian.";
  return e;
}

function burst() {
  if (reduceMotion) return;
  for (let i = 0; i < 26; i++) {
    const s = document.createElement("span");
    s.className = "burst"; s.textContent = ["⭐", "❄️", "✨", "🔔"][i % 4];
    s.style.cssText = `left:50%;top:60%;--dx:${(Math.random() - 0.5) * 520}px;--dy:${-Math.random() * 420}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
}

form.addEventListener("submit", async ev => {
  ev.preventDefault();
  if (busy) return; // blocks double-clicks
  const f = new FormData(form);
  const d = {
    name: String(f.get("name")).trim().replace(/\s+/g, " "),
    phone: String(f.get("phone")).replace(/[\s\-().]/g, ""),
    headcount: Number(f.get("headcount")),
    food: f.get("food"), attendance: "yes",
    website: f.get("website"), // honeypot: real visitors leave it empty
    submissionId: submissionId()
  };
  const errs = validate(d);
  $$(".err").forEach(el => { el.textContent = errs[el.dataset.for] || ""; });
  const first = Object.keys(errs)[0];
  if (first) { msg.textContent = ""; $(`[name="${first}"]`).focus(); return; }
  if (!CONFIG.APPS_SCRIPT_URL) { msg.textContent = "RSVP isn’t connected yet. The organiser needs to set APPS_SCRIPT_URL in script.js."; return; }

  busy = true; btn.disabled = true; btn.classList.add("loading"); msg.textContent = "";
  try {
    // text/plain avoids a CORS preflight, which Apps Script can’t answer.
    const r = await fetch(CONFIG.APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(d) });
    const res = await r.json();
    if (!res.ok) { msg.textContent = res.error || "We couldn’t save your RSVP. Please try again."; return; }
    ls.del("rsvpPending");
    form.reset(); hc.value = 1;
    $("#thanks-text").textContent = d.attendance === "yes"
      ? "Thank you for being part of our Christmas celebration! We look forward to celebrating this special occasion with you."
      : "Thank you for letting us know. You will be missed, and we’re grateful for your reply.";
    form.hidden = true; $("#thanks").hidden = false; $("#thanks").focus();
    burst(); loadStats();
  } catch {
    msg.textContent = "We couldn’t reach the server. Check your connection and press Send again. You won’t be registered twice.";
  } finally {
    busy = false; btn.disabled = false; btn.classList.remove("loading");
  }
});

$("#again").addEventListener("click", () => { $("#thanks").hidden = true; form.hidden = false; $("#name").focus(); });

/* ===== 8. Christmas surprise ===== */
(() => {
  const wishes = [
    "Glory to God in the highest, and on earth peace!",
    "May your home be filled with joy, laughter and light this Christmas.",
    "Wishing you a season of hope, love and good company.",
    "Christmas is a gift. Unwrap every moment of it.",
    "Joy to the world! Come celebrate with us."
  ];
  let i = Math.floor(Math.random() * wishes.length);
  const g = $("#gift");
  g.addEventListener("click", () => {
    g.classList.remove("open"); void g.offsetWidth; g.classList.add("open");
    $("#wish").textContent = wishes[i++ % wishes.length];
  });
})();
