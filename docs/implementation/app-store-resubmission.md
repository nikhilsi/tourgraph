# App Store Resubmission — Native Features Plan

---
**Created**: March 5, 2026
**Status**: v1.1 submitted to App Review on March 5, 2026. Waiting for review.
**Context**: Apple rejected TourGraph v1.0 under Guideline 4.2.2 (Minimum Functionality)
---

## What Happened

TourGraph v1.0 was submitted to the App Store on March 3, 2026, and rejected on March 5, 2026.

**Rejection**: Guideline 4.2.2 — Design: Minimum Functionality

> "We noticed that the app only includes links, images, or content aggregated from the Internet with limited or no native functionality. Although this content may be curated from the web specifically for your users, since it does not sufficiently differ from a web browsing experience, it is not appropriate for the App Store."

**Review environment**: iPad Air 11-inch (M3), iOS — they tested the iPhone app in iPad compatibility mode.

Apple's core argument: the app is a content viewer for Viator tour data with a Viator booking link. The swipe gestures, haptics, and favorites weren't enough to differentiate it from a website.

## Strategy

Add features that **cannot exist on a website** — genuine platform capabilities that make TourGraph a native iOS citizen. The goal is not to check boxes but to build features that genuinely make the app better *because* it's on your phone.

We build in 4 tiers, each adding a layer of native integration. Every tier must be fully working and tested before moving to the next.

---

## Tier 1: Home Screen Widgets (WidgetKit)

**Why this matters**: Widgets are the single strongest signal to Apple that your app is native. They live on the home screen, update periodically, and are impossible to replicate with a website. They also give TourGraph a persistent presence — users see a new tour every time they glance at their phone.

### Widget Types

#### 1a. "Right Now Somewhere" Widget (Small + Medium)

**Small (systemSmall)**: Shows a single golden-hour tour moment.
```
┌──────────────────────┐
│  [Tour Photo]        │
│                      │
│  Right now in Kyoto  │
│  6:47am · sunrise    │
│  ★ 4.9 · $89        │
└──────────────────────┘
```

**Medium (systemMedium)**: Wider layout with more context.
```
┌─────────────────────────────────────────────┐
│  [Tour Photo]  │  Right now in Kyoto        │
│                │  Forest Bathing with a     │
│                │  Buddhist Monk             │
│                │  6:47am · sunrise          │
│                │  ★ 4.9 · $89 · 3 hrs      │
└─────────────────────────────────────────────┘
```

**Data source**: Same golden-hour algorithm as `RightNowView`. Reads from bundled SQLite via shared App Group container. `TimezoneHelper.getGoldenTimezones()` → pick random tour from golden timezone → display.

**Update cadence**: `TimelineProvider` returns entries every 30 minutes (golden hour shifts as Earth rotates).

**Tap action**: Deep links to the app's Right Now tab.

#### 1b. "Random Tour" Widget (Small + Medium)

**Small (systemSmall)**: A random tour card, refreshable.
```
┌──────────────────────┐
│  [Tour Photo]        │
│                      │
│  Helicopter Over     │
│  Grand Canyon        │
│  ★ 4.8 · $399       │
└──────────────────────┘
```

**Medium (systemMedium)**: Adds the one-liner.
```
┌─────────────────────────────────────────────┐
│  [Tour Photo]  │  Helicopter Over the       │
│                │  Grand Canyon              │
│                │  "Because some canyons     │
│                │  are too grand for legs"   │
│                │  ★ 4.8 · $399 · Las Vegas  │
└─────────────────────────────────────────────┘
```

**Interactive** (iOS 17+): A "Surprise Me" button directly on the medium widget. Tapping it reloads with a new random tour without opening the app. This is a **key differentiator** — the core roulette loop happens right on the home screen.

**Data source**: `getRouletteHand()` equivalent — random tour from bundled DB with category weighting.

**Update cadence**: Every hour, plus on-demand via interactive button.

**Tap action**: Deep links to tour detail in the app.

#### 1c. Lock Screen Widget (accessoryRectangular)

```
┌────────────────────────────┐
│ 🌅 Kyoto · 6:47am         │
│ Forest Bathing · ★ 4.9    │
└────────────────────────────┘
```

