// Core: state, helpers, tab registry, rendering, shared add/edit/delete, backup.
const KEY = "ledger-data";
const TABS = {};   // each file in js/tabs/ registers itself here, in the order the scripts load
function registerTab(key, title, render, opts = {}) { TABS[key] = {t: title, render, ...opts}; }
let tab = "overview", editId = null, token = null, timer = null;
let db = load();

function load(){ try { const d = JSON.parse(localStorage.getItem(KEY)) || blank(); if (d.cur === "$") d.cur = "₹"; return migrate(d); } catch(e){ return blank(); } }
// Older data had a separate "transfer" type. Self transfers now live in Income (money in) and Expenses (money out);
// buying stocks/mutual funds is an Expense. Safe to run repeatedly.
function migrate(d) {
  if (!d.banks) d.banks = {date: "2026-01-01", bal: {}};
  d.items = (d.items || []).map(i => {
    if (i.type !== "transfer") return i;
    if (i.cat === "Investments") return {...i, type: "expense", amount: -i.amount};
    return i.amount >= 0 ? {...i, type: "income"} : {...i, type: "expense", amount: -i.amount};
  });
  return d;
}
function blank(){ return {updatedAt: 0, cur: "₹", banks: {date: "2026-01-01", bal: {}}, items: []}; }
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const money = n => (n < 0 ? "-" : "") + db.cur + Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2});
const sum = (t, f = i => i.amount) => db.items.filter(i => i.type === t).reduce((s, i) => s + f(i), 0);
const month = () => new Date().toLocaleDateString("sv").slice(0,7);
const acts = i => `<button class="x" data-edit="${i.id}" aria-label="Edit">✎</button><button class="x" data-del="${i.id}" aria-label="Delete">✕</button>`;
const val = v => v === undefined || v === null || v === 0 ? "" : esc(v);

function save(){
  db.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(db));
  render();
  if (token) { clearTimeout(timer); timer = setTimeout(push, 1500); }
}

function render(){
  $("nav").innerHTML = Object.entries(TABS).map(([k,v]) => `<button class="${k===tab?'on':''}" data-t="${k}">${v.t}</button>`).join("");
  $("cur").value = db.cur;
  $("view").innerHTML = TABS[tab] ? TABS[tab].render() : "";
}

document.addEventListener("click", e => {
  if (e.target.dataset.t) { tab = e.target.dataset.t; editId = null; render(); }
  if (e.target.dataset.edit) { editId = e.target.dataset.edit; render(); scrollTo(0, 0); }
  if (e.target.dataset.cancel) { editId = null; render(); }
  if (e.target.dataset.del && confirm("Delete this entry?")) { if (editId === e.target.dataset.del) editId = null; db.items = db.items.filter(i => i.id !== e.target.dataset.del); save(); }
});

// One submit handler for every form; a tab can validate/adjust its entry with opts.beforeSave(entry, formData, oldEntry).
document.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f));
  const old = editId && db.items.find(i => i.id === editId);
  const it = {id: old ? old.id : crypto.randomUUID(), type: f.dataset.t, name: d.name, cat: d.cat || d.kind, amount: +d.amount || 0, extra: +d.extra || 0, date: d.date || ""};
  if (d.source !== undefined) it.source = d.source.trim();
  const hook = TABS[it.type] && TABS[it.type].beforeSave;
  if (hook && hook(it, d, old) === false) return;
  db.items = old ? db.items.map(i => i.id === old.id ? it : i) : [...db.items, it];
  editId = null; save(); if (it.sym) refreshPrices();
});

$("cur").oninput = e => { db.cur = e.target.value || "₹"; save(); };
$("exp").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(db)],{type:"application/json"})); a.download = "ledger-backup.json"; a.click(); };
$("imp").onclick = () => $("file").click();
$("file").onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (Array.isArray(d.items)) { db = migrate(d); save(); } } catch(x){ alert("That file isn't a valid backup."); } };
