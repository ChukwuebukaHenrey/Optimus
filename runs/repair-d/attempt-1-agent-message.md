I fixed it: books you add should now still be there after you reload the page. I haven't run it in a browser, as the brief said, so the independent re-check will confirm it.

**Cause:** The app read the saved list from the browser's local storage when the page opened, but nothing ever wrote to it. New books existed only on the open page, so a reload brought back an empty list.

**Fix (all in `app.js`):**
- **New save step:** a `saveBooks()` function writes the current list to local storage. It runs after you add a book, after you toggle read, and after you remove a book, so all three changes now survive a reload.
- **Safer loading:** a `loadBooks()` function now reads the saved list. If the stored data is broken or isn't a list, the app starts empty instead of failing to load.
- **Safer removal:** Remove now only deletes the book if it's actually in the list. Before, if it wasn't found, the code would have deleted the last book instead.

Nothing else about how the app behaves has changed, and the fix doesn't depend on any particular title or data.
