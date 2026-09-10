const endpoint = process.argv[2] || "http://127.0.0.1:9333";

async function findPopupTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      const popup = targets.find(
        (target) => target.type === "page" && target.url.endsWith("/popup/popup.html"),
      );
      if (popup) return popup;
    } catch {
      // The browser may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Shield popup target was not found");
}

async function evaluate(target) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Timed out waiting for the popup result"));
    }, 10000);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        id: 1,
        method: "Page.reload",
        params: { ignoreCache: true },
      }));
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id === 1) {
        setTimeout(() => socket.send(JSON.stringify({
        id: 2,
        method: "Runtime.evaluate",
        params: {
          expression: `(async () => {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            if (typeof chrome === "undefined" || typeof chrome.runtime === "undefined") {
              return {
                chromeAvailable: false,
                location: document.location.href,
                title: document.title
              };
            }
            const response = await chrome.runtime.sendMessage({ kind: "GET_PROTECTION_SETTINGS" });
            return {
              chromeAvailable: true,
              headline: document.querySelector("#statusHeadline")?.textContent,
              ruleCount: document.querySelector("#ruleCount")?.textContent,
              siteControlPresent: Boolean(document.querySelector("#siteToggle")),
              allowlistedSites: response.settings.allowlistedSites,
              error: response.error
            };
          })()`,
          awaitPromise: true,
          returnByValue: true,
        },
      })), 500);
      }
      if (message.id !== 2) return;
      clearTimeout(timeout);
      socket.close();
      if (message.result?.exceptionDetails) {
        reject(new Error(message.result.exceptionDetails.text || "Popup evaluation failed"));
        return;
      }
      resolve(message.result.result.value);
    });
    socket.addEventListener("error", () => reject(new Error("DevTools WebSocket failed")));
  });
}

(async () => {
  const result = await evaluate(await findPopupTarget());
  if (!result.chromeAvailable) {
    throw new Error(`Extension API context unavailable at ${result.location} (${result.title})`);
  }
  if (result.headline !== "Protecting this browser") throw new Error("Popup did not initialize");
  if (result.ruleCount !== "2 network rule sets active") throw new Error("Rulesets were not active");
  if (!result.siteControlPresent) throw new Error("Per-site control is missing");
  if (!Array.isArray(result.allowlistedSites)) throw new Error("Settings response is invalid");
  if (result.error) throw new Error(result.error);
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
