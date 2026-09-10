const RN_ANALYTICS_CONFIG = Object.freeze({
  url: "https://dmdkfyvrjfbcyuebhcop.supabase.co",
  publishableKey: "sb_publishable_6pMsqtMdX_eDG5BIu8GkxQ_dTYq3bF1"
});
const RN_ANALYTICS_TABLE = "rn_analytics_events";
const RN_ANALYTICS_OPT_OUT_KEY = "rnQuestAnonymousAnalyticsOptOutV1";
const RN_ANALYTICS_VISITOR_KEY = "rnQuestAnonymousAnalyticsVisitorV1";
const RN_ANALYTICS_VISITOR_DAY_KEY = "rnQuestAnonymousAnalyticsVisitorDayV1";
const RN_ANALYTICS_SESSION_KEY = "rnQuestAnonymousAnalyticsSessionV1";
const RN_ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const RN_ANALYTICS_EVENTS = new Set(["page_view", "lesson_open", "lesson_quiz_start", "lesson_quiz_complete", "practice_complete"]);
let rnAnalyticsInitialized = false;
let rnAnalyticsQueue = Promise.resolve();
let rnAnalyticsEphemeralVisitorId = "";
let rnAnalyticsEphemeralSessionId = "";

function rnAnalyticsStorageGet(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
function rnAnalyticsStorageSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (error) { return false; } }
function rnAnalyticsStorageRemove(key) { try { localStorage.removeItem(key); } catch (error) { /* Storage is optional. */ } }
function rnAnalyticsSessionGet(key) { try { return sessionStorage.getItem(key); } catch (error) { return null; } }
function rnAnalyticsSessionSet(key, value) { try { sessionStorage.setItem(key, value); return true; } catch (error) { return false; } }
function rnAnalyticsSessionRemove(key) { try { sessionStorage.removeItem(key); } catch (error) { /* Storage is optional. */ } }

