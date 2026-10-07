// Investments tab: stocks/ETFs (live via NSE), mutual funds (live NAV), gold (live spot, best-effort),
// and manual-value assets — grouped into asset classes, with each purchase logged as its own dated lot
// so invested-over-time, XIRR and profit/loss can be worked out per holding.
const INV_CATS = ["Mutual Funds","Stocks","ETFs","Gold","Real Estate","Other"];
const CAT_KIND = {"Mutual Funds":"mf","Stocks":"stock","ETFs":"stock","Gold":"gold","Real Estate":"other","Other":"other"};
let invHoldCat = "all", pickedCat = null, openPos = null;

// Newton's method XIRR: flows = [{date:Date, amount}], outflows negative, inflows positive. Returns a decimal rate, or null.
function xirr(flows){
  if (flows.length < 2 || !flows.some(f => f.amount < 0) || !flows.some(f => f.amount > 0)) return null;
  const d0 = flows[0].date, yrs = f => (f.date - d0) / 31557600000;
  let r = 0.15;
  for (let n = 0; n < 60; n++) {
    let f = 0, df = 0;
    for (const c of flows) { const t = yrs(c), p = Math.pow(1+r, t); f += c.amount / p; df += -t * c.amount / Math.pow(1+r, t+1); }
    if (Math.abs(df) < 1e-9) break;
    const nr = r - f/df;
    if (!isFinite(nr) || nr <= -1) return null;
    if (Math.abs(nr - r) < 1e-7) { r = nr; break; }
    r = nr;
  }
  return isFinite(r) ? r : null;
}

// Group individual lots (one per purchase) into one position per holding name.
function positions(items){
  const by = {};
  items.forEach(i => (by[i.name] = by[i.name] || []).push(i));
  return Object.entries(by).map(([name, lots]) => {
    lots.sort((a,b) => (a.date||"").localeCompare(b.date||""));
    const first = lots[0];
    const invested = lots.reduce((s,l) => s+(l.extra||0), 0);
    const value = lots.reduce((s,l) => s+l.amount, 0);
    const units = lots.reduce((s,l) => s+(l.units||0), 0);
    const flows = [...lots.filter(l => l.date).map(l => ({date: new Date(l.date), amount: -(l.extra||0)})), {date: new Date(), amount: value}];
    const x = xirr(flows);
    return {name, cat: first.cat||"Other", platform: first.platform||"", kind: first.kind, sym: first.sym, lots, invested, value, units,
      gainPct: invested ? (value-invested)/invested*100 : null, xirrPct: x===null ? null : x*100,
      price: lots[lots.length-1].price, priceAt: Math.max(0, ...lots.map(l => l.priceAt||0))};
  }).sort((a,b) => b.value - a.value);
}



