const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const scope = "https://example.test/nurse-lattice-rn/";
const root = path.resolve(__dirname, "..");
const handlers = {};
const stores = new Map();
let offline = false, skipped = false, claimed = false;
const absolute = input => new URL(typeof input === "string" ? input : input.url, scope).href;
const network = async input => {
  if (offline) throw Error("Offline");
  let name = new URL(absolute(input)).pathname.slice(new URL(scope).pathname.length) || "index.html";
  const file = path.join(root, name);
  return fs.existsSync(file) && fs.statSync(file).isFile()
    ? new Response(fs.readFileSync(file)) : new Response("Not found", { status: 404 });
};
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async addAll(items) {
        const responses = await Promise.all(items.map(async item => {
          const response = await network(item);
          assert.equal(response.ok, true, "All pre-cached resources must exist");
          return [absolute(item), response];
        }));
        for (const [key, response] of responses) entries.set(key, response);
      },
      async match(input, options = {}) {
        const url = absolute(input);
        const key = options.ignoreSearch ? [...entries.keys()].find(key => key.split("?")[0] === url.split("?")[0]) : url;
        return entries.get(key)?.clone();
      }
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); }
};
vm.runInNewContext(fs.readFileSync(path.join(root, "sw.js"), "utf8"), {
  URL, caches, fetch: network,
  self: { registration: { scope }, clients: { claim: async () => { claimed = true; } },
    skipWaiting: () => { skipped = true; }, addEventListener: (name, handler) => { handlers[name] = handler; } }
});
async function lifetime(name) {
  let work;
  handlers[name]({ waitUntil(promise) { work = promise; } });
  await work;
}
async function request(relative, extra = {}) {
  let work;
  handlers.fetch({ request: { url: new URL(relative, scope).href, method: "GET", ...extra },
    respondWith(promise) { work = promise; } });
  return work;
}
(async () => {
  await lifetime("install");
  assert.equal(skipped, false, "An update must not interrupt a quiz");
  const current = [...stores.keys()][0];
  assert.equal(stores.get(current).size, 152, "Shell, analytics, roadmap, all 70 lessons and 70 banks must be pre-cached");
  stores.set("another-app-v1", new Map());
  stores.set("rn-quest-v0.14.0", new Map());
  stores.set("rn-quest-/other-rn-app/-v0.14.0", new Map());
  await lifetime("activate");
  assert.ok(stores.has("another-app-v1"), "Do not erase another app's cache");
  assert.ok(stores.has("rn-quest-/other-rn-app/-v0.14.0"));
  assert.ok(!stores.has("rn-quest-v0.14.0"));
  assert.ok(claimed);
  assert.equal(await request("https://elsewhere.test/asset.js"), undefined);
  assert.equal(await request("../other-app/index.html"), undefined);
  assert.equal(await request("data/curriculum.json", { method: "POST" }), undefined);
  assert.equal(await request("version.json"), undefined, "Version checks must reach the network");
  const missing = await request("missing.json");
  assert.equal(missing.status, 404);
  assert.equal(stores.get(current).size, 152, "Do not cache failed or unknown responses");
  offline = true;
  const quiz = await request("data/quizzes/lesson-70.json?v=0.73.0");
  assert.equal((await quiz.json()).questions.length, 10);
  const page = await request("./", { mode: "navigate" });
  assert.ok((await page.text()).includes("NurseLattice RN Quest v0.73.0"));
  handlers.message({ data: { type: "SKIP_WAITING" } });
  assert.ok(skipped, "Only an explicit update action skips waiting");
  console.log("Service-worker checks passed: full offline coverage, cache isolation, failed-response exclusion and opt-in updates.");
})().catch(error => { console.error(error); process.exitCode = 1; });
