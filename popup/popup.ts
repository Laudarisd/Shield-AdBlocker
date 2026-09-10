function getRequiredElement<T extends HTMLElement>(elementId: string): T {
  const element = document.getElementById(elementId);
  if (element === null) {
    throw new Error(`Expected an element with id="${elementId}" in popup.html.`);
  }
  return element as T;
}

const popupPowerButton = getRequiredElement<HTMLButtonElement>("powerToggle");
const popupPowerLabel = getRequiredElement<HTMLSpanElement>("powerLabel");
const popupHeadline = getRequiredElement<HTMLHeadingElement>("statusHeadline");
const popupBlockedCount = getRequiredElement<HTMLSpanElement>("blockedCount");
const popupRuleCount = getRequiredElement<HTMLElement>("ruleCount");
const popupSiteName = getRequiredElement<HTMLElement>("siteName");
const popupSiteToggle = getRequiredElement<HTMLButtonElement>("siteToggle");
const popupFeatureInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>("input[data-setting]"),
);

let popupCurrentSite: string | undefined;
let popupCurrentSettings: ProtectionSettings | undefined;

function getMatchingAllowlistedSite(
  site: string,
  settings: ProtectionSettings,
): string | undefined {
  return settings.allowlistedSites.find(
    (allowed) => site === allowed || site.endsWith(`.${allowed}`),
  );
}

function renderSiteControl(settings: ProtectionSettings): void {
  popupCurrentSettings = settings;
  if (popupCurrentSite === undefined) {
    popupSiteName.textContent = "Unavailable on this page";
    popupSiteToggle.disabled = true;
    return;
  }

  const allowlisted = getMatchingAllowlistedSite(popupCurrentSite, settings) !== undefined;
  popupSiteName.textContent = popupCurrentSite;
  popupSiteName.title = popupCurrentSite;
  popupSiteToggle.disabled = false;
  popupSiteToggle.textContent = allowlisted ? "Resume here" : "Pause here";
  popupSiteToggle.classList.toggle("is-allowlisted", allowlisted);
}

function renderProtectionSettings(settings: ProtectionSettings): void {
  popupPowerButton.classList.toggle("is-off", !settings.enabled);
  popupPowerButton.setAttribute("aria-checked", String(settings.enabled));
  popupPowerLabel.textContent = settings.enabled ? "On" : "Off";
  popupHeadline.textContent = settings.enabled ? "Protecting this browser" : "Protection paused";

  for (const input of popupFeatureInputs) {
    const setting = input.dataset.setting as Exclude<ProtectionSettingName, "enabled">;
    input.checked = settings[setting];
    input.disabled = !settings.enabled;
  }
  renderSiteControl(settings);
}

async function discoverCurrentSite(): Promise<void> {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id === undefined) return;
    const response = await chrome.tabs.sendMessage<GetPageSiteMessage, PageSiteResponse>(
      activeTab.id,
      { kind: "GET_PAGE_SITE" },
    );
    popupCurrentSite = response.site;
  } catch {
    popupCurrentSite = undefined;
  }
}

async function requestSettingChange(
  setting: ProtectionSettingName,
  enabled: boolean,
): Promise<void> {
  const response = await chrome.runtime.sendMessage<
    SetProtectionSettingMessage,
    ProtectionSettingsResponse
  >({
    kind: "SET_PROTECTION_SETTING",
    setting,
    enabled,
  });
  renderProtectionSettings(response.settings);
  await displayActiveRulesetCount();
}

async function displayBlockedCount(): Promise<void> {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id === undefined) {
      popupBlockedCount.textContent = "0";
      return;
    }
    const badgeText = await chrome.action.getBadgeText({ tabId: activeTab.id });
    popupBlockedCount.textContent = badgeText || "0";
  } catch {
    popupBlockedCount.textContent = "0";
  }
}

async function displayActiveRulesetCount(): Promise<void> {
  try {
    const enabledRulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
    popupRuleCount.textContent = enabledRulesets.length
      ? `${enabledRulesets.length} network rule set${enabledRulesets.length === 1 ? "" : "s"} active`
      : "network rules disabled";
  } catch {
    popupRuleCount.textContent = "";
  }
}

async function initializePopup(): Promise<void> {
  await discoverCurrentSite();
  const response = await chrome.runtime.sendMessage<
    GetProtectionSettingsMessage,
    ProtectionSettingsResponse
  >({ kind: "GET_PROTECTION_SETTINGS" });
  renderProtectionSettings(response.settings);
  await Promise.all([displayBlockedCount(), displayActiveRulesetCount()]);
}

popupSiteToggle.addEventListener("click", () => {
  if (popupCurrentSite === undefined || popupCurrentSettings === undefined) return;
  const matchingSite = getMatchingAllowlistedSite(popupCurrentSite, popupCurrentSettings);
  const nextAllowlisted = matchingSite === undefined;
  popupSiteToggle.disabled = true;
  void chrome.runtime
    .sendMessage<SetSiteAllowlistedMessage, ProtectionSettingsResponse>({
      kind: "SET_SITE_ALLOWLISTED",
      site: matchingSite ?? popupCurrentSite,
      allowlisted: nextAllowlisted,
    })
    .then(async (response) => {
      renderProtectionSettings(response.settings);
      await displayActiveRulesetCount();
    })
    .catch(() => initializePopup());
});

popupPowerButton.addEventListener("click", () => {
  const nextEnabled = popupPowerButton.classList.contains("is-off");
  void requestSettingChange("enabled", nextEnabled).catch(() => initializePopup());
});

for (const input of popupFeatureInputs) {
  input.addEventListener("change", () => {
    const setting = input.dataset.setting as Exclude<ProtectionSettingName, "enabled">;
    void requestSettingChange(setting, input.checked).catch(() => initializePopup());
  });
}

void initializePopup();
