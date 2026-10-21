# Hangout HQ

Plan any hangout with friends, from a quick coffee to a 60-person birthday.

Every hangout starts with a size: **Quick hang**, **Get-together**, **Party** or **Big event**.
The size decides which planning tools you start with, and you can add or hide any of them later:

- **Guests** with Going / Maybe / Can't RSVPs
- **Who's bringing what**, with an owner for each item
- **To-dos** with assignees and progress
- **Costs & split**: log expenses, set a budget, and see who pays whom to settle up
- **Schedule** for the run of the day
- **Group vote** for picking a date, place or food
- **Notes**
- **Pictures**: a profile photo for you, and a cover photo for each hangout

Share a hangout by copying a ready-to-paste invite for the group chat, or a link that lets a
friend add the whole plan to their own Hangout HQ.

## Running it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

It also works as-is on GitHub Pages (Settings → Pages → deploy from the `main` branch).

## Accounts

With Firebase set up, everyone signs in (email + password, or Google) and gets their own private
hangouts, saved to their account and synced across every device they sign in on.

1. Create a project at https://console.firebase.google.com (Google Analytics not needed).
2. **Build → Authentication → Get started**, then enable **Email/Password** and **Google**.
3. **Authentication → Settings → Authorized domains**: add `carambiasjohnerrol.github.io`.
4. **Build → Firestore Database → Create database** (production mode), then paste
   [`firestore.rules`](firestore.rules) into the **Rules** tab and publish.
5. **Project settings → Your apps → Web (`</>`)**: register an app and copy its `firebaseConfig`
   into [`firebase-config.js`](firebase-config.js).

Each account's data is one Firestore document at `users/<uid>`, readable and writable only by
that signed-in user. Profile and cover pictures are resized in the browser (covers max 1600px, profile photos
max 480px, always under 1 MB) and stored one per document at `users/<uid>/photos/<id>`, under the
same rule, so no paid Cloud Storage is needed. The first time someone signs up, any hangouts already saved in that browser
move into their account.

## Without accounts

If `firebase-config.js` is left as `null`, the app skips sign-in and keeps everything in the
browser's `localStorage`. Use **Friends → Export backup** to save a JSON file and
**Import backup** to restore it.
