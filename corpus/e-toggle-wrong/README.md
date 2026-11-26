# Library

A small static web app for keeping a list of books, written in plain HTML, CSS
and JavaScript.

## Running

From this directory, with Node.js and npm installed:

```sh
npx serve .
```

Open the local URL printed by Serve.

## Usage

The library starts empty. Enter a title and author, optionally enter a page
count and select Read, then choose Add Book. Each book card has a Toggle read
button and a Remove button.

## Storage

Books are saved in the browser's local storage for the app's origin, so they
remain after a reload. A different port counts as a different origin, with its
own separate library.
