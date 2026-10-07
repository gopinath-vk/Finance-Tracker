let allocEdit = null;

// Allocation tab: your target (ideal) split across asset classes vs what you actually hold right now.
// Targets are stored as percentages in db.idealAlloc and should add up to 100, though the app doesn't enforce it.
function allocList(){
  const byCat = {}; db.items.filter(i => i.type==="investment").forEach(i => byCat[i.cat||"Other"] = (byCat[i.cat||"Other"]||0) + i.amount);
  const total = Object.values(byCat).reduce((a,b) => a+b, 0);
  const cats = [...new Set([...Object.keys(db.idealAlloc||{}), ...Object.keys(byCat)])].sort();
  const rows = cats.map(c => {
    const ideal = (db.idealAlloc||{})[c] || 0, cur = total ? byCat[c]/total*100 : 0, off = cur - ideal;
    return `<div class="card" style="margin-bottom:8px">
      <div class="row" style="padding:0;border:0"><b>${esc(c)}</b><span>${money(byCat[c]||0)}</span></div>
      <div class="bs" style="height:14px;margin-top:6px">
        <div style="flex:${Math.max(ideal,0.3)};background:var(--line);border-radius:3px;position:relative"><div style="position:absolute;inset:0;width:${total?Math.min(cur/Math.max(ideal,0.0001)*100,100):0}%;background:${Math.abs(off)<=3?'var(--pos)':'var(--neg)'};border-radius:3px"></div></div>
      </div>
      <div class="lab" style="margin-top:4px">Target ${ideal.toFixed(0)}% · Actual ${cur.toFixed(1)}% ${ideal ? `<span class="${Math.abs(off)<=3?'':'neg'}">(${off>0?"+":""}${off.toFixed(1)} pts)</span>` : ""}
      <button class="x" data-allocedit="${esc(c)}" aria-label="Edit target">✎</button></div>
    </div>`;
  }).join("");
  const idealTotal = Object.values(db.idealAlloc||{}).reduce((a,b) => a+b, 0);
  return `<div class="lab" style="margin-bottom:8px">Targets add up to ${idealTotal.toFixed(0)}%${Math.abs(idealTotal-100)>1 ? " — adjust so they total 100%" : ""}. Green means within 3 points of target.</div>${rows || '<div class="empty">No investments or targets yet.</div>'}`;
}
registerTab("alloc", "Allocation", () => {
  const ed = allocEdit;
  return `<form class="card" id="allocf">
    <input name="cat" placeholder="Category (e.g. Mutual Funds)" value="${ed ? esc(ed) : ""}" ${ed ? 'readonly' : ''} required>
    <input name="pct" type="number" step="any" min="0" max="100" placeholder="Target %" value="${ed ? val((db.idealAlloc||{})[ed]) : ""}" required>
    <button>${ed ? "Save target" : "Set target"}</button>${ed ? '<button type="button" class="ghost" data-alloccancel="1">Cancel</button>' : ""}</form>
  ${allocList()}`;
});
document.addEventListener("click", e => {
  if (e.target.dataset.alloccancel) { allocEdit = null; render(); }
  if (e.target.dataset.allocedit) { allocEdit = e.target.dataset.allocedit; render(); }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "allocf") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  db.idealAlloc = db.idealAlloc || {};
  db.idealAlloc[d.cat.trim()] = +d.pct || 0;
  allocEdit = null; save();
});
