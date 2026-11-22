I fixed the Remove button. It was deleting the wrong book: whichever Remove button you clicked, the code took out the first card in the list and the first book in saved storage.

The fix is in `app.js:38-50`. Each Remove button now deletes its own card, and its own book from saved storage. The book is found by the object itself, not by its title, so two books with the same title don't get mixed up. After a removal, focus still moves to the next card's Remove button, or to the title field if no books are left.

I haven't run the app or any tests, as the brief asked. The re-check should show "GP Beta 1b7e12-run-0" still listed after removing "GP Alpha 1b7e12-run-0".

One thing I couldn't fully explain: the check saw "none" after the removal. The old bug should have left one book on screen, not zero. My fix addresses the bug I found in the code, but if the re-check still shows "none", the cause is something else.
