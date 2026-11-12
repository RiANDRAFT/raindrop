// Runs user-supplied widget code in an isolated (opaque-origin) manifest sandbox page.
// No chrome.* APIs, no access to Raindrop storage or keys. The host page posts the HTML once.
addEventListener("message", (e) => {
  if (e.source !== parent || !e.data || typeof e.data.html !== "string") return;
  document.open();
  document.write('<!doctype html><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0;height:100%;background:transparent;color:#e8f1ff;font:14px system-ui,sans-serif}</style>' + e.data.html);
  document.close();
});
parent.postMessage({ ready: true }, "*");
