# TourGraph Android — Architecture

**Last Updated**: March 7, 2026

## Overview

Native Android version of TourGraph using Kotlin + Jetpack Compose. Full feature parity with the iOS app: all 4 core features, home screen widgets, rich share cards, app shortcuts, search indexing, deep linking, favorites, haptics, and lazy per-tour enrichment. Same repo, `android/` folder alongside `ios/`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Kotlin 2.1 |
| UI | Jetpack Compose (Material 3) |
| Min SDK | API 26 (Android 8.0) |
| Target SDK | 35 |
| Database | Raw SQLiteDatabase (NOT Room) |
| Images | Coil 3 |
| HTTP | OkHttp 4 (per-tour enrichment) |
| Widgets | Glance (Jetpack) |
| JSON | kotlinx.serialization (chain parsing) |
| Navigation | Navigation Compose |
| State | ViewModel + StateFlow |
| Preferences | SharedPreferences |
| Build | Gradle 8.11.1 + AGP 8.9.1 |

**Third-party dependencies**: Coil (image loading) + OkHttp (HTTP). Everything else is first-party Jetpack/kotlinx.

**Key decision**: Raw SQLiteDatabase, not Room. The iOS app has hand-written SQL queries in GRDB. Copying them verbatim to Kotlin is simpler than defining Room entities/DAOs for a read-heavy app with one write path (enrichment).

## Project Structure

```
android/TourGraph/
├── app/src/main/
│   ├── java/com/nikhilsi/tourgraph/
│   │   ├── MainActivity.kt                   # Deep link handling, edge-to-edge
│   │   ├── TourGraphApplication.kt           # Application class
│   │   │
│   │   ├── model/
│   │   │   ├── Tour.kt                       # 22 fields, maps to tours table
│   │   │   ├── Chain.kt                      # ChainRow, ChainLink, ChainData, Chain
│   │   │   └── Superlative.kt                # SuperlativeType enum + result
│   │   │
│   │   ├── data/
│   │   │   ├── DatabaseService.kt            # SQLiteOpenHelper, all queries
│   │   │   ├── TourEnrichmentService.kt      # OkHttp GET/POST + DB write
│   │   │   └── TimezoneHelper.kt             # Golden hour / pleasant time
│   │   │
│   │   ├── state/
│   │   │   ├── AppSettings.kt                # SharedPreferences (haptics toggle)
│   │   │   └── Favorites.kt                  # SharedPreferences (tour IDs) + StateFlow
│   │   │
│   │   ├── search/
│   │   │   └── SearchIndexer.kt              # Dynamic shortcuts for favorited tours
│   │   │
│   │   ├── viewmodel/
│   │   │   └── TourGraphViewModel.kt         # AndroidViewModel, all state + actions
│   │   │
│   │   ├── theme/
│   │   │   └── Theme.kt                      # Dark-mode-only MaterialTheme
│   │   │
│   │   ├── ui/
│   │   │   ├── navigation/NavGraph.kt        # Bottom nav (4 tabs) + routes
│   │   │   ├── roulette/RouletteScreen.kt    # Swipe card + "Show Me Another"
│   │   │   ├── rightnow/RightNowScreen.kt    # Golden hour tour cards
│   │   │   ├── worldsmost/WorldsMostScreen.kt # 6 superlative cards
│   │   │   ├── sixdegrees/SixDegreesScreen.kt # Chain timeline + tour photos
│   │   │   ├── detail/TourDetailScreen.kt    # Full tour + enrichment + gallery
│   │   │   ├── settings/
│   │   │   │   ├── SettingsScreen.kt
│   │   │   │   ├── AboutScreen.kt
│   │   │   │   └── FavoritesScreen.kt
│   │   │   └── common/
│   │   │       ├── TourCard.kt               # Reusable card (image-on-top, Material)
│   │   │       ├── ShareCardRenderer.kt      # Canvas → 1200x630 branded bitmap
│   │   │       ├── ShareUtils.kt             # Bitmap → FileProvider → Intent share
│   │   │       └── HapticManager.kt          # VibrationEffect wrappers
│   │   │
│   │   └── widget/
│   │       ├── RandomTourWidget.kt           # Glance (small + medium)
│   │       ├── RightNowWidget.kt             # Glance (small + medium)
│   │       └── WidgetDatabase.kt             # Lightweight read-only DB
│   │
│   ├── assets/
│   │   └── tourgraph.db                      # 120MB bundled SQLite (Git LFS)
│   │
│   └── res/
│       ├── mipmap-*/                         # App icon (all densities)
│       ├── values/strings.xml, themes.xml, colors.xml
│       ├── xml/shortcuts.xml                 # 3 static app shortcuts
│       ├── xml/file_paths.xml                # FileProvider config for share cards
│       ├── xml/random_tour_widget_info.xml
│       └── xml/right_now_widget_info.xml
│
├── build.gradle.kts
├── settings.gradle.kts
├── gradle/libs.versions.toml
├── gradle.properties
└── gradlew / gradlew.bat
```

