// Transfers tab: self transfers between your own accounts, and credit card bill payments.
// Each new transfer is saved as a linked income+expense pair (sharing pairId) so it displays as one row,
// and is kept out of the Income/Expenses tabs and totals (see ledger.js and dashboard.js).
function xferList(){
  const items = db.items.filter(i => (i.type==="income"||i.type==="expense") && (i.cat==="TR/WD"||i.cat==="CC Bill"))
    .sort((a,b) => (b.date||"").localeCompare(a.date||""));
  const seen = new Set(), rows = [];
  for (const i of items) {
    if (seen.has(i.id)) continue;
    if (i.pairId) {
      const other = items.find(x => x.pairId === i.pairId && x.id !== i.id);
      if (other) {
        seen.add(i.id); seen.add(other.id);
        const from = i.type==="expense" ? i : other, to = i.type==="income" ? i : other;
        rows.push(`<div class="row"><div class="pair"><span>${esc(from.source||"?")}</span>→<span>${esc(to.source||"?")}</span><span class="lab">${i.cat==="CC Bill"?"CC bill":"transfer"} · ${i.date}</span></div><div><b>${money(i.amount)}</b> <button class="x" data-delpair="${i.pairId}" aria-label="Delete">✕</button></div></div>`);
        continue;
      }
    }
    seen.add(i.id);
    rows.push(`<div class="row"><div>${esc(i.name)}<div class="lab">${esc(i.cat)}${i.source?" · "+esc(i.source):""}${i.date?" · "+i.date:""}</div></div><div><b class="${i.type==="income"?"pos":"neg"}">${money(i.amount)}</b> ${acts(i)}</div></div>`);
  }
  return rows.length ? rows.join("") : '<div class="empty">No transfers yet. Use the form above to move money between your own accounts, or log a credit card bill payment.</div>';
}
registerTab("xfer", "Transfers", () => {
  const banks = Object.keys(balances());
  const opt = v => `<option>${esc(v)}</option>`;
  return `<form class="card" id="xferf">
    <input name="date" type="date" value="${new Date().toLocaleDateString("sv")}" required>
    <select name="from" required><option value="">From</option>${banks.map(opt).join("")}</select>
    <select name="to" required><option value="">To</option>${banks.map(opt).join("")}</select>
    <input name="amount" type="number" step="any" placeholder="Amount" required>
    <button>Record transfer</button></form>
  <div class="lab" style="margin-bottom:8px">Pick "CC" as the destination to log a credit card bill payment.</div>
  <div class="card">${xferList()}</div>`;
});

document.addEventListener("submit", e => {
  if (e.target.id !== "xferf") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const amt = +d.amount;
  if (!d.from || !d.to || d.from === d.to || !amt) return alert("Pick two different accounts and an amount.");
  const cat = (d.to === "CC" || d.from === "CC") ? "CC Bill" : "TR/WD";
  const pairId = crypto.randomUUID();
  const name = `${d.from} → ${d.to}`;
  db.items.push({id: crypto.randomUUID(), type: "expense", name, cat, amount: amt, extra: 0, date: d.date, source: d.from, pairId});
  db.items.push({id: crypto.randomUUID(), type: "income", name, cat, amount: amt, extra: 0, date: d.date, source: d.to, pairId});
  save();
});
document.addEventListener("click", e => {
  const dp = e.target.dataset.delpair;
  if (dp && confirm("Delete this transfer?")) { db.items = db.items.filter(i => i.pairId !== dp); save(); }
});
