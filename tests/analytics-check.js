const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}

const requests = [];
const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
const context = vm.createContext({
  console,
  Date,
  Uint8Array,
  Promise,
  Set,
  JSON,
  Number,
  String,
  URLSearchParams,
  localStorage,
  sessionStorage,
  location: { hostname: "nurselattice.github.io", search: "?utm_source=google" },
  navigator: { globalPrivacyControl: false, doNotTrack: "0" },
  document: { referrer: "", getElementById: () => null },
  crypto: { randomUUID: crypto.randomUUID, getRandomValues: array => crypto.webcrypto.getRandomValues(array) },
  fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, status: 201 }; },
  RN_APP_VERSION: "v0.55.0",
  window: { doNotTrack: "0" }
});
context.window.location = context.location;
context.window.crypto = context.crypto;
vm.runInContext(fs.readFileSync(path.join(root, "js/analytics.js"), "utf8"), context, { filename: "js/analytics.js" });
const run = source => vm.runInContext(source, context);

(async () => {
  await run("RNAnalytics.init(); rnAnalyticsQueue");
  assert.equal(requests.length, 1);
  const first = JSON.parse(requests[0].options.body);
  assert.equal(first.event_name, "page_view");
  assert.equal(first.source, "google");
  assert.ok(requests[0].url.endsWith("/rest/v1/rn_analytics_events"));
  assert.ok(requests[0].options.headers.apikey.startsWith("sb_publishable_"));

  await run('RNAnalytics.track("lesson_open", 38); rnAnalyticsQueue');
  const second = JSON.parse(requests[1].options.body);
  assert.equal(second.lesson_number, 38);
  assert.equal(second.visitor_id, first.visitor_id);
  assert.equal(second.visitor_day_id, first.visitor_day_id);
  assert.equal(second.session_id, first.session_id);

  for (const request of requests) {
    const fields = Object.keys(JSON.parse(request.options.body));
    for (const forbidden of ["user_id", "email", "score", "answer", "xp", "streak", "study_date", "url", "referrer"]) {
      assert.ok(!fields.includes(forbidden), "Anonymous payload must not include " + forbidden);
    }
  }

  const beforeUnknown = requests.length;
  assert.equal(await run('RNAnalytics.track("unknown_event")'), false);
  assert.equal(requests.length, beforeUnknown);
  run("RNAnalytics.setEnabled(false)");
  assert.equal(localStorage.getItem("rnQuestAnonymousAnalyticsVisitorV1"), null);
  assert.equal(await run('RNAnalytics.track("lesson_open", 1)'), false);
  assert.equal(requests.length, beforeUnknown);

  context.navigator.globalPrivacyControl = true;
  run("RNAnalytics.setEnabled(true)");
  await run("rnAnalyticsQueue");
  assert.equal(requests.length, beforeUnknown);

  const sql = fs.readFileSync(path.join(root, "supabase/rn_analytics_setup.sql"), "utf8");
  for (const marker of [
    "create table if not exists public.rn_analytics_events",
    "alter table public.rn_analytics_events enable row level security",
    "revoke all on table public.rn_analytics_events from anon, authenticated",
    "grant insert on table public.rn_analytics_events to anon",
    "create or replace view public.rn_analytics_daily_summary",
    "with (security_invoker = true)",
    "revoke all on table public.rn_analytics_daily_summary from anon, authenticated",
    "America/Los_Angeles"
  ]) assert.ok(sql.includes(marker), "Missing analytics SQL security marker: " + marker);

  console.log("Analytics checks passed: minimized events, privacy controls, RN-only storage keys, RLS and owner-only daily summary.");
})().catch(error => { console.error(error); process.exitCode = 1; });
