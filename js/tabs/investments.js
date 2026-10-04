// Investments tab: stocks (NSE), mutual funds, and manual-value assets.
function invList(items){
  const ed = editId && items.find(i => i.id === editId), k = ed ? (ed.kind || "other") : "stock";
  const o = (v,l) => `<option value="${v}" ${k===v?"selected":""}>${l}</option>`;
  const rows = items.length ? items.map(i => `<div class="row"><div>${esc(i.name)}<div class="lab">${i.sym ? esc(i.sym)+" · "+i.units+" units @ "+(i.price ? money(i.price) : "waiting for price") : "Manual value"} · invested ${money(i.extra||0)}</div></div><div><b>${money(i.amount)}</b> ${acts(i)}</div></div>`).join("") : '<div class="empty">Nothing here yet. Add a stock, mutual fund or other asset above.</div>';
  return `<form class="card" id="f" data-t="investment" data-k="${k}">
    <select name="kind">${o("stock","Stock (NSE)")}${o("mf","Mutual fund")}${o("other","Manual value (no live price)")}</select>
    <input class="mf" id="mfq" placeholder="Search fund name" autocomplete="off">
    <select class="mf" id="mfr"><option value="">Pick a fund</option></select>
    <input name="name" placeholder="Name" value="${ed ? esc(ed.name) : ""}" required>
    <input class="mk" name="sym" placeholder="NSE symbol (TCS) or fund code" value="${ed ? esc(ed.sym||"") : ""}">
    <input class="mk" name="units" type="number" step="any" placeholder="Units / shares" value="${ed ? val(ed.units) : ""}">
    <input class="mo" name="amount" type="number" step="any" placeholder="Current value" value="${ed && !ed.sym ? ed.amount : ""}">
    <input name="extra" type="number" step="any" placeholder="Amount invested" value="${ed ? val(ed.extra) : ""}">
    <button>${ed ? "Save changes" : "Add investment"}</button>${ed ? '<button type="button" class="ghost" data-cancel="1">Cancel</button>' : ""}</form>
  <div class="card"><button class="ghost" id="rp">Refresh prices</button> <span class="lab" id="pst"></span>${rows}</div>`;
}

// Validate/adjust an investment entry before it is saved (called by the shared submit handler in core.js).
function beforeSaveInvestment(it, d, old) {
  if (d.kind === "other") return;
  it.kind = d.kind; it.sym = (d.sym||"").trim(); it.units = +d.units || 0;
  if (!it.sym || !it.units) { alert("Enter the symbol or fund code, and the units."); return false; }
  if (old && old.sym === it.sym && old.price) { it.price = old.price; it.priceAt = old.priceAt; it.amount = +(old.price * it.units).toFixed(2); } else it.amount = 0;
}
registerTab("investment", "Investments", () => invList(db.items.filter(i => i.type === "investment")), {beforeSave: beforeSaveInvestment});

document.addEventListener("change", e => {
  if (e.target.name === "kind") e.target.form.dataset.k = e.target.value;
  if (e.target.id === "mfr" && e.target.value) { const f = e.target.form; f.sym.value = e.target.value; f.name.value = e.target.selectedOptions[0].text; }
});
document.addEventListener("input", async e => {
  if (e.target.id !== "mfq" || e.target.value.length < 3) return;
  try { const r = await (await fetch("https://api.mfapi.in/mf/search?q=" + encodeURIComponent(e.target.value))).json();
    $("mfr").innerHTML = '<option value="">Pick a fund</option>' + r.slice(0,15).map(x => `<option value="${x.schemeCode}">${esc(x.schemeName)}</option>`).join(""); } catch(x){}
});
