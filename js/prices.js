// Live prices: stocks via Yahoo Finance (through a public relay), mutual funds via mfapi.in.
async function quote(i){
  if (i.kind === "mf") { const r = await (await fetch(`https://api.mfapi.in/mf/${i.sym}/latest`)).json(); return +r.data[0].nav; }
  const s = i.sym.toUpperCase(), y = s.includes(".") ? s : s + ".NS";
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?interval=1d&range=1d`;
  const r = await (await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(u))).json();
  return r.chart.result[0].meta.regularMarketPrice;
}
let busy = false;
async function refreshPrices(){
  if (busy || !navigator.onLine) return;
  busy = true; if ($("pst")) $("pst").textContent = "Updating…";
  let ok = 0, bad = 0;
  for (const i of db.items.filter(x => x.type === "investment" && x.sym)) {
    try { const p = await quote(i); if (p > 0) { i.price = p; i.amount = +(p * i.units).toFixed(2); i.priceAt = Date.now(); ok++; } } catch(e){ bad++; }
  }
  busy = false;
  if (ok) save(); else render();
  if (bad && $("pst")) $("pst").textContent = bad + " price(s) could not be fetched";
}
document.addEventListener("click", e => { if (e.target.id === "rp") refreshPrices(); });