## iOS to Android Mapping

| iOS | Android |
|-----|---------|
| SwiftUI View | @Composable function |
| @Observable @MainActor | ViewModel + StateFlow |
| GRDB.swift (SQLite) | Raw SQLiteDatabase |
| UserDefaults | SharedPreferences |
| NavigationStack + TabView | Navigation Compose + NavigationBar |
| DragGesture (swipe cards) | Modifier.pointerInput + detectDragGestures |
| WidgetKit | Glance (androidx.glance) |
| CoreSpotlight | ShortcutManagerCompat (dynamic shortcuts) |
| App Intents / Siri Shortcuts | Static shortcuts (shortcuts.xml) |
| UIImpactFeedbackGenerator | VibrationEffect / Vibrator API |
| UIActivityViewController | Intent.ACTION_SEND |
| ImageRenderer (share cards) | Canvas + Bitmap + TextPaint + StaticLayout |
| AsyncImage (SwiftUI) | Coil AsyncImage composable |
| App Group (shared DB) | Not needed — widgets share app sandbox |

## Data Flow

```
assets/tourgraph.db (120 MB)
    │  copied to app files dir on first launch
    ▼
DatabaseService (SQLiteOpenHelper)
    │  all queries: roulette hand, right now, superlatives,
    │  chains, tour detail, favorites lookup
    ▼
TourGraphViewModel (AndroidViewModel)
    │  holds DB, enrichment, favorites, settings, haptics
    │  exposes StateFlow for each screen
    ▼
NavGraph → Compose Screens
    │  collect StateFlow as Compose state
    ▼
UI renders (dark theme, Coil images, Material 3)
```

### Enrichment Flow

```
User taps tour card
    ▼
TourDetailScreen requests full data
    ▼
TourEnrichmentService.enrichTour(tourId)
    │  GET https://tourgraph.ai/api/ios/tour/{id}
    ▼
Server returns full description + photo gallery URLs
    ▼
DatabaseService writes to local DB (UPDATE tours SET ...)
    ▼
Future views read enriched data locally (no re-fetch)
```

## Navigation

4-tab bottom navigation:

| Tab | Route | Screen |
|-----|-------|--------|
| Roulette | `roulette` | RouletteScreen |
| Right Now | `rightnow` | RightNowScreen |
| World's Most | `worldsmost` | WorldsMostScreen |
| Six Degrees | `sixdegrees` | SixDegreesScreen |

Additional routes (pushed onto tab stacks):

| Route | Screen |
|-------|--------|
| `settings` | SettingsScreen (gear icon in top bar) |
| `about` | AboutScreen |
| `favorites` | FavoritesScreen |
| `tour_detail/{tourId}` | TourDetailScreen |

**Note**: `saveState` and `restoreState` are disabled on tab switches to prevent stale sub-routes (e.g., favorites screen appearing when tapping Six Degrees after visiting Settings > Favorites).

## Deep Linking

`tourgraph://` URL scheme registered in AndroidManifest.