function invList(allItems){
  const ed = editId && allItems.find(i => i.id === editId);
  const k = ed ? (ed.kind || "other") : (pickedCat ? CAT_KIND[pickedCat] : "stock");
  const cat = pickedCat || (ed ? (ed.cat && INV_CATS.includes(ed.cat) ? ed.cat : "Other") : "Mutual Funds");
  const customCat = ed && !INV_CATS.includes(ed.cat) ? ed.cat : "";
  const o = (v,l) => `<option value="${v}" ${k===v?"selected":""}>${l}</option>`;
  const platforms = [...new Set(allItems.map(i => i.platform).filter(Boolean))];

  const byCat = {}; allItems.forEach(i => byCat[i.cat||"Other"] = (byCat[i.cat||"Other"]||0) + i.amount);
  const presentCats = [...new Set([...INV_CATS.filter(c => byCat[c]), ...Object.keys(byCat).filter(c => !INV_CATS.includes(c))])];
  const chips = `<div class="chips"><button class="${invHoldCat==="all"?"on":""}" data-invholdcat="all">All</button>${presentCats.map(c => `<button class="${invHoldCat===c?"on":""}" data-invholdcat="${esc(c)}">${esc(c)} · ${money(byCat[c])}</button>`).join("")}</div>`;
  const shownItems = invHoldCat==="all" ? allItems : allItems.filter(i => (i.cat||"Other")===invHoldCat);

  const posRows = positions(shownItems).map(p => {
    const g = p.gainPct, x = p.xirrPct, open = openPos === p.name;
    // Latest entry first, grouped under a year header with that year's invested subtotal.
    const byYear = {};
    [...p.lots].reverse().forEach(l => { const y = l.date ? l.date.slice(0,4) : "No date"; (byYear[y] = byYear[y] || []).push(l); });
    const lotRows = Object.entries(byYear).sort((a,b) => a[0]==="No date" ? 1 : b[0]==="No date" ? -1 : b[0].localeCompare(a[0])).map(([y, lots]) => {
      const yrInvested = lots.reduce((s,l) => s+(l.extra||0), 0);
      const rows = lots.map(l => `<div class="row"><div>${l.date||"—"}<div class="lab">${l.units?l.units+" units":""}${l.units&&l.extra?" @ "+money(l.extra/l.units):""}${l.platform?" · "+esc(l.platform):""}</div></div><div><b>${money(l.amount)}</b> <span class="lab">inv ${money(l.extra||0)}</span> ${acts(l)}</div></div>`).join("");
      return `<div class="lab" style="margin-top:8px">${esc(y)} · invested ${money(yrInvested)}</div>${rows}`;
    }).join("");
    return `<div class="card" style="margin-bottom:10px">
      <button class="hd" data-pos="${esc(p.name)}" aria-expanded="${open}">
        <span><b>${esc(p.name)}</b><div class="lab">${esc(p.cat)}${p.platform?" · "+esc(p.platform):""}${p.units?" · "+p.units+" units":""}${p.price?" · "+money(p.price)+(p.kind?"/"+(p.kind==="gold"?"g":"unit"):""):""}</div>${p.lots[p.lots.length-1].date?`<div class="lab">Last added ${p.lots[p.lots.length-1].date}</div>`:""}</span>
        <span style="text-align:right"><b>${money(p.value)}</b><div class="lab ${g!==null&&g<0?'neg':'pos'}">${g!==null ? g.toFixed(1)+"%" : ""}${x!==null ? " · XIRR "+x.toFixed(1)+"%" : ""}</div></span>
      </button>
      ${open ? `<div class="lab" style="margin-top:8px">Invested ${money(p.invested)} · Current ${money(p.value)} · P&L ${g!==null?money(p.value-p.invested)+" ("+g.toFixed(1)+"%)":"—"}${x!==null?" · XIRR "+x.toFixed(1)+"%":""}</div><div style="margin-top:8px">${lotRows}</div>` : ""}
    </div>`;
  }).join("");

  return `<form class="card" id="f" data-t="investment" data-k="${k}">
    <div class="chips" style="grid-column:1/-1">${INV_CATS.map(c => `<button type="button" class="${cat===c?"on":""}" data-invcatpick="${c}">${c}</button>`).join("")}</div>
    <input name="cat" type="hidden" value="${esc(cat)}">
    ${cat==="Other" ? `<input name="catother" placeholder="Category name" value="${esc(customCat)}">` : ""}
    <select name="kind">${o("stock","Live price: Stock / ETF (NSE)")}${o("mf","Live price: Mutual fund")}${o("gold","Live price: Gold (per gram)")}${o("other","Manual value")}</select>
    <input class="mf" id="mfq" placeholder="Search fund name" autocomplete="off">
    <select class="mf" id="mfr"><option value="">Pick a fund</option></select>
    <input name="name" placeholder="Name" value="${ed ? esc(ed.name) : ""}" required>
    <input class="sy" name="sym" placeholder="NSE symbol (TCS) or fund code" value="${ed ? esc(ed.sym||"") : ""}">
    <input class="un" name="units" type="number" step="any" placeholder="${k==='gold'?'Grams purchased':'Units / shares'}" value="${ed ? val(ed.units) : ""}">
    <input class="pu" name="navprice" type="number" step="any" placeholder="${k==='mf'?'NAV at purchase':'Buy price per unit'} (optional)">
    <input class="mo" name="amount" type="number" step="any" placeholder="Current value" value="${ed && !ed.sym ? ed.amount : ""}">
    <input class="pu-alt" name="extra" type="number" step="any" placeholder="Or: amount invested this entry" value="${ed ? val(ed.extra) : ""}">
    <input name="platform" list="plats" placeholder="Platform (Zerodha, Groww...)" value="${ed ? esc(ed.platform||"") : ""}"><datalist id="plats">${platforms.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <input name="date" type="date" value="${ed ? (ed.date||"") : new Date().toLocaleDateString("sv")}">
    <button>${ed ? "Save changes" : "Add investment"}</button>${ed ? '<button type="button" class="ghost" data-cancel="1">Cancel</button>' : ""}</form>
  <div class="lab" style="margin:4px 0 8px">Add a new entry each time you invest (e.g. monthly SIP) — each one is a dated purchase, grouped below by holding. Enter the NAV/price and units, or just the amount invested — whichever you have.</div>
  ${chips}
  <div style="margin-top:8px"><button class="ghost" id="rp">Refresh prices</button> <span class="lab" id="pst"></span></div>
  <div style="margin-top:10px">${posRows || '<div class="empty">No investments in this category.</div>'}</div>`;
}

// Validate/adjust an investment entry before it is saved (called by the shared submit handler in core.js).
function beforeSaveInvestment(it, d, old) {
  it.cat = it.cat === "Other" ? (d.catother || "Other").trim() : it.cat;
  it.platform = (d.platform || "").trim();
  if (d.kind === "other") { it.kind = undefined; it.sym = undefined; it.units = undefined; return; }
  const nav = +d.navprice || 0;
  if (d.kind === "gold") {
    it.kind = "gold"; it.sym = "GOLD"; it.units = +d.units || 0;
    if (!it.units) { alert("Enter the grams purchased."); return false; }
    if (nav) it.extra = +(nav * it.units).toFixed(2);
    if (old && old.kind === "gold" && old.price) { it.price = old.price; it.priceAt = old.priceAt; it.amount = +(old.price * it.units).toFixed(2); } else it.amount = 0;
    return;
  }
  it.kind = d.kind; it.sym = (d.sym||"").trim(); it.units = +d.units || 0;
  if (!it.sym || !it.units) { alert("Enter the symbol or fund code, and the units."); return false; }
  if (nav) it.extra = +(nav * it.units).toFixed(2);
  if (old && old.sym === it.sym && old.price) { it.price = old.price; it.priceAt = old.priceAt; it.amount = +(old.price * it.units).toFixed(2); } else it.amount = 0;
}
registerTab("investment", "Investments", () => invList(db.items.filter(i => i.type === "investment")), {beforeSave: beforeSaveInvestment});

document.addEventListener("click", e => {
  if (e.target.dataset.cancel || e.target.dataset.edit || e.target.dataset.t) pickedCat = null;
  const p = e.target.closest("[data-invcatpick]");
  if (p) { pickedCat = p.dataset.invcatpick; render(); }
  const hc = e.target.closest("[data-invholdcat]");
  if (hc) { invHoldCat = hc.dataset.invholdcat; render(); }
  const pos = e.target.closest("[data-pos]");
  if (pos) { openPos = openPos === pos.dataset.pos ? null : pos.dataset.pos; render(); }
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
