// Expenses tab: spend-by-category chart (with a budget comparison when one's set), the ledger list (with
// category filter), a manager for the item-name -> category auto-suggestions, and a month-by-month budget
// editor at the bottom — all collapsed by default, expand to use. db.budgets is keyed "YYYY-MM" -> {category: amount};
// a year's total budget for a category is just the sum of whichever months in that year have been set.
let mapOpen = false, mapEdit = null, chartOpen = localStorage.getItem("ledger-expchartopen") !== "0";
let budgetOpen = false, budgetEdit = null, budgetYM = null;

function yearBudgetTotals(yr){
  const out = {};
  Object.keys(db.budgets).filter(k => k.startsWith(yr+"-")).forEach(k => Object.entries(db.budgets[k]).forEach(([c,v]) => out[c] = (out[c]||0) + v));
  return out;
}

// Shows spending by category for the selected year/month. If one month is picked, compares against that
// month's budget; if the whole year is shown, compares against the sum of that year's monthly budgets.
function expenseChart(cats){
  const items = db.items.filter(i => i.type==="expense" && i.cat!=="TR/WD" && i.cat!=="CC Bill" &&
    (fy==="all" || i.date.startsWith(fy)) && (fm==="all" || i.date.slice(5,7)===fm));
  const spend = {}; items.forEach(i => spend[i.cat] = (spend[i.cat]||0) + i.amount);
  const showBudget = fy!=="all";
  const budget = showBudget ? (fm==="all" ? yearBudgetTotals(fy) : (db.budgets[fy+"-"+fm] || {})) : {};
  const monthsSet = fm==="all" ? Object.keys(db.budgets).filter(k => k.startsWith(fy+"-")).length : (db.budgets[fy+"-"+fm] ? 1 : 0);
  const entries = [...new Set([...Object.keys(spend), ...Object.keys(budget)])].map(c => [c, spend[c]||0]).sort((a,b) => b[1]-a[1]);
  const top = Math.max(1, ...entries.map(e => e[1]), ...Object.values(budget));
  const period = fy==="all" ? "all years" : fy + (fm==="all" ? "" : "-"+fm);
  const rows = entries.map(([c,v]) => {
    const b = budget[c], tick = b ? `<div style="position:absolute;top:0;bottom:0;left:${Math.min(b/top*100,100)}%;width:2px;background:var(--ink)"></div>` : "";
    const over = b ? v - b : null;
    const budgetNote = b ? ` <span class="lab">· budget ${money(b)} <span class="${over>0?'neg':'pos'}">(${over>0?"over":"under"} ${money(Math.abs(over))})</span></span>` : "";
    return `<div style="margin-top:8px"><div class="row" style="padding:0;border:0"><span>${esc(c)}</span><b>${money(v)}</b></div><div style="position:relative"><div class="bar" style="width:${v/top*100}%"></div>${tick}</div>${budgetNote}</div>`;
  }).join("");
  const hint = showBudget ? (Object.keys(budget).length ? (fm==="all" ? `<div class="lab" style="margin-top:4px">The | mark shows your budget for ${fy}, totalled from ${monthsSet} month${monthsSet===1?"":"s"} you've set.</div>` : `<div class="lab" style="margin-top:4px">The | mark shows your ${MN[+fm-1]} ${fy} budget.</div>`) : "") : `<div class="lab" style="margin-top:4px">Pick a year to compare against your budget.</div>`;
  return `<div class="card"><button class="hd" data-exphd="1" aria-expanded="${chartOpen}"><span class="lab">Spending by category · ${period}</span><span class="lab">${chartOpen?"Hide ▲":"Show ▼"}</span></button>
  ${chartOpen ? (entries.length ? `${hint}<div style="margin-top:4px">${rows}</div>` : '<div class="empty">No expenses for this period.</div>') : ""}</div>`;
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

// Month-by-month budget editor. Each month starts with no budgets — nothing carries forward automatically.
function budgetCard(cats){
  const setMonths = Object.keys(db.budgets).filter(k => Object.keys(db.budgets[k]).length);
  const years = [...new Set([...setMonths.map(k => k.slice(0,4)), String(new Date().getFullYear())])].sort().reverse();
  const ym = budgetYM || (fy!=="all" && fm!=="all" ? fy+"-"+fm : years[0]+"-"+String(new Date().getMonth()+1).padStart(2,"0"));
  const [yr, mo] = ym.split("-");
  const monthBudget = db.budgets[ym] || {};
  const ed = budgetEdit;
  const rows = Object.entries(monthBudget).sort((a,b) => a[0].localeCompare(b[0])).map(([c,amt]) =>
    `<div class="row"><span>${esc(c)}</span><div><b>${money(amt)}</b> <button class="x" data-budgetedit="${esc(c)}" aria-label="Edit">✎</button><button class="x" data-budgetdel="${esc(c)}" aria-label="Delete">✕</button></div></div>`).join("")
    || `<div class="empty">No budgets set for ${MN[+mo-1]} ${yr} yet.</div>`;
  const total = Object.values(monthBudget).reduce((a,b) => a+b, 0);
  const yrTotal = Object.values(yearBudgetTotals(yr)).reduce((a,b) => a+b, 0);
  const nextYm = mo==="12" ? (+yr+1)+"-01" : yr+"-"+String(+mo+1).padStart(2,"0");
  const [nyr, nmo] = nextYm.split("-");
  return `<div class="card"><button class="hd" data-budgethd="1" aria-expanded="${budgetOpen}"><span class="lab">Budgets</span><span class="lab">${budgetOpen?"Hide ▲":"Show ▼"}</span></button>
  ${budgetOpen ? `<div class="mt" style="margin-top:8px"><select id="byear">${years.map(y => `<option ${y===yr?"selected":""}>${y}</option>`).join("")}</select>
    <select id="bmonth">${MN.map((n,k) => { const v = String(k+1).padStart(2,"0"); return `<option value="${v}" ${v===mo?"selected":""}>${n}</option>`; }).join("")}</select></div>
  <div class="lab" style="margin:8px 0">Set each month's budget separately — ${MN[+mo-1]} ${yr} won't carry forward to next month automatically.</div>
  <form class="card" id="budgetf">
    <input name="ymfixed" type="hidden" value="${esc(ym)}">
    <select name="cat" ${ed?'disabled':''}>${cats.map(c => `<option ${(ed||cats[0])===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
    ${ed ? `<input name="catfixed" type="hidden" value="${esc(ed)}">` : ""}
    <input name="amount" type="number" step="any" placeholder="Budget amount" value="${ed ? val(monthBudget[ed]) : ""}" required>
    <button>${ed ? "Save budget" : "Set budget"}</button>${ed ? '<button type="button" class="ghost" data-budgetcancel="1">Cancel</button>' : ""}</form>
  <div class="row" style="padding:0;border:0"><span class="lab">${MN[+mo-1]} ${esc(yr)} total</span><b>${money(total)}</b></div>
  ${rows}
  <div class="lab" style="margin-top:10px">${esc(yr)} total so far (sum of months set): ${money(yrTotal)}</div>
  ${Object.keys(monthBudget).length ? `<button class="ghost" style="margin-top:10px" data-copynext="${nextYm}">Copy to ${MN[+nmo-1]} ${nyr} →</button>` : ""}
  <div class="lab" style="margin:12px 0 4px">Or copy any month's budget to any other month</div>
  <form class="card" id="copyf">
    <select name="fromyear">${years.map(y => `<option ${y===yr?"selected":""}>${y}</option>`).join("")}</select>
    <select name="frommonth">${MN.map((n,k) => { const v = String(k+1).padStart(2,"0"); return `<option value="${v}" ${v===mo?"selected":""}>${n}</option>`; }).join("")}</select>
    <span class="lab" style="align-self:center">→</span>
    <select name="toyear">${[...years, String(+years[0]+1)].map(y => `<option ${y===yr?"selected":""}>${y}</option>`).join("")}</select>
    <select name="tomonth">${MN.map((n,k) => { const v = String(k+1).padStart(2,"0"); return `<option value="${v}">${n}</option>`; }).join("")}</select>
    <button>Copy budgets</button>
  </form>` : ""}</div>`;
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
    if (db.budgets[budgetYM]) { delete db.budgets[budgetYM][e.target.dataset.budgetdel]; save(); }
  }
  if (e.target.dataset.copynext) { copyBudget(budgetYM, e.target.dataset.copynext); }
});
document.addEventListener("change", e => {
  if (e.target.id === "byear" || e.target.id === "bmonth") {
    const y = (e.target.id === "byear" ? e.target.value : $("byear").value);
    const m = (e.target.id === "bmonth" ? e.target.value : $("bmonth").value);
    budgetYM = y + "-" + m; budgetEdit = null; render();
  }
});
// Copies one month's budget onto another, overwriting any categories the two months share; categories only
// set on the target month are left alone. Confirms first if the target already has something set.
function copyBudget(fromYm, toYm){
  const from = db.budgets[fromYm];
  if (!from || !Object.keys(from).length) return;
  const to = db.budgets[toYm] || {};
  if (Object.keys(to).length && !confirm(`${toYm} already has budgets set. Overwrite the matching categories with ${fromYm}'s?`)) return;
  db.budgets[toYm] = {...to, ...from};
  budgetYM = toYm; budgetEdit = null; save();
}
document.addEventListener("submit", e => {
  if (e.target.id === "copyf") {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    copyBudget(d.fromyear+"-"+d.frommonth, d.toyear+"-"+d.tomonth);
  }
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
    db.budgets[d.ymfixed] = db.budgets[d.ymfixed] || {};
    db.budgets[d.ymfixed][d.catfixed || d.cat] = amt;
    budgetEdit = null; save();
  }
});
