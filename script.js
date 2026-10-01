// ---------- Data ----------
// All capsules live in this array and are saved in localStorage
var capsules = [];
var currentTab = "locked";   // which vault tab is showing
var photoData = "";          // the chosen photo, stored as text (base64)

function loadCapsules() {
  var saved = localStorage.getItem("capsules");
  if (saved) {
    capsules = JSON.parse(saved);
  }
}

function saveCapsules() {
  try {
    localStorage.setItem("capsules", JSON.stringify(capsules));
    return true;
  } catch (e) {
    return false; // storage full (big photos do this)
  }
}

// ---------- Small helpers ----------
function formatDate(time) {
  return new Date(time).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Stops people typing HTML into the page
function safeText(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getTimeLeft(unlockTime) {
  var diff = unlockTime - Date.now();
  var days = Math.floor(diff / (1000 * 60 * 60 * 24));
  var hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  var minutes = Math.floor(diff / (1000 * 60)) % 60;
  var seconds = Math.floor(diff / 1000) % 60;
  return days + " DAYS · " + hours + " HOURS · " + minutes + " MIN · " + seconds + " SEC";
}

function isUnlocked(capsule) {
  return Date.now() >= capsule.unlockOn;
}

// ---------- Page switching ----------
function showPage(name) {
  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.remove("active");
  }
  document.getElementById("page-" + name).classList.add("active");

  var navButtons = document.querySelectorAll("nav button");
  for (var j = 0; j < navButtons.length; j++) {
    navButtons[j].classList.toggle("active", navButtons[j].dataset.page === name);
  }

  if (name === "home") showStats();
  if (name === "vault") renderVault();
  if (name === "timeline") renderTimeline();
  if (name === "create") prepareForm();
}

function showStats() {
  var waiting = 0;
  for (var i = 0; i < capsules.length; i++) {
    if (!isUnlocked(capsules[i])) waiting++;
  }
  document.getElementById("homeStats").textContent =
    capsules.length + " capsules saved, " + waiting + " still waiting.";
}

// ---------- Create capsule ----------
function prepareForm() {
  document.getElementById("createdOn").value = formatDate(Date.now());
}

document.getElementById("photo").addEventListener("change", function (event) {
  var file = event.target.files[0];
  photoData = "";
  if (!file) return;
  if (file.size > 1500000) {
    document.getElementById("formError").textContent = "Photo is too big. Pick one under 1.5 MB.";
    event.target.value = "";
    return;
  }
  document.getElementById("formError").textContent = "";
  var reader = new FileReader();
  reader.onload = function () { photoData = reader.result; };
  reader.readAsDataURL(file);
});

document.getElementById("sealBtn").addEventListener("click", function () {
  var title = document.getElementById("title").value.trim();
  var message = document.getElementById("message").value.trim();
  var unlockValue = document.getElementById("unlockOn").value;
  var error = document.getElementById("formError");

  if (title === "" || message === "") {
    error.textContent = "Add a title and a message first.";
    return;
  }
  if (unlockValue === "") {
    error.textContent = "Choose an unlock date.";
    return;
  }
  var unlockTime = new Date(unlockValue).getTime();
  if (unlockTime <= Date.now()) {
    error.textContent = "The unlock date must be in the future.";
    return;
  }

  var capsule = {
    id: Date.now(),
    title: title,
    message: message,
    photo: photoData,
    recipient: document.getElementById("recipient").value.trim(),
    theme: document.getElementById("theme").value,
    createdOn: Date.now(),
    unlockOn: unlockTime,
    openedOn: null
  };

  capsules.push(capsule);
  if (!saveCapsules()) {
    capsules.pop();
    error.textContent = "Not enough browser storage. Try a smaller photo.";
    return;
  }

  // clear the form
  error.textContent = "";
  document.getElementById("title").value = "";
  document.getElementById("message").value = "";
  document.getElementById("recipient").value = "";
  document.getElementById("unlockOn").value = "";
  document.getElementById("photo").value = "";
  photoData = "";

  currentTab = "locked";
  showPage("vault");
});

// ---------- Vault ----------
function renderVault() {
  var list = document.getElementById("vaultList");
  var html = "";

  for (var i = 0; i < capsules.length; i++) {
    var c = capsules[i];
    var opened = c.openedOn !== null;

    // Locked tab = not yet opened. Unlocked tab = already opened.
    if (currentTab === "locked" && opened) continue;
    if (currentTab === "unlocked" && !opened) continue;

    html += '<div class="capsule theme-' + c.theme + '">';
    html += '<div class="latch"></div>';
    html += "<h3>" + (opened ? "🔓 " : "🔒 ") + safeText(c.title) + "</h3>";

    if (opened) {
      html += "<p>Opened: " + formatDate(c.openedOn) + "</p>";
      html += '<button onclick="openCapsule(' + c.id + ')">Read again</button>';
    } else if (isUnlocked(c)) {
      html += "<p>Ready to open!</p>";
      html += '<button onclick="openCapsule(' + c.id + ')">Open capsule</button>';
    } else {
      html += "<p>Opens: " + formatDate(c.unlockOn) + "</p>";
      html += '<p class="countdown" data-unlock="' + c.unlockOn + '"></p>';
      html += "<button disabled>Locked</button>";
    }
    html += "</div>";
  }

  if (html === "") {
    html = currentTab === "locked"
      ? "<p>No locked capsules. Create one to get started.</p>"
      : "<p>Nothing opened yet. Opened capsules show up here.</p>";
  }
  list.innerHTML = html;
  updateCountdowns();
}

// Runs every second to refresh the live countdowns
function updateCountdowns() {
  var items = document.querySelectorAll(".countdown");
  for (var i = 0; i < items.length; i++) {
    var unlockTime = Number(items[i].dataset.unlock);
    if (unlockTime <= Date.now()) {
      renderVault();   // time is up, redraw so the button changes
      return;
    }
    items[i].textContent = getTimeLeft(unlockTime);
  }
}
setInterval(updateCountdowns, 1000);

document.getElementById("tabLocked").addEventListener("click", function () {
  currentTab = "locked";
  this.classList.add("active");
  document.getElementById("tabUnlocked").classList.remove("active");
  renderVault();
});
document.getElementById("tabUnlocked").addEventListener("click", function () {
  currentTab = "unlocked";
  this.classList.add("active");
  document.getElementById("tabLocked").classList.remove("active");
  renderVault();
});

// ---------- Open With Me ----------
var openingCapsule = null;

function openCapsule(id) {
  for (var i = 0; i < capsules.length; i++) {
    if (capsules[i].id === id) openingCapsule = capsules[i];
  }
  if (!isUnlocked(openingCapsule)) return;   // safety check: never show early

  var daysAgo = Math.floor((Date.now() - openingCapsule.createdOn) / (1000 * 60 * 60 * 24));
  var ago = daysAgo === 0 ? "earlier today" : daysAgo + " days ago";
  document.getElementById("introText").textContent =
    "You created this " + ago + ". Let's see what you wanted your future self to remember.";

  // reset the popup to step 1
  document.getElementById("intro").classList.remove("hidden");
  document.getElementById("chest").classList.add("hidden");
  document.getElementById("chest").classList.remove("open");
  document.getElementById("reveal").classList.add("hidden");
  document.getElementById("modal").classList.remove("hidden");
}

document.getElementById("openNowBtn").addEventListener("click", function () {
  var c = openingCapsule;

  // step 2: show the chest and swing the lid open
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("chest").classList.remove("hidden");
  setTimeout(function () {
    document.getElementById("chest").classList.add("open");
  }, 100);

  // fill the content (still invisible)
  document.getElementById("rTitle").textContent = c.title;
  document.getElementById("rMeta").textContent =
    "Sealed on " + formatDate(c.createdOn) + (c.recipient ? " · For " + c.recipient : "");
  document.getElementById("rMessage").textContent = c.message;
  var photo = document.getElementById("rPhoto");
  if (c.photo) { photo.src = c.photo; photo.classList.remove("hidden"); }
  else { photo.classList.add("hidden"); }

  // step 3: after the lid opens, reveal each part one by one
  setTimeout(function () {
    document.getElementById("chest").classList.add("hidden");
    document.getElementById("reveal").classList.remove("hidden");
    var steps = document.querySelectorAll("#reveal .step");
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.remove("show");
      (function (el, delay) {
        setTimeout(function () { el.classList.add("show"); }, delay);
      })(steps[i], 300 + i * 1200);
    }
  }, 1600);

  if (c.openedOn === null) {
    c.openedOn = Date.now();
    saveCapsules();
  }
});

