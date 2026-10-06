// Live prices: stocks/ETFs via Yahoo Finance, mutual funds via mfapi.in, gold via a public spot-price API —
// all routed through a public CORS relay. Gold pricing is best-effort: free gold APIs are less reliable than
// the stock/MF ones, so if it fails the holding just keeps its last known price, same as a failed stock quote.
const RELAY = u => fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(u)).then(r => r.json());

async function quote(i){
  if (i.kind === "mf") { const r = await (await fetch(`https://api.mfapi.in/mf/${i.sym}/latest`)).json(); return +r.data[0].nav; }
  if (i.kind === "gold") {
    const [fx, spot] = await Promise.all([RELAY("https://open.er-api.com/v6/latest/USD"), RELAY("https://api.gold-api.com/price/XAU")]);
    const usdInr = fx.rates.INR, usdPerOz = spot.price;
    return usdPerOz * usdInr / 31.1034768;
  }
  const s = i.sym.toUpperCase(), y = s.includes(".") ? s : s + ".NS";
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?interval=1d&range=1d`;
  const r = await RELAY(u);
  return r.chart.result[0].meta.regularMarketPrice;
}
function logPrice(key, price){
  const h = db.priceHistory[key] = db.priceHistory[key] || [];
  const today = new Date().toLocaleDateString("sv");
  if (h.length && h[h.length-1].date === today) h[h.length-1].price = price;
  else h.push({date: today, price});
}
let busy = false;
async function refreshPrices(){
  if (busy || !navigator.onLine) return;
  busy = true; if ($("pst")) $("pst").textContent = "Updating…";
  let ok = 0, bad = 0;
  for (const i of db.items.filter(x => x.type === "investment" && x.sym)) {
    try { const p = await quote(i); if (p > 0) { i.price = p; i.amount = +(p * i.units).toFixed(2); i.priceAt = Date.now(); logPrice(i.kind==="gold"?"GOLD":i.sym, p); ok++; } } catch(e){ bad++; }
  }
  busy = false;
  if (ok) save(); else render();
  if (bad && $("pst")) $("pst").textContent = bad + " price(s) could not be fetched";
}
document.addEventListener("click", e => { if (e.target.id === "rp") refreshPrices(); });
