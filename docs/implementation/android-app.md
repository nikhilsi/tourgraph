# TourGraph Android App — Implementation Plan

---
**Created**: March 7, 2026
**Status**: Complete — app built, tested, release pipeline active
**Reference**: GitaVani Android (`../gitavani/android/`) for patterns, `docs/android-playbook.md` for distribution
**Architecture**: See `android-architecture.md` for what was actually built
---

## Overview

Native Android port of the TourGraph iOS app. Full feature parity: all 4 features, home screen widgets, haptics, favorites, share cards, deep linking, enrichment. Same bundled 120MB SQLite database.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | Kotlin 2.1 | Same as GitaVani |
| UI | Jetpack Compose (Material 3) | Maps 1:1 to SwiftUI |
| Min SDK | API 26 (Android 8.0) | Same as GitaVani |
| Target SDK | 35 | Same as GitaVani |
| Database | Raw SQLiteDatabase | NOT Room — queries copy from iOS verbatim |
| Images | Coil 3 | Compose-native, fetches Viator CDN photos |
| HTTP | OkHttp 4 | Per-tour enrichment calls |
| Widgets | Glance (Jetpack) | Android equivalent of WidgetKit |
| JSON | kotlinx.serialization | Chain JSON parsing |
| Navigation | Navigation Compose | Bottom nav with 4 tabs |
| State | ViewModel + StateFlow | Maps to @Observable |
| Preferences | SharedPreferences | Maps to UserDefaults |
| Build | Gradle 8.11.1 + AGP 8.9.1 | Same as GitaVani |

**Third-party dependencies**: Coil (image loading) + OkHttp (HTTP). Everything else is first-party Jetpack/kotlinx.

## iOS → Android Mapping

| iOS | Android |
|-----|---------|
| SwiftUI View | @Composable function |
| @Observable @MainActor | ViewModel + StateFlow |
| GRDB.swift (SQLite) | Raw SQLiteDatabase |
| UserDefaults | SharedPreferences |
| NavigationStack + TabView | Navigation Compose + NavigationBar |
| DragGesture (swipe cards) | Modifier.pointerInput + detectDragGestures |
| WidgetKit | Glance (androidx.glance) |
| CoreSpotlight | Not ported (Android has no equivalent worth the complexity) |
| App Intents / Siri | Not ported (no Android equivalent) |
| UIImpactFeedbackGenerator | VibrationEffect / Vibrator API |
| UIActivityViewController | Intent.ACTION_SEND |
| ImageRenderer (share cards) | Canvas → Bitmap rendering |
| AsyncImage (Viator photos) | Coil AsyncImage composable |
| App Group (shared DB) | Not needed — widgets share app sandbox |

### Not Ported (iOS-Only Features)

- **Siri Shortcuts / App Intents** — no Android equivalent
- **Spotlight indexing** — Android AppSearch exists but adds little value
- **Lock screen widget** — Android removed lock screen widgets after 4.x

These were added to satisfy Apple's 4.2.2 rejection. Google Play has no equivalent "minimum functionality" concern.

## Project Structure

