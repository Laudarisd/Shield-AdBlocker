"use strict";
function getRequiredElement(elementId) {
    const element = document.getElementById(elementId);
    if (element === null) {
        throw new Error(`Expected an element with id="${elementId}" in popup.html.`);
    }
    return element;
}
const popupPowerButton = getRequiredElement("powerToggle");
const popupPowerLabel = getRequiredElement("powerLabel");
const popupHeadline = getRequiredElement("statusHeadline");
const popupBlockedCount = getRequiredElement("blockedCount");
const popupRuleCount = getRequiredElement("ruleCount");
const popupSiteName = getRequiredElement("siteName");
const popupSiteToggle = getRequiredElement("siteToggle");
const popupFeatureInputs = Array.from(document.querySelectorAll("input[data-setting]"));
let popupCurrentSite;
let popupCurrentSettings;
function getMatchingAllowlistedSite(site, settings) {
    return settings.allowlistedSites.find((allowed) => site === allowed || site.endsWith(`.${allowed}`));
}
function renderSiteControl(settings) {
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
function renderProtectionSettings(settings) {
    popupPowerButton.classList.toggle("is-off", !settings.enabled);
    popupPowerButton.setAttribute("aria-checked", String(settings.enabled));
    popupPowerLabel.textContent = settings.enabled ? "On" : "Off";
    popupHeadline.textContent = settings.enabled ? "Protecting this browser" : "Protection paused";
    for (const input of popupFeatureInputs) {
        const setting = input.dataset.setting;
        input.checked = settings[setting];
        input.disabled = !settings.enabled;
    }
    renderSiteControl(settings);
}
async function discoverCurrentSite() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id === undefined)
            return;
        const response = await chrome.tabs.sendMessage(activeTab.id, { kind: "GET_PAGE_SITE" });
        popupCurrentSite = response.site;
    }
    catch {
        popupCurrentSite = undefined;
    }
}
async function requestSettingChange(setting, enabled) {
    const response = await chrome.runtime.sendMessage({
        kind: "SET_PROTECTION_SETTING",
        setting,
        enabled,
    });
    renderProtectionSettings(response.settings);
    await displayActiveRulesetCount();
}
async function displayBlockedCount() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id === undefined) {
            popupBlockedCount.textContent = "0";
            return;
        }
        const badgeText = await chrome.action.getBadgeText({ tabId: activeTab.id });
        popupBlockedCount.textContent = badgeText || "0";
    }
    catch {
        popupBlockedCount.textContent = "0";
    }
}
async function displayActiveRulesetCount() {
    try {
        const enabledRulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
        popupRuleCount.textContent = enabledRulesets.length
            ? `${enabledRulesets.length} network rule set${enabledRulesets.length === 1 ? "" : "s"} active`
            : "network rules disabled";
    }
    catch {
        popupRuleCount.textContent = "";
    }
}
async function initializePopup() {
    await discoverCurrentSite();
    const response = await chrome.runtime.sendMessage({ kind: "GET_PROTECTION_SETTINGS" });
    renderProtectionSettings(response.settings);
    await Promise.all([displayBlockedCount(), displayActiveRulesetCount()]);
}
popupSiteToggle.addEventListener("click", () => {
    if (popupCurrentSite === undefined || popupCurrentSettings === undefined)
        return;
    const matchingSite = getMatchingAllowlistedSite(popupCurrentSite, popupCurrentSettings);
    const nextAllowlisted = matchingSite === undefined;
    popupSiteToggle.disabled = true;
    void chrome.runtime
        .sendMessage({
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
        const setting = input.dataset.setting;
        void requestSettingChange(setting, input.checked).catch(() => initializePopup());
    });
}
void initializePopup();
