# iOS App Store Submission — Ready-to-Paste Metadata

---
**Last Updated**: March 5, 2026
**Status**: v1.1 submitted to App Review (March 5, 2026). v1.0 was rejected (4.2.2 Minimum Functionality). See `app-store-resubmission.md` for full plan.
---

## App Identity

| Field | Value |
|-------|-------|
| App Name | TourGraph |
| Subtitle | The world's most surprising tours |
| Bundle ID | com.nikhilsi.TourGraph |
| SKU | tourgraph-ios-v1 |
| Primary Category | Travel |
| Secondary Category | Entertainment |
| Content Rating | 4+ (no objectionable content) |
| Price | Free |
| In-App Purchases | None |



---

## App Description

### Promotional Text (170 chars, can be updated without new build)

Discover the world's most surprising tours — with home screen widgets, Siri, and zero friction. No accounts, no algorithms, just pure serendipity.

### Description (4000 chars max)

TourGraph is the most fun you'll have discovering tours you never knew existed.

Spin the roulette. Get a random tour from somewhere in the world — weighted toward the extremes: the highest rated, the most bizarre, the cheapest five-star experience, the most expensive adventure money can buy. Each one comes with a witty one-liner that'll make you smile.

No accounts. No algorithms. No travel planning. Just pure, delightful discovery.

TOUR ROULETTE
One swipe. One tour. From a hidden gem in Zanzibar to a helicopter ride over the Grand Canyon. Swipe to discover, tap to explore. Every spin is a surprise.

RIGHT NOW SOMEWHERE...
See what's happening in golden-hour cities around the world, right now. "It's 6:47am in Kyoto and you could be doing forest bathing with a Buddhist monk. 4.9 stars."

THE WORLD'S MOST ___
The most expensive tour on Earth. The cheapest five-star experience. The longest adventure. The most reviewed. Daily superlatives from 120,000+ experiences across 2,700 destinations.

SIX DEGREES OF ANYWHERE
Two cities. A chain of tours connecting them through surprising thematic links. Tokyo to Buenos Aires through sushi-making, tango lessons, and everything in between.

WHAT WE'RE NOT
- Not a booking engine (we link to Viator for that)
- Not a travel planner
- Not a recommendation algorithm
- Not a social network

We're the place you visit because it's fun, surprising, and effortlessly shareable. Think of it as a rabbit hole you actually enjoy falling down.

HOME SCREEN WIDGETS
See golden-hour tours and random discoveries right from your home screen — no need to open the app. Five widget sizes including lock screen.

SIRI & SHORTCUTS
"Show me a random tour" — hands-free discovery via Siri or the Shortcuts app. Assign to your Action button.

SPOTLIGHT SEARCH
Favorite a tour and find it later from your home screen search.

120,000+ tours. 2,700+ destinations. 7 continents. Zero friction.

### Keywords (100 chars max, comma-separated)

tours,travel,discovery,roulette,adventures,explore,world,surprising,random,widgets,siri

---

## What's New

### Version 1.1 (submitted March 5, 2026)

Note: "What's New" doesn't apply since v1.0 was never live — this is effectively the first release. Kept here for reference.

- Home Screen Widgets: see golden-hour tours and random discoveries right from your home screen
- Siri & Shortcuts: "Show me a random tour" — hands-free discovery
- Spotlight Search: find your favorite tours from the home screen
- Enhanced haptics and animations throughout

---

## Privacy

### App Privacy Label

**Data Not Collected**

TourGraph does not collect any data from users. All preferences (favorites, settings) are stored locally on your device.

### Privacy Policy

The following can be hosted at `https://tourgraph.ai/privacy` and linked from App Store Connect.

---

**TourGraph Privacy Policy**

Last updated: March 1, 2026

TourGraph ("the App") is committed to protecting your privacy. This policy explains what data the App collects, uses, and shares.

**Data We Do Not Collect**

TourGraph does not collect, store, or transmit any personal information. Specifically:

- No account creation or login required
- No names, email addresses, or contact information
- No location data
- No usage analytics or tracking
- No advertising identifiers
- No cookies
- No data shared with third parties

**Data Stored on Your Device**

The App stores the following data locally on your device using standard iOS storage (UserDefaults):

- Your favorite tours (tour IDs only)
- Your preference for haptic feedback (on/off)

This data never leaves your device and is not accessible to us or any third party. Deleting the App removes all stored data.

**Tour Data**

Tour information displayed in the App (titles, descriptions, photos, ratings, prices) comes from Viator, a Booking Holdings company. When you tap "Book on Viator," you are directed to Viator's website, which is governed by Viator's own privacy policy.

Tour photos are loaded from Viator's content delivery network. These image requests are standard HTTP requests and are not tracked by TourGraph.

**External Links**

The App contains links to:
- tourgraph.ai (our website)
- viator.com (tour booking)

These external sites have their own privacy policies.

**Children's Privacy**

TourGraph does not knowingly collect any data from children under 13, as it does not collect data from any users.

**Changes to This Policy**

We may update this policy from time to time. Any changes will be posted at this URL.

**Contact**

Questions about this privacy policy can be directed to: privacy@tourgraph.ai

---

