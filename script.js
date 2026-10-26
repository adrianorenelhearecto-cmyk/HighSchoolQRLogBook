const HSSL_LOGO = "7057_1566490658_9825_-removebg-preview.png";
const DEFAULT_STUDENT_PHOTO = "Gemini_Generated_Image_aklx79aklx79aklx.png";
/* =========================================================================
   QR LOGBOOK SYSTEM — script.js (All Modules Combined)
   ========================================================================= */

const STORAGE = {
  users: "qrlog_users_v3",
  attendance: "qrlog_attendance_v3",
  subjects: "qrlog_subjects_v3"
};

const DEFAULT_USERS = [
  { id: "admin", username: "admin", role: "admin", name: "System Administrator", password: "admin", recoveryEmail: "admin@example.com", active: true },
  { id: "02000422020", studentNo: "02000422020", role: "student", firstName: "Rene Lhea", middleName: "R.", lastName: "Adriano", gender: "Female", photo: DEFAULT_STUDENT_PHOTO, password: "studentpassword", recoveryEmail: "juan.delacruz@example.com", grade: "Grade 11", section: "STEM-A", subjects: ["Mathematics", "Science", "English", "Filipino", "Araling Panlipunan", "Edukasyon sa Pagpapakatao (EsP)", "GMRC", "MAPEH", "TLE"], schedule: [
    { term: "2026-2027 1st Term", subject: "Mathematics", professor: "Maria Santos", slots: [{ day: 1, time: "7:30AM-8:30AM", room: "RM101" }, { day: 3, time: "7:30AM-8:30AM", room: "RM101" }] },
    { term: "2026-2027 1st Term", subject: "Science", professor: "Maria Santos", slots: [{ day: 1, time: "8:30AM-9:30AM", room: "RM102" }, { day: 3, time: "8:30AM-9:30AM", room: "RM102" }] },
    { term: "2026-2027 1st Term", subject: "English", professor: "Ana Reyes", slots: [{ day: 1, time: "9:45AM-10:45AM", room: "RM204" }, { day: 5, time: "8:30AM-9:30AM", room: "RM204" }] },
    { term: "2026-2027 1st Term", subject: "Filipino", professor: "Roberto Mendoza", slots: [{ day: 1, time: "10:45AM-11:45AM", room: "RM205" }, { day: 4, time: "7:30AM-8:30AM", room: "RM205" }] },
    { term: "2026-2027 1st Term", subject: "Araling Panlipunan", professor: "Liza Ramos", slots: [{ day: 2, time: "7:30AM-8:30AM", room: "RM103" }, { day: 4, time: "8:30AM-9:30AM", room: "RM103" }] },
    { term: "2026-2027 1st Term", subject: "Edukasyon sa Pagpapakatao (EsP)", professor: "Carlo Dizon", slots: [{ day: 2, time: "8:30AM-9:30AM", room: "RM104" }, { day: 4, time: "9:45AM-10:45AM", room: "RM104" }] },
    { term: "2026-2027 1st Term", subject: "GMRC", professor: "Rosa Villanueva", slots: [{ day: 3, time: "10:45AM-11:45AM", room: "RM104" }, { day: 5, time: "9:45AM-10:45AM", room: "RM104" }] },
    { term: "2026-2027 1st Term", subject: "MAPEH", professor: "Paolo Garcia", slots: [{ day: 2, time: "9:45AM-10:45AM", room: "Gym" }, { day: 5, time: "7:30AM-8:30AM", room: "Gym" }] },
    { term: "2026-2027 1st Term", subject: "TLE", professor: "Elena Cruz", slots: [{ day: 2, time: "10:45AM-11:45AM", room: "TLE Room" }, { day: 4, time: "10:45AM-11:45AM", room: "TLE Room" }] }
  ], shift: "Morning", active: true },
  { id: "TCH-001", teacherId: "TCH-001", role: "teacher", firstName: "Maria", lastName: "Santos", password: "teacherpassword", recoveryEmail: "maria.santos@example.com", subjects: ["Mathematics", "Science"], shift: "Morning", active: true }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let currentRole = "student";
let currentUser = null;
let currentPage = "student-home";
let scanner = null;
let calendarOffset = 0;
let pendingRecoveryAccount = null;

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[ch]);

function readStore(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() { return readStore(STORAGE.users); }
function saveUsers(users) { writeStore(STORAGE.users, users); }
function getAttendance() { return readStore(STORAGE.attendance); }
function saveAttendance(records) { writeStore(STORAGE.attendance, records); }

function stopScanner() {
  if (!scanner) return;
  if (typeof scanner.stop === "function") scanner.stop();
  scanner = null;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function studentNumber(user) { return String(user.studentNo || user.id || ""); }
function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "Unnamed User";
}

function notify(message) {
  let toast = $("#qr-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "qr-toast";
    Object.assign(toast.style, {
      position: "fixed", bottom: "22px", right: "22px", zIndex: "99999",
      maxWidth: "min(380px, 90vw)", padding: "14px 18px", background: "#352d67",
      color: "white", borderRadius: "12px", boxShadow: "0 10px 30px #0002",
      fontSize: "14px", opacity: "0", transform: "translateY(10px)", transition: "all .25s ease"
    });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
  }, 3000);
}

function initializeData() {
  const users = getUsers();
  const seededUsers = DEFAULT_USERS.filter(seed => {
    const seedId = seed.username || seed.teacherId || seed.studentNo || seed.id;
    return !users.some(user => {
      const accountId = user.username || user.teacherId || user.studentNo || user.id;
      return user.role === seed.role && String(accountId) === String(seedId);
    });
  });
  let usersChanged = seededUsers.length > 0;
  const allUsers = [...users, ...seededUsers];
  DEFAULT_USERS.forEach(seed => {
    const seedId = seed.username || seed.teacherId || seed.studentNo || seed.id;
    const account = allUsers.find(user => {
      const accountId = user.username || user.teacherId || user.studentNo || user.id;
      return user.role === seed.role && String(accountId) === String(seedId);
    });
    if (account && seed.photo && (!account.photo || account.photo === "Assets/rene-adriano.jpg")) {
      account.photo = seed.photo;
      usersChanged = true;
    }
    ["firstName", "middleName", "lastName", "gender", "subjects", "schedule"].forEach(field => {
      if (account && seed[field] && JSON.stringify(account[field]) !== JSON.stringify(seed[field])) {
        account[field] = seed[field];
        usersChanged = true;
      }
    });
    if (account && !account.recoveryEmail) {
      account.recoveryEmail = seed.recoveryEmail;
      usersChanged = true;
    }
  });
  if (usersChanged) saveUsers(allUsers);
  if (!localStorage.getItem(STORAGE.attendance)) { saveAttendance([]); }
  const savedAttendance = getAttendance();
  if (savedAttendance.some(record => record.demo)) {
    saveAttendance(savedAttendance.filter(record => !record.demo));
  }
}

/* AUTHENTICATION PATHWAYS */
function chooseRole(role) {
  currentRole = role;
  $$(".tabs button").forEach(button => {
    button.classList.toggle("active", button.dataset.role === role);
  });
  const idLabel = $("#login-id-label");
  if (idLabel) {
    idLabel.textContent = role === "admin" ? "Admin Username" : role === "teacher" ? "Teacher ID" : "Student Number";
  }
  const idInput = $("#login-id");
  if (idInput) {
    idInput.placeholder = role === "admin" ? "Enter admin username" : role === "teacher" ? "Enter teacher ID" : "Enter student number";
  }
  const error = $("#login-error");
  if (error) error.hidden = true;
}

