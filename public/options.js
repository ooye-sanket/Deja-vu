console.log("New updated version Running");

let bookmarks = [];
let tagsArray = [];
let chosenBookmarks = bookmarks;
let chosenBookmarksListObj = null;
let counter = 0;
let editToggle = false;

const describeEl = document.getElementById("options-describe");
const tagsEl = document.getElementById("options-tags");
const optionsCreatedTagsWrapper = document.getElementById("options-created-tags-wrapper");
const tableWrapper = document.getElementById("bookmark-table-content");

document.getElementById("search-button").addEventListener("click", handleSearch);
document.getElementById("edit-button").addEventListener("click", toggleEditMode);
document.getElementById("bookmark-table-content").addEventListener("click", handleTableClick);
describeEl.addEventListener("keyup", handleDescribeKeyUp);
tagsEl.addEventListener("keyup", handleTagsKeyUp);
optionsCreatedTagsWrapper.addEventListener("click", handleTagClick);

async function loadBookmarks() {
  const result = await chrome.storage.local.get(["bookmarks"]);
  if (!result.bookmarks) {
    tableWrapper.innerHTML = `<div class="no-bookmark-message"><span>No Bookmarks Yet</span></div>`;
    return;
  }
  bookmarks = JSON.parse(result.bookmarks).map(bookmark => ({
    ...bookmark,
    strTagsArray: JSON.parse(bookmark.strTagsArray),
  }));
  chosenBookmarks = bookmarks;
  renderTable();
}

function handleDescribeKeyUp() {
  tagsEl.disabled = describeEl.value.trim() !== "";
}

function handleTagsKeyUp(event) {
  const value = tagsEl.value.trim();
  describeEl.disabled = value !== "" || tagsArray.length !== 0;

  if (event.key === " " && value !== "") {
    addTag(value);
  }
}

function handleTagClick(event) {
  deleteTag(event.target.dataset.id);
}

function handleSearch() {
  if (!describeEl.value.trim() && !tagsEl.value.trim() && tagsArray.length === 0) return;

  if (!describeEl.value.trim() || tagsArray.length !== 0) {
    searchByTags();
  } else {
    ask(describeEl.value);
  }
}

function toggleEditMode() {
  editToggle = !editToggle;
  document.getElementById("edit-message-wrapper").style.display = editToggle ? "block" : "none";
  document.getElementById("bookmark-table-content").style.cursor = editToggle ? "pointer" : "auto";
  renderTable();
}

function handleTableClick(event) {
  if (editToggle) {
    deleteBookmark(event.target.parentElement.dataset.id);
  }
}

async function addTag(tag) {
  optionsCreatedTagsWrapper.style.marginTop = "10px";
  tagsArray.push({ id: generateCustomUUID(), value: tag.trim() });
  renderTags();
}

function deleteTag(id) {
  tagsArray = tagsArray.filter(tag => tag.id !== id);
  renderTags();
}

function renderTags() {
  if (tagsArray.length === 0) {
    optionsCreatedTagsWrapper.style.marginTop = "0px";
    describeEl.disabled = false;
  }
  optionsCreatedTagsWrapper.innerHTML = tagsArray.map(tag => `<span class="tag" data-id=${tag.id}>${tag.value}</span>`).join("");
  tagsEl.value = "";
}

function generateCustomUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function deleteBookmark(id) {
  chosenBookmarks = chosenBookmarks.filter(bookmark => bookmark.id !== id);
  await chrome.storage.local.set({
    bookmarks: JSON.stringify(chosenBookmarks.map(bookmark => ({
      ...bookmark,
      strTagsArray: JSON.stringify(bookmark.strTagsArray),
    }))),
  });
  renderTable();
}

const threeDotSVG = `
<svg width="120" height="30" viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" fill="#fff">
  <circle cx="15" cy="15" r="15">
    <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite" />
    <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite" />
  </circle>
  <circle cx="60" cy="15" r="9" fill-opacity="0.3">
    <animate attributeName="r" from="9" to="9" begin="0s" dur="0.8s" values="9;15;9" calcMode="linear" repeatCount="indefinite" />
    <animate attributeName="fill-opacity" from="0.5" to="0.5" begin="0s" dur="0.8s" values=".5;1;.5" calcMode="linear" repeatCount="indefinite" />
  </circle>
  <circle cx="105" cy="15" r="15">
    <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite" />
    <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite" />
  </circle>
</svg>`;

