const $ = (s) => document.querySelector(s);
const CFG = window.RAINDROP_CONFIG || {};
const VER = chrome.runtime.getManifest().version;
const ORDER = ["clock", "greet", "quote", "search", "links", "todo", "notes"];
const WNAMES = { clock: "Clock", greet: "Greeting", quote: "Quote", search: "Search", links: "Quick links", todo: "Todos", notes: "Notes" };
const U = (o) => ({ pos: "mc", free: false, x: null, y: null, size: 100, font: "", weight: "", color: "", lock: false, bg: 0, radius: 16, group: "", ...o });
const DEF = {
  schema: 2,
  groups: { main: U({ name: "Main" }) },
  w: { clock: U({ font: "serif", group: "main" }), greet: U({ font: "serif", group: "main" }), quote: U({ font: "serif", group: "main" }), search: U({ group: "main" }), links: U({ group: "main" }), todo: U({ free: true, bg: 58 }), notes: U({ free: true, bg: 58 }) },
  look: { shade: 30, tsh: 24 },
  keys: { UNSPLASH_ACCESS_KEY: "", API_NINJAS_KEY: "", GITHUB_TOKEN: "", syncVault: false },
  ui: { open: ["bg"] },
  sync: { provider: "none", googleOn: false, gist: "", auto: false }, updated: 0,
  search: { style: "pill", icon: true, placeholder: "Search the web", custom: "" },
  bg: { anim: "fade", dur: 700, hideCredit: false, by: "official", topic: "nature", collections: "", featured: false, paused: false, blur: 0, lum: 0, every: "10", type: "raindrop", intensity: 5, c1: "#0a1020", c2: "#24486b", solid: "#101826", query: "rain", overlay: true, image: "" },
  show: { quote: true, clock: true, greet: true, search: true, links: true, todo: true, notes: false },
  name: "", quoteSrc: "quotable", quoteCat: "inspirational", quote: null, fmt: "24", engine: "google",
  links: [{ n: "GitHub", u: "https://github.com" }, { n: "YouTube", u: "https://youtube.com" }],
  todos: [], notes: "", notesBox: null, photo: null,
  clocks: [{ label: "Local", tz: "", mode: "digital" }],
};
const ENGINES = { google: "https://www.google.com/search?q=", ddg: "https://duckduckgo.com/?q=", bing: "https://www.bing.com/search?q=", brave: "https://search.brave.com/search?q=", ecosia: "https://www.ecosia.org/search?q=", startpage: "https://www.startpage.com/do/search?q=", yahoo: "https://search.yahoo.com/search?p=", youtube: "https://www.youtube.com/results?search_query=" };
const FONTS = { serif: 'Georgia,"Times New Roman",serif', sans: '"Avenir Next","Segoe UI",system-ui,sans-serif', mono: 'ui-monospace,"SF Mono",Consolas,monospace', rounded: '"Trebuchet MS","Segoe UI",Verdana,sans-serif', elegant: 'Palatino,"Palatino Linotype","Book Antiqua",serif', light: '"Helvetica Neue","Segoe UI Light",Arial,sans-serif' };
let D = structuredClone(DEF);
/* ---------- API key vault: AES-256-GCM, key derived with PBKDF2-HMAC-SHA256 (600k iterations, OWASP) ---------- */
let KEYS = {}, vaultKey = null, LOCKED = false;
const KEYNAMES = ["UNSPLASH_ACCESS_KEY", "API_NINJAS_KEY", "GITHUB_TOKEN"];
const key = (n) => KEYS[n] || CFG[n] || "";
const enc = new TextEncoder(), dec = new TextDecoder(), ITER = 600000;
const b64 = (u) => btoa(String.fromCharCode(...u)), unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const derive = async (pass, salt, iter) => crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]), { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
const sealBox = async (k, obj) => { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), ct: b64(new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, enc.encode(JSON.stringify(obj))))) }; };
const openBox = async (k, v) => JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(v.iv) }, k, unb64(v.ct))));
const keepSession = async () => chrome.storage.session.set({ rdk: b64(new Uint8Array(await crypto.subtle.exportKey("raw", vaultKey))) }); // memory only, cleared when the browser closes
async function initKeys() {
  KEYS = {}; LOCKED = false; vaultKey = null;
  if (D.vault) {
    try {
      const s = (await chrome.storage.session.get("rdk")).rdk; if (!s) throw 0;
      vaultKey = await crypto.subtle.importKey("raw", unb64(s), "AES-GCM", true, ["encrypt", "decrypt"]);
      KEYS = await openBox(vaultKey, D.vault);
    } catch { LOCKED = true; vaultKey = null; }
  } else for (const n of KEYNAMES) KEYS[n] = D.keys[n] || "";
}
async function protect(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  vaultKey = await derive(pass, salt, ITER);
  D.vault = { v: 1, kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), ...(await sealBox(vaultKey, KEYS)) };
  for (const n of KEYNAMES) D.keys[n] = "";
  await keepSession(); save();
}
async function unlock(pass) {
  const k = await derive(pass, unb64(D.vault.salt), D.vault.iter);
  KEYS = await openBox(k, D.vault); vaultKey = k; LOCKED = false; await keepSession();
}
async function reseal() { D.vault = { ...D.vault, ...(await sealBox(vaultKey, KEYS)) }; save(); }
async function lockNow() { await chrome.storage.session.remove("rdk"); KEYS = {}; vaultKey = null; LOCKED = true; }
async function unprotect() {
  for (const n of KEYNAMES) D.keys[n] = KEYS[n] || "";
  delete D.vault; vaultKey = null; await chrome.storage.session.remove("rdk"); save();
}

