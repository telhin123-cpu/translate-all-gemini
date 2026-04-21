/**
 * Server-side script for translate-all-gemini.
 * Runs in Node.js context on the Foundry server.
 * Handles proxied HTTP requests to bypass browser CORS restrictions.
 *
 * Uses request/response pattern with requestId since Foundry v13
 * does not support socket.emit acknowledgement callbacks.
 */

const MODULE_ID = "translate-all-gemini";

console.log("[translate-all-gemini] server.mjs loaded");

Hooks.once("ready", () => {
  game.socket.on(`module.${MODULE_ID}`, async (data) => {
    if (data?.action !== "proxyFetch") return;

    const { requestId, payload } = data;
    const { url, method, headers, body } = payload;

    let result;
    try {
      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      result = { ok: res.ok, status: res.status, body: text };
    } catch (err) {
      result = { ok: false, status: 0, body: String(err) };
    }

    // Respond back to all clients — client filters by requestId
    game.socket.emit(`module.${MODULE_ID}`, {
      action: "proxyFetchResponse",
      requestId,
      result,
    });
  });
});
