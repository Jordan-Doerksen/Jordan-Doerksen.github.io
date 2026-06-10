// ==========================================================================
// LIBRARY — renders books from data/books.json, and powers the
// "Open a random page" button:
//   1. Try the free Quotable API (4-second timeout)
//   2. On any failure, pull from data/quotes-fallback.json
// ==========================================================================

import { setupModal } from '../modal.js';

export async function initLibrary() {
  await renderBooks();
  wireQuoteButton();
}

async function renderBooks() {
  let books = [];
  try {
    books = await (await fetch('data/books.json')).json();
  } catch {
    return; // lists just stay empty if the JSON can't load
  }

  const lists = {
    reading: document.getElementById('books-reading'),
    recommended: document.getElementById('books-recommended'),
  };

  for (const book of books) {
    const target = lists[book.status];
    if (!target) continue;
    const li = document.createElement('li');
    li.className = 'book';
    li.innerHTML = `
      <b>${esc(book.title)}</b>
      <span class="author">${esc(book.author)}</span>
      ${book.why ? `<span class="why">${esc(book.why)}</span>` : ''}
    `;
    target.appendChild(li);
  }
}

function wireQuoteButton() {
  const btn = document.getElementById('quote-btn');
  const modalEl = document.getElementById('quote-modal');
  if (!btn || !modalEl) return;

  const modal = setupModal(modalEl);
  const textEl = document.getElementById('quote-text');
  const attribEl = document.getElementById('quote-attrib');
  const sourceEl = document.getElementById('quote-source');

  let fallback = null; // lazy-loaded once

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Turning pages…';

    const quote = (await fromApi()) || (await fromFallback());

    textEl.textContent = quote ? `“${quote.text}”` : 'The page was blank. Try again.';
    attribEl.textContent = quote ? `— ${quote.author}${quote.work ? `, ${quote.work}` : ''}` : '';
    sourceEl.textContent = quote ? quote.source : '';

    btn.disabled = false;
    btn.textContent = 'Open a random page';
    modal.open();
  });

  async function fromApi() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://api.quotable.io/random?maxLength=140', {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.content) return null;
      return { text: data.content, author: data.author, work: '', source: 'via quotable.io' };
    } catch {
      return null; // offline, blocked, or API down — fall through
    }
  }

  async function fromFallback() {
    try {
      if (!fallback) {
        fallback = await (await fetch('data/quotes-fallback.json')).json();
      }
      const q = fallback[Math.floor(Math.random() * fallback.length)];
      return { ...q, source: 'from the shelf' };
    } catch {
      return null;
    }
  }
}

function esc(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