const store = chrome.storage.local;
let pushT, bgTimer, bgDeb;
const save = (quiet) => { if (!quiet) { D.updated = Date.now(); schedulePush(); } store.set({ rd: D }); };
const get = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
const put = (o, p, v) => { const k = p.split("."); const last = k.pop(); k.reduce((a, x) => a[x], o)[last] = v; };
const merge = (a, b) => { for (const k in b) a[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? merge(a[k] || {}, b[k]) : b[k]; return a; };
const val = (el) => (el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value);
const setVal = (el) => {
  const v = get(D, el.dataset.k);
  if (el.type === "checkbox") el.checked = !!v; else el.value = v || (el.type === "color" ? "#ffffff" : v ?? "");
};

/* ---------- background ---------- */
const sigOf = (b) => [b.by, b.topic, b.query, b.collections, b.featured].join("|");
let bgCur = null, prevT;
function setBg(css) {
  const host = $("#bg"); if (css === bgCur) return;
  const first = bgCur === null; bgCur = css;
  const prev = host.lastElementChild, dur = +D.bg.dur;
  let a = D.bg.anim; if (matchMedia("(prefers-reduced-motion: reduce)").matches && a !== "none") a = "fade"; // keep a gentle fade
  const layer = document.createElement("div"); layer.className = "bgl"; layer.style.background = css;
  const clean = () => host.querySelectorAll(".bgl").forEach((l) => l !== layer && l.remove());
  if (!prev || first || a === "none" || !dur) { host.append(layer); clean(); return; }
  const o = { duration: dur, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" };
  if (a === "slide-out") { host.insertBefore(layer, prev); prev.animate([{ transform: "translateX(0)" }, { transform: "translateX(-100%)" }], o).onfinish = clean; return; }
  host.append(layer);
  const k = { fade: [{ opacity: 0 }, { opacity: 1 }], "slide-in": [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], zoom: [{ opacity: 0, transform: "scale(1.12)" }, { opacity: 1, transform: "scale(1)" }] }[a];
  layer.animate(k, o).onfinish = clean;
}
function previewBg() { // lets you see the chosen transition: swap to a contrasting backdrop and back
  const cur = bgCur; if (cur === null) return;
  const alt = "linear-gradient(135deg,#7fd6ff,#24486b)"; setBg(cur === alt ? "#222" : alt);
  clearTimeout(prevT); prevT = setTimeout(() => setBg(cur), (+D.bg.dur || 0) + 700);
}
const preload = (u) => new Promise((r) => { const i = new Image(); i.onload = () => (i.decode ? i.decode().then(r, r) : r()); i.onerror = r; i.src = u; });
async function applyBg() {
  clearInterval(bgTimer);
  const b = D.bg, cred = $("#credit"), grad = `linear-gradient(180deg, ${b.c1}, ${b.c2})`;
  cred.textContent = ""; cred.hidden = false; cred.onclick = null; cred.removeAttribute("href");
  let css = grad;
  if (b.type === "solid") css = b.solid;
  else if (b.type === "image" && b.image) css = `center/cover url(${b.image})`;
  else if (b.type === "unsplash") {
    if (bgCur === null) setBg(grad); // show something instantly, then fade the photo in when it is ready
    if (!key("UNSPLASH_ACCESS_KEY")) {
      cred.textContent = LOCKED ? "Unlock your API keys to load photos" : "Add your Unsplash key under API keys";
      cred.href = "#"; cred.onclick = (e) => { e.preventDefault(); openKeys(); };
    } else try {
      const old = D.photo, ms = +b.every * 6e4, fresh = old && old.sig === sigOf(b) && (b.paused || (ms > 0 && Date.now() - old.t < ms - 2000));
      if (ms > 0 && !b.paused) bgTimer = setInterval(applyBg, ms);
      const p = fresh ? old : await fetchPhoto(b);
      D.photo = p; save(true); await preload(p.url);
      css = `center/cover url(${p.url})`;
      cred.textContent = `Photo by ${p.by} on Unsplash`; cred.href = p.link + "?utm_source=raindrop&utm_medium=referral"; cred.hidden = !!b.hideCredit;
    } catch (e) { cred.textContent = "Unsplash unavailable: check your key or rate limit"; }
  }
  setBg(css);
  b.type === "raindrop" || b.overlay ? Rain.start($("#rain"), b.intensity) : Rain.stop();
}
async function fetchPhoto(b) {
  const A = "https://api.unsplash.com", H = { headers: { Authorization: "Client-ID " + key("UNSPLASH_ACCESS_KEY") } };
  let j;
  if (b.by === "official" || b.by === "topic") {
    const slug = b.by === "official" ? "wallpapers" : b.topic, order = b.by === "official" || b.featured ? "popular" : "latest";
    const r = await fetch(`${A}/topics/${slug}/photos?per_page=30&orientation=landscape&order_by=${order}`, H);
    if (!r.ok) throw new Error(r.status);
    const list = await r.json(); j = list[Math.floor(Math.random() * list.length)];
  } else {
    const p = new URLSearchParams({ orientation: "landscape" });
    if (b.featured) p.set("featured", "true");
    if (b.by === "search") p.set("query", b.query || "nature"); else p.set("collections", (b.collections || "").replace(/\s/g, ""));
    const r = await fetch(`${A}/photos/random?${p}`, H);
    if (!r.ok) throw new Error(r.status);
    j = await r.json();
  }
  fetch(j.links.download_location, H).catch(() => {}); // Unsplash API guideline: report photo use
  return { url: j.urls.regular, by: j.user.name, link: j.links.html, sig: sigOf(b), t: Date.now() };
}
function applyFx() {
  const s = document.documentElement.style;
  s.setProperty("--blur", D.bg.blur + "px"); s.setProperty("--lum", 1 + D.bg.lum / 150);
}
function applyLook() {
  const L = D.look, s = document.documentElement.style;
  s.setProperty("--shade", L.shade / 100);
  s.setProperty("--tsh", L.tsh ? `0 2px ${L.tsh}px rgba(0,0,0,${Math.min(0.85, 0.3 + L.tsh / 70)})` : "none");
}

/* ---------- widgets ---------- */
const pad = (n) => String(n).padStart(2, "0");
function zoneTime(tz) {
  const o = { hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" };
  try {
    if (tz) o.timeZone = tz;
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", o).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { h: +p.hour, m: +p.minute, s: +p.second };
  } catch { return null; }
}
function analog(t, size) {
  const hand = (deg, len, w, col) => `<line y2="${-len}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" transform="rotate(${deg})"/>`;
  let ticks = "";
  for (let i = 0; i < 12; i++) ticks += `<line y1="-43" y2="${i % 3 ? -40 : -37}" stroke="rgba(255,255,255,.7)" stroke-width="${i % 3 ? 1 : 2}" transform="rotate(${i * 30})"/>`;
  return `<svg viewBox="-50 -50 100 100" width="${size}" height="${size}"><circle r="48" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.35)"/>${ticks}` +
    hand(((t.h % 12) + t.m / 60) * 30, 24, 3, "#fff") + hand((t.m + t.s / 60) * 6, 36, 2, "#fff") + hand(t.s * 6, 40, 1, "#7fd6ff") + `<circle r="2" fill="#7fd6ff"/></svg>`;
}
function tick() {
  const box = $("#clock"), many = D.clocks.length > 1;
  box.classList.toggle("many", many); box.classList.toggle("one", !many);
  box.innerHTML = D.clocks.map((c) => {
    const t = zoneTime(c.tz) || zoneTime("");
    const label = c.label || (c.place ? c.place.replace(/\b\w/g, (x) => x.toUpperCase()) : c.tz ? c.tz.split("/").pop().replace(/_/g, " ") : "Local");
    let face;
    if (c.mode === "analog") face = analog(t, (many ? 130 : 230) * (D.w.clock.size / 100));
    else {
      const ap = D.fmt === "12" ? (t.h >= 12 ? "pm" : "am") : "";
      const h = D.fmt === "12" ? t.h % 12 || 12 : pad(t.h);
      face = `<div class="t">${h}:${pad(t.m)}<small>${ap}</small></div>`;
    }
    return `<div class="ck">${face}${many || c.label ? `<div class="l">${label.replace(/</g, "&lt;")}</div>` : ""}</div>`;
  }).join("");
  const hr = new Date().getHours(), part = hr < 12 ? "morning" : hr < 18 ? "afternoon" : "evening";
  $("#greet").textContent = `Good ${part}${D.name ? ", " + D.name : ""}.`;
}
function renderClockList() {
  const list = $("#clockList"); list.textContent = "";
  D.clocks.forEach((c, i) => {
    const row = document.createElement("div"); row.className = "cl";
    const mk = (tag, cls, val, ph) => { const e = document.createElement(tag); if (cls) e.className = cls; if (val !== undefined) e.value = val; if (ph) e.placeholder = ph; return e; };
    const label = mk("input", "", c.label, "Label");
    const mode = mk("select"); mode.innerHTML = '<option value="digital">Digital</option><option value="analog">Analogue</option>'; mode.value = c.mode;
    const tz = mk("input", "tz", c.place ?? c.tz, "Country or city (blank = local)"); tz.setAttribute("list", "tzlist");
    const del = mk("button", "x"); del.textContent = "\u00d7"; del.title = "Remove clock"; del.disabled = D.clocks.length < 2;
    label.oninput = () => { c.label = label.value; save(); tick(); };
    mode.onchange = () => { c.mode = mode.value; save(); tick(); };
    tz.oninput = () => { const r = resolveTz(tz.value); tz.classList.toggle("bad", r === null); c.place = tz.value.trim(); if (r !== null) c.tz = r; save(); tick(); };
    del.onclick = () => { D.clocks.splice(i, 1); save(); renderClockList(); tick(); };
    row.append(label, mode, del, tz); list.append(row);
  });
}
$("#addClock").onclick = () => { D.clocks.push({ label: "", place: "Singapore", tz: "Asia/Singapore", mode: D.clocks[0]?.mode || "digital" }); save(); renderClockList(); tick(); };
const COUNTRY_DATA = "Afghanistan:Asia/Kabul,Argentina:America/Argentina/Buenos_Aires,Australia:Australia/Sydney,Austria:Europe/Vienna,Bangladesh:Asia/Dhaka,Belgium:Europe/Brussels,Brazil:America/Sao_Paulo,Brunei:Asia/Brunei,Cambodia:Asia/Phnom_Penh,Canada:America/Toronto,Chile:America/Santiago,China:Asia/Shanghai,Colombia:America/Bogota,Cuba:America/Havana,Czechia:Europe/Prague,Denmark:Europe/Copenhagen,Egypt:Africa/Cairo,Ethiopia:Africa/Addis_Ababa,Finland:Europe/Helsinki,France:Europe/Paris,Germany:Europe/Berlin,Ghana:Africa/Accra,Greece:Europe/Athens,Hong Kong:Asia/Hong_Kong,Hungary:Europe/Budapest,Iceland:Atlantic/Reykjavik,India:Asia/Kolkata,Indonesia:Asia/Jakarta,Iran:Asia/Tehran,Iraq:Asia/Baghdad,Ireland:Europe/Dublin,Israel:Asia/Jerusalem,Italy:Europe/Rome,Japan:Asia/Tokyo,Jordan:Asia/Amman,Kenya:Africa/Nairobi,Kuwait:Asia/Kuwait,Laos:Asia/Vientiane,Lebanon:Asia/Beirut,Malaysia:Asia/Kuala_Lumpur,Maldives:Indian/Maldives,Mexico:America/Mexico_City,Morocco:Africa/Casablanca,Myanmar:Asia/Yangon,Nepal:Asia/Kathmandu,Netherlands:Europe/Amsterdam,New Zealand:Pacific/Auckland,Nigeria:Africa/Lagos,North Korea:Asia/Pyongyang,Norway:Europe/Oslo,Pakistan:Asia/Karachi,Peru:America/Lima,Philippines:Asia/Manila,Poland:Europe/Warsaw,Portugal:Europe/Lisbon,Qatar:Asia/Qatar,Romania:Europe/Bucharest,Russia:Europe/Moscow,Saudi Arabia:Asia/Riyadh,Singapore:Asia/Singapore,South Africa:Africa/Johannesburg,South Korea:Asia/Seoul,Spain:Europe/Madrid,Sri Lanka:Asia/Colombo,Sweden:Europe/Stockholm,Switzerland:Europe/Zurich,Taiwan:Asia/Taipei,Thailand:Asia/Bangkok,Turkey:Europe/Istanbul,Ukraine:Europe/Kiev,United Arab Emirates:Asia/Dubai,UAE:Asia/Dubai,United Kingdom:Europe/London,UK:Europe/London,United States:America/New_York,USA:America/New_York,Uruguay:America/Montevideo,Venezuela:America/Caracas,Vietnam:Asia/Ho_Chi_Minh".split(",").map((s) => s.split(":"));
const COUNTRIES = Object.fromEntries(COUNTRY_DATA.map(([n, z]) => [n.toLowerCase(), z]));
let ZONES = []; try { ZONES = Intl.supportedValuesOf("timeZone"); } catch {}
// "" = local time, null = not recognised
function resolveTz(q) {
  q = q.trim().toLowerCase(); if (!q) return "";
  if (COUNTRIES[q]) return COUNTRIES[q];
  return ZONES.find((z) => z.split("/").pop().replace(/_/g, " ").toLowerCase() === q) || ZONES.find((z) => z.toLowerCase() === q) || null;
}
{
  const cities = [...new Set(ZONES.map((z) => z.split("/").pop().replace(/_/g, " ")))];
  $("#tzlist").innerHTML = [...COUNTRY_DATA.map((x) => x[0]), ...cities].map((n) => `<option value="${n}">`).join("");
}


/* ---------- links, todos, quotes ---------- */
function renderLinks() {
  const n = $("#links"); n.textContent = "";
  for (const l of D.links) { const a = document.createElement("a"); a.textContent = l.n || l.u; a.href = l.u; n.append(a); }
}
function renderTodo() {
  const box = $("#todoBody"); box.textContent = "";
  const ul = document.createElement("ul");
  D.todos.forEach((t, i) => {
    const li = document.createElement("li"); li.className = t.d ? "done" : "";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = t.d;
    cb.onchange = () => { t.d = cb.checked; save(); renderTodo(); };
    const sp = document.createElement("span"); sp.textContent = t.t;
    const x = document.createElement("button"); x.className = "del"; x.textContent = "\u00d7"; x.title = "Delete";
    x.onclick = () => { D.todos.splice(i, 1); save(); renderTodo(); };
    li.append(cb, sp, x); ul.append(li);
  });
  const row = document.createElement("div"); row.className = "add";
  const inp = document.createElement("input"); inp.type = "text"; inp.placeholder = "Add a task";
  const btn = document.createElement("button"); btn.textContent = "+"; btn.title = "Add task";
  const add = () => { if (inp.value.trim()) { D.todos.push({ t: inp.value.trim(), d: false }); save(); renderTodo(); $("#todoBody input[type=text]").focus(); } };
  inp.onkeydown = (e) => { if (e.key === "Enter") add(); };
  btn.onclick = add; row.append(inp, btn); box.append(ul, row);
}
const FALLBACK = {
  inspirational: ["Whether you think you can, or you think you can't, you're right.", "Henry Ford"],
  wisdom: ["The only true wisdom is in knowing you know nothing.", "Socrates"],
  success: ["Well done is better than well said.", "Benjamin Franklin"],
  technology: ["Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke"],
  humorous: ["Always forgive your enemies; nothing annoys them so much.", "Oscar Wilde"],
  love: ["To love and be loved is to feel the sun from both sides.", "David Viscott"],
  life: ["The unexamined life is not worth living.", "Socrates"],
};
function showQuote(q) {
  const n = $("#quote"); n.textContent = q.t;
  const a = document.createElement("div"); a.className = "a"; a.textContent = "\u2014 " + q.a; n.append(a);
}
async function loadQuote() {
  if (!D.show.quote) return;
  const cat = D.quoteCat, src = D.quoteSrc, cached = D.quote && D.quote.cat === cat && D.quote.src === src;
  if (cached) showQuote(D.quote);
  try {
    const opt = { signal: AbortSignal.timeout(4000) };
    let t, au;
    if (src === "zen") { const j = (await (await fetch("https://zenquotes.io/api/random", opt)).json())[0]; t = j.q; au = j.a + " (ZenQuotes)"; }
    else if (src === "ninjas") {
      const r = await fetch(`https://api.api-ninjas.com/v1/quotes?category=${cat}`, { ...opt, headers: { "X-Api-Key": key("API_NINJAS_KEY") || "" } });
      if (!r.ok) throw new Error(r.status);
      const j = (await r.json())[0]; t = j.quote; au = j.author;
    } else { const j = (await (await fetch(`https://api.quotable.io/quotes/random?limit=1&tags=${cat}`, opt)).json())[0]; t = j.content; au = j.author; }
    if (!t) throw new Error("empty");
    D.quote = { t, a: au, cat, src };
  } catch {
    if (!cached) { const f = FALLBACK[cat] || FALLBACK.inspirational; D.quote = { t: f[0], a: f[1], cat, src }; }
  }
  save(true); showQuote(D.quote);
}

/* ---------- layout engine: units = groups and ungrouped widgets ---------- */
const SLOTS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
SLOTS.forEach((p) => { const s = document.createElement("div"); s.className = "slot"; s.dataset.p = p; $("#stage").append(s); });
const ICON = (d) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I_MOVE = ICON('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>');
const I_LOCK = ICON('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>');
const I_OPEN = ICON('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-1.5"/>');
const DEFPOS = () => ({ todo: { x: innerWidth - 300, y: innerHeight - 340 }, notes: { x: 16, y: innerHeight - 300 } });
function mkUnit(cls, id, key, title) {
  const el = document.createElement("div"); el.className = cls; el.id = id; el.dataset.u = key;
  el.innerHTML = `<div class="wbar"><button class="mv" title="Drag to move ${title}">${I_MOVE}</button><button class="lk"></button></div>`;
  return el;
}
function wrapAll() {
  for (const id of ORDER) { const w = mkUnit("w", "w-" + id, "w." + id, WNAMES[id]); w.append($("#" + id)); $("#pool").append(w); }
}
function placeFree(el, x, y) {
  const r = el.getBoundingClientRect();
  el.style.left = Math.max(0, Math.min(x, innerWidth - (r.width || 200))) + "px";
  el.style.top = Math.max(0, Math.min(y, innerHeight - (r.height || 80))) + "px";
}
function styleUnit(el, c, scale) {
  const s = el.style, a = c.bg / 100;
  s.setProperty("--ws", scale); s.fontFamily = c.font ? FONTS[c.font] : ""; s.fontWeight = c.weight; s.color = c.color;
  c.weight ? s.setProperty("--fw", c.weight) : s.removeProperty("--fw");
  s.background = a ? `rgba(11,16,27,${a})` : "transparent";
  s.borderRadius = c.radius + "px";
  s.border = `1px solid rgba(255,255,255,${a ? Math.min(0.14, a * 0.3) : 0})`;
  s.backdropFilter = a ? "blur(18px)" : "none";
}
function setPlace(el, c, id) {
  if (c.free) {
    if (el.parentNode !== document.body) document.body.append(el);
    el.classList.add("free"); const d = DEFPOS()[id] || {};
    placeFree(el, c.x ?? d.x ?? 40, c.y ?? d.y ?? 40);
  } else { el.classList.remove("free"); el.style.left = el.style.top = ""; $(`.slot[data-p="${c.pos}"]`).append(el); }
}
function paintLocks() {
  document.querySelectorAll(".w[data-u],.grp[data-u]").forEach((el) => {
    const c = get(D, el.dataset.u); if (!c) return;
    el.classList.toggle("locked", !!c.lock);
    const b = el.querySelector(":scope > .wbar .lk"); b.innerHTML = c.lock ? I_LOCK : I_OPEN; b.title = c.lock ? "Locked: click to unlock" : "Click to lock position";
  });
}
function applyWidgets() {
  for (const gid in D.groups) if (!$("#g-" + gid)) { const g = mkUnit("grp", "g-" + gid, "groups." + gid, D.groups[gid].name || "group"); $("#pool").append(g); }
  document.querySelectorAll(".grp").forEach((ge) => {
    if (D.groups[ge.id.slice(2)]) return;
    ge.querySelectorAll(":scope > .w").forEach((w) => $("#pool").append(w)); ge.remove();
  });
  for (const gid in D.groups) {
    const g = D.groups[gid], ge = $("#g-" + gid), mem = ORDER.filter((id) => D.w[id].group === gid);
    ge.hidden = !mem.some((id) => D.show[id]);
    styleUnit(ge, g, g.size / 100); setPlace(ge, g, gid);
    mem.forEach((id) => {
      const w = $("#w-" + id), c = D.w[id];
      ge.append(w); w.classList.remove("free"); w.style.left = w.style.top = "";
      styleUnit(w, c, (c.size / 100) * (g.size / 100)); w.hidden = !D.show[id];
    });
  }
  for (const id of ORDER) {
    const c = D.w[id], w = $("#w-" + id);
    if (c.group && D.groups[c.group]) continue;
    c.group = ""; styleUnit(w, c, c.size / 100); setPlace(w, c, id); w.hidden = !D.show[id];
  }
  paintLocks();
}
addEventListener("resize", () => applyWidgets());
document.addEventListener("click", (e) => {
  const b = e.target.closest(".lk"); if (!b) return;
  const c = get(D, b.closest("[data-u]").dataset.u); c.lock = !c.lock; save(); paintLocks();
  document.querySelectorAll("#wStyles [data-k]").forEach(setVal);
});
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".mv"); if (!b) return;
  const el = b.closest("[data-u]"), c = get(D, el.dataset.u); if (c.lock) return; e.preventDefault();
  const r = el.getBoundingClientRect();
  if (!c.free) { c.free = true; document.body.append(el); el.classList.add("free"); el.style.left = r.left + "px"; el.style.top = r.top + "px"; }
  const ox = e.clientX - parseFloat(el.style.left), oy = e.clientY - parseFloat(el.style.top);
  b.setPointerCapture(e.pointerId);
  b.onpointermove = (ev) => placeFree(el, ev.clientX - ox, ev.clientY - oy);
  b.onpointerup = () => { b.onpointermove = b.onpointerup = null; c.x = parseFloat(el.style.left); c.y = parseFloat(el.style.top); save(); paintGrid(); };
});

