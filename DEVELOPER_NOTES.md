# Campfire Songbook — Developer Notes

A plain-English map of how the app works, so future-you (or a future Claude session)
can pick it back up quickly. Last updated at cache version **campfire-v24**.

---

## 1. What it is

A mobile-first web app (PWA) for a group of friends to track guitar songs that are
good for campfires. Anyone can browse/add songs to a shared list, keep their own
"Currently Know" and "To-Do" lists, leave notes, see what everyone else knows, and
spin a slot machine to pick what to play.

- **Live site:** https://aidanh18790.github.io/campfire-songbook
- **Repo:** https://github.com/aidanh18790/campfire-songbook
- **Hosting:** GitHub Pages (static files, served from the repo root)
- **Backend:** Firebase Firestore (project `campfire-ed6f3`), no server code

There is no build step and no framework. It's plain HTML/CSS/JavaScript in one file
plus a service worker. You edit the files and re-upload them to the repo.

---

## 2. The files (all live in the repo root)

| File | What it is |
|------|-----------|
| `index.html` | The entire app — HTML, CSS, and JS all in one file. This is 95% of everything. |
| `sw.js` | Service worker. Caches the app so it opens offline; must bypass Firebase/Google domains. |
| `manifest.webmanifest` | Tells phones it's an installable app (name, colors, icons). |
| `icon-192.png`, `icon-512.png` | App icons (the flame). |
| `apple-touch-icon.png` | Home-screen icon for iPhones. |

Only `index.html` and `sw.js` change in normal day-to-day work. The manifest and
icons are basically set-and-forget.

---

## 3. How updates reach phones (important!)

1. Edit `index.html` (and/or `sw.js`).
2. **Bump the cache version** in `sw.js` — the line `const CACHE = "campfire-vN";`.
   Increment N every time you change `index.html`, or phones keep serving the old
   cached copy. This is the #1 thing to not forget.
3. Upload the changed file(s) to the GitHub repo (overwrite — same filenames).
4. On each phone, opening the app twice picks up the new version (the service worker
   serves the old copy once, fetches the new one in the background, swaps on next open).
   A full delete-and-re-add of the home-screen app is the nuclear option if something
   seems stuck.

---

## 4. The data model (Firestore)

Everything lives in one Firestore database. Collections/documents:

```
songs/{songId}
  title, artist, genres[], sortKey (number, used for "date added" order),
  addedBy (a user's id, or "seed"), addedByName,
  communalNotes (shared notes text), communalBy, communalAt

songs/{songId}/notes/{userId}      <- per-person notes on a song
  text, name, color, uid, updatedAt

users/{userId}                     <- a person's public profile
  name, color, updatedAt

users/{userId}/lists/{songId}      <- which of a person's lists a song is in
  status: "known" | "todo" | null
  starred: true/false
  updatedAt

meta/init        <- a guard doc; if it exists, the 49 seed songs are already loaded
meta/admin       <- { hash } : SHA-256 of the admin passphrase
```

**Key idea:** a person's identity (`userId`) IS their recovery code. There are no real
accounts. See Identity below.

**Supply & demand counts** come from reading *every* user's `lists` subcollection at
once via a Firestore "collection group query" on `lists`. That's how a song row can
show "Known by 3 / Want to learn 2" and who they are.

---

## 5. Identity & recovery codes (no real login)

We tried Google sign-in and dropped it — installed iPhone PWAs get stuck in an OAuth
redirect loop. So identity is intentionally simple:

- On first run, the person picks a name + color. We generate a friendly id like
  `ember-7K3Q` and store it in the browser's `localStorage` (keys `cf-uid`, `cf-name`,
  `cf-color`). That id is their document id under `users/`.
- That id doubles as their **recovery code**. If they delete the app or switch phones,
  they enter the code on the "I have a recovery code" screen and `restoreProfile()`
  loads `users/{code}` back onto the device.
- Because there are no passwords, **anyone with a code can load that profile**, and
  **all lists/notes are publicly visible** — this is by design for a friend group.

(Older profiles created before recovery codes existed keep their original long random
ids as their codes — still works, just not pretty.)

---

## 6. Admin ("soft" admin)

- Stored as a SHA-256 hash of a passphrase in `meta/admin`. First person to open the
  Admin panel (You tab → Admin) sets it.
- Unlocking sets `localStorage cf-admin = "1"` and the in-memory `isAdmin` flag.
- When admin: the People tab and user pages show **Rename** and **Remove** buttons for
  anyone (fixes duplicate names, removes people).