Text-only (lock screen widgets can't show remote images). Shows the current "Right Now" moment.

### Technical Architecture

**Shared App Group**: Both the main app and widget extension need to read the same SQLite database.

1. Create App Group: `group.com.nikhilsi.TourGraph`
2. On first launch, main app copies `tourgraph.db` to the shared App Group container (instead of Application Support)
3. Widget extension reads from the same shared path
4. Both use GRDB.swift (add GRDB to the widget target's dependencies)

**Database migration**: `DatabaseService.init()` currently copies the bundled DB to Application Support. This needs to change to the App Group container. Existing users (there are none yet — app isn't live) won't be affected.

**File structure**:
```
ios/TourGraph/TourGraph/
├── TourGraph/                    # Main app target (existing)
│   ├── Services/DatabaseService.swift  # Updated: App Group path
│   └── ...
├── TourGraphWidgets/             # NEW: Widget extension target
│   ├── TourGraphWidgets.swift    # Widget bundle entry point
│   ├── RightNowWidget.swift      # Right Now widget + timeline provider
│   ├── RandomTourWidget.swift    # Random Tour widget + timeline provider
│   ├── LockScreenWidget.swift    # Lock screen widget
│   ├── WidgetDatabase.swift      # Lightweight DB reader for widgets
│   └── Assets.xcassets/          # Widget preview assets
├── Shared/                       # NEW: Shared code (both targets)
│   ├── Tour.swift                # Moved from main app
│   ├── TimezoneHelper.swift      # Moved from main app
│   └── SharedConstants.swift     # App Group ID, common helpers
└── TourGraph.xcodeproj
```

**Key constraint**: Widget extensions have a 30MB memory limit. Our DB is 120MB, but we only query a few rows at a time — GRDB handles this efficiently with lazy cursors, so memory usage stays minimal.

---

## Tier 2: App Intents + Siri Shortcuts

**Why this matters**: App Intents integrate TourGraph into the iOS system layer — Siri, Shortcuts app, Spotlight suggestions, and Action button. Users can say "Hey Siri, show me a random tour" and the app responds. This is native functionality that's impossible on a website.

### Intents to Build

#### 2a. "Show Random Tour" Intent

```swift
struct ShowRandomTourIntent: AppIntent {
    static var title: LocalizedStringResource = "Show Random Tour"
    static var description = IntentDescription("Discover a surprising tour from anywhere in the world")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        // Opens app to Roulette tab with a fresh spin
        return .result()
    }
}
```

**Siri trigger**: "Show me a random tour" / "Surprise me with a tour"
**Shortcuts**: Appears in Shortcuts app as an action.
**Action button**: Can be assigned to the iPhone's Action button.

#### 2b. "Show Right Now" Intent

```swift
struct ShowRightNowIntent: AppIntent {
    static var title: LocalizedStringResource = "What's Happening Right Now"
    static var description = IntentDescription("See tours in golden-hour cities around the world")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        // Opens app to Right Now tab
        return .result()
    }
}
```

**Siri trigger**: "Show me right now in TourGraph" / "What's happening right now in TourGraph"

#### 2c. "Show Random Chain" Intent

```swift
struct ShowChainIntent: AppIntent {
    static var title: LocalizedStringResource = "Show Random Chain"
    static var description = IntentDescription("Discover a surprising chain of connected cities")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        await MainActor.run {
            DeepLinkManager.shared.pendingTab = .sixDegrees
        }
        return .result()
    }
}
```

**Siri trigger**: "Show me a chain in TourGraph" / "Six degrees in TourGraph"
**Shortcuts**: Appears in Shortcuts app as an action. Opens Six Degrees tab with a random chain.

### App Shortcuts Provider

```swift
struct TourGraphShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: ShowRandomTourIntent(),
                    phrases: ["Show me a random tour in \(.applicationName)",
                              "Surprise me with a tour from \(.applicationName)"],
                    shortTitle: "Random Tour",
                    systemImageName: "dice")

        AppShortcut(intent: ShowRightNowIntent(),
                    phrases: ["Show me right now in \(.applicationName)",
                              "What's happening right now in \(.applicationName)"],
                    shortTitle: "Right Now",
                    systemImageName: "sun.horizon")

        AppShortcut(intent: ShowChainIntent(),
                    phrases: ["Show me a chain in \(.applicationName)",
                              "Six degrees in \(.applicationName)"],
                    shortTitle: "Random Chain",
                    systemImageName: "point.3.connected.trianglepath.dotted")
    }
}
```

### Deep Linking: Modal Sheet for Tour-Specific Navigation

**Decision**: When a widget or intent targets a specific tour (e.g., `tourgraph://tour/12345`), the app shows that tour in a **fullScreenCover modal sheet** rather than pushing onto a tab's NavigationStack.

**Why modal sheet (not tab push)**:
- Works regardless of which tab is active — no need to switch tabs first
- Familiar iOS pattern (tapping a notification/widget shows content as an overlay)
- Clean dismiss — swipe down or tap X returns to wherever the user was
- Avoids corrupting the NavigationStack state of any tab

**Implementation**:
- `TourGraphApp.swift` holds `@State var deepLinkedTourId: Int?`
- `.onOpenURL` parses `tourgraph://tour/{id}` and sets `deepLinkedTourId`
- `.fullScreenCover(item: $deepLinkedTourId)` presents `TourDetailView`
- Tab-level deep links (`tourgraph://tab/rightnow`) still switch tabs directly

This enhancement applies to both Tier 1 (widget taps) and Tier 2 (intent launches).

### Technical Notes

- App Intents live in the main app target (`TourGraph/Intents/`)
- `WidgetDatabase` moved to `Shared/` — accessible by both main app and widget extension
- `DeepLinkManager` singleton bridges App Intents → UI (intents set pending state, app picks it up on `didBecomeActive`)
- All intents use `@MainActor.run` to safely set `DeepLinkManager` properties from non-isolated async context
- All widgets deep link to specific tours (`tourgraph://tour/{id}`) showing fullScreenCover modal
- Consistent Siri phrase pattern: "Show me [X] in TourGraph" for all 3 intents
- iOS 17+ required (matches our deployment target)

---

## Tier 3: Local Notifications — SKIPPED

Decided to skip. Daily notifications don't fit TourGraph's casual "bored in line" usage pattern — they'd feel annoying rather than delightful. Widgets already provide persistent home screen presence without interrupting. Not needed for a strong Apple review case.

---

## Tier 4: Spotlight + Polish

**Why this matters**: These are finishing touches that round out the native experience. Spotlight indexing makes favorited tours searchable from the home screen. Enhanced haptics and animations make the app feel premium and distinctly native.

### 4a. Spotlight Indexing

When a user favorites a tour, index it in Spotlight so it's searchable from the home screen.

```swift
import CoreSpotlight
import MobileCoreServices

func indexTourInSpotlight(_ tour: Tour) {
    let attributeSet = CSSearchableItemAttributeSet(contentType: .content)
    attributeSet.title = tour.title
    attributeSet.contentDescription = tour.oneLiner ?? tour.destinationName
    attributeSet.rating = tour.rating.map { NSNumber(value: $0) }

    // Download and attach thumbnail
    if let imageURL = tour.imageURL {
        attributeSet.thumbnailURL = imageURL
    }

    let item = CSSearchableItem(
        uniqueIdentifier: "tour-\(tour.id)",
        domainIdentifier: "com.nikhilsi.TourGraph.tours",
        attributeSet: attributeSet
    )

    CSSearchableIndex.default().indexSearchableItems([item])
}
```

**When to index**: On `favorites.toggle()` — index when favorited, deindex when unfavorited.

**Tap action**: Deep link to tour detail view.

### 4b. Enhanced Haptics

Different haptic patterns for different interactions:

| Action | Haptic |
|--------|--------|
| Swipe tour card | `.medium` impact (existing) |
| Favorite a tour | `.light` impact + `.success` notification |
| Unfavorite a tour | `.light` impact |
| Superlative card tap | `.rigid` impact |
| Chain "Show Me Another" | `.soft` impact |
| Widget button tap | System default |

### 4c. Spring Animations

Enhance card transitions with native spring physics:

- Tour card entrance: `spring(response: 0.5, dampingFraction: 0.8)` slide-up
- Tab switches: cross-fade with slight scale
- Favorite heart: scale bounce `spring(response: 0.3, dampingFraction: 0.5)`
- "Show Me Another" card refresh: subtle fade + slide

These are small touches, but they make the app feel alive in a way web animations can't match.

---

## Implementation Order

| Step | What | Depends On | Commit Scope |
|------|------|------------|-------------|
| 1 | Shared App Group setup + DB migration | — | **Done** |
| 2 | Move Tour.swift + TimezoneHelper to Shared | Step 1 | **Done** |
| 3 | Widget extension target + GRDB dependency | Step 2 | **Done** |
| 4 | "Right Now" widget (small + medium) | Step 3 | **Done** |
| 5 | "Random Tour" widget (small + medium + interactive) | Step 3 | **Done** |
| 6 | Lock Screen widget | Step 3 | **Done** |
| 7a | App Intents (3 intents + shortcuts provider) | — | **Done** |
| 7b | Modal sheet deep linking (tour-specific from widgets/intents) | Step 7a | **Done** |
| 8 | Deep linking (tab navigation from intents/widgets) | — | **Done** (Tier 1) |
| 9 | ~~Local notifications~~ | — | **Skipped** |
| 10 | Spotlight indexing | — | **Done** |
| 11 | Enhanced haptics + spring animations | — | **Done** |
| 12 | Test all features on simulator + device | All | **Done** |
| 13 | New screenshots (8, showing widgets + shortcuts) | Step 12 | **Done** |
| 14 | Archive, upload, resubmit | Step 13 | **Done** — v1.1 submitted March 5 |

## What This Gives Apple

When the reviewer opens TourGraph v1.1, they see:

1. **Widgets on the home screen** — 3 widget types (Right Now, Random Tour, Lock Screen) with interactive refresh
2. **Siri integration** — "Show me a random tour/right now/chain" works via voice
3. **Shortcuts support** — 3 actions in the Shortcuts app, assignable to Action button
4. **Deep linking** — widget/Siri → specific tour detail via fullScreenCover modal
5. **Spotlight search** — favorite tours searchable from home screen
6. **120MB offline database** — fully functional without internet
7. **Native gestures** — swipe-to-discover roulette with spring physics
8. **Haptic feedback** — context-aware haptics throughout
9. **Share cards** — ImageRenderer-generated share images

This is not a website wrapped in an app. This is an iOS app that happens to display tour data.

---

## Reply to Apple (Final — for Resolution Center)

We've added 8 native iOS capabilities:

- **Home Screen Widgets** — 3 types (Right Now Somewhere, Random Tour, Lock Screen) with interactive "Surprise Me" refresh
- **Siri Integration** — "Show me a random tour," "Show me right now," "Show me a chain"
- **Shortcuts** — 3 actions in the Shortcuts app, assignable to Action button
- **Spotlight Search** — Favorited tours indexed and searchable from home screen
- **Deep Linking** — Widget and Siri taps open specific tour detail views
- **Context-Aware Haptics** — Different feedback patterns for swipes, favorites, navigation
- **Spring Animations** — Physics-based card transitions throughout
- **120MB Offline Database** — All 136,000 tours work without internet

Several of these features were already in development for our next release. Your feedback helped us prioritize shipping them in v1.1.

## What's New (App Store listing)

- Home Screen Widgets: see golden-hour tours and random discoveries right from your home screen
- Siri & Shortcuts: "Show me a random tour" — hands-free discovery
- Spotlight Search: find your favorite tours from the home screen
- Enhanced haptics and animations throughout

## Screenshot Plan (Final — 8 screenshots uploaded)

All screenshots 1320 x 2868 (6.9" display). Apple auto-scales to all smaller display sizes.

| # | File | Source | Content |
|---|------|--------|---------|
| 1 | 01-roulette.png | iPhone 17 Pro Max simulator | Tour Roulette — core swipe discovery |
| 2 | 02-right-now.png | iPhone 17 Pro Max simulator | Right Now Somewhere — golden-hour cities |
| 3 | 03-worlds-most.png | iPhone 17 Pro Max simulator | The World's Most — superlatives gallery |
| 4 | 04-six-degrees.png | iPhone 17 Pro Max simulator | Six Degrees — chain timeline |
| 5 | 05-tour-detail.png | iPhone 17 Pro Max simulator | Tour Detail — full tour view |
| 6 | 06-favorites.png | iPhone 17 Pro Max simulator | Favorites — saved tours list |
| 7 | 07-shortcuts.png | iPhone 17 Pro Max simulator | Shortcuts app — TourGraph actions |
| 8 | 08-widgets.png | iPhone 15 Pro (real device, scaled 1.12x) | Home screen with 4 TourGraph widgets |

Screenshots stored in `appstore/screenshots/v1.1-iphone-6.9/`. Old v1.0 screenshots preserved in `appstore/screenshots/iphone-6.9/`.

## App Store Metadata Updates (v1.1)

Updated in App Store Connect alongside the resubmission:

- **Promotional Text**: Added widgets + Siri mention — "Discover the world's most surprising tours — with home screen widgets, Siri, and zero friction."
- **Description**: Added HOME SCREEN WIDGETS, SIRI & SHORTCUTS, and SPOTLIGHT SEARCH sections
- **Keywords**: Replaced `experiences,bucket list` with `widgets,siri`
- **Review Notes**: Detailed v1.1 feature list + step-by-step testing instructions for widgets, Siri, Shortcuts, and Spotlight
- **Build**: Changed from 1 (v1.0) to 2 (v1.1)
- **Version**: Changed from 1.0 to 1.1

## Submission Timeline

| Date | Event |
|------|-------|
| March 3, 2026 | v1.0 submitted to App Store |
| March 5, 2026 | v1.0 rejected (4.2.2 Minimum Functionality) |
| March 5, 2026 | Built Tiers 1-4 native features |
| March 5, 2026 | v1.1 (build 2) archived, uploaded, resubmitted |

---

## Risk Mitigation

**What if Apple rejects again?**
- Reply to the reviewer thread with a detailed feature list
- Request a phone call with App Review (available for 4.2.2 rejections)
- Consider adding more features from V2 list (location-based discovery would require lat/lng backfill)

**Memory limits for widgets?**
- Widget extension has 30MB limit, but GRDB reads rows lazily
- Tested: single query returns <1KB of data, well within limits
- DB file stays on disk; only queried rows load into memory

**App Group migration?**
- No existing users (app was rejected before going live)
- Clean migration: just change the DB path in `DatabaseService.init()`