/* ---------- groups and per-unit style panel ---------- */
const openUnits = new Set();
const unitControls = (key, extra) => `${extra}
  <div class="grid3">${SLOTS.map((p) => `<button data-pos="${p}" title="${p}"></button>`).join("")}</div>
  <label>Size <input type="range" min="50" max="250" data-k="${key}.size"></label>
  <label>Font <select data-k="${key}.font"><option value="">Default</option><option value="serif">Serif</option><option value="sans">Sans</option><option value="mono">Monospace</option><option value="rounded">Rounded</option><option value="elegant">Elegant</option><option value="light">Light</option></select></label>
  <label>Weight <select data-k="${key}.weight"><option value="">Default</option><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="700">Bold</option></select></label>
  <label>Colour <input type="color" data-k="${key}.color"> <a data-reset="1">Reset</a></label>
  <label>Background (0 = transparent) <input type="range" min="0" max="100" data-k="${key}.bg"></label>
  <label>Corner radius <input type="range" min="0" max="48" data-k="${key}.radius"></label>
  <label class="row"><input type="checkbox" data-k="${key}.lock"> Lock position</label>`;
function buildStyles() {
  const host = $("#wStyles"); host.textContent = "";
  const add = (key, title, extra) => {
    const d = document.createElement("details"); d.dataset.u = key; d.open = openUnits.has(key);
    d.ontoggle = () => (d.open ? openUnits.add(key) : openUnits.delete(key));
    d.innerHTML = `<summary>${title}</summary>` + unitControls(key, extra); host.append(d);
  };
  for (const gid in D.groups) {
    if (!ORDER.some((id) => D.w[id].group === gid)) continue;
    add("groups." + gid, "Group: " + (D.groups[gid].name || gid), `<label>Name <input type="text" data-k="groups.${gid}.name"></label><button class="btn alt" data-ungroup="${gid}">Ungroup</button>`);
  }
  for (const id of ORDER) {
    const opts = Object.entries(D.groups).map(([g, v]) => `<option value="${g}">${(v.name || g).replace(/</g, "&lt;")}</option>`).join("");
    add("w." + id, WNAMES[id], `<label>Group <select data-grp="${id}"><option value="">None (ungrouped)</option>${opts}<option value="__new">New group...</option></select></label>`);
    host.querySelector(`[data-grp="${id}"]`).value = D.w[id].group;
  }
  host.querySelectorAll("[data-k]").forEach(setVal); paintGrid();
}
function paintGrid() {
  document.querySelectorAll("#wStyles details").forEach((d) => {
    const c = get(D, d.dataset.u); if (!c) return;
    d.querySelectorAll("[data-pos]").forEach((b) => b.classList.toggle("on", !c.free && c.pos === b.dataset.pos));
  });
}
{
  const host = $("#wStyles");
  host.addEventListener("input", (e) => {
    const el = e.target; if (!el.dataset.k) return;
    put(D, el.dataset.k, val(el)); save(); applyWidgets(); tick();
  });
  host.addEventListener("change", (e) => {
    const el = e.target, id = el.dataset.grp; if (!id) return;
    let g = el.value;
    if (g === "__new") {
      const name = (prompt("Name for the new group:", "Group") || "").trim();
      if (!name) { el.value = D.w[id].group; return; }
      g = "g" + Date.now().toString(36); const c = D.w[id];
      D.groups[g] = U({ name, pos: c.pos, free: c.free, x: c.x, y: c.y });
    }
    D.w[id].group = g; save(); applyWidgets(); buildStyles();
  });
  host.addEventListener("click", (e) => {
    const b = e.target.closest("button,a"); if (!b) return;
    const d = b.closest("details"), key = d && d.dataset.u;
    if (b.dataset.pos) { const c = get(D, key); c.pos = b.dataset.pos; c.free = false; c.x = c.y = null; save(); applyWidgets(); paintGrid(); }
    else if (b.dataset.reset) { put(D, key + ".color", ""); save(); applyWidgets(); d.querySelector('[type=color]').value = "#ffffff"; }
    else if (b.dataset.ungroup) {
      const gid = b.dataset.ungroup, g = D.groups[gid]; let n = 0;
      ORDER.forEach((id) => { if (D.w[id].group === gid) Object.assign(D.w[id], { group: "", pos: g.pos, free: g.free, x: g.free ? g.x : null, y: g.free ? g.y + 70 * n++ : null }); });
      delete D.groups[gid]; save(); applyWidgets(); buildStyles();
    }
  });
}