```
android/TourGraph/
├── app/
│   ├── src/main/
│   │   ├── java/com/nikhilsi/tourgraph/
│   │   │   ├── MainActivity.kt
│   │   │   ├── TourGraphApplication.kt         # Application class (widget DB init)
│   │   │   │
│   │   │   ├── model/
│   │   │   │   ├── Tour.kt                     # data class (22 fields, maps to tours table)
│   │   │   │   ├── Chain.kt                    # ChainRow, ChainLink, ChainData, Chain
│   │   │   │   └── Superlative.kt              # SuperlativeType enum + SuperlativeResult
│   │   │   │
│   │   │   ├── data/
│   │   │   │   ├── DatabaseService.kt           # SQLiteOpenHelper, all queries
│   │   │   │   ├── TourEnrichmentService.kt     # OkHttp GET/POST + DB write
│   │   │   │   └── TimezoneHelper.kt            # Golden hour / pleasant time logic
│   │   │   │
│   │   │   ├── state/
│   │   │   │   ├── AppSettings.kt               # SharedPreferences (haptics toggle)
│   │   │   │   └── Favorites.kt                 # SharedPreferences (favorite tour IDs)
│   │   │   │
│   │   │   ├── viewmodel/
│   │   │   │   └── TourGraphViewModel.kt        # AndroidViewModel, all state
│   │   │   │
│   │   │   ├── theme/
│   │   │   │   └── Theme.kt                     # Dark-mode-only MaterialTheme
│   │   │   │
│   │   │   ├── ui/
│   │   │   │   ├── navigation/
│   │   │   │   │   └── NavGraph.kt              # Bottom nav + routes
│   │   │   │   ├── roulette/
│   │   │   │   │   ├── RouletteScreen.kt        # Swipe card + "Show Me Another"
│   │   │   │   │   └── RouletteState.kt         # Hand algorithm + contrast sequencing
│   │   │   │   ├── rightnow/
│   │   │   │   │   └── RightNowScreen.kt        # Golden hour tour cards
│   │   │   │   ├── worldsmost/
│   │   │   │   │   └── WorldsMostScreen.kt      # 6 superlative cards
│   │   │   │   ├── sixdegrees/
│   │   │   │   │   └── SixDegreesScreen.kt      # Chain timeline
│   │   │   │   ├── detail/
│   │   │   │   │   └── TourDetailScreen.kt      # Full tour + enrichment
│   │   │   │   ├── settings/
│   │   │   │   │   ├── SettingsScreen.kt        # Haptics, favorites, about
│   │   │   │   │   ├── AboutScreen.kt           # App info
│   │   │   │   │   └── FavoritesScreen.kt       # Saved tours list
│   │   │   │   └── common/
│   │   │   │       ├── TourCard.kt              # Reusable tour card composable
│   │   │   │       ├── ShareUtils.kt            # Bitmap render + Intent share
│   │   │   │       └── HapticManager.kt         # VibrationEffect wrappers
│   │   │   │
│   │   │   └── widget/
│   │   │       ├── RandomTourWidget.kt          # Glance widget (small + medium)
│   │   │       ├── RightNowWidget.kt            # Glance widget (small + medium)
│   │   │       └── WidgetDatabase.kt            # Lightweight read-only DB for widgets
│   │   │
│   │   ├── assets/
│   │   │   └── tourgraph.db                     # 120MB bundled SQLite (gitignored, copied from iOS seed)
│   │   │
│   │   ├── res/
│   │   │   ├── mipmap-*/                        # App icon (adaptive)
│   │   │   ├── values/strings.xml, themes.xml, colors.xml
│   │   │   ├── xml/                             # Widget metadata XMLs
│   │   │   └── drawable/                        # Widget previews
│   │   │
│   │   └── AndroidManifest.xml
│   │
│   ├── build.gradle.kts
│   └── proguard-rules.pro
│
├── build.gradle.kts                             # Project-level
├── settings.gradle.kts
├── gradle/libs.versions.toml                    # Version catalog
├── gradle.properties
└── gradlew / gradlew.bat
```

Additional repo-level files:
- `fastlane/metadata/android/en-US/` — F-Droid + Play Store metadata
- `.github/workflows/android-release.yml` — CI/CD for GitHub Releases

## Build Phases

### Phase 1: Skeleton + Database (Day 1)

Set up Android Studio project, build config (adapted from GitaVani), version catalog. Copy 120MB seed DB into assets/. Implement `DatabaseService.kt` (SQLiteOpenHelper that copies from assets to app files on first launch, opens read-write). Port `Tour.kt`, `Chain.kt`, `Superlative.kt` data models. Implement `TourGraphViewModel.kt`. Verify: app launches, DB loads, log tour count.

**Key decision**: Raw SQLiteDatabase (not Room). Our iOS app has 7 hand-written SQL queries. Copying them verbatim to Kotlin is simpler than defining Room entities/DAOs for a read-heavy app with one write query (enrichment).

### Phase 2: Tour Roulette (Day 2)

Port `getRouletteHand()` query with category quotas + contrast sequencing algorithm. Implement `RouletteState.kt`. Build `TourCard.kt` composable (Coil AsyncImage for photo, gradient overlay, title, one-liner, stats). Build `RouletteScreen.kt` with custom swipe gesture (Modifier.pointerInput + detectDragGestures). Set up `NavGraph.kt` with bottom navigation bar (4 tabs). Implement `HapticManager.kt`.

### Phase 3: Right Now Somewhere (Day 2-3)

Port `TimezoneHelper.swift` to Kotlin (java.util.TimeZone + Calendar for golden hour detection). Port timezone-filtered queries. Build `RightNowScreen.kt` with time-of-day labels.

### Phase 4: World's Most (Day 3)

Port all 6 superlative queries. Build `WorldsMostScreen.kt` with emoji headers and highlighted stats.

### Phase 5: Six Degrees (Day 3-4)

Port chain JSON parsing + `getToursByIds()` batch lookup. Build `SixDegreesScreen.kt` with vertical timeline UI (numbered circles, connection text, tour cards with photos).

### Phase 6: Tour Detail + Enrichment (Day 4)

