# App Store Resubmission — Native Features Plan

---
**Created**: March 5, 2026
**Status**: In Progress
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

**Siri trigger**: "What tours are happening right now?"

#### 2c. "Get Tour Fact" Intent (non-opening)

```swift
struct GetTourFactIntent: AppIntent {
    static var title: LocalizedStringResource = "Get a Tour Fact"
    static var description = IntentDescription("Get a surprising tour fact")

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        // Returns a text fact without opening the app
        // e.g., "The most expensive tour on Earth costs $47,000 — it's an Antarctic expedition"
        let db = WidgetDatabase()
        let tour = try db.getRandomSuperlativeFact()
        return .result(value: tour)
    }
}
```

**Use case**: Siri responds with a fun fact. Also usable in Shortcuts automations ("Every morning at 8am, show me a tour fact").

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
                    phrases: ["What's happening right now in \(.applicationName)"],
                    shortTitle: "Right Now",
                    systemImageName: "sun.horizon")

        AppShortcut(intent: GetTourFactIntent(),
                    phrases: ["Give me a tour fact from \(.applicationName)"],
                    shortTitle: "Tour Fact",
                    systemImageName: "lightbulb")
    }
}
```

### Technical Notes

- App Intents live in the main app target (not the widget extension)
- `WidgetDatabase` (shared) provides read-only DB access for intents that don't open the app
- Deep linking: intents that open the app use a URL scheme or `NavigationPath` to jump to specific tabs
- iOS 17+ required (matches our deployment target)

---

## Tier 3: Local Notifications

**Why this matters**: Notifications are proactive engagement — the app reaches out to the user, which a website cannot do. A daily "World's Most" notification gives users a reason to come back, driven entirely by on-device data (no push server needed).

### Notification Types

#### 3a. "Daily Discovery" Notification

A daily notification at a user-chosen time featuring a superlative tour.

**Content examples**:
- "Today's most expensive tour: $47,000 for an Antarctic expedition from Ushuaia"
- "Hidden gem alert: 4.9★ waterfall hike in Ubud, just $12"
- "The world's most reviewed tour: 85,000+ reviews in Cancún"

**Rich notification**: Includes tour image as attachment (loaded from cache or bundled URL).

**Scheduling**:
```swift
// Repeating daily notification at user's chosen time
let content = UNMutableNotificationContent()
content.title = "Daily Discovery"
content.body = "The world's most expensive tour: $47,000 for an Antarctic expedition"
content.sound = .default

// Attach tour image
if let imageURL = tour.imageURL {
    let attachment = try UNNotificationAttachment(identifier: "tour-image", url: localImageURL)
    content.attachments = [attachment]
}

let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
```

**How it picks tours**: Each day, a different superlative category (cycles through all 6). The specific tour is random from the top 10 in that category — same logic as `DatabaseService.getSuperlative()`.

#### 3b. Settings Integration

Add to `SettingsView.swift`:

```
Section("Notifications") {
    Toggle("Daily Discovery", isOn: $dailyDiscoveryEnabled)

    if dailyDiscoveryEnabled {
        DatePicker("Delivery Time",
                   selection: $dailyDiscoveryTime,
                   displayedComponents: .hourAndMinute)
    }
}
```

**Defaults**: Off by default (opt-in). Default time: 8:00 AM if enabled.

**Storage**: `UserDefaults` — `dailyDiscoveryEnabled` (Bool), `dailyDiscoveryTime` (Date).

### Technical Notes

- Uses `UNUserNotificationCenter` — local notifications only, no server infrastructure
- Permission request on first toggle-on (standard iOS permission dialog)
- Notification content generated on schedule from bundled DB
- Pre-schedule 7 days of notifications (iOS allows up to 64 pending local notifications)
- Re-schedule on app launch to keep the queue fresh
- Tap notification → deep link to tour detail in the app

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
| 1 | Shared App Group setup + DB migration | — | Tier 1 prep |
| 2 | Move Tour.swift + TimezoneHelper to Shared | Step 1 | Tier 1 prep |
| 3 | Widget extension target + GRDB dependency | Step 2 | Tier 1 |
| 4 | "Right Now" widget (small + medium) | Step 3 | Tier 1 |
| 5 | "Random Tour" widget (small + medium + interactive) | Step 3 | Tier 1 |
| 6 | Lock Screen widget | Step 3 | Tier 1 |
| 7 | App Intents (3 intents + shortcuts provider) | — | Tier 2 |
| 8 | Deep linking (tab navigation from intents/widgets) | Step 7 | Tier 2 |
| 9 | Local notifications (scheduling + settings UI) | — | Tier 3 |
| 10 | Spotlight indexing | — | Tier 4 |
| 11 | Enhanced haptics + spring animations | — | Tier 4 |
| 12 | Test all features on simulator + device | All | Final |
| 13 | New screenshots (showing widgets) | Step 12 | Submission |
| 14 | Archive, upload, resubmit | Step 13 | Submission |

## What This Gives Apple

When the reviewer opens TourGraph v1.1, they see:

1. **Widgets on the home screen** — 3 widget types (Right Now, Random Tour, Lock Screen) with interactive refresh
2. **Siri integration** — "Show me a random tour" works via voice
3. **Shortcuts support** — 3 actions in the Shortcuts app
4. **Proactive notifications** — daily tour discovery alerts with rich images
5. **Spotlight search** — favorite tours searchable from home screen
6. **120MB offline database** — fully functional without internet
7. **Native gestures** — swipe-to-discover roulette with spring physics
8. **Haptic feedback** — context-aware haptics throughout
9. **Share cards** — ImageRenderer-generated share images

This is not a website wrapped in an app. This is an iOS app that happens to display tour data.

---

## Reply to Apple (Draft After Implementation)

To be drafted after all tiers are implemented and tested. The reply will:

1. Acknowledge the feedback respectfully
2. List every native-only feature (widgets, Siri, notifications, Spotlight, haptics, offline DB)
3. Explain that the app provides a curated discovery experience fundamentally different from browsing Viator's catalog
4. Note the 120MB bundled database that works fully offline
5. Include updated screenshots showing widgets on the home screen

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
