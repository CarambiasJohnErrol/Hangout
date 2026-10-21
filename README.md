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

Share a hangout by copying a ready-to-paste invite for the group chat, or a link that lets a
friend add the whole plan to their own Hangout HQ.

## Running it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

It also works as-is on GitHub Pages (Settings → Pages → deploy from the `main` branch).

## Data

Everything is stored in your browser's `localStorage`. Use **Friends → Export backup** to save a
JSON file and **Import backup** to restore it on another device.
