// Liabilities tab: loans/cards with a running balance, a payment log you can chart over time, and each
// loan's payment history viewable (and editable) by expanding its card.
let openLoan = null, payEdit = null;

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

function payForm(items, forLoan, ed){
  if (!items.length) return "";
  return `<form class="card" id="payf">
    <select name="loan" ${forLoan?'disabled':''}>${items.map(i => `<option value="${i.id}" ${forLoan===i.id?"selected":""}>${esc(i.name)} · owes ${money(i.amount)}</option>`).join("")}</select>
    ${forLoan ? `<input name="loanfixed" type="hidden" value="${esc(forLoan)}">` : ""}
    <input name="date" type="date" value="${ed ? ed.date : new Date().toLocaleDateString("sv")}" required>
    <input name="amount" type="number" step="any" placeholder="Principal paid" value="${ed ? ed.amount : ""}" required>
    ${ed ? `<input name="payid" type="hidden" value="${ed.id}">` : ""}
    <button>${ed ? "Save payment" : "Record payment"}</button>${ed ? '<button type="button" class="ghost" data-paycancel="1">Cancel</button>' : ""}</form>`;
}

function loanCards(items){
  return items.map(l => {
    const open = openLoan === l.id;
    const payments = [...(l.payments||[])].sort((a,b) => b.date.localeCompare(a.date));
    const ed = payEdit && payments.find(p => p.id === payEdit);
    const rows = payments.length ? payments.map(p => `<div class="row"><div>${p.date}</div><div><b>${money(p.amount)}</b> <button class="x" data-payedit="${l.id}|${p.id}" aria-label="Edit">✎</button><button class="x" data-paydel="${l.id}|${p.id}" aria-label="Delete">✕</button></div></div>`).join("")
      : '<div class="empty">No payments recorded for this loan yet.</div>';
    return `<div class="card" style="margin-bottom:10px">
      <button class="hd" data-loan="${l.id}" aria-expanded="${open}"><span><b>${esc(l.name)}</b><div class="lab">${esc(l.cat)}${l.extra?" · "+l.extra+"% interest":""}</div></span><span style="text-align:right"><b>${money(l.amount)}</b><div class="lab">${payments.length} ${payments.length===1?"payment":"payments"}</div></span></button>
      ${open ? `${ed ? payForm(items, l.id, ed) : ""}<div style="margin-top:8px">${rows}</div>` : ""}
    </div>`;
  }).join("") || '<div class="empty">No liabilities logged yet.</div>';
}

registerTab("liability", "Liabilities", () => {
  const items = db.items.filter(i => i.type === "liability");
  const openItem = items.find(l => l.id === openLoan);
  return (payEdit ? "" : payForm(items, null, null)) + liabChart(items) + `<div class="lab" style="margin:10px 0 4px">Tap a loan to see or edit its payment history</div>` + loanCards(items)
    + ledgerView("liability", {t: "Liabilities", a: "Balance owed", x: "Interest rate %", cat: ["Loan","Credit card","Mortgage","Other"]});
});

document.addEventListener("click", e => {
  const lc = e.target.closest("[data-loan]");
  if (lc) { openLoan = openLoan === lc.dataset.loan ? null : lc.dataset.loan; payEdit = null; render(); }
  if (e.target.dataset.paycancel) { payEdit = null; render(); }
  if (e.target.dataset.payedit) { const [, pid] = e.target.dataset.payedit.split("|"); payEdit = pid; render(); }
  if (e.target.dataset.paydel && confirm("Delete this payment? The loan balance will go back up by this amount.")) {
    const [lid, pid] = e.target.dataset.paydel.split("|");
    const loan = db.items.find(i => i.id === lid);
    const p = (loan.payments||[]).find(x => x.id === pid);
    if (p) { loan.amount = +(loan.amount + p.amount).toFixed(2); loan.payments = loan.payments.filter(x => x.id !== pid); save(); }
  }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "payf") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const loan = db.items.find(i => i.id === (d.loanfixed || d.loan));
  const amt = +d.amount;
  if (!loan || !amt) return;
  loan.payments = loan.payments || [];
  if (d.payid) {
    const p = loan.payments.find(x => x.id === d.payid);
    loan.amount = +(loan.amount + p.amount - amt).toFixed(2); // undo the old amount, apply the new one
    p.date = d.date; p.amount = amt;
  } else {
    loan.payments.push({id: crypto.randomUUID(), date: d.date, amount: amt});
    loan.amount = +(loan.amount - amt).toFixed(2);
  }
  payEdit = null; save();
});
