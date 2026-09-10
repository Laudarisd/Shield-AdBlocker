"use strict";
// restore-scroll-after-hiding-banner.ts
//
// hide-cookie-banners.css makes the banner invisible, but some sites' own
// JavaScript separately locks page scrolling (by adding a class like
// "no-scroll" to <body>, or setting overflow:hidden directly) whenever
// their banner is showing — and that lock doesn't know or care that we've
// hidden the banner. Without this, a user could end up on a page that
// LOOKS normal but can't be scrolled. This removes only vendor-specific
// lock classes, and only while a recognized vendor banner exists. Generic
// modal classes and inline overflow styles are deliberately left alone.
//
// Watches only the class/style attributes on <html> and <body> for six seconds,
// then disconnects. This avoids repeatedly polling every page.
const COOKIE_BANNER_SELECTORS = [
    "#onetrust-banner-sdk",
    "#CybotCookiebotDialog",
    ".qc-cmp2-container",
    ".truste_overlay",
    ".osano-cm-window",
];
const VENDOR_SCROLL_LOCK_CLASS_NAMES = [
    "ot-overflow-hidden",
    "cookiebot-overflow-hidden",
];
function removeScrollLockClasses() {
    if (document.documentElement.classList.contains("simple-shield-disabled") ||
        document.documentElement.classList.contains("simple-shield-cookie-banners-disabled"))
        return;
    if (!document.querySelector(COOKIE_BANNER_SELECTORS.join(",")))
        return;
    for (const element of [document.documentElement, document.body]) {
        if (element === null)
            continue;
        for (const className of VENDOR_SCROLL_LOCK_CLASS_NAMES) {
            element.classList.remove(className);
        }
    }
}
const STOP_CHECKING_AFTER_MS = 6000;
const scrollLockObserver = new MutationObserver(removeScrollLockClasses);
for (const scrollRoot of [document.documentElement, document.body]) {
    if (scrollRoot !== null) {
        scrollLockObserver.observe(scrollRoot, {
            attributes: true,
            attributeFilter: ["class", "style"],
        });
    }
}
removeScrollLockClasses();
window.setTimeout(() => scrollLockObserver.disconnect(), STOP_CHECKING_AFTER_MS);
