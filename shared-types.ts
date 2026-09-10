// Shared compile-time contracts for popup/background messages. These files use
// global declarations so Chrome can run their compiled JavaScript without a
// bundler or module loader.

interface ProtectionSettings {
  enabled: boolean;
  blockAdsAndTrackers: boolean;
  blockThirdPartyCookies: boolean;
  hideAdElements: boolean;
  hideCookieBanners: boolean;
  skipYouTubeAds: boolean;
  allowlistedSites: string[];
}

type ProtectionSettingName =
  | "enabled"
  | "blockAdsAndTrackers"
  | "blockThirdPartyCookies"
  | "hideAdElements"
  | "hideCookieBanners"
  | "skipYouTubeAds";

interface SetProtectionSettingMessage {
  kind: "SET_PROTECTION_SETTING";
  setting: ProtectionSettingName;
  enabled: boolean;
}

interface GetProtectionSettingsMessage {
  kind: "GET_PROTECTION_SETTINGS";
}

interface SetSiteAllowlistedMessage {
  kind: "SET_SITE_ALLOWLISTED";
  site: string;
  allowlisted: boolean;
}

interface GetPageSiteMessage {
  kind: "GET_PAGE_SITE";
}

type ExtensionMessage =
  | SetProtectionSettingMessage
  | GetProtectionSettingsMessage
  | SetSiteAllowlistedMessage
  | GetPageSiteMessage;

interface ProtectionSettingsResponse {
  settings: ProtectionSettings;
  error?: string;
}

interface PageSiteResponse {
  site?: string;
}
