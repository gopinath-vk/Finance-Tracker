// Investments tab: stocks (NSE), mutual funds, and manual-value assets, grouped into asset classes.
const INV_CATS = ["Mutual Funds","Stocks","ETFs","Gold","Real Estate","Other"];
let invHoldCat = "all", pickedCat = null;

function invChart(items){
  const ms = [...Array(6)].map((_,k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-5+k); return d.toLocaleDateString("sv").slice(0,7); });
  const lbl = ms.map(x => new Date(x+"-15").toLocaleDateString(undefined,{month:"short"}));
  const vals = ms.map(mm => items.filter(i => i.date && i.date.startsWith(mm)).reduce((s,i) => s+(i.extra||0), 0));
  if (!vals.some(v => v > 0)) return "";
  return `<div class="card"><div class="lab">Monthly invested — last 6 months${invHoldCat!=="all" ? " · "+esc(invHoldCat) : ""}</div>${lineChart([{name:"Invested", color:"var(--pos)", values: vals}], lbl)}</div>`;
}

function invList(allItems){
  const ed = editId && allItems.find(i => i.id === editId);
  const k = ed ? (ed.kind || "other") : "stock";
  const cat = pickedCat || (ed ? (ed.cat && INV_CATS.includes(ed.cat) ? ed.cat : "Other") : (invHoldCat !== "all" ? invHoldCat : "Mutual Funds"));
  const customCat = ed && !INV_CATS.includes(ed.cat) ? ed.cat : "";
  const o = (v,l) => `<option value="${v}" ${k===v?"selected":""}>${l}</option>`;
  const platforms = [...new Set(allItems.map(i => i.platform).filter(Boolean))];

  const byCat = {}; allItems.forEach(i => byCat[i.cat||"Other"] = (byCat[i.cat||"Other"]||0) + i.amount);
  const presentCats = [...new Set([...INV_CATS.filter(c => byCat[c]), ...Object.keys(byCat).filter(c => !INV_CATS.includes(c))])];
  const chips = `<div class="chips"><button class="${invHoldCat==="all"?"on":""}" data-invholdcat="all">All</button>${presentCats.map(c => `<button class="${invHoldCat===c?"on":""}" data-invholdcat="${esc(c)}">${esc(c)} · ${money(byCat[c])}</button>`).join("")}</div>`;
  const shown = invHoldCat==="all" ? allItems : allItems.filter(i => (i.cat||"Other")===invHoldCat);
  const rows = shown.length ? shown.sort((a,b) => (b.date||"").localeCompare(a.date||"")).map(i => `<div class="row"><div>${esc(i.name)}<div class="lab">${esc(i.cat||"Other")}${i.platform?" · "+esc(i.platform):""}${i.sym ? " · "+esc(i.sym)+" · "+i.units+" units @ "+(i.price ? money(i.price) : "waiting for price") : " · Manual value"}${i.date?" · "+i.date:""} · invested ${money(i.extra||0)}</div></div><div><b>${money(i.amount)}</b> ${acts(i)}</div></div>`).join("") : '<div class="empty">Nothing in this category yet.</div>';

  return `<form class="card" id="f" data-t="investment" data-k="${k}">
    <div class="chips" style="grid-column:1/-1">${INV_CATS.map(c => `<button type="button" class="${cat===c?"on":""}" data-invcatpick="${c}">${c}</button>`).join("")}</div>
    <input name="cat" type="hidden" value="${esc(cat)}">
    ${cat==="Other" ? `<input name="catother" placeholder="Category name" value="${esc(customCat)}">` : ""}
    <select name="kind">${o("stock","Live price: Stock / ETF (NSE)")}${o("mf","Live price: Mutual fund")}${o("other","Manual value")}</select>
    <input class="mf" id="mfq" placeholder="Search fund name" autocomplete="off">
    <select class="mf" id="mfr"><option value="">Pick a fund</option></select>
    <input name="name" placeholder="Name" value="${ed ? esc(ed.name) : ""}" required>
    <input class="mk" name="sym" placeholder="NSE symbol (TCS) or fund code" value="${ed ? esc(ed.sym||"") : ""}">
    <input class="mk" name="units" type="number" step="any" placeholder="Units / shares" value="${ed ? val(ed.units) : ""}">
    <input class="mo" name="amount" type="number" step="any" placeholder="Current value" value="${ed && !ed.sym ? ed.amount : ""}">
    <input name="extra" type="number" step="any" placeholder="Amount invested this entry" value="${ed ? val(ed.extra) : ""}">
    <input name="platform" list="plats" placeholder="Platform (Zerodha, Groww...)" value="${ed ? esc(ed.platform||"") : ""}"><datalist id="plats">${platforms.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <input name="date" type="date" value="${ed ? (ed.date||"") : new Date().toLocaleDateString("sv")}">
    <button>${ed ? "Save changes" : "Add investment"}</button>${ed ? '<button type="button" class="ghost" data-cancel="1">Cancel</button>' : ""}</form>
  <div class="lab" style="margin:4px 0 8px">Add a new entry each time you invest (e.g. monthly SIP) to track it over time.</div>
  ${chips}${invChart(shown)}
  <div class="card"><button class="ghost" id="rp">Refresh prices</button> <span class="lab" id="pst"></span>${rows}</div>`;
}

// Validate/adjust an investment entry before it is saved (called by the shared submit handler in core.js).
function beforeSaveInvestment(it, d, old) {
  it.cat = it.cat === "Other" ? (d.catother || "Other").trim() : it.cat;
  it.platform = (d.platform || "").trim();
  if (d.kind === "other") { it.kind = undefined; it.sym = undefined; it.units = undefined; return; }
  it.kind = d.kind; it.sym = (d.sym||"").trim(); it.units = +d.units || 0;
  if (!it.sym || !it.units) { alert("Enter the symbol or fund code, and the units."); return false; }
  if (old && old.sym === it.sym && old.price) { it.price = old.price; it.priceAt = old.priceAt; it.amount = +(old.price * it.units).toFixed(2); } else it.amount = 0;
}
registerTab("investment", "Investments", () => invList(db.items.filter(i => i.type === "investment")), {beforeSave: beforeSaveInvestment});

document.addEventListener("click", e => {
  if (e.target.dataset.cancel || e.target.dataset.edit || e.target.dataset.t) pickedCat = null;
  const p = e.target.closest("[data-invcatpick]");
  if (p) { pickedCat = p.dataset.invcatpick; render(); }
  const hc = e.target.closest("[data-invholdcat]");
  if (hc) { invHoldCat = hc.dataset.invholdcat; render(); }
});
document.addEventListener("change", e => {
  if (e.target.name === "kind") e.target.form.dataset.k = e.target.value;
  if (e.target.id === "mfr" && e.target.value) { const f = e.target.form; f.sym.value = e.target.value; f.name.value = e.target.selectedOptions[0].text; }
});
document.addEventListener("input", async e => {
  if (e.target.id !== "mfq" || e.target.value.length < 3) return;
  try { const r = await (await fetch("https://api.mfapi.in/mf/search?q=" + encodeURIComponent(e.target.value))).json();
    $("mfr").innerHTML = '<option value="">Pick a fund</option>' + r.slice(0,15).map(x => `<option value="${x.schemeCode}">${esc(x.schemeName)}</option>`).join(""); } catch(x){}
});
