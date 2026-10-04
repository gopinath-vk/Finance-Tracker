// Shared list + add/edit form + year/month filter, used by Income, Expenses, Transfers and Liabilities.
let fy = String(new Date().getFullYear()), fm = "all";
const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ledgerView(t, c){
  const dated = t==="income" || t==="expense" || t==="transfer";
  const ed = editId && db.items.find(i => i.id === editId && i.type === t);
  let items = db.items.filter(i => i.type === t).sort((a,b) => (b.date||"").localeCompare(a.date||""));
  let filt = "";
  if (dated) {
    const ys = [...new Set([...items.map(i => i.date.slice(0,4)), String(new Date().getFullYear()), ...(fy==="all" ? [] : [fy])])].sort().reverse();
    items = items.filter(i => (fy==="all" || i.date.startsWith(fy)) && (fm==="all" || i.date.slice(5,7)===fm));
    const tot = items.reduce((s,i) => s+i.amount, 0);
    filt = `<div class="card"><div class="mt"><select name="fy" aria-label="Year"><option value="all">All years</option>${ys.map(y => `<option ${y===fy?"selected":""}>${y}</option>`).join("")}</select>
      <select name="fm" aria-label="Month"><option value="all">All months</option>${MN.map((n,k) => { const v = String(k+1).padStart(2,"0"); return `<option value="${v}" ${v===fm?"selected":""}>${n}</option>`; }).join("")}</select></div>
      <div class="row" style="padding:0;border:0"><span class="lab">${items.length} entries</span><b class="${t==="expense"||tot<0?"neg":"pos"}">${money(tot)}</b></div></div>`;
  }
  const cats = [...new Set([...c.cat, ...(ed ? [ed.cat] : [])])];
  return `<form class="card" id="f" data-t="${t}">
    <input name="name" placeholder="Name" value="${ed ? esc(ed.name) : ""}" required>
    <select name="cat">${cats.map(x => `<option ${ed && ed.cat===x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
    <input name="amount" type="number" step="any" placeholder="${c.a}" value="${ed ? ed.amount : ""}" required>
    ${c.x ? `<input name="extra" type="number" step="any" placeholder="${c.x}" value="${ed ? val(ed.extra) : ""}">` : ""}
    ${dated ? `<input name="source" list="srcs" placeholder="Source (bank / cash)" value="${ed ? esc(ed.source||"") : ""}"><datalist id="srcs">${Object.keys(balances()).map(x => `<option value="${esc(x)}">`).join("")}</datalist>` : ""}
    ${dated ? `<input name="date" type="date" value="${ed ? ed.date : new Date().toLocaleDateString("sv")}" required>` : ""}
    <button>${ed ? "Save changes" : "Add " + c.t.replace(/s$/,"").toLowerCase()}</button>${ed ? '<button type="button" class="ghost" data-cancel="1">Cancel</button>' : ""}</form>${filt}
  <div class="card">${items.length ? items.map(i => `<div class="row"><div>${esc(i.name)}<div class="lab">${esc(i.cat)}${i.source?" · "+esc(i.source):""}${i.date?" · "+i.date:""}${t==="liability"?" · "+(i.extra||0)+"% interest":""}</div></div>
    <div><b class="${t==="income"||(t==="transfer"&&i.amount>=0)?"pos":"neg"}">${money(i.amount)}</b> ${acts(i)}</div></div>`).join("")
    : `<div class="empty">${dated ? "No entries for this period." : "Nothing here yet. Fill in the form above to add your first entry."}</div>`}</div>`;
}

document.addEventListener("change", e => {
  if (e.target.name === "fy" || e.target.name === "fm") { if (e.target.name === "fy") fy = e.target.value; else fm = e.target.value; render(); }
});
