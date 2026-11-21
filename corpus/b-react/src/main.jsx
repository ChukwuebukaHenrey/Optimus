import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const STORAGE_KEY = 'reading-list.books'
const SAMPLE_BOOKS = [
  { id: 'sample-1', title: 'The Hobbit', author: 'J. R. R. Tolkien', pages: 310, finished: true },
  { id: 'sample-2', title: 'Kindred', author: 'Octavia E. Butler', pages: 264, finished: false },
]
const formatNumber = new Intl.NumberFormat('en')

function loadBooks() {
  try {
    const storedBooks = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(storedBooks)) return storedBooks
  } catch {
    // A fresh list is available even when browser storage cannot be read.
  }

  return SAMPLE_BOOKS
}

function ReadingList() {
  const [books, setBooks] = useState(loadBooks)
  const [storageError, setStorageError] = useState(false)
  const dialogRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }, [books])

  const finishedCount = books.filter((book) => book.finished).length
  const totalPages = books.reduce((total, book) => total + book.pages, 0)

  function addBook(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const book = {
      id: crypto.getRandomValues(new Uint32Array(4)).join('-'),
      title: fields.get('title').trim(),
      author: fields.get('author').trim(),
      pages: Number(fields.get('pages')),
      finished: fields.get('status') === 'finished',
    }

    setBooks((current) => [...current, book])
    dialogRef.current.close()
  }

  function toggleStatus(id) {
    setBooks((current) =>
      current.map((book) => book.id === id ? { ...book, finished: !book.finished } : book),
    )
  }

  function deleteBook(id) {
    setBooks((current) => current.filter((book) => book.id !== id))
  }

  return (
    <main className="layout">
      <header className="page-header">
        <h1>Reading list</h1>
        <button
          aria-label="Add book"
          className="add-button"
          onClick={() => dialogRef.current.showModal()}
          title="Add book"
          type="button"
        >
          <span aria-hidden="true" className="plus-icon" />
        </button>
      </header>

      {storageError && (
        <p className="storage-error" role="status">
          Browser storage is unavailable. Changes may be lost on reload.
        </p>
      )}

      <div className="content">
        <section aria-label="Books" className="book-list">
          <table aria-label="Reading list">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Author</th>
                <th scope="col" className="numeric">Pages</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <th scope="row">{book.title}</th>
                  <td>{book.author}</td>
                  <td className="numeric">{formatNumber.format(book.pages)}</td>
                  <td>
                    <button
                      className={book.finished ? 'status status-finished' : 'status'}
                      title={`Toggle reading status for ${book.title}`}
                      onClick={() => toggleStatus(book.id)}
                      type="button"
                    >
                      {book.finished ? 'Finished' : 'To read'}
                    </button>
                  </td>
                  <td className="actions">
                    <button
                      aria-label="Delete"
                      className="delete-button"
                      title={`Delete ${book.title}`}
                      onClick={() => deleteBook(book.id)}
                      type="button"
                    >
                      <span aria-hidden="true" className="trash-icon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {books.length === 0 && <p className="empty-state">No books in your reading list.</p>}
        </section>

        <aside aria-labelledby="summary-title" className="summary">
          <h2 id="summary-title">Summary</h2>
          <dl>
            <div>
              <dt>Total books</dt>
              <dd>{formatNumber.format(books.length)}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{formatNumber.format(finishedCount)}</dd>
            </div>
            <div>
              <dt>To read</dt>
              <dd>{formatNumber.format(books.length - finishedCount)}</dd>
            </div>
            <div>
              <dt>Total pages</dt>
              <dd>{formatNumber.format(totalPages)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <dialog
        aria-labelledby="add-title"
        onClose={() => formRef.current.reset()}
        ref={dialogRef}
        className="book-dialog"
      >
        <h2 id="add-title">Add book</h2>
        <form onSubmit={addBook} ref={formRef}>
          <label htmlFor="book-title">Title</label>
          <input autoFocus id="book-title" name="title" pattern={String.raw`.*\S.*`} required />

          <label htmlFor="book-author">Author</label>
          <input id="book-author" name="author" pattern={String.raw`.*\S.*`} required />

          <div className="form-row">
            <div>
              <label htmlFor="book-pages">Pages</label>
              <input
                id="book-pages"
                name="pages"
                type="number"
                min="1"
                max={Number.MAX_SAFE_INTEGER}
                step="1"
                required
              />
            </div>
            <div>
              <label htmlFor="book-status">Status</label>
              <select defaultValue="to-read" id="book-status" name="status">
                <option value="to-read">To read</option>
                <option value="finished">Finished</option>
              </select>
            </div>
          </div>

          <div className="dialog-actions">
            <button onClick={() => dialogRef.current.close()} type="button">Cancel</button>
            <button className="save-button" type="submit">Save</button>
          </div>
        </form>
      </dialog>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<ReadingList />)
