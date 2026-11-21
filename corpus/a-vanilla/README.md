# Library

Run the app from this directory with Node.js and npm installed.

```sh
npx serve .
```

Open the local URL printed by Serve. The library starts empty. Enter a title and
author, optionally enter a page count and select Read, then choose Add Book.
Each book has a Toggle read button and a Remove button.

Books are stored in this browser's local storage for the app's origin, so they
remain after a reload. If Serve starts on a different port, the browser treats
that URL as a different origin with its own library.
