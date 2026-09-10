const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(`Release validation failed: ${message}`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function pngDimensions(relativePath) {
  const data = fs.readFileSync(path.join(root, relativePath));
  const signature = "89504e470d0a1a0a";
  assert(data.subarray(0, 8).toString("hex") === signature, `${relativePath} is not a PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

const manifest = readJson("manifest.json");
assert(manifest.manifest_version === 3, "manifest_version must be 3");
assert(/^\d+\.\d+\.\d+$/.test(manifest.version), "version must use x.y.z format");
assert(manifest.description.length <= 132, "manifest description exceeds 132 characters");
assert(
  JSON.stringify([...manifest.permissions].sort()) ===
    JSON.stringify(["declarativeNetRequest", "storage"].sort()),
  "permissions must stay limited to declarativeNetRequest and storage",
);
assert(
  JSON.stringify(manifest.host_permissions) === JSON.stringify(["<all_urls>"]),
  "unexpected host permissions",
);

for (const [relativePath, expected] of Object.entries({
  "icons/icon128.png": [128, 128],
  "store-assets/screenshot-1280x800.png": [1280, 800],
  "store-assets/small-promo-440x280.png": [440, 280],
  "store-assets/marquee-promo-1400x560.png": [1400, 560],
})) {
  assert(
    JSON.stringify(pngDimensions(relativePath)) === JSON.stringify(expected),
    `${relativePath} has the wrong dimensions`,
  );
}

const adRules = readJson("rules/block-ads-and-trackers.json");
const cookieRules = readJson("rules/block-third-party-cookies.json");
assert(adRules.length >= 90, "too few packaged ad/tracker rules");
assert(new Set(adRules.map((rule) => rule.id)).size === adRules.length, "duplicate ad rule IDs");
assert(
  adRules.every((rule) => !rule.condition.resourceTypes.includes("main_frame")),
  "ad rules must not block top-level navigation",
);
assert(
  adRules
    .filter((rule) => rule.condition.urlFilter.endsWith("^"))
    .every((rule) => rule.condition.domainType === "thirdParty"),
  "domain block rules must be third-party scoped",
);
assert(cookieRules.length === 1, "expected one third-party cookie rule");
assert(cookieRules[0].condition.domainType === "thirdParty", "cookie rule must be third-party scoped");

const shippedCode = [
  "background.js",
  "popup/popup.html",
  "popup/popup.js",
  "content/protection-state.js",
  "content/restore-scroll-after-hiding-banner.js",
  "content/skip-youtube-ads.js",
].map((relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")).join("\n");

assert(!/\beval\s*\(/.test(shippedCode), "eval() found in shipped code");
assert(!/\bnew\s+Function\b/.test(shippedCode), "new Function found in shipped code");
assert(!/<script[^>]+src=["']https?:/i.test(shippedCode), "remote script found in shipped code");

for (const requiredDocument of [
  "PRIVACY_POLICY.md",
  "SUPPORT.md",
  "store-assets/STORE_LISTING.md",
  "index.html",
]) {
  assert(fs.existsSync(path.join(root, requiredDocument)), `${requiredDocument} is missing`);
}

console.log(`Release ${manifest.version} validated: ${adRules.length} ad rules, ${cookieRules.length} cookie rule.`);