- This is **UI-gated, not enforced** — the Firestore rules are wide open, so a
  determined person could bypass it via the console. Fine for friends; not real security.

---

## 7. Firestore security rules

Because there are no logged-in users, the rules are fully open:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

If reads/writes ever start failing with permission errors, check this first — it must
stay open for the no-login model to work.

---

## 8. How the code in index.html is organized

It's one big `<script type="module">`. Rough top-to-bottom order:

1. **Firebase config + imports** — `initializeApp`, Firestore loaded from the gstatic CDN.
   Firestore uses `persistentLocalCache` so data works offline and queued writes sync later.
2. **Helpers** — `esc()` (escape HTML), `linkify()`, `avatar()` (colored initials),
   `gcolor()` (genre→color), `searchLinks()` (auto Spotify/Apple Music search URLs),
   `sha256()`.
3. **`seedRows()`** — the original 49 songs, loaded once on first run.
4. **State** — module-level variables: `me`, `songs`, `songsMap`, `myLists`, `usersMap`,
   `allLists` (everyone's lists for counts), plus UI state like `query`, `activeGenres`,
   `excludeGenres`, `sortMode`/`sortDir`, `collapsed`, `userGenres`, `noRepeats`/`spinPlayed`.
5. **Identity functions** — `localId`, `loadProfile`, `saveProfile`, `restoreProfile`,
   recovery code generation.
6. **Admin functions** — `sha256`, `getAdminHash`, `adminRename`, `adminRemove`, etc.
7. **Data ops** — `addSong`, `deleteSong`, `saveSongFields`, `saveCommunal`,
   `savePersonalNote`, `setStatus`, `toggleStar`. These write to Firestore.
8. **Listeners** — `startListeners()` sets up real-time `onSnapshot` listeners on
   songs, the current user's lists, all users, and the collection-group lists.
   When data changes, it re-renders.
9. **Router** — hash-based. `route()` reads `location.hash`. Views: `home`, `song/{id}`,
   `people`, `spin`, `me`, `user/{uid}`.
10. **Render functions** — `chrome()` draws the top bar + bottom nav around a view's
    inner HTML. Then `renderHome`, `renderSong`, `renderUser`, `renderPeople`,
    `renderSpin`, plus `songRow`/`listItem` row builders.
11. **Global click handler** — one big `document.addEventListener("click", ...)` that
    reads `data-*` attributes (`data-go`, `data-open`, `data-plus`, `data-star`,
    `data-set`, `data-genre`, `data-ugenre`, `data-sort`, `data-collapse`,
    `data-expand`, `data-arename`, `data-aremove`). This is how almost all interaction
    is wired — add a button with a `data-` attribute, handle it here.
12. **Sheets** — bottom-sheet popups: `openListSheet` (+button), `openAddSheet`,
    `openEditSong`, `nameSheet`, `openCodeSheet`, `openAdminSheet`, `confirmDuplicate`.
13. **Gate** — `renderGate` (pick a name), `renderRestore` (enter recovery code),
    `showNewCode` (shows the code after first sign-up).
14. **Boot** — registers the service worker, requests persistent storage, loads the
    profile, then either shows the gate or starts listeners and renders.
    **Offline-boot gotcha (already fixed in v15):** boot must call `startListeners()`
    and `render()` FIRST, then fire `ensureProfile()`/`ensureSeed()` in the background
    (not `await` them). Offline, those Firestore writes hang forever instead of failing,
    so awaiting them before `render()` leaves the app stuck on "Gathering round the
    fire…". The same non-blocking pattern is used in the sign-up and restore flows.

---

## 9. Rendering model (how the screen updates)

- The whole app is re-rendered by replacing `root.innerHTML`. There's no virtual DOM.
- A re-render happens whenever a Firestore listener fires or the user does something.
- **Gotcha that's already handled:** on the song page, re-rendering would wipe text
  you're typing or reset scroll. The code captures textarea values, focus, cursor
  position, expand state, and horizontal scroll of the genre chips before re-rendering
  and restores them after. If you add new inputs to a frequently-re-rendered page,
  remember they can be clobbered by a background update.
- The song-page notes listener is attached **once per song** (tracked by `notesSongId`)
  to avoid an infinite re-render loop. Don't reattach it inside the render path.

---

## 10. Layout (why the bars stay put)

iOS standalone PWAs mishandle `position:fixed`, so the layout is a locked flex column:

- `body` is `position:fixed; inset:0` (can't scroll the page itself).
- `#root` is a flex column at `100dvh`.
- The top bar and bottom nav are non-scrolling flex children (always visible).
- Only `.wrap` (the middle) scrolls.

If you ever see bars drifting again, this is the part to look at.

---

## 11. Common tasks (how to...)

- **Change a color / spacing:** edit the CSS in the `<style>` block at the top of
  `index.html`. Colors are CSS variables in `:root` (e.g. `--ember`, `--known`, `--todo`).
- **Add a new page/tab:** add a route in `route()`, a `renderX()` function, a dispatch
  line in `render()`, and a nav button in `chrome()`.
- **Add a button action:** give the element a `data-something="value"` attribute and
  handle it in the global click handler.
- **Add a genre color:** add it to `GENRE_COLORS` and a matching `--g-...` CSS variable.
- **Change the seed songs:** edit `seedRows()`. Note: seeding only happens once ever
  (guarded by `meta/init`). To re-seed a fresh database, delete the `meta/init` doc in
  the Firebase console.

---

## 12. Known limitations / things to watch

- **No real auth** — identity is per-device, recoverable only via the code; anyone with
  a code can load that profile. Admin is soft.
- **localStorage can be cleared** — iOS Safari may evict it after ~7 days of non-use for
  non-installed sites; installing to the home screen + the persistent-storage request
  reduce this. Recovery codes are the safety net.
- **Bump the cache version** on every `index.html` change or updates won't show.
- **Supply/demand uses a collection-group query** — if counts ever come back empty with
  a console error containing a link, click the link to create the Firestore index.
- **Spin "no repeats" set is per-session** — it resets when the app fully closes.

---

## 13. Quick glossary of the main state variables

- `me` — `{uid, name, color}` for the current device's profile.
- `songs` / `songsMap` — the shared songbook (array and id→song lookup).
- `myLists` — current user's `{songId: {status, starred}}`.
- `allLists` — everyone's lists rolled up to `{songId: {known:[uids], todo:[uids]}}`.
- `usersMap` — `{uid: {name, color}}` for everyone (People tab, names on notes).
- `isAdmin` — whether admin tools are unlocked on this device.

## 14. Arrangement picker (replaced the free-text rating note)

The per-song difficulty note is no longer a free-text box. It's now a multiple-choice
**arrangement** picker: **As recorded / Simple strumming / Fingerstyle / Other**. The
text box only appears when **Other** is selected. Stored in the SAME `diffNote` field as
before (a preset string, or the custom text for Other) — no data migration; old free-text
notes read back as an "Other" value. `arrangePicker()` builds it; chip taps are handled in
the global click handler via `data-arrange`/`data-arrval` (preset = `saveDiffNote(value)`,
tapping the active one clears it, `__other` opens/closes the box). `arrangeOther` (a Set of
songIds) tracks whether the Other box is open even before any text is saved, and survives
background re-renders; clearing a difficulty rating also clears it. Lives on both the song
page and the spin pick card.


## 15. Sign out (added in campfire-v23)

There's now a **Sign out** link on the You page, alongside Edit name / Recovery code /
Admin. It opens a sheet (`openSignOutSheet()`) that shows the recovery code FIRST —
because the code IS the account (see Identity, section 5) — lets you copy it, then signs
out behind a two-tap confirm (same pattern as deleting a song).

`signOut()` clears the localStorage keys (`cf-uid`, `cf-name`, `cf-color`, `cf-admin`)
and calls `location.reload()`. The reload is deliberate: the Firestore listeners are
keyed to `me.uid` and guarded by the `started` flag, so a soft sign-out + new sign-in
would leave stale listeners pointing at the old profile. A full reload resets all module
state, and `boot()` then sees no profile and shows the name gate. The cached app shell
makes the reload work offline too.

## 16. Scroll preservation on song & spin pages (campfire-v24)

Rating a song, picking an arrangement, or any action that writes to Firestore triggers
a full re-render (`root.innerHTML` replace). Previously the song and spin pages jumped
back to the top on every such re-render — `renderHome` already preserved scroll but
`renderSong`/`renderSpin` did not. Both now capture `.wrap` scrollTop before the re-render
and restore it after. On the song page it's restored only when `lastSong===id` (i.e. a
re-render of the same song, not a fresh navigation, which should start at top). On the
spin page it's restored only inside the `lastSpinPick` reveal-restore block, so fresh
entries to the tab still start at top.

Also: the arrangement each person picked ("Plays it · Fingerstyle", etc.) is shown to
everyone under their name in the "How others rated it" block on the song page — it's the
same `diffNote` field, prefixed with a muted "Plays it ·" label for clarity.