document.getElementById("closeBtn").addEventListener("click", function () {
  document.getElementById("modal").classList.add("hidden");
  renderVault();
});

// ---------- Timeline ----------
function renderTimeline() {
  var box = document.getElementById("timelineList");
  if (capsules.length === 0) {
    box.innerHTML = "<p>No capsules yet. Create one and its story will appear here.</p>";
    return;
  }
  var html = "";
  for (var i = 0; i < capsules.length; i++) {
    var c = capsules[i];
    var unlocked = isUnlocked(c);
    html += '<div class="t-item"><h3>' + safeText(c.title) + "</h3><div class=\"t-steps\">";
    html += '<span class="t-step done">Created ' + formatDate(c.createdOn) + "</span>";
    html += '<span class="t-step done">Locked</span>';
    html += '<span class="t-step ' + (unlocked ? "done" : "now") + '">Waiting until ' + formatDate(c.unlockOn) + "</span>";
    if (c.openedOn) {
      html += '<span class="t-step now">Unlocked ' + formatDate(c.openedOn) + "</span>";
    } else {
      html += '<span class="t-step ' + (unlocked ? "now" : "") + '">' + (unlocked ? "Ready to open" : "Unlocked") + "</span>";
    }
    html += "</div></div>";
  }
  box.innerHTML = html;
}

// ---------- Start ----------
var allButtons = document.querySelectorAll("[data-page]");
for (var b = 0; b < allButtons.length; b++) {
  allButtons[b].addEventListener("click", function () {
    showPage(this.dataset.page);
  });
}
loadCapsules();
showPage("home");
