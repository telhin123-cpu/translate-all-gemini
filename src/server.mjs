/**
 * Server-side script for translate-all-gemini.
 * Runs in Node.js context on the Foundry server.
 * Handles proxied HTTP requests to bypass browser CORS restrictions.
 */

const MODULE_ID = "translate-all-gemini";

Hooks.once("ready", () => {
  game.socket.on(`module.${MODULE_ID}`, async (data, respond) => {
    if (data?.action !== "proxyFetch") return;

    const { url, method, headers, body } = data.payload;

    try {
      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      respond({ ok: res.ok, status: res.status, body: text });
    } catch (err) {
      respond({ ok: false, status: 0, body: String(err) });
    }
  });
});
