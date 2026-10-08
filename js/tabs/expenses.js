// Expenses tab: spend-by-category chart (with a budget comparison when one's set), the ledger list (with
// category filter), a manager for the item-name -> category auto-suggestions, and a per-year budget editor
// at the bottom — all collapsed by default, expand to use.
let mapOpen = false, mapEdit = null, chartOpen = localStorage.getItem("ledger-expchartopen") !== "0";
let budgetOpen = false, budgetEdit = null, budgetYear = null;

// Shows spending by category for the selected year, and month if one is picked in the filter above.
// When a specific year is selected with no month narrowing it, overlays that year's budget per category.
function expenseChart(cats){
  const items = db.items.filter(i => i.type==="expense" && i.cat!=="TR/WD" && i.cat!=="CC Bill" &&
    (fy==="all" || i.date.startsWith(fy)) && (fm==="all" || i.date.slice(5,7)===fm));
  const spend = {}; items.forEach(i => spend[i.cat] = (spend[i.cat]||0) + i.amount);
  const showBudget = fy!=="all" && fm==="all";
  const yearBudget = showBudget ? (db.budgets[fy] || {}) : {};
  const entries = [...new Set([...Object.keys(spend), ...(showBudget ? Object.keys(yearBudget) : [])])]
    .map(c => [c, spend[c]||0]).sort((a,b) => b[1]-a[1]);
  const top = Math.max(1, ...entries.map(e => e[1]), ...(showBudget ? Object.values(yearBudget) : []));
  const period = fy==="all" ? "all years" : fy + (fm==="all" ? "" : "-"+fm);
  const rows = entries.map(([c,v]) => {
    const b = yearBudget[c], tick = (showBudget && b) ? `<div style="position:absolute;top:0;bottom:0;left:${Math.min(b/top*100,100)}%;width:2px;background:var(--ink)"></div>` : "";
    const over = (showBudget && b) ? v - b : null;
    const budgetNote = (showBudget && b) ? ` <span class="lab">· budget ${money(b)} <span class="${over>0?'neg':'pos'}">(${over>0?"over":"under"} ${money(Math.abs(over))})</span></span>` : "";
    return `<div style="margin-top:8px"><div class="row" style="padding:0;border:0"><span>${esc(c)}</span><b>${money(v)}</b></div><div style="position:relative"><div class="bar" style="width:${v/top*100}%"></div>${tick}</div>${budgetNote}</div>`;
  }).join("");
  return `<div class="card"><button class="hd" data-exphd="1" aria-expanded="${chartOpen}"><span class="lab">Spending by category · ${period}</span><span class="lab">${chartOpen?"Hide ▲":"Show ▼"}</span></button>
  ${chartOpen ? (entries.length ? `${showBudget ? '<div class="lab" style="margin-top:4px">The | mark shows your budget for that category.</div>' : (fy!=="all" ? '<div class="lab" style="margin-top:4px">Pick "All months" to compare against your budget for '+fy+'.</div>' : "")}<div style="margin-top:4px">${rows}</div>`
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

// Per-year budget editor. Each year starts with no budgets — a new year never inherits the last one's figures.
function budgetCard(cats){
  const years = [...new Set([...Object.keys(db.budgets), String(new Date().getFullYear())])].sort().reverse();
  const yr = budgetYear || years[0];
  const yrBudget = db.budgets[yr] || {};
  const ed = budgetEdit;
  const rows = Object.entries(yrBudget).sort((a,b) => a[0].localeCompare(b[0])).map(([c,amt]) =>
    `<div class="row"><span>${esc(c)}</span><div><b>${money(amt)}</b> <button class="x" data-budgetedit="${esc(c)}" aria-label="Edit">✎</button><button class="x" data-budgetdel="${esc(c)}" aria-label="Delete">✕</button></div></div>`).join("")
    || '<div class="empty">No budgets set for '+esc(yr)+' yet.</div>';
  const total = Object.values(yrBudget).reduce((a,b) => a+b, 0);
  return `<div class="card"><button class="hd" data-budgethd="1" aria-expanded="${budgetOpen}"><span class="lab">Budgets</span><span class="lab">${budgetOpen?"Hide ▲":"Show ▼"}</span></button>
  ${budgetOpen ? `<div class="mt" style="margin-top:8px"><select id="byear">${years.map(y => `<option ${y===yr?"selected":""}>${y}</option>`).join("")}</select></div>
  <div class="lab" style="margin:8px 0">Each year's budgets are set separately — ${yr} won't carry over to the next year automatically.</div>
  <form class="card" id="budgetf">
    <input name="yearfixed" type="hidden" value="${esc(yr)}">
    <select name="cat" ${ed?'disabled':''}>${cats.map(c => `<option ${(ed||cats[0])===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
    ${ed ? `<input name="catfixed" type="hidden" value="${esc(ed)}">` : ""}
    <input name="amount" type="number" step="any" placeholder="Budget amount" value="${ed ? val(yrBudget[ed]) : ""}" required>
    <button>${ed ? "Save budget" : "Set budget"}</button>${ed ? '<button type="button" class="ghost" data-budgetcancel="1">Cancel</button>' : ""}</form>
  <div class="row" style="padding:0;border:0"><span class="lab">Total budget for ${esc(yr)}</span><b>${money(total)}</b></div>
  ${rows}` : ""}</div>`;
}

registerTab("expense", "Expenses", () => {
  const cats = ["Home","Transportation","Debt/EMI","Insurance","Medical","Tax","Rent","Recharge","Entertainment","Misc","Investments"];
  return expenseChart(cats) + ledgerView("expense", {t: "Expenses", a: "Amount", cat: [...cats, "TR/WD"]}) + catMapCard(cats) + budgetCard(cats);
});

document.addEventListener("click", e => {
  if (e.target.closest("[data-exphd]")) { chartOpen = !chartOpen; localStorage.setItem("ledger-expchartopen", chartOpen ? "1" : "0"); render(); }
  if (e.target.closest("[data-maphd]")) { mapOpen = !mapOpen; render(); }
  if (e.target.dataset.mapcancel) { mapEdit = null; render(); }
  if (e.target.dataset.mapedit) { mapEdit = e.target.dataset.mapedit; mapOpen = true; render(); scrollTo(0, document.body.scrollHeight); }
  if (e.target.dataset.mapdel && confirm("Delete this mapping?")) { delete db.catMap[e.target.dataset.mapdel]; save(); }
  if (e.target.closest("[data-budgethd]")) { budgetOpen = !budgetOpen; render(); }
  if (e.target.dataset.budgetcancel) { budgetEdit = null; render(); }
  if (e.target.dataset.budgetedit) { budgetEdit = e.target.dataset.budgetedit; render(); }
  if (e.target.dataset.budgetdel && confirm("Delete this budget?")) {
    const yr = budgetYear || String(new Date().getFullYear());
    if (db.budgets[yr]) { delete db.budgets[yr][e.target.dataset.budgetdel]; save(); }
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "byear") { budgetYear = e.target.value; budgetEdit = null; render(); }
});
document.addEventListener("submit", e => {
  if (e.target.id === "catmapf") {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const key = d.item.trim().toLowerCase();
    if (!key) return;
    if (d.olditem && d.olditem !== key) delete db.catMap[d.olditem];
    db.catMap[key] = d.cat;
    mapEdit = null; save();
  }
  if (e.target.id === "budgetf") {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const amt = +d.amount; if (!amt) return;
    db.budgets[d.yearfixed] = db.budgets[d.yearfixed] || {};
    db.budgets[d.yearfixed][d.catfixed || d.cat] = amt;
    budgetEdit = null; save();
  }
});