function rnAnalyticsLocalDate(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function rnAnalyticsProductionHost() {
  return typeof location !== "undefined" && location.hostname === "nurselattice.github.io";
}

function rnAnalyticsPrivacySignalEnabled() {
  return typeof navigator !== "undefined" && (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1") ||
    typeof window !== "undefined" && window.doNotTrack === "1";
}

function rnAnalyticsEnabled() {
  return rnAnalyticsProductionHost() && !rnAnalyticsPrivacySignalEnabled() && rnAnalyticsStorageGet(RN_ANALYTICS_OPT_OUT_KEY) !== "1";
}

function rnAnalyticsCreateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

function rnAnalyticsValidId(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || ""); }

function rnAnalyticsVisitorId() {
  const saved = rnAnalyticsStorageGet(RN_ANALYTICS_VISITOR_KEY);
  if (rnAnalyticsValidId(saved)) return saved;
  if (rnAnalyticsValidId(rnAnalyticsEphemeralVisitorId)) return rnAnalyticsEphemeralVisitorId;
  const id = rnAnalyticsCreateId();
  if (!rnAnalyticsStorageSet(RN_ANALYTICS_VISITOR_KEY, id)) rnAnalyticsEphemeralVisitorId = id;
  return id;
}

function rnAnalyticsVisitorDayId() {
  const today = rnAnalyticsLocalDate();
  try {
    const saved = JSON.parse(rnAnalyticsStorageGet(RN_ANALYTICS_VISITOR_DAY_KEY) || "null");
    if (saved?.date === today && rnAnalyticsValidId(saved.id)) return saved.id;
  } catch (error) { /* Replace invalid local data. */ }
  const id = rnAnalyticsCreateId();
  rnAnalyticsStorageSet(RN_ANALYTICS_VISITOR_DAY_KEY, JSON.stringify({ date: today, id }));
  return id;
}

function rnAnalyticsSessionId() {
  const now = Date.now();
  try {
    const saved = JSON.parse(rnAnalyticsSessionGet(RN_ANALYTICS_SESSION_KEY) || "null");
    if (rnAnalyticsValidId(saved?.id) && Number.isFinite(saved?.lastSeen) && now >= saved.lastSeen && now - saved.lastSeen <= RN_ANALYTICS_SESSION_TIMEOUT_MS) {
      rnAnalyticsSessionSet(RN_ANALYTICS_SESSION_KEY, JSON.stringify({ id: saved.id, lastSeen: now }));
      return saved.id;
    }
  } catch (error) { /* Replace invalid session data. */ }
  const id = rnAnalyticsCreateId();
  if (!rnAnalyticsSessionSet(RN_ANALYTICS_SESSION_KEY, JSON.stringify({ id, lastSeen: now }))) rnAnalyticsEphemeralSessionId = id;
  return id;
}

function rnAnalyticsNormalizeSource(value) {
  const source = String(value || "").trim().toLowerCase();
  if (!source) return "direct";
  if (source.includes("facebook") || source === "fb") return "facebook";
  if (source.includes("instagram") || source === "ig") return "instagram";
  if (source.includes("google")) return "google";
  if (source.includes("linkedin")) return "linkedin";
  return "other";
}

function rnAnalyticsSource() {
  try {
    const campaignSource = new URLSearchParams(location.search || "").get("utm_source");
    if (campaignSource) return rnAnalyticsNormalizeSource(campaignSource);
  } catch (error) { /* Fall back to the referrer category. */ }
  return rnAnalyticsNormalizeSource(typeof document !== "undefined" ? document.referrer : "");
}

function rnAnalyticsLessonNumber(value) {
  const lessonNumber = Number(value);
  return Number.isInteger(lessonNumber) && lessonNumber >= 1 && lessonNumber <= 184 ? lessonNumber : null;
}

function rnAnalyticsTrack(eventName, lessonNumber = null) {
  if (!rnAnalyticsEnabled() || !RN_ANALYTICS_EVENTS.has(eventName)) return Promise.resolve(false);
  const payload = {
    event_name: eventName,
    visitor_id: rnAnalyticsVisitorId(),
    visitor_day_id: rnAnalyticsVisitorDayId(),
    session_id: rnAnalyticsSessionId(),
    source: rnAnalyticsSource(),
    app_version: typeof RN_APP_VERSION === "string" ? RN_APP_VERSION : "unknown"
  };
  const normalizedLesson = rnAnalyticsLessonNumber(lessonNumber);
  if (normalizedLesson !== null) payload.lesson_number = normalizedLesson;
  const task = rnAnalyticsQueue.catch(() => false).then(async () => {
    try {
      const response = await fetch(RN_ANALYTICS_CONFIG.url + "/rest/v1/" + RN_ANALYTICS_TABLE, {
        method: "POST",
        headers: {
          apikey: RN_ANALYTICS_CONFIG.publishableKey,
          Authorization: "Bearer " + RN_ANALYTICS_CONFIG.publishableKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
      if (!response.ok) console.warn("Anonymous usage event was not recorded", response.status);
      return response.ok;
    } catch (error) {
      console.warn("Anonymous usage statistics are temporarily unavailable");
      return false;
    }
  });
  rnAnalyticsQueue = task;
  return task;
}

function rnAnalyticsUpdatePrivacyUI() {
  const status = document.getElementById("anonymousAnalyticsStatus");
  const button = document.getElementById("anonymousAnalyticsToggle");
  if (status) status.textContent = rnAnalyticsEnabled() ? "Anonymous usage statistics are on for this browser." : "Anonymous usage statistics are off for this browser.";
  if (button) button.textContent = rnAnalyticsEnabled() ? "Turn off anonymous statistics" : "Turn on anonymous statistics";
}

function rnAnalyticsSetEnabled(enabled) {
  if (enabled) rnAnalyticsStorageRemove(RN_ANALYTICS_OPT_OUT_KEY);
  else {
    rnAnalyticsStorageSet(RN_ANALYTICS_OPT_OUT_KEY, "1");
    rnAnalyticsStorageRemove(RN_ANALYTICS_VISITOR_KEY);
    rnAnalyticsStorageRemove(RN_ANALYTICS_VISITOR_DAY_KEY);
    rnAnalyticsSessionRemove(RN_ANALYTICS_SESSION_KEY);
    rnAnalyticsEphemeralVisitorId = "";
    rnAnalyticsEphemeralSessionId = "";
  }
  rnAnalyticsUpdatePrivacyUI();
  if (enabled) rnAnalyticsTrack("page_view");
}

function rnAnalyticsToggle() { rnAnalyticsSetEnabled(!rnAnalyticsEnabled()); }

function rnAnalyticsInit() {
  if (rnAnalyticsInitialized) return;
  rnAnalyticsInitialized = true;
  rnAnalyticsUpdatePrivacyUI();
  document.getElementById("anonymousAnalyticsToggle")?.addEventListener("click", rnAnalyticsToggle);
  rnAnalyticsTrack("page_view");
}

const RNAnalytics = Object.freeze({ enabled: rnAnalyticsEnabled, init: rnAnalyticsInit, setEnabled: rnAnalyticsSetEnabled, track: rnAnalyticsTrack });
if (typeof window !== "undefined") window.RNAnalytics = RNAnalytics;
if (typeof module !== "undefined") module.exports = RNAnalytics;
