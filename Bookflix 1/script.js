const BOOKS_KEY = "bookflix-books-v2";
const LIST_KEY = "bookflix-my-list-v2";
function readStorage(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
let books = readStorage(BOOKS_KEY, starterBooks);
let myList = new Set(readStorage(LIST_KEY, []));
let activeCategory = "All";
let selectedBook = null;

const grid = document.querySelector("#bookGrid");
const listGrid = document.querySelector("#myListGrid");
const searchInput = document.querySelector("#search");
const addDialog = document.querySelector("#addBookDialog");
const addForm = document.querySelector("#addBookForm");

function saveStorage() {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  localStorage.setItem(LIST_KEY, JSON.stringify([...myList]));
}

function makeCard(book, savedArea = false) {
  const card = document.createElement("article");
  card.className = "book-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `View ${book.title}`);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const heart = document.createElement("button");
  heart.className = `heart-button${myList.has(book.id) ? " saved" : ""}`;
  heart.type = "button";
  heart.textContent = myList.has(book.id) ? "♥" : "♡";
  heart.title = myList.has(book.id) ? "Remove from My List" : "Add to My List";
  heart.setAttribute("aria-label", heart.title);
  heart.addEventListener("click", event => {
    event.stopPropagation();
    toggleSaved(book.id);
  });
  actions.appendChild(heart);
  if (book.custom) {
    const remove = document.createElement("button");
    remove.className = "delete-book";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Delete book";
    remove.setAttribute("aria-label", `Delete ${book.title}`);
    remove.addEventListener("click", event => {
      event.stopPropagation();
      books = books.filter(item => item.id !== book.id);
      myList.delete(book.id);
      saveStorage();
      render();
      showToast("Book removed.");
    });
    actions.appendChild(remove);
  }

  if (book.cover) {
    const image = document.createElement("img");
    image.src = book.cover;
    image.alt = `Cover of ${book.title}`;
    image.loading = "lazy";
    image.onerror = () => { image.replaceWith(makeCoverPlaceholder(book.title)); };
    card.appendChild(image);
  } else card.appendChild(makeCoverPlaceholder(book.title));

  const info = document.createElement("div");
  info.className = "book-info";
  const title = document.createElement("h3");
  title.textContent = book.title;
  const meta = document.createElement("p");
  meta.textContent = `${book.category} · ${book.author}`;
  info.append(title, meta);
  card.append(actions, info);
  card.addEventListener("click", () => openBook(book));
  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openBook(book); }
  });
  return card;
}

function makeCoverPlaceholder(title) {
  const placeholder = document.createElement("div");
  placeholder.className = "cover-placeholder";
  placeholder.textContent = title;
  return placeholder;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = books.filter(book => {
    const matchesCategory = activeCategory === "All" || book.category === activeCategory;
    const matchesSearch = `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
  grid.replaceChildren(...visible.map(book => makeCard(book)));
  document.querySelector("#noBooks").hidden = visible.length > 0;
  document.querySelector("#popularHeading").textContent = activeCategory === "All" ? "Popular Books" : `${activeCategory} Books`;
  document.querySelectorAll("[data-category]").forEach(button => button.classList.toggle("active", button.dataset.category === activeCategory));

  const savedBooks = books.filter(book => myList.has(book.id));
  listGrid.replaceChildren(...savedBooks.map(book => makeCard(book, true)));
  document.querySelector("#emptyList").hidden = savedBooks.length > 0;
}

function toggleSaved(id) {
  if (myList.has(id)) myList.delete(id); else myList.add(id);
  saveStorage();
  render();
}

function openBook(book) {
  selectedBook = book;
  const cover = document.querySelector("#detailCover");
  cover.src = book.cover || "";
  cover.hidden = !book.cover;
  cover.alt = `Cover of ${book.title}`;
  document.querySelector("#detailTitle").textContent = book.title;
  document.querySelector("#detailAuthor").textContent = `✍️ Author: ${book.author}`;
  document.querySelector("#detailCategory").textContent = `Category: ${book.category}`;
  document.querySelector("#detailSynopsis").textContent = book.synopsis || "No synopsis provided.";
  document.querySelector("#storyPanel").hidden = true;
  document.querySelector("#storyHeading").textContent = `Reading: ${book.title}`;
  document.querySelector("#storyText").textContent = book.story || "No story has been added yet.";
  document.querySelector("#readBook").disabled = !book.story;
  const saveButton = document.querySelector("#saveBook");
  saveButton.textContent = myList.has(book.id) ? "♥ In My List" : "♡ My List";
  document.querySelector("#bookDialog").showModal();
}

document.querySelector("#openAddBook").addEventListener("click", () => addDialog.showModal());
document.querySelector("#cancelAddBook").addEventListener("click", () => {
  addForm.reset();
  addDialog.close();
});
addForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(addForm);
  const title = data.get("title").trim();
  const author = data.get("author").trim();
  if (books.some(book => book.title.toLowerCase() === title.toLowerCase() && book.author.toLowerCase() === author.toLowerCase())) {
    showToast("This book is already in the catalogue.");
    return;
  }
  books.unshift({
    id: `custom-${Date.now()}`,
    title,
    author,
    category: data.get("category"),
    cover: data.get("cover").trim(),
    synopsis: data.get("synopsis").trim(),
    story: "",
    custom: true
  });
  saveStorage();
  addForm.reset();
  addDialog.close();
  activeCategory = "All";
  searchInput.value = "";
  render();
  showToast("Book added to Bookflix!");
  document.querySelector("#popular").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#saveBook").addEventListener("click", () => {
  if (selectedBook) toggleSaved(selectedBook.id);
  if (selectedBook) document.querySelector("#saveBook").textContent = myList.has(selectedBook.id) ? "♥ In My List" : "♡ My List";
});
document.querySelector("#readBook").addEventListener("click", () => {
  document.querySelector("#storyPanel").hidden = false;
  document.querySelector("#storyPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
});
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => document.getElementById(button.dataset.close).close()));
document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
}));
document.querySelector("#categoryList").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  render();
});
searchInput.addEventListener("input", render);

const menuToggle = document.querySelector("#menuToggle");
const mainMenu = document.querySelector("#mainMenu");
function closeMenu() {
  mainMenu.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Buka menu");
}
menuToggle.addEventListener("click", () => {
  const open = mainMenu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
});
mainMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("click", event => { if (!event.target.closest(".navbar")) closeMenu(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

document.querySelector("#year").textContent = new Date().getFullYear();
render();


