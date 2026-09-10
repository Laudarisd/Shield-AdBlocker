const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));

test("manifest uses minimal release permissions", () => {
  const manifest = json("manifest.json");
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ["declarativeNetRequest", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["<all_urls>"]);
});

test("network block rules avoid top-level navigation and first-party domain blocking", () => {
  const rules = json("rules/block-ads-and-trackers.json");
  assert.equal(new Set(rules.map((rule) => rule.id)).size, rules.length);
  for (const rule of rules) {
    assert.ok(!rule.condition.resourceTypes.includes("main_frame"));
    if (rule.condition.urlFilter.endsWith("^")) {
      assert.equal(rule.condition.domainType, "thirdParty");
    }
  }
});

test("cookie cleanup does not remove generic modal or scroll classes", () => {
  const source = read("content/restore-scroll-after-hiding-banner.ts");
  assert.doesNotMatch(source, /^\s*"modal-open",/m);
  assert.doesNotMatch(source, /^\s*"no-scroll",/m);
  assert.ok(!source.includes('element.style.overflow === "hidden"'));
  assert.ok(source.includes("VENDOR_SCROLL_LOCK_CLASS_NAMES"));
});

test("per-site allowlisting is implemented in background and content code", () => {
  const background = read("background.ts");
  const content = read("content/protection-state.ts");
  assert.ok(background.includes("SET_SITE_ALLOWLISTED"));
  assert.ok(background.includes('"allowAllRequests"'));
  assert.ok(content.includes("isCurrentSiteAllowlisted"));
});

test("store claims describe best-effort coverage", () => {
  const listing = read("store-assets/STORE_LISTING.md");
  assert.match(listing, /common advertising and tracking domains/i);
  assert.match(listing, /best-effort, experimental YouTube/i);
  assert.doesNotMatch(listing, /blocks all ads/i);
});
