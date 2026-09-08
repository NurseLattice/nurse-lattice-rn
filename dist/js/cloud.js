const RN_CLOUD_CONFIG = Object.freeze({
  url: "",
  publishableKey: ""
});

function rnCloudIsConfigured() {
  return Boolean(RN_CLOUD_CONFIG.url && RN_CLOUD_CONFIG.publishableKey);
}

const RNCloud = Object.freeze({ isConfigured: rnCloudIsConfigured });
if (typeof window !== "undefined") window.RNCloud = RNCloud;
if (typeof module !== "undefined") module.exports = RNCloud;