| URI | Action |
|-----|--------|
| `tourgraph://tab/roulette` | Navigate to Roulette tab |
| `tourgraph://tab/rightnow` | Navigate to Right Now tab |
| `tourgraph://tab/worldsmost` | Navigate to World's Most tab |
| `tourgraph://tab/sixdegrees` | Navigate to Six Degrees tab |
| `tourgraph://tour/{id}` | Open tour detail screen |

Handled in `MainActivity.onNewIntent()` for warm starts and `LaunchedEffect` for cold starts.

## Widgets (Glance)

Two widget types, each in small + medium sizes:

| Widget | Content | Refresh |
|--------|---------|---------|
| Right Now Somewhere | Golden-hour tour with destination + local time | 30 min |
| Random Tour | Random tour photo + one-liner | 30 min |

`WidgetDatabase.kt` opens the same DB file read-only. No App Group needed (unlike iOS) — Android widgets share the app's sandbox.

## Rich Share Cards

`ShareCardRenderer.kt` renders 1200x630 branded bitmaps using Android Canvas API:

- **Tour cards**: Hero photo (downloaded via URL) + linear gradient overlay + badge + title + one-liner + stats (rating, price, duration) + tourgraph.ai branding
- **Chain cards**: Dark background + amber radial gradient + city pair headline + numbered circles on connecting line + tourgraph.ai branding

Images saved to cache dir, shared via `FileProvider` with `content://` URIs through `Intent.ACTION_SEND`.

## App Shortcuts

3 static shortcuts defined in `res/xml/shortcuts.xml` (visible on long-press of app icon):

| Shortcut | Deep Link |
|----------|-----------|
| Random Tour | `tourgraph://tab/roulette` |
| Right Now | `tourgraph://tab/rightnow` |
| Six Degrees | `tourgraph://tab/sixdegrees` |

## Search Indexing

`SearchIndexer.kt` indexes favorited tours as dynamic shortcuts via `ShortcutManagerCompat`. Searchable from the device launcher. Max 15 shortcuts. Re-indexes automatically when favorites change.

## Build Commands

```bash
cd android/TourGraph
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Debug build
./gradlew assembleDebug

# Install on emulator
~/Library/Android/sdk/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk

# Release APK (requires signing)
./gradlew assembleRelease

# Release AAB (for Play Store)
./gradlew bundleRelease
```

## Release Size

| Component | Size |
|-----------|------|
| tourgraph.db (bundled) | ~120 MB |
| Code + Compose + dependencies | ~8 MB |
| Resources (icons, strings) | ~1 MB |
| **Debug APK** | **53 MB** |
| **Release AAB** | **~100-110 MB** (under 150 MB limit) |

SQLite compresses well in both APK and AAB formats.

## Signing

- Keystore: `keystore/tourgraph-release.jks` (gitignored)
- Credentials: `keystore.properties` (gitignored)
- `build.gradle.kts` reads signing config conditionally — builds succeed without keystore (for F-Droid)

## Distribution

| Channel | Status | Auto-update |
|---------|--------|-------------|
| GitHub Releases | Active — push `v*` tag | Yes (GitHub Actions) |
| F-Droid | [MR #34392](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/34392) pending | Yes (detects new tags) |
| Google Play | Not yet submitted | Manual AAB upload |

### Release Process

1. Bump `versionCode` (integer) and `versionName` in `app/build.gradle.kts`
2. Commit and tag: `git tag v1.1.0 && git push origin main --tags`
3. GitHub Actions auto-builds signed APK + AAB, publishes to GitHub Releases
4. F-Droid auto-detects the new tag (1-2 week build cycle)
5. Play Store: manually upload new AAB in Play Console

### CI/CD

`.github/workflows/android-release.yml` — triggered on `v*` tag push:
1. Checkout with LFS
2. Set up JDK 17
3. Decode keystore from GitHub secret (base64)
4. Create `keystore.properties` from secrets
5. Build release APK + AAB
6. Create GitHub Release with both artifacts
