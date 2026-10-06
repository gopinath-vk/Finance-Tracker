// Liabilities tab: loans/cards with a running balance, plus a payment log you can chart over time.
function liabChart(items){
  const points = items.flatMap(l => (l.payments||[]).map(p => ({date: p.date, name: l.name})));
  const dates = [...new Set(points.map(p => p.date))].sort();
  if (dates.length < 2) return "";
  const series = items.filter(l => (l.payments||[]).length).map((l,idx) => {
    let bal = l.amount + (l.payments||[]).reduce((s,p) => s+p.amount, 0); // balance before any recorded payment
    const byDate = {}; [...(l.payments||[])].sort((a,b)=>a.date.localeCompare(b.date)).forEach(p => { bal -= p.amount; byDate[p.date] = bal; });
    let last = l.amount + (l.payments||[]).reduce((s,p) => s+p.amount, 0);
    const values = dates.map(d => { if (byDate[d] !== undefined) last = byDate[d]; return last; });
    const colors = ["var(--neg)","var(--pos)","#d08a1e","#5b7fd6","#a05bd6"];
    return {name: l.name, color: colors[idx % colors.length], values};
  });
  const lbl = dates.map(d => new Date(d).toLocaleDateString(undefined,{day:"numeric",month:"short"}));
  return `<div class="card"><div class="lab">Balance over time (after each recorded payment)</div>${lineChart(series, lbl, 130)}
    <div class="lab" style="margin-top:6px">${series.map(s => `<span style="color:${s.color}">●</span> ${esc(s.name)} &nbsp;`).join("")}</div></div>`;
}

function payForm(items){
  if (!items.length) return "";
  return `<form class="card" id="payf">
    <select name="loan">${items.map(i => `<option value="${i.id}">${esc(i.name)} · owes ${money(i.amount)}</option>`).join("")}</select>
    <input name="date" type="date" value="${new Date().toLocaleDateString("sv")}" required>
    <input name="amount" type="number" step="any" placeholder="Principal paid" required>
    <button>Record payment</button></form>`;
}

registerTab("liability", "Liabilities", () => {
  const items = db.items.filter(i => i.type === "liability");
  return payForm(items) + liabChart(items) + ledgerView("liability", {t: "Liabilities", a: "Balance owed", x: "Interest rate %", cat: ["Loan","Credit card","Mortgage","Other"]});
});

document.addEventListener("submit", e => {
  if (e.target.id !== "payf") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const loan = db.items.find(i => i.id === d.loan);
  const amt = +d.amount;
  if (!loan || !amt) return;
  loan.payments = loan.payments || [];
  loan.payments.push({date: d.date, amount: amt});
  loan.amount = +(loan.amount - amt).toFixed(2);
  save();
});
