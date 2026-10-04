// Google Drive sync (private app folder; only this app can see it) and automatic sync when online.
let tokenExp = 0, fileId = null;
const FILE = "ledger-data.json", API = "https://www.googleapis.com";
function status(m){ $("st").textContent = m; }

$("sync").onclick = () => {
  if (CLIENT_ID.startsWith("PASTE")) return alert("Add your Google Client ID at the top of index.html first.");
  if (!window.google) return alert("Google sign-in is still loading. Try again in a moment.");
  getToken(true).then(pull).catch(() => status("Sync failed"));
};

function getToken(interactive){
  return new Promise((ok, no) => {
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: "https://www.googleapis.com/auth/drive.appdata",
      prompt: interactive ? "" : "none",
      callback: r => { if (r.access_token) { token = r.access_token; tokenExp = Date.now() + (r.expires_in - 60) * 1000; localStorage.setItem("ledger-sync","1"); $("sync").textContent = "Synced with Drive"; ok(); } else no(r); }
    }).requestAccessToken();
  });
}
async function drive(path, opt = {}){
  if (Date.now() > tokenExp) await getToken(false);
  const r = await fetch(API + path, {...opt, headers: {Authorization: "Bearer " + token, ...(opt.headers||{})}});
  if (!r.ok) throw new Error(r.status);
  return r;
}
async function pull(){
  status("Syncing…");
  const q = await (await drive(`/drive/v3/files?spaces=appDataFolder&q=name='${FILE}'&fields=files(id)`)).json();
  fileId = q.files[0] && q.files[0].id;
  if (fileId) {
    const remote = await (await drive(`/drive/v3/files/${fileId}?alt=media`)).json();
    if (remote.updatedAt > db.updatedAt) { db = remote; localStorage.setItem(KEY, JSON.stringify(db)); render(); status("Loaded from Drive"); return; }
  }
  await push();
}
async function push(){
  try {
    const meta = fileId ? {} : {name: FILE, parents: ["appDataFolder"]};
    const b = "x" + Date.now();
    const body = `--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(db)}\r\n--${b}--`;
    const r = await drive(`/upload/drive/v3/files${fileId ? "/" + fileId : ""}?uploadType=multipart&fields=id`, {
      method: fileId ? "PATCH" : "POST", headers: {"Content-Type": "multipart/related; boundary=" + b}, body });
    fileId = (await r.json()).id;
    status("Saved to Drive " + new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));
  } catch(e){ status("Drive save failed"); }
}
window.addEventListener("load", () => { if (localStorage.getItem("ledger-sync")) $("sync").textContent = "Reconnect Drive"; });
async function autoSync(){
  if (!navigator.onLine) return;
  if (localStorage.getItem("ledger-sync") && window.google) { try { await getToken(false); await pull(); } catch(e){ status("Saved on this device. Tap Reconnect Drive to sync."); } }
  refreshPrices();
}
window.addEventListener("online", autoSync);
document.addEventListener("visibilitychange", () => { if (!document.hidden) autoSync(); });
window.addEventListener("load", () => setTimeout(autoSync, 1500));
