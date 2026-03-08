# NOW — What To Work On Next

**Last Updated**: March 7, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Waiting

### iOS App Store Review

v1.1 submitted March 5, 2026. Added 8 native iOS capabilities after v1.0 was rejected under Guideline 4.2.2 (Minimum Functionality): Home Screen Widgets, Siri Shortcuts, Spotlight indexing, deep linking, haptics, spring animations.

**Plan**: `docs/implementation/app-store-resubmission.md`

### F-Droid Review

Submitted [MR #34392](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/34392). AutoUpdateMode configured — new tags auto-detected.

## Up Next

### Android — Real Device Testing

- Test on a physical Android device (emulator-tested only so far)
- Verify widgets render correctly on home screen
- Verify share cards generate and share properly
- Verify deep links from shortcuts work

### Google Play Store Submission

- Generate Play Store screenshots from real device
- Create Play Store listing (title, description, graphics)
- Submit for review

## Future (V2)

- Weekly data refresh (drip indexer on schedule) + delta sync to mobile apps
- On-demand chain generation (user types two cities)
- iPad layout
- City discovery pages (`/cities/takayama`)
- Theme browsing (filter by `craftsmanship`, `sacred`, etc.)
- Dark-mode app icon variant

## Open Decisions

- [ ] Dark-mode app icon variant
