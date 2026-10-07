// Allocation tab: mirrors the Type / Category / Item layout from the person's own Portfolio workbook
// (Allocation sheet). Targets are % of total asset value (not net worth) — with a loan this large, dividing
// by net worth would swing wildly or go negative, so this uses the standard "% of assets" convention instead.
// "Today" for each item is worked out live from your data; edit the target % for any item with ✎.
const ALLOC_ITEMS = [
  {cat:"Equity", item:"Indian Stocks", match: i => i.type==="investment" && (i.cat==="Stocks" || i.cat==="Indian Stocks")},
  {cat:"Equity", item:"Indian MF", match: i => i.type==="investment" && i.cat==="Mutual Funds"},
  {cat:"Equity", item:"Overseas MF/Stocks", match: i => i.type==="investment" && i.cat==="Overseas"},
  {cat:"Debt", item:"Indian Debt MF", match: () => false},
  {cat:"Debt", item:"FD", match: i => i.type==="investment" && i.cat==="FD"},
  {cat:"Debt", item:"Cash", special: "cash"},
  {cat:"Gold", item:"Coin", match: i => i.type==="investment" && i.cat==="Gold" && !i.sym},
  {cat:"Gold", item:"Indian ETF", match: i => i.type==="investment" && i.cat==="Gold" && i.sym},
  {cat:"Crypto", item:"Crypto", match: i => i.type==="investment" && i.cat==="Crypto"},
  {cat:"Real Estate", item:"REITs/Physical", match: i => i.type==="investment" && i.cat==="Real Estate"}
];

function allocRows(){
  const inv = db.items.filter(i => i.type==="investment");
  const cashTotal = Object.values(balances()).reduce((a,b) => a+b, 0);
  const today = {}; ALLOC_ITEMS.forEach(a => today[a.item] = a.special==="cash" ? cashTotal : inv.filter(a.match).reduce((s,i) => s+i.amount, 0));
  const total = Object.values(today).reduce((a,b) => a+b, 0);
  const byCat = {}; ALLOC_ITEMS.forEach(a => (byCat[a.cat] = byCat[a.cat] || []).push(a));

  const rows = Object.entries(byCat).map(([cat, items]) => {
    const body = items.map(a => {
      const t = today[a.item], ideal = (db.idealAlloc||{})[a.item] || 0, cur = total ? t/total*100 : 0, off = cur - ideal;
      return `<div class="card" style="margin-bottom:8px">
        <div class="row" style="padding:0;border:0"><b>${esc(a.item)}</b><span>${money(t)}</span></div>
        <div class="bs" style="height:14px;margin-top:6px"><div style="flex:${Math.max(ideal,0.3)};background:var(--line);border-radius:3px;position:relative"><div style="position:absolute;inset:0;width:${total?Math.min(cur/Math.max(ideal,0.0001)*100,100):0}%;background:${Math.abs(off)<=3?'var(--pos)':'var(--neg)'};border-radius:3px"></div></div></div>
        <div class="lab" style="margin-top:4px">Target ${ideal.toFixed(0)}% · Actual ${cur.toFixed(1)}% <span class="${Math.abs(off)<=3?'':'neg'}">(${off>0?"+":""}${off.toFixed(1)} pts, ${money(t-ideal/100*total)})</span>
        <button class="x" data-allocedit="${esc(a.item)}" aria-label="Edit target">✎</button></div>
      </div>`;
    }).join("");
    return `<div class="lab" style="margin:10px 0 4px">${esc(cat)}</div>${body}`;
  }).join("");

  const loans = db.items.filter(i => i.type==="liability");
  const loanRows = loans.length ? loans.map(l => `<div class="row"><span>${esc(l.name)}</span><b class="neg">${money(l.amount)}</b></div>`).join("")
    : '<div class="empty">No liabilities logged.</div>';
  const idealTotal = Object.values(db.idealAlloc||{}).reduce((a,b) => a+b, 0);

  return `<div class="lab">Targets add up to ${idealTotal.toFixed(0)}%${Math.abs(idealTotal-100)>1 ? " — adjust so they total 100%" : ""}. Green means within 3 points of target. Total assets: ${money(total)}.</div>${rows}
  <div class="lab" style="margin:14px 0 4px">Liabilities (not part of the % targets above)</div><div class="card">${loanRows}<div class="row" style="padding-top:0"><span class="lab">Net worth</span><b class="${total-loans.reduce((s,l)=>s+l.amount,0)<0?'neg':''}">${money(total-loans.reduce((s,l)=>s+l.amount,0))}</b></div></div>`;
}

registerTab("alloc", "Allocation", () => {
  const ed = allocEdit;
  return `<form class="card" id="allocf">
    <select name="item" ${ed?'disabled':''}>${ALLOC_ITEMS.map(a => `<option ${ (ed||ALLOC_ITEMS[0].item)===a.item ? "selected" : ""}>${esc(a.item)}</option>`).join("")}</select>
    ${ed ? `<input name="itemfixed" type="hidden" value="${esc(ed)}">` : ""}
    <input name="pct" type="number" step="any" min="0" max="100" placeholder="Target %" value="${ed ? val((db.idealAlloc||{})[ed]) : ""}" required>
    <button>${ed ? "Save target" : "Set target"}</button>${ed ? '<button type="button" class="ghost" data-alloccancel="1">Cancel</button>' : ""}</form>
  ${allocRows()}`;
});

let allocEdit = null;
document.addEventListener("click", e => {
  if (e.target.dataset.alloccancel) { allocEdit = null; render(); }
  if (e.target.dataset.allocedit) { allocEdit = e.target.dataset.allocedit; render(); }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "allocf") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  db.idealAlloc = db.idealAlloc || {};
  db.idealAlloc[d.itemfixed || d.item] = +d.pct || 0;
  allocEdit = null; save();
});