function login(event) {
  event?.preventDefault();
  const id = $("#login-id")?.value.trim();
  const password = $("#login-password")?.value;

  if (!id || !password) {
    const error = $("#login-error");
    if (error) { error.textContent = "Please enter your ID and password."; error.hidden = false; }
    return;
  }

  const user = getUsers().find(item => {
    const accountId = item.username || item.teacherId || item.studentNo || item.id;
    return String(accountId) === id && item.password === password && item.role === currentRole && item.active !== false;
  });

  if (!user) {
    const error = $("#login-error");
    if (error) { error.textContent = "Invalid login details or account is inactive."; error.hidden = false; }
    return;
  }

  currentUser = user;
  openApplication();
}

function logout() {
  stopScanner();
  stopCarousel();
  closeOverlays();
  currentUser = null;
  $("#app") ? $("#app").hidden = true : null;
  $("#login-screen") ? $("#login-screen").hidden = false : null;
  $("#login-form") ? $("#login-form").reset() : null;
  notify("You have logged out.");
}

function openApplication() {
  $("#login-screen") ? $("#login-screen").hidden = true : null;
  $("#app") ? $("#app").hidden = false : null;
  renderShell();
  goToPage(currentUser.role === "admin" ? "dashboard" : currentUser.role === "teacher" ? "teacher-attendance" : "student-home");
}

function getStudentAttendance() {
  const id = studentNumber(currentUser);
  return getAttendance().filter(record =>
    [record.studentNo, record.studentId, record.userId].some(value => String(value ?? "") === id)
  );
}

/* ICONS */
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v.01M14 20.5h3M20.5 17v3.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8.5 12h7M8.5 16h5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12.5 16V8M17 16v-8"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17v.01"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
  pause: '<path d="M9 6.5v11M15 6.5v11" stroke-width="2.6"/>',
  play: '<path d="M8.5 6v12l9.5-6z" fill="currentColor"/>',
  "chev-l": '<path d="m14.5 6-6 6 6 6"/>',
  "chev-r": '<path d="m9.5 6 6 6-6 6"/>'
};

const PAGE_ICONS = {
  dashboard: "home", "admin-scanner": "qr", students: "users", teachers: "users",
  attendance: "clipboard", reports: "chart",
  "teacher-attendance": "clipboard", "teacher-profile": "user",
  "teacher-schedule": "calendar", "teacher-students": "users",
  "student-home": "home", "student-qr": "qr", "student-profile": "user",
  "student-schedule": "calendar", "student-attendance": "clipboard"
};

