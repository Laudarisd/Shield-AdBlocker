// CSS is the cheapest way to hide page elements. Root classes let the popup
// enable each cosmetic feature without injecting/removing styles repeatedly.

const CONTENT_MASTER_DISABLED_CLASS = "simple-shield-disabled";
const CONTENT_AD_ELEMENTS_DISABLED_CLASS = "simple-shield-ad-elements-disabled";
const CONTENT_COOKIE_BANNERS_DISABLED_CLASS = "simple-shield-cookie-banners-disabled";
const CONTENT_YOUTUBE_DISABLED_CLASS = "simple-shield-youtube-disabled";

const CONTENT_DEFAULT_SETTINGS = {
  enabled: true,
  hideAdElements: true,
  hideCookieBanners: true,
  skipYouTubeAds: true,
  allowlistedSites: [] as string[],
};

function isCurrentSiteAllowlisted(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const hostname = location.hostname.toLowerCase().replace(/^www\./, "");
  return value.some(
    (site) =>
      typeof site === "string" &&
      (hostname === site || hostname.endsWith(`.${site}`)),
  );
}

function applyPageProtectionClasses(stored: Record<string, unknown>): void {
  const root = document.documentElement;
  root.classList.toggle(
    CONTENT_MASTER_DISABLED_CLASS,
    stored.enabled === false || isCurrentSiteAllowlisted(stored.allowlistedSites),
  );
  root.classList.toggle(CONTENT_AD_ELEMENTS_DISABLED_CLASS, stored.hideAdElements === false);
  root.classList.toggle(CONTENT_COOKIE_BANNERS_DISABLED_CLASS, stored.hideCookieBanners === false);
  root.classList.toggle(CONTENT_YOUTUBE_DISABLED_CLASS, stored.skipYouTubeAds === false);
}

async function refreshPageProtectionClasses(): Promise<void> {
  const stored = await chrome.storage.local.get(CONTENT_DEFAULT_SETTINGS);
  applyPageProtectionClasses(stored);
}

// Disable cosmetic rules until the saved state arrives, preventing protection
// from briefly running on a page when the user has turned it off.
document.documentElement.classList.add(
  CONTENT_MASTER_DISABLED_CLASS,
  CONTENT_AD_ELEMENTS_DISABLED_CLASS,
  CONTENT_COOKIE_BANNERS_DISABLED_CLASS,
  CONTENT_YOUTUBE_DISABLED_CLASS,
);

void refreshPageProtectionClasses();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    ["enabled", "hideAdElements", "hideCookieBanners", "skipYouTubeAds", "allowlistedSites"].some(
      (key) => changes[key] !== undefined,
    )
  ) {
    void refreshPageProtectionClasses();
  }
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: PageSiteResponse) => void) => {
    if (message.kind !== "GET_PAGE_SITE") return false;
    const site = location.hostname.toLowerCase().replace(/^www\./, "");
    sendResponse({ site: site || undefined });
    return false;
  },
);