Build `TourDetailScreen.kt` (full description, photo gallery with Coil, highlights, "Book on Viator" button). Port `TourEnrichmentService` using OkHttp (GET for single tour, POST for batch). Wire lazy loading on detail tap.

### Phase 7: Settings, Favorites, Share (Day 4-5)

Port `Favorites.kt` and `AppSettings.kt` (SharedPreferences). Build `FavoritesScreen.kt`, `SettingsScreen.kt`, `AboutScreen.kt`. Implement share card rendering (Canvas → Bitmap) + Intent.ACTION_SEND. Add favorite hearts to all tour cards.

### Phase 8: Deep Linking (Day 5)

Add intent filter in AndroidManifest for `tourgraph://` scheme. Handle tab navigation and tour-specific deep links.

### Phase 9: Widgets (Day 5-6)

Implement `WidgetDatabase.kt` (read-only DB access). Build `RandomTourWidget.kt` and `RightNowWidget.kt` using Glance API. Register in AndroidManifest. Note: widget photo loading requires downloading image in CoroutineWorker → passing Bitmap to Glance (Glance can't use Coil directly).

### Phase 10: Distribution (Day 6)

Generate keystore. Set up conditional signing in build.gradle.kts (F-Droid compatible). Create GitHub Actions workflow (adapted from GitaVani). Create fastlane metadata structure. Build release APK + AAB, verify AAB < 150MB.

### Phase 11: Polish (Day 6-7)

Spring animations (Compose `animateFloatAsState` with spring spec). Splash screen (Android 12+ API). Edge-to-edge display. ProGuard rules for kotlinx.serialization. Test on emulators. Take screenshots.

## Database Strategy

The 120MB seed DB is the same file used by iOS. It contains 136,256 tours + 491 chains.

**Bundling**: Copied into `app/src/main/assets/tourgraph.db`. At first launch, `DatabaseService` copies from assets to `context.filesDir` (app-internal storage). Subsequent launches open from files dir directly.

**Git**: The DB file is gitignored (too large for regular git). Managed via Git LFS alongside the iOS copy. See separate Git LFS setup.

**Widgets**: Android widgets run in the app's process and share the same sandbox — no App Group needed (unlike iOS). `WidgetDatabase.kt` opens the same DB file read-only.

## AAB Size Estimate

| Component | Estimated Size |
|-----------|---------------|
| tourgraph.db | ~120 MB |
| Code + Compose + dependencies | ~8 MB |
| Resources (icons, strings) | ~1 MB |
| **Total (compressed AAB)** | **~100-110 MB** |

SQLite DBs compress well in AABs. Should be comfortably under the 150MB Play Store limit. We'll verify early in Phase 1.

## Distribution Channels

| Channel | Status | Method |
|---------|--------|--------|
| GitHub Releases | Set up in Phase 10 | Tag push → GitHub Actions → signed APK + AAB |
| F-Droid | Submit after v1.0.0 | MR to gitlab.com/fdroid/fdroiddata |
| Google Play | After F-Droid submission | AAB upload, closed testing → production |

**Package name**: `com.nikhilsi.tourgraph`

## What's Copied from GitaVani

| Component | How |
|-----------|-----|
| `build.gradle.kts` (project) | Copy verbatim |
| `settings.gradle.kts` | Copy, rename to "TourGraph" |
| `gradle.properties` | Copy verbatim |
| `gradlew` + wrapper | Copy verbatim |
| `libs.versions.toml` | Extend with Coil, Glance, OkHttp |
| `app/build.gradle.kts` | Adapt namespace/applicationId, add deps |
| `proguard-rules.pro` | Adapt package name in keep rules |
| `MainActivity.kt` pattern | Same edge-to-edge + theme setup |
| `AppSettings.kt` pattern | Same SharedPreferences + StateFlow |
| Signing config pattern | Identical conditional keystore loading |
| GitHub Actions workflow | Adapt paths |
| Fastlane metadata structure | Copy structure, rewrite content |

## Key Differences from GitaVani

| Aspect | GitaVani | TourGraph |
|--------|----------|-----------|
| Data source | JSON (35MB) | SQLite (120MB) |
| Data access | kotlinx.serialization | Raw SQLiteDatabase |
| Images | None (text app) | Coil (Viator CDN photos) |
| Network | None (fully offline) | OkHttp (enrichment) |
| Widgets | None | Glance (2 widget types) |
| Tabs | None (stack nav) | 4-tab bottom navigation |
| Swipe gesture | HorizontalPager (verses) | Custom drag (roulette cards) |
| Share | Text only | Image card + text |
| Theme | 4 themes | Dark-only |