function icon(name, size = 18) {
  return `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}

/* STUDENT DASHBOARD */
let carouselTimer = null;
let carouselIndex = 0;
let carouselPaused = false;

const SLIDES = [
  { title: "Welcome to QR Logbook", text: "Your attendance is logged by scanning your student QR code. Check your records here any time." },
  { title: "Check your schedule", text: "Open My Schedule to see your subjects with the days, times, rooms and professors for the term." },
  { title: "Keep your details correct", text: "Open My Profile to review your grade, section and shift. Tell your teacher if anything is wrong." }
];

const AVATAR_TONES = ["#5a50b5", "#7a6fd0", "#4e459f", "#059669", "#d99a1c", "#6556bd"];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function accountIdOf(user) {
  return String(user.username || user.teacherId || user.studentNo || user.id || "");
}

function studentSubjects() {
  const enrolled = Array.isArray(currentUser?.subjects) ? [...currentUser.subjects] : [];
  getStudentAttendance().forEach(record => {
    const subject = String(record.subject || "").trim();
    if (subject && !enrolled.some(name => name.toLowerCase() === subject.toLowerCase())) enrolled.push(subject);
  });
  return enrolled;
}

function courseCardsHTML(subjects) {
  if (!subjects.length) {
    return '<div class="panel empty">You are not enrolled in any courses yet.</div>';
  }
  const detail = [currentUser.grade, currentUser.section].filter(Boolean).join(" · ") || "Not set";
  const records = getStudentAttendance();
  return subjects.map((subject, i) => {
    const words = String(subject).trim().split(/\s+/);
    const abbr = String(subject).match(/\(([^)]+)\)/);
    const initials = (abbr ? abbr[1] : /^[A-Z]{2,5}$/.test(subject) ? subject : words.length > 1 ? words[0][0] + words[1][0] : String(subject).slice(0, 2)).toUpperCase();
    const mine = records
      .filter(record => String(record.subject || "").toLowerCase() === String(subject).toLowerCase())
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const planned = (Array.isArray(currentUser.schedule) ? currentUser.schedule : []).find(entry => String(entry.subject).toLowerCase() === String(subject).toLowerCase());
    const latest = mine[0] || (planned ? { professor: planned.professor, room: planned.slots?.[0]?.room } : {});
    const count = status => mine.filter(record => String(record.status || "").toLowerCase() === status).length;
    return `
      <article class="course-card">
        <div class="course-cover tone-${i % 3}" aria-hidden="true">${escapeHTML(initials)}</div>
        <div class="course-body">
          <h3>${escapeHTML(subject)}</h3>
          <p class="muted">${escapeHTML(detail)}</p>
          ${latest.professor ? `<p class="course-prof">${escapeHTML(latest.professor)}${latest.room ? ` · ${escapeHTML(latest.room)}` : ""}</p>` : ""}
          <div class="course-stats" aria-label="Attendance for ${escapeHTML(subject)}">
            <span class="status-badge status-present">${count("present")} Present</span>
            <span class="status-badge status-late">${count("late")} Late</span>
            <span class="status-badge status-absent">${count("absent")} Absent</span>
          </div>
          <button type="button" class="link-btn" data-action="goto" data-page="student-schedule">View schedule</button>
        </div>
      </article>`;
  }).join("");
}

function calendarParts() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + calendarOffset, 1);
  const marked = new Set(getStudentAttendance().map(record => record.date));
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const todayKey = today();
  let grid = ["S", "M", "T", "W", "T", "F", "S"].map(d => `<span class="dow">${d}</span>`).join("");
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    const classes = [
      d.getMonth() !== first.getMonth() ? "out" : "",
      key === todayKey ? "today" : "",
      marked.has(key) ? "marked" : ""
    ].filter(Boolean).join(" ");
    grid += `<span class="${classes}">${d.getDate()}</span>`;
  }
  return { label: first.toLocaleDateString("en-US", { month: "short", year: "numeric" }), grid };
}

function updateCalendar() {
  const parts = calendarParts();
  if ($("#cal-title")) $("#cal-title").textContent = parts.label;
  if ($("#cal-grid")) $("#cal-grid").innerHTML = parts.grid;
}

function peopleHTML() {
  const me = accountIdOf(currentUser);
  const others = getUsers()
    .filter(user => user.active !== false && !(user.role === currentUser.role && accountIdOf(user) === me))
    .slice(0, 9);
  if (!others.length) return '<p class="muted small">No other accounts yet.</p>';
  return `<div class="people">${others.map((user, i) => {
    const name = fullName(user);
    return `
      <div class="person" title="${escapeHTML(name)}">
        <span class="avatar" style="background:${AVATAR_TONES[i % AVATAR_TONES.length]}">${escapeHTML(name.charAt(0).toUpperCase())}</span>
        <span class="name">${escapeHTML(name)}</span>
      </div>`;
  }).join("")}</div>`;
}

function renderStudentHome() {
  calendarOffset = 0;
  carouselIndex = 0;
  carouselPaused = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const attendance = getStudentAttendance();
  const todayCount = attendance.filter(record => record.date === today()).length;
  const subjects = studentSubjects();
  const logo = $(".logo-mark img")?.src || "";
  const cal = calendarParts();

  return `
  <div class="dash">
    <div class="dash-main">
      <div class="pill-tabs dash-tabs" role="tablist" aria-label="Dashboard sections">
        <button type="button" role="tab" aria-selected="true" class="active" data-action="tab" data-tab="dashboard">Dashboard</button>
        <button type="button" role="tab" aria-selected="false" data-action="tab" data-tab="news">News</button>
        <button type="button" role="tab" aria-selected="false" data-action="tab" data-tab="welcome">Welcome</button>
      </div>

      <section class="panel welcome-panel" data-panel="dashboard welcome">
        <div class="panel-head">
          <h2>Welcome</h2>
          <button type="button" class="round-btn" data-action="pause" aria-label="${carouselPaused ? "Play slideshow" : "Pause slideshow"}">${icon(carouselPaused ? "play" : "pause", 16)}</button>
        </div>
        <div class="banner">
          ${SLIDES.map((slide, i) => `
            <div class="slide${i === 0 ? " is-active" : ""}" data-slide="${i}">
              <div class="slide-copy">
                <h3>${escapeHTML(slide.title)}</h3>
                <p>${escapeHTML(slide.text)}</p>
              </div>
              <div class="slide-qr"><img src="${logo}" alt=""></div>
            </div>`).join("")}
        </div>
        <div class="dots">
          ${SLIDES.map((slide, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-action="slide" data-index="${i}" aria-label="Show slide ${i + 1}"></button>`).join("")}
        </div>
      </section>

      <section class="stats dash-stats" data-panel="dashboard">
        <div class="stat"><p>Student Number</p><strong>${escapeHTML(studentNumber(currentUser))}</strong></div>
        <div class="stat"><p>Attendance Records</p><strong>${attendance.length}</strong></div>
        <div class="stat"><p>Today's Records</p><strong>${todayCount}</strong></div>
      </section>

      <section class="courses" data-panel="dashboard">
        <div class="courses-head"><h2>Courses</h2></div>
        <div class="pill-tabs course-tabs">
          <button type="button" class="active" data-action="course-tab" data-tab="enrolled">Enrolled <span class="count">${subjects.length}</span></button>
          <button type="button" data-action="course-tab" data-tab="completed">Completed <span class="count">0</span></button>
        </div>
        <div id="course-list" class="course-grid">${courseCardsHTML(subjects)}</div>
      </section>


      <section class="panel empty" data-panel="news" hidden>No news has been posted yet.</section>
    </div>

    <aside class="dash-side">
      <section class="panel widget" id="calendar-widget">
        <div class="widget-head">${icon("calendar", 17)}<h3>Calendar</h3></div>
        <div class="widget-body">
          <div class="cal-nav">
            <button type="button" data-action="cal-prev" aria-label="Previous month">${icon("chev-l", 16)}</button>
            <strong id="cal-title">${escapeHTML(cal.label)}</strong>
            <button type="button" data-action="cal-next" aria-label="Next month">${icon("chev-r", 16)}</button>
          </div>
          <div class="cal-grid" id="cal-grid">${cal.grid}</div>
        </div>
        <div class="widget-foot">
          <button type="button" class="link-btn" data-action="goto" data-page="student-attendance">full calendar</button>
          <button type="button" class="link-btn" data-action="toggle-widget" data-target="calendar-widget" aria-expanded="true">hide</button>
        </div>
      </section>

      <section class="panel widget" id="people-widget">
        <div class="widget-head">${icon("users", 17)}<h3>People</h3></div>
        <div class="widget-body">${peopleHTML()}</div>
        <div class="widget-foot">
          <button type="button" class="link-btn" data-action="toggle-widget" data-target="people-widget" aria-expanded="true">hide</button>
        </div>
      </section>
    </aside>
  </div>`;
}

function showSlide(index) {
  const slides = $$(".slide");
  if (!slides.length) return;
  carouselIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, n) => slide.classList.toggle("is-active", n === carouselIndex));
  $$(".dots button").forEach((dot, n) => {
    dot.classList.toggle("active", n === carouselIndex);
    dot.setAttribute("aria-current", n === carouselIndex ? "true" : "false");
  });
}

function stopCarousel() {
  clearInterval(carouselTimer);
  carouselTimer = null;
}

function startCarousel() {
  stopCarousel();
  carouselTimer = setInterval(() => {
    if (!carouselPaused && $(".slide")) showSlide(carouselIndex + 1);
  }, 6000);
}

function setCarouselPaused(paused) {
  carouselPaused = paused;
  const button = $('[data-action="pause"]');
  if (button) {
    button.innerHTML = icon(paused ? "play" : "pause", 16);
    button.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
  }
}

function setDashTab(tab) {
  $$(".dash-tabs button").forEach(button => {
    const on = button.dataset.tab === tab;
    button.classList.toggle("active", on);
    button.setAttribute("aria-selected", String(on));
  });
  $$("[data-panel]").forEach(panel => {
    panel.hidden = !panel.dataset.panel.split(" ").includes(tab);
  });
}

function setCourseTab(tab) {
  $$(".course-tabs button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  const list = $("#course-list");
  if (!list) return;
  list.innerHTML = tab === "enrolled"
    ? courseCardsHTML(studentSubjects())
    : '<div class="panel empty">No completed courses yet.</div>';
}

function toggleWidget(button) {
  const widget = document.getElementById(button.dataset.target);
  const body = widget && $(".widget-body", widget);
  if (!body) return;
  body.hidden = !body.hidden;
  button.textContent = body.hidden ? "show" : "hide";
  button.setAttribute("aria-expanded", String(!body.hidden));
}

function handleDashAction(event) {
  if (!event.target.closest(".stu-menu")) $$(".stu-menu.open").forEach(m => m.classList.remove("open"));
  const el = event.target.closest("[data-action]");
  if (!el) return;
  switch (el.dataset.action) {
    case "tab": setDashTab(el.dataset.tab); break;
    case "slide": showSlide(Number(el.dataset.index)); startCarousel(); break;
    case "pause": setCarouselPaused(!carouselPaused); break;
    case "course-tab": setCourseTab(el.dataset.tab); break;
    case "cal-prev": calendarOffset--; updateCalendar(); break;
    case "cal-next": calendarOffset++; updateCalendar(); break;
    case "goto": goToPage(el.dataset.page); break;
    case "toggle-widget": toggleWidget(el); break;
    case "stu-add": openAddStudent(); break;
    case "stu-menu": {
      const wrap = el.closest(".stu-menu");
      const wasOpen = wrap.classList.contains("open");
      $$(".stu-menu.open").forEach(m => m.classList.remove("open"));
      wrap.classList.toggle("open", !wasOpen);
      break;
    }
    case "stu-sort":
      if (stuState.sortKey === el.dataset.key) stuState.sortDir = stuState.sortDir === "asc" ? "desc" : "asc";
      else { stuState.sortKey = el.dataset.key; stuState.sortDir = "asc"; }
      refreshStudents();
      break;
    case "stu-page": stuState.page = Number(el.dataset.page) || 1; refreshStudents(); break;
    case "stu-clear-filters":
      stuState.filters = { grade: "", section: "", gender: "" };
      $$("[data-stu-filter]").forEach(select => { select.value = ""; });
      stuState.page = 1;
      refreshStudents();
      break;
    case "stu-row-menu": openRowMenu(el); break;
    case "stu-qr": openStudentQR(el.dataset.no); break;
    case "att-filter":
      attStatusFilter = el.dataset.filter;
      refreshAttendancePage();
      break;
    case "photo-pick": $("#profile-photo-input")?.click(); break;
    case "photo-remove":
      if (saveProfilePhoto(null)) { goToPage("student-profile"); notify("Profile photo removed."); }
      break;
  }
}

/* MY QR CODE */
function renderStudentQR() {
  const name = fullName(currentUser);
  const number = studentNumber(currentUser);
  const sy = (termOf(today()).match(/^\d{4}-\d{4}/) || [""])[0];
  const grade = currentUser.grade || "Grade";
  const section = currentUser.section ? ` - Section ${currentUser.section}` : "";
  const photo = currentUser.photo
    ? `<img src="${escapeHTML(currentUser.photo)}" alt="Photo of ${escapeHTML(name)}">`
    : '<svg viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="38" r="20" fill="currentColor"/><path d="M8 120c0-26 18-40 42-40s42 14 42 40z" fill="currentColor"/></svg>';
  return `
  <div class="qr-page">
    <article class="id-card" aria-label="Student ID of ${escapeHTML(name)}">
      <div class="id-top">S.Y. ${escapeHTML(sy)}</div>
      <img class="id-logo" src="${HSSL_LOGO}" alt="High School for Service and Learning seal">
      <div class="id-photo">${photo}</div>
      <div class="id-info">
        <p class="id-school">High School for Service and Learning</p>
        <p class="id-role">STUDENT</p>
        <h2 class="id-name">${escapeHTML(name)}</h2>
        <hr class="id-rule">
        <p class="id-line">${escapeHTML(grade)}${escapeHTML(section)}</p>
        <p class="id-line">Student No.: ${escapeHTML(number)}</p>
        ${currentUser.shift ? `<p class="id-line">${escapeHTML(currentUser.shift)} Shift</p>` : ""}
      </div>
      <div class="id-swoosh"><span>ID No. ${escapeHTML(number)}</span></div>
      <div id="student-qr-code" class="id-qr" role="img" aria-label="QR code for student number ${escapeHTML(number)}"></div>
    </article>
    <p class="muted small id-hint">Show this ID to the scanner to log your attendance.</p>
  </div>`;
}

function renderStudentQRCode() {
  const box = $("#student-qr-code");
  if (!box) return;
  box.innerHTML = "";
  if (typeof QRCode === "undefined") {
    box.innerHTML = '<p class="muted small">The QR code could not be created because the QR library did not load. Check your connection and reload the page.</p>';
    return;
  }
  new QRCode(box, {
    text: studentNumber(currentUser),
    width: 200,
    height: 200,
    colorDark: "#231d4f",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

/* MY PROFILE */
function renderStudentProfile() {
  const name = fullName(currentUser);
  const photo = currentUser.photo;
  const details = [
    ["Name", name],
    ["Student Number", studentNumber(currentUser)],
    ["Grade", currentUser.grade || "Not set"],
    ["Section", currentUser.section || "Not set"],
    ["Shift", currentUser.shift || "Not set"]
  ];
  return `
  <div class="profile-page">
    <section class="panel profile-card">
      <div class="profile-photo-col">
        <div class="profile-photo">${photo
          ? `<img src="${escapeHTML(photo)}" alt="Profile photo of ${escapeHTML(name)}">`
          : `<span aria-hidden="true">${escapeHTML((name.charAt(0) || "U").toUpperCase())}</span>`}</div>
        <input type="file" id="profile-photo-input" accept="image/*" hidden>
        <button type="button" class="primary small-btn" data-action="photo-pick">${photo ? "Change photo" : "Upload photo"}</button>
        ${photo ? '<button type="button" class="secondary small-btn" data-action="photo-remove">Remove photo</button>' : ""}
        <p class="muted small">Your photo is saved in this browser only.</p>
      </div>
      <dl class="profile-details">
        ${details.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join("")}
      </dl>
    </section>
  </div>`;
}

function readProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type).startsWith("image/")) return reject(new Error("Please choose an image file."));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("That image is larger than 10 MB. Choose a smaller one."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened."));
      img.onload = () => {
        const size = 256;
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function saveProfilePhoto(dataUrl) {
  const users = getUsers();
  const me = accountIdOf(currentUser);
  const account = users.find(user => user.role === currentUser.role && accountIdOf(user) === me);
  if (!account) return false;
  if (dataUrl) { account.photo = dataUrl; currentUser.photo = dataUrl; }
  else { delete account.photo; delete currentUser.photo; }
  saveUsers(users);
  return true;
}

async function handlePhotoFile(input) {
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  try {
    const dataUrl = await readProfilePhoto(file);
    if (saveProfilePhoto(dataUrl)) {
      goToPage("student-profile");
      notify("Profile photo updated.");
    }
  } catch (error) {
    notify(error.message || "That photo could not be used.");
  }
}

/* MY ATTENDANCE */
const DAY_ABBR = ["SU", "M", "T", "W", "TH", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseDateKey(value) {
  const [y, m, d] = String(value || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function termOf(dateStr) {
  const d = parseDateKey(dateStr);
  if (Number.isNaN(d.getTime())) return "Undated";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 8) return `${y}-${y + 1} 1st Term`;
  if (m <= 5) return `${y - 1}-${y} 2nd Term`;
  return `${y - 1}-${y} Summer`;
}

function professorAvatarHTML(name) {
  if (!name) return "";
  const match = getUsers().find(user => fullName(user).toLowerCase() === String(name).toLowerCase());
  if (match && match.photo) return `<img class="prof-avatar" src="${escapeHTML(match.photo)}" alt="">`;
  const tone = AVATAR_TONES[String(name).charCodeAt(0) % AVATAR_TONES.length];
  return `<span class="prof-avatar" style="background:${tone}" aria-hidden="true">${escapeHTML(String(name).charAt(0).toUpperCase())}</span>`;
}

function attendanceRowsHTML(records) {
  if (!records.length) {
    const none = getStudentAttendance().length === 0;
    return `<tr><td colspan="8" class="att-empty">${none ? "No attendance records yet. They will appear here after your ID is scanned." : "No attendance records match these filters."}</td></tr>`;
  }
  return records.map(record => {
    const d = parseDateKey(record.date);
    const valid = !Number.isNaN(d.getTime());
    const status = String(record.status || "Recorded");
    const statusClass = ["present", "late", "absent"].includes(status.toLowerCase()) ? status.toLowerCase() : "recorded";
    const timeText = record.time || record.checkIn || (statusClass === "absent" ? "No scan" : "—");
    return `
      <tr class="row-${statusClass}">
        <td class="att-subject">${escapeHTML(record.subject || "General attendance")}</td>
        <td>${valid ? escapeHTML(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : "—"}</td>
        <td>${valid ? DAY_ABBR[d.getDay()] : "—"}</td>
        <td>${escapeHTML(timeText)}</td>
        <td>${escapeHTML(record.room || "—")}</td>
        <td class="att-prof">${escapeHTML(record.professor || "—")}</td>
        <td class="att-avatar-cell">${professorAvatarHTML(record.professor)}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHTML(status)}</span></td>
      </tr>`;
  }).join("");
}

let attStatusFilter = "all";

function filteredAttendance() {
  const term = $("#att-term")?.value;
  const day = $("#att-day")?.value;
  return getStudentAttendance()
    .filter(record => (!term || termOf(record.date) === term))
    .filter(record => {
      if (!day || day === "all") return true;
      const d = parseDateKey(record.date);
      return !Number.isNaN(d.getTime()) && String(d.getDay()) === day;
    })
    .filter(record => attStatusFilter === "all" || String(record.status || "").toLowerCase() === attStatusFilter)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function attChipsHTML() {
  const all = getStudentAttendance();
  const count = key => all.filter(record => String(record.status || "").toLowerCase() === key).length;
  const chips = [["all", "All", all.length], ["present", "Present", count("present")], ["late", "Late", count("late")], ["absent", "Absent", count("absent")]];
  return chips.map(([key, label, n]) => `
    <button type="button" class="att-chip chip-${key}${attStatusFilter === key ? " active" : ""}" data-action="att-filter" data-filter="${key}" aria-pressed="${attStatusFilter === key}">
      ${label} <span class="chip-count">${n}</span>
    </button>`).join("");
}

function renderAttendanceRows() {
  const body = $("#att-body");
  if (body) body.innerHTML = attendanceRowsHTML(filteredAttendance());
}

function refreshAttendancePage() {
  renderAttendanceRows();
  const chips = $(".att-chips");
  if (chips) chips.innerHTML = attChipsHTML();
}

function renderStudentAttendance() {
  attStatusFilter = "all";
  const records = getStudentAttendance();
  const currentTerm = termOf(today());
  const terms = [...new Set([...records.map(record => termOf(record.date)), currentTerm])].sort().reverse();
  const selected = terms.includes(currentTerm) ? currentTerm : terms[0];
  const rows = records
    .filter(record => termOf(record.date) === selected)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return `
  <div class="att-page">
    <div class="att-toolbar">
      <div class="att-filters">
        <label for="att-term">School Year &amp; Term:</label>
        <select id="att-term" data-att-filter>
          ${terms.map(term => `<option value="${escapeHTML(term)}"${term === selected ? " selected" : ""}>${escapeHTML(term)}</option>`).join("")}
        </select>
        <label for="att-day">Day:</label>
        <select id="att-day" data-att-filter>
          <option value="all" selected>Entire Week</option>
          ${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}">${DAY_NAMES[n]}</option>`).join("")}
        </select>
      </div>
      <h2 class="att-title">Attendance</h2>
    </div>
    <div class="att-card">
      <div class="att-chips" role="group" aria-label="Filter attendance records">${attChipsHTML()}</div>
      <div class="att-scroll">
        <table class="att-table">
          <thead>
            <tr><th>Subject</th><th>Date</th><th>Days</th><th>Time</th><th>Room</th><th colspan="2">Professor</th><th>Status</th></tr>
          </thead>
          <tbody id="att-body">${attendanceRowsHTML(rows)}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function scheduleTermOptions() {
  const entries = Array.isArray(currentUser?.schedule) ? currentUser.schedule : [];
  const terms = [...new Set(entries.map(entry => entry.term).filter(Boolean))].sort().reverse();
  const current = termOf(today());
  if (!terms.length) terms.push(current);
  return { terms, selected: terms.includes(current) ? current : terms[0] };
}

function scheduleRowsHTML(term, day) {
  const entries = (Array.isArray(currentUser?.schedule) ? currentUser.schedule : [])
    .filter(entry => !entry.term || entry.term === term);
  const rows = entries.map(entry => {
    const slots = (entry.slots || []).filter(slot => day === "all" || String(slot.day) === day);
    if (!slots.length) return "";
    const lines = pick => slots.map(slot => `<div class="slot">${escapeHTML(pick(slot))}</div>`).join("");
    return `
      <tr>
        <td><div class="slot att-subject">${escapeHTML(entry.subject)}</div></td>
        <td>${lines(slot => DAY_ABBR[slot.day] ?? "—")}</td>
        <td>${lines(slot => slot.time || "—")}</td>
        <td>${lines(slot => slot.room || "—")}</td>
        <td><div class="slot att-prof">${escapeHTML(entry.professor || "—")}</div></td>
        <td class="att-avatar-cell"><div class="slot">${professorAvatarHTML(entry.professor)}</div></td>
      </tr>`;
  }).join("");
  return rows || '<tr><td colspan="6" class="att-empty">No classes for this term and day.</td></tr>';
}

function renderScheduleRows() {
  const body = $("#sch-body");
  if (body) body.innerHTML = scheduleRowsHTML($("#sch-term")?.value, $("#sch-day")?.value || "all");
}

function renderStudentSchedule() {
  const { terms, selected } = scheduleTermOptions();
  return `
  <div class="att-page">
    <div class="att-toolbar">
      <div class="att-filters">
        <label for="sch-term">School Year &amp; Term:</label>
        <select id="sch-term" data-sch-filter>
          ${terms.map(term => `<option value="${escapeHTML(term)}"${term === selected ? " selected" : ""}>${escapeHTML(term)}</option>`).join("")}
        </select>
        <label for="sch-day">Day:</label>
        <select id="sch-day" data-sch-filter>
          <option value="all" selected>Entire Week</option>
          ${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}">${DAY_NAMES[n]}</option>`).join("")}
        </select>
      </div>
      <h2 class="att-title">Schedule</h2>
    </div>
    <div class="att-card">
      <div class="att-scroll">
        <table class="att-table sch-table">
          <thead>
            <tr><th>Subject</th><th>Days</th><th>Time</th><th>Room</th><th colspan="2">Professor</th></tr>
          </thead>
          <tbody id="sch-body">${scheduleRowsHTML(selected, "all")}</tbody>
        </table>
      </div>
      <p class="muted small att-note">Sample schedule for the demo student account.</p>
    </div>
  </div>`;
}

/* ADMIN: STUDENTS */
const stuState = {
  page: 1, size: 10, search: "", sortKey: "id", sortDir: "asc",
  filters: { grade: "", section: "", gender: "" },
  cols: { middleName: true, gender: true, grade: true, section: true, qr: true }
};

const STU_COLS = [
  ["id", "ID", "fixed"], ["studentNo", "Student ID", "fixed"], ["firstName", "First Name", "fixed"],
  ["middleName", "M.I.", "opt"], ["lastName", "Last Name", "fixed"], ["gender", "Gender", "opt"],
  ["grade", "Grade", "opt"], ["section", "Section", "opt"], ["qr", "QR Code", "opt"], ["action", "Action", "fixed"]
];

function allStudents() {
  return getUsers().filter(user => user.role === "student").map((user, i) => ({ ...user, rowNo: i + 1 }));
}

function stuValue(student, key) {
  if (key === "id") return student.rowNo;
  if (key === "studentNo") return studentNumber(student);
  return student[key] ?? "";
}

function visibleStudents() {
  const q = stuState.search.trim().toLowerCase();
  const f = stuState.filters;
  const rows = allStudents().filter(s =>
    (!f.grade || s.grade === f.grade) && (!f.section || s.section === f.section) && (!f.gender || s.gender === f.gender) &&
    (!q || ["studentNo", "firstName", "middleName", "lastName", "gender", "grade", "section"].some(k => String(stuValue(s, k)).toLowerCase().includes(q)))
  );
  const dir = stuState.sortDir === "asc" ? 1 : -1;
  return rows.sort((a, b) => String(stuValue(a, stuState.sortKey)).localeCompare(String(stuValue(b, stuState.sortKey)), undefined, { numeric: true, sensitivity: "base" }) * dir);
}

function studentCell(student, key) {
  const no = escapeHTML(studentNumber(student));
  const name = escapeHTML(fullName(student));
  if (key === "qr") return `<td><button type="button" class="row-qr-btn" data-action="stu-qr" data-no="${no}" aria-label="Show QR code of ${name}"><span class="row-qr" data-text="${no}"></span></button></td>`;
  if (key === "action") return `<td><button type="button" class="dots-btn" data-action="stu-row-menu" data-no="${no}" aria-label="Actions for ${name}" aria-haspopup="menu">&#8226;&#8226;&#8226;</button></td>`;
  return `<td>${escapeHTML(stuValue(student, key) || "—")}</td>`;
}

function studentsTableParts() {
  const all = visibleStudents();
  const pages = Math.max(1, Math.ceil(all.length / stuState.size));
  stuState.page = Math.min(Math.max(1, stuState.page), pages);
  const start = (stuState.page - 1) * stuState.size;
  const rows = all.slice(start, start + stuState.size);
  const cols = STU_COLS.filter(([key, , type]) => type === "fixed" || stuState.cols[key]);
  const head = cols.map(([key, label]) => {
    if (key === "qr" || key === "action") return `<th>${label}</th>`;
    const active = stuState.sortKey === key;
    const arrow = active ? (stuState.sortDir === "asc" ? "↑" : "↓") : "↕";
    return `<th aria-sort="${active ? (stuState.sortDir === "asc" ? "ascending" : "descending") : "none"}"><button type="button" class="th-sort${active ? " active" : ""}" data-action="stu-sort" data-key="${key}">${label}<span class="sort-ind" aria-hidden="true">${arrow}</span></button></th>`;
  }).join("");
  const body = rows.length
    ? rows.map(s => `<tr>${cols.map(([key]) => studentCell(s, key)).join("")}</tr>`).join("")
    : `<tr><td colspan="${cols.length}" class="att-empty">${allStudents().length ? "No students match your search or filters." : "No students yet. Use Add Student to create one."}</td></tr>`;
  const total = allStudents().length;
  const info = all.length
    ? `Showing ${start + 1} to ${start + rows.length} of ${all.length} entries${all.length !== total ? ` (filtered from ${total} total)` : ""}`
    : "Showing 0 entries";
  const nums = [];
  for (let n = Math.max(1, stuState.page - 2); n <= Math.min(pages, stuState.page + 2); n++) nums.push(n);
  const pager = `
    <button type="button" class="pg-btn" data-action="stu-page" data-page="${stuState.page - 1}"${stuState.page <= 1 ? " disabled" : ""}>Previous</button>
    ${nums.map(n => `<button type="button" class="pg-btn${n === stuState.page ? " active" : ""}" data-action="stu-page" data-page="${n}"${n === stuState.page ? ' aria-current="page"' : ""}>${n}</button>`).join("")}
    <button type="button" class="pg-btn" data-action="stu-page" data-page="${stuState.page + 1}"${stuState.page >= pages ? " disabled" : ""}>Next</button>`;
  return { table: `<table class="stu-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`, info, pager };
}

function distinctStudentValues(key) {
  return [...new Set(allStudents().map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function renderStudents() {
  const parts = studentsTableParts();
  const filterSelect = (key, label) => `
    <label for="stu-f-${key}">${label}</label>
    <select id="stu-f-${key}" data-stu-filter="${key}">
      <option value="">All</option>
      ${distinctStudentValues(key).map(v => `<option value="${escapeHTML(v)}"${stuState.filters[key] === v ? " selected" : ""}>${escapeHTML(v)}</option>`).join("")}
    </select>`;
  return `
  <div class="stu-page">
    <div class="stu-toolbar">
      <button type="button" class="primary stu-btn" data-action="stu-add">Add Student</button>
      <div class="stu-menu">
        <button type="button" class="gray-btn" data-action="stu-menu" aria-haspopup="true">View Options <span aria-hidden="true">&#9662;</span></button>
        <div class="stu-panel">
          <p class="panel-title">Show columns</p>
          ${STU_COLS.filter(c => c[2] === "opt").map(([key, label]) => `<label class="check"><input type="checkbox" data-stu-col="${key}"${stuState.cols[key] ? " checked" : ""}> ${escapeHTML(label)}</label>`).join("")}
        </div>
      </div>
      <div class="stu-menu">
        <button type="button" class="gray-btn" data-action="stu-menu" aria-haspopup="true">Filtration <span aria-hidden="true">&#9662;</span></button>
        <div class="stu-panel" id="stu-filter-panel">
          <p class="panel-title">Filter students</p>
          ${filterSelect("grade", "Grade")}
          ${filterSelect("section", "Section")}
          ${filterSelect("gender", "Gender")}
          <button type="button" class="link-btn" data-action="stu-clear-filters">Clear filters</button>
        </div>
      </div>
    </div>
    <section class="stu-card">
      <div class="stu-controls">
        <label class="inline">Show
          <select id="stu-size" class="size-select">${[10, 25, 50, 100].map(n => `<option value="${n}"${stuState.size === n ? " selected" : ""}>${n}</option>`).join("")}</select>
          entries
        </label>
        <label class="inline" for="stu-search">Search:
          <input type="search" id="stu-search" value="${escapeHTML(stuState.search)}" autocomplete="off">
        </label>
      </div>
      <div class="att-scroll" id="stu-table-wrap">${parts.table}</div>
      <div class="stu-footer"><span id="stu-info" class="muted small">${escapeHTML(parts.info)}</span><div class="stu-pager" id="stu-pager">${parts.pager}</div></div>
    </section>
  </div>`;
}

function drawQR(el, text, size) {
  el.innerHTML = "";
  if (typeof QRCode === "undefined") { el.textContent = "QR"; return; }
  new QRCode(el, { text, width: size, height: size, colorDark: "#231d4f", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
}

function drawRowQRs() {
  $$(".row-qr").forEach(el => drawQR(el, el.dataset.text, 88));
}

function refreshStudents() {
  const parts = studentsTableParts();
  if ($("#stu-table-wrap")) $("#stu-table-wrap").innerHTML = parts.table;
  if ($("#stu-info")) $("#stu-info").textContent = parts.info;
  if ($("#stu-pager")) $("#stu-pager").innerHTML = parts.pager;
  drawRowQRs();
}

/* overlays (modal + row menu) live on <body> so they are never clipped */
function closeRowMenu() { document.getElementById("stu-rowmenu")?.remove(); }
function closeOverlays() { closeRowMenu(); document.getElementById("stu-modal")?.remove(); }

function openModal(title, bodyHTML, wide) {
  closeOverlays();
  const wrap = document.createElement("div");
  wrap.id = "stu-modal";
  wrap.className = "modal-backdrop";
  wrap.dataset.ov = "backdrop";
  wrap.innerHTML = `
    <div class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head"><h2 id="modal-title">${escapeHTML(title)}</h2><button type="button" class="round-btn" data-ov="close" aria-label="Close">&#10005;</button></div>
      ${bodyHTML}
    </div>`;
  document.body.appendChild(wrap);
  (wrap.querySelector("input, select, button.primary") || wrap.querySelector("button"))?.focus();
}

function findStudent(no) { return allStudents().find(s => studentNumber(s) === String(no)); }

function openStudentRecord(no) {
  const s = findStudent(no);
  if (!s) return;
  const full = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
  const records = getAttendance()
    .filter(r => [r.studentNo, r.studentId, r.userId].some(v => String(v ?? "") === String(no)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const count = key => records.filter(r => String(r.status || "").toLowerCase() === key).length;
  const details = [["Student ID", studentNumber(s)], ["Gender", s.gender], ["Grade", s.grade], ["Section", s.section], ["Shift", s.shift]];
  openModal(full, `
    <dl class="record-details">${details.map(([l, v]) => `<div><dt>${escapeHTML(l)}</dt><dd>${escapeHTML(v || "Not set")}</dd></div>`).join("")}</dl>
    <div class="att-summary record-summary">
      <span class="status-badge status-present">${count("present")} Present</span>
      <span class="status-badge status-late">${count("late")} Late</span>
      <span class="status-badge status-absent">${count("absent")} Absent</span>
    </div>
    <h3 class="record-title">Attendance record</h3>
    <div class="att-scroll"><table class="att-table dash-att-table">
      <thead><tr><th>Subject</th><th>Date</th><th>Days</th><th>Time</th><th>Room</th><th>Professor</th><th>Status</th></tr></thead>
      <tbody>${attendanceRowsHTML(records)}</tbody>
    </table></div>`, true);
}

function openStudentQR(no) {
  const s = findStudent(no);
  if (!s) return;
  openModal(fullName(s), `
    <div class="qr-modal"><div id="modal-qr" class="modal-qr" role="img" aria-label="QR code for ${escapeHTML(String(no))}"></div>
    <p class="qr-number"><span>Student ID</span><strong>${escapeHTML(String(no))}</strong></p></div>`);
  drawQR($("#modal-qr"), String(no), 220);
}

function openAddStudent() {
  const grades = [7, 8, 9, 10, 11, 12].map(n => `<option>Grade ${n}</option>`).join("");
  openModal("Add Student", `
    <form id="stu-add-form" class="stu-form" novalidate>
      <div><label for="af-first">First name</label><input id="af-first" required autocomplete="off"></div>
      <div><label for="af-mi">Middle initial</label><input id="af-mi" maxlength="3" autocomplete="off" placeholder="R."></div>
      <div><label for="af-last">Last name</label><input id="af-last" required autocomplete="off"></div>
      <div><label for="af-gender">Gender</label><select id="af-gender"><option>Female</option><option>Male</option></select></div>
      <div><label for="af-no">Student ID</label><input id="af-no" required autocomplete="off" inputmode="numeric"></div>
      <div><label for="af-grade">Grade</label><select id="af-grade">${grades}</select></div>
      <div><label for="af-section">Section</label><input id="af-section" required autocomplete="off" placeholder="e.g. STEM-A"></div>
      <div><label for="af-pass">Temporary password</label><input id="af-pass" type="text" required minlength="4" autocomplete="off"></div>
      <p id="af-error" class="error full" role="alert" hidden></p>
      <div class="form-actions full"><button type="button" class="secondary" data-ov="close">Cancel</button><button type="submit" class="primary">Save student</button></div>
    </form>`);
}

function submitAddStudent(event) {
  event.preventDefault();
  const val = id => ($(`#${id}`)?.value || "").trim();
  const fail = message => { const e = $("#af-error"); e.textContent = message; e.hidden = false; };
  const data = { firstName: val("af-first"), lastName: val("af-last"), studentNo: val("af-no"), section: val("af-section"), password: val("af-pass") };
  if (!data.firstName || !data.lastName || !data.studentNo || !data.section || !data.password) return fail("Fill in every field except middle initial.");
  if (data.password.length < 4) return fail("Use a temporary password with at least 4 characters.");
  const users = getUsers();
  if (users.some(u => u.role === "student" && String(u.studentNo || u.id) === data.studentNo)) return fail("A student with that Student ID already exists.");
  let mi = val("af-mi");
  if (mi && !mi.endsWith(".")) mi += ".";
  users.push({
    id: data.studentNo, studentNo: data.studentNo, role: "student",
    firstName: data.firstName, middleName: mi, lastName: data.lastName,
    gender: val("af-gender") || $("#af-gender").value, grade: $("#af-grade").value, section: data.section,
    shift: "Morning", password: data.password, recoveryEmail: "", active: true
  });
  saveUsers(users);
  closeOverlays();
  goToPage("students");
  notify(`${data.firstName} ${data.lastName} was added.`);
}

function openRowMenu(button) {
  closeRowMenu();
  const no = button.dataset.no;
  const menu = document.createElement("div");
  menu.id = "stu-rowmenu";
  menu.className = "stu-rowmenu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `<button type="button" role="menuitem" data-ov="view" data-no="${escapeHTML(no)}">View record</button><button type="button" role="menuitem" data-ov="qr" data-no="${escapeHTML(no)}">Show QR code</button>`;
  document.body.appendChild(menu);
  const rect = button.getBoundingClientRect();
  menu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 8)}px`;
  menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.querySelector("button")?.focus();
}

function handleOverlayClick(event) {
  if (!event.target.closest(".stu-menu")) $$(".stu-menu.open").forEach(m => m.classList.remove("open"));
  const ov = event.target.closest("[data-ov]");
  if (!ov) { if (!event.target.closest(".stu-rowmenu") && !event.target.closest('[data-action="stu-row-menu"]')) closeRowMenu(); return; }
  const kind = ov.dataset.ov;
  if (kind === "close") closeOverlays();
  else if (kind === "backdrop") { if (event.target === ov) closeOverlays(); }
  else if (kind === "view") openStudentRecord(ov.dataset.no);
  else if (kind === "qr") openStudentQR(ov.dataset.no);
}

function handlePageChange(event) {
  const target = event.target;
  if (target.id === "profile-photo-input") handlePhotoFile(target);
  else if (target.matches && target.matches("[data-att-filter]")) renderAttendanceRows();
  else if (target.matches && target.matches("[data-sch-filter]")) renderScheduleRows();
  else if (target.id === "stu-size") { stuState.size = Number(target.value) || 10; stuState.page = 1; refreshStudents(); }
  else if (target.matches && target.matches("[data-stu-filter]")) { stuState.filters[target.dataset.stuFilter] = target.value; stuState.page = 1; refreshStudents(); }
  else if (target.matches && target.matches("[data-stu-col]")) { stuState.cols[target.dataset.stuCol] = target.checked; refreshStudents(); }
}

function showRecoveryStep(step) {
  $$(".recovery-step").forEach(section => {
    section.hidden = section.id !== step;
  });
}

function openForgotPasswordPage(event) {
  event.preventDefault();
  pendingRecoveryAccount = null;
  $("#recovery-lookup-form").reset();
  $("#recovery-reset-form").reset();
  $("#recovery-lookup-error").hidden = true;
  $("#recovery-reset-error").hidden = true;
  $("#recovery-role").value = currentRole;
  showRecoveryStep("recovery-lookup-form");
  $("#login-screen").hidden = true;
  $("#recovery-screen").hidden = false;
}

function returnToLogin() {
  pendingRecoveryAccount = null;
  $("#recovery-screen").hidden = true;
  $("#login-screen").hidden = false;
}

function verifyRecoveryAccount(event) {
  event.preventDefault();
  const role = $("#recovery-role").value;
  const id = $("#recovery-id").value.trim();
  const email = $("#recovery-email").value.trim().toLowerCase();
  const account = getUsers().find(user => {
    const accountId = user.username || user.teacherId || user.studentNo || user.id;
    return user.role === role
      && String(accountId) === id
      && user.active !== false
      && String(user.recoveryEmail || "").trim().toLowerCase() === email;
  });

  if (!account) {
    $("#recovery-lookup-error").textContent = "Those details do not match an active account with a saved recovery email.";
    $("#recovery-lookup-error").hidden = false;
    return;
  }

  pendingRecoveryAccount = { role, id };
  $("#recovery-account-summary").textContent = `Verified ${role} account: ${id}. Choose a new password.`;
  $("#recovery-lookup-error").hidden = true;
  showRecoveryStep("recovery-reset-form");
  $("#recovery-new-password").focus();
}

function resetRecoveredPassword(event) {
  event.preventDefault();
  if (!pendingRecoveryAccount) {
    showRecoveryStep("recovery-lookup-form");
    return;
  }

  const password = $("#recovery-new-password").value;
  const confirmPassword = $("#recovery-confirm-password").value;
  if (password.length < 8) {
    $("#recovery-reset-error").textContent = "Use a password with at least 8 characters.";
    $("#recovery-reset-error").hidden = false;
    return;
  }
  if (password !== confirmPassword) {
    $("#recovery-reset-error").textContent = "The passwords do not match.";
    $("#recovery-reset-error").hidden = false;
    return;
  }

  const users = getUsers();
  const account = users.find(user => {
    const accountId = user.username || user.teacherId || user.studentNo || user.id;
    return user.role === pendingRecoveryAccount.role
      && String(accountId) === pendingRecoveryAccount.id
      && user.active !== false;
  });
  if (!account) {
    $("#recovery-reset-error").textContent = "This account is no longer available. Return to account verification and try again.";
    $("#recovery-reset-error").hidden = false;
    return;
  }

  account.password = password;
  saveUsers(users);
  pendingRecoveryAccount = null;
  $("#recovery-reset-error").hidden = true;
  showRecoveryStep("recovery-complete");
}

/* LAYOUT ENGINES & SCREEN MANAGER */
const navigation = {
  admin: [
    ["dashboard", "⌂", "Dashboard"], ["admin-scanner", "▦", "QR Scanner"],
    ["students", "♙", "Students"], ["teachers", "♧", "Teachers"],
    ["attendance", "▤", "Attendance Records"], ["reports", "▥", "Reports"]
  ],
  teacher: [
    ["teacher-attendance", "▤", "My Attendance"], ["teacher-profile", "♙", "My Profile"],
    ["teacher-schedule", "▦", "My Schedule"], ["teacher-students", "♧", "My Students"]
  ],
  student: [
    ["student-home", "⌂", "Dashboard"], ["student-attendance", "▥", "Attendance Record"], ["student-qr", "▦", "ID"],
    ["student-profile", "♙", "My Profile"], ["student-schedule", "▤", "My Schedule"]
  ]
};

function renderShell() {
  const nav = $("#app-nav");
  if (nav) {
    nav.innerHTML = (navigation[currentUser.role] || []).map(([page, , label]) => `
      <button type="button" data-page="${page}" class="${currentPage === page ? "active" : ""}">
        ${icon(PAGE_ICONS[page] || "home")}<span>${label}</span>
      </button>
    `).join("");
  }
  const role = currentUser.role;
  if ($("#current-user-name")) $("#current-user-name").textContent = fullName(currentUser);
  if ($("#current-user-role")) $("#current-user-role").textContent = role.charAt(0).toUpperCase() + role.slice(1);
  const avatar = $("#current-user-avatar");
  if (avatar) {
    const hasPhoto = !!currentUser.photo;
    avatar.classList.toggle("has-photo", hasPhoto);
    avatar.style.backgroundImage = hasPhoto ? `url("${currentUser.photo}")` : "";
    avatar.textContent = hasPhoto ? "" : (fullName(currentUser).charAt(0) || "U").toUpperCase();
  }
}

function goToPage(page) {
  if (!currentUser) return;
  if (!(navigation[currentUser.role] || []).some(item => item[0] === page)) {
    notify("You don't have permission to open that page.");
    return;
  }

  stopScanner();
  stopCarousel();
  closeOverlays();
  currentPage = page;
  renderShell();

  const content = $("#page-content");
  if (!content) return;

  const navItem = (navigation[currentUser.role] || []).find(item => item[0] === page);
  const pageLabel = navItem ? navItem[2] : page;
  if ($("#page-title")) $("#page-title").textContent = pageLabel;
  if ($("#page-subtitle")) {
    $("#page-subtitle").textContent = page === "student-home"
      ? `Welcome back, ${currentUser.firstName || fullName(currentUser)}`
      : `Viewing ${pageLabel}`;
  }

  const rendererNames = {
    dashboard: "renderAdminDashboard", "admin-scanner": "renderAdminScanner",
    students: "renderStudents", teachers: "renderTeachers", attendance: "renderAttendance", reports: "renderReports",
    "teacher-attendance": "renderTeacherAttendance", "teacher-profile": "renderTeacherProfile",
    "teacher-schedule": "renderTeacherSchedule", "teacher-students": "renderTeacherStudents",
    "student-home": "renderStudentHome", "student-qr": "renderStudentQR", "student-profile": "renderStudentProfile",
    "student-schedule": "renderStudentSchedule", "student-attendance": "renderStudentAttendance"
  };

  const rendererName = rendererNames[page];
  const renderer = rendererName && typeof globalThis[rendererName] === "function" ? globalThis[rendererName] : null;
  content.innerHTML = renderer
    ? renderer()
    : '<section class="panel empty">This page is not available in this local demo yet.</section>';
  content.classList.remove("page");
  void content.offsetWidth;
  content.classList.add("page");

  if (page === "student-home") startCarousel();
  if (page === "students") drawRowQRs();

  if (page === "student-qr" && typeof renderStudentQRCode === "function") {
    renderStudentQRCode();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeData();

  $$(".tabs button").forEach(button => {
    button.addEventListener("click", () => chooseRole(button.dataset.role));
  });
  $(".password-toggle")?.addEventListener("click", event => {
    const button = event.currentTarget;
    const passwordInput = $("#login-password");
    if (!passwordInput) return;

    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    button.setAttribute("aria-pressed", String(!isVisible));
    button.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
    button.title = isVisible ? "Show password" : "Hide password";
    button.classList.toggle("is-visible", !isVisible);
  });
  $("#login-form")?.addEventListener("submit", login);
  $("#forgot-password-link")?.addEventListener("click", openForgotPasswordPage);
  $("#recovery-cancel-link")?.addEventListener("click", event => {
    event.preventDefault();
    returnToLogin();
  });
  $("#recovery-lookup-form")?.addEventListener("submit", verifyRecoveryAccount);
  $("#recovery-reset-form")?.addEventListener("submit", resetRecoveredPassword);
  $("#recovery-back-button")?.addEventListener("click", () => {
    pendingRecoveryAccount = null;
    showRecoveryStep("recovery-lookup-form");
  });
  $("#recovery-login-button")?.addEventListener("click", returnToLogin);
  $("#app-nav")?.addEventListener("click", event => {
    const button = event.target.closest("button[data-page]");
    if (button) goToPage(button.dataset.page);
  });
  $("#logout-button")?.addEventListener("click", logout);
  $$("[data-icon]").forEach(el => {
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon, Number(el.dataset.size) || 18));
  });
  $("#page-content")?.addEventListener("click", handleDashAction);
  $("#page-content")?.addEventListener("change", handlePageChange);
  $("#page-content")?.addEventListener("input", event => {
    if (event.target.id === "stu-search") { stuState.search = event.target.value; stuState.page = 1; refreshStudents(); }
  });
  document.addEventListener("click", handleOverlayClick);
  document.addEventListener("submit", event => { if (event.target.id === "stu-add-form") submitAddStudent(event); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeOverlays(); });
  window.addEventListener("scroll", closeRowMenu, true);
  $("#top-search-form")?.addEventListener("submit", event => {
    event.preventDefault();
    if (!currentUser) return;
    const input = $("#top-search-input");
    const query = input.value.trim().toLowerCase();
    if (!query) return;
    const hit = (navigation[currentUser.role] || []).find(([, , label]) => label.toLowerCase().includes(query));
    if (hit) {
      input.value = "";
      goToPage(hit[0]);
    } else {
      notify(`No page matches "${input.value.trim()}".`);
    }
  });
  $("#notif-button")?.addEventListener("click", () => notify("You have no new notifications."));
  $("#shortcuts-button")?.addEventListener("click", () => notify("Tip: type a page name in the search box and press Enter to jump to it."));
  $("#help-button")?.addEventListener("click", () => notify("Can't sign in? Use Forgot Password on the login screen."));
  chooseRole(currentRole);
});