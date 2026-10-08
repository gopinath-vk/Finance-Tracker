// Live prices: stocks/ETFs via Yahoo Finance, mutual funds via mfapi.in, gold via a public spot-price API,
// US stocks/ETFs (Smallcase-style holdings, or overseas direct) also via Yahoo Finance — all routed through
// a public CORS relay. Gold and US prices are best-effort: free sources are less reliable than the NSE/mfapi
// ones, so a failure just keeps the last known price, same as any failed quote.
const RELAY = u => fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(u)).then(r => r.json());
const FX_FALLBACK = 88; // used only if we've never fetched a real rate yet

async function fxRate(){
  if (db.fxRate && Date.now() - (db.fxRateAt||0) < 6*3600*1000) return db.fxRate; // reuse a rate fetched in the last 6h
  try { const r = await RELAY("https://open.er-api.com/v6/latest/USD"); db.fxRate = r.rates.INR; db.fxRateAt = Date.now(); } catch(e){}
  return db.fxRate || FX_FALLBACK;
}
async function quote(i){
  if (i.kind === "mf") { const r = await (await fetch(`https://api.mfapi.in/mf/${i.sym}/latest`)).json(); return +r.data[0].nav; }
  if (i.kind === "gold") {
    const [fx, spot] = await Promise.all([fxRate(), RELAY("https://api.gold-api.com/price/XAU")]);
    return spot.price * fx / 31.1034768;
  }
  if (i.kind === "us") {
    const [fx, r] = await Promise.all([fxRate(), RELAY(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(i.sym.toUpperCase())}?interval=1d&range=1d`)]);
    return r.chart.result[0].meta.regularMarketPrice * fx;
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
