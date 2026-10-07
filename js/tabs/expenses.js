// Expenses tab: spend-by-category chart, the ledger list (with category filter), and a manager for the
// item-name -> category auto-suggestions (db.catMap) — collapsed by default, expand to add/edit/delete.
let mapOpen = false, mapEdit = null, chartOpen = localStorage.getItem("ledger-expchartopen") !== "0";

// Shows the whole year's spending by category, regardless of which month is selected in the filter above.
function expenseChart(){
  const items = db.items.filter(i => i.type==="expense" && i.cat!=="TR/WD" && i.cat!=="CC Bill" &&
    (fy==="all" || i.date.startsWith(fy)));
  const cats = {}; items.forEach(i => cats[i.cat] = (cats[i.cat]||0) + i.amount);
  const entries = Object.entries(cats).sort((a,b) => b[1]-a[1]);
  const top = Math.max(1, ...entries.map(e => e[1]));
  return `<div class="card"><button class="hd" data-exphd="1" aria-expanded="${chartOpen}"><span class="lab">Spending by category · ${fy==="all" ? "all years" : fy}</span><span class="lab">${chartOpen?"Hide ▲":"Show ▼"}</span></button>
  ${chartOpen ? (entries.length ? `<div style="margin-top:8px">${entries.map(([c,v]) =>
    `<div style="margin-top:8px"><div class="row" style="padding:0;border:0"><span>${esc(c)}</span><b>${money(v)}</b></div><div class="bar" style="width:${v/top*100}%"></div></div>`).join("")}</div>`
    : '<div class="empty">No expenses for this period.</div>') : ""}</div>`;
}

function catMapCard(cats){
  const entries = Object.entries(db.catMap || {}).sort((a,b) => a[0].localeCompare(b[0]));
  const ed = mapEdit !== null ? entries.find(([k]) => k === mapEdit) : null;
  const rows = entries.length ? entries.map(([k,v]) => `<div class="row"><div>${esc(k)}<div class="lab">→ ${esc(v)}</div></div><div><button class="x" data-mapedit="${esc(k)}" aria-label="Edit">✎</button><button class="x" data-mapdel="${esc(k)}" aria-label="Delete">✕</button></div></div>`).join("")
    : '<div class="empty">No mappings yet.</div>';
  return `<div class="card"><button class="hd" data-maphd="1" aria-expanded="${mapOpen}"><span class="lab">Item → category auto-fill (${entries.length})</span><span class="lab">${mapOpen?"Hide ▲":"Show ▼"}</span></button>
  ${mapOpen ? `<form class="card" id="catmapf" style="margin-top:10px">
    <input name="item" placeholder="Item name (e.g. Grocery)" value="${ed ? esc(ed[0]) : ""}" required>
    <select name="cat">${cats.map(c => `<option ${ed && ed[1]===c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
    <input name="olditem" type="hidden" value="${ed ? esc(ed[0]) : ""}">
    <button>${ed ? "Save changes" : "Add mapping"}</button>${ed ? '<button type="button" class="ghost" data-mapcancel="1">Cancel</button>' : ""}</form>
  <div class="lab" style="margin:8px 0">As you type an item name while adding an expense, the category below fills in automatically.</div>
  ${rows}` : ""}</div>`;
}

registerTab("expense", "Expenses", () => {
  const cats = ["Home","Transportation","Debt/EMI","Insurance","Medical","Tax","Rent","Recharge","Entertainment","Misc","Investments"];
  return expenseChart() + ledgerView("expense", {t: "Expenses", a: "Amount", cat: [...cats, "TR/WD"]}) + catMapCard(cats);
});

document.addEventListener("click", e => {
  if (e.target.closest("[data-exphd]")) { chartOpen = !chartOpen; localStorage.setItem("ledger-expchartopen", chartOpen ? "1" : "0"); render(); }
  if (e.target.closest("[data-maphd]")) { mapOpen = !mapOpen; render(); }
  if (e.target.dataset.mapcancel) { mapEdit = null; render(); }
  if (e.target.dataset.mapedit) { mapEdit = e.target.dataset.mapedit; mapOpen = true; render(); scrollTo(0, document.body.scrollHeight); }
  if (e.target.dataset.mapdel && confirm("Delete this mapping?")) { delete db.catMap[e.target.dataset.mapdel]; save(); }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "catmapf") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const key = d.item.trim().toLowerCase();
  if (!key) return;
  if (d.olditem && d.olditem !== key) delete db.catMap[d.olditem];
  db.catMap[key] = d.cat;
  mapEdit = null; save();
});
