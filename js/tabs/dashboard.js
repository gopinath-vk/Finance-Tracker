// Dashboard tab: net worth, bank balances, monthly stats, charts, holdings.
let expMonth = null, holdOpen = false, nwOpen = false, nwPage = 0, trendOpen = localStorage.getItem("ledger-trendopen") !== "0", spentOpen = localStorage.getItem("ledger-spentopen") !== "0";
let bankOpen = localStorage.getItem("ledger-bankopen") !== "0", statsOpen = localStorage.getItem("ledger-statsopen") !== "0";

function balances(){ return balancesAsOf(null); }
// Reconstructs bank balances as they stood at the end of a given YYYY-MM (or now, if cutoff is null).
function balancesAsOf(cutoff){
  const b = db.banks || {date: "2026-01-01", bal: {}}, out = {...b.bal};
  const end = cutoff ? cutoff + "-32" : null; // "-32" sorts after any real day in that month
  db.items.forEach(i => { if (!i.source || (i.date||"") < b.date) return; if (end && i.date > end) return;
    if (!(i.source in out)) out[i.source] = 0;
    out[i.source] += i.type === "expense" ? -i.amount : i.type === "income" ? i.amount : 0; });
  return out;
}
// Last 3 months' invested-to-date for Mutual Fund/Stocks/Overseas/FD holdings, and cash balance — a compact
// table instead of the full holdings list. Investment "value" shown is cumulative amount invested by that
// month's end (not a backfilled market value, since historical prices aren't tracked).
function monthlyInvestTable(){
  const months = [2,1,0].map(k => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-k); return d.toLocaleDateString("sv").slice(0,7); });
  const CATMAP = {"Mutual Funds":"Mutual Fund", "Stocks":"Stocks", "Indian Stocks":"Stocks", "Overseas":"Overseas", "FD":"FD"};
  const inv = db.items.filter(i => i.type==="investment" && CATMAP[i.cat]);
  const byName = {}; inv.forEach(i => (byName[i.name] = byName[i.name] || {cat: CATMAP[i.cat], lots: []}).lots.push(i));
  const rows = Object.entries(byName).map(([name, g]) => ({name, cat: g.cat,
    vals: months.map(mm => g.lots.filter(l => l.date && l.date <= mm+"-31").reduce((s,l) => s+(l.extra||0), 0))}));
  rows.sort((a,b) => a.cat.localeCompare(b.cat) || b.vals[2]-a.vals[2]);
  const cashVals = months.map(mm => Object.values(balancesAsOf(mm)).reduce((a,b) => a+b, 0));
  const hdr = months.map(mm => new Date(mm+"-15").toLocaleDateString(undefined,{month:"short"})).join("</th><th>");
  const tr = (cat, name, vals) => `<tr><td>${esc(cat)}</td><td>${esc(name)}</td>${vals.map(v => `<td style="text-align:right">${money(v)}</td>`).join("")}</tr>`;
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.9rem"><tr style="color:var(--mute)"><th style="text-align:left">Category</th><th style="text-align:left">Item</th><th>${hdr}</th></tr>
  ${rows.map(r => tr(r.cat, r.name, r.vals)).join("")}
  ${tr("Cash", "All banks + cash", cashVals)}</table></div>`;
}
// Keeps db.netWorth up to date for the current month (see SEED_NET_WORTH in core.js for what the older entries mean).
function updateNetWorthHistory(nw){
  const key = month();
  const existing = db.netWorth.find(e => e.date === key);
  if (existing && Math.round(existing.value) === Math.round(nw)) return;
  db.netWorth = db.netWorth.filter(e => e.date !== key).concat([{date: key, value: nw}]).sort((a,b) => a.date.localeCompare(b.date));
  queueMicrotask(save);
}
function netWorthChart(){
  const PAGE = 6, all = db.netWorth, pages = Math.max(1, Math.ceil(all.length / PAGE));
  const page = Math.min(nwPage, pages - 1);
  const start = Math.max(0, all.length - PAGE * (page + 1)), end = all.length - PAGE * page;
  const pts = all.slice(start, end);
  const lbl = pts.map(e => new Date(e.date+"-15").toLocaleDateString(undefined,{month:"short",year:"2-digit"}));
  return `${lineChart([{name:"Net worth", color:"var(--acc)", values: pts.map(e => e.value)}], lbl, 140, v => shortMoney(v))}
    <div class="row" style="padding:6px 0 0;border:0"><button class="ghost" data-nwpage="${page+1}" ${page>=pages-1?'disabled':''}>◀ Earlier</button><span class="lab">${lbl[0]||""} – ${lbl[lbl.length-1]||""}</span><button class="ghost" data-nwpage="${page-1}" ${page<=0?'disabled':''}>Later ▶</button></div>`;
}
function overview(){
  const inv = sum("investment"), cost = sum("investment", i => i.extra||0), debt = sum("liability");
  const real = i => i.cat !== "TR/WD" && i.cat !== "CC Bill";   // self transfers / CC bill payments move money between your accounts; they aren't real income or spending
  const m = i => i.date && i.date.startsWith(month());
  const mi = db.items.filter(i => i.type==="income" && real(i) && m(i)).reduce((s,i)=>s+i.amount,0);
  const me = db.items.filter(i => i.type==="expense" && real(i) && m(i)).reduce((s,i)=>s+i.amount,0);
  const bals = balances(), bt = Object.values(bals).reduce((a,b) => a+b, 0);
  const gain = inv - cost, nw = inv + bt - debt;
  updateNetWorthHistory(nw);
  const bankCards = `<button class="hd" data-bankhd="1" aria-expanded="${bankOpen}" style="margin:4px 0 8px"><span><span class="lab">Bank balances · total</span> <b class="${bt<0?'neg':''}">${money(bt)}</b></span><span class="lab">${bankOpen ? "Hide ▲" : "Show ▼"}</span></button>${bankOpen ? `<div class="lab" style="margin-bottom:6px">Tap a card to set its opening balance</div><div class="grid" style="margin-bottom:14px">${Object.entries(bals).map(([n,v]) => `<div class="card" style="margin:0;cursor:pointer" data-bank="${esc(n)}"><div class="lab">${esc(n)}${n==="CC"?" (credit card)":""}</div><b class="${v<0?'neg':''}">${money(v)}</b></div>`).join("")}</div>` : '<div style="margin-bottom:14px"></div>'}`;
  const m3 = [2,1,0].map(k => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-k); return d.toLocaleDateString("sv").slice(0,7); });
  const sel = m3.includes(expMonth) ? expMonth : m3[2];
  const cats = {};
  db.items.filter(i => i.type==="expense" && real(i) && i.date && i.date.startsWith(sel)).forEach(i => cats[i.cat] = (cats[i.cat]||0) + i.amount);
  const top = Math.max(1, ...Object.values(cats));
  const ms = [...Array(6)].map((_,k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-5+k); return d.toLocaleDateString("sv").slice(0,7); });
  const tot = (t,mm) => db.items.filter(i => i.type===t && real(i) && i.date && i.date.startsWith(mm)).reduce((s,i) => s+i.amount, 0);
  const mlbl = ms.map(x => new Date(x+"-15").toLocaleDateString(undefined,{month:"short"}));
  const trend = `<div class="card"><button class="hd" data-trendhd="1" aria-expanded="${trendOpen}"><span class="lab">Last 6 months: income (green) and expenses (red)</span><span class="lab">${trendOpen?"Hide ▲":"Show ▼"}</span></button>${trendOpen ? lineChart([
    {name:"Income", color:"var(--pos)", values: ms.map(x => tot("income",x))},
    {name:"Expenses", color:"var(--neg)", values: ms.map(x => tot("expense",x))}
  ], mlbl, 130, v => shortMoney(v)) : ""}</div>`;
  const holdCard = `<div class="card"><button class="hd" data-hold="1" aria-expanded="${holdOpen}"><span><span class="lab">Investments</span> <b>${money(sum("investment"))}</b></span><span class="lab">${holdOpen ? "Hide ▲" : "Show ▼"}</span></button>${holdOpen ? `<div class="lab" style="margin:8px 0">Amount invested by month-end, last 3 months</div>${monthlyInvestTable()}` : ""}</div>`;
  return `<div class="card"><button class="hd" data-nwcard="1" aria-expanded="${nwOpen}"><span class="lab">Net worth (investments + bank balances - liabilities)</span><span class="lab">${nwOpen?"Hide chart ▲":"Show trend ▼"}</span></button>
    <div class="big ${nw<0?'neg':''}">${money(nw)}</div>${nwOpen ? netWorthChart() : ""}</div>
  ${bankCards}<button class="hd" data-statshd="1" aria-expanded="${statsOpen}" style="margin:4px 0 8px"><span class="lab">This month's summary</span><span class="lab">${statsOpen?"Hide ▲":"Show ▼"}</span></button>
  ${statsOpen ? `<div class="grid" style="margin-bottom:14px">
    <div class="card"><div class="lab">Income this month</div><b class="pos">${money(mi)}</b></div>
    <div class="card"><div class="lab">Expenses this month</div><b class="neg">${money(me)}</b></div>
    <div class="card"><div class="lab">Saved this month</div><b>${money(mi-me)}</b></div>
    <div class="card"><div class="lab">Investment gain</div><b class="${gain<0?'neg':'pos'}">${money(gain)}</b></div>
    <div class="card"><div class="lab">Total invested value</div><b>${money(inv)}</b></div>
    <div class="card"><div class="lab">Total liabilities</div><b class="neg">${money(debt)}</b></div>
  </div>` : '<div style="margin-bottom:14px"></div>'}
  ${trend}${holdCard}<div class="card"><button class="hd" data-spenthd="1" aria-expanded="${spentOpen}"><span class="lab">Where the money went</span><span class="lab">${spentOpen?"Hide ▲":"Show ▼"}</span></button>
  ${spentOpen ? `<div class="mt">${m3.map(x => `<button class="${x===sel?"":"ghost"}" data-em="${x}">${new Date(x+"-15").toLocaleDateString(undefined,{month:"short",year:"2-digit"})}</button>`).join("")}</div>
  <div class="row" style="padding:0 0 4px;border:0"><span class="lab">Total spent</span><b class="neg">${money(Object.values(cats).reduce((a,b)=>a+b,0))}</b></div>
  ${Object.keys(cats).length ? Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,v]) =>
    `<div style="margin-top:8px"><div class="row" style="padding:0;border:0"><span>${esc(c)}</span><b>${money(v)}</b></div><div class="bar" style="width:${v/top*100}%"></div></div>`).join("")
    : '<div class="empty">No expenses logged for this month.</div>'}` : ""}</div>`;
}


registerTab("overview", "Dashboard", overview);

document.addEventListener("click", e => {
  const bk = e.target.closest("[data-bank]");
  if (bk) { const n = bk.dataset.bank, cur = (db.banks.bal[n] || 0), v = prompt(`Opening balance of ${n} on ${db.banks.date} (the app adds later entries to it):`, cur);
    if (v !== null && v.trim() !== "" && !isNaN(+v)) { db.banks.bal[n] = +v; save(); } }
  if (e.target.closest("[data-bankhd]")) { bankOpen = !bankOpen; localStorage.setItem("ledger-bankopen", bankOpen ? "1" : "0"); render(); }
  if (e.target.closest("[data-statshd]")) { statsOpen = !statsOpen; localStorage.setItem("ledger-statsopen", statsOpen ? "1" : "0"); render(); }
  if (e.target.closest("[data-nwcard]")) { nwOpen = !nwOpen; render(); }
  const nwp = e.target.closest("[data-nwpage]");
  if (nwp) { nwPage = +nwp.dataset.nwpage; render(); }
  const em = e.target.closest("[data-em]"), hd = e.target.closest("[data-hold]");
  if (em) { expMonth = em.dataset.em; render(); }
  if (hd) { holdOpen = !holdOpen; render(); }
  if (e.target.closest("[data-trendhd]")) { trendOpen = !trendOpen; localStorage.setItem("ledger-trendopen", trendOpen ? "1" : "0"); render(); }
  if (e.target.closest("[data-spenthd]")) { spentOpen = !spentOpen; localStorage.setItem("ledger-spentopen", spentOpen ? "1" : "0"); render(); }
});
