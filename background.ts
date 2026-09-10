// Event-driven Manifest V3 service worker. Chrome suspends it while idle, so it
// consumes no persistent background memory between startup, popup, and install
// events.

const BACKGROUND_AD_RULESET_ID = "block_ads_and_trackers";
const BACKGROUND_COOKIE_RULESET_ID = "block_third_party_cookies";
const BACKGROUND_RULESET_IDS = [BACKGROUND_AD_RULESET_ID, BACKGROUND_COOKIE_RULESET_ID];

const BACKGROUND_DEFAULT_SETTINGS: ProtectionSettings = {
  enabled: true,
  blockAdsAndTrackers: true,
  blockThirdPartyCookies: true,
  hideAdElements: true,
  hideCookieBanners: true,
  skipYouTubeAds: true,
  allowlistedSites: [],
};

const BOOLEAN_SETTING_NAMES = new Set<ProtectionSettingName>([
  "enabled",
  "blockAdsAndTrackers",
  "blockThirdPartyCookies",
  "hideAdElements",
  "hideCookieBanners",
  "skipYouTubeAds",
]);

const MAX_ALLOWLISTED_SITES = 1000;
const ALLOWLIST_RULE_PRIORITY = 10000;

function normalizeSite(site: string): string | null {
  const normalized = site.trim().toLowerCase().replace(/^www\./, "");
  if (
    normalized.length === 0 ||
    normalized.length > 253 ||
    normalized.includes("/") ||
    normalized.includes(":") ||
    !/^[a-z0-9.-]+$/.test(normalized) ||
    normalized.startsWith(".") ||
    normalized.endsWith(".") ||
    normalized.includes("..")
  ) {
    return null;
  }
  return normalized;
}

function sanitizeAllowlistedSites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((site): site is string => typeof site === "string")
        .map(normalizeSite)
        .filter((site): site is string => site !== null),
    ),
  )
    .sort()
    .slice(0, MAX_ALLOWLISTED_SITES);
}

async function getStoredProtectionSettings(): Promise<ProtectionSettings> {
  const stored = await chrome.storage.local.get(BACKGROUND_DEFAULT_SETTINGS);
  return {
    enabled: stored.enabled as boolean,
    blockAdsAndTrackers: stored.blockAdsAndTrackers as boolean,
    blockThirdPartyCookies: stored.blockThirdPartyCookies as boolean,
    hideAdElements: stored.hideAdElements as boolean,
    hideCookieBanners: stored.hideCookieBanners as boolean,
    skipYouTubeAds: stored.skipYouTubeAds as boolean,
    allowlistedSites: sanitizeAllowlistedSites(stored.allowlistedSites),
  };
}

async function applyAllowlistRules(sites: string[]): Promise<void> {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const addRules: chrome.declarativeNetRequest.Rule[] = sites.map((site, index) => ({
    id: index + 1,
    priority: ALLOWLIST_RULE_PRIORITY,
    action: {
      type: "allowAllRequests" as chrome.declarativeNetRequest.RuleActionType,
    },
    condition: {
      requestDomains: [site],
      resourceTypes: ["main_frame" as chrome.declarativeNetRequest.ResourceType],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRules.map((rule) => rule.id),
    addRules,
  });
}

async function applyProtectionSettings(settings: ProtectionSettings): Promise<void> {
  const enabledRuleSetIds: string[] = [];
  if (settings.enabled && settings.blockAdsAndTrackers) {
    enabledRuleSetIds.push(BACKGROUND_AD_RULESET_ID);
  }
  if (settings.enabled && settings.blockThirdPartyCookies) {
    enabledRuleSetIds.push(BACKGROUND_COOKIE_RULESET_ID);
  }

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabledRuleSetIds,
    disableRulesetIds: BACKGROUND_RULESET_IDS.filter((id) => !enabledRuleSetIds.includes(id)),
  });

  await chrome.action.setBadgeBackgroundColor({
    color: settings.enabled ? "#1FA966" : "#66766D",
  });

  await applyAllowlistRules(settings.allowlistedSites);
}

async function enableBlockedRequestBadgeCounter(): Promise<void> {
  try {
    await chrome.declarativeNetRequest.setExtensionActionOptions({
      displayActionCountAsBadgeText: true,
    });
  } catch (error) {
    console.warn("Shield: badge counter feature unavailable:", error);
  }
}

async function initializeProtection(): Promise<void> {
  const settings = await getStoredProtectionSettings();
  await applyProtectionSettings(settings);
  await enableBlockedRequestBadgeCounter();
}

chrome.runtime.onInstalled.addListener(() => {
  void initializeProtection();
});

chrome.runtime.onStartup.addListener(() => {
  void initializeProtection();
});

// Serializing setting writes prevents rapid clicks on two switches from racing
// and accidentally overwriting one another.
let backgroundSettingsQueue: Promise<void> = Promise.resolve();

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse: (response: ProtectionSettingsResponse) => void,
  ) => {
    if (message.kind === "GET_PROTECTION_SETTINGS") {
      getStoredProtectionSettings()
        .then((settings) => sendResponse({ settings }))
        .catch(() =>
          sendResponse({
            settings: BACKGROUND_DEFAULT_SETTINGS,
            error: "Could not read protection settings",
          }),
        );
      return true;
    }

    if (message.kind === "SET_PROTECTION_SETTING") {
      const requestedSetting = message.setting;
      const requestedValue = message.enabled;

      if (!BOOLEAN_SETTING_NAMES.has(requestedSetting) || typeof requestedValue !== "boolean") {
        sendResponse({ settings: BACKGROUND_DEFAULT_SETTINGS, error: "Invalid protection setting" });
        return false;
      }

      backgroundSettingsQueue = backgroundSettingsQueue.catch(() => undefined).then(async () => {
        let previousSettings = BACKGROUND_DEFAULT_SETTINGS;
        try {
          previousSettings = await getStoredProtectionSettings();
          const nextSettings = { ...previousSettings, [requestedSetting]: requestedValue };
          await applyProtectionSettings(nextSettings);
          await chrome.storage.local.set(nextSettings);
          sendResponse({ settings: nextSettings });
        } catch (error) {
          console.error("Shield: could not change protection settings:", error);
          sendResponse({ settings: previousSettings, error: "Could not save protection setting" });
        }
      });

      return true;
    }

    if (message.kind === "SET_SITE_ALLOWLISTED") {
      backgroundSettingsQueue = backgroundSettingsQueue.catch(() => undefined).then(async () => {
        let previousSettings = BACKGROUND_DEFAULT_SETTINGS;
        try {
          previousSettings = await getStoredProtectionSettings();
          const site = normalizeSite(message.site);
          if (site === null || typeof message.allowlisted !== "boolean") {
            sendResponse({ settings: previousSettings, error: "Invalid website" });
            return;
          }

          const sites = new Set(previousSettings.allowlistedSites);
          if (message.allowlisted) sites.add(site);
          else sites.delete(site);

          const nextSettings: ProtectionSettings = {
            ...previousSettings,
            allowlistedSites: Array.from(sites).sort().slice(0, MAX_ALLOWLISTED_SITES),
          };
          await applyProtectionSettings(nextSettings);
          await chrome.storage.local.set(nextSettings);
          sendResponse({ settings: nextSettings });
        } catch (error) {
          console.error("Shield: could not update the website allowlist:", error);
          sendResponse({ settings: previousSettings, error: "Could not update website allowlist" });
        }
      });
      return true;
    }

    return false;
  },
);
