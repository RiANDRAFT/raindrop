# Privacy Policy for Raindrop Chrome Extension

**Last Updated:** October 25, 2026

## Overview
Raindrop is a Chrome extension that replaces your new tab page with a customizable, calming interface. We are committed to protecting your privacy and being transparent about how the extension works.

## What Raindrop Does
Raindrop provides a beautiful new tab experience with:
- Rain-on-glass animations or Unsplash photo backgrounds
- Customizable widgets (clock, greeting, search, quick links, todos, notes, quotes)
- Groupable and movable widgets with styling options
- Optional GitHub Gist sync for settings backup

## Data Collection and Storage

### What We Store Locally
All of your data is stored **locally on your device** using Chrome's storage API. This includes:
- Widget positions, sizes, colors, and styling preferences
- Your name (for the personalized greeting)
- Todo items and notes you create
- Quick links you configure
- Clock timezones and display preferences
- Background settings (colors, Unsplash preferences, etc.)
- API keys you provide (Unsplash, API Ninjas, GitHub)

**This data never leaves your device unless you explicitly enable GitHub Gist sync (see below).**

### What We Don't Collect
- We do not collect analytics, telemetry, or usage statistics
- We do not track your browsing history
- We do not collect personal information beyond what you explicitly enter
- We do not use cookies or tracking technologies
- We do not sell, share, or monetize your data in any way

## Third-Party Services (All Optional)

### 1. Unsplash (Optional)
**When Used:** Only if you select Unsplash as your background source and provide an API key

**What's Sent:** 
- API requests to fetch photos based on your preferences (topic, search terms, collection IDs)
- Your Unsplash API key (stored locally, sent only to Unsplash)

**What's Received:** 
- Photo URLs and photographer attribution
- No personal data is shared with Unsplash

**Learn More:** [Unsplash Privacy Policy](https://unsplash.com/privacy)

### 2. Quote Services (Optional)
**Services:** Quotable.io, ZenQuotes.io, API Ninjas

**When Used:** Only if you enable the Quote widget

**What's Sent:**
- Simple GET requests to fetch random quotes
- For API Ninjas: your API key and selected quote category

**What's Received:** 
- Quote text and author name
- No personal data is exchanged

### 3. GitHub Gist Sync (Optional)
**When Used:** Only if you enable settings sync and provide a GitHub token

**What's Sent:**
- Your extension settings (widget config, preferences, color choices)
- Optionally: Unsplash and API Ninjas keys (if you enable key sync)
- **Never sent:** GitHub token itself (stays local for security)

**What Happens:** 
- Creates or updates a **private** Gist in your GitHub account
- You maintain full control - you can view, edit, or delete the Gist anytime

**Learn More:** [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)

## Permissions Explained

### Storage Permission
**Why:** To save your settings, preferences, todos, and notes locally on your device

**What:** Uses `chrome.storage.local` - a secure, local storage mechanism provided by Chrome

### Host Permissions
**Why:** To fetch data from external services you choose to use

**Specific Hosts:**
- `api.unsplash.com` - Fetch background photos (optional)
- `api.quotable.io` - Fetch quotes (optional)
- `zenquotes.io` - Alternative quote source (optional)
- `api.api-ninjas.com` - Categorized quotes (optional)
- `api.github.com` - Settings backup sync (optional)

**Note:** These are only accessed when you enable the corresponding features. The extension works fully offline using rain animations and gradient backgrounds.

## Data Security

### How We Protect Your Data
- All data stored locally is secured by Chrome's built-in security
- API keys are stored in Chrome's encrypted storage
- All external API communications use HTTPS encryption
- No data is transmitted to any server we control
- The extension has no backend server or database

### API Key Safety
- Your API keys are stored locally on your device
- Keys are only sent to their respective services (Unsplash, API Ninjas, GitHub)
- GitHub tokens are **never** included in Gist sync for security
- You can delete or change your keys anytime in settings

## Your Rights and Controls

### You Control Your Data
- **View:** All your data is in Chrome's local storage
- **Export:** Use the "Export" button in settings to download your configuration
- **Delete:** Use "Reset all" to clear all extension data, or uninstall the extension
- **Sync Control:** GitHub sync is completely optional and can be disabled anytime

### How to Remove Your Data
1. **Option 1:** Click "Reset all" in the extension settings
2. **Option 2:** Uninstall the extension from Chrome
3. **Option 3:** If you enabled GitHub sync, delete the Gist from your GitHub account

## Children's Privacy
Raindrop does not knowingly collect information from children under 13. The extension does not collect personal information beyond what users explicitly enter (name, optional API keys).

## Changes to This Policy
We may update this privacy policy from time to time. The "Last Updated" date at the top will reflect the most recent changes. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Open Source
Raindrop's code can be reviewed on GitHub (if you choose to make it open source). Transparency is important to us, and we encourage technical users to verify our privacy claims.

## Contact Us
If you have questions about this privacy policy or how Raindrop handles your data:

**Email:** riandraft@gmail.com
**GitHub Issues:** https://github.com/RiANDRAFT/raindrop-tab

## Your Consent
By using Raindrop, you consent to this privacy policy.

---

## Summary (TL;DR)
✓ Everything stays on your device by default  
✓ No tracking, analytics, or data collection  
✓ Third-party services are optional and under your control  
✓ No ads, no monetization, no data selling  
✓ You can export or delete your data anytime  
✓ Open and transparent about what we access and why
