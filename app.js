/* Hangout HQ — plan any hangout, from a quick coffee to a big event.
   Plain JS, no build step. Data lives in this browser's localStorage. */
(() => {
  "use strict";

  const STORE_KEY = "hangout-hq-v1";
  const COLORS = ["#2f5bea", "#e2557a", "#1f8a5b", "#b8650a", "#7b4fd6", "#0f8a9c", "#c53c3c", "#5b6b2f"];

  const SIZES = [
    { id: 1, label: "Quick hang", hint: "2–5 people, barely any planning", modules: ["guests", "notes"] },
    { id: 2, label: "Get-together", hint: "5–12 people, a few things to sort", modules: ["guests", "bring", "poll", "notes"] },
    { id: 3, label: "Party", hint: "10–30 people, tasks and costs", modules: ["guests", "bring", "tasks", "budget", "schedule", "notes"] },
    { id: 4, label: "Big event", hint: "30+ people, trips, milestones", modules: ["guests", "tasks", "budget", "schedule", "bring", "poll", "notes"] },
  ];

  const MODULES = {
    guests: "Guests",
    bring: "Who's bringing what",
    tasks: "To-dos",
    budget: "Costs & split",
    schedule: "Schedule",
    poll: "Group vote",
    notes: "Notes",
  };

  // ---------- state ----------

  const uid = () => Math.random().toString(36).slice(2, 10);
  const todayISO = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  function seed() {
    const f = (name, i) => ({ id: uid(), name, color: COLORS[i % COLORS.length] });
    const friends = ["You", "Mika", "Jo", "Andre", "Bea", "Sam", "Lia", "Rico"].map(f);
    const [you, mika, jo, andre, bea, sam, lia, rico] = friends.map((x) => x.id);
    const coffee = {
      id: uid(), title: "Coffee and catch-up", size: 1, date: todayISO(3), time: "10:00", endTime: "",
      place: "The corner café on 5th", description: "Low-key catch-up before the week gets busy.",
      modules: ["guests", "notes"],
      guests: [{ friendId: you, rsvp: "going" }, { friendId: mika, rsvp: "going" }, { friendId: jo, rsvp: "maybe" }],
      bring: [], tasks: [], expenses: [], budget: 0, schedule: [], poll: null,
      notes: "Mika might bring the board game she mentioned.", createdAt: Date.now(),
    };
    const bday = {
      id: uid(), title: "Rico's 30th birthday", size: 4, date: todayISO(18), time: "18:00", endTime: "23:30",
      place: "Rooftop at Andre's building",
      description: "Surprise party. Do not tell Rico. Dress code: something gold.",
      modules: ["guests", "tasks", "budget", "schedule", "bring", "poll", "notes"],
      guests: [
        { friendId: you, rsvp: "going" }, { friendId: mika, rsvp: "going" }, { friendId: jo, rsvp: "going" },
        { friendId: andre, rsvp: "going" }, { friendId: bea, rsvp: "maybe" }, { friendId: sam, rsvp: "pending" },
        { friendId: lia, rsvp: "no" },
      ],
      bring: [
        { id: uid(), text: "Speaker + playlist", friendId: sam, done: false },
        { id: uid(), text: "Folding chairs (6)", friendId: andre, done: true },
        { id: uid(), text: "Ice and cups", friendId: "", done: false },
      ],
      tasks: [
        { id: uid(), text: "Book the rooftop", friendId: andre, done: true },
        { id: uid(), text: "Order the cake", friendId: mika, done: true },
        { id: uid(), text: "Get Rico there by 7pm without him knowing", friendId: jo, done: false },
        { id: uid(), text: "Buy decorations", friendId: you, done: false },
      ],
      expenses: [
        { id: uid(), text: "Cake", amount: 85, paidBy: mika, split: [you, mika, jo, andre] },
        { id: uid(), text: "Rooftop deposit", amount: 120, paidBy: andre, split: [you, mika, jo, andre] },
        { id: uid(), text: "Decorations", amount: 40, paidBy: you, split: [you, mika, jo, andre] },
      ],
      budget: 400,
      schedule: [
        { id: uid(), time: "18:00", text: "Setup crew arrives" },
        { id: uid(), time: "18:45", text: "Guests arrive, lights off" },
        { id: uid(), time: "19:00", text: "Rico walks in. Surprise!" },
        { id: uid(), time: "20:00", text: "Cake and toasts" },
      ],
      poll: {
        question: "Food for the night?",
        options: [
          { id: uid(), text: "Pizza", votes: [you, jo, andre] },
          { id: uid(), text: "Tacos", votes: [mika, bea] },
          { id: uid(), text: "Korean BBQ", votes: [sam] },
        ],
      },
      notes: "Rico's partner is in on it. Keep the group chat name innocent.",
      createdAt: Date.now() + 1,
    };
    const beach = {
      id: uid(), title: "Beach day", size: 2, date: todayISO(-12), time: "08:00", endTime: "17:00",
      place: "North shore", description: "", modules: ["guests", "bring", "poll", "notes"],
      guests: [{ friendId: you, rsvp: "going" }, { friendId: bea, rsvp: "going" }, { friendId: sam, rsvp: "going" }, { friendId: rico, rsvp: "going" }],
      bring: [{ id: uid(), text: "Cooler", friendId: bea, done: true }], tasks: [], expenses: [], budget: 0, schedule: [],
      poll: null, notes: "", createdAt: Date.now() - 5,
    };
    return { friends, hangouts: [bday, coffee, beach], currency: "$", examples: true, meId: you };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY));
      if (raw && Array.isArray(raw.hangouts) && Array.isArray(raw.friends)) return raw;
    } catch (_) { /* fall through to seed */ }
    // Save the seed right away so its ids (and links to them) survive a reload.
    const fresh = seed();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(fresh)); } catch (_) { /* storage unavailable */ }
    return fresh;
  }

  let state = load();
  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { toast("Couldn't save in this browser"); }
  };

  // ---------- helpers ----------

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const friend = (id) => state.friends.find((f) => f.id === id);
  const fname = (id) => friend(id)?.name || "Someone";
  const hangout = (id) => state.hangouts.find((h) => h.id === id);
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const money = (n) => {
    const v = Math.round(n * 100) / 100;
    return `${v < 0 ? "−" : ""}${state.currency}${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  function avatar(id, extra = "") {
    const f = friend(id);
    const name = f?.name || "?";
    return `<span class="avatar ${extra}" style="background:${esc(f?.color || "#888")}" title="${esc(name)}">${esc(initials(name))}</span>`;
  }

  function parseDate(h) {
    if (!h.date) return null;
    const [y, m, d] = h.date.split("-").map(Number);
    const [hh, mm] = (h.time || "00:00").split(":").map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0);
  }
  function fmtTime(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const d = new Date(2000, 0, 1, h, m);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  function fmtWhen(h, long = false) {
    const d = parseDate(h);
    if (!d) return "Date TBD";
    const day = d.toLocaleDateString(undefined, long ? { weekday: "long", month: "long", day: "numeric", year: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
    const t = h.time ? ` · ${fmtTime(h.time)}${h.endTime ? `–${fmtTime(h.endTime)}` : ""}` : "";
    return day + t;
  }
  function isPast(h) {
    const d = parseDate(h);
    if (!d) return false;
    const end = new Date(d);
    end.setHours(23, 59, 59);
    return end < new Date();
  }
  function daysUntil(h) {
    const d = parseDate(h);
    if (!d) return null;
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(d); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
  }
  function sizeDots(size) {
    return `<span class="size-dots" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= size ? "on" : ""}"></i>`).join("")}</span>`;
  }
  function sizePill(size) {
    const s = SIZES.find((x) => x.id === size) || SIZES[0];
    return `<span class="size-pill">${sizeDots(size)}${esc(s.label)}</span>`;
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }

  function commit(rerender = true) {
    save();
    if (rerender) render();
  }

  // ---------- sharing ----------

  function encodeShare(h) {
    const ids = new Set([
      ...h.guests.map((g) => g.friendId), ...h.bring.map((b) => b.friendId), ...h.tasks.map((t) => t.friendId),
      ...h.expenses.flatMap((e) => [e.paidBy, ...e.split]), ...(h.poll?.options || []).flatMap((o) => o.votes),
    ].filter(Boolean));
    const payload = { v: 1, hangout: h, friends: state.friends.filter((f) => ids.has(f.id)) };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeShare(str) {
    try {
      const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (data && data.hangout && Array.isArray(data.friends)) return data;
    } catch (_) { /* invalid link */ }
    return null;
  }
  function importShared(data) {
    // Match friends by name so repeated imports don't duplicate people.
    const map = {};
    data.friends.forEach((f) => {
      const existing = state.friends.find((x) => x.id === f.id) || state.friends.find((x) => x.name.toLowerCase() === f.name.toLowerCase());
      if (existing) map[f.id] = existing.id;
      else { const nf = { id: uid(), name: f.name, color: f.color || COLORS[state.friends.length % COLORS.length] }; state.friends.push(nf); map[f.id] = nf.id; }
    });
    const r = (id) => map[id] || id;
    const h = JSON.parse(JSON.stringify(data.hangout));
    const sameId = state.hangouts.findIndex((x) => x.id === h.id);
    h.guests.forEach((g) => { g.friendId = r(g.friendId); });
    h.bring.forEach((b) => { b.friendId = r(b.friendId); });
    h.tasks.forEach((t) => { t.friendId = r(t.friendId); });
    h.expenses.forEach((e) => { e.paidBy = r(e.paidBy); e.split = e.split.map(r); });
    (h.poll?.options || []).forEach((o) => { o.votes = o.votes.map(r); });
    if (sameId >= 0) state.hangouts[sameId] = h; else state.hangouts.push(h);
    commit(false);
    return h.id;
  }

  function inviteText(h) {
    const going = h.guests.filter((g) => g.rsvp === "going").map((g) => fname(g.friendId));
    const lines = [`${h.title}`, `When: ${fmtWhen(h, true)}`];
    if (h.place) lines.push(`Where: ${h.place}`);
    if (h.description) lines.push("", h.description);
    if (going.length) lines.push("", `Going so far: ${going.join(", ")}`);
    const open = h.bring.filter((b) => !b.friendId);
    if (h.modules.includes("bring") && open.length) lines.push(`Still need someone to bring: ${open.map((b) => b.text).join(", ")}`);
    return lines.join("\n");
  }

  // ---------- money ----------

  function balances(h) {
    const bal = {};
    h.expenses.forEach((e) => {
      const n = e.split.length;
      if (!n || !e.amount) return;
      bal[e.paidBy] = (bal[e.paidBy] || 0) + e.amount;
      e.split.forEach((id) => { bal[id] = (bal[id] || 0) - e.amount / n; });
    });
    return bal;
  }
  function settleUp(bal) {
    const debt = [], cred = [];
    Object.entries(bal).forEach(([id, v]) => {
      if (v < -0.005) debt.push({ id, v: -v });
      else if (v > 0.005) cred.push({ id, v });
    });
    debt.sort((a, b) => b.v - a.v); cred.sort((a, b) => b.v - a.v);
    const out = [];
    let i = 0, j = 0;
    while (i < debt.length && j < cred.length) {
      const amt = Math.min(debt[i].v, cred[j].v);
      out.push({ from: debt[i].id, to: cred[j].id, amount: amt });
      debt[i].v -= amt; cred[j].v -= amt;
      if (debt[i].v < 0.005) i++;
      if (cred[j].v < 0.005) j++;
    }
    return out;
  }

  // ---------- views ----------

  let filter = "upcoming";
  let query = "";

  function renderHome() {
    const all = [...state.hangouts];
    const upcoming = all.filter((h) => !isPast(h) && h.date).sort((a, b) => parseDate(a) - parseDate(b));
    const tbd = all.filter((h) => !h.date).sort((a, b) => b.createdAt - a.createdAt);
    const past = all.filter((h) => isPast(h)).sort((a, b) => parseDate(b) - parseDate(a));
    const next = upcoming[0];
    const q = query.trim().toLowerCase();
    const match = (h) => !q || [h.title, h.place, h.description].join(" ").toLowerCase().includes(q);

    const groups = filter === "past" ? [["Past", past]] : filter === "all"
      ? [["Upcoming", upcoming], ["Date not set", tbd], ["Past", past]]
      : [["Upcoming", upcoming], ["Date not set", tbd]];

    const n = next ? daysUntil(next) : null;
    const countLabel = n === 0 ? "Today" : n === 1 ? "Tomorrow" : `${n} days`;

    return `
      ${state.examples ? `<div class="banner"><span>These are example hangouts so you can see how it works.</span><button class="btn btn-sm" data-action="clear-examples">Clear examples</button></div>` : ""}
      <div class="home-head">
        <div>
          <h1>Your hangouts</h1>
          <p class="muted">Coffee for two or a 60-person party. Start small, and turn on more planning tools as the plan grows.</p>
        </div>
      </div>
      ${next ? `
        <a class="next-up" href="#/h/${esc(next.id)}">
          <div>
            <div class="eyebrow">Next up</div>
            <h2>${esc(next.title)}</h2>
            <div style="opacity:.85">${esc(fmtWhen(next))}${next.place ? ` · ${esc(next.place)}` : ""}</div>
          </div>
          <div class="count">${n <= 1 ? esc(countLabel) : n}${n > 1 ? "<small>days to go</small>" : ""}</div>
        </a>` : ""}
      <div class="toolbar">
        <input class="input" id="search" type="search" placeholder="Search hangouts" value="${esc(query)}" aria-label="Search hangouts">
        <div class="chips" role="group" aria-label="Filter">
          ${["upcoming", "past", "all"].map((f) => `<button class="chip" data-action="filter" data-v="${f}" aria-pressed="${filter === f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}
        </div>
      </div>
      ${groups.map(([label, list]) => {
        const items = list.filter(match);
        if (!items.length) return label === "Upcoming" && !q ? `
          <div class="section-label">${label}</div>
          <div class="empty"><b>Nothing planned yet.</b><span>Start with a quick hang. You can always add more later.</span><button class="btn btn-primary" data-action="new-hangout">Plan a hangout</button></div>` : "";
        return `<div class="section-label">${label}</div><div class="cards">${items.map(cardHTML).join("")}</div>`;
      }).join("")}
      ${q && !all.some(match) ? `<div class="empty">No hangouts match “${esc(query)}”.</div>` : ""}
    `;
  }

  function cardHTML(h) {
    const d = parseDate(h);
    const going = h.guests.filter((g) => g.rsvp === "going");
    const shown = going.slice(0, 5);
    const openTasks = h.tasks.filter((t) => !t.done).length;
    return `
      <a class="card" href="#/h/${esc(h.id)}">
        <div class="card-top">
          <div class="datebox ${d ? "" : "tbd"}">${d ? `<span>${d.toLocaleDateString(undefined, { month: "short" })}</span><b>${d.getDate()}</b>` : "<b>TBD</b>"}</div>
          <div class="card-title">
            ${sizePill(h.size)}
            <h3>${esc(h.title)}</h3>
            <div class="meta">${d ? `<span>${esc(fmtWhen(h))}</span>` : ""}${h.place ? `<span>${esc(h.place)}</span>` : ""}</div>
          </div>
        </div>
        <div class="card-foot">
          <div class="row" style="gap:10px">
            <div class="avatars">${shown.map((g) => avatar(g.friendId)).join("")}${going.length > 5 ? `<span class="avatar more">+${going.length - 5}</span>` : ""}</div>
            <span class="muted small">${going.length} going${openTasks ? ` · ${openTasks} to-do${openTasks > 1 ? "s" : ""} left` : ""}</span>
          </div>
        </div>
      </a>`;
  }

  function renderHangout(h) {
    const counts = { going: 0, maybe: 0, no: 0, pending: 0 };
    h.guests.forEach((g) => { counts[g.rsvp] = (counts[g.rsvp] || 0) + 1; });
    const tasksDone = h.tasks.filter((t) => t.done).length;
    const bringCovered = h.bring.filter((b) => b.friendId).length;
    const spent = h.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const n = daysUntil(h);
    const has = (m) => h.modules.includes(m);
    const missing = Object.keys(MODULES).filter((m) => !has(m));

    const stats = [
      `<div class="stat"><span>Going</span><b>${counts.going}<small> of ${h.guests.length}</small></b></div>`,
      n !== null && n >= 0 ? `<div class="stat"><span>Countdown</span><b>${n === 0 ? "Today" : n === 1 ? "Tomorrow" : `${n} days`}</b></div>` : "",
      has("tasks") && h.tasks.length ? `<div class="stat"><span>To-dos done</span><b>${tasksDone}/${h.tasks.length}</b><div class="bar"><i style="width:${(tasksDone / h.tasks.length) * 100}%"></i></div></div>` : "",
      has("bring") && h.bring.length ? `<div class="stat"><span>Items covered</span><b>${bringCovered}/${h.bring.length}</b><div class="bar"><i style="width:${(bringCovered / h.bring.length) * 100}%"></i></div></div>` : "",
      has("budget") && (spent || h.budget) ? `<div class="stat"><span>Spent</span><b>${money(spent)}${h.budget ? `<small> / ${money(h.budget)}</small>` : ""}</b>${h.budget ? `<div class="bar"><i style="width:${Math.min(100, (spent / h.budget) * 100)}%;${spent > h.budget ? "background:var(--bad)" : ""}"></i></div>` : ""}</div>` : "",
    ].join("");

    const order = ["guests", "tasks", "bring", "schedule", "budget", "poll", "notes"];
    return `
      <a href="#/" class="back">← All hangouts</a>
      <section class="hero">
        <div class="hero-top">
          <div class="hero-title">
            ${sizePill(h.size)}
            <h1>${esc(h.title)}</h1>
          </div>
          <div class="hero-actions">
            <button class="btn btn-sm" data-action="edit-hangout">Edit</button>
            <button class="btn btn-sm" data-action="copy-invite">Copy invite</button>
            <button class="btn btn-sm" data-action="share-link">Share link</button>
            <button class="btn btn-sm btn-ghost" data-action="duplicate">Duplicate</button>
            <button class="btn btn-sm btn-ghost btn-danger" data-action="delete-hangout">Delete</button>
          </div>
        </div>
        <div class="facts">
          <div class="fact"><span>When</span><b>${esc(fmtWhen(h, true))}</b></div>
          <div class="fact"><span>Where</span><b>${h.place ? esc(h.place) : "Place TBD"}</b></div>
        </div>
        ${h.description ? `<p class="hero-desc">${esc(h.description)}</p>` : ""}
        <div class="progress">${stats}</div>
        <div id="confirm-slot"></div>
      </section>
      <div class="modules">
        ${order.filter(has).map((m) => moduleHTML(m, h)).join("")}
      </div>
      ${missing.length ? `<div class="add-modules"><span class="muted small">Add a section:</span>${missing.map((m) => `<button class="chip" data-action="add-module" data-v="${m}">+ ${esc(MODULES[m])}</button>`).join("")}</div>` : ""}
    `;
  }

  function friendSelect(name, selected = "", { blank = "Anyone", guestsOnly = null } = {}) {
    const pool = guestsOnly ? state.friends.filter((f) => guestsOnly.includes(f.id)) : state.friends;
    return `<select class="select who" name="${name}" data-field="${name}" aria-label="Person">
      <option value="">${esc(blank)}</option>
      ${pool.map((f) => `<option value="${esc(f.id)}" ${f.id === selected ? "selected" : ""}>${esc(f.name)}</option>`).join("")}
    </select>`;
  }

  function moduleShell(m, h, body, { wide = false, sub = "" } = {}) {
    return `<section class="module ${wide ? "wide" : ""}" data-module="${m}">
      <div class="module-head"><h2>${esc(MODULES[m])}</h2>
        <div class="row" style="gap:4px">${sub ? `<span class="muted">${sub}</span>` : ""}<button class="icon-btn" data-action="remove-module" data-v="${m}" title="Hide this section" aria-label="Hide ${esc(MODULES[m])}">×</button></div>
      </div>${body}</section>`;
  }

  function moduleHTML(m, h) {
    const guestIds = h.guests.map((g) => g.friendId);
    if (m === "guests") {
      const notInvited = state.friends.filter((f) => !guestIds.includes(f.id));
      const order = { going: 0, maybe: 1, pending: 2, no: 3 };
      const sorted = [...h.guests].sort((a, b) => order[a.rsvp] - order[b.rsvp] || fname(a.friendId).localeCompare(fname(b.friendId)));
      return moduleShell(m, h, `
        ${sorted.length ? `<ul class="list">${sorted.map((g) => `
          <li data-id="${esc(g.friendId)}">${avatar(g.friendId)}<span class="grow">${esc(fname(g.friendId))}</span>
            <span class="rsvp" role="group" aria-label="RSVP for ${esc(fname(g.friendId))}">
              ${[["going", "Going"], ["maybe", "Maybe"], ["no", "Can't"]].map(([v, l]) => `<button data-action="rsvp" data-v="${v}" aria-pressed="${g.rsvp === v}">${l}</button>`).join("")}
            </span>
            <button class="icon-btn" data-action="remove-guest" aria-label="Remove ${esc(fname(g.friendId))}">×</button>
          </li>`).join("")}</ul>` : `<p class="muted small">No one invited yet.</p>`}
        <form class="add-row add-row-inline" data-form="add-guest">
          <input class="input" name="name" list="friend-names" placeholder="Invite someone by name" autocomplete="off" aria-label="Name to invite">
          <button class="btn btn-sm">Invite</button>
          ${notInvited.length ? `<button type="button" class="btn btn-sm btn-ghost" data-action="invite-all">Invite all friends</button>` : ""}
        </form>
        <datalist id="friend-names">${notInvited.map((f) => `<option value="${esc(f.name)}"></option>`).join("")}</datalist>`, { sub: `${h.guests.filter((g) => g.rsvp === "going").length} going` });
    }
    if (m === "bring" || m === "tasks") {
      const items = h[m];
      return moduleShell(m, h, `
        ${items.length ? `<ul class="list">${items.map((t) => `
          <li data-id="${esc(t.id)}" class="${t.done ? "done" : ""}">
            <input type="checkbox" class="check" data-action="toggle-item" data-list="${m}" ${t.done ? "checked" : ""} aria-label="Mark done">
            <span class="item-body"><span class="grow">${esc(t.text)}</span>
            ${friendSelect("assign", t.friendId, { blank: m === "bring" ? "Needs someone" : "Unassigned" })}</span>
            <button class="icon-btn" data-action="remove-item" data-list="${m}" aria-label="Remove">×</button>
          </li>`).join("")}</ul>` : `<p class="muted small">${m === "bring" ? "List snacks, gear or anything people should bring." : "Bookings, shopping, anything that has to get done."}</p>`}
        <form class="add-row" data-form="add-item" data-list="${m}">
          <input class="input" name="text" placeholder="${m === "bring" ? "e.g. Chips and dip" : "e.g. Reserve a table"}" aria-label="New item" required>
          ${friendSelect("friendId", "", { blank: m === "bring" ? "Needs someone" : "Unassigned" })}
          <button class="btn btn-sm">Add</button>
        </form>`, { sub: items.length ? `${items.filter((t) => t.done).length}/${items.length} done` : "" });
    }
    if (m === "schedule") {
      const items = [...h.schedule].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      return moduleShell(m, h, `
        ${items.length ? `<ul class="list timeline">${items.map((s) => `
          <li data-id="${esc(s.id)}"><span class="time">${esc(s.time ? fmtTime(s.time) : "—")}</span><span class="grow">${esc(s.text)}</span>
          <button class="icon-btn" data-action="remove-schedule" aria-label="Remove">×</button></li>`).join("")}</ul>` : `<p class="muted small">Lay out the run of the day or night.</p>`}
        <form class="add-row" data-form="add-schedule">
          <input class="input" name="text" placeholder="What happens" aria-label="What happens" required>
          <input class="input amount" type="time" name="time" aria-label="Time">
          <button class="btn btn-sm">Add</button>
        </form>`);
    }
    if (m === "budget") {
      const bal = balances(h);
      const moves = settleUp(bal);
      const spent = h.expenses.reduce((s, e) => s + e.amount, 0);
      const splitDefault = guestIds.length ? h.guests.filter((g) => g.rsvp === "going").map((g) => g.friendId) : [];
      return moduleShell(m, h, `
        <div class="budget-grid">
          <label class="field"><span>Budget</span>
            <input class="input" type="number" min="0" step="0.01" inputmode="decimal" data-field="budget" value="${h.budget || ""}" placeholder="Optional"></label>
          <label class="field"><span>Currency</span><input class="input" data-field="currency" value="${esc(state.currency)}" maxlength="4"></label>
          <div class="field"><span>Spent</span><b class="money spent-val">${money(spent)}</b></div>
        </div>
        ${h.expenses.length ? `<ul class="list">${h.expenses.map((e) => `
          <li data-id="${esc(e.id)}"><span class="grow"><b>${esc(e.text)}</b><br><span class="muted small">${esc(fname(e.paidBy))} paid · split ${e.split.length} way${e.split.length === 1 ? "" : "s"}</span></span>
          <span class="money">${money(e.amount)}</span><button class="icon-btn" data-action="remove-expense" aria-label="Remove">×</button></li>`).join("")}</ul>` : `<p class="muted small">Log what people pay for and we'll work out who owes whom.</p>`}
        <form class="field" data-form="add-expense" style="gap:8px">
          <div class="add-row">
            <input class="input" name="text" placeholder="What was it" aria-label="Expense" required>
            <input class="input amount" name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Amount" aria-label="Amount" required>
            ${friendSelect("paidBy", state.meId && guestIds.includes(state.meId) ? state.meId : (guestIds[0] || ""), { blank: "Paid by…" })}
          </div>
          ${guestIds.length ? `<div class="split-pick" aria-label="Split between">${h.guests.map((g) => `<label><input type="checkbox" name="split" value="${esc(g.friendId)}" ${splitDefault.includes(g.friendId) ? "checked" : ""}>${esc(fname(g.friendId))}</label>`).join("")}</div>` : `<p class="muted small">Invite guests first to split costs between them.</p>`}
          <div><button class="btn btn-sm">Add expense</button></div>
        </form>
        ${moves.length ? `<div class="settle"><b class="small">To settle up</b>${moves.map((x) => `<div class="settle-row">${avatar(x.from)}<b>${esc(fname(x.from))}</b><span class="arrow">pays</span>${avatar(x.to)}<b>${esc(fname(x.to))}</b><span class="money" style="margin-left:auto">${money(x.amount)}</span></div>`).join("")}</div>`
          : h.expenses.length ? `<div class="settle"><b class="small">Everyone's square.</b></div>` : ""}
      `, { wide: false });
    }
    if (m === "poll") {
      const p = h.poll;
      if (!p) {
        return moduleShell(m, h, `
          <p class="muted small">Can't decide on a date, place or food? Put it to a vote.</p>
          <form class="field" data-form="new-poll" style="gap:8px">
            <input class="input" name="question" placeholder="e.g. Which Saturday works?" aria-label="Question" required>
            <input class="input" name="options" placeholder="Options, separated by commas" aria-label="Options" required>
            <div><button class="btn btn-sm">Start vote</button></div>
          </form>`);
      }
      const total = p.options.reduce((s, o) => s + o.votes.length, 0);
      const top = Math.max(0, ...p.options.map((o) => o.votes.length));
      const voters = h.guests.length ? h.guests.map((g) => g.friendId) : state.friends.map((f) => f.id);
      return moduleShell(m, h, `
        <div class="row" style="justify-content:space-between"><b>${esc(p.question)}</b><button class="btn btn-sm btn-ghost" data-action="reset-poll">New vote</button></div>
        <div>${p.options.map((o) => `
          <div class="poll-opt ${top && o.votes.length === top ? "lead" : ""}" data-id="${esc(o.id)}">
            <div class="row"><span>${esc(o.text)}</span><span class="muted small num">${o.votes.length} vote${o.votes.length === 1 ? "" : "s"}</span></div>
            <div class="poll-bar"><i style="width:${total ? (o.votes.length / total) * 100 : 0}%"></i></div>
            <div class="voters">${voters.map((id) => `<button class="voter" data-action="vote" data-friend="${esc(id)}" aria-pressed="${o.votes.includes(id)}">${esc(fname(id))}</button>`).join("")}</div>
          </div>`).join("")}</div>
        <form class="add-row" data-form="add-option"><input class="input" name="text" placeholder="Add an option" aria-label="Add an option" required><button class="btn btn-sm">Add</button></form>
        <p class="muted small">Tap a name under an option to record their vote.</p>`);
    }
    if (m === "notes") {
      return moduleShell(m, h, `<textarea class="textarea" data-field="notes" placeholder="Parking, dress code, the group chat link, anything else." aria-label="Notes">${esc(h.notes)}</textarea>`);
    }
    return "";
  }

  function renderFriends() {
    const counts = {};
    state.hangouts.forEach((h) => h.guests.forEach((g) => { if (g.rsvp === "going") counts[g.friendId] = (counts[g.friendId] || 0) + 1; }));
    const sorted = [...state.friends].sort((a, b) => (a.id === state.meId ? -1 : b.id === state.meId ? 1 : a.name.localeCompare(b.name)));
    return `
      <div class="home-head"><div><h1>Friends</h1><p class="muted">Everyone you hang out with. Add them once, invite them to anything.</p></div></div>
      <form class="add-row" data-form="add-friend" style="max-width:480px">
        <input class="input" name="name" placeholder="Friend's name" aria-label="Friend's name" required>
        <button class="btn btn-primary btn-sm">Add friend</button>
      </form>
      <div class="friend-list">
        ${sorted.map((f) => `
          <div class="friend" data-id="${esc(f.id)}">${avatar(f.id)}
            <div class="grow"><b>${esc(f.name)}${f.id === state.meId && f.name.toLowerCase() !== "you" ? ' <span class="muted small">(you)</span>' : ""}</b><span class="muted small">${counts[f.id] || 0} hangout${counts[f.id] === 1 ? "" : "s"}</span></div>
            <button class="btn btn-sm btn-ghost" data-action="rename-friend">Rename</button>
            ${f.id !== state.meId ? `<button class="icon-btn" data-action="remove-friend" aria-label="Remove ${esc(f.name)}">×</button>` : '<span class="icon-btn" aria-hidden="true"></span>'}
          </div>`).join("")}
      </div>
      <section class="panel">
        <h2>Back up or move your data</h2>
        <p class="muted small">Everything is saved in this browser only. Export a backup file to keep it safe or move it to another device.</p>
        <div class="row">
          <button class="btn btn-sm" data-action="export">Export backup</button>
          <label class="btn btn-sm">Import backup<input type="file" accept="application/json,.json" id="import-file" hidden></label>
          <button class="btn btn-sm btn-ghost btn-danger" data-action="reset-all">Erase everything</button>
        </div>
        <div id="confirm-slot"></div>
      </section>`;
  }

  // ---------- router ----------

  let pendingImport = null;

  function route() {
    const dlg = $("#dialog");
    if (dlg.open) dlg.close();
    const hash = location.hash || "#/";
    if (hash.startsWith("#/import/")) {
      pendingImport = decodeShare(hash.slice(9));
      history.replaceState(null, "", "#/");
      if (!pendingImport) toast("That share link is broken or incomplete");
    }
    render();
  }

  function render() {
    const app = $("#app");
    const hash = location.hash || "#/";
    let html, nav = "home";
    const m = hash.match(/^#\/h\/([\w-]+)/);
    if (m) {
      const h = hangout(m[1]);
      html = h ? renderHangout(h) : `<div class="empty"><b>That hangout doesn't exist anymore.</b><a href="#/" class="btn">Back to hangouts</a></div>`;
    } else if (hash.startsWith("#/friends")) {
      html = renderFriends(); nav = "friends";
    } else {
      html = renderHome();
    }
    if (pendingImport) {
      html = `<div class="banner info"><span>Someone shared <b>${esc(pendingImport.hangout.title)}</b> with you.</span><span class="row"><button class="btn btn-sm btn-primary" data-action="accept-import">Add to my hangouts</button><button class="btn btn-sm btn-ghost" data-action="dismiss-import">Dismiss</button></span></div>` + html;
    }
    const focusId = document.activeElement?.id;
    app.innerHTML = html;
    if (focusId === "search") { const s = $("#search"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
    const h = m && hangout(m[1]);
    document.title = h ? `${h.title} · Hangout HQ` : nav === "friends" ? "Friends · Hangout HQ" : "Hangout HQ";
  }

  const currentHangout = () => {
    const m = (location.hash || "").match(/^#\/h\/([\w-]+)/);
    return m ? hangout(m[1]) : null;
  };

  // ---------- dialogs ----------

  // Blur after closing: the dialog returns focus to its opener, and the Enter that
  // submitted the form would otherwise "click" that button and reopen the dialog.
  function closeDialog() {
    $("#dialog").close();
    document.activeElement?.blur();
  }

  function openHangoutDialog(h) {
    const dlg = $("#dialog");
    const isNew = !h;
    const v = h || { title: "", size: 1, date: "", time: "", endTime: "", place: "", description: "" };
    dlg.innerHTML = `
      <form method="dialog" id="hangout-form">
        <h2>${isNew ? "Plan a hangout" : "Edit details"}</h2>
        <label class="field"><span>What's the plan?</span><input class="input" id="f-title" name="title" required value="${esc(v.title)}" placeholder="e.g. Movie night at Jo's"></label>
        <div class="field"><span>How big is it?</span>
          <div class="size-options">${SIZES.map((s) => `
            <label class="size-opt"><input type="radio" name="size" value="${s.id}" ${v.size === s.id ? "checked" : ""}>
              <b>${sizeDots(s.id)} ${esc(s.label)}</b><small>${esc(s.hint)}</small></label>`).join("")}
          </div>
          ${isNew ? `<small class="muted">This picks which planning tools you start with. You can add or hide any of them later.</small>` : ""}
        </div>
        <div class="when-grid">
          <label class="field"><span>Date</span><input class="input" id="f-date" type="date" name="date" value="${esc(v.date)}"></label>
          <div class="time-pair">
            <label class="field"><span>Starts</span><input class="input" id="f-time" type="time" name="time" value="${esc(v.time)}"></label>
            <label class="field"><span>Ends</span><input class="input" id="f-end" type="time" name="endTime" value="${esc(v.endTime)}"></label>
          </div>
        </div>
        <label class="field"><span>Where</span><input class="input" id="f-place" name="place" value="${esc(v.place)}" placeholder="Leave blank if undecided"></label>
        <label class="field"><span>Details</span><textarea class="textarea" id="f-desc" name="description" placeholder="Anything people should know">${esc(v.description)}</textarea></label>
        <div class="dialog-actions">
          <button type="button" class="btn" data-action="close-dialog">Cancel</button>
          <button class="btn btn-primary" value="save">${isNew ? "Create hangout" : "Save changes"}</button>
        </div>
      </form>`;
    dlg.showModal();
    $("#f-title").focus();
    $("#hangout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const size = Number(fd.get("size")) || 1;
      const data = {
        title: fd.get("title").trim(), size, date: fd.get("date"), time: fd.get("time"), endTime: fd.get("endTime"),
        place: fd.get("place").trim(), description: fd.get("description").trim(),
      };
      if (!data.title) return;
      if (isNew) {
        const me = state.meId && friend(state.meId) ? [{ friendId: state.meId, rsvp: "going" }] : [];
        const nh = {
          id: uid(), ...data, modules: [...SIZES.find((s) => s.id === size).modules], guests: me,
          bring: [], tasks: [], expenses: [], budget: 0, schedule: [], poll: null, notes: "", createdAt: Date.now(),
        };
        state.hangouts.push(nh);
        closeDialog();
        save();
        location.hash = `#/h/${nh.id}`;
        toast("Hangout created");
      } else {
        // Growing a hangout turns on the tools that size starts with; shrinking never hides anything.
        const grew = size > h.size;
        Object.assign(h, data);
        if (grew) SIZES.find((s) => s.id === size).modules.forEach((m) => { if (!h.modules.includes(m)) h.modules.push(m); });
        closeDialog();
        commit();
        toast(grew ? "Saved. Added tools for a bigger hangout" : "Saved");
      }
    });
  }

  function openRenameDialog(f) {
    const dlg = $("#dialog");
    dlg.innerHTML = `<form method="dialog" id="rename-form"><h2>Rename</h2>
      <label class="field"><span>Name</span><input class="input" id="f-rename" name="name" required value="${esc(f.name)}"></label>
      <div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button class="btn btn-primary">Save</button></div></form>`;
    dlg.showModal();
    $("#f-rename").select();
    $("#rename-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (name) { f.name = name; closeDialog(); commit(); }
    });
  }

  // Inline confirmation in place of window.confirm, so the danger is visible on the page.
  function confirmInline(message, label, onYes) {
    const slot = $("#confirm-slot");
    if (!slot) return;
    slot.innerHTML = `<div class="banner"><span>${esc(message)}</span><span class="row"><button class="btn btn-sm btn-danger-solid" id="confirm-yes">${esc(label)}</button><button class="btn btn-sm btn-ghost" id="confirm-no">Cancel</button></span></div>`;
    $("#confirm-yes").onclick = onYes;
    $("#confirm-no").onclick = () => { slot.innerHTML = ""; };
    $("#confirm-yes").focus();
  }

  function findOrCreateFriend(name) {
    const clean = name.trim();
    if (!clean) return null;
    let f = state.friends.find((x) => x.name.toLowerCase() === clean.toLowerCase());
    if (!f) { f = { id: uid(), name: clean, color: COLORS[state.friends.length % COLORS.length] }; state.friends.push(f); }
    return f;
  }

  // ---------- events ----------

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const h = currentHangout();
    const li = btn.closest("[data-id]");
    const id = li?.dataset.id;

    switch (action) {
      case "new-hangout": openHangoutDialog(null); break;
      case "edit-hangout": openHangoutDialog(h); break;
      case "close-dialog": closeDialog(); break;
      case "filter": filter = btn.dataset.v; render(); break;
      case "clear-examples":
        state = { friends: [state.friends.find((f) => f.name === "You") || { id: uid(), name: "You", color: COLORS[0] }], hangouts: [], currency: state.currency, examples: false };
        state.meId = state.friends[0].id;
        commit(); toast("Examples cleared"); break;
      case "rsvp": {
        const g = h.guests.find((x) => x.friendId === id);
        g.rsvp = g.rsvp === btn.dataset.v ? "pending" : btn.dataset.v;
        commit(); break;
      }
      case "remove-guest": h.guests = h.guests.filter((g) => g.friendId !== id); commit(); break;
      case "invite-all":
        state.friends.forEach((f) => { if (!h.guests.some((g) => g.friendId === f.id)) h.guests.push({ friendId: f.id, rsvp: "pending" }); });
        commit(); break;
      case "toggle-item": {
        const it = h[btn.dataset.list].find((x) => x.id === id);
        it.done = btn.checked; commit(); break;
      }
      case "remove-item": h[btn.dataset.list] = h[btn.dataset.list].filter((x) => x.id !== id); commit(); break;
      case "remove-schedule": h.schedule = h.schedule.filter((x) => x.id !== id); commit(); break;
      case "remove-expense": h.expenses = h.expenses.filter((x) => x.id !== id); commit(); break;
      case "vote": {
        const opt = h.poll.options.find((o) => o.id === btn.closest(".poll-opt").dataset.id);
        const fid = btn.dataset.friend;
        opt.votes = opt.votes.includes(fid) ? opt.votes.filter((x) => x !== fid) : [...opt.votes, fid];
        commit(); break;
      }
      case "reset-poll": h.poll = null; commit(); break;
      case "add-module": h.modules.push(btn.dataset.v); commit(); break;
      case "remove-module": h.modules = h.modules.filter((m) => m !== btn.dataset.v); commit(); toast(`${MODULES[btn.dataset.v]} hidden. Its data is kept`); break;
      case "copy-invite": toast((await copyText(inviteText(h))) ? "Invite copied. Paste it in your group chat" : "Couldn't copy. Try again"); break;
      case "share-link": {
        const url = `${location.origin}${location.pathname}#/import/${encodeShare(h)}`;
        toast((await copyText(url)) ? "Link copied. Friends can open it to add this hangout" : "Couldn't copy the link");
        break;
      }
      case "duplicate": {
        const copy = JSON.parse(JSON.stringify(h));
        Object.assign(copy, { id: uid(), title: `${h.title} (again)`, date: "", createdAt: Date.now() });
        copy.guests.forEach((g) => { g.rsvp = "pending"; });
        [...copy.tasks, ...copy.bring].forEach((t) => { t.done = false; });
        copy.expenses = [];
        if (copy.poll) copy.poll.options.forEach((o) => { o.votes = []; });
        state.hangouts.push(copy);
        save(); location.hash = `#/h/${copy.id}`; toast("Copied. Pick a new date");
        break;
      }
      case "delete-hangout":
        confirmInline(`Delete “${h.title}”? This can't be undone.`, "Delete hangout", () => {
          state.hangouts = state.hangouts.filter((x) => x.id !== h.id);
          save(); location.hash = "#/"; toast("Hangout deleted");
        });
        break;
      case "rename-friend": openRenameDialog(friend(id)); break;
      case "remove-friend": {
        const f = friend(id);
        state.friends = state.friends.filter((x) => x.id !== id);
        state.hangouts.forEach((x) => { x.guests = x.guests.filter((g) => g.friendId !== id); });
        commit(); toast(`${f.name} removed`); break;
      }
      case "export": {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `hangout-hq-backup-${todayISO()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        break;
      }
      case "reset-all":
        confirmInline("Erase every hangout and friend in this browser?", "Erase everything", () => {
          try { localStorage.removeItem(STORE_KEY); } catch (_) { /* ignore */ }
          state = { friends: [{ id: uid(), name: "You", color: COLORS[0] }], hangouts: [], currency: state.currency, examples: false };
          state.meId = state.friends[0].id;
          commit(); toast("Everything erased");
        });
        break;
      case "accept-import": {
        const newId = importShared(pendingImport);
        pendingImport = null;
        location.hash = `#/h/${newId}`;
        toast("Added to your hangouts");
        break;
      }
      case "dismiss-import": pendingImport = null; render(); break;
      default: break;
    }
  });

  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const fd = new FormData(form);
    const h = currentHangout();
    switch (form.dataset.form) {
      case "add-guest": {
        const f = findOrCreateFriend(fd.get("name") || "");
        if (!f) return;
        if (h.guests.some((g) => g.friendId === f.id)) { toast(`${f.name} is already invited`); return; }
        h.guests.push({ friendId: f.id, rsvp: "pending" });
        commit(); $('[data-form="add-guest"] input')?.focus(); break;
      }
      case "add-item": {
        const list = form.dataset.list;
        const text = (fd.get("text") || "").trim();
        if (!text) return;
        h[list].push({ id: uid(), text, friendId: fd.get("friendId") || "", done: false });
        commit(); $(`[data-form="add-item"][data-list="${list}"] input`)?.focus(); break;
      }
      case "add-schedule":
        h.schedule.push({ id: uid(), time: fd.get("time") || "", text: fd.get("text").trim() });
        commit(); $('[data-form="add-schedule"] input[name="text"]')?.focus(); break;
      case "add-expense": {
        const amount = Number(fd.get("amount"));
        const paidBy = fd.get("paidBy");
        const split = fd.getAll("split");
        if (!paidBy) { toast("Pick who paid"); return; }
        if (!split.length) { toast("Pick at least one person to split with"); return; }
        if (!(amount > 0)) { toast("Enter an amount above zero"); return; }
        h.expenses.push({ id: uid(), text: fd.get("text").trim(), amount, paidBy, split });
        commit(); break;
      }
      case "new-poll": {
        const options = String(fd.get("options")).split(",").map((s) => s.trim()).filter(Boolean);
        if (options.length < 2) { toast("Add at least two options, separated by commas"); return; }
        h.poll = { question: fd.get("question").trim(), options: options.map((text) => ({ id: uid(), text, votes: [] })) };
        commit(); break;
      }
      case "add-option":
        h.poll.options.push({ id: uid(), text: fd.get("text").trim(), votes: [] });
        commit(); break;
      case "add-friend": {
        const name = (fd.get("name") || "").trim();
        if (state.friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) { toast(`${name} is already on your list`); return; }
        findOrCreateFriend(name);
        commit(); $('[data-form="add-friend"] input')?.focus(); break;
      }
      default: break;
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    const h = currentHangout();
    if (el.dataset.field === "assign" && h) {
      const li = el.closest("[data-id]");
      const list = el.closest("[data-module]").dataset.module;
      const it = h[list].find((x) => x.id === li.dataset.id);
      it.friendId = el.value; commit();
    } else if (el.dataset.field === "budget" && h) {
      h.budget = Math.max(0, Number(el.value) || 0); commit();
    } else if (el.dataset.field === "currency") {
      state.currency = el.value.trim() || "$"; commit();
    } else if (el.id === "import-file" && el.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data.hangouts) || !Array.isArray(data.friends)) throw new Error("bad");
          state = data; commit(); toast("Backup imported");
        } catch (_) { toast("That file isn't a Hangout HQ backup"); }
      };
      reader.readAsText(el.files[0]);
    }
  });

  let notesTimer;
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "search") { query = el.value; render(); return; }
    if (el.dataset.field === "notes") {
      const h = currentHangout();
      h.notes = el.value;
      clearTimeout(notesTimer);
      notesTimer = setTimeout(save, 400);
    }
  });

  window.addEventListener("hashchange", route);
  route();
})();
