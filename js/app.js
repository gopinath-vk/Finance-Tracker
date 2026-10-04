// Boot: runs last, after every tab has registered itself.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
render();
