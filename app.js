/* Hangout HQ — plan any hangout, from a quick coffee to a big event.
   Plain JS, no build step. Data lives in this browser's localStorage. */
(() => {
  "use strict";

  const STORE_KEY = "hangout-hq-v1";
  const DEFAULT_CURRENCY = "₱";
  const COLORS = ["#2f5bea", "#e2557a", "#1f8a5b", "#b8650a", "#7b4fd6", "#0f8a9c", "#c53c3c", "#5b6b2f"];

  const SIZES = [
    { id: 1, label: "Quick hang", hint: "2–5 people, barely any planning", modules: ["guests", "recs", "ideas", "notes"] },
    { id: 2, label: "Get-together", hint: "5–12 people, a few things to sort", modules: ["guests", "bring", "poll", "recs", "ideas", "notes"] },
    { id: 3, label: "Party", hint: "10–30 people, tasks and costs", modules: ["guests", "bring", "tasks", "budget", "split", "schedule", "notes"] },
    { id: 4, label: "Big event", hint: "30+ people, trips, milestones", modules: ["guests", "tasks", "budget", "split", "schedule", "bring", "poll", "notes"] },
  ];

  const MODULES = {
    guests: "Guests",
    bring: "Who's bringing what",
    tasks: "To-dos",
    budget: "Costs",
    split: "Split the bill",
    schedule: "Schedule",
    poll: "Group vote",
    recs: "Recommendations",
    ideas: "Ideas nearby",
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
      modules: ["guests", "tasks", "budget", "split", "schedule", "bring", "poll", "notes"],
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
        { id: uid(), text: "Cake", amount: 1800, paidBy: mika, everyone: true, split: [] },
        { id: uid(), text: "Rooftop deposit", amount: 3000, paidBy: andre, everyone: true, split: [] },
        { id: uid(), text: "Decorations", amount: 900, paidBy: you, everyone: true, split: [] },
      ],
      costs: [
        { id: uid(), text: "Rooftop entry", amount: 300 },
        { id: uid(), text: "Food and drinks", amount: 650 },
      ],
      budget: 8000,
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
    return { friends, hangouts: [bday, coffee, beach], currency: DEFAULT_CURRENCY, examples: true, meId: you };
  }

  // ---------- storage & accounts ----------
  // With a Firebase config (firebase-config.js), each account keeps its data in
  // Firestore at users/<uid> and must sign in first. Without one, the app runs on
  // this browser's localStorage only, as before.

  const FB_CONFIG = window.HANGOUT_FIREBASE_CONFIG;
  const cloud = !!(FB_CONFIG && FB_CONFIG.apiKey);
  const MIGRATED_KEY = "hangout-hq-moved-to-account";

  const validState = (s) => !!(s && Array.isArray(s.hangouts) && Array.isArray(s.friends));
  function readLocal() {
    try { const raw = JSON.parse(localStorage.getItem(STORE_KEY)); if (validState(raw)) return raw; } catch (_) { /* none */ }
    return null;
  }
  function load() {
    const existing = readLocal();
    if (existing) return existing;
    // Save the seed right away so its ids (and links to them) survive a reload.
    const fresh = seed();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(fresh)); } catch (_) { /* storage unavailable */ }
    return fresh;
  }

  let state = cloud ? null : load();
  let auth = null, db = null, user = null;
  let authReady = !cloud;    // cloud mode waits for Firebase to report who is signed in
  let loadError = "";
  let unsubDoc = null, saveTimer = null, lastSynced = "", creating = false, pendingName = "";

  // Key-sorted JSON, so our own write echoing back from Firestore compares equal.
  function stableJSON(v) {
    if (Array.isArray(v)) return `[${v.map(stableJSON).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stableJSON(v[k])}`).join(",")}}`;
    return JSON.stringify(v === undefined ? null : v);
  }

  const save = () => {
    if (!cloud) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { toast("Couldn't save in this browser"); }
      return;
    }
    if (!user || !state) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushToCloud, 400);
  };

  function pushToCloud() {
    clearTimeout(saveTimer);
    if (!user || !state) return Promise.resolve();
    writeList().catch(() => { /* retried on the next save */ });
    [...state.hangouts.filter((h) => h.shareId), ...joinedHangouts.filter(canEdit)]
      .forEach((h) => writeShare(h).catch(() => { /* retried on the next save */ }));
    const json = stableJSON(state);
    if (json === lastSynced) return Promise.resolve();
    lastSynced = json;
    return db.collection("users").doc(user.uid)
      .set({ state: JSON.parse(json), updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(() => { lastSynced = ""; toast("Couldn't save. Check your connection"); });
  }

  function startCloud() {
    if (!window.firebase) {
      authReady = true;
      loadError = "Couldn't reach the sign-in service. Check your connection and reload.";
      return;
    }
    firebase.initializeApp(FB_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged((u) => {
      authReady = true;
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      resetSharing();
      user = u; state = null; lastSynced = ""; creating = false; loadError = "";
      authMode = "signin";
      render();
      if (!u) return;
      unsubDoc = db.collection("users").doc(u.uid).onSnapshot((snap) => {
        if (snap.metadata.hasPendingWrites) return;
        if (!snap.exists) { createAccountData(u); return; }
        const remote = snap.data().state;
        if (!validState(remote)) return;
        const json = stableJSON(remote);
        if (state && json === lastSynced) return; // our own save coming back
        lastSynced = json;
        state = remote;
        if (upgradeState(state)) save();
        render();
      }, () => { loadError = "Couldn't load your hangouts. Check your connection and reload."; render(); });
    });
  }

  // First sign-in: hangouts already in this browser move into the account (once);
  // otherwise the account starts with the examples.
  function createAccountData(u) {
    if (creating) return;
    creating = true;
    const name = pendingName || u.displayName || (u.email || "").split("@")[0] || "You";
    let moved = false;
    let fresh = readLocal();
    let alreadyMoved = false;
    try { alreadyMoved = !!localStorage.getItem(MIGRATED_KEY); } catch (_) { /* ignore */ }
    if (fresh && !fresh.examples && fresh.hangouts.length && !alreadyMoved) {
      moved = true;
      try { localStorage.setItem(MIGRATED_KEY, u.uid); } catch (_) { /* ignore */ }
    } else {
      fresh = seed();
    }
    const me = fresh.friends.find((f) => f.id === fresh.meId);
    if (me && me.name === "You") me.name = name;
    state = fresh;
    pendingName = "";
    render();
    pushToCloud();
    if (moved) toast("Moved the hangouts from this browser into your account");
  }

  async function signOut() {
    await pushToCloud();
    await auth.signOut();
    location.hash = "#/";
  }

  // ---------- pictures (profile + hangout covers) ----------
  // State keeps only picture ids: a friend's `photoId` and a hangout's `cover.id`.
  // The image is a resized JPEG data URL stored on its own: in Firestore at
  // users/<uid>/photos/<id> when signed in, or in this browser's IndexedDB without accounts.

  const photoCache = new Map();   // id -> data URL, or null when it can't be found
  const photoLoads = new Map();   // id -> in-flight promise
  const busy = { profile: false, covers: {} };

  const idb = (() => {
    let opening;
    const open = () => opening || (opening = new Promise((res, rej) => {
      const r = indexedDB.open("hangout-hq-photos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const run = async (mode, fn) => {
      const d = await open();
      return new Promise((res, rej) => {
        const t = d.transaction("photos", mode);
        const req = fn(t.objectStore("photos"));
        t.oncomplete = () => res(req.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      get: (id) => run("readonly", (st) => st.get(id)),
      put: (id, v) => run("readwrite", (st) => st.put(v, id)),
      del: (id) => run("readwrite", (st) => st.delete(id)),
    };
  })();

  const photoDoc = (id) => db.collection("users").doc(user.uid).collection("photos").doc(id);
  // Pictures of places (picks and recommendations) must be visible to friends, so
  // they live apart from private photos: pictures/<id>, readable by anyone signed in,
  // written only by whoever uploaded them. Their ids start with PUBLIC_PREFIX.
  const PUBLIC_PREFIX = "pub-";
  const isPublicPhoto = (id) => String(id || "").startsWith(PUBLIC_PREFIX);
  const pictureDoc = (id) => db.collection("pictures").doc(id);
  const photoStore = {
    put(id, data, kind) {
      if (!cloud) return idb.put(id, data);
      if (isPublicPhoto(id)) return pictureDoc(id).set({ owner: user.uid, data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      return photoDoc(id).set({ data, kind, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    },
    async get(id) {
      if (!cloud) return (await idb.get(id)) || null;
      const snap = await (isPublicPhoto(id) ? pictureDoc(id) : photoDoc(id)).get();
      return snap.exists ? snap.data().data : null;
    },
    del(id) {
      if (!id) return Promise.resolve();
      photoCache.delete(id);
      return (cloud ? (isPublicPhoto(id) ? pictureDoc(id) : photoDoc(id)).delete() : idb.del(id)).catch(() => { /* already gone, or not ours */ });
    },
  };
  const deleteCoversOf = (hangouts) => hangouts.forEach((x) => photoStore.del(x.cover?.id));

  function loadPhoto(id) {
    if (photoCache.has(id)) return Promise.resolve(photoCache.get(id));
    if (!photoLoads.has(id)) {
      photoLoads.set(id, photoStore.get(id)
        .then((src) => { photoCache.set(id, src); return src; })
        .catch(() => null)
        .finally(() => photoLoads.delete(id)));
    }
    return photoLoads.get(id);
  }

  // Fill in any <img data-photo> that has no source yet; drop it if the picture is gone.
  function hydratePhotos(root) {
    root.querySelectorAll("img[data-photo]:not([src])").forEach((img) => {
      loadPhoto(img.dataset.photo).then((src) => {
        if (src) img.src = src;
        else img.remove();
      });
    });
  }
  const photoImg = (id, alt = "") => {
    const src = photoCache.get(id);
    return `<img data-photo="${esc(id)}" alt="${esc(alt)}" ${src ? `src="${src}"` : ""}>`;
  };

  // Resize so the longest side is at most `maxSide` and re-encode as JPEG, shrinking
  // until it fits well under Firestore's 1 MB document limit.
  async function compressImage(file, maxSide) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("decode"));
        i.src = url;
      });
      let max = maxSide, quality = 0.82, out = "";
      for (let tries = 0; tries < 6; tries++) {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const ht = Math.max(1, Math.round(img.naturalHeight * scale));
        const c = document.createElement("canvas");
        c.width = w; c.height = ht;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; // transparent PNGs get a white background, not black
        ctx.fillRect(0, 0, w, ht);
        ctx.drawImage(img, 0, 0, w, ht);
        out = c.toDataURL("image/jpeg", quality);
        if (out.length < 900000) break;
        max = Math.round(max * 0.8);
        quality = Math.max(0.6, quality - 0.08);
      }
      return out;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const isImage = (f) => f && (f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));

  async function uploadPicture(file, maxSide, kind) {
    const data = await compressImage(file, maxSide);
    const id = uid();
    await photoStore.put(id, data, kind);
    photoCache.set(id, data);
    return id;
  }

  function pictureError(e) {
    toast(e && e.message === "decode" ? "That picture couldn't be opened. Try a JPEG or PNG" : "The picture didn't upload. Check your connection and try again");
  }

  async function setCover(hangoutId, file) {
    if (!isImage(file)) { toast("Pick a photo or image file"); return; }
    busy.covers[hangoutId] = true;
    render();
    try {
      const id = await uploadPicture(file, 1600, "cover");
      const h = hangout(hangoutId);
      if (!h) { photoStore.del(id); return; }
      const old = h.cover?.id;
      h.cover = { id };
      save();
      photoStore.del(old);
      toast("Cover photo updated");
    } catch (e) {
      pictureError(e);
    } finally {
      delete busy.covers[hangoutId];
      render();
    }
  }
  function removeCover(h) {
    photoStore.del(h.cover?.id);
    h.cover = null;
  }

  async function setProfilePicture(file) {
    if (!isImage(file)) { toast("Pick a photo or image file"); return; }
    const me = friend(state.meId);
    if (!me) return;
    busy.profile = true;
    render(); refreshAccountDialog();
    try {
      const id = await uploadPicture(file, 480, "profile");
      const old = me.photoId;
      me.photoId = id;
      save();
      photoStore.del(old);
      toast("Profile picture updated");
    } catch (e) {
      pictureError(e);
    } finally {
      busy.profile = false;
      render(); refreshAccountDialog();
    }
  }
  function removeProfilePicture() {
    const me = friend(state.meId);
    if (!me?.photoId) return;
    photoStore.del(me.photoId);
    delete me.photoId;
    commit(); refreshAccountDialog();
    toast("Profile picture removed");
  }

  // The earlier photo gallery is gone: its first photo becomes the hangout's cover
  // (if it has none) and the rest are deleted.
  // Bring saved data up to date with the current version of the app.
  function upgradeState(s) {
    let changed = retireGallery(s);
    // The default currency became the Philippine peso; switch accounts that never picked one.
    if ((!s.currency || s.currency === "$") && !s.currencyChosen) { s.currency = DEFAULT_CURRENCY; changed = true; }
    if (!Array.isArray(s.picks)) { s.picks = []; changed = true; }
    s.hangouts.forEach((h) => {
      if (!Array.isArray(h.costs)) { h.costs = []; changed = true; }
      if (!Array.isArray(h.recs)) { h.recs = []; changed = true; }
      // Bills used to be split between whoever was going when they were added, which went
      // stale as people answered. They now split between everyone, kept up to date.
      h.expenses.forEach((e) => { if (e.everyone === undefined) { e.everyone = true; changed = true; } });
      // Costs became per-person amounts; the earlier shared costs now live under Split the bill.
      if (h.modules.includes("budget") && !h.modules.includes("split") && h.expenses.length) {
        h.modules.splice(h.modules.indexOf("budget") + 1, 0, "split");
        changed = true;
      }
    });
    return changed;
  }

  function retireGallery(s) {
    let changed = false;
    s.hangouts.forEach((h) => {
      if (!Array.isArray(h.photos)) return;
      const list = h.photos;
      if (list.length && !h.cover) { h.cover = { id: list[0].id }; list.slice(1).forEach((ph) => photoStore.del(ph.id)); }
      else list.forEach((ph) => photoStore.del(ph.id));
      delete h.photos;
      changed = true;
    });
    return changed;
  }

  // ---------- helpers ----------

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const friend = (id) => state.friends.find((f) => f.id === id) || sharedPeople.get(id);
  const fname = (id) => (id === EVERYONE ? "Everyone" : friend(id)?.name || "Someone");
  const hangout = (id) => state.hangouts.find((h) => h.id === id) || joinedHangouts.find((h) => h.id === id);
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const money = (n) => {
    const v = Math.round(n * 100) / 100;
    return `${v < 0 ? "−" : ""}${state.currency || DEFAULT_CURRENCY}${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  function avatar(id, extra = "") {
    const f = friend(id);
    const name = f?.name || "?";
    return `<span class="avatar ${extra}" style="background:${esc(f?.color || "#888")}" title="${esc(name)}">${esc(initials(name))}${f?.photoId ? photoImg(f.photoId) : ""}</span>`;
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

  // ---------- shared hangouts ----------
  // A shared hangout lives in Firestore at shares/<id>, one live copy for everyone:
  //   hangout, friends    the plan and the people it mentions (owner and editors write)
  //   members             {<uid>: {name, rsvp, role}}: people who joined with the link;
  //                       each writes only their own entry, only the owner sets roles
  //   editors             uids allowed to change the plan (kept in step with roles)
  // The owner's own copy stays in their account; their app links each member as a
  // guest (friend id "u_<uid>") and mirrors member RSVPs into the plan.
  // Without accounts, the whole hangout is packed into the link instead (#/import/...).

  const EVERYONE = "*";
  const joinedHangouts = [];          // hangouts others shared with me, live
  const sharedPeople = new Map();     // friend id -> person, from shared copies and members
  const shareMeta = new Map();        // share id -> {createdBy, ownerName, members, editors}
  const shareSubs = new Map();        // share id -> unsubscribe
  const sharesSent = new Map();       // share id -> last payload written this session
  let pendingShareId = null, shareLoading = false, pendingJoin = null;

  const shareIdOf = (h) => h.shareId || h._shareId || null;
  const metaOf = (h) => shareMeta.get(shareIdOf(h)) || null;
  const isJoined = (h) => !!h?._shareId;
  const roleIn = (h) => (!isJoined(h) ? "owner" : metaOf(h)?.members?.[user?.uid]?.role === "editor" ? "editor" : "viewer");
  const canEdit = (h) => roleIn(h) !== "viewer";
  const memberFid = (uidv) => `u_${uidv}`;
  const colorFor = (str) => COLORS[[...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];
  const myName = () => user?.displayName || friend(state?.meId)?.name || (user?.email || "").split("@")[0] || "Friend";
  const shareRef = (sid) => db.collection("shares").doc(sid);
  const FV = () => firebase.firestore.FieldValue;

  // What the shared copy holds: the plan (no cover, no local fields) and the people it mentions.
  function sharePayload(h) {
    const ids = new Set([
      ...h.guests.map((g) => g.friendId), ...h.bring.map((b) => b.friendId), ...h.tasks.map((t) => t.friendId),
      ...h.expenses.flatMap((e) => [e.paidBy, ...e.split]), ...(h.poll?.options || []).flatMap((o) => o.votes),
    ].filter((x) => x && x !== EVERYONE));
    const { cover, shareId, _shareId, ...rest } = h;
    return JSON.parse(JSON.stringify({
      v: 1, hangout: { ...rest, cover: null },
      friends: [...ids].map((x) => friend(x)).filter(Boolean).map(({ photoId, ...f }) => f),
    }));
  }

  function writeShare(h) {
    const sid = shareIdOf(h);
    const payload = sharePayload(h);
    const json = stableJSON(payload);
    if (sharesSent.get(sid) === json) return Promise.resolve();
    sharesSent.set(sid, json);
    const fields = { hangout: payload.hangout, friends: payload.friends, updatedBy: user.uid, updatedAt: FV().serverTimestamp() };
    const ref = shareRef(sid);
    const write = isJoined(h)
      ? ref.update(fields)
      : ref.update({ ...fields, ownerName: myName() }).catch((e) => {
          // The first write creates the shared copy. Updating a copy that doesn't exist
          // yet is refused by the rules (permission-denied), not reported as not-found.
          if (e && (e.code === "not-found" || e.code === "permission-denied")) {
            return ref.set({ ...fields, ownerName: myName(), createdBy: user.uid, members: {}, editors: [] });
          }
          throw e;
        });
    return write.catch((e) => { sharesSent.delete(sid); throw e; });
  }

  function shareLink(h) {
    const base = `${location.origin}${location.pathname}`;
    if (!cloud || !user) return `${base}#/import/${encodeShare(h)}`;
    if (isJoined(h)) return `${base}#/s/${h._shareId}`;
    if (!h.shareId) { h.shareId = newShareId(); save(); }
    writeShare(h).catch(() => toast("Couldn't create the share link. Check your connection and try again"));
    syncShareSubs();
    return `${base}#/s/${h.shareId}`;
  }

  const SHARE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const newShareId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => SHARE_CHARS[b % SHARE_CHARS.length]).join("");

  function resetSharing() {
    shareSubs.forEach((unsub) => unsub());
    shareSubs.clear(); shareMeta.clear(); sharedPeople.clear(); sharesSent.clear();
    joinedHangouts.length = 0;
    pendingJoin = null;
  }

  // Subscribe to every shared copy this account owns or has joined.
  function syncShareSubs() {
    if (!cloud || !user || !state) return;
    const want = new Set([...state.hangouts.filter((h) => h.shareId).map((h) => h.shareId), ...(state.joined || [])]);
    shareSubs.forEach((unsub, sid) => {
      if (want.has(sid)) return;
      unsub(); shareSubs.delete(sid); shareMeta.delete(sid);
      const i = joinedHangouts.findIndex((h) => h._shareId === sid);
      if (i >= 0) joinedHangouts.splice(i, 1);
    });
    want.forEach((sid) => {
      if (!shareSubs.has(sid)) shareSubs.set(sid, shareRef(sid).onSnapshot((snap) => onShareSnap(sid, snap), () => { /* keeps the last copy */ }));
    });
  }

  function onShareSnap(sid, snap) {
    if (snap.metadata.hasPendingWrites) return;
    const own = state?.hangouts.find((h) => h.shareId === sid);
    if (!snap.exists) {
      shareMeta.set(sid, { members: {}, editors: [] });
      if (!own && (state.joined || []).includes(sid)) {
        const gone = joinedHangouts.find((h) => h._shareId === sid);
        state.joined = state.joined.filter((x) => x !== sid);
        save();
        toast(`${gone ? `“${gone.title}”` : "A hangout shared with you"} was deleted by its owner`);
      }
      render();
      return;
    }
    const d = snap.data();
    const members = d.members || {};
    shareMeta.set(sid, { createdBy: d.createdBy, ownerName: d.ownerName || "", members, editors: d.editors || [] });
    (d.friends || []).forEach((f) => { if (!state.friends.some((x) => x.id === f.id)) sharedPeople.set(f.id, f); });
    Object.entries(members).forEach(([m, info]) => {
      sharedPeople.set(memberFid(m), { id: memberFid(m), name: info.name || "Friend", color: colorFor(m), uid: m });
    });

    if (own) {
      // Owner: take in editors' changes, add new members as guests, mirror their RSVPs.
      let changed = false;
      const remote = d.hangout && stableJSON({ v: 1, hangout: d.hangout, friends: d.friends || [] });
      if (d.updatedBy && d.updatedBy !== user.uid && remote && remote !== sharesSent.get(sid)) {
        const keep = { cover: own.cover || null, shareId: own.shareId };
        Object.keys(own).forEach((k) => delete own[k]);
        Object.assign(own, JSON.parse(JSON.stringify(d.hangout)), keep);
        (d.friends || []).forEach((f) => { if (!state.friends.some((x) => x.id === f.id)) state.friends.push({ ...f }); });
        sharesSent.set(sid, remote);
        changed = true;
      }
      Object.entries(members).forEach(([m, info]) => {
        // Link the account to a guest already on the list with the same name, if there is one.
        const sameName = (x) => !x.uid && (x.name || "").trim().toLowerCase() === (info.name || "").trim().toLowerCase();
        let f = state.friends.find((x) => x.uid === m)
          || own.guests.map((g2) => state.friends.find((x) => x.id === g2.friendId)).find((x) => x && sameName(x));
        if (f && !f.uid) { f.uid = m; changed = true; }
        if (!f) { f = { id: memberFid(m), name: info.name || "Friend", color: colorFor(m), uid: m }; state.friends.push(f); changed = true; }
        else if (info.name && f.name !== info.name) { f.name = info.name; changed = true; }
        const fid = f.id;
        const g = own.guests.find((x) => x.friendId === fid);
        if (!g) { own.guests.push({ friendId: fid, rsvp: info.rsvp || "pending" }); changed = true; }
        else if (info.rsvp && g.rsvp !== info.rsvp) { g.rsvp = info.rsvp; changed = true; }
      });
      if (changed) save();
    } else if ((state.joined || []).includes(sid)) {
      if (!members[user.uid]) {
        state.joined = state.joined.filter((x) => x !== sid);
        const i = joinedHangouts.findIndex((h) => h._shareId === sid);
        if (i >= 0) joinedHangouts.splice(i, 1);
        save();
        toast(`You're no longer a guest of “${d.hangout?.title || "a hangout"}”`);
        render();
        return;
      }
      const h = JSON.parse(JSON.stringify(d.hangout));
      h._shareId = sid;
      h.cover = null;
      h.guests.forEach((g) => { const m = friend(g.friendId)?.uid; if (m && members[m]?.rsvp) g.rsvp = members[m].rsvp; });
      sharesSent.set(sid, stableJSON(sharePayload(h)));
      const i = joinedHangouts.findIndex((x) => x._shareId === sid);
      if (i >= 0) joinedHangouts[i] = h; else joinedHangouts.push(h);
    }
    render();
  }

  // Someone opened a short link: look the hangout up, then offer to join.
  function resolveShare() {
    const sid = pendingShareId;
    shareLoading = true;
    shareRef(sid).get()
      .then((snap) => {
        const d = snap.exists ? snap.data() : null;
        if (!d || !d.hangout) { toast("That invite link doesn't work anymore. Ask for a new one"); return; }
        if (d.createdBy === user.uid) { location.hash = `#/h/${d.hangout.id}`; return; }
        if (d.members && d.members[user.uid]) {
          if (!(state.joined || []).includes(sid)) { state.joined = [...(state.joined || []), sid]; save(); }
          location.hash = `#/h/${d.hangout.id}`;
          return;
        }
        pendingJoin = { sid, title: d.hangout.title, owner: d.ownerName || "A friend", hangoutId: d.hangout.id };
      })
      .catch(() => toast("Couldn't open the invite. Check your connection and reload"))
      .finally(() => { pendingShareId = null; shareLoading = false; render(); });
  }

  function joinShare() {
    const { sid, title, hangoutId } = pendingJoin;
    pendingJoin = null;
    shareRef(sid).update({ [`members.${user.uid}`]: { name: myName(), rsvp: "pending", role: "viewer", joinedAt: Date.now() } })
      .then(() => {
        state.joined = [...new Set([...(state.joined || []), sid])];
        save();
        syncShareSubs();
        location.hash = `#/h/${hangoutId}`;
        toast(`You joined “${title}”. Let them know if you're going`);
      })
      .catch(() => { toast("Couldn't join. Check your connection and try again"); render(); });
  }

  function leaveShare(h) {
    const sid = h._shareId;
    shareRef(sid).update({ [`members.${user.uid}`]: FV().delete() })
      .then(() => {
        state.joined = (state.joined || []).filter((x) => x !== sid);
        const i = joinedHangouts.findIndex((x) => x._shareId === sid);
        if (i >= 0) joinedHangouts.splice(i, 1);
        save();
        location.hash = "#/";
        toast(`You left “${h.title}”`);
      })
      .catch(() => toast("Couldn't leave. Check your connection and try again"));
  }

  // A member's own RSVP (or the owner answering for them) lives in their member entry.
  function setMemberRsvp(h, memberUid, rsvp) {
    return shareRef(shareIdOf(h)).update({ [`members.${memberUid}.rsvp`]: rsvp })
      .catch(() => toast("Couldn't save the RSVP. Check your connection"));
  }

  const memberName = (memberUid) => state.friends.find((x) => x.uid === memberUid)?.name || fname(memberFid(memberUid));

  function setEditor(h, memberUid, on) {
    return shareRef(h.shareId).update({
      [`members.${memberUid}.role`]: on ? "editor" : "viewer",
      editors: on ? FV().arrayUnion(memberUid) : FV().arrayRemove(memberUid),
    }).then(() => toast(on ? `${memberName(memberUid)} can now edit this hangout` : `${memberName(memberUid)} can view only`))
      .catch(() => toast("Couldn't change the permission. Check your connection"));
  }

  function removeMember(h, memberUid) {
    return shareRef(h.shareId).update({ [`members.${memberUid}`]: FV().delete(), editors: FV().arrayRemove(memberUid) })
      .catch(() => { /* they stay a member until the next try */ });
  }

  function encodeShare(h) {
    const payload = sharePayload(h);
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
    h.cover = null;
    delete h.shareId;
    if (!Array.isArray(h.costs)) h.costs = [];
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
    if (h.modules.includes("budget") && perPerson(h)) lines.push(`Cost: ${money(perPerson(h))} per person`);
    return lines.join("\n");
  }

  // ---------- money ----------

  // Costs (h.costs) are what ONE person pays, e.g. a ticket: they simply add up.
  // Bills (h.expenses) are paid by one person for the group and split evenly
  // between the people in `split`; settling up counts only bills someone paid.
  const perPerson = (h) => (h.costs || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const headcount = (h) => h.guests.filter((g) => g.rsvp === "going").length || h.guests.length;
  const groupTotal = (h) => perPerson(h) * headcount(h);
  const billsTotal = (h) => h.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // "Everyone" on a bill means every guest who hasn't said they can't come, worked out
  // when the numbers are shown, so people who RSVP or join later are included.
  const billPeople = (h) => h.guests.filter((g) => g.rsvp !== "no").map((g) => g.friendId);
  const splitOf = (h, e) => (e.everyone ? billPeople(h) : e.split || []).filter((x) => x && x !== EVERYONE);

  // All bill math is in whole centavos so every line and total adds up exactly.
  const toCents = (n) => Math.round((Number(n) || 0) * 100);

  // How a paid bill is shared, in centavos. Leftover centavos (e.g. ₱100 ÷ 3) go one
  // each to the people who didn't pay, so the payer never ends up owing themself.
  function billShares(h, e) {
    const people = splitOf(h, e);
    const cents = toCents(e.amount);
    if (!people.length || cents <= 0) return [];
    const base = Math.floor(cents / people.length);
    let extra = cents - base * people.length;
    const order = [...people.filter((p) => p !== e.paidBy), ...people.filter((p) => p === e.paidBy)];
    return order.map((id) => ({ id, cents: base + (extra-- > 0 ? 1 : 0) }));
  }

  // Per person, over the bills someone has paid: their share, what they paid, and the
  // difference (positive: they get money back; negative: they owe). Amounts in pesos.
  function billBreakdown(h) {
    const rows = {};
    const row = (id) => rows[id] || (rows[id] = { id, share: 0, paid: 0 });
    h.expenses.forEach((e) => {
      if (!e.paidBy) return;
      const shares = billShares(h, e);
      if (!shares.length) return;
      row(e.paidBy).paid += toCents(e.amount);
      shares.forEach((x) => { row(x.id).share += x.cents; });
    });
    return Object.values(rows).map((r) => ({ id: r.id, share: r.share / 100, paid: r.paid / 100, balance: (r.paid - r.share) / 100 }));
  }

  // Settle up by bill: everyone pays each bill's payer their share of it. When two
  // people owe each other, only the difference changes hands. Each payment keeps the
  // bills it comes from, so it can be checked against the list above.
  function settleByBill(h) {
    const pairs = new Map(); // "a|b" with a<b -> {a, b, net (a→b, cents), items}
    h.expenses.forEach((e) => {
      if (!e.paidBy) return;
      billShares(h, e).forEach(({ id, cents }) => {
        if (id === e.paidBy || !cents) return;
        const [a, b] = id < e.paidBy ? [id, e.paidBy] : [e.paidBy, id];
        const key = `${a}|${b}`;
        const p = pairs.get(key) || { a, b, net: 0, items: [] };
        const sign = id === a ? 1 : -1;           // +: a owes b, -: b owes a
        p.net += sign * cents;
        p.items.push({ from: id, text: e.text, cents });
        pairs.set(key, p);
      });
    });
    const out = [];
    pairs.forEach((p) => {
      if (!p.net) return;
      const from = p.net > 0 ? p.a : p.b, to = p.net > 0 ? p.b : p.a;
      out.push({
        from, to, amount: Math.abs(p.net) / 100,
        plus: p.items.filter((x) => x.from === from).map((x) => ({ text: x.text, amount: x.cents / 100 })),
        minus: p.items.filter((x) => x.from !== from).map((x) => ({ text: x.text, amount: x.cents / 100 })),
      });
    });
    return out;
  }

  // Fewest payments: the same balances, settled with as few transfers as possible.
  function settleFewest(h) {
    const debt = [], cred = [];
    billBreakdown(h).forEach((r) => {
      const c = Math.round(r.balance * 100);
      if (c < 0) debt.push({ id: r.id, v: -c });
      else if (c > 0) cred.push({ id: r.id, v: c });
    });
    debt.sort((a, b) => b.v - a.v); cred.sort((a, b) => b.v - a.v);
    const out = [];
    let i = 0, j = 0;
    while (i < debt.length && j < cred.length) {
      const amt = Math.min(debt[i].v, cred[j].v);
      out.push({ from: debt[i].id, to: cred[j].id, amount: amt / 100 });
      debt[i].v -= amt; cred[j].v -= amt;
      if (!debt[i].v) i++;
      if (!cred[j].v) j++;
    }
    return out;
  }

  let settleMode = "bill"; // "bill" | "fewest"
  try { if (localStorage.getItem("hangout-hq-settle") === "fewest") settleMode = "fewest"; } catch (_) { /* default */ }

  // ---------- recommendations & group ratings ----------
  // A hangout's recommended places live in h.recs (added by the owner and editors).
  // Everyone rates them 1-5 stars. Owner and local ratings sit on the place itself
  // (rec.ratings, keyed by account); people who joined a shared hangout keep theirs
  // in their own member entry (members.<uid>.ratings.<rec id>), which the rules let
  // even view-only guests write.

  const raterKey = () => user?.uid || "me";
  const validStars = (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 5;

  function recRatings(h, rec) {
    const all = { ...(rec.ratings || {}) };
    Object.entries(metaOf(h)?.members || {}).forEach(([m, info]) => {
      const v = info.ratings?.[rec.id];
      if (v) all[m] = v;
    });
    return Object.values(all).map(Number).filter(validStars);
  }
  function myRating(h, rec) {
    if (isJoined(h)) return Number(metaOf(h)?.members?.[user.uid]?.ratings?.[rec.id]) || 0;
    return Number(rec.ratings?.[raterKey()]) || 0;
  }
  function ratingSummary(h, rec) {
    const list = recRatings(h, rec);
    return { avg: list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0, count: list.length };
  }
  const sortRecs = (h) => [...(h.recs || [])].map((r) => ({ r, ...ratingSummary(h, r) }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count || (a.r.addedAt || 0) - (b.r.addedAt || 0));

  function rateRec(h, rec, stars) {
    const next = myRating(h, rec) === stars ? 0 : stars; // tapping your rating again clears it
    if (isJoined(h)) {
      const me = metaOf(h)?.members?.[user.uid];
      if (!me) return;
      me.ratings = { ...(me.ratings || {}) };
      if (next) me.ratings[rec.id] = next; else delete me.ratings[rec.id];
      shareRef(h._shareId).update({ [`members.${user.uid}.ratings.${rec.id}`]: next ? next : FV().delete() })
        .catch(() => toast("Couldn't save your rating. Check your connection"));
      render();
      return;
    }
    rec.ratings = { ...(rec.ratings || {}) };
    if (next) rec.ratings[raterKey()] = next; else delete rec.ratings[raterKey()];
    commit();
  }

  // Your groups' ratings across every hangout, by OpenStreetMap place, for Ideas nearby.
  function groupRatingIndex() {
    const index = new Map();
    [...(state?.hangouts || []), ...joinedHangouts].forEach((h) => (h.recs || []).forEach((rec) => {
      if (!rec.osm) return;
      const list = recRatings(h, rec);
      if (!list.length) return;
      const cur = index.get(rec.osm) || { sum: 0, count: 0 };
      index.set(rec.osm, { sum: cur.sum + list.reduce((a, b) => a + b, 0), count: cur.count + list.length });
    }));
    return index;
  }
  const starsText = (avg, count) => (count ? `★ ${avg.toFixed(1)} <span class="muted">(${count})</span>` : "");

  const REC_KINDS = ["Food", "Café", "Dessert", "Bar", "Park", "Beach", "Karaoke", "Cinema", "Mall", "Museum", "Activity", "Other"];

  // Places from Ideas nearby have coordinates; your own picks are searched by name and "where".
  function recMapLink(r) {
    if (r.lat) return `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}`;
    if (r.kind === "Activity" && !r.where) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.name, r.where].filter(Boolean).join(", "))}`;
  }

  function addOwnRec(h, { name, kind, where, note }) {
    h.recs = h.recs || [];
    if (h.recs.some((r) => r.name.toLowerCase() === name.toLowerCase())) { toast(`${name} is already recommended`); return false; }
    h.recs.push({ id: uid(), osm: "", name, kind: REC_KINDS.includes(kind) ? kind : "Other", cuisine: "", where, note,
      addedBy: myName(), addedAt: Date.now(), ratings: {} });
    commit();
    toast(`Added ${name}. Everyone in the hangout can see and rate it`);
    return true;
  }

  function recommendPlace(h, place) {
    h.recs = h.recs || [];
    if (h.recs.some((r) => (place.osm && r.osm === place.osm) || r.name.toLowerCase() === place.name.toLowerCase())) {
      toast(`${place.name} is already recommended`);
      return;
    }
    const { osm, name, kind, cuisine, lat, lon, where, note, photoId } = place;
    h.recs.push({ id: uid(), osm: osm || "", name, kind: kind || "Other", cuisine: cuisine || "", lat: lat ?? null, lon: lon ?? null,
      where: where || "", note: note || "", photoId: isPublicPhoto(photoId) ? photoId : "", addedBy: myName(), addedAt: Date.now(), ratings: {} });
    if (!h.modules.includes("recs")) h.modules.splice(Math.max(0, h.modules.indexOf("ideas")), 0, "recs");
    commit();
    toast(`Recommended ${name}. Everyone in the hangout can see and rate it`);
  }

  // ---------- editing a place (pick or recommendation) ----------

  // A replaced or removed place picture is deleted only when nothing else of yours uses it.
  function photoInUse(id) {
    if (!id) return false;
    return (state.picks || []).some((p) => p.photoId === id)
      || [...state.hangouts, ...joinedHangouts].some((h) => (h.recs || []).some((r) => r.photoId === id));
  }

  // onSave(changes) applies {name, kind, where, note, photoId} to the item and saves.
  function openPlaceDialog(item, { heading, onSave }) {
    const dlg = $("#dialog");
    dlg.dataset.kind = "place";
    let pendingFile = null, dropPhoto = false, previewUrl = null;
    const kinds = REC_KINDS.includes(item.kind) ? REC_KINDS : [item.kind, ...REC_KINDS];
    dlg.innerHTML = `
      <form method="dialog" id="place-form">
        <h2>${esc(heading)}</h2>
        <div class="field"><span>Cover photo</span>
          <div class="place-cover" id="place-cover">${item.photoId ? photoImg(item.photoId, "") : '<span class="muted small">No cover photo</span>'}</div>
          <div class="row">
            <label class="btn btn-sm">${item.photoId ? "Change photo" : "Add a cover photo"}<input type="file" accept="image/*" id="place-photo" hidden></label>
            <button type="button" class="btn btn-sm btn-ghost btn-danger" id="place-photo-remove" ${item.photoId ? "" : "hidden"}>Remove</button>
          </div>
        </div>
        <label class="field"><span>Name</span><input class="input" id="place-name" name="name" maxlength="80" required value="${esc(item.name)}"></label>
        <label class="field"><span>Type</span><select class="select" id="place-kind" name="kind">${kinds.map((k) => `<option ${k === item.kind ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
        <label class="field"><span>Where</span><input class="input" id="place-where" name="where" maxlength="100" value="${esc(item.where || "")}" placeholder="Optional, e.g. Maginhawa St, QC"></label>
        <label class="field"><span>Why go?</span><input class="input" id="place-note" name="note" maxlength="140" value="${esc(item.note || "")}" placeholder="Optional, e.g. Best ube cheesecake"></label>
        <p class="auth-error" id="place-error" role="alert" hidden></p>
        <div class="dialog-actions">
          <button type="button" class="btn" data-action="close-dialog">Cancel</button>
          <button class="btn btn-primary" id="place-save">Save</button>
        </div>
      </form>`;
    hydratePhotos(dlg);
    dlg.showModal();
    const cover = $("#place-cover"), removeBtn = $("#place-photo-remove");
    $("#place-photo").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (!isImage(file)) { toast("Pick a photo or image file"); return; }
      pendingFile = file; dropPhoto = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      cover.innerHTML = `<img src="${previewUrl}" alt="New cover photo">`;
      removeBtn.hidden = false;
    });
    removeBtn.addEventListener("click", () => {
      pendingFile = null; dropPhoto = true;
      cover.innerHTML = '<span class="muted small">No cover photo</span>';
      removeBtn.hidden = true;
    });
    dlg.addEventListener("close", () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, { once: true });
    $("#place-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get("name") || "").trim();
      if (!name) { $("#place-name").focus(); return; }
      const changes = { name, kind: String(fd.get("kind") || "Other"), where: String(fd.get("where") || "").trim(), note: String(fd.get("note") || "").trim() };
      const old = item.photoId || "";
      if (pendingFile) {
        const btn = $("#place-save");
        btn.disabled = true; btn.textContent = "Uploading photo…";
        try {
          const data = await compressImage(pendingFile, 1200);
          const id = PUBLIC_PREFIX + uid() + uid();
          await photoStore.put(id, data, "place");
          photoCache.set(id, data);
          changes.photoId = id;
        } catch (err) {
          btn.disabled = false; btn.textContent = "Save";
          const msg = $("#place-error");
          msg.hidden = false;
          msg.textContent = err && err.message === "decode" ? "That picture couldn't be opened. Try a JPEG or PNG." : "The photo didn't upload. Check your connection and try again.";
          return;
        }
      } else if (dropPhoto) {
        changes.photoId = "";
      }
      onSave(changes);
      closeDialog();
      if ("photoId" in changes && old && old !== changes.photoId && !photoInUse(old)) photoStore.del(old);
      toast("Saved");
    });
  }

  // ---------- my picks ----------
  // Your own list of places and things to do (state.picks), separate from any hangout.
  // Shared as a read-only list in Firestore at lists/<id> (state.picksListId), refreshed
  // whenever it changes; friends with the link can save picks to their own list.

  const picksView = { q: "", kind: "all", sort: "rated" };
  const listCache = new Map();   // list id -> {status, data}
  let listSent = "";

  const samePlace = (a, b) => !!(a && b) && ((a.osm && b.osm && a.osm === b.osm) || a.name.trim().toLowerCase() === b.name.trim().toLowerCase());
  const isPicked = (p) => (state?.picks || []).some((x) => samePlace(x, p));
  const pickFields = ({ osm = "", name, kind = "Other", cuisine = "", where = "", note = "", lat = null, lon = null, photoId = "" }) =>
    ({ osm: osm || "", name, kind: REC_KINDS.includes(kind) ? kind : (kind || "Other"), cuisine: cuisine || "", where: where || "", note: note || "", lat: lat ?? null, lon: lon ?? null, photoId: isPublicPhoto(photoId) ? photoId : "" });

  function addPick(p) {
    state.picks = state.picks || [];
    if (isPicked(p)) { toast(`${p.name} is already in your picks`); return false; }
    state.picks.unshift({ id: uid(), ...pickFields(p), rating: 0, addedAt: Date.now() });
    commit();
    toast(`Saved ${p.name} to your picks`);
    return true;
  }

  function sortPicks(list, sort) {
    const by = {
      rated: (a, b) => (b.rating || 0) - (a.rating || 0) || (b.addedAt || 0) - (a.addedAt || 0),
      new: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
      az: (a, b) => a.name.localeCompare(b.name),
    }[sort] || (() => 0);
    return [...list].sort(by);
  }
  const starString = (n) => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "");

  function picksText() {
    const lines = sortPicks(state.picks || [], "rated").map((p) => {
      const bits = [p.kind, p.where].filter(Boolean).join(", ");
      return `${p.rating ? `${starString(p.rating)} ` : "• "}${p.name}${bits ? ` (${bits})` : ""}${p.note ? `: ${p.note}` : ""}`;
    });
    return [`${myName()}'s recommendations`, ...lines].join("\n");
  }

  function writeList() {
    if (!cloud || !user || !state?.picksListId) return Promise.resolve();
    const items = sortPicks(state.picks || [], "rated").map((p) => ({ ...pickFields(p), rating: p.rating || 0 }));
    const json = stableJSON({ items, name: myName() });
    if (json === listSent) return Promise.resolve();
    listSent = json;
    return db.collection("lists").doc(state.picksListId)
      .set({ owner: user.uid, ownerName: myName(), items: JSON.parse(JSON.stringify(items)), updatedAt: FV().serverTimestamp() })
      .catch((e) => { listSent = ""; throw e; });
  }

  async function sharePicks() {
    if (!(state.picks || []).length) { toast("Add some picks first, then share your list"); return; }
    if (!cloud || !user) {
      toast((await copyText(picksText())) ? "Your list is copied. Paste it in a chat" : "Couldn't copy your list");
      return;
    }
    if (!state.picksListId) { state.picksListId = newShareId(); save(); }
    writeList().catch(() => toast("Couldn't share your list. Check your connection and try again"));
    const url = `${location.origin}${location.pathname}#/l/${state.picksListId}`;
    toast((await copyText(url)) ? "Link to your list copied. Friends who open it can save your picks" : "Couldn't copy the link");
  }

  function loadSharedList(id) {
    listCache.set(id, { status: "loading" });
    db.collection("lists").doc(id).get()
      .then((snap) => listCache.set(id, snap.exists ? { status: "done", data: snap.data() } : { status: "missing" }))
      .catch(() => listCache.set(id, { status: "error" }))
      .finally(() => render());
  }

  function pickRow(p, { shared = false } = {}) {
    const map = recMapLink(p);
    const targets = shared ? [] : [...state.hangouts, ...joinedHangouts.filter(canEdit)].filter((h) => !isPast(h));
    return `<li class="rec pick ${p.photoId ? "has-cover" : ""}" data-id="${esc(p.id || "")}">
      ${p.photoId ? `<div class="place-banner">${photoImg(p.photoId, `Photo of ${p.name}`)}</div>` : ""}
      <span class="grow">
        <b>${esc(p.name)}</b>
        <span class="muted small">${shared && p.rating ? `<span class="stars-avg">${starString(p.rating)}</span> · ` : ""}${esc(p.kind || "Place")}${p.cuisine && p.cuisine !== p.kind ? ` · ${esc(p.cuisine)}` : ""}${p.where ? ` · ${esc(p.where)}` : ""}</span>
        ${p.note ? `<span class="rec-note">“${esc(p.note)}”</span>` : ""}
        ${shared ? "" : `<span class="rate" role="group" aria-label="Your rating for ${esc(p.name)}">
          ${[1, 2, 3, 4, 5].map((n) => `<button class="star" data-action="rate-pick" data-v="${n}" aria-pressed="${n <= (p.rating || 0)}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
          <span class="muted small">${p.rating ? "Your rating" : "Rate it"}</span></span>`}
      </span>
      <span class="idea-actions">
        ${map ? `<a class="btn btn-sm btn-ghost" href="${map}" target="_blank" rel="noopener">Map</a>` : ""}
        ${shared ? (isPicked(p) ? `<span class="tag">Saved</span>` : `<button class="btn btn-sm btn-primary" data-action="list-save" data-i="${p._i}">Save to my picks</button>`) : `
          ${targets.length ? `<select class="select who pick-target" data-field="pick-to-hangout" aria-label="Add ${esc(p.name)} to a hangout">
            <option value="">Add to hangout…</option>
            ${targets.map((h) => `<option value="${esc(h.id)}" ${(h.recs || []).some((r) => samePlace(r, p)) ? "disabled" : ""}>${esc(h.title)}</option>`).join("")}
          </select>` : ""}
          <button class="btn btn-sm" data-action="edit-pick">Edit</button>
          <button class="btn btn-sm" data-action="pick-plan">Plan here</button>
          <button class="icon-btn" data-action="remove-pick" aria-label="Remove ${esc(p.name)}">×</button>`}
      </span>
    </li>`;
  }

  function renderPicks() {
    const picks = state.picks || [];
    const kinds = [...new Set(picks.map((p) => p.kind || "Other"))].sort();
    if (picksView.kind !== "all" && !kinds.includes(picksView.kind)) picksView.kind = "all";
    const q = picksView.q.trim().toLowerCase();
    const shown = sortPicks(picks, picksView.sort)
      .filter((p) => picksView.kind === "all" || (p.kind || "Other") === picksView.kind)
      .filter((p) => !q || [p.name, p.kind, p.where, p.note, p.cuisine].join(" ").toLowerCase().includes(q));
    return `
      <div class="home-head">
        <div><h1>My picks</h1><p class="muted">Places and things to do you'd recommend. Use them for ideas, add them to a hangout, or share your list with friends.</p></div>
        ${picks.length ? `<div class="row picks-share">
          <button class="btn btn-sm btn-primary" data-action="picks-share">Share my list</button>
          <button class="btn btn-sm" data-action="picks-copy">Copy as text</button>
        </div>` : ""}
      </div>
      <section class="module wide">
        <form class="rec-form" data-form="add-pick">
          <span class="muted small rec-form-title">Add a pick</span>
          <div class="add-row">
            <input class="input" name="name" maxlength="80" placeholder="A place or activity, e.g. Mama Lou's Dessert Bar" aria-label="Place or activity" required>
            <select class="select" name="kind" aria-label="Type">${REC_KINDS.map((k) => `<option>${k}</option>`).join("")}</select>
            <button class="btn btn-sm">Add</button>
          </div>
          <div class="rec-extra">
            <input class="input" name="where" maxlength="100" placeholder="Where (optional), e.g. Maginhawa St, QC" aria-label="Where">
            <input class="input" name="note" maxlength="140" placeholder="Why go? (optional), e.g. Best ube cheesecake" aria-label="Note">
          </div>
        </form>
        ${picks.length ? `
          <div class="toolbar">
            <input class="input" id="picks-search" type="search" placeholder="Search your picks" value="${esc(picksView.q)}" aria-label="Search your picks">
            <div class="chips" role="group" aria-label="Sort">${[["rated", "Top rated"], ["new", "Newest"], ["az", "A–Z"]].map(([v, l]) => `<button class="chip" data-action="picks-sort" data-v="${v}" aria-pressed="${picksView.sort === v}">${l}</button>`).join("")}</div>
          </div>
          ${kinds.length > 1 ? `<div class="chips ideas-cats" role="group" aria-label="Type">${["all", ...kinds].map((k) => `<button class="chip" data-action="picks-kind" data-v="${esc(k)}" aria-pressed="${picksView.kind === k}">${k === "all" ? "All" : esc(k)}</button>`).join("")}</div>` : ""}
          ${shown.length ? `<ul class="list recs-list">${shown.map((p) => pickRow(p)).join("")}</ul>` : `<p class="muted small">No picks match.</p>`}`
          : `<p class="muted small">No picks yet. Add a place you love above, or tap Save on anything in Ideas or a hangout's Recommendations.</p>`}
      </section>`;
  }

  function renderSharedList(id) {
    if (!cloud) return `<div class="empty"><b>Shared lists need accounts turned on.</b><a href="#/picks" class="btn">Go to my picks</a></div>`;
    const entry = listCache.get(id);
    if (!entry) { loadSharedList(id); return `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading…</div>`; }
    if (entry.status === "loading") return `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading…</div>`;
    if (entry.status !== "done") {
      return `<div class="empty"><b>${entry.status === "missing" ? "That list doesn't exist anymore." : "Couldn't load that list. Check your connection and reload."}</b><a href="#/picks" class="btn">Go to my picks</a></div>`;
    }
    const d = entry.data;
    const mine = d.owner === user?.uid;
    const items = (d.items || []).map((p, i) => ({ ...p, _i: i }));
    return `
      <a href="#/picks" class="back">← My picks</a>
      <div class="home-head"><div>
        <h1>${esc(d.ownerName || "A friend")}'s recommendations</h1>
        <p class="muted">${mine ? "This is how your list looks to friends." : `${items.length} place${items.length === 1 ? "" : "s"} and things to do, best rated first. Save any you like to your own picks.`}</p>
      </div></div>
      <section class="module wide">${items.length ? `<ul class="list recs-list">${items.map((p) => pickRow(p, { shared: true })).join("")}</ul>` : `<p class="muted small">This list is empty for now.</p>`}</section>`;
  }

  // ---------- ideas nearby ----------
  // Places come from OpenStreetMap through Nominatim (free, no key). Its usage policy
  // allows at most one request a second, so searches run one category at a time and
  // results appear as they arrive. Locations are only sent to search, never saved.

  const NOMINATIM = "https://nominatim.openstreetmap.org/search";
  const IDEA_CATS = [["all", "All"], ["food", "Food"], ["coffee", "Coffee & desserts"], ["outdoors", "Outdoors"],
    ["fun", "Games & fun"], ["culture", "Culture"], ["nightlife", "Nightlife"], ["shopping", "Malls"]];
  const IDEA_QUERIES = {
    food: ["restaurant", "fast food"], coffee: ["cafe", "ice cream"], outdoors: ["park", "beach", "viewpoint"],
    fun: ["cinema", "karaoke", "bowling", "amusement arcade", "theme park"], culture: ["museum", "gallery"],
    nightlife: ["bar", "pub"], shopping: ["mall"],
  };
  const IDEA_STARTER = ["restaurant", "cafe", "park", "mall", "cinema", "karaoke", "museum", "bar"];
  const IDEA_KINDS = {
    "amenity:restaurant": ["food", "Restaurant"], "amenity:fast_food": ["food", "Fast food"], "amenity:food_court": ["food", "Food court"],
    "amenity:cafe": ["coffee", "Café"], "amenity:ice_cream": ["coffee", "Ice cream"],
    "amenity:bar": ["nightlife", "Bar"], "amenity:pub": ["nightlife", "Pub"], "amenity:nightclub": ["nightlife", "Club"],
    "amenity:cinema": ["fun", "Cinema"], "amenity:ktv": ["fun", "Karaoke"], "amenity:karaoke_box": ["fun", "Karaoke"],
    "amenity:theatre": ["culture", "Theater"], "amenity:arts_centre": ["culture", "Arts center"],
    "leisure:park": ["outdoors", "Park"], "leisure:garden": ["outdoors", "Garden"], "leisure:beach_resort": ["outdoors", "Beach resort"],
    "natural:beach": ["outdoors", "Beach"], "tourism:viewpoint": ["outdoors", "Viewpoint"],
    "leisure:bowling_alley": ["fun", "Bowling"], "leisure:amusement_arcade": ["fun", "Arcade"], "leisure:escape_game": ["fun", "Escape room"],
    "leisure:water_park": ["fun", "Water park"], "leisure:miniature_golf": ["fun", "Mini golf"], "tourism:theme_park": ["fun", "Theme park"],
    "tourism:zoo": ["fun", "Zoo"], "tourism:aquarium": ["fun", "Aquarium"],
    "tourism:museum": ["culture", "Museum"], "tourism:gallery": ["culture", "Gallery"], "tourism:attraction": ["culture", "Attraction"],
    "shop:mall": ["shopping", "Mall"],
  };

  const ideas = new Map();       // "home" or hangout id -> search state
  const ideaCache = new Map();   // query + area -> raw results, for this visit
  let nominatimChain = Promise.resolve(), lastNominatim = 0;

  // One request at a time, at least 1.1 s apart.
  function nominatim(params) {
    const run = async () => {
      const wait = lastNominatim + 1100 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastNominatim = Date.now();
      const r = await fetch(`${NOMINATIM}?${new URLSearchParams({ format: "jsonv2", ...params })}`, { headers: { "Accept-Language": "en" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };
    const p = nominatimChain.then(run, run);
    nominatimChain = p.catch(() => {});
    return p;
  }

  function distanceM(a, b) {
    const R = 6371000, rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h2 = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h2));
  }
  const fmtDistance = (m) => (m < 950 ? `${Math.max(50, Math.round(m / 50) * 50)} m` : `${(m / 1000).toFixed(m < 9950 ? 1 : 0)} km`);
  const titleCase = (t) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  function classifyPlace(x) {
    const name = x.name || "";
    if (/karaoke|videoke|\bktv\b/i.test(name)) return ["fun", "Karaoke"];
    return IDEA_KINDS[`${x.category}:${x.type}`] || null;
  }

  function ideaState(key) {
    if (!ideas.has(key)) ideas.set(key, { status: "idle", cat: "all", radius: 3000, places: new Map(), loaded: new Set(), failedQ: new Set(), pending: 0, failed: 0, gen: 0, show: 30, sort: "near" });
    return ideas.get(key);
  }

  function startIdeas(key, from) {
    const st = ideaState(key);
    Object.assign(st, { status: "loading", from, places: new Map(), loaded: new Set(), failedQ: new Set(), pending: 0, failed: 0, gen: st.gen + 1, show: 30, error: "" });
    queueIdeas(key);
  }

  // Fetch whatever the current category still needs.
  function queueIdeas(key) {
    const st = ideaState(key);
    if (!st.from) return;
    const wanted = st.cat === "all" ? IDEA_STARTER : IDEA_QUERIES[st.cat];
    const { lat, lon } = st.from;
    const dLat = st.radius / 111320, dLon = st.radius / (111320 * Math.cos((lat * Math.PI) / 180));
    const viewbox = [lon - dLon, lat + dLat, lon + dLon, lat - dLat].map((n) => n.toFixed(5)).join(",");
    const gen = st.gen;
    wanted.filter((q) => !st.loaded.has(q)).forEach((q) => {
      st.loaded.add(q);
      st.pending++;
      const cacheKey = `${q}|${viewbox}`;
      const got = ideaCache.has(cacheKey) ? Promise.resolve(ideaCache.get(cacheKey))
        : nominatim({ amenity: q, viewbox, bounded: 1, limit: 40, extratags: 1 }).then((list) => { ideaCache.set(cacheKey, list); return list; });
      got.then((list) => {
        if (st.gen !== gen) return;
        list.forEach((x) => {
          const kind = classifyPlace(x);
          if (!kind || !x.name) return;
          const at = { lat: Number(x.lat), lon: Number(x.lon) };
          const dist = distanceM(st.from, at);
          if (dist > st.radius * 1.05) return;
          const cuisine = x.extratags?.cuisine ? titleCase(x.extratags.cuisine.split(";")[0]) : "";
          const osm = `${x.osm_type}${x.osm_id}`;
          st.places.set(osm, { osm, name: x.name, cat: kind[0], kind: kind[1], cuisine, dist, ...at });
        });
      }).catch(() => { if (st.gen === gen) { st.failed++; st.failedQ.add(q); } })
        .finally(() => {
          if (st.gen !== gen) return;
          st.pending--;
          if (!st.pending) st.status = st.places.size || !st.failed ? "done" : "error";
          if (st.status === "error") st.error = "Couldn't load places right now. Check your connection and try again in a minute.";
          refreshIdeas(key);
        });
    });
    refreshIdeas(key);
  }

  function ideasNearMe(key) {
    const st = ideaState(key);
    if (!navigator.geolocation) { Object.assign(st, { status: "error", error: "This browser can't share your location. Search a place instead." }); refreshIdeas(key); return; }
    Object.assign(st, { status: "locating", error: "" });
    refreshIdeas(key);
    navigator.geolocation.getCurrentPosition(
      (pos) => startIdeas(key, { lat: pos.coords.latitude, lon: pos.coords.longitude, label: "you" }),
      (err) => {
        Object.assign(st, { status: "error", error: err.code === 1
          ? "Location is turned off for this site. Allow it in your browser settings, or search a place instead."
          : "Couldn't find your location. Try again, or search a place instead." });
        refreshIdeas(key);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }

  async function ideasNearPlace(key, text) {
    const st = ideaState(key);
    const q = (text || "").trim();
    if (!q) return;
    Object.assign(st, { status: "locating", error: "" });
    refreshIdeas(key);
    try {
      let found = await nominatim({ q, limit: 1, countrycodes: "ph" });
      if (!found.length) found = await nominatim({ q, limit: 1 });
      if (!found.length) {
        Object.assign(st, { status: "error", error: `Couldn't find “${q}” on the map. Try adding the city, like “${q}, Makati”.` });
        refreshIdeas(key);
        return;
      }
      startIdeas(key, { lat: Number(found[0].lat), lon: Number(found[0].lon), label: q });
    } catch (_) {
      Object.assign(st, { status: "error", error: "Couldn't reach the map search. Check your connection and try again." });
      refreshIdeas(key);
    }
  }

  // Only the Ideas box re-renders as results arrive, so nothing else on the page jumps.
  function refreshIdeas(key) {
    const box = document.querySelector(`[data-ideas="${CSS.escape(key)}"]`);
    if (box) { box.innerHTML = ideasBody(key); }
  }

  function ideasBody(key) {
    const st = ideaState(key);
    const h = key === "home" ? null : hangout(key);
    const edit = h ? canEdit(h) : false;
    const searchForm = `<form class="add-row" data-form="ideas-search">
        <input class="input" name="q" placeholder="Search a place, e.g. BGC or Tagaytay" aria-label="Place to search near" autocomplete="off">
        <button class="btn btn-sm">Search</button>
      </form>`;
    const start = `<div class="ideas-start">
        ${h?.place ? `<button class="btn btn-sm btn-primary" data-action="ideas-place">Near ${esc(h.place)}</button>` : ""}
        <button class="btn btn-sm ${h?.place ? "" : "btn-primary"}" data-action="ideas-me">Near me</button>
      </div>
      ${searchForm}
      <p class="muted small">Your location is only used to search OpenStreetMap. It isn't saved.</p>`;
    if (st.status === "idle") {
      return `<p class="muted small">Find food, cafés, parks, karaoke, malls and more around a place.</p>${start}`;
    }
    if (st.status === "locating") {
      return `<div class="ideas-wait" role="status"><span class="spinner" aria-hidden="true"></span>Finding the spot…</div>`;
    }
    if (st.status === "error" && !st.places.size) {
      return `<div class="banner">${esc(st.error)}</div>${start}`;
    }
    const rated = groupRatingIndex();
    const scoreOf = (p) => { const r = rated.get(p.osm); return r ? r.sum / r.count : 0; };
    const all = [...st.places.values()].sort(st.sort === "rated"
      ? (a, b) => scoreOf(b) - scoreOf(a) || (rated.get(b.osm)?.count || 0) - (rated.get(a.osm)?.count || 0) || a.dist - b.dist
      : (a, b) => a.dist - b.dist);
    const shown = st.cat === "all" ? all : all.filter((p) => p.cat === st.cat);
    st.view = shown.slice(0, st.show);
    const where = st.from.label === "you" ? "you" : esc(st.from.label);
    return `
      <div class="ideas-head">
        <span class="small">Near <b>${where}</b> · within ${st.radius / 1000} km</span>
        <button class="btn btn-sm btn-ghost" data-action="ideas-reset">Change</button>
      </div>
      <div class="chips ideas-radius" role="group" aria-label="Distance">${[1000, 3000, 10000].map((r) => `<button class="chip" data-action="ideas-radius" data-v="${r}" aria-pressed="${st.radius === r}">${r / 1000} km</button>`).join("")}</div>
      <div class="chips ideas-sort" role="group" aria-label="Sort">
        <button class="chip" data-action="ideas-sort" data-v="near" aria-pressed="${st.sort !== "rated"}">Nearest</button>
        <button class="chip" data-action="ideas-sort" data-v="rated" aria-pressed="${st.sort === "rated"}">Top rated</button>
      </div>
      ${st.sort === "rated" && !rated.size ? `<p class="muted small">No ratings yet. Recommend places to a hangout and rate them, and they'll rise to the top here.</p>` : ""}
      <div class="chips ideas-cats" role="group" aria-label="Kind of place">${IDEA_CATS.map(([c, l]) => `<button class="chip" data-action="ideas-cat" data-v="${c}" aria-pressed="${st.cat === c}">${l}</button>`).join("")}</div>
      ${st.view.length ? `<ul class="list ideas-list">${st.view.map((p, i) => `
        <li class="idea">
          <span class="grow"><b>${esc(p.name)}</b><span class="muted small">${rated.get(p.osm) ? `<span class="stars-avg">${starsText(rated.get(p.osm).sum / rated.get(p.osm).count, rated.get(p.osm).count)}</span> · ` : ""}${esc(p.kind)}${p.cuisine && p.cuisine !== p.kind ? ` · ${esc(p.cuisine)}` : ""} · ${fmtDistance(p.dist)}</span></span>
          <span class="idea-actions">
            <a class="btn btn-sm btn-ghost" href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" rel="noopener">Map</a>
            ${h && edit ? ((h.recs || []).some((r) => r.osm === p.osm) ? `<span class="tag">Recommended</span>` : `<button class="btn btn-sm btn-primary" data-action="idea-recommend" data-i="${i}">Recommend</button>`) : ""}
            ${isPicked(p) ? `<span class="tag">Saved</span>` : `<button class="btn btn-sm" data-action="idea-save" data-i="${i}">Save</button>`}
            ${!h ? `<button class="btn btn-sm btn-primary" data-action="idea-plan" data-i="${i}">Plan here</button>` : ""}
          </span>
        </li>`).join("")}</ul>`
        : st.pending ? "" : `<p class="muted small">Nothing like that within ${st.radius / 1000} km. Try a wider distance or another kind of place.</p>`}
      ${shown.length > st.show ? `<button class="btn btn-sm btn-ghost" data-action="ideas-more">Show more (${shown.length - st.show})</button>` : ""}
      ${st.pending ? `<div class="ideas-wait small" role="status"><span class="spinner" aria-hidden="true"></span>Finding more places…</div>` : ""}
      ${st.failed && !st.pending ? `<p class="muted small">Some places couldn't load. <button class="link-btn" data-action="ideas-retry">Try again</button></p>` : ""}
      <p class="muted small ideas-credit">Places from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors.</p>`;
  }

  // ---------- views ----------

  let filter = "upcoming";
  let query = "";

  function renderHome() {
    const all = [...state.hangouts, ...joinedHangouts];
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
      <a class="card ${h.cover ? "has-cover" : ""}" href="#/h/${esc(h.id)}">
        ${h.cover ? `<div class="card-cover">${photoImg(h.cover.id)}</div>` : ""}
        <div class="card-top">
          <div class="datebox ${d ? "" : "tbd"}">${d ? `<span>${d.toLocaleDateString(undefined, { month: "short" })}</span><b>${d.getDate()}</b>` : "<b>TBD</b>"}</div>
          <div class="card-title">
            <span class="row" style="gap:8px">${sizePill(h.size)}${isJoined(h) ? `<span class="shared-chip">Shared by ${esc(metaOf(h)?.ownerName || "a friend")}</span>` : h.shareId && Object.keys(metaOf(h)?.members || {}).length ? `<span class="shared-chip">Shared</span>` : ""}</span>
            <h3>${esc(h.title)}</h3>
            <div class="meta">${d ? `<span>${esc(fmtWhen(h))}</span>` : ""}${h.place ? `<span>${esc(h.place)}</span>` : ""}</div>
          </div>
        </div>
        <div class="card-foot">
          <div class="row" style="gap:10px">
            <div class="avatars">${shown.map((g) => avatar(g.friendId)).join("")}${going.length > 5 ? `<span class="avatar more">+${going.length - 5}</span>` : ""}</div>
            <span class="muted small">${going.length} going${openTasks ? ` · ${openTasks} to-do${openTasks > 1 ? "s" : ""} left` : ""}${h.modules.includes("budget") && perPerson(h) ? ` · ${money(perPerson(h))} each` : ""}</span>
          </div>
        </div>
      </a>`;
  }

  function coverHTML(h) {
    const working = !!busy.covers[h.id];
    const picker = (label, cls) => `<label class="${cls}" ${working ? 'aria-disabled="true"' : ""}>${label}<input type="file" accept="image/*" data-upload="cover" hidden ${working ? "disabled" : ""}></label>`;
    if (h.cover || working) {
      return `<div class="hero-cover">
        ${h.cover ? photoImg(h.cover.id, `Cover photo for ${h.title}`) : ""}
        ${working ? `<div class="cover-busy" role="status"><span class="spinner" aria-hidden="true"></span>Uploading…</div>` : ""}
        <div class="cover-actions">
          ${picker("Change cover", "cover-btn")}
          ${h.cover && !working ? `<button class="cover-btn" data-action="remove-cover">Remove</button>` : ""}
        </div>
      </div>`;
    }
    return `<div class="cover-empty">${picker('<span aria-hidden="true">+</span> Add cover photo', "btn btn-sm btn-ghost add-cover")}</div>`;
  }

  function renderHangout(h) {
    ctxHangout = h;
    const role = roleIn(h);
    const counts = { going: 0, maybe: 0, no: 0, pending: 0 };
    const linkedUids = new Set(h.guests.map((g) => friend(g.friendId)?.uid).filter(Boolean));
    const extraMembers = Object.entries(metaOf(h)?.members || {}).filter(([m]) => !linkedUids.has(m));
    [...h.guests, ...extraMembers.map(([, info]) => ({ rsvp: info.rsvp || "pending" }))].forEach((g) => { counts[g.rsvp] = (counts[g.rsvp] || 0) + 1; });
    const invitedCount = h.guests.length + extraMembers.length;
    const tasksDone = h.tasks.filter((t) => t.done).length;
    const bringCovered = h.bring.filter((b) => b.friendId).length;
    const each = perPerson(h);
    const group = groupTotal(h);
    const n = daysUntil(h);
    const has = (m) => h.modules.includes(m);
    const missing = Object.keys(MODULES).filter((m) => !has(m));

    const stats = [
      `<div class="stat"><span>Going</span><b>${counts.going}<small> of ${invitedCount}</small></b></div>`,
      n !== null && n >= 0 ? `<div class="stat"><span>Countdown</span><b>${n === 0 ? "Today" : n === 1 ? "Tomorrow" : `${n} days`}</b></div>` : "",
      has("tasks") && h.tasks.length ? `<div class="stat"><span>To-dos done</span><b>${tasksDone}/${h.tasks.length}</b><div class="bar"><i style="width:${(tasksDone / h.tasks.length) * 100}%"></i></div></div>` : "",
      has("bring") && h.bring.length ? `<div class="stat"><span>Items covered</span><b>${bringCovered}/${h.bring.length}</b><div class="bar"><i style="width:${(bringCovered / h.bring.length) * 100}%"></i></div></div>` : "",
      has("budget") && each ? `<div class="stat stat-you"><span>Per person</span><b>${money(each)}</b></div>` : "",
      has("budget") && (group || h.budget) ? `<div class="stat"><span>Group total</span><b>${money(group)}${h.budget ? `<small> / ${money(h.budget)}</small>` : ""}</b>${h.budget ? `<div class="bar"><i style="width:${Math.min(100, (group / h.budget) * 100)}%;${group > h.budget ? "background:var(--bad)" : ""}"></i></div>` : ""}</div>` : "",
    ].join("");

    const order = ["guests", "tasks", "bring", "schedule", "budget", "split", "poll", "recs", "ideas", "notes"];
    const meta = metaOf(h);
    const sharedNote = isJoined(h)
      ? `<div class="share-note"><span>Shared by <b>${esc(meta?.ownerName || "a friend")}</b> · ${role === "editor" ? "You can edit" : "View only"}</span><button class="btn btn-sm btn-ghost btn-danger" data-action="leave-hangout">Leave</button></div>`
      : "";
    return `
      <a href="#/" class="back">← All hangouts</a>
      <div class="${role === "viewer" ? "readonly" : ""}" data-role="${role}">
      ${sharedNote}
      <section class="hero ${h.cover ? "has-cover" : ""}">
        ${isJoined(h) ? "" : coverHTML(h)}
        <div class="hero-top">
          <div class="hero-title">
            ${sizePill(h.size)}
            <h1>${esc(h.title)}</h1>
          </div>
          <div class="hero-actions">
            ${role !== "viewer" ? `<button class="btn btn-sm" data-action="edit-hangout">Edit</button>` : ""}
            <button class="btn btn-sm" data-action="copy-invite">Copy invite</button>
            <button class="btn btn-sm" data-action="share-link">${cloud ? "Invite link" : "Share link"}</button>
            ${isJoined(h) ? "" : `<button class="btn btn-sm btn-ghost" data-action="duplicate">Duplicate</button>
            <button class="btn btn-sm btn-ghost btn-danger" data-action="delete-hangout">Delete</button>`}
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
      ${missing.length && role !== "viewer" ? `<div class="add-modules"><span class="muted small">Add a section:</span>${missing.map((m) => `<button class="chip" data-action="add-module" data-v="${m}">+ ${esc(MODULES[m])}</button>`).join("")}</div>` : ""}
      </div>
    `;
  }

  let ctxHangout = null; // the hangout being rendered, for person pickers

  function friendSelect(name, selected = "", { blank = "Anyone", everyone = false } = {}) {
    const h = ctxHangout;
    const pool = h && isJoined(h)
      ? h.guests.map((g) => friend(g.friendId)).filter(Boolean)
      : state.friends;
    return `<select class="select who" name="${name}" data-field="${name}" aria-label="Person">
      <option value="">${esc(blank)}</option>
      ${everyone ? `<option value="${EVERYONE}" ${selected === EVERYONE ? "selected" : ""}>Everyone</option>` : ""}
      ${pool.map((f) => `<option value="${esc(f.id)}" ${f.id === selected ? "selected" : ""}>${esc(f.name)}</option>`).join("")}
    </select>`;
  }

  function settleHTML(moves) {
    const toggle = `<span class="settle-mode" role="group" aria-label="How to settle up">
      <button class="chip" data-action="settle-mode" data-v="bill" aria-pressed="${settleMode === "bill"}">By bill</button>
      <button class="chip" data-action="settle-mode" data-v="fewest" aria-pressed="${settleMode === "fewest"}">Fewest payments</button></span>`;
    if (!moves.length) return `<div class="settle"><div class="settle-head"><b class="small">To settle up</b>${toggle}</div><span class="small">Everyone's square.</span></div>`;
    const reason = (x) => {
      if (!x.plus) return "";
      const part = (it) => `${esc(it.text)} ${money(it.amount)}`;
      return `<span class="settle-why">${x.plus.map(part).join(" + ")}${x.minus.length ? ` − ${x.minus.map(part).join(" − ")}` : ""}</span>`;
    };
    // Group by who pays, so each person sees everything they owe in one place.
    const byPayer = new Map();
    moves.forEach((x) => { if (!byPayer.has(x.from)) byPayer.set(x.from, []); byPayer.get(x.from).push(x); });
    const groups = [...byPayer.entries()].sort((a, b) => fname(a[0]).localeCompare(fname(b[0])));
    return `<div class="settle">
      <div class="settle-head"><b class="small">To settle up</b>${toggle}</div>
      ${groups.map(([from, list]) => `
        <div class="settle-group">
          <div class="settle-payer">${avatar(from)}<b>${esc(fname(from))}</b><span class="muted small">pays ${money(list.reduce((t, x) => t + x.amount, 0))} in total</span></div>
          ${list.map((x) => `<div class="settle-row"><span class="arrow">→</span>${avatar(x.to)}<span class="settle-to"><b>${esc(fname(x.to))}</b>${reason(x)}</span><span class="money">${money(x.amount)}</span></div>`).join("")}
        </div>`).join("")}
    </div>`;
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
      const meta = metaOf(h);
      const members = meta?.members || {};
      const owner = roleIn(h) === "owner";
      const editable = canEdit(h);
      const notInvited = isJoined(h) ? [] : state.friends.filter((f) => !guestIds.includes(f.id));
      // Members the owner's app hasn't added as guests yet still show up.
      const linked = new Set(h.guests.map((g) => friend(g.friendId)?.uid).filter(Boolean));
      const rows = [...h.guests, ...Object.keys(members).filter((x) => !linked.has(x)).map((x) => ({ friendId: memberFid(x), rsvp: members[x].rsvp || "pending" }))];
      const order = { going: 0, maybe: 1, pending: 2, no: 3 };
      rows.sort((a, b) => order[a.rsvp] - order[b.rsvp] || fname(a.friendId).localeCompare(fname(b.friendId)));
      const goingCount = rows.filter((g) => g.rsvp === "going").length;
      return moduleShell(m, h, `
        ${rows.length ? `<ul class="list">${rows.map((g) => {
          const account = friend(g.friendId)?.uid;
          const member = account && members[account];
          const mine = account && account === user?.uid;
          const canAnswer = mine || (member ? owner : editable);
          return `
          <li data-id="${esc(g.friendId)}" class="${mine ? "mine" : ""}">${avatar(g.friendId)}
            <span class="guest-name"><span>${esc(fname(g.friendId))}${mine ? ' <span class="muted small">(you)</span>' : ""}</span>
              ${member ? `<span class="guest-tags"><span class="tag">Joined</span>${owner
                ? `<button class="tag perm" data-action="toggle-editor" aria-pressed="${member.role === "editor"}" title="Allow ${esc(fname(g.friendId))} to edit this hangout">${member.role === "editor" ? "Can edit ✓" : "Can edit"}</button>`
                : member.role === "editor" ? `<span class="tag">Can edit</span>` : ""}</span>` : ""}</span>
            <span class="rsvp ${canAnswer ? "" : "locked"}" role="group" aria-label="RSVP for ${esc(fname(g.friendId))}">
              ${[["going", "Going"], ["maybe", "Maybe"], ["no", "Can't"]].map(([v, l]) => `<button data-action="rsvp" data-v="${v}" aria-pressed="${g.rsvp === v}" ${canAnswer ? "" : "disabled"}>${l}</button>`).join("")}
            </span>
            ${editable && (!member || owner) ? `<button class="icon-btn" data-action="remove-guest" aria-label="Remove ${esc(fname(g.friendId))}">×</button>` : `<span class="icon-btn" aria-hidden="true"></span>`}
          </li>`;
        }).join("")}</ul>` : `<p class="muted small">No one invited yet.</p>`}
        ${editable ? `<form class="add-row add-row-inline" data-form="add-guest">
          <input class="input" name="name" list="friend-names" placeholder="Add someone by name" autocomplete="off" aria-label="Name to add">
          <button class="btn btn-sm">Add</button>
          ${notInvited.length ? `<button type="button" class="btn btn-sm btn-ghost" data-action="invite-all">Add all friends</button>` : ""}
        </form>
        <datalist id="friend-names">${notInvited.map((f) => `<option value="${esc(f.name)}"></option>`).join("")}</datalist>` : ""}
        ${cloud && owner ? `<p class="muted small">Send your invite link so friends can join with their own account. They'll show up here, answer for themselves, and you can let them edit.</p>` : ""}`,
        { sub: `${goingCount} going` });
    }
    if (m === "bring" || m === "tasks") {
      const items = h[m];
      return moduleShell(m, h, `
        ${items.length ? `<ul class="list">${items.map((t) => `
          <li data-id="${esc(t.id)}" class="${t.done ? "done" : ""}">
            <input type="checkbox" class="check" data-action="toggle-item" data-list="${m}" ${t.done ? "checked" : ""} aria-label="Mark done">
            <span class="item-body"><span class="grow">${esc(t.text)}</span>
            ${friendSelect("assign", t.friendId, { blank: m === "bring" ? "Needs someone" : "Unassigned", everyone: m === "bring" })}</span>
            <button class="icon-btn" data-action="remove-item" data-list="${m}" aria-label="Remove">×</button>
          </li>`).join("")}</ul>` : `<p class="muted small">${m === "bring" ? "List snacks, gear or anything people should bring." : "Bookings, shopping, anything that has to get done."}</p>`}
        <form class="add-row" data-form="add-item" data-list="${m}">
          <input class="input" name="text" placeholder="${m === "bring" ? "e.g. Chips and dip" : "e.g. Reserve a table"}" aria-label="New item" required>
          ${friendSelect("friendId", "", { blank: m === "bring" ? "Needs someone" : "Unassigned", everyone: m === "bring" })}
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
      const list = h.costs || [];
      const each = perPerson(h), people = headcount(h);
      return moduleShell(m, h, `
        ${list.length ? `<ul class="list">${list.map((c) => `
          <li data-id="${esc(c.id)}"><span class="grow"><b>${esc(c.text)}</b></span>
          <span class="money">${money(c.amount)}<span class="muted small"> / person</span></span>
          <button class="icon-btn" data-action="remove-cost" aria-label="Remove ${esc(c.text)}">×</button></li>`).join("")}</ul>`
          : `<p class="muted small">Add what each person needs to pay, like a ticket, an entrance fee or their share of the food.</p>`}
        <form class="add-row" data-form="add-cost">
          <input class="input" name="text" placeholder="What is it? e.g. Concert ticket" aria-label="Cost" required>
          <input class="input amount" name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Per person" aria-label="Amount per person" required>
          <button class="btn btn-sm">Add cost</button>
        </form>
        <div class="each-pays">
          <div><span class="eyebrow">Each person pays</span><b class="num">${money(each)}</b></div>
          <span class="muted small">${people ? `× ${people} ${people === 1 ? "person" : "people"} = <b class="money">${money(each * people)}</b> for the group` : "Invite guests to see the group total"}</span>
        </div>
        <div class="budget-grid">
          <label class="field"><span>Group budget</span>
            <input class="input" type="number" min="0" step="0.01" inputmode="decimal" data-field="budget" value="${h.budget || ""}" placeholder="Optional"></label>
          <label class="field"><span>Currency</span><input class="input" data-field="currency" value="${esc(state.currency)}" maxlength="4"></label>
          <div class="field"><span>Group total</span><b class="money spent-val">${money(each * people)}</b></div>
        </div>
      `, { sub: list.length ? `${money(each)} each` : "" });
    }
    if (m === "split") {
      const bills = h.expenses;
      const moves = settleMode === "fewest" ? settleFewest(h) : settleByBill(h);
      const rows = billBreakdown(h).sort((a, b) => a.balance - b.balance || fname(a.id).localeCompare(fname(b.id)));
      const unpaid = bills.filter((e) => !e.paidBy).length;
      const everyoneNow = billPeople(h);
      const owesText = (r) => (Math.abs(r.balance) < 0.005 ? `<span class="muted">Even</span>`
        : r.balance > 0 ? `<span class="gets">Gets ${money(r.balance)}</span>` : `<span class="owes">Owes ${money(-r.balance)}</span>`);
      return moduleShell(m, h, `
        ${bills.length ? `<ul class="list">${bills.map((e) => {
          const people = splitOf(h, e);
          const n = people.length;
          const who = !n ? "Nobody to split with yet" : `${money(e.amount / n)} each · ${e.everyone ? `everyone (${n})` : `${n} ${n === 1 ? "person" : "people"}`}`;
          return `<li data-id="${esc(e.id)}"><span class="item-body"><span class="grow"><b>${esc(e.text)}</b> <span class="money">${money(e.amount)}</span><br>
            <span class="muted small">${who}</span></span>
            <span class="paid-by"><span class="muted small">Paid by</span>${friendSelect("paidby", e.paidBy, { blank: "Not paid yet" })}</span></span>
            <button class="icon-btn" data-action="remove-expense" aria-label="Remove ${esc(e.text)}">×</button></li>`;
        }).join("")}</ul>`
          : `<p class="muted small">Add bills one person paid for the whole group, like dinner or the taxi. They're split evenly between everyone and we work out who owes whom.</p>`}
        <form class="field" data-form="add-expense" style="gap:8px">
          <div class="add-row">
            <input class="input" name="text" placeholder="What was it? e.g. Dinner" aria-label="Bill" required>
            <input class="input amount" name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Total" aria-label="Total amount" required>
            ${friendSelect("paidBy", guestIds.includes(state.meId) ? state.meId : "", { blank: "Not paid yet" })}
          </div>
          ${guestIds.length ? `<div class="split-pick" role="group" aria-label="Split between">
            <span class="muted small">Split between</span>
            <label class="split-all"><input type="checkbox" name="everyone" id="split-everyone" checked>Everyone (${everyoneNow.length})</label>
            <span class="split-some" hidden>${h.guests.map((g) => `<label><input type="checkbox" name="split" value="${esc(g.friendId)}" ${g.rsvp !== "no" ? "checked" : ""}>${esc(fname(g.friendId))}</label>`).join("")}</span>
          </div>` : `<p class="muted small">Add guests first to split bills between them.</p>`}
          <div><button class="btn btn-sm">Add bill</button></div>
        </form>
        ${rows.length ? `<div class="breakdown">
          <div class="bd-row bd-head"><span>Person</span><span>Share</span><span>Paid</span><span></span></div>
          ${rows.map((r) => `<div class="bd-row ${r.id === state.meId || friend(r.id)?.uid === user?.uid ? "is-me" : ""}">
            <span class="bd-name">${avatar(r.id)}<span>${esc(fname(r.id))}</span></span>
            <span class="money">${money(r.share)}</span><span class="money">${money(r.paid)}</span><span class="bd-bal">${owesText(r)}</span></div>`).join("")}
          <div class="bd-row bd-total"><span>Total</span><span class="money">${money(rows.reduce((t, r) => t + r.share, 0))}</span><span class="money">${money(rows.reduce((t, r) => t + r.paid, 0))}</span><span></span></div>
          ${unpaid ? `<p class="muted small">${unpaid} bill${unpaid > 1 ? "s" : ""} marked “Not paid yet” ${unpaid > 1 ? "aren't" : "isn't"} counted until someone pays.</p>` : ""}
        </div>` : ""}
        ${bills.some((e) => e.paidBy) ? settleHTML(moves) : ""}
      `, { sub: bills.length ? `${money(billsTotal(h))}${unpaid ? ` · ${unpaid} not paid` : ""}` : "" });
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
    if (m === "recs") {
      const list = sortRecs(h);
      const edit = canEdit(h);
      const form = edit ? `
        <form class="rec-form" data-form="add-rec">
          <span class="muted small rec-form-title">Add your own</span>
          <div class="add-row">
            <input class="input" name="name" maxlength="80" placeholder="A place or activity, e.g. Board games at Jo's" aria-label="Place or activity" required>
            <select class="select" name="kind" aria-label="Type">${REC_KINDS.map((k) => `<option>${k}</option>`).join("")}</select>
            <button class="btn btn-sm">Add</button>
          </div>
          <div class="rec-extra">
            <input class="input" name="where" maxlength="100" placeholder="Where (optional), e.g. Maginhawa St, QC" aria-label="Where">
            <input class="input" name="note" maxlength="140" placeholder="Why go? (optional), e.g. Best ube cheesecake" aria-label="Note">
          </div>
          ${(state.picks || []).some((p) => !(h.recs || []).some((r) => samePlace(r, p))) ? `
          <select class="select" data-field="rec-from-pick" aria-label="Add from my picks">
            <option value="">Or add from my picks…</option>
            ${sortPicks(state.picks, "rated").filter((p) => !(h.recs || []).some((r) => samePlace(r, p))).map((p) => `<option value="${esc(p.id)}">${p.rating ? `${starString(p.rating)} ` : ""}${esc(p.name)}</option>`).join("")}
          </select>` : ""}
        </form>` : "";
      return moduleShell(m, h, `${form}${list.length ? `<ul class="list recs-list">${list.map(({ r, avg, count }) => {
        const mine = myRating(h, r);
        const map = recMapLink(r);
        return `<li class="rec ${r.photoId ? "has-cover" : ""}" data-id="${esc(r.id)}">
          ${r.photoId ? `<div class="place-banner">${photoImg(r.photoId, `Photo of ${r.name}`)}</div>` : ""}
          <span class="grow">
            <b>${esc(r.name)}</b>
            <span class="muted small">${count ? `<span class="stars-avg">${starsText(avg, count)}</span> · ` : ""}${esc(r.kind || "Place")}${r.cuisine && r.cuisine !== r.kind ? ` · ${esc(r.cuisine)}` : ""}${r.where ? ` · ${esc(r.where)}` : ""}${r.addedBy ? ` · added by ${esc(r.addedBy)}` : ""}</span>
            ${r.note ? `<span class="rec-note">“${esc(r.note)}”</span>` : ""}
            <span class="rate" role="group" aria-label="Your rating for ${esc(r.name)}">
              ${[1, 2, 3, 4, 5].map((n) => `<button class="star" data-action="rate-rec" data-v="${n}" aria-pressed="${n <= mine}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
              <span class="muted small">${mine ? "Your rating" : "Rate it"}</span>
            </span>
          </span>
          <span class="idea-actions">
            ${map ? `<a class="btn btn-sm btn-ghost" href="${map}" target="_blank" rel="noopener">Map</a>` : ""}
            ${isPicked(r) ? "" : `<button class="btn btn-sm btn-ghost" data-action="rec-save">Save</button>`}
            ${edit ? `<button class="btn btn-sm" data-action="edit-rec">Edit</button><button class="btn btn-sm" data-action="rec-vote">+ Vote</button><button class="btn btn-sm" data-action="rec-use">Use as place</button>
            <button class="icon-btn" data-action="remove-rec" aria-label="Remove ${esc(r.name)}">×</button>` : ""}
          </span>
        </li>`;
      }).join("")}</ul>`
        : `<p class="muted small">${edit ? "No recommendations yet. Add your own above, or find places in Ideas nearby and tap Recommend. Everyone in the hangout can see and rate them." : "No recommendations yet. The host can add some."}</p>`}`,
      { wide: true, sub: list.length ? `${list.length} place${list.length > 1 ? "s" : ""}` : "" });
    }
    if (m === "ideas") {
      return moduleShell(m, h, `<div class="ideas" data-ideas="${esc(h.id)}">${ideasBody(h.id)}</div>`, { wide: true });
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
      ${friend(state.meId) ? `<section class="profile-card">
        ${avatar(state.meId, "avatar-lg")}
        <div class="grow"><span class="eyebrow">Your profile</span><b>${esc(friend(state.meId).name)}</b>${profilePictureControls()}</div>
      </section>` : ""}
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
        <p class="muted small">${cloud ? "Your hangouts are saved to your account and sync to every device you sign in on. You can still export a backup file." : "Everything is saved in this browser only. Export a backup file to keep it safe or move it to another device."}</p>
        <div class="row">
          <button class="btn btn-sm" data-action="export">Export backup</button>
          <label class="btn btn-sm">Import backup<input type="file" accept="application/json,.json" id="import-file" hidden></label>
          <button class="btn btn-sm btn-ghost btn-danger" data-action="reset-all">Erase everything</button>
        </div>
        <div id="confirm-slot"></div>
      </section>`;
  }

  // ---------- sign in / create account ----------

  let authMode = "signin"; // "signin" | "signup" | "reset"

  function renderAuth() {
    const signup = authMode === "signup", reset = authMode === "reset";
    const heading = signup ? "Create your account" : reset ? "Reset your password" : "Welcome back";
    const sub = signup ? "Your hangouts, friends and plans, saved to your own account."
      : reset ? "Enter your email and we'll send you a link to set a new password."
      : "Sign in to see your hangouts.";
    return `
      <section class="auth">
        <div class="auth-card">
          <div class="auth-brand"><span class="brand-mark" aria-hidden="true"></span>Hangout HQ</div>
          ${reset ? "" : `
          <div class="auth-tabs" role="tablist" aria-label="Sign in or create an account">
            <button role="tab" data-action="auth-mode" data-v="signin" aria-selected="${!signup}">Sign in</button>
            <button role="tab" data-action="auth-mode" data-v="signup" aria-selected="${signup}">Create account</button>
          </div>`}
          <div class="auth-head"><h1>${heading}</h1><p class="muted">${sub}</p></div>
          ${pendingImport ? `<div class="banner info small">Sign in to add <b>${esc(pendingImport.hangout.title)}</b> to your hangouts.</div>`
            : pendingShareId ? `<div class="banner info small">You've been invited to a hangout. Sign in or create an account to join it.</div>`
            : (location.hash || "").startsWith("#/l/") ? `<div class="banner info small">A friend shared their recommendations with you. Sign in or create an account to see them.</div>` : ""}
          <form class="auth-form" data-form="auth" novalidate>
            ${signup ? `<label class="field"><span>Your name</span><input class="input" id="auth-name" name="name" autocomplete="name" placeholder="What friends call you" required></label>` : ""}
            <label class="field"><span>Email</span><input class="input" id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" required></label>
            ${reset ? "" : `<label class="field"><span>Password</span>
              <span class="pw-wrap"><input class="input" id="auth-password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" ${signup ? 'minlength="6" placeholder="At least 6 characters"' : ""} required>
              <button type="button" class="pw-toggle" data-action="toggle-pw" aria-label="Show password">Show</button></span></label>`}
            <p class="auth-error" id="auth-error" role="alert" hidden></p>
            <p class="auth-note" id="auth-note" role="status" hidden></p>
            <button class="btn btn-primary btn-block" id="auth-submit">${signup ? "Create account" : reset ? "Send reset link" : "Sign in"}</button>
          </form>
          ${reset ? `<button class="link-btn" data-action="auth-mode" data-v="signin">← Back to sign in</button>` : `
            ${signup ? "" : `<button class="link-btn" data-action="auth-mode" data-v="reset">Forgot your password?</button>`}
            <div class="divider"><span>or</span></div>
            <button class="btn btn-block btn-google" data-action="google">
              <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              Continue with Google
            </button>`}
          <p class="auth-foot muted small">Your hangouts are private to your account. Only you can see them.</p>
        </div>
      </section>`;
  }

  const AUTH_ERRORS = {
    "auth/invalid-credential": "That email and password don't match. Check them and try again.",
    "auth/wrong-password": "That email and password don't match. Check them and try again.",
    "auth/user-not-found": "There's no account with that email. Create one instead.",
    "auth/invalid-login-credentials": "That email and password don't match. Check them and try again.",
    "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
    "auth/invalid-email": "That doesn't look like an email address.",
    "auth/missing-password": "Enter your password.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/too-many-requests": "Too many tries. Wait a few minutes, or reset your password.",
    "auth/network-request-failed": "Couldn't connect. Check your internet and try again.",
    "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    "auth/unauthorized-domain": "Google sign-in isn't set up for this website yet. Use email and password for now.",
    "auth/operation-not-allowed": "This sign-in method isn't turned on yet. Try the other one.",
  };

  function authMessage(kind, text) {
    const err = $("#auth-error"), note = $("#auth-note");
    if (err) { err.hidden = kind !== "error"; err.textContent = kind === "error" ? text : ""; }
    if (note) { note.hidden = kind !== "note"; note.textContent = kind === "note" ? text : ""; }
  }
  function authBusy(busy) {
    document.querySelectorAll(".auth-card button, .auth-card input").forEach((el) => { el.disabled = busy; });
  }
  function authFail(e) {
    authBusy(false);
    if (e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")) return;
    authMessage("error", AUTH_ERRORS[e && e.code] || "Something went wrong. Try again.");
  }

  async function submitAuth(form) {
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const name = String(fd.get("name") || "").trim();
    if (!email) { authMessage("error", "Enter your email."); $("#auth-email").focus(); return; }
    if (authMode === "signup" && !name) { authMessage("error", "Enter your name so friends know it's you."); $("#auth-name").focus(); return; }
    if (authMode !== "reset" && !password) { authMessage("error", "Enter your password."); $("#auth-password").focus(); return; }
    authMessage(null);
    authBusy(true);
    try {
      if (authMode === "reset") {
        await auth.sendPasswordResetEmail(email);
        authBusy(false);
        authMessage("note", `If there's an account for ${email}, a reset link is on its way. Check your inbox and spam folder.`);
      } else if (authMode === "signup") {
        pendingName = name;
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (e) {
      pendingName = "";
      authFail(e);
    }
  }

  async function googleSignIn() {
    authMessage(null);
    authBusy(true);
    try {
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (e) { authFail(e); }
  }

  function updateAccountButton() {
    const btn = $(".account-btn");
    if (!btn) return;
    const show = cloud && !!user && !!state;
    btn.hidden = !show;
    if (!show) return;
    const me = friend(state.meId);
    const name = user.displayName || me?.name || user.email || "?";
    btn.innerHTML = `${esc(initials(name))}${me?.photoId ? photoImg(me.photoId) : ""}`;
    hydratePhotos(btn);
    btn.style.background = me?.color || COLORS[0];
    btn.title = `${name} · ${user.email || ""}`;
  }

  // Profile picture controls, shared by the account dialog and the Friends page.
  function profilePictureControls() {
    const me = friend(state.meId);
    if (busy.profile) return `<span class="muted small row" role="status"><span class="spinner" aria-hidden="true"></span>Uploading…</span>`;
    return `<span class="row pic-controls">
      <label class="btn btn-sm">${me?.photoId ? "Change photo" : "Add profile photo"}<input type="file" accept="image/*" data-upload="profile" hidden></label>
      ${me?.photoId ? `<button type="button" class="btn btn-sm btn-ghost btn-danger" data-action="remove-profile-pic">Remove</button>` : ""}
    </span>`;
  }

  function accountDialogHTML() {
    const me = friend(state.meId);
    const name = user.displayName || me?.name || "";
    return `
      <form method="dialog" class="account-sheet">
        <h2>Your account</h2>
        <div class="account-id">
          ${avatar(state.meId, "avatar-lg")}
          <div class="grow"><b>${esc(name || "No name set")}</b><span class="muted small">${esc(user.email || "")}</span>
            ${profilePictureControls()}
          </div>
        </div>
        <p class="muted small">Your hangouts are saved to this account. Sign in with the same email on any phone or computer to see them.</p>
        <div class="dialog-actions">
          <button type="button" class="btn" data-action="close-dialog">Close</button>
          <button type="button" class="btn btn-danger" data-action="sign-out">Sign out</button>
        </div>
      </form>`;
  }

  function openAccountDialog() {
    const dlg = $("#dialog");
    dlg.innerHTML = accountDialogHTML();
    dlg.dataset.kind = "account";
    hydratePhotos(dlg);
    dlg.showModal();
  }
  function refreshAccountDialog() {
    const dlg = $("#dialog");
    if (!dlg.open || dlg.dataset.kind !== "account" || !user) return;
    dlg.innerHTML = accountDialogHTML();
    hydratePhotos(dlg);
  }

  // ---------- router ----------

  let pendingImport = null;

  function route() {
    const dlg = $("#dialog");
    if (dlg.open) dlg.close();
    const hash = location.hash || "#/";
    if (hash.startsWith("#/s/")) {
      pendingShareId = hash.slice(4).replace(/[^A-Za-z0-9]/g, "") || null;
      history.replaceState(null, "", "#/");
      if (pendingShareId && !cloud) { pendingShareId = null; toast("Short share links need accounts turned on"); }
    }
    if (hash.startsWith("#/import/")) {
      pendingImport = decodeShare(hash.slice(9));
      history.replaceState(null, "", "#/");
      if (!pendingImport) toast("That share link is broken or incomplete");
    }
    render();
  }

  function render() {
    const app = $("#app");
    const signedOut = cloud && (!user || !state);
    document.body.classList.toggle("signed-out", signedOut);
    updateAccountButton();
    if (signedOut) {
      if (loadError) app.innerHTML = `<div class="empty"><b>${esc(loadError)}</b><button class="btn" data-action="reload">Reload</button></div>`;
      else if (!authReady || user) app.innerHTML = `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>${user ? "Loading your hangouts…" : "Loading…"}</div>`;
      else app.innerHTML = renderAuth();
      document.title = "Hangout HQ";
      return;
    }
    syncShareSubs();
    const hash = location.hash || "#/";
    let html, nav = "home";
    const m = hash.match(/^#\/h\/([\w-]+)/);
    if (m) {
      const h = hangout(m[1]);
      const stillLoading = cloud && (state.joined || []).some((sid) => !shareMeta.has(sid));
      html = h ? renderHangout(h)
        : stillLoading ? `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading…</div>`
        : `<div class="empty"><b>That hangout doesn't exist anymore.</b><a href="#/" class="btn">Back to hangouts</a></div>`;
    } else if (hash.startsWith("#/picks")) {
      nav = "picks";
      html = renderPicks();
    } else if (hash.startsWith("#/l/")) {
      nav = "picks";
      html = renderSharedList(hash.slice(4).replace(/[^A-Za-z0-9]/g, ""));
    } else if (hash.startsWith("#/ideas")) {
      nav = "ideas";
      html = `<div class="home-head"><div><h1>Things to do</h1><p class="muted">Looking for somewhere to go? Find food, cafés, parks, karaoke, malls and more near you or anywhere.</p></div></div>
        <section class="module wide"><div class="ideas" data-ideas="home">${ideasBody("home")}</div></section>`;
    } else if (hash.startsWith("#/friends")) {
      html = renderFriends(); nav = "friends";
    } else {
      html = renderHome();
    }
    if (pendingShareId && !shareLoading) resolveShare();
    if (pendingJoin) {
      html = `<div class="banner info"><span><b>${esc(pendingJoin.owner)}</b> invited you to <b>${esc(pendingJoin.title)}</b>.</span><span class="row"><button class="btn btn-sm btn-primary" data-action="join-share">Join hangout</button><button class="btn btn-sm btn-ghost" data-action="dismiss-join">Not now</button></span></div>` + html;
    }
    if (pendingImport) {
      html = `<div class="banner info"><span>Someone shared <b>${esc(pendingImport.hangout.title)}</b> with you.</span><span class="row"><button class="btn btn-sm btn-primary" data-action="accept-import">Add to my hangouts</button><button class="btn btn-sm btn-ghost" data-action="dismiss-import">Dismiss</button></span></div>` + html;
    }
    const focusId = document.activeElement?.id;
    app.innerHTML = html;
    if (focusId === "search" || focusId === "picks-search") { const s = $(`#${focusId}`); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }
    document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
    const h = m && hangout(m[1]);
    document.title = h ? `${h.title} · Hangout HQ` : nav === "friends" ? "Friends · Hangout HQ" : nav === "ideas" ? "Things to do · Hangout HQ" : nav === "picks" ? "My picks · Hangout HQ" : "Hangout HQ";
    hydratePhotos(app);
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

  function openHangoutDialog(h, preset = {}) {
    const dlg = $("#dialog");
    const isNew = !h;
    const v = h || { title: "", size: 1, date: "", time: "", endTime: "", place: "", description: "", ...preset };
    dlg.dataset.kind = "hangout";
    let pendingCover = null;     // a File chosen in this dialog
    let dropCover = false;       // "Remove" pressed for the existing cover
    let previewUrl = null;
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
        <div class="field"><span>Cover photo</span>
          <div class="cover-pick">
            <div class="cover-preview" id="cover-preview">${v.cover ? photoImg(v.cover.id) : '<span class="muted small">No cover photo</span>'}</div>
            <div class="row">
              <label class="btn btn-sm">${v.cover ? "Change" : "Choose photo"}<input type="file" accept="image/*" id="f-cover" hidden></label>
              <button type="button" class="btn btn-sm btn-ghost btn-danger" id="f-cover-remove" ${v.cover ? "" : "hidden"}>Remove</button>
            </div>
          </div>
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn" data-action="close-dialog">Cancel</button>
          <button class="btn btn-primary" value="save">${isNew ? "Create hangout" : "Save changes"}</button>
        </div>
      </form>`;
    hydratePhotos(dlg);
    dlg.showModal();
    $("#f-title").focus();
    const preview = $("#cover-preview"), removeBtn = $("#f-cover-remove");
    const showNoCover = () => { preview.innerHTML = '<span class="muted small">No cover photo</span>'; removeBtn.hidden = true; };
    $("#f-cover").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (!isImage(file)) { toast("Pick a photo or image file"); return; }
      pendingCover = file; dropCover = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${previewUrl}" alt="New cover photo">`;
      removeBtn.hidden = false;
    });
    removeBtn.addEventListener("click", () => {
      pendingCover = null; dropCover = !!v.cover;
      showNoCover();
    });
    dlg.addEventListener("close", () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, { once: true });
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
          bring: [], tasks: [], costs: [], expenses: [], budget: 0, schedule: [], poll: null, notes: "", createdAt: Date.now(),
        };
        state.hangouts.push(nh);
        closeDialog();
        save();
        location.hash = `#/h/${nh.id}`;
        toast("Hangout created");
        if (pendingCover) setCover(nh.id, pendingCover);
      } else {
        // Growing a hangout turns on the tools that size starts with; shrinking never hides anything.
        const grew = size > h.size;
        Object.assign(h, data);
        if (grew) SIZES.find((s) => s.id === size).modules.forEach((m) => { if (!h.modules.includes(m)) h.modules.push(m); });
        if (dropCover && !pendingCover) removeCover(h);
        closeDialog();
        commit();
        toast(grew ? "Saved. Added tools for a bigger hangout" : "Saved");
        if (pendingCover) setCover(h.id, pendingCover);
      }
    });
  }

  function openRenameDialog(f) {
    const dlg = $("#dialog");
    dlg.dataset.kind = "rename";
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

    const PLAN_ACTIONS = ["edit-rec", "idea-recommend", "rec-vote", "rec-use", "remove-rec", "edit-hangout", "remove-cover", "invite-all", "toggle-item", "remove-item", "remove-schedule",
      "remove-expense", "remove-cost", "vote", "reset-poll", "add-module", "remove-module", "delete-hangout", "duplicate"];
    if (h && PLAN_ACTIONS.includes(action)) {
      if (!canEdit(h)) { toast("You can view this hangout. Ask the host if you want to edit it"); e.preventDefault(); render(); return; }
      if (isJoined(h) && ["remove-cover", "delete-hangout", "duplicate"].includes(action)) return;
    }

    switch (action) {
      case "auth-mode": authMode = btn.dataset.v; render(); $("#auth-email")?.focus(); break;
      case "toggle-pw": {
        const pw = $("#auth-password");
        const show = pw.type === "password";
        pw.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        break;
      }
      case "google": googleSignIn(); break;
      case "account": openAccountDialog(); break;
      case "sign-out": closeDialog(); signOut(); toast("Signed out"); break;
      case "reload": location.reload(); break;
      case "remove-cover": removeCover(h); commit(); toast("Cover photo removed"); break;
      case "remove-profile-pic": removeProfilePicture(); break;
      case "new-hangout": openHangoutDialog(null); break;
      case "ideas-me": case "ideas-place": case "ideas-reset": case "ideas-radius": case "ideas-cat":
      case "ideas-more": case "ideas-retry": case "ideas-sort": case "idea-recommend": case "idea-plan": case "idea-save": {
        const key = btn.closest("[data-ideas]")?.dataset.ideas;
        if (!key) break;
        const st = ideaState(key);
        const place = st.view?.[Number(btn.dataset.i)];
        if (action === "ideas-me") ideasNearMe(key);
        else if (action === "ideas-place") ideasNearPlace(key, h?.place);
        else if (action === "ideas-reset") { st.gen++; Object.assign(st, { status: "idle", from: null, places: new Map(), pending: 0, cat: "all" }); refreshIdeas(key); }
        else if (action === "ideas-radius") { st.radius = Number(btn.dataset.v); startIdeas(key, st.from); }
        else if (action === "ideas-cat") { st.cat = btn.dataset.v; st.show = 30; queueIdeas(key); }
        else if (action === "ideas-more") { st.show += 30; refreshIdeas(key); }
        else if (action === "ideas-retry") { st.failedQ.forEach((q) => st.loaded.delete(q)); st.failedQ.clear(); st.failed = 0; queueIdeas(key); }
        else if (action === "ideas-sort") { st.sort = btn.dataset.v; refreshIdeas(key); }
        else if (action === "idea-recommend" && place && h) recommendPlace(h, place);
        else if (action === "idea-save" && place) { addPick(place); refreshIdeas(key); }
        else if (action === "idea-plan" && place) openHangoutDialog(null, { title: `Hangout at ${place.name}`, place: place.name });
        break;
      }
      case "rate-rec": case "rec-vote": case "rec-use": case "remove-rec": case "rec-save": case "edit-rec": {
        const rec = (h?.recs || []).find((r) => r.id === id);
        if (!rec) break;
        if (action === "rec-save") addPick(rec);
        else if (action === "edit-rec") {
          if (!canEdit(h)) break;
          openPlaceDialog(rec, { heading: "Edit recommendation", onSave: (changes) => { Object.assign(rec, changes); commit(); } });
        }
        else if (action === "rate-rec") rateRec(h, rec, Number(btn.dataset.v));
        else if (action === "rec-use") { h.place = rec.where ? `${rec.name}, ${rec.where}` : rec.name; commit(); toast(`Place set to ${h.place}`); }
        else if (action === "remove-rec") {
          h.recs = h.recs.filter((r) => r.id !== rec.id);
          commit();
          if (rec.photoId && !photoInUse(rec.photoId)) photoStore.del(rec.photoId);
          toast(`Removed ${rec.name}`);
        }
        else {
          if (!h.poll) h.poll = { question: "Where should we go?", options: [] };
          if (h.poll.options.some((o) => o.text.toLowerCase() === rec.name.toLowerCase())) { toast(`${rec.name} is already in the vote`); break; }
          h.poll.options.push({ id: uid(), text: rec.name, votes: [] });
          if (!h.modules.includes("poll")) h.modules.push("poll");
          commit(); toast(`Added ${rec.name} to the group vote`);
        }
        break;
      }
      case "picks-share": sharePicks(); break;
      case "picks-copy": toast((await copyText(picksText())) ? "Your list is copied. Paste it in a chat" : "Couldn't copy your list"); break;
      case "picks-sort": picksView.sort = btn.dataset.v; render(); break;
      case "picks-kind": picksView.kind = btn.dataset.v; render(); break;
      case "rate-pick": case "remove-pick": case "pick-plan": case "edit-pick": {
        const pick = (state.picks || []).find((p) => p.id === id);
        if (!pick) break;
        if (action === "edit-pick") {
          openPlaceDialog(pick, { heading: "Edit pick", onSave: (changes) => { Object.assign(pick, changes); commit(); } });
          break;
        }
        if (action === "rate-pick") { const n = Number(btn.dataset.v); pick.rating = pick.rating === n ? 0 : n; commit(); }
        else if (action === "remove-pick") {
          state.picks = state.picks.filter((p) => p.id !== id);
          commit();
          if (pick.photoId && !photoInUse(pick.photoId)) photoStore.del(pick.photoId);
          toast(`Removed ${pick.name}`);
        }
        else openHangoutDialog(null, { title: `Hangout at ${pick.name}`, place: pick.where ? `${pick.name}, ${pick.where}` : pick.name });
        break;
      }
      case "list-save": {
        const sid = (location.hash.match(/^#\/l\/([A-Za-z0-9]+)/) || [])[1];
        const item = listCache.get(sid)?.data?.items?.[Number(btn.dataset.i)];
        if (item && addPick(item)) render();
        break;
      }
      case "edit-hangout": openHangoutDialog(h); break;
      case "close-dialog": closeDialog(); break;
      case "filter": filter = btn.dataset.v; render(); break;
      case "clear-examples":
        deleteCoversOf(state.hangouts);
        state = { friends: [friend(state.meId) || { id: uid(), name: "You", color: COLORS[0] }], hangouts: [], currency: state.currency, examples: false };
        state.meId = state.friends[0].id;
        commit(); toast("Examples cleared"); break;
      case "rsvp": {
        const account = friend(id)?.uid;
        const members = metaOf(h)?.members || {};
        const g = h.guests.find((x) => x.friendId === id);
        const current = g ? g.rsvp : members[account]?.rsvp;
        const next = current === btn.dataset.v ? "pending" : btn.dataset.v;
        if (account && members[account]) {
          // Joined guests answer for themselves (the owner may answer for them).
          if (account !== user.uid && roleIn(h) !== "owner") break;
          setMemberRsvp(h, account, next);
          if (g) g.rsvp = next;
          if (isJoined(h)) render(); else commit();
          break;
        }
        if (!canEdit(h) || !g) break;
        g.rsvp = next;
        commit(); break;
      }
      case "remove-guest": {
        const account = friend(id)?.uid;
        if (account && metaOf(h)?.members?.[account]) {
          if (roleIn(h) !== "owner") break;
          removeMember(h, account);
        }
        h.guests = h.guests.filter((g) => g.friendId !== id); commit(); break;
      }
      case "toggle-editor": {
        const account = friend(id)?.uid;
        const member = metaOf(h)?.members?.[account];
        if (roleIn(h) === "owner" && member) setEditor(h, account, member.role !== "editor");
        break;
      }
      case "leave-hangout":
        confirmInline(`Leave “${h.title}”? It disappears from your hangouts until someone sends you the link again.`, "Leave hangout", () => leaveShare(h));
        break;
      case "join-share": joinShare(); break;
      case "settle-mode":
        settleMode = btn.dataset.v;
        try { localStorage.setItem("hangout-hq-settle", settleMode); } catch (_) { /* per-visit only */ }
        render(); break;
      case "dismiss-join": pendingJoin = null; render(); break;
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
      case "remove-cost": h.costs = (h.costs || []).filter((x) => x.id !== id); commit(); break;
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
        const url = shareLink(h);
        toast((await copyText(url)) ? cloud ? "Invite link copied. Friends who open it can join this hangout" : "Link copied. Friends can open it to add this hangout" : "Couldn't copy the link");
        break;
      }
      case "duplicate": {
        const copy = JSON.parse(JSON.stringify(h));
        Object.assign(copy, { id: uid(), title: `${h.title} (again)`, date: "", createdAt: Date.now() });
        copy.guests.forEach((g) => { g.rsvp = "pending"; });
        [...copy.tasks, ...copy.bring].forEach((t) => { t.done = false; });
        copy.expenses = [];
        copy.cover = null;
        delete copy.shareId;
        if (h.cover) {
          // Give the copy its own cover image so deleting one never breaks the other.
          loadPhoto(h.cover.id).then(async (src) => {
            if (!src) return;
            const id = uid();
            await photoStore.put(id, src, "cover");
            photoCache.set(id, src);
            const target = hangout(copy.id);
            if (target && !target.cover) { target.cover = { id }; commit(); } else photoStore.del(id);
          }).catch(() => { /* copy keeps no cover */ });
        }
        if (copy.poll) copy.poll.options.forEach((o) => { o.votes = []; });
        state.hangouts.push(copy);
        save(); location.hash = `#/h/${copy.id}`; toast("Copied. Pick a new date");
        break;
      }
      case "delete-hangout":
        confirmInline(`Delete “${h.title}”? This can't be undone.`, "Delete hangout", () => {
          deleteCoversOf([h]);
          if (cloud && h.shareId) shareRef(h.shareId).delete().catch(() => { /* guests keep their last copy */ });
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
        confirmInline(`Erase every hangout and friend ${cloud ? "in your account" : "in this browser"}?`, "Erase everything", () => {
          deleteCoversOf(state.hangouts);
          if (!cloud) { try { localStorage.removeItem(STORE_KEY); } catch (_) { /* ignore */ } }
          const me = friend(state.meId);
          state = { friends: [me ? { ...me } : { id: uid(), name: "You", color: COLORS[0] }], hangouts: [], currency: state.currency, examples: false };
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
    if (form.dataset.form === "auth") { submitAuth(form); return; }
    if (form.dataset.form === "add-pick") {
      const fd2 = new FormData(form);
      const name = String(fd2.get("name") || "").trim();
      if (!name) { toast("Name the place or activity"); return; }
      if (addPick({ name, kind: fd2.get("kind"), where: String(fd2.get("where") || "").trim(), note: String(fd2.get("note") || "").trim() })) {
        $('[data-form="add-pick"] input[name="name"]')?.focus();
      }
      return;
    }
    if (form.dataset.form === "ideas-search") {
      const key = form.closest("[data-ideas]")?.dataset.ideas;
      if (key) ideasNearPlace(key, new FormData(form).get("q"));
      return;
    }
    const fd = new FormData(form);
    const h = currentHangout();
    if (h && !canEdit(h)) return;
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
        const everyone = fd.get("everyone") === "on";
        const split = everyone ? [] : fd.getAll("split");
        if (!(amount > 0)) { toast("Enter an amount above zero"); return; }
        if (!everyone && !split.length) { toast("Pick at least one person to split the bill with"); return; }
        h.expenses.push({ id: uid(), text: fd.get("text").trim(), amount, paidBy: fd.get("paidBy") || "", everyone, split });
        commit(); $('[data-form="add-expense"] input[name="text"]')?.focus(); break;
      }
      case "add-rec": {
        const name = String(fd.get("name") || "").trim();
        if (!name) { toast("Name the place or activity"); return; }
        const ok = addOwnRec(h, { name, kind: fd.get("kind"), where: String(fd.get("where") || "").trim(), note: String(fd.get("note") || "").trim() });
        if (ok) $('[data-form="add-rec"] input[name="name"]')?.focus();
        break;
      }
      case "add-cost": {
        const amount = Number(fd.get("amount"));
        if (!(amount > 0)) { toast("Enter an amount above zero"); return; }
        (h.costs || (h.costs = [])).push({ id: uid(), text: fd.get("text").trim(), amount });
        commit(); $('[data-form="add-cost"] input[name="text"]')?.focus(); break;
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
    if (h && !canEdit(h) && (el.dataset.field || el.dataset.upload === "cover")) { render(); return; }
    if (h && isJoined(h) && el.dataset.upload === "cover") return;
    if (el.dataset.field === "assign" && h) {
      const li = el.closest("[data-id]");
      const list = el.closest("[data-module]").dataset.module;
      const it = h[list].find((x) => x.id === li.dataset.id);
      it.friendId = el.value; commit();
    } else if (el.dataset.field === "pick-to-hangout") {
      const pick = (state.picks || []).find((p) => p.id === el.closest("[data-id]")?.dataset.id);
      const target = hangout(el.value);
      if (pick && target && canEdit(target)) recommendPlace(target, pick);
      el.value = "";
      return;
    } else if (el.dataset.field === "rec-from-pick" && h) {
      const pick = (state.picks || []).find((p) => p.id === el.value);
      if (pick) recommendPlace(h, pick);
      return;
    } else if (el.id === "split-everyone") {
      const some = el.closest(".split-pick").querySelector(".split-some");
      if (some) some.hidden = el.checked;
      return;
    } else if (el.dataset.field === "paidby" && h) {
      const item = h.expenses.find((x) => x.id === el.closest("[data-id]").dataset.id);
      if (item) { item.paidBy = el.value; commit(); }
    } else if (el.dataset.field === "budget" && h) {
      h.budget = Math.max(0, Number(el.value) || 0); commit();
    } else if (el.dataset.field === "currency") {
      state.currency = el.value.trim() || DEFAULT_CURRENCY;
      state.currencyChosen = true;
      commit();
    } else if (el.dataset.upload === "cover" && el.files[0] && h) {
      setCover(h.id, el.files[0]);
      el.value = "";
    } else if (el.dataset.upload === "profile" && el.files[0]) {
      setProfilePicture(el.files[0]);
      el.value = "";
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
    if (el.id === "picks-search") { picksView.q = el.value; render(); return; }
    if (el.dataset.field === "notes") {
      const h = currentHangout();
      if (!h || !canEdit(h)) return;
      h.notes = el.value;
      clearTimeout(notesTimer);
      notesTimer = setTimeout(save, 400);
    }
  });

  window.addEventListener("hashchange", route);
  if (state && upgradeState(state)) save();
  if (cloud) startCloud();
  route();
})();
