// generate-rules.js
//
// Generates the two declarativeNetRequest rule files this extension ships:
//   rules/block-ads-and-trackers.json    (network-level ad/tracker blocking)
//   rules/block-third-party-cookies.json (strips third-party Set-Cookie headers)
//
// Plain Node.js (not TypeScript) on purpose — it's a one-off dev tool you
// run when you want to add a domain, not part of what ships in the browser,
// so there's no reason to add a compile step for it.
//
// TO ADD A DOMAIN: add it to the right category in AD_AND_TRACKER_DOMAINS
// below, then run: npm run generate-rules

const fs = require("fs");
const path = require("path");

const AD_AND_TRACKER_DOMAINS = {
  "Google ad/tracking": [
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    "google-analytics.com", "googletagmanager.com", "googletagservices.com",
    "adservice.google.com",
  ],
  "Major ad exchanges/networks": [
    "adnxs.com", "rubiconproject.com", "pubmatic.com", "openx.net",
    "casalemedia.com", "criteo.com", "criteo.net", "adsrvr.org",
    "bidswitch.net", "media.net", "smartadserver.com", "yieldmo.com",
    "sharethrough.com", "sovrn.com", "adform.net", "advertising.com",
    "spotxchange.com", "improvedigital.com", "gumgum.com", "33across.com",
    "indexexchange.com", "sonobi.com", "triplelift.com", "contextweb.com",
  ],
  "Native / content ads": [
    "outbrain.com", "taboola.com", "revcontent.com", "mgid.com",
    "content.ad", "nativo.com", "adblade.com",
  ],
  "Pop/redirect ad networks": [
    "propellerads.com", "popads.net", "poptm.com", "adcash.com",
    "exoclick.com", "juicyads.com", "trafficjunky.com", "adsterra.com",
  ],
  "Mobile / in-app ads": [
    "unityads.unity3d.com", "applovin.com", "chartboost.com", "vungle.com",
    "adcolony.com", "ironsource.com", "inmobi.com", "startapp.com",
    "mopub.com", "flurry.com", "tapjoy.com",
  ],
  "Analytics / tracking pixels": [
    "scorecardresearch.com", "quantserve.com", "moatads.com",
    "adsafeprotected.com", "amazon-adsystem.com", "bluekai.com",
    "demdex.net", "krxd.net", "mathtag.com", "rlcdn.com", "agkn.com",
    "adroll.com", "chango.com", "turn.com", "crwdcntrl.net",
    "tapad.com", "exelator.com", "eyeota.net", "lijit.com",
  ],
  "Social widget trackers": [
    "connect.facebook.net", "ads-twitter.com", "analytics.twitter.com",
    "ads.linkedin.com", "snap.licdn.com", "ads.pinterest.com", "ct.pinterest.com",
  ],
  "Video ad servers": [
    "2mdn.net", "aniview.com", "springserve.com", "imasdk.googleapis.com",
    "innovid.com", "freewheel.tv", "adswizz.com",
  ],
};

// Path-based patterns keep a hostname anchor plus a path prefix. This avoids
// matching another site's URL merely because its query text mentions Facebook.
const PATH_BASED_RULES = [
  { urlFilter: "||facebook.com/tr", note: "Meta (Facebook) tracking pixel" },
  { urlFilter: "||youtube.com/api/stats/ads", note: "YouTube ad telemetry" },
  { urlFilter: "||youtube.com/pagead/", note: "YouTube page-ad requests" },
  { urlFilter: "||youtube.com/get_midroll_info", note: "YouTube mid-roll metadata" },
  { urlFilter: "||youtube-nocookie.com/api/stats/ads", note: "YouTube embed ad telemetry" },
];

const BLOCKED_RESOURCE_TYPES = [
  "script", "image", "xmlhttprequest", "sub_frame", "ping",
  "media", "font", "websocket", "other", "stylesheet",
];

function generateAdAndTrackerRules() {
  const rules = [];
  let ruleId = 1;

  for (const domains of Object.values(AD_AND_TRACKER_DOMAINS)) {
    for (const domain of domains) {
      rules.push({
        id: ruleId++,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: `||${domain}^`,
          domainType: "thirdParty",
          resourceTypes: BLOCKED_RESOURCE_TYPES,
        },
      });
    }
  }
  for (const pathRule of PATH_BASED_RULES) {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: "block" },
      condition: { urlFilter: pathRule.urlFilter, resourceTypes: BLOCKED_RESOURCE_TYPES },
    });
  }
  return rules;
}

function generateThirdPartyCookieRules() {
  // A single broad rule: strip Set-Cookie response headers on any request
  // to a THIRD-PARTY domain (i.e. not the site you're actually visiting).
  // This is the same category of protection Safari (Intelligent Tracking
  // Prevention) and Firefox (Enhanced Tracking Protection) already ship by
  // default — occasionally an embedded third-party widget that genuinely
  // needs a cross-site cookie (some payment/SSO embeds) may behave
  // differently with this on; that's an inherent tradeoff of third-party
  // cookie blocking generally, not a bug specific to this rule.
  return [
    {
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: "cookie", operation: "remove" }],
        responseHeaders: [{ header: "set-cookie", operation: "remove" }],
      },
      condition: {
        domainType: "thirdParty",
        resourceTypes: [
          "xmlhttprequest", "sub_frame", "image", "script",
          "other", "media", "font", "stylesheet", "websocket", "ping",
        ],
      },
    },
  ];
}

function writeJson(relativePath, data) {
  const fullPath = path.join(__dirname, "..", relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
  return fullPath;
}

function validateUniqueIds(rules, label) {
  const ids = rules.map((rule) => rule.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    throw new Error(`${label}: duplicate rule IDs detected!`);
  }
}

const adAndTrackerRules = generateAdAndTrackerRules();
validateUniqueIds(adAndTrackerRules, "block-ads-and-trackers.json");
const adRulesPath = writeJson("rules/block-ads-and-trackers.json", adAndTrackerRules);
console.log(
  `Generated ${adAndTrackerRules.length} ad/tracker block rules across ` +
    `${Object.keys(AD_AND_TRACKER_DOMAINS).length} categories -> ${adRulesPath}`,
);

const cookieRules = generateThirdPartyCookieRules();
validateUniqueIds(cookieRules, "block-third-party-cookies.json");
const cookieRulesPath = writeJson("rules/block-third-party-cookies.json", cookieRules);
console.log(`Generated ${cookieRules.length} third-party cookie rule -> ${cookieRulesPath}`);
