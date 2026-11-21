# Reading list

A local React and Vite app for tracking books and reading status. The list starts with two sample books on first visit.

## Run locally

Use Node.js 18 or newer.

```sh
npm install
npm run dev
```

Open the local URL Vite prints. Use the round Add book button to add an entry, select its status to toggle it, and use the trash button to delete it. The summary updates when the list changes. The browser saves the list in localStorage for the current origin, including when every book has been deleted.

Run `npm run build` to create the production build in `dist/`.
