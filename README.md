# WhatsApp Bulk Sender browser extension

Version **1.6.1**, installed as **WhatsApp Sender**. Chrome, Edge, Firefox and Opera packages for manual installation. This repository contains the maintained browser builds, download ZIPs and standalone packaging checks. The website guide is at [irahulsaini.com/tools/whatsapp-bulk-sender](https://www.irahulsaini.com/tools/whatsapp-bulk-sender).

## Downloads

- [Google Chrome](https://github.com/irahulsaini/whatsapp-bulk-sender-browser-extension/raw/refs/tags/v1.6.1/packages/whatsapp-bulk-sender-chrome-v1.6.1.zip)
- [Microsoft Edge](https://github.com/irahulsaini/whatsapp-bulk-sender-browser-extension/raw/refs/tags/v1.6.1/packages/whatsapp-bulk-sender-edge-v1.6.1.zip)
- [Firefox](https://github.com/irahulsaini/whatsapp-bulk-sender-browser-extension/raw/refs/tags/v1.6.1/packages/whatsapp-bulk-sender-firefox-v1.6.1.zip)
- [Opera](https://github.com/irahulsaini/whatsapp-bulk-sender-browser-extension/raw/refs/tags/v1.6.1/packages/whatsapp-bulk-sender-opera-v1.6.1.zip)

These packages are not approved browser-store listings. Firefox uses a temporary development add-on, not a signed permanent installation.

## Install

1. Download the ZIP for your browser and extract it. Keep the extracted folder in place.
2. For Chrome, Edge or Opera, open `chrome://extensions`, `edge://extensions` or `opera://extensions`, enable **Developer mode**, then choose **Load unpacked** and select the extracted folder containing `manifest.json`.
3. For Firefox, open `about:debugging`, choose **This Firefox → Load Temporary Add-on**, then select `manifest.json` in the Firefox folder. Repeat installation after restarting Firefox.
4. Open the browser Extensions menu and select **WhatsApp Sender**. Confirm version **1.6.1**.

For updates, replace the extracted files with the new package, reload the extension and refresh WhatsApp Web.

## Use

Open WhatsApp Web and sign in. Use one WhatsApp Web tab. Prepare a CSV/TXT list of contacts who explicitly opted in, using international phone numbers with a `+` country prefix. Review recipients, personalized message and interval before starting. The extension supports up to 500 valid, unique contacts per batch. Bare numbers default to country code 91; check every destination.

Use `{name}` for personalization. Monitor the queue and actual WhatsApp conversations. **Submitted is not delivery confirmation.** Pause/Stop cannot retract a message already being submitted. Review uncertain results in the conversation before marking them SUBMITTED or SKIP. No sending interval guarantees delivery or prevents account restrictions.

## Existing limitations and privacy

This is unofficial, experimental WhatsApp Web UI automation, unaffiliated with WhatsApp or Meta. Platform changes can break it. Live sending and installed browser compatibility, including Firefox, remain unverified. No real messages were sent during this migration.

Drafts, contacts, message text, queues and statuses persist in extension local storage. Stop skips pending contacts but does not erase stored data; uninstalling removes extension data. Sending includes phone and message text in WhatsApp Web URL parameters, so data does not remain exclusively inside the extension. No separate hosted sending service is introduced here.

Existing permissions are `storage`, `tabs`, `scripting` and access to `https://web.whatsapp.com/*`. Multiple WhatsApp tabs may run separate queues against shared storage, so keep only one open. Saved CSV row `country_code` data is not retained with drafts: use explicit international prefixes. Report CSV values are quoted but not formula-neutralized; import untrusted reports as text. The report filename still mentions v1.3. These behaviors have not been changed by moving repositories.

Version 1.6.1's estimated queue duration includes a fixed three-second loading allowance per eligible contact; it does not change the actual send interval.

## Maintain and verify

Requires Python 3.9 or newer; no third-party build dependencies:

```sh
python3 verify.py
```

Verification checks all four packages, their versions/permissions, all source and ZIP SHA-256 hashes, and a standalone rebuild in a temporary directory. It does not execute extension JavaScript or send messages.

- `builds/{browser}/`: maintained extension files.
- `packages/`: installable browser ZIPs.
- `release.json`: version and browser list.
- `SHA256SUMS.json`: source and package integrity inventory.
- `build.py`: deterministic ZIP packaging; never executes sender code.
- `verify.py`: packaging and integrity checks.

The initial packages are byte-for-byte copies of the existing v1.6.1 website downloads. The private original bundle is excluded from Git.

For a new release, update the maintained builds and manifest versions, update `release.json`, run `python3 build.py` and `python3 verify.py`, then commit and tag `v{version}`. Update the website's `data/whatsapp-bulk-sender-release.json` with the tested tag's package URLs. The build does not depend on or write into the website repository.
