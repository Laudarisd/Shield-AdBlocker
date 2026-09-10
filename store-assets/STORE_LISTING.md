# Chrome Web Store listing copy

## Name

Shield-AdBlocker

## Summary

Locally blocks common ads and trackers, limits third-party cookies, and hides
common cookie banners.

## Category

Privacy & Security

## Single purpose

Shield improves browsing privacy and reduces advertising clutter by applying
local network and cosmetic content-blocking rules controlled by the user.

## Detailed description

Shield is a lightweight, local-first content blocker with clear controls.

- Reduces requests to common advertising and tracking domains.
- Removes third-party Cookie and Set-Cookie headers from subresource requests.
- Hides recognized ad containers and common consent-platform banners.
- Provides best-effort, experimental YouTube ad cleanup.
- Lets you pause protection globally, by feature, or for the current website.
- Stores settings and the website allowlist only in your local Chrome profile.

Shield has no account, analytics, advertising, or remote server. Its packaged
rules work through Chrome's Manifest V3 declarative network request engine.

Some embedded sign-in, payment, media, or support widgets depend on third-party
cookies. If a website stops working, select **Pause here** in Shield and reload
the page. Cookie-banner and YouTube cleanup are best-effort because websites can
change their markup at any time.

## Permission justifications

### declarativeNetRequest

Required to apply packaged ad/tracker blocking rules, remove third-party cookie
headers, count blocked requests, and apply user-requested website exceptions.

### storage

Required to save protection switches and the user's website allowlist locally.

### Host access: all websites

Required because Shield's advertised protection works across websites. Access
is used to inject packaged cosmetic styles and local protection code and to
permit third-party cookie-header modification. Page content and browsing data
are not transmitted to the developer.

## Privacy dashboard answers

- Remote code: **No**.
- Data handling: disclose local processing of website content, request
  destinations, cookie headers, and locally stored preferences exactly as the
  dashboard asks. Do not describe this as remote collection or transmission.
- Selling, unrelated use, credit decisions, and personalized advertising:
  **No**.
- Privacy policy URL: host `website/privacy.html` on a public HTTPS address and
  enter that final URL.

## Release notes for 1.1.0

- Added per-website pause and resume controls.
- Reduced requested permissions.
- Reduced false positives in network and cookie-banner filtering.
- Added privacy, support, release validation, and reproducible packaging files.
