# iOS App Store Submission — Ready-to-Paste Metadata

---
**Last Updated**: March 1, 2026
**Status**: Draft — review before submission
---

## App Identity

| Field | Value |
|-------|-------|
| App Name | TourGraph |
| Subtitle | The world's most surprising tours |
| Bundle ID | ai.tourgraph.app |
| SKU | tourgraph-ios-v1 |
| Primary Category | Travel |
| Secondary Category | Entertainment |
| Content Rating | 4+ (no objectionable content) |
| Price | Free |
| In-App Purchases | None |

> **Note:** Current bundle ID in Xcode is `com.nikhilsi.TourGraph` — update to `ai.tourgraph.app` before submission.

---

## App Description

### Promotional Text (170 chars, can be updated without new build)

Discover the world's weirdest, most wonderful tours — one random spin at a time. No accounts, no algorithms, just pure serendipity.

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

120,000+ tours. 2,700+ destinations. 7 continents. Zero friction.

### Keywords (100 chars max, comma-separated)

tours,travel,discovery,roulette,adventures,explore,world,surprising,random,experiences,bucket list

---

## What's New (Version 1.0)

Welcome to TourGraph! Discover the world's most surprising tours:
- Tour Roulette: swipe through random tours from around the world
- Right Now Somewhere: golden-hour tours happening right now
- The World's Most: daily superlatives from 120,000+ experiences
- Six Degrees of Anywhere: cities connected through thematic tour chains
- Save your favorites with a tap

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

### Review Notes for Apple

TourGraph is a tour discovery app. It displays pre-loaded tour data from a bundled SQLite database — no login, no network-dependent features. All four tabs work immediately on launch.

The app links to Viator (viator.com) for tour bookings via affiliate URLs. TourGraph does not process any transactions.

No demo account needed — the app has no accounts or login.

### Test Instructions

1. Launch the app — Tour Roulette loads immediately
2. Swipe left or right on the tour card, or tap "Show Me Another"
3. Tap the card to see tour details
4. Tap the heart icon to save a favorite
5. Switch to "Right Now" tab — see golden-hour tours
6. Switch to "World's Most" tab — see superlatives
7. Switch to "Six Degrees" tab — see city chains
8. Tap the gear icon for Settings

---

## Screenshots Plan

Required: 5 screenshots minimum for each device size.

### Screenshots to Capture

| # | Screen | Caption |
|---|--------|---------|
| 1 | Tour Roulette (card visible) | "Discover surprising tours from around the world" |
| 2 | Tour Detail (expanded) | "Every tour has a story worth sharing" |
| 3 | Right Now Somewhere | "See what's happening in golden-hour cities right now" |
| 4 | The World's Most | "The most expensive, cheapest, longest — daily superlatives" |
| 5 | Six Degrees chain detail | "Two cities. One chain of surprising connections" |

### Device Sizes Required

- iPhone 6.9" (iPhone 16 Pro Max) — required
- iPhone 6.3" (iPhone 16 Pro) — optional but recommended
- iPad 13" (if supporting iPad) — not applicable (iPhone only)

### Screenshot Tips

- Use Simulator with sample data loaded
- Dark mode (app default)
- Status bar: 9:41 AM, full battery, full signal
- No personal information visible

---

## Pre-Submission Checklist

- [ ] Update bundle ID: `com.nikhilsi.TourGraph` → `ai.tourgraph.app`
- [ ] Verify app builds with Release configuration
- [ ] Test on physical device (not just Simulator)
- [ ] Add LogoWhite @2x and @3x retina variants
- [ ] Host privacy policy at `https://tourgraph.ai/privacy`
- [ ] Create App Store Connect listing
- [ ] Upload screenshots (5 minimum, 6.9" device)
- [ ] Set up Viator affiliate account for iOS (if separate tracking needed)
- [ ] Archive and upload to App Store Connect
- [ ] Submit for review with review notes above