## App Review Notes

### Review Notes for Apple (v1.1)

TourGraph is a tour discovery app with a bundled 120MB SQLite database — no login, no network-dependent features. All four tabs work immediately on launch.

New in v1.1: Home Screen Widgets (3 types, 5 sizes including lock screen), Siri Shortcuts (3 intents — "Show me a random tour/right now/chain in TourGraph"), Spotlight indexing for favorited tours, context-aware haptics, and spring animations.

To test widgets: long-press home screen → tap + → search "TourGraph" → add any widget.
To test Siri: say "Show me a random tour in TourGraph".
To test Shortcuts: open Shortcuts app → search TourGraph → 3 actions available.
To test Spotlight: favorite a tour → swipe down on home screen → search the tour title.

The app links to Viator (viator.com) for tour bookings via affiliate URLs. TourGraph does not process any transactions.

---

## Screenshots (v1.1 — 8 uploaded)

All 1320 x 2868 (6.9" display). Apple auto-scales to all smaller sizes. Stored in `distribution/appstore/screenshots/v1.1-iphone-6.9/`.

| # | File | Content |
|---|------|---------|
| 1 | 01-roulette.png | Tour Roulette — core swipe discovery |
| 2 | 02-right-now.png | Right Now Somewhere — golden-hour cities |
| 3 | 03-worlds-most.png | The World's Most — superlatives gallery |
| 4 | 04-six-degrees.png | Six Degrees — chain timeline |
| 5 | 05-tour-detail.png | Tour Detail — full tour view |
| 6 | 06-favorites.png | Favorites — saved tours list |
| 7 | 07-shortcuts.png | Shortcuts app — TourGraph actions |
| 8 | 08-widgets.png | Home screen with 4 TourGraph widgets |

Screenshots 1-7 from iPhone 17 Pro Max simulator. Screenshot 8 from real iPhone 15 Pro, scaled 1.12x via `sips`.

---

## Apple Developer & Signing

| Field | Value |
|-------|-------|
| Team ID | F66D7QPY4N |
| Signing | Automatic (Xcode-managed) |
| Bundle ID | `com.nikhilsi.TourGraph` (consistent with GitaVani and ClearNews) |

### App Store Connect API (for CLI uploads)

Store these locally — never commit to the repo:
- API Key ID, Issuer ID, and `.p8` key file are in your Apple Developer account under Users and Access → Keys.
- Same credentials used for ClearNews uploads.

### Upload via CLI

```bash
# Archive
xcodebuild archive \
  -project ios/TourGraph/TourGraph/TourGraph.xcodeproj \
  -scheme TourGraph \
  -archivePath build/TourGraph.xcarchive \
  -destination 'generic/platform=iOS'

# Export + Upload (single step — handles provisioning, signing, and upload)
xcodebuild -exportArchive \
  -archivePath build/TourGraph.xcarchive \
  -exportPath build/v1.1/ \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates
```

**Key flag**: `-allowProvisioningUpdates` auto-creates App Group, widget bundle ID, and provisioning profiles. Without it, export fails if profiles are missing for new capabilities (widgets, App Groups).

---

## Required Files (Created)

| File | Location | Purpose |
|------|----------|---------|
| PrivacyInfo.xcprivacy | `ios/TourGraph/.../PrivacyInfo.xcprivacy` | Declares UserDefaults usage (CA92.1). Required by Apple since 2024. |
| ExportOptions.plist | `ios/ExportOptions.plist` | CLI archive+upload config: auto signing, Team ID, upload symbols. |

> **Note:** PrivacyInfo.xcprivacy must be added to the Xcode project's target (drag into Xcode, check "Add to target: TourGraph").

## Submission History

### v1.1 — Submitted March 5, 2026

**Status**: Waiting for Review. App ID `6759991920`.

Resubmission after v1.0 rejection (4.2.2 Minimum Functionality). Added 8 native iOS capabilities: widgets, Siri, Shortcuts, Spotlight, deep linking, haptics, spring animations, offline database. See `app-store-resubmission.md` for full plan.

- [x] Build Tiers 1-4 native features
- [x] Version bump 1.0 → 1.1, build 1 → 2
- [x] Archive + export via CLI with `-allowProvisioningUpdates`
- [x] Upload build to App Store Connect (auto-upload via export)
- [x] Set encryption compliance (no encryption)
- [x] Update screenshots (8 new, including widgets + shortcuts)
- [x] Update metadata (promo text, description, keywords, review notes)
- [x] Select new build (build 2, v1.1)
- [x] Reply to Apple in Resolution Center with feature list + widget screenshot attachment
- [x] Click "Resubmit to App Review"

### v1.0 — Submitted March 3, 2026

**Status**: Rejected (4.2.2 Design: Minimum Functionality).

- [x] All setup, code, content, and submission checklist items completed
- Reviewed on iPad Air 11-inch (M3) in iPhone compatibility mode
- Apple said app "does not sufficiently differ from a web browsing experience"

### Reference
- Full submission playbook with API calls: `~/src/gh/news-aggregator/docs/app-store-submission-playbook.md`
- Subtitle adjusted to 30 chars: "World's most surprising tours" (original was too long)