async function ask(question) {
  tableWrapper.innerHTML = `
  <div class="loading-bookmark-message">${threeDotSVG}</div>
  <div class="loading-message">If the search is taking longer than usual, it's likely due to the model downloading.</div>
  <div class="loading-message">Nothing to worry about, the model is small and just needs to be loaded once.</div>`;
  chosenBookmarksListObj = new ChosenBookmarksList();
  for (const bookmark of bookmarks) {
    await compareTwoMessages({
      action: "classify",
      sentence1: question,
      sentence2: `${bookmark.describe} ${bookmark.title}`,
      details: { ...bookmark },
    });
  }
}

async function compareTwoMessages(message) {
  await chrome.runtime.sendMessage(message, async response => {
    counter++;
    chosenBookmarksListObj.addToList(message, response);
    if (counter === bookmarks.length) {
      renderList();
      counter = 0;
    }
  });
}

function searchByTags() {
  if (tagsEl.value.trim()) {
    addTag(tagsEl.value);
  }
  const temp = bookmarks.filter(bookmark =>
    bookmark.strTagsArray.some(tag => tagsArray.some(ele => ele.value === tag))
  );
  chosenBookmarks = temp.length ? temp : bookmarks;
  renderTable();
}

function renderTable() {
  tableWrapper.innerHTML = chosenBookmarks.length === 0 ? 
    `<div class="no-bookmark-message"><span>No Bookmarks Yet</span></div>` : 
    chosenBookmarks.map((bookmark, index) => `
    <div class="titles-content" data-id=${bookmark.id}>
      <div class="hash" id="num">${index + 1}</div>
      <div class="favicon" id="favicon"><img src=${bookmark.favIconUrl} /></div>
      <div>${bookmark.title}</div>
      <div>${bookmark.strTagsArray.join(" , ")}</div>
      <div>${bookmark.describe}</div>
      <div id="options-link-wrapper"><a href=${bookmark.url} id="options-link" target="_blank">
        <svg width="18" height="18" viewBox="0 0 24 24"><path vector-effect="non-scaling-stroke" d="M18.25 15.5a.75.75 0 0 0 .75-.75v-9a.75.75 0 0 0-.75-.75h-9a.75.75 0 0 0 0 1.5h7.19L6.22 16.72a.75.75 0 1 0 1.06 1.06L17.5 7.56v7.19c0 .414.336.75.75.75z"></path></svg>
      </a></div>
    </div><hr />`).join("");
}

function renderList() {
  tableWrapper.innerHTML = chosenBookmarksListObj.renderList();
  if (chosenBookmarksListObj.length >= 10) {
    tableWrapper.innerHTML += `<div class="top-bookmark-message"><span>Showing the top 10 results</span></div>`;
  }
}

class ChosenBookmarksList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  addToList(message, alike) {
    const node = { ...message.details, alike, next: null, prev: null };
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      let pointer = this.head;
      while (pointer && alike <= pointer.alike) {
        pointer = pointer.next;
      }
      if (!pointer) {
        this.tail.next = node;
        node.prev = this.tail;
        this.tail = node;
      } else {
        node.next = pointer;
        node.prev = pointer.prev;
        if (pointer.prev) pointer.prev.next = node;
        else this.head = node;
        pointer.prev = node;
      }
    }
    this.length++;
    if (this.length > 10) {
      this.tail = this.tail.prev;
      this.tail.next = null;
      this.length--;
    }
  }

  renderList() {
    let listHTML = "";
    let pointer = this.head;
    let index = 1;
    while (pointer) {
      listHTML += `
      <div class="titles-content" data-id=${pointer.id}>
        <div class="hash" id="num">${index}</div>
        <div class="favicon" id="favicon"><img src=${pointer.favIconUrl} /></div>
        <div>${pointer.title}</div>
        <div>${pointer.strTagsArray.join(" , ")}</div>
        <div>${pointer.describe}</div>
        <div id="options-link-wrapper"><a href=${pointer.url} id="options-link" target="_blank">
          <svg width="18" height="18" viewBox="0 0 24 24"><path vector-effect="non-scaling-stroke" d="M18.25 15.5a.75.75 0 0 0 .75-.75v-9a.75.75 0 0 0-.75-.75h-9a.75.75 0 0 0 0 1.5h7.19L6.22 16.72a.75.75 0 1 0 1.06 1.06L17.5 7.56v7.19c0 .414.336.75.75.75z"></path></svg>
        </a></div>
      </div><hr />`;
      pointer = pointer.next;
      index++;
    }
    return listHTML;
  }
}

loadBookmarks();
