# Persistence compatibility harness

Run the Phase 1 safety checks with:

```sh
npm test
npm run check:syntax
npm run report:persistence
```

`tests/fixtures/persistence-v029.json` contains synthetic input states for current v0.29.x behaviour. Objects and arrays in `localStorage` are serialized by `helpers.mjs`; `{ "$raw": "..." }` represents deliberately malformed raw storage text. IndexedDB rows use the current `RosterBotPersonalDB` / `kv` shape and are serialized the same way before recovery tests.

The registry is reporting-only. Production backup, Cloud Sync, and IndexedDB code continue to own their existing allow-lists in Phase 1; the registry test detects drift between those lists and `js/01-persistence-registry.js`.
