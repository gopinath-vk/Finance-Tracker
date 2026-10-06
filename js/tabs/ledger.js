// Shared list + add/edit form + year/month filter, used by Income, Expenses and Liabilities.
// Self transfers (TR/WD) and credit card bill payments (CC Bill) live in the Transfers tab, not here.
let fy = String(new Date().getFullYear()), fm = String(new Date().getMonth()+1).padStart(2,"0"), ecat = "all";

// Auto-suggested category by item name, from the person's own naming patterns. Matched as a prefix, case-insensitive,
// longest match wins (so "Loan EMI/Interest" beats "Loan"). Only applied while adding/editing — never overrides silently,
// the person can still pick a different category before saving.
const CAT_MAP = Object.entries({
  "cc bill":"Debt/EMI","loan closure":"Debt/EMI","loan emi/interest":"Debt/EMI","loan":"Debt/EMI",
  "movie":"Entertainment","ott":"Entertainment",
  "grocery":"Home","home - others":"Home","monthly exp":"Home","outside food":"Home","edu - aadhi":"Home",
  "bank interest":"Income","bayer salary":"Income","other income":"Income","investment return":"Income",
  "insurance":"Insurance",
  "chit":"Investments","mf/stocks":"Investments","fd":"Investments",
  "hospital":"Medical","medicine":"Medical",
  "bank charges":"Misc","mozhi":"Misc","temple expenses":"Misc","electrical/gadget":"Misc","unexpected":"Misc",
  "internet":"Recharge","mobile":"Recharge","rajagopal - recharge":"Recharge",
  "house rent":"Rent","rent advance":"Rent",
  "income tax":"Tax","panchayat tax":"Tax",
  "bike service":"Transportation","petrol":"Transportation","travel":"Transportation"
}).sort((a,b) => b[0].length - a[0].length);
function suggestCat(name){
  const n = name.trim().toLowerCase();
  const hit = CAT_MAP.find(([k]) => n.startsWith(k));
  return hit ? hit[1] : null;
}
const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ledgerView(t, c){
  const dated = t==="income" || t==="expense";
  const ed = editId && db.items.find(i => i.id === editId && i.type === t);
  let items = db.items.filter(i => i.type === t && !(dated && (i.cat==="TR/WD" || i.cat==="CC Bill"))).sort((a,b) => (b.date||"").localeCompare(a.date||""));
  let filt = "", catChips = "";
  if (t === "expense") {
    const allCats = [...new Set(items.map(i => i.cat))].sort();
    catChips = `<div class="chips"><button class="${ecat==="all"?"on":""}" data-ecat="all">All categories</button>${allCats.map(x => `<button class="${ecat===x?"on":""}" data-ecat="${esc(x)}">${esc(x)}</button>`).join("")}</div>`;
    items = ecat==="all" ? items : items.filter(i => i.cat === ecat);
  }
  if (dated) {
    const ys = [...new Set([...items.map(i => i.date.slice(0,4)), String(new Date().getFullYear()), ...(fy==="all" ? [] : [fy])])].sort().reverse();
    items = items.filter(i => (fy==="all" || i.date.startsWith(fy)) && (fm==="all" || i.date.slice(5,7)===fm));
    const tot = items.reduce((s,i) => s+i.amount, 0);
    filt = `<div class="card"><div class="mt"><select name="fy" aria-label="Year"><option value="all">All years</option>${ys.map(y => `<option ${y===fy?"selected":""}>${y}</option>`).join("")}</select>
      <select name="fm" aria-label="Month"><option value="all">All months</option>${MN.map((n,k) => { const v = String(k+1).padStart(2,"0"); return `<option value="${v}" ${v===fm?"selected":""}>${n}</option>`; }).join("")}</select></div>
      ${t==="expense" ? catChips : ""}
      <div class="row" style="padding:0;border:0"><span class="lab">${items.length} entries</span><b class="${t==="expense"?"neg":"pos"}">${money(tot)}</b></div></div>`;
  }
  const formCats = [...new Set([...c.cat.filter(x => x!=="TR/WD" && x!=="CC Bill"), ...(ed ? [ed.cat] : [])])];
  return `<form class="card" id="f" data-t="${t}">
    <input name="name" placeholder="Name" value="${ed ? esc(ed.name) : ""}" required>
    <select name="cat">${formCats.map(x => `<option ${ed && ed.cat===x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
    <input name="amount" type="number" step="any" placeholder="${c.a}" value="${ed ? ed.amount : ""}" required>
    ${c.x ? `<input name="extra" type="number" step="any" placeholder="${c.x}" value="${ed ? val(ed.extra) : ""}">` : ""}
    ${dated ? `<input name="source" list="srcs" placeholder="Source (bank / cash)" value="${ed ? esc(ed.source||"") : ""}"><datalist id="srcs">${Object.keys(balances()).map(x => `<option value="${esc(x)}">`).join("")}</datalist>` : ""}
    ${dated ? `<input name="date" type="date" value="${ed ? ed.date : new Date().toLocaleDateString("sv")}" required>` : ""}
    <button>${ed ? "Save changes" : "Add " + c.t.replace(/s$/,"").toLowerCase()}</button>${ed ? '<button type="button" class="ghost" data-cancel="1">Cancel</button>' : ""}</form>${filt}
  <div class="card">${items.length ? items.map(i => `<div class="row"><div>${esc(i.name)}<div class="lab">${esc(i.cat)}${i.source?" · "+esc(i.source):""}${i.date?" · "+i.date:""}${t==="liability"?" · "+(i.extra||0)+"% interest":""}</div></div>
    <div><b class="${t==="income"?"pos":"neg"}">${money(i.amount)}</b> ${acts(i)}</div></div>`).join("")
    : `<div class="empty">${dated ? "No entries for this period." : "Nothing here yet. Fill in the form above to add your first entry."}</div>`}</div>`;
}

document.addEventListener("change", e => {
  if (e.target.name === "fy" || e.target.name === "fm") { if (e.target.name === "fy") fy = e.target.value; else fm = e.target.value; render(); }
});
document.addEventListener("input", e => {
  if (e.target.name !== "name") return;
  const f = e.target.form;
  if (!f || !f.cat) return;
  const cat = suggestCat(e.target.value);
  if (cat && [...f.cat.options].some(o => o.value === cat)) f.cat.value = cat;
});
document.addEventListener("click", e => {
  const c = e.target.closest("[data-ecat]");
  if (c) { ecat = c.dataset.ecat; render(); }
});
