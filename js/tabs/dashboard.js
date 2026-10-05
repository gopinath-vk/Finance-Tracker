// Dashboard tab: net worth, bank balances, monthly stats, charts, holdings.
let expMonth = null, holdOpen = false, bankOpen = localStorage.getItem("ledger-bankopen") !== "0";

function balances(){
  const b = db.banks || {date: "2026-01-01", bal: {}}, out = {...b.bal};
  db.items.forEach(i => { if (!i.source || (i.date||"") < b.date) return; if (!(i.source in out)) out[i.source] = 0;
    out[i.source] += i.type === "expense" ? -i.amount : (i.type === "income" || i.type === "transfer") ? i.amount : 0; });
  return out;
}
function overview(){
  const inv = sum("investment"), cost = sum("investment", i => i.extra||0), debt = sum("liability");
  const m = i => i.date && i.date.startsWith(month());
  const mi = db.items.filter(i => i.type==="income" && m(i)).reduce((s,i)=>s+i.amount,0);
  const me = db.items.filter(i => i.type==="expense" && m(i)).reduce((s,i)=>s+i.amount,0);
  const bals = balances(), bt = Object.values(bals).reduce((a,b) => a+b, 0);
  const gain = inv - cost, nw = inv + bt - debt;
  const bankCards = `<button class="hd" data-bankhd="1" aria-expanded="${bankOpen}" style="margin:4px 0 8px"><span><span class="lab">Bank balances · total</span> <b class="${bt<0?'neg':''}">${money(bt)}</b></span><span class="lab">${bankOpen ? "Hide ▲" : "Show ▼"}</span></button>${bankOpen ? `<div class="lab" style="margin-bottom:6px">Tap a card to set its opening balance</div><div class="grid" style="margin-bottom:14px">${Object.entries(bals).map(([n,v]) => `<div class="card" style="margin:0;cursor:pointer" data-bank="${esc(n)}"><div class="lab">${esc(n)}${n==="CC"?" (credit card)":""}</div><b class="${v<0?'neg':''}">${money(v)}</b></div>`).join("")}</div>` : '<div style="margin-bottom:14px"></div>'}`;
  const m3 = [2,1,0].map(k => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-k); return d.toLocaleDateString("sv").slice(0,7); });
  const sel = m3.includes(expMonth) ? expMonth : m3[2];
  const cats = {};
  db.items.filter(i => i.type==="expense" && i.date && i.date.startsWith(sel)).forEach(i => cats[i.cat] = (cats[i.cat]||0) + i.amount);
  const top = Math.max(1, ...Object.values(cats));
  const ms = [...Array(6)].map((_,k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-5+k); return d.toLocaleDateString("sv").slice(0,7); });
  const tot = (t,mm) => db.items.filter(i => i.type===t && i.date && i.date.startsWith(mm)).reduce((s,i) => s+i.amount, 0);
  const tm = Math.max(1, ...ms.flatMap(x => [tot("income",x), tot("expense",x)]));
  const trend = `<div class="card"><div class="lab">Last 6 months: income (green) and expenses (red)</div><div class="tr">${ms.map(x => `<div class="c"><div class="bs"><i style="height:${tot("income",x)/tm*100}%;background:var(--pos)"></i><i style="height:${tot("expense",x)/tm*100}%;background:var(--neg)"></i></div><span class="lab">${new Date(x+"-15").toLocaleDateString(undefined,{month:"short"})}</span></div>`).join("")}</div></div>`;
  const upd = Math.max(0, ...db.items.map(i => i.priceAt||0));
  const hold = db.items.filter(i => i.type==="investment").sort((a,b) => b.amount-a.amount).map(i => { const g = i.amount-(i.extra||0); return `<div class="row"><span>${esc(i.name)}</span><span><b>${money(i.amount)}</b> <span class="${g<0?'neg':'pos'}">${i.extra ? (g/i.extra*100).toFixed(1)+"%" : ""}</span></span></div>`; }).join("");
  const holdCard = `<div class="card"><button class="hd" data-hold="1" aria-expanded="${holdOpen}"><span><span class="lab">Investments</span> <b>${money(sum("investment"))}</b></span><span class="lab">${holdOpen ? "Hide ▲" : "Show ▼"}</span></button>${holdOpen ? `<div class="lab" style="margin-top:8px">${upd ? "Prices updated " + new Date(upd).toLocaleString([], {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : ""}</div>${hold || '<div class="empty">No investments yet. Add one in Investments.</div>'}<button class="ghost" id="rp">Refresh prices</button> <span class="lab" id="pst"></span>` : ""}</div>`;
  return `<div class="card"><div class="lab">Net worth (investments + bank balances - liabilities)</div>
    <div class="big ${nw<0?'neg':''}">${money(nw)}</div></div>
  ${bankCards}<div class="grid">
    <div class="card"><div class="lab">Income this month</div><b class="pos">${money(mi)}</b></div>
    <div class="card"><div class="lab">Expenses this month</div><b class="neg">${money(me)}</b></div>
    <div class="card"><div class="lab">Saved this month</div><b>${money(mi-me)}</b></div>
    <div class="card"><div class="lab">Investment gain</div><b class="${gain<0?'neg':'pos'}">${money(gain)}</b></div>
    <div class="card"><div class="lab">Total invested value</div><b>${money(inv)}</b></div>
    <div class="card"><div class="lab">Total liabilities</div><b class="neg">${money(debt)}</b></div>
  </div>
  ${trend}${holdCard}<div class="card"><div class="lab">Where the money went</div>
  <div class="mt">${m3.map(x => `<button class="${x===sel?"":"ghost"}" data-em="${x}">${new Date(x+"-15").toLocaleDateString(undefined,{month:"short",year:"2-digit"})}</button>`).join("")}</div>
  <div class="row" style="padding:0 0 4px;border:0"><span class="lab">Total spent</span><b class="neg">${money(Object.values(cats).reduce((a,b)=>a+b,0))}</b></div>
  ${Object.keys(cats).length ? Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,v]) =>
    `<div style="margin-top:8px"><div class="row" style="padding:0;border:0"><span>${esc(c)}</span><b>${money(v)}</b></div><div class="bar" style="width:${v/top*100}%"></div></div>`).join("")
    : '<div class="empty">No expenses logged for this month.</div>'}</div>`;
}


registerTab("overview", "Dashboard", overview);

document.addEventListener("click", e => {
  const bk = e.target.closest("[data-bank]");
  if (bk) { const n = bk.dataset.bank, cur = (db.banks.bal[n] || 0), v = prompt(`Opening balance of ${n} on ${db.banks.date} (the app adds later entries to it):`, cur);
    if (v !== null && v.trim() !== "" && !isNaN(+v)) { db.banks.bal[n] = +v; save(); } }
  if (e.target.closest("[data-bankhd]")) { bankOpen = !bankOpen; localStorage.setItem("ledger-bankopen", bankOpen ? "1" : "0"); render(); }
  const em = e.target.closest("[data-em]"), hd = e.target.closest("[data-hold]");
  if (em) { expMonth = em.dataset.em; render(); }
  if (hd) { holdOpen = !holdOpen; render(); }
});
