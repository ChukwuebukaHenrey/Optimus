const storageKey = 'library.books';
const books = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
const form = document.querySelector('#book-form');
const titleInput = form.elements.namedItem('title');
const list = document.querySelector('#books');
const emptyMessage = document.querySelector('#empty-message');
const template = document.querySelector('#book-template');

function saveBooks() {
  localStorage.setItem(storageKey, JSON.stringify(books));
}

function updateEmptyMessage() {
  emptyMessage.hidden = books.length > 0;
}

function addCard(book) {
  const card = template.content.firstElementChild.cloneNode(true);
  const status = card.querySelector('.book-status');
  const toggle = card.querySelector('.toggle');
  const remove = card.querySelector('.remove');

  card.querySelector('.book-title').textContent = book.title;
  card.querySelector('.book-author').textContent = `By ${book.author}`;
  card.querySelector('.book-pages').textContent = book.pages
    ? `${book.pages} pages`
    : 'Pages not specified';
  status.textContent = book.read ? 'Read' : 'Not read';
  toggle.setAttribute('aria-label', `Toggle read for ${book.title}`);
  remove.setAttribute('aria-label', `Remove ${book.title}`);

  toggle.addEventListener('click', () => {
    book.read = !book.read;
    saveBooks();
    status.textContent = book.read ? 'Reading' : 'Not read';
  });

  remove.addEventListener('click', () => {
    const adjacentCard = card.nextElementSibling ?? card.previousElementSibling;
    books.splice(books.indexOf(book), 1);
    saveBooks();
    card.remove();
    updateEmptyMessage();
    const nextFocus = adjacentCard?.querySelector('.remove') ?? titleInput;
    nextFocus.focus();
  });

  list.append(card);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(form);
  const book = {
    title: fields.get('title').trim(),
    author: fields.get('author').trim(),
    pages: fields.get('pages'),
    read: fields.has('read'),
  };

  books.push(book);
  saveBooks();
  addCard(book);
  updateEmptyMessage();
  form.reset();
  titleInput.focus();
});

books.forEach(addCard);
updateEmptyMessage();