/* ---------- sync: Google Drive app folder (simple) or GitHub Gist (advanced) ---------- */
const msg = (t) => ($("#syncMsg").textContent = t);
const syncable = () => {
  const c = structuredClone(D);
  for (const k of ["sync", "photo", "quote", "ui", "keys", "vault"]) delete c[k];
  c.bg.image = ""; if (D.keys.syncVault && D.vault) c.vault = D.vault; // only the encrypted vault can ever be synced
  return c;
};
const canSync = () => (D.sync.provider === "google" ? D.sync.googleOn : D.sync.provider === "github" ? !!key("GITHUB_TOKEN") : false);
async function gh(method, path, body) {
  const r = await fetch("https://api.github.com/gists" + path, {
    method, body: body && JSON.stringify(body),
    headers: { Authorization: "Bearer " + key("GITHUB_TOKEN"), Accept: "application/vnd.github+json", "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(r.status === 401 ? "GitHub rejected the token." : r.status === 404 ? "Gist not found for this token." : "GitHub error " + r.status);
  return r.json();
}
const gClientOk = () => { try { return !/YOUR_CLIENT_ID/.test(chrome.runtime.getManifest().oauth2.client_id); } catch { return false; } };
const gToken = (interactive) => new Promise((res, rej) => chrome.identity.getAuthToken({ interactive }, (t) => (chrome.runtime.lastError || !t ? rej(new Error((chrome.runtime.lastError && chrome.runtime.lastError.message) || "Google sign-in was cancelled.")) : res(t))));
async function gfetch(url, opt = {}, retry = true) {
  const t = await gToken(false);
  const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: "Bearer " + t } });
  if (r.status === 401 && retry) { await new Promise((res) => chrome.identity.removeCachedAuthToken({ token: t }, res)); return gfetch(url, opt, false); }
  if (!r.ok) throw new Error("Google Drive error " + r.status);
  return r;
}
const gFileId = async () => ((await (await gfetch("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)&q=" + encodeURIComponent("name='raindrop.json'"))).json()).files[0] || {}).id;
const remote = {
  async read() {
    if (D.sync.provider === "google") { const id = await gFileId(); return id ? (await gfetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).text() : null; }
    if (!D.sync.gist) return null;
    const f = (await gh("GET", "/" + D.sync.gist)).files["raindrop.json"]; if (!f) return null;
    return f.truncated ? (await fetch(f.raw_url)).text() : f.content;
  },
  async write(text) {
    if (D.sync.provider === "google") {
      const id = await gFileId();
      if (id) await gfetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: text });
      else {
        const b = "rdboundary", meta = JSON.stringify({ name: "raindrop.json", parents: ["appDataFolder"] });
        await gfetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${b}` }, body: `--${b}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${b}--` });
      }
    } else {
      const files = { "raindrop.json": { content: text } };
      if (D.sync.gist) await gh("PATCH", "/" + D.sync.gist, { files });
      else { D.sync.gist = (await gh("POST", "", { description: "Raindrop settings", public: false, files })).id; store.set({ rd: D }); syncDrawer(); }
    }
  },
};
async function push() { await remote.write(JSON.stringify(syncable())); msg("Synced at " + new Date().toLocaleTimeString()); }
async function pull(force) {
  const txt = await remote.read(); if (!txt) throw new Error("Nothing saved there yet: use Sync now first.");
  const r = JSON.parse(txt);
  if (!force && (r.updated || 0) <= (D.updated || 0)) return false;
  const keep = { image: D.bg.image, photo: D.photo, sync: D.sync, keys: D.keys, ui: D.ui, vault: D.vault };
  D = merge(structuredClone(DEF), r);
  D.bg.image = keep.image; D.photo = keep.photo; D.sync = keep.sync; D.ui = keep.ui; D.keys = keep.keys;
  D.vault = keep.vault || (keep.keys.syncVault ? r.vault : undefined); if (!D.vault) delete D.vault;
  store.set({ rd: D }); return true;
}
function schedulePush() {
  clearTimeout(pushT);
  if (D.sync && D.sync.auto && canSync()) pushT = setTimeout(() => push().catch((e) => msg(e.message)), 3000);
}
$("#syncPush").onclick = () => {
  if (!canSync()) return msg("Connect an account or add a token first.");
  msg("Syncing..."); D.updated = Date.now(); store.set({ rd: D }); push().catch((e) => msg(e.message));
};
$("#syncPull").onclick = () => {
  if (!canSync()) return msg("Connect an account or add a token first.");
  msg("Pulling..."); pull(true).then(() => location.reload()).catch((e) => msg(e.message));
};
$("#gConnect").onclick = async () => {
  if (!gClientOk()) return msg("Google sign-in is not set up in this build yet. See GOOGLE-SETUP.md.");
  try { await gToken(true); D.sync.googleOn = true; store.set({ rd: D }); syncDrawer(); msg("Connected. Press Sync now."); } catch (e) { msg(e.message); }
};
$("#gDisconnect").onclick = async () => {
  try { const t = await gToken(false); await fetch("https://oauth2.googleapis.com/revoke?token=" + t, { method: "POST" }); await new Promise((r) => chrome.identity.removeCachedAuthToken({ token: t }, r)); } catch {}
  D.sync.googleOn = false; store.set({ rd: D }); syncDrawer(); msg("Disconnected.");
};

/* ---------- settings drawer ---------- */
function syncDrawer() {
  document.querySelectorAll("[data-k]").forEach(setVal);
  document.querySelectorAll("[data-show]").forEach((el) => (el.hidden = !el.dataset.show.split(",").includes(D.bg.type)));
  document.querySelectorAll("[data-by]").forEach((el) => (el.hidden = el.dataset.by !== D.bg.by));
  document.querySelectorAll("input[name=by]").forEach((r) => (r.checked = r.value === D.bg.by));
  $("#pauseBtn").textContent = D.bg.paused ? "\u25B6" : "\u23F8";
  $("#brand").textContent = (D.name || "").trim() || "Raindrop";
  $("[data-sec=clocks]").hidden = !D.show.clock; $("[data-sec=quote]").hidden = !D.show.quote; $("[data-sec=search]").hidden = !D.show.search;
  document.querySelectorAll("[data-prov]").forEach((el) => (el.hidden = !el.dataset.prov.split(" ").includes(D.sync.provider)));
  document.querySelectorAll("[data-eng]").forEach((el) => (el.hidden = el.dataset.eng !== D.engine));
  $("#gConnect").hidden = D.sync.googleOn; $("#gDisconnect").hidden = !D.sync.googleOn;
  $("#gStatus").textContent = D.sync.googleOn ? "Connected to your Google account." : "Not connected.";
  renderClockList();
  $("#linksText").value = D.links.map((l) => `${l.n} | ${l.u}`).join("\n");
}
document.querySelectorAll("[data-k]").forEach((el) =>
  el.addEventListener("input", () => {
    const k = el.dataset.k; put(D, k, val(el));
    if (k.startsWith("sync.")) { store.set({ rd: D }); syncDrawer(); return; }
    if (k.startsWith("keys.")) { save(); return; }
    if (k === "bg.blur" || k === "bg.lum") { save(); applyFx(); return; }
    if (k === "bg.anim" || k === "bg.dur") { save(); clearTimeout(bgDeb); bgDeb = setTimeout(previewBg, 350); return; }
    if (k.startsWith("look.")) { save(); applyLook(); return; }
    save(); syncDrawer(); applyWidgets(); tick(); applySearch();
    if (k.startsWith("bg.")) { clearTimeout(bgDeb); bgDeb = setTimeout(applyBg, 500); }
    if (["quoteCat", "quoteSrc", "show.quote"].includes(k)) loadQuote();
  })
);
document.querySelectorAll("input[name=by]").forEach((r) => (r.onchange = () => { D.bg.by = r.value; save(); syncDrawer(); applyBg(); }));
$("#nextPhoto").onclick = () => { D.photo = null; applyBg(); };
$("#pauseBtn").onclick = () => { D.bg.paused = !D.bg.paused; save(); syncDrawer(); applyBg(); };
$("#linksText").addEventListener("input", (e) => {
  D.links = e.target.value.split("\n").map((s) => s.split("|").map((x) => x.trim())).filter((p) => p[0])
    .map((p) => (p[1] ? { n: p[0], u: /^https?:/.test(p[1]) ? p[1] : "https://" + p[1] } : { n: p[0], u: /^https?:/.test(p[0]) ? p[0] : "https://" + p[0] }));
  save(); renderLinks();
});
$("#file").addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    const s = Math.min(1, 1920 / img.width), c = document.createElement("canvas");
    c.width = img.width * s; c.height = img.height * s;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    D.bg.image = c.toDataURL("image/jpeg", 0.82); save(); applyBg();
  };
  img.src = URL.createObjectURL(f);
});
const toggle = (open) => { $("#drawer").hidden = open === undefined ? !$("#drawer").hidden : !open; };
$("#gear").onclick = () => toggle();
$(".scrim").onclick = () => toggle(false);
addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (e.key === "Escape") { toggle(false); $("#keysModal").hidden = true; document.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel")); }
  else if (!typing && e.key.toLowerCase() === "s") toggle();
});
$("#export").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...D, sync: undefined, photo: undefined, keys: undefined, vault: undefined })], { type: "application/json" }));
  a.download = "raindrop.json"; a.click();
};
$("#import").onclick = () => {
  const i = document.createElement("input"); i.type = "file";
  i.onchange = async () => { try { const keep = { sync: D.sync, keys: D.keys, vault: D.vault }; D = merge(structuredClone(DEF), JSON.parse(await i.files[0].text())); Object.assign(D, keep); if (!keep.vault) delete D.vault; save(); location.reload(); } catch { alert("That file is not a Raindrop export."); } };
  i.click();
};
$("#resetLayout").onclick = () => { if (confirm("Reset widget layout, groups and styles?")) { D.w = structuredClone(DEF.w); D.groups = structuredClone(DEF.groups); save(); location.reload(); } };
$("#reset").onclick = () => { if (confirm("Delete all Raindrop settings?")) store.clear().then(() => location.reload()); };
function applySearch() {
  const s = D.search, f = $("#search");
  f.className = "s-" + s.style + (s.icon ? " has-icon" : ""); $("#q").placeholder = s.placeholder || "";
}
$("#search").onsubmit = (e) => {
  e.preventDefault(); const q = $("#q").value.trim(); if (!q) return;
  let url;
  if (D.engine === "custom") { const t = D.search.custom || ""; if (!/^https?:\/\/\S*%s/.test(t)) return; url = t.replace("%s", encodeURIComponent(q)); }
  else url = (ENGINES[D.engine] || ENGINES.google) + encodeURIComponent(q);
  location.href = url;
};
$("#notesText").addEventListener("input", (e) => { D.notes = e.target.value; save(); });
let roT;
function initNotesBox() {
  const t = $("#notesText");
  if (D.notesBox) { t.style.width = D.notesBox.w + "px"; t.style.height = D.notesBox.h + "px"; }
  new ResizeObserver(() => {
    if (!t.offsetWidth) return; clearTimeout(roT);
    roT = setTimeout(() => { D.notesBox = { w: t.offsetWidth, h: t.offsetHeight }; save(true); }, 400);
  }).observe(t);
}

/* ---------- selection, keys modal, sections ---------- */
document.addEventListener("click", (e) => {
  if (e.target.closest(".wbar,#drawer,.modal")) return;
  const u = e.target.closest(".grp") || e.target.closest(".w");
  document.querySelectorAll(".sel").forEach((x) => x !== u && x.classList.remove("sel"));
  if (u) u.classList.add("sel");
});
function keysUI() {
  const st = !D.vault ? "plain" : LOCKED ? "locked" : "open";
  document.querySelectorAll("#keysModal [data-st]").forEach((e) => (e.hidden = !e.dataset.st.split(" ").includes(st)));
  document.querySelectorAll("[data-key]").forEach((i) => (i.value = KEYS[i.dataset.key] || ""));
  document.querySelectorAll("#keysModal [data-k]").forEach(setVal);
}
function openKeys() { $("#kMsg").textContent = ""; keysUI(); $("#keysModal").hidden = false; }
const kmsg = (t) => ($("#kMsg").textContent = t);
const keysChanged = () => { clearTimeout(bgDeb); bgDeb = setTimeout(() => { applyBg(); loadQuote(); }, 700); };
$("#keysOpen").onclick = openKeys;
$("#keysClose").onclick = $(".mscrim").onclick = () => { $("#keysModal").hidden = true; };
document.querySelectorAll("[data-key]").forEach((i) => i.addEventListener("input", async () => {
  KEYS[i.dataset.key] = i.value.trim();
  if (D.vault) await reseal(); else { D.keys[i.dataset.key] = KEYS[i.dataset.key]; save(); }
  keysChanged();
}));
$("#kProtect").onclick = async () => {
  const p = $("#kPass").value;
  if (p.length < 8) return kmsg("Use at least 8 characters.");
  if (p !== $("#kPass2").value) return kmsg("The two passphrases do not match.");
  kmsg("Encrypting..."); await protect(p); $("#kPass").value = $("#kPass2").value = ""; kmsg("Keys are now encrypted."); keysUI();
};
$("#kUnlock").onclick = async () => {
  try { kmsg("Unlocking..."); await unlock($("#kUnlockPass").value); $("#kUnlockPass").value = ""; kmsg(""); keysUI(); keysChanged(); } catch { kmsg("Wrong passphrase."); }
};
$("#kUnlockPass").addEventListener("keydown", (e) => e.key === "Enter" && $("#kUnlock").click());
$("#kLock").onclick = async () => { await lockNow(); keysUI(); keysChanged(); kmsg("Locked."); };
$("#kRemove").onclick = async () => { if (confirm("Remove the passphrase? Your keys will be stored without encryption.")) { await unprotect(); keysUI(); kmsg("Passphrase removed."); } };
function initSections() { // accordion with smooth open/close; Background open by default
  const all = [...document.querySelectorAll("details.sec")];
  const dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
  const run = (d, open) => {
    const body = d.querySelector(":scope > .sec-body"); if (d._a) d._a.cancel();
    d.classList.toggle("on", open);
    if (open) { d.open = true; const h = body.scrollHeight; d._a = body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: dur, easing: "ease" }); d._a.onfinish = () => (d._a = null); }
    else { const h = body.offsetHeight; d._a = body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: dur, easing: "ease" }); d._a.onfinish = () => { d.open = false; d._a = null; }; }
  };
  all.forEach((d) => {
    const sum = d.querySelector(":scope > summary"), body = document.createElement("div"); body.className = "sec-body";
    while (sum.nextSibling) body.append(sum.nextSibling);
    d.append(body); d.open = d.dataset.sec === "bg"; d.classList.toggle("on", d.open);
    sum.onclick = (e) => { e.preventDefault(); const open = !d.classList.contains("on"); if (open) all.forEach((o) => o !== d && o.classList.contains("on") && run(o, false)); run(d, open); };
  });
}

/* ---------- boot ---------- */
store.get("rd").then(async ({ rd }) => {
  if (rd) {
    D = merge(structuredClone(DEF), rd);
    if (!rd.schema) for (const k of ["todo", "notes"]) if (rd.pos && rd.pos[k]) Object.assign(D.w[k], rd.pos[k], { free: true, lock: !!(rd.lock && rd.lock[k]) });
  }
  D.schema = DEF.schema; delete D.sync.token; delete D.bg.key; delete D.quoteKey; delete D.keys.syncKeys;
  if (rd && rd.sync && rd.sync.gist && !rd.sync.provider) D.sync.provider = "github";
  await initKeys();
  if (!D.sync.gist && key("GITHUB_GIST_ID")) D.sync.gist = key("GITHUB_GIST_ID");
  $("#notesText").value = D.notes; $("#ver").textContent = "Raindrop v" + VER;
  initSections(); initNotesBox(); wrapAll(); syncDrawer(); renderLinks(); renderTodo(); tick(); buildStyles(); applyWidgets();
  applyBg(); applyLook(); applyFx(); applySearch(); loadQuote();
  if (D.sync.auto && canSync()) pull(false).then((c) => c && location.reload()).catch((e) => msg(e.message));
  setInterval(tick, 1000);
  $("#q").focus();
});
