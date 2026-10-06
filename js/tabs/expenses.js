// Expenses tab: ledger list (with category filter, built into ledger.js) plus a spend-by-category chart.
function expenseChart(){
  const items = db.items.filter(i => i.type==="expense" && i.cat!=="TR/WD" && i.cat!=="CC Bill" &&
    (fy==="all" || i.date.startsWith(fy)) && (fm==="all" || i.date.slice(5,7)===fm));
  const cats = {}; items.forEach(i => cats[i.cat] = (cats[i.cat]||0) + i.amount);
  const entries = Object.entries(cats).sort((a,b) => b[1]-a[1]);
  if (!entries.length) return "";
  const top = Math.max(1, ...entries.map(e => e[1]));
  return `<div class="card"><div class="lab">Spending by category${fy!=="all" ? " · "+fy+(fm!=="all"?"-"+fm:"") : ""}</div>${entries.map(([c,v]) =>
    `<div style="margin-top:8px"><div class="row" style="padding:0;border:0"><span>${esc(c)}</span><b>${money(v)}</b></div><div class="bar" style="width:${v/top*100}%"></div></div>`).join("")}</div>`;
}
registerTab("expense", "Expenses", () => expenseChart() + ledgerView("expense", {t: "Expenses", a: "Amount", cat: ["Home","Transportation","Debt/EMI","Insurance","Medical","Tax","Rent","Recharge","Entertainment","Misc","Investments","TR/WD"]}));
