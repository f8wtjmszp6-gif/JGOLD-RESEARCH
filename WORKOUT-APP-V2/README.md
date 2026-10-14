# Workout V2

A weekly workout tracker for the phone: gym plans, cardio, stretching and rest,
with goals for the week, past weeks you can swipe back to and edit, and Trends.
Live at https://f8wtjmszp6-gif.github.io/JGOLD-RESEARCH/v2/ and added to the
iPhone home screen.

React 19, Vite and Tailwind 4. Everything is saved on the device in
localStorage; there's no server.

```sh
npm install
npm run dev     # http://localhost:5173/JGOLD-RESEARCH/v2/
npm run lint
npm run build
```

Pushing to `main` deploys it (`.github/workflows/deploy.yml` builds V1 at the
site root and V2 under `/v2/`). An open app notices the new build and reloads
itself (`src/utils/update.js`).

## Where things are

```
src/
  main.jsx, App.jsx       start-up; App holds the header, the week shown and which screen is open
  index.css               Tailwind, the accent color, base styles

  store/                  all the app's data and the rules for it
    useStore.js           the store every screen uses (useStore / makeStore)
    state.js              the shape of the saved state, and helpers that read and change it
    weeks.js              summing up a week, saved weeks and their details, Sunday weeks
    persist.js            loading, saving and bringing older saves up to date

  data/                   fixed content
    workout.js            plans, full body, cool-downs, classes, cardio types, goals
    exercises.js          the exercise bank and which exercises fit which plan
    stretches.js          the stretch bank
    howto/                how-to text for each exercise and stretch

  components/
    home/                 the home tabs: plan cards, cardio, stretching, rest and their sheets
    workout/              a plan's screen: exercises, sets, splits, timers, stretches, pickers
    week/                 This week card, day strip, goal bars, muscle map
    ui/                   shared pieces: bottom sheet, steppers, toggles, menus, icons
    Trends.jsx            Trends screen
    SettingsDrawer.jsx    Settings
    Notifications.jsx     the bell's list

  hooks/                  timers and wake lock, drag to close, drag to reorder
  utils/                  dates, goals, sound, backup, notifications, number formatting, updates
```

## Saved data

- `workout-tracker-v2`: everything V2 saves (see the top of `src/store/state.js`).
- `workout-v2-home-tab`: the last home tab you used.
- `workout-v2-updated-to`: the build the app last reloaded itself to.
- `workout-tracker` belongs to V1, which shares this site. V2 never reads or
  removes it.

Settings → Backup saves a file you can restore from later.

`icon.svg` is the source for the app icons in `public/`.
