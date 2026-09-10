# Shield-AdBlocker Privacy Policy

Effective date: September 10, 2026

Shield-AdBlocker is designed to work locally in the browser. The extension
does not sell, share, or transmit personal information, browsing history,
website content, cookie values, or usage analytics to the developer or to third
parties.

## Information processed locally

To provide its advertised blocking features, Chrome evaluates packaged network
rules against request destinations. Content scripts inspect limited page
structure locally to hide recognized ad containers and cookie banners. A
packaged rule can remove third-party `Cookie` and `Set-Cookie` headers before
they are used. Shield does not read, retain, or transmit the values of those
headers.

Shield stores only the user's protection switches and website allowlist in
`chrome.storage.local`. This information remains in the user's Chrome profile
and is not sent to the developer. Per-tab blocked-request counts are displayed
by Chrome and are not retained by Shield.

## Data collection, sharing, and retention

Shield does not collect or transmit user data. It has no analytics, advertising,
account system, or remote server. Locally stored preferences remain until the
user changes them, clears extension data, or uninstalls the extension.

## Permissions

- `declarativeNetRequest`: applies packaged blocking rules and local allowlist
  exceptions.
- `storage`: saves protection preferences and the website allowlist locally.
- Access to all websites: injects packaged cosmetic styles and protection code,
  and permits third-party cookie-header protection on websites the user visits.

## Limited Use

The use of information received from Google APIs will adhere to the Chrome Web
Store User Data Policy, including the Limited Use requirements. Any information
processed by Shield is used only to provide its user-facing content-blocking
features.

## Changes and contact

Material changes will be disclosed before updated data practices take effect.
Questions can be sent through the verified support contact displayed on
Shield's Chrome Web Store listing.
