const HSSL_LOGO = "7057_1566490658_9825_-removebg-preview.png";
const DEFAULT_STUDENT_PHOTO = "Gemini_Generated_Image_aklx79aklx79aklx.png";
/* =========================================================================
   QR LOGBOOK SYSTEM — script.js (All Modules Combined)
   ========================================================================= */

const STORAGE = {
  users: "qrlog_users_v3",
  attendance: "qrlog_attendance_v3",
  subjects: "qrlog_subjects_v3",
  session: "qrlog_session_v1"
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
let fullCalendarOffset = 0;
let fullCalendarSelectedDate = null;
let pendingRecoveryAccount = null;

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[ch]);

const memoryStorage = {};

function getStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Some browsers or file:// pages deny access to localStorage.
  }
  return null;
}

function readLoginSession() {
  let raw;
  try {
    raw = window.sessionStorage.getItem(STORAGE.session);
  } catch {
    raw = memoryStorage[STORAGE.session];
  }
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

function writeLoginSession(session) {
  try {
    if (session) window.sessionStorage.setItem(STORAGE.session, JSON.stringify(session));
    else window.sessionStorage.removeItem(STORAGE.session);
  } catch {
    memoryStorage[STORAGE.session] = session ? JSON.stringify(session) : null;
  }
}

function readStore(key, fallback = []) {
  const storage = getStorage();
  try {
    if (storage) {
      const raw = storage.getItem(key);
      const parsed = raw == null ? null : JSON.parse(raw);
      return parsed ?? fallback;
    }
  } catch {
    // Fall through to the in-memory fallback below.
  }

  const rawFallback = memoryStorage[key];
  if (rawFallback === undefined) return fallback;
  try {
    return JSON.parse(rawFallback) ?? fallback;
  } catch {
    return rawFallback;
  }
}

function writeStore(key, value) {
  const storage = getStorage();
  const payload = JSON.stringify(value);

  try {
    if (storage) {
      storage.setItem(key, payload);
      return;
    }
  } catch {
    // Some restricted environments reject storage writes.
  }

  memoryStorage[key] = payload;
}

function getUsers() { return readStore(STORAGE.users); }
function saveUsers(users) { writeStore(STORAGE.users, users); }
function getAttendance() { return readStore(STORAGE.attendance); }
function saveAttendance(records) { writeStore(STORAGE.attendance, records); }

function stopScanner() {
  if (!scanner) return;
  if (typeof scanner.stop === "function") {
    scanner.stop();
  } else {
    scanner.stopped = true;
    if (scanner.frame) cancelAnimationFrame(scanner.frame);
    scanner.stream?.getTracks().forEach(track => track.stop());
  }
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
  if (!readStore(STORAGE.attendance, null)) { saveAttendance([]); }
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
  if (user.mustChangePassword) openRequiredPasswordChange();
}

function logout() {
  stopScanner();
  stopCarousel();
  closeOverlays();
  writeLoginSession(null);
  currentUser = null;
  $("#app") ? $("#app").hidden = true : null;
  $("#login-screen") ? $("#login-screen").hidden = false : null;
  $("#login-form") ? $("#login-form").reset() : null;
  notify("You have logged out.");
}

function openRequiredPasswordChange() {
  if (!currentUser?.mustChangePassword || $("#required-password-modal")) return;
  const wrap = document.createElement("div");
  wrap.id = "required-password-modal";
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="required-password-title">
      <div class="modal-head"><h2 id="required-password-title">Set a new password</h2></div>
      <p class="muted">For account security, change the temporary password before continuing.</p>
      <form id="required-password-form">
        <label for="required-new-password">New password</label>
        <input id="required-new-password" type="password" minlength="8" autocomplete="new-password" required>
        <label for="required-confirm-password">Confirm new password</label>
        <input id="required-confirm-password" type="password" minlength="8" autocomplete="new-password" required>
        <p id="required-password-error" class="error" role="alert" hidden></p>
        <button type="submit" class="primary wide">Save new password</button>
      </form>
    </section>`;
  document.body.appendChild(wrap);
  $("#required-new-password")?.focus();
}

function submitRequiredPasswordChange(event) {
  event.preventDefault();
  if (!currentUser?.mustChangePassword) return;
  const password = $("#required-new-password").value;
  const confirmation = $("#required-confirm-password").value;
  const error = $("#required-password-error");
  const fail = message => {
    error.textContent = message;
    error.hidden = false;
  };
  if (password.length < 8) return fail("Choose a password with at least 8 characters.");
  if (password === currentUser.password) return fail("Choose a password different from the temporary password.");
  if (password !== confirmation) return fail("The passwords do not match.");

  const users = getUsers();
  const account = users.find(user => user.role === currentUser.role && accountIdOf(user) === accountIdOf(currentUser));
  if (!account) return fail("Your account could not be found. Please sign out and contact the administrator.");
  account.password = password;
  delete account.mustChangePassword;
  currentUser.password = password;
  delete currentUser.mustChangePassword;
  saveUsers(users);
  $("#required-password-modal")?.remove();
  notify("Your new password has been saved.");
}

function openApplication(requestedPage = null) {
  $("#login-screen") ? $("#login-screen").hidden = true : null;
  $("#app") ? $("#app").hidden = false : null;
  renderShell();
  const defaultPage = currentUser.role === "admin" ? "dashboard" : currentUser.role === "teacher" ? "teacher-attendance" : "student-home";
  const page = (navigation[currentUser.role] || []).some(item => item[0] === requestedPage)
    ? requestedPage
    : defaultPage;
  goToPage(page);
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
  "teacher-attendance": "clipboard", "teacher-profile": "user", "teacher-id": "qr",
  "teacher-schedule": "calendar", "teacher-students": "users",
  "student-home": "home", "student-qr": "qr", "student-profile": "user",
  "student-schedule": "calendar", "student-attendance": "clipboard", "student-calendar": "calendar"
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
    grid += `<button type="button" class="cal-date ${classes}" data-action="calendar-date" data-date="${key}" aria-label="View ${escapeHTML(d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}">${d.getDate()}</button>`;
  }
  return { label: first.toLocaleDateString("en-US", { month: "short", year: "numeric" }), grid };
}

function updateCalendar() {
  const parts = calendarParts();
  if ($("#cal-title")) $("#cal-title").textContent = parts.label;
  if ($("#cal-grid")) $("#cal-grid").innerHTML = parts.grid;
}

function fullCalendarEventsForDate(date) {
  const key = dateKey(date);
  const weekday = date.getDay();
  const events = [];
  const attendance = getStudentAttendance().filter(record => record.date === key);
  (Array.isArray(currentUser?.schedule) ? currentUser.schedule : []).forEach(entry => {
    if (entry.term && termOf(key) !== entry.term) return;
    (Array.isArray(entry.slots) ? entry.slots : [])
      .filter(slot => Number(slot.day) === weekday)
      .forEach(slot => {
        const subject = String(entry.subject || "").trim();
        const matched = attendance.find(record =>
          String(record.subject || "").trim().toLowerCase() === subject.toLowerCase()
        );
        events.push({
          subject,
          time: slot.time || "",
          room: slot.room || "",
          status: matched?.status || "",
          recorded: !!matched
        });
      });
  });
  attendance.forEach(record => {
    const subject = String(record.subject || "General attendance").trim();
    const alreadyListed = events.some(event => event.subject.toLowerCase() === subject.toLowerCase());
    if (!alreadyListed) {
      events.push({
        subject,
        time: record.time || record.checkIn || "",
        room: record.room || "",
        status: record.status || "Recorded",
        recorded: true
      });
    }
  });
  return events;
}

function renderFullCalendar() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + fullCalendarOffset, 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - gridStart.getDay());
  const todayKey = today();
  let cells = "";
  for (let index = 0; index < 42; index++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = dateKey(date);
    const events = fullCalendarEventsForDate(date);
    const classes = [
      date.getMonth() !== monthStart.getMonth() ? "is-outside" : "",
      key === todayKey ? "is-today" : "",
      key === fullCalendarSelectedDate ? "is-selected" : ""
    ].filter(Boolean).join(" ");
    const eventMarkup = events.length
      ? events.map(event => {
        const detail = [event.time, event.room].filter(Boolean).join(" · ");
        return `<div class="full-calendar-event${event.recorded ? " is-recorded" : ""}">
          <strong>${escapeHTML(event.subject)}</strong>
          ${detail ? `<small>${escapeHTML(detail)}</small>` : ""}
          ${event.status ? `<small class="full-calendar-status">${escapeHTML(event.status)}</small>` : ""}
        </div>`;
      }).join("")
      : "";
    cells += `<div class="full-calendar-day ${classes}" aria-label="${escapeHTML(date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}">
      <button type="button" class="full-calendar-date" data-action="select-calendar-date" data-date="${key}" aria-pressed="${key === fullCalendarSelectedDate}">${date.getDate()}</button>
      <div class="full-calendar-events">${eventMarkup}</div>
    </div>`;
  }
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const activeMonthDates = Array.from({ length: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate() }, (_, index) => {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1);
    return fullCalendarEventsForDate(date).length > 0;
  });
  const eventDays = activeMonthDates.filter(Boolean).length;
  return `
  <div class="full-calendar-page">
    <section class="full-calendar-toolbar">
      <div class="full-calendar-month-nav">
        <button type="button" class="secondary" data-action="full-calendar-today">Today</button>
        <button type="button" class="round-btn" data-action="full-calendar-prev" aria-label="Previous month">${icon("chev-l", 16)}</button>
        <button type="button" class="round-btn" data-action="full-calendar-next" aria-label="Next month">${icon("chev-r", 16)}</button>
        <h2 id="full-calendar-month">${escapeHTML(monthLabel)}</h2>
      </div>
      <p class="muted small">${fullCalendarSelectedDate ? `Selected: ${escapeHTML(new Date(`${fullCalendarSelectedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }))} · ` : ""}${eventDays} day${eventDays === 1 ? "" : "s"} with scheduled subjects or attendance this month</p>
    </section>
    <section class="full-calendar-grid" aria-label="${escapeHTML(monthLabel)} student calendar">
      ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => `<div class="full-calendar-weekday">${day}</div>`).join("")}
      ${cells}
    </section>
    <p class="muted small full-calendar-note">Scheduled subjects are based on your class timetable. Attendance status appears when a record has been logged.</p>
  </div>`;
}

function refreshFullCalendar() {
  const content = $("#page-content");
  if (!content || currentPage !== "student-calendar") return;
  content.innerHTML = renderFullCalendar();
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
          <button type="button" class="link-btn" data-action="goto" data-page="student-calendar">full calendar</button>
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

function adminDashboardStatus(record) {
  const status = String(record.status || "Recorded").trim().toLowerCase();
  return ["present", "late", "absent"].includes(status) ? status : "other";
}

function adminDashboardMonthlyData(records) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: date.toLocaleDateString("en-US", { month: "short" }),
      total: 0,
      present: 0
    };
  });
  records.forEach(record => {
    const date = parseDateKey(record.date);
    if (Number.isNaN(date.getTime())) return;
    const month = months.find(item => item.year === date.getFullYear() && item.month === date.getMonth());
    if (!month) return;
    month.total++;
    if (adminDashboardStatus(record) === "present") month.present++;
  });
  return months;
}

function adminDashboardChartHTML(records) {
  const statuses = ["present", "late", "absent", "other"].map(status => ({
    status,
    count: records.filter(record => adminDashboardStatus(record) === status).length
  }));
  const total = statuses.reduce((sum, item) => sum + item.count, 0);
  let stop = 0;
  const colors = { present: "#10b981", late: "#f59e0b", absent: "#ef4444", other: "#8b83c6" };
  const gradient = total
    ? statuses.map(item => {
      const start = stop;
      stop += item.count / total * 100;
      return `${colors[item.status]} ${start}% ${stop}%`;
    }).join(", ")
    : "#e8e2f8 0% 100%";
  const months = adminDashboardMonthlyData(getAttendance());
  const max = Math.max(1, ...months.map(item => item.total));
  const x = index => 48 + index * 94;
  const y = value => 145 - value / max * 116;
  const totalPoints = months.map((item, index) => `${x(index)},${y(item.total)}`).join(" ");
  const presentPoints = months.map((item, index) => `${x(index)},${y(item.present)}`).join(" ");
  const tickValues = [max, Math.round(max / 2), 0];

  return `
    <section class="admin-dashboard-charts" aria-label="School attendance overview">
      <article class="admin-dash-card admin-status-card">
        <div class="admin-dash-card-head"><div><h2>Attendance by status</h2><p>Today's recorded attendance</p></div></div>
        <div class="admin-donut-wrap">
          <div class="admin-donut" style="background:conic-gradient(${gradient})" role="img" aria-label="${total} attendance records today">
            <span><strong>${total}</strong><small>today</small></span>
          </div>
          <ul class="admin-chart-legend">
            ${statuses.map(item => `<li><span class="admin-legend-dot ${item.status}"></span><span>${item.status === "other" ? "Other" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span><strong>${item.count}</strong></li>`).join("")}
          </ul>
        </div>
      </article>
      <article class="admin-dash-card admin-trend-card">
        <div class="admin-dash-card-head"><div><h2>Attendance trend</h2><p>School-wide records over the last 6 months</p></div>
          <div class="admin-chart-key"><span><i class="records"></i>All records</span><span><i class="present"></i>Present</span></div>
        </div>
        <div class="admin-chart-scroll">
          <svg class="admin-trend-chart" viewBox="0 0 560 190" role="img" aria-label="Monthly school attendance records and present counts">
            ${tickValues.map(value => `<g><line x1="42" y1="${y(value)}" x2="526" y2="${y(value)}"></line><text x="34" y="${y(value) + 4}" text-anchor="end">${value}</text></g>`).join("")}
            <polyline class="admin-line-records" points="${totalPoints}"></polyline>
            <polyline class="admin-line-present" points="${presentPoints}"></polyline>
            ${months.map((item, index) => `<g><circle class="admin-point-records" cx="${x(index)}" cy="${y(item.total)}" r="3.5"></circle><circle class="admin-point-present" cx="${x(index)}" cy="${y(item.present)}" r="3.5"></circle><text x="${x(index)}" y="174" text-anchor="middle">${item.label}</text></g>`).join("")}
          </svg>
        </div>
      </article>
      <article class="admin-dash-card admin-staff-card">
        <div class="admin-dash-card-head"><div><h2>Teachers</h2><p>Active staff accounts</p></div><strong>${getUsers().filter(user => user.role === "teacher" && user.active !== false).length}</strong></div>
        <div class="admin-staff-list">
          ${getUsers().filter(user => user.role === "teacher" && user.active !== false).slice(0, 6).map(user => {
            const name = fullName(user);
            return `<div class="admin-staff"><span>${escapeHTML(name.charAt(0).toUpperCase())}</span><strong>${escapeHTML(name)}</strong></div>`;
          }).join("") || '<p class="muted small">No active teacher accounts yet.</p>'}
        </div>
      </article>
    </section>`;
}

function adminDashboardTableHTML(records) {
  if (!records.length) {
    return `<tr><td colspan="7" class="att-empty">${getAttendance().length ? "No school records match these filters." : "No attendance records have been recorded yet."}</td></tr>`;
  }
  return records.map(record => {
    const role = attendanceRecordRole(record);
    const person = attendanceRecordPerson(record, role);
    const date = parseDateKey(record.date);
    const validDate = !Number.isNaN(date.getTime());
    const status = String(record.status || "Recorded");
    const statusClass = adminDashboardStatus(record);
    const time = record.time || record.checkIn || (statusClass === "absent" ? "No scan" : "—");
    return `<tr class="row-${statusClass}">
      <td>${validDate ? escapeHTML(date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : "—"}</td>
      <td><strong>${escapeHTML(person.name)}</strong><small class="admin-record-role">${role === "teacher" ? "Teacher" : "Student"}</small></td>
      <td>${role === "teacher" ? "Teacher" : "Student"}</td>
      <td>${escapeHTML(person.id)}</td>
      <td>${escapeHTML(record.subject || "General attendance")}</td>
      <td>${escapeHTML(time)}</td>
      <td><span class="status-badge status-${statusClass === "other" ? "recorded" : statusClass}">${escapeHTML(status)}</span></td>
    </tr>`;
  }).join("");
}

function filteredAdminDashboardRecords() {
  const search = ($("#admin-record-search")?.value || "").trim().toLowerCase();
  const role = $("#admin-record-role")?.value || "all";
  const status = $("#admin-record-status")?.value || "all";
  const date = $("#admin-record-date")?.value || "all";
  return getAttendance()
    .filter(record => role === "all" || attendanceRecordRole(record) === role)
    .filter(record => status === "all" || adminDashboardStatus(record) === status)
    .filter(record => date !== "today" || record.date === today())
    .filter(record => {
      if (!search) return true;
      const person = attendanceRecordPerson(record, attendanceRecordRole(record));
      return [person.name, person.id, record.subject, record.room, record.professor, record.status]
        .some(value => String(value || "").toLowerCase().includes(search));
    })
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.time || "").localeCompare(String(a.time || "")));
}

function refreshAdminDashboardTable() {
  const records = filteredAdminDashboardRecords();
  const body = $("#admin-dashboard-records");
  if (body) body.innerHTML = adminDashboardTableHTML(records);
  const count = $("#admin-dashboard-record-count");
  if (count) count.textContent = `Showing ${records.length} of ${getAttendance().length} school records`;
}

function renderAdminDashboard() {
  const users = getUsers().filter(user => user.active !== false && ["student", "teacher"].includes(user.role));
  const todayRecords = getAttendance().filter(record => record.date === today());
  const countStatus = status => todayRecords.filter(record => adminDashboardStatus(record) === status).length;
  const records = getAttendance().slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.time || "").localeCompare(String(a.time || "")));
  const totalRecords = getAttendance().length;

  return `
    <div class="admin-dashboard">
      <section class="admin-dashboard-stats" aria-label="School attendance summary">
        <article class="admin-kpi"><span class="admin-kpi-icon registrations">▤</span><div><p>Total registrations</p><strong>${users.length}</strong><small>${users.filter(user => user.role === "student").length} students · ${users.filter(user => user.role === "teacher").length} teachers</small></div></article>
        <article class="admin-kpi"><span class="admin-kpi-icon present">✓</span><div><p>Present today</p><strong>${countStatus("present")}</strong><small>School-wide</small></div></article>
        <article class="admin-kpi"><span class="admin-kpi-icon late">◷</span><div><p>Late today</p><strong>${countStatus("late")}</strong><small>School-wide</small></div></article>
        <article class="admin-kpi"><span class="admin-kpi-icon absent">!</span><div><p>Absent today</p><strong>${countStatus("absent")}</strong><small>Recorded as absent</small></div></article>
      </section>
      ${adminDashboardChartHTML(todayRecords)}
      <section class="admin-dash-card admin-all-records">
        <div class="admin-records-head"><div><h2>All school attendance records</h2><p id="admin-dashboard-record-count">Showing ${records.length} of ${totalRecords} school records</p></div>
          <div class="admin-record-filters">
            <label class="sr-only" for="admin-record-search">Search attendance records</label>
            <input id="admin-record-search" type="search" placeholder="Search name, ID, subject">
            <label class="sr-only" for="admin-record-role">Account type</label>
            <select id="admin-record-role" data-admin-record-filter><option value="all">All account types</option><option value="student">Students</option><option value="teacher">Teachers</option></select>
            <label class="sr-only" for="admin-record-status">Attendance status</label>
            <select id="admin-record-status" data-admin-record-filter><option value="all">All statuses</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="other">Other</option></select>
            <label class="sr-only" for="admin-record-date">Date range</label>
            <select id="admin-record-date" data-admin-record-filter><option value="all">All dates</option><option value="today">Today</option></select>
          </div>
        </div>
        <div class="att-scroll">
          <table class="att-table admin-dashboard-table">
            <thead><tr><th>Date</th><th>Name</th><th>Account type</th><th>ID</th><th>Subject</th><th>Time</th><th>Status</th></tr></thead>
            <tbody id="admin-dashboard-records">${adminDashboardTableHTML(records)}</tbody>
          </table>
        </div>
      </section>
    </div>`;
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
    case "flip-student-id": flipStudentID(el); break;
    case "scanner-start": startScanner(); break;
    case "scanner-stop": stopScannerPage(); break;
    case "scanner-photo": $("#scanner-photo-input")?.click(); break;
    case "tab": setDashTab(el.dataset.tab); break;
    case "slide": showSlide(Number(el.dataset.index)); startCarousel(); break;
    case "pause": setCarouselPaused(!carouselPaused); break;
    case "course-tab": setCourseTab(el.dataset.tab); break;
    case "cal-prev": calendarOffset--; updateCalendar(); break;
    case "cal-next": calendarOffset++; updateCalendar(); break;
    case "calendar-date": {
      const selectedDate = new Date(`${el.dataset.date}T00:00:00`);
      if (Number.isNaN(selectedDate.getTime())) break;
      fullCalendarSelectedDate = el.dataset.date;
      fullCalendarOffset = (selectedDate.getFullYear() - new Date().getFullYear()) * 12
        + selectedDate.getMonth() - new Date().getMonth();
      goToPage("student-calendar");
      break;
    }
    case "select-calendar-date": {
      fullCalendarSelectedDate = el.dataset.date;
      const selectedDate = new Date(`${fullCalendarSelectedDate}T00:00:00`);
      if (!Number.isNaN(selectedDate.getTime())) {
        fullCalendarOffset = (selectedDate.getFullYear() - new Date().getFullYear()) * 12
          + selectedDate.getMonth() - new Date().getMonth();
      }
      refreshFullCalendar();
      break;
    }
    case "full-calendar-prev": fullCalendarOffset--; refreshFullCalendar(); break;
    case "full-calendar-next": fullCalendarOffset++; refreshFullCalendar(); break;
    case "full-calendar-today":
      fullCalendarOffset = 0;
      fullCalendarSelectedDate = today();
      refreshFullCalendar();
      break;
    case "goto": goToPage(el.dataset.page); break;
    case "toggle-widget": toggleWidget(el); break;
    case "stu-add": openAddStudent(); break;
    case "teacher-add": openAddTeacher(); break;
    case "account-role": updateAccountForm(); break;
    case "edit-account": openEditAccount(el.dataset.role, el.dataset.id); break;
    case "admin-attendance-tab":
      adminAttendanceTab = el.dataset.tab === "teacher" ? "teacher" : "student";
      refreshAdminAttendance();
      break;
    case "teacher-qr": openTeacherQR(el.dataset.id); break;
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
      if (saveProfilePhoto(null)) { goToPage(currentUser.role === "teacher" ? "teacher-profile" : "student-profile"); notify("Profile photo removed."); }
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
  const guardian = currentUser.guardianName || "Not provided";
  const contact = currentUser.contactNumber || "Not provided";
  const address = currentUser.address || "Not provided";
  const photo = currentUser.photo
    ? `<img src="${escapeHTML(currentUser.photo)}" alt="Photo of ${escapeHTML(name)}">`
    : '<svg viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="38" r="20" fill="currentColor"/><path d="M8 120c0-26 18-40 42-40s42 14 42 40z" fill="currentColor"/></svg>';
  return `
  <div class="qr-page">
    <article class="id-card student-id-card" data-action="flip-student-id" tabindex="0" role="button" aria-pressed="false" aria-label="Student ID of ${escapeHTML(name)}. Activate to flip the card.">
      <div class="id-card-inner">
       <div class="id-face id-front">
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
      </div>
      <div class="id-swoosh"><span>ID No. ${escapeHTML(number)}</span></div>
      <div id="student-qr-code" class="id-qr" role="img" aria-label="QR code for student number ${escapeHTML(number)}"></div>
       <span class="id-flip-hint" aria-hidden="true">Click to flip</span>
       </div>
       <div class="id-face id-back" aria-hidden="true">
        <div class="id-back-header">
          <img src="${HSSL_LOGO}" alt="">
          <div><strong>STUDENT INFORMATION</strong><span>High School for Service and Learning</span></div>
        </div>
        <div class="id-back-details">
          <div class="id-back-field"><span>Address</span><strong>${escapeHTML(address)}</strong></div>
          <div class="id-back-field"><span>Guardian</span><strong>${escapeHTML(guardian)}</strong></div>
          <div class="id-back-field"><span>Contact Number</span><strong>${escapeHTML(contact)}</strong></div>
        </div>
        <div class="id-admin-signature">
          <div class="id-signature-line"></div>
          <strong>Administrator's Signature</strong>
          <span>School Administrator</span>
        </div>
        <span class="id-flip-hint" aria-hidden="true">Click to return</span>
       </div>
      </div>
    </article>
    <p class="muted small id-hint">Show this ID to the scanner to log your attendance. Click or press Enter to flip the card.</p>
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

function flipStudentID(card) {
  const isFlipped = card.classList.toggle("is-flipped");
  card.setAttribute("aria-pressed", String(isFlipped));
  card.querySelector(".id-front")?.setAttribute("aria-hidden", String(isFlipped));
  card.querySelector(".id-back")?.setAttribute("aria-hidden", String(!isFlipped));
}

function renderAdminScanner() {
  return `
    <section class="panel scanner-panel">
      <h2>Scan ID QR code</h2>
      <p class="muted">Start the camera and scan a student or teacher ID QR code to record today's attendance.</p>
      <div class="scanner-video-wrap" hidden>
        <video id="scanner-video" class="scanner-video" playsinline muted aria-label="Camera preview" hidden></video>
      </div>
      <div class="scanner-controls">
        <button type="button" class="primary" data-action="scanner-start">Start camera</button>
        <button type="button" class="secondary" data-action="scanner-stop" disabled>Stop camera</button>
        <button type="button" class="secondary" data-action="scanner-photo">Scan from photo</button>
        <input type="file" id="scanner-photo-input" accept="image/*" capture="environment" hidden>
      </div>
      <p class="muted small scanner-tip">No live camera? Choose Scan from photo to take or pick a picture of a student or teacher ID QR code.</p>
      <p id="scanner-status" class="scanner-status" role="status" aria-live="polite">Select Start camera to open the QR scanner.</p>
    </section>
    <section class="panel">
      <h2>Enter student number or Teacher ID</h2>
      <p class="muted">Use this if the camera is unavailable.</p>
      <form id="scanner-manual-form" class="scanner-manual-form">
        <label for="scanner-student-id">Student number or Teacher ID</label>
        <input id="scanner-student-id" type="text" autocomplete="off" placeholder="Enter a student number or teacher ID" required>
        <button type="submit" class="primary">Record attendance</button>
      </form>
      <div id="scanner-result" class="scanner-result" role="status" aria-live="polite" hidden></div>
    </section>
  `;
}

function showScannerResult(message, type = "info") {
  const result = $("#scanner-result");
  if (result) {
    result.textContent = message;
    result.className = `scanner-result ${type}`;
    result.hidden = false;
  }
  const status = $("#scanner-status");
  if (status) status.textContent = message;
}

function recordScannedStudent(rawValue) {
  const studentId = String(rawValue || "").trim();
  if (!studentId) {
    showScannerResult("The QR code did not contain a student number.", "error");
    return;
  }

  const student = allStudents().find(item => studentNumber(item) === studentId && item.active !== false);
  if (!student) {
    showScannerResult(`No active student account was found for "${studentId}".`, "error");
    return;
  }

  const date = today();
  const alreadyRecorded = getAttendance().some(record =>
    String(record.studentNo || record.studentId || record.userId || "") === studentId
    && record.date === date
  );
  if (alreadyRecorded) {
    showScannerResult(`${fullName(student)} already has an attendance record for today.`, "info");
    return;
  }

  saveAttendance([
    ...getAttendance(),
    {
      id: makeId("ATT"),
      studentNo: studentId,
      studentId,
      date,
      time: timeNow(),
      status: "Present",
      subject: "General attendance",
      room: "",
      professor: fullName(currentUser)
    }
  ]);
  showScannerResult(`Attendance recorded for ${fullName(student)} (${studentId}).`, "success");
}

function recordScannedTeacher(rawValue) {
  const teacherId = String(rawValue || "").trim();
  const teacher = allTeachers().find(item =>
    String(item.teacherId || item.id || "") === teacherId && item.active !== false
  );
  if (!teacher) {
    showScannerResult(`No active teacher account was found for "${teacherId}".`, "error");
    return;
  }

  const date = today();
  const alreadyRecorded = getAttendance().some(record =>
    attendanceRecordRole(record) === "teacher"
    && String(record.teacherId || record.teacherNo || record.staffId || record.userId || record.accountId || "") === teacherId
    && record.date === date
  );
  if (alreadyRecorded) {
    showScannerResult(`${fullName(teacher)} already has an attendance record for today.`, "info");
    return;
  }

  saveAttendance([
    ...getAttendance(),
    {
      id: makeId("ATT"),
      role: "teacher",
      teacherId,
      teacherName: fullName(teacher),
      date,
      time: timeNow(),
      status: "Present",
      subject: "Staff attendance"
    }
  ]);
  showScannerResult(`Attendance recorded for ${fullName(teacher)} (${teacherId}).`, "success");
}

function recordScannedIdentity(rawValue) {
  const value = String(rawValue || "").trim();
  const teacherPrefix = /^teacher:/i;
  const studentPrefix = /^student:/i;
  if (teacherPrefix.test(value)) {
    recordScannedTeacher(value.replace(teacherPrefix, "").trim());
    return;
  }
  if (studentPrefix.test(value)) {
    recordScannedStudent(value.replace(studentPrefix, "").trim());
    return;
  }
  if (allTeachers().some(teacher => String(teacher.teacherId || teacher.id || "") === value)) {
    recordScannedTeacher(value);
    return;
  }
  recordScannedStudent(value);
}


/* QR READER LOADER: uses vendor/jsQR.js, and tries backup locations if that file is missing */
const JSQR_SOURCES = [
  "./vendor/jsQR.js",
  "vendor/jsqr.js",
  "./jsQR.js",
  "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"
];
let jsQRLoading = null;

function loadScriptOnce(src) {
  return new Promise(resolve => {
    const tag = document.createElement("script");
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve(typeof window.jsQR === "function");
    tag.onerror = () => { tag.remove(); resolve(false); };
    document.head.appendChild(tag);
  });
}

function loadJsQR() {
  if (typeof window.jsQR === "function") return Promise.resolve(true);
  if (!jsQRLoading) {
    jsQRLoading = (async () => {
      for (const src of JSQR_SOURCES) {
        if (await loadScriptOnce(src)) return true;
      }
      return false;
    })().finally(() => { if (typeof window.jsQR !== "function") jsQRLoading = null; });
  }
  return jsQRLoading;
}

const JSQR_MISSING_MESSAGE = "The QR reader file could not be loaded. Make sure the vendor folder (vendor/jsQR.js) is uploaded with the site, then reload with Ctrl+F5. You can enter the student number below in the meantime.";

async function startScanner() {
  const status = $("#scanner-status");
  const video = $("#scanner-video");
  const startButton = $('[data-action="scanner-start"]');
  const stopButton = $('[data-action="scanner-stop"]');
  if (!video || !status) return;
  if (!window.isSecureContext) {
    showScannerResult("Camera access requires HTTPS or localhost. Open this site using its secure HTTPS address, or run it on localhost.", "error");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showScannerResult("This browser does not provide camera access. Try a current version of Chrome, Edge, Firefox, or Safari.", "error");
    return;
  }

  const NativeBarcodeDetector = window.BarcodeDetector;
  const canUseNativeDetector = typeof NativeBarcodeDetector === "function";
  let canUseJsQR = typeof window.jsQR === "function";
  if (!canUseJsQR) {
    status.textContent = "Loading the QR reader...";
    canUseJsQR = await loadJsQR();
  }
  if (!canUseNativeDetector && !canUseJsQR) {
    showScannerResult(JSQR_MISSING_MESSAGE, "error");
    return;
  }

  stopScanner();
  status.textContent = "Requesting camera access...";
  if (startButton) startButton.disabled = true;
  try {
    let detector = null;
    if (canUseNativeDetector) {
      try {
        detector = new NativeBarcodeDetector({ formats: ["qr_code"] });
      } catch (error) {
        if (!canUseJsQR) throw error;
      }
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } }
      });
    } catch (error) {
      if (error.name !== "OverconstrainedError" && error.name !== "ConstraintNotSatisfiedError") throw error;
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    }
    const session = { detector, stream, frame: null, stopped: false, lastScanAt: 0 };
    scanner = session;
    video.srcObject = stream;
    await video.play();
    video.hidden = false;
    video.closest(".scanner-video-wrap").hidden = false;
    if (stopButton) stopButton.disabled = false;
    status.textContent = "Camera is on. Point it at a student QR code.";

    const scanFrame = async () => {
      if (scanner !== session || session.stopped) return;
      try {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && Date.now() - session.lastScanAt >= 150) {
          session.lastScanAt = Date.now();
          let value = "";
          if (session.detector) {
            try {
              const codes = await session.detector.detect(video);
              value = codes[0]?.rawValue || "";
            } catch (error) {
              if (!canUseJsQR) throw error;
              session.detector = null;
            }
          }
          if (!session.detector && video.videoWidth && video.videoHeight) {
            const scale = Math.min(1, 640 / video.videoWidth);
            const canvas = session.canvas || (session.canvas = document.createElement("canvas"));
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) throw new Error("The browser could not prepare the camera image.");
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            value = window.jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data || "";
          }
          if (session.stopped) return;
          if (value) recordScannedIdentity(value);
        }
      } catch (error) {
        stopScanner();
        video.hidden = true;
        video.closest(".scanner-video-wrap").hidden = true;
        if (stopButton) stopButton.disabled = true;
        if (startButton) startButton.disabled = false;
        showScannerResult(`QR scanning stopped: ${error.message || "the camera could not read this QR code."}`, "error");
        return;
      }
      if (scanner === session && !session.stopped) session.frame = requestAnimationFrame(scanFrame);
    };
    session.frame = requestAnimationFrame(scanFrame);
  } catch (error) {
    stopScanner();
    video.hidden = true;
    video.closest(".scanner-video-wrap").hidden = true;
    if (stopButton) stopButton.disabled = true;
    if (startButton) startButton.disabled = false;
    const reason = error.name === "NotAllowedError"
      ? "Camera permission was denied or blocked. Allow camera access for this site in your browser or device settings, then try again. If this page is shown inside a preview or embedded frame, the frame may block the camera. Open the site in its own tab, or use Scan from photo."
      : error.name === "NotFoundError"
        ? "No camera was found. Connect or enable a camera, then try again."
        : error.name === "NotReadableError" || error.name === "AbortError"
          ? "The camera is busy or unavailable. Close other apps using it, then try again."
          : `Could not start the camera: ${error.message || "check camera access and try again."}`;
    showScannerResult(reason, "error");
  }
}


/* SCAN A QR CODE FROM A PHOTO (works without live camera access) */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file could not be opened as an image.")); };
    img.src = url;
  });
}

async function decodeQRFromImage(img) {
  const widest = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const sizes = [...new Set([1000, 700, 1400, 450].map(size => Math.min(size, widest)))];
  const NativeDetector = window.BarcodeDetector;
  let native = null;
  if (typeof NativeDetector === "function") {
    try { native = new NativeDetector({ formats: ["qr_code"] }); } catch { native = null; }
  }
  for (const size of sizes) {
    const scale = size / widest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) continue;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (native) {
      try {
        const codes = await native.detect(canvas);
        if (codes[0]?.rawValue) return codes[0].rawValue;
      } catch { native = null; }
    }
    if (typeof window.jsQR === "function") {
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      const found = window.jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
      if (found?.data) return found.data;
    }
  }
  return "";
}

async function scanPhotoFile(input) {
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  if (!String(file.type).startsWith("image/")) {
    showScannerResult("Please choose a photo (an image file).", "error");
    return;
  }
  const status = $("#scanner-status");
  if (status) status.textContent = "Reading the photo...";
  try {
    if (typeof window.jsQR !== "function" && typeof window.BarcodeDetector !== "function") {
      if (!(await loadJsQR())) { showScannerResult(JSQR_MISSING_MESSAGE, "error"); return; }
    } else if (typeof window.jsQR !== "function") {
      loadJsQR();
    }
    const value = await decodeQRFromImage(await loadImageFromFile(file));
    if (!value) {
      showScannerResult("No QR code was found in that photo. Hold the camera closer, keep the whole code in the picture and in focus, then try again.", "error");
      return;
    }
    recordScannedIdentity(value);
  } catch (error) {
    showScannerResult(error.message || "That photo could not be read.", "error");
  }
}

document.addEventListener("change", event => {
  if (event.target.id === "scanner-photo-input") scanPhotoFile(event.target);
});

function stopScannerPage() {
  stopScanner();
  const video = $("#scanner-video");
  if (video) {
    video.pause();
    video.srcObject = null;
    video.hidden = true;
    video.closest(".scanner-video-wrap").hidden = true;
  }
  const startButton = $('[data-action="scanner-start"]');
  const stopButton = $('[data-action="scanner-stop"]');
  if (startButton) startButton.disabled = false;
  if (stopButton) stopButton.disabled = true;
  if ($("#scanner-status")) $("#scanner-status").textContent = "Camera is off.";
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
    ["Guardian", currentUser.guardianName || "Not set"],
    ["Contact Number", currentUser.contactNumber || "Not set"],
    ["Address", currentUser.address || "Not set"]
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

function renderTeacherProfile() {
  const name = fullName(currentUser);
  const photo = currentUser.photo;
  const teacherId = String(currentUser.teacherId || currentUser.id || "");
  const subjects = Array.isArray(currentUser.subjects) && currentUser.subjects.length
    ? currentUser.subjects.join(", ")
    : "Not assigned";
  const details = [
    ["Name", name],
    ["Teacher ID", teacherId],
    ["Email", currentUser.recoveryEmail || "Not set"],
    ["Subjects", subjects]
  ];
  return `
  <div class="profile-page">
    <section class="panel profile-card">
      <div class="profile-photo-col">
        <div class="profile-photo">${photo
          ? `<img src="${escapeHTML(photo)}" alt="Profile photo of ${escapeHTML(name)}">`
          : `<span aria-hidden="true">${escapeHTML((name.charAt(0) || "T").toUpperCase())}</span>`}</div>
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

function renderTeacherID() {
  const name = fullName(currentUser);
  const teacherId = String(currentUser.teacherId || currentUser.id || "");
  const schoolYear = (termOf(today()).match(/^\d{4}-\d{4}/) || [""])[0];
  const photo = currentUser.photo
    ? `<img src="${escapeHTML(currentUser.photo)}" alt="Photo of ${escapeHTML(name)}">`
    : '<svg viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="38" r="20" fill="currentColor"/><path d="M8 120c0-26 18-40 42-40s42 14 42 40z" fill="currentColor"/></svg>';
  const subjects = Array.isArray(currentUser.subjects) && currentUser.subjects.length
    ? currentUser.subjects.join(", ")
    : "Not assigned";

  return `
  <div class="qr-page">
    <article class="id-card" aria-label="Teacher ID of ${escapeHTML(name)}">
      <div class="id-top">S.Y. ${escapeHTML(schoolYear)}</div>
      <img class="id-logo" src="${HSSL_LOGO}" alt="High School for Service and Learning seal">
      <div class="id-photo">${photo}</div>
      <div class="id-info">
        <p class="id-school">High School for Service and Learning</p>
        <p class="id-role">TEACHER</p>
        <h2 class="id-name">${escapeHTML(name)}</h2>
        <hr class="id-rule">
        <p class="id-line">Teacher ID: ${escapeHTML(teacherId)}</p>
        <p class="id-line">Subjects: ${escapeHTML(subjects)}</p>
      </div>
      <div class="id-swoosh"><span>ID No. ${escapeHTML(teacherId)}</span></div>
      <div id="teacher-qr-code" class="id-qr" role="img" aria-label="Attendance QR code for teacher ${escapeHTML(teacherId)}"></div>
    </article>
    <p class="muted small id-hint">Show this ID to the admin scanner to record your attendance. The QR does not sign you in.</p>
  </div>`;
}

function renderTeacherQRCode() {
  const box = $("#teacher-qr-code");
  if (!box) return;
  box.innerHTML = "";
  if (typeof QRCode === "undefined") {
    box.innerHTML = '<p class="muted small">The QR code could not be created because the QR library did not load. Check your connection and reload the page.</p>';
    return;
  }
  const teacherId = String(currentUser.teacherId || currentUser.id || "");
  new QRCode(box, {
    text: `teacher:${teacherId}`,
    width: 200,
    height: 200,
    colorDark: "#231d4f",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
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
        goToPage(currentUser.role === "teacher" ? "teacher-profile" : "student-profile");
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
let adminAttendanceTab = "student";

function attendanceRecordRole(record) {
  const explicitRole = String(record.role || record.userRole || record.accountRole || record.recordType || "").toLowerCase();
  if (explicitRole.includes("teacher") || explicitRole.includes("staff")) return "teacher";
  if (explicitRole.includes("student")) return "student";
  if (record.teacherId || record.teacherNo || record.staffId) return "teacher";
  if (record.studentNo || record.studentId) return "student";
  if (record.teacherName) return "teacher";
  if (record.studentName) return "student";

  const accountIds = [record.userId, record.accountId, record.employeeId].filter(Boolean).map(String);
  const account = getUsers().find(user => accountIds.includes(accountIdOf(user)));
  return account?.role === "teacher" ? "teacher" : "student";
}

function attendanceRecordPerson(record, role) {
  const users = getUsers();
  const id = role === "teacher"
    ? String(record.teacherId || record.teacherNo || record.staffId || record.userId || record.accountId || "")
    : String(record.studentNo || record.studentId || record.userId || record.accountId || "");
  const account = users.find(user => user.role === role && id && accountIdOf(user) === id);
  const name = role === "teacher"
    ? record.teacherName || record.staffName || record.name || (account && fullName(account))
    : record.studentName || record.name || (account && fullName(account));
  return { id: id || (account && accountIdOf(account)) || "—", name: name || "—" };
}

function adminAttendanceTableHTML(role) {
  const records = getAttendance()
    .filter(record => attendanceRecordRole(record) === role)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const label = role === "teacher" ? "teacher" : "student";
  const rows = records.length
    ? records.map(record => {
      const person = attendanceRecordPerson(record, role);
      const date = parseDateKey(record.date);
      const validDate = !Number.isNaN(date.getTime());
      const status = String(record.status || "Recorded");
      const statusClass = ["present", "late", "absent"].includes(status.toLowerCase()) ? status.toLowerCase() : "recorded";
      const time = record.time || record.checkIn || (statusClass === "absent" ? "No scan" : "—");
      return `<tr class="row-${statusClass}">
        <td><strong>${escapeHTML(person.name)}</strong></td>
        <td>${escapeHTML(person.id)}</td>
        <td>${validDate ? escapeHTML(date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : "—"}</td>
        <td>${validDate ? DAY_ABBR[date.getDay()] : "—"}</td>
        <td>${escapeHTML(time)}</td>
        <td>${escapeHTML(record.subject || "General attendance")}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHTML(status)}</span></td>
      </tr>`;
    }).join("")
    : `<tr><td colspan="7" class="att-empty">No ${label} attendance records yet.</td></tr>`;
  return `<table class="att-table admin-att-table">
    <thead><tr><th>${role === "teacher" ? "Teacher" : "Student"}</th><th>${role === "teacher" ? "Teacher ID" : "Student ID"}</th><th>Date</th><th>Day</th><th>Time</th><th>Subject</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function refreshAdminAttendance() {
  const roles = ["student", "teacher"];
  roles.forEach(role => {
    const tab = $(`[data-action="admin-attendance-tab"][data-tab="${role}"]`);
    if (tab) {
      const count = getAttendance().filter(record => attendanceRecordRole(record) === role).length;
      tab.innerHTML = `${role === "teacher" ? "Teacher" : "Student"} Records <span class="chip-count">${count}</span>`;
      tab.classList.toggle("active", adminAttendanceTab === role);
      tab.setAttribute("aria-selected", String(adminAttendanceTab === role));
    }
  });
  const panel = $("#admin-attendance-panel");
  if (panel) {
    panel.innerHTML = adminAttendanceTableHTML(adminAttendanceTab);
    panel.setAttribute("aria-labelledby", `admin-attendance-tab-${adminAttendanceTab}`);
  }
}

function renderAttendance() {
  adminAttendanceTab = "student";
  const counts = {
    student: getAttendance().filter(record => attendanceRecordRole(record) === "student").length,
    teacher: getAttendance().filter(record => attendanceRecordRole(record) === "teacher").length
  };
  return `
  <div class="att-page admin-attendance-page">
    <div class="att-toolbar">
      <p class="muted">Attendance records are separated by account type.</p>
      <h2 class="att-title">Attendance Records</h2>
    </div>
    <section class="att-card">
      <div class="att-chips admin-attendance-tabs" role="tablist" aria-label="Attendance record type">
        <button type="button" id="admin-attendance-tab-student" class="att-chip active" role="tab" aria-selected="true" aria-controls="admin-attendance-panel" data-action="admin-attendance-tab" data-tab="student">Student Records <span class="chip-count">${counts.student}</span></button>
        <button type="button" id="admin-attendance-tab-teacher" class="att-chip" role="tab" aria-selected="false" aria-controls="admin-attendance-panel" data-action="admin-attendance-tab" data-tab="teacher">Teacher Records <span class="chip-count">${counts.teacher}</span></button>
      </div>
      <div class="att-scroll" id="admin-attendance-panel" role="tabpanel" aria-labelledby="admin-attendance-tab-student">${adminAttendanceTableHTML("student")}</div>
    </section>
  </div>`;
}

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

function teacherScheduleEntries() {
  const teacherName = fullName(currentUser).trim().toLowerCase();
  const assignedSubjects = (Array.isArray(currentUser?.subjects) ? currentUser.subjects : [])
    .map(subject => String(subject).trim().toLowerCase())
    .filter(Boolean);
  if (!assignedSubjects.length) return [];

  const entries = [];
  const addEntry = (entry, section, grade) => {
    const subject = String(entry.subject || "").trim();
    const term = String(entry.term || termOf(today()));
    if (!subject || !assignedSubjects.includes(subject.toLowerCase())) return;
    const key = `${term}\u0000${subject.toLowerCase()}\u0000${grade || ""}\u0000${section || ""}`;
    let grouped = entries.find(item => item.key === key);
    if (!grouped) {
      grouped = { key, term, subject, section: [grade, section].filter(Boolean).join(" - ") || "Not set", slots: [] };
      entries.push(grouped);
    }
    (Array.isArray(entry.slots) ? entry.slots : []).forEach(slot => {
      const signature = `${slot.day}\u0000${slot.time || ""}\u0000${slot.room || ""}`;
      if (!grouped.slots.some(existing => existing.signature === signature)) {
        grouped.slots.push({ ...slot, signature });
      }
    });
  };

  allStudents().forEach(student => {
    (Array.isArray(student.schedule) ? student.schedule : []).forEach(entry => {
      if (String(entry.professor || "").trim().toLowerCase() !== teacherName) return;
      addEntry(entry, student.section, student.grade);
    });
  });
  (Array.isArray(currentUser.schedule) ? currentUser.schedule : []).forEach(entry => {
    addEntry(entry, entry.section, entry.grade);
  });

  return entries;
}

function teacherScheduleRowsHTML(term, day) {
  const entries = teacherScheduleEntries().filter(entry => !entry.term || entry.term === term);
  const rows = entries.map(entry => {
    const slots = entry.slots.filter(slot => day === "all" || String(slot.day) === day);
    if (!slots.length) return "";
    const lines = pick => slots.map(slot => `<div class="slot">${escapeHTML(pick(slot))}</div>`).join("");
    return `<tr>
      <td><div class="slot att-subject">${escapeHTML(entry.subject)}</div></td>
      <td><div class="slot">${escapeHTML(entry.section)}</div></td>
      <td>${lines(slot => DAY_ABBR[slot.day] ?? "—")}</td>
      <td>${lines(slot => slot.time || "—")}</td>
      <td>${lines(slot => slot.room || "—")}</td>
    </tr>`;
  }).join("");
  return rows || '<tr><td colspan="5" class="att-empty">No assigned classes for this term and day.</td></tr>';
}

function renderTeacherScheduleRows() {
  const body = $("#teacher-sch-body");
  if (body) body.innerHTML = teacherScheduleRowsHTML($("#teacher-sch-term")?.value, $("#teacher-sch-day")?.value || "all");
}

function renderTeacherSchedule() {
  const entries = teacherScheduleEntries();
  const terms = [...new Set(entries.map(entry => entry.term).filter(Boolean))].sort().reverse();
  const currentTerm = termOf(today());
  if (!terms.length) terms.push(currentTerm);
  const selected = terms.includes(currentTerm) ? currentTerm : terms[0];
  return `
  <div class="att-page">
    <div class="att-toolbar">
      <div class="att-filters">
        <label for="teacher-sch-term">School Year &amp; Term:</label>
        <select id="teacher-sch-term" data-teacher-sch-filter>
          ${terms.map(term => `<option value="${escapeHTML(term)}"${term === selected ? " selected" : ""}>${escapeHTML(term)}</option>`).join("")}
        </select>
        <label for="teacher-sch-day">Day:</label>
        <select id="teacher-sch-day" data-teacher-sch-filter>
          <option value="all" selected>Entire Week</option>
          ${[1, 2, 3, 4, 5, 6].map(number => `<option value="${number}">${DAY_NAMES[number]}</option>`).join("")}
        </select>
      </div>
      <h2 class="att-title">My Schedule</h2>
    </div>
    <div class="att-card">
      <div class="att-scroll">
        <table class="att-table sch-table">
          <thead><tr><th>Subject</th><th>Section</th><th>Days</th><th>Time</th><th>Room</th></tr></thead>
          <tbody id="teacher-sch-body">${teacherScheduleRowsHTML(selected, "all")}</tbody>
        </table>
      </div>
      <p class="muted small att-note">Today's attendance for your assigned students.</p>
    </div>
  </div>`;
}

function teacherStudentAssignments() {
  const teacherName = fullName(currentUser).trim().toLowerCase();
  const teacherSubjects = new Set((Array.isArray(currentUser?.subjects) ? currentUser.subjects : [])
    .map(subject => String(subject).trim().toLowerCase())
    .filter(Boolean));
  const assignedSections = new Map();
  teacherScheduleEntries().forEach(entry => {
    const section = entry.section;
    if (!section || section === "Not set") return;
    const subjects = assignedSections.get(section) || new Set();
    subjects.add(entry.subject.toLowerCase());
    assignedSections.set(section, subjects);
  });

  return allStudents()
    .filter(student => student.active !== false)
    .map(student => {
      const assignedSubjects = new Set();
      (Array.isArray(student.schedule) ? student.schedule : []).forEach(entry => {
        const subject = String(entry.subject || "").trim();
        if (!subject) return;
        const isAssignedToTeacher = String(entry.professor || "").trim().toLowerCase() === teacherName;
        const sectionSubjects = assignedSections.get([student.grade, student.section].filter(Boolean).join(" - "))
          || assignedSections.get(student.section);
        const isTeacherSectionSubject = !!sectionSubjects?.has(subject.toLowerCase());
        const isTeacherSubject = teacherSubjects.has(subject.toLowerCase());
        if ((isAssignedToTeacher && (!teacherSubjects.size || isTeacherSubject)) || isTeacherSectionSubject) {
          assignedSubjects.add(subject);
        }
      });
      return { student, subjects: [...assignedSubjects].sort((a, b) => a.localeCompare(b)) };
    })
    .filter(assignment => assignment.subjects.length);
}

function filteredTeacherStudents() {
  const query = ($("#teacher-student-search")?.value || "").trim().toLowerCase();
  const section = $("#teacher-student-section")?.value || "all";
  return teacherStudentAssignments().filter(({ student, subjects }) => {
    const studentSection = [student.grade, student.section].filter(Boolean).join(" - ") || "Not set";
    return (section === "all" || studentSection === section)
      && (!query || [
        fullName(student), studentNumber(student), student.grade, student.section, ...subjects
      ].some(value => String(value || "").toLowerCase().includes(query)));
  });
}

function teacherStudentRowsHTML(assignments) {
  if (!assignments.length) {
    const hasStudents = teacherStudentAssignments().length > 0;
    return `<tr><td colspan="5" class="att-empty">${hasStudents ? "No students match your search or section filter." : "No students are assigned to your classes yet."}</td></tr>`;
  }
  return assignments.map(({ student, subjects }) => `
    <tr>
      <td><strong>${escapeHTML(fullName(student))}</strong></td>
      <td>${escapeHTML(studentNumber(student))}</td>
      <td>${escapeHTML(student.grade || "Not set")}</td>
      <td>${escapeHTML(student.section || "Not set")}</td>
      <td>${escapeHTML(subjects.join(", "))}</td>
    </tr>`).join("");
}

function refreshTeacherStudents() {
  const assignments = filteredTeacherStudents();
  const body = $("#teacher-students-body");
  if (body) body.innerHTML = teacherStudentRowsHTML(assignments);
  const info = $("#teacher-students-info");
  if (info) info.textContent = `Showing ${assignments.length} of ${teacherStudentAssignments().length} assigned students`;
}

function renderTeacherStudents() {
  const assignments = teacherStudentAssignments();
  const sections = [...new Set(assignments.map(({ student }) =>
    [student.grade, student.section].filter(Boolean).join(" - ") || "Not set"
  ))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const subjects = [...new Set(assignments.flatMap(assignment => assignment.subjects))]
    .sort((a, b) => a.localeCompare(b));
  return `
  <div class="teacher-students-page">
    <section class="stats teacher-stats" aria-label="Assigned student summary">
      <div class="stat"><p>Assigned students</p><strong>${assignments.length}</strong></div>
      <div class="stat"><p>Sections handled</p><strong>${sections.length}</strong></div>
      <div class="stat"><p>Subjects handled</p><strong>${subjects.length}</strong></div>
    </section>
    <section class="stu-card teacher-students-card">
      <div class="teacher-students-head">
        <div><h2>Students I handle</h2><p class="muted small">Students assigned to your subjects and sections.</p></div>
        <div class="teacher-students-filters">
          <label class="sr-only" for="teacher-student-search">Search students</label>
          <input type="search" id="teacher-student-search" placeholder="Search name, ID, subject">
          <label class="sr-only" for="teacher-student-section">Filter by section</label>
          <select id="teacher-student-section">
            <option value="all">All sections</option>
            ${sections.map(section => `<option value="${escapeHTML(section)}">${escapeHTML(section)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="att-scroll">
        <table class="stu-table teacher-students-table">
          <thead><tr><th>Student</th><th>Student ID</th><th>Grade</th><th>Section</th><th>Your subjects</th></tr></thead>
          <tbody id="teacher-students-body">${teacherStudentRowsHTML(assignments)}</tbody>
        </table>
      </div>
      <p class="muted small teacher-info" id="teacher-students-info">Showing ${assignments.length} of ${assignments.length} assigned students</p>
    </section>
  </div>`;
}

function teacherAttendanceSections() {
  const sections = new Map();
  teacherStudentAssignments().forEach(({ student }) => {
    const sectionName = [student.grade, student.section].filter(Boolean).join(" - ") || "Section not set";
    if (!sections.has(sectionName)) sections.set(sectionName, []);
    sections.get(sectionName).push(student);
  });
  return [...sections.entries()]
    .map(([name, students]) => ({ name, students }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function attendanceRecordsForStudent(student) {
  const id = studentNumber(student);
  return getAttendance()
    .filter(record => attendanceRecordRole(record) === "student"
      && [record.studentNo, record.studentId, record.userId, record.accountId]
        .some(value => String(value ?? "") === id)
      && record.date === today())
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))
      || String(b.time || b.checkIn || "").localeCompare(String(a.time || a.checkIn || "")));
}

function teacherAttendanceSectionHTML(section) {
  const recordCount = section.students.reduce((count, student) => count + attendanceRecordsForStudent(student).length, 0);
  const rows = section.students.flatMap(student => {
    const records = attendanceRecordsForStudent(student);
    if (!records.length) {
      return [`<tr><td><strong>${escapeHTML(fullName(student))}</strong></td><td>${escapeHTML(studentNumber(student))}</td><td colspan="4" class="muted">No attendance recorded today.</td></tr>`];
    }
    return records.map(record => {
      const date = parseDateKey(record.date);
      const validDate = !Number.isNaN(date.getTime());
      const status = String(record.status || "Recorded");
      const normalizedStatus = status.toLowerCase();
      const statusClass = ["present", "late", "absent"].includes(normalizedStatus) ? normalizedStatus : "recorded";
      const time = record.time || record.checkIn || (statusClass === "absent" ? "No scan" : "—");
      return `<tr class="row-${statusClass}">
        <td><strong>${escapeHTML(fullName(student))}</strong></td>
        <td>${escapeHTML(studentNumber(student))}</td>
        <td>${validDate ? escapeHTML(date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : "—"}</td>
        <td>${escapeHTML(record.subject || "General attendance")}</td>
        <td>${escapeHTML(time)}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHTML(status)}</span></td>
      </tr>`;
    });
  }).join("");

  return `<section class="stu-card teacher-attendance-section">
    <div class="teacher-students-head">
      <div><h2>${escapeHTML(section.name)}</h2><p class="muted small">${section.students.length} assigned student${section.students.length === 1 ? "" : "s"} · ${recordCount} record${recordCount === 1 ? "" : "s"} today</p></div>
    </div>
    <div class="att-scroll">
      <table class="att-table teacher-attendance-table">
        <thead><tr><th>Student</th><th>Student ID</th><th>Date</th><th>Subject</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>`;
}

function renderTeacherAttendance() {
  const sections = teacherAttendanceSections();
  const studentCount = sections.reduce((total, section) => total + section.students.length, 0);
  const recordCount = sections.reduce((total, section) =>
    total + section.students.reduce((count, student) => count + attendanceRecordsForStudent(student).length, 0), 0);
  if (!sections.length) {
    return '<section class="panel empty">No students are assigned to your classes yet, so there are no attendance sections to show.</section>';
  }
  return `
  <div class="teacher-attendance-page">
    <section class="stats teacher-stats" aria-label="Assigned student attendance summary">
      <div class="stat"><p>Assigned students</p><strong>${studentCount}</strong></div>
      <div class="stat"><p>Sections handled</p><strong>${sections.length}</strong></div>
      <div class="stat"><p>Records today</p><strong>${recordCount}</strong></div>
    </section>
    ${sections.map(teacherAttendanceSectionHTML).join("")}
  </div>`;
}

/* ADMIN: TEACHERS */
let teacherSearch = "";

function allTeachers() {
  return getUsers()
    .filter(user => user.role === "teacher")
    .sort((a, b) => fullName(a).localeCompare(fullName(b), undefined, { sensitivity: "base" }));
}

function teacherMatchesSearch(teacher, query) {
  const subjects = Array.isArray(teacher.subjects) ? teacher.subjects.join(" ") : "";
  const values = [
    teacher.teacherId || teacher.id,
    teacher.firstName,
    teacher.lastName,
    teacher.recoveryEmail,
    subjects,
    teacher.shift,
    teacher.active === false ? "inactive" : "active"
  ];
  return values.some(value => String(value || "").toLowerCase().includes(query));
}

function teacherTableHTML(teachers, total) {
  const rows = teachers.length
    ? teachers.map(teacher => {
      const name = fullName(teacher);
      const subjects = Array.isArray(teacher.subjects) && teacher.subjects.length
        ? teacher.subjects.join(", ")
        : "—";
      const id = teacher.teacherId || teacher.id;
      return `<tr>
        <td>${escapeHTML(id || "—")}</td>
        <td><strong>${escapeHTML(name)}</strong></td>
        <td>${escapeHTML(teacher.recoveryEmail || "—")}</td>
        <td>${escapeHTML(subjects)}</td>
        <td>${escapeHTML(teacher.shift || "—")}</td>
        <td><span class="teacher-status${teacher.active === false ? " is-inactive" : ""}">${teacher.active === false ? "Inactive" : "Active"}</span></td>
        <td><button type="button" class="row-qr-btn" data-action="teacher-qr" data-id="${escapeHTML(id || "")}" aria-label="Show attendance QR code for ${escapeHTML(name)}"><span class="row-qr" data-text="teacher:${escapeHTML(id || "")}"></span></button></td>
      </tr>`;
    }).join("")
    : `<tr><td colspan="7" class="att-empty">${total ? "No teachers match your search." : "No teachers have been added yet. Use Add Teacher to create an account."}</td></tr>`;
  return `<table class="stu-table teacher-table">
    <thead><tr><th>Teacher ID</th><th>Name</th><th>Email</th><th>Subjects</th><th>Shift</th><th>Status</th><th>Attendance QR</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderTeachers() {
  const teachers = allTeachers();
  const query = teacherSearch.trim().toLowerCase();
  const visible = query ? teachers.filter(teacher => teacherMatchesSearch(teacher, query)) : teachers;
  const activeCount = teachers.filter(teacher => teacher.active !== false).length;
  return `
  <div class="teacher-page">
    <div class="teacher-toolbar">
      <p class="muted">Manage the teacher accounts assigned to your school.</p>
      <button type="button" class="primary stu-btn" data-action="teacher-add">Add Teacher</button>
    </div>
    <section class="stats teacher-stats" aria-label="Teacher account summary">
      <div class="stat"><p>Total teachers</p><strong>${teachers.length}</strong></div>
      <div class="stat"><p>Active</p><strong>${activeCount}</strong></div>
      <div class="stat"><p>Inactive</p><strong>${teachers.length - activeCount}</strong></div>
    </section>
    <section class="stu-card teacher-card">
      <div class="stu-controls">
        <span class="muted small">All teacher accounts</span>
        <label class="inline" for="teacher-search">Search:
          <input type="search" id="teacher-search" value="${escapeHTML(teacherSearch)}" autocomplete="off" placeholder="Name, ID, subject...">
        </label>
      </div>
      <div class="att-scroll" id="teacher-table-wrap">${teacherTableHTML(visible, teachers.length)}</div>
      <p class="muted small teacher-info" id="teacher-info">${visible.length ? `Showing ${visible.length} of ${teachers.length} teachers` : "Showing 0 teachers"}</p>
    </section>
  </div>`;
}

function refreshTeachers() {
  const teachers = allTeachers();
  const query = teacherSearch.trim().toLowerCase();
  const visible = query ? teachers.filter(teacher => teacherMatchesSearch(teacher, query)) : teachers;
  const table = $("#teacher-table-wrap");
  if (table) {
    table.innerHTML = teacherTableHTML(visible, teachers.length);
    drawRowQRs();
  }
  const info = $("#teacher-info");
  if (info) info.textContent = visible.length
    ? `Showing ${visible.length} of ${teachers.length} teachers`
    : "Showing 0 teachers";
}

function openAddTeacher() {
  openModal("Add Teacher", `
    <form id="teacher-add-form" class="stu-form" novalidate>
      <div><label for="tf-id">Teacher ID</label><input id="tf-id" required autocomplete="off" placeholder="e.g. TCH-002"></div>
      <div><label for="tf-email">Email</label><input id="tf-email" type="email" required autocomplete="email"></div>
      <div><label for="tf-first">First name</label><input id="tf-first" required autocomplete="given-name"></div>
      <div><label for="tf-last">Last name</label><input id="tf-last" required autocomplete="family-name"></div>
      <div class="full"><label for="tf-subjects">Subjects</label><input id="tf-subjects" autocomplete="off" placeholder="Separate subjects with commas"></div>
      <div><label for="tf-shift">Shift</label><select id="tf-shift"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></div>
      <div><label for="tf-password">Temporary password</label><input id="tf-password" type="password" required minlength="4" autocomplete="new-password"></div>
      <p id="tf-error" class="error full" role="alert" hidden></p>
      <div class="form-actions full"><button type="button" class="secondary" data-ov="close">Cancel</button><button type="submit" class="primary">Save teacher</button></div>
    </form>`);
}

function submitAddTeacher(event) {
  event.preventDefault();
  const value = id => ($(`#${id}`)?.value || "").trim();
  const fail = message => {
    const error = $("#tf-error");
    error.textContent = message;
    error.hidden = false;
  };
  const teacherId = value("tf-id");
  const email = value("tf-email").toLowerCase();
  const firstName = value("tf-first");
  const lastName = value("tf-last");
  const password = value("tf-password");
  if (!teacherId || !email || !firstName || !lastName || !password) {
    return fail("Fill in the teacher ID, email, name, and temporary password.");
  }
  if (!$("#tf-email").checkValidity()) return fail("Enter a valid email address.");
  if (password.length < 4) return fail("Use a temporary password with at least 4 characters.");

  const users = getUsers();
  if (users.some(user => user.role === "teacher"
    && String(user.teacherId || user.id).trim().toLowerCase() === teacherId.toLowerCase())) {
    return fail("A teacher with that Teacher ID already exists.");
  }
  const subjects = value("tf-subjects").split(",").map(subject => subject.trim()).filter(Boolean);
  users.push({
    id: teacherId,
    teacherId,
    role: "teacher",
    firstName,
    lastName,
    password,
    recoveryEmail: email,
    subjects,
    shift: $("#tf-shift").value,
    mustChangePassword: true,
    active: true
  });
  saveUsers(users);
  teacherSearch = "";
  closeOverlays();
  goToPage("teachers");
  notify(`${firstName} ${lastName} was added as a teacher.`);
}

/* ADMIN: ACCOUNT CREATION */
function renderAccounts() {
  const accounts = getUsers().filter(user => user.role === "student" || user.role === "teacher");
  return `
  <div class="account-page">
    <section class="panel account-intro">
      <h2>Create a login account</h2>
      <p class="muted">Create a student or teacher account. Share the account ID and temporary password with the user so they can sign in using the matching role on the login screen.</p>
    </section>
    <section class="panel account-create-card">
      <form id="account-create-form" class="stu-form" novalidate>
        <div>
          <label for="account-role">Account type</label>
          <select id="account-role" required>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        <div>
          <label for="account-id" id="account-id-label">Student Number</label>
          <input id="account-id" required autocomplete="off" placeholder="Enter student number">
        </div>
        <div><label for="account-first">First name</label><input id="account-first" required autocomplete="given-name"></div>
        <div><label for="account-last">Last name</label><input id="account-last" required autocomplete="family-name"></div>
        <div><label for="account-email">Recovery email <span class="muted">(optional)</span></label><input id="account-email" type="email" autocomplete="email"></div>
        <div><label for="account-password">Temporary password</label><input id="account-password" type="password" required minlength="4" autocomplete="new-password"></div>
        <div class="account-student-fields">
          <label for="account-grade">Grade</label>
          <select id="account-grade">${[7, 8, 9, 10, 11, 12].map(grade => `<option>Grade ${grade}</option>`).join("")}</select>
        </div>
        <div class="account-student-fields"><label for="account-section">Section</label><input id="account-section" autocomplete="off" placeholder="e.g. STEM-A"></div>
        <div class="account-student-fields"><label for="account-guardian">Guardian name</label><input id="account-guardian" autocomplete="name"></div>
        <div class="account-student-fields"><label for="account-contact">Contact number</label><input id="account-contact" type="tel" autocomplete="tel"></div>
        <div class="account-student-fields full"><label for="account-address">Address</label><textarea id="account-address" rows="2" autocomplete="street-address"></textarea></div>
        <div class="account-student-fields">
          <label for="account-gender">Gender</label>
          <select id="account-gender"><option>Female</option><option>Male</option></select>
        </div>
        <div class="account-teacher-fields" hidden>
          <label for="account-subjects">Subjects</label>
          <input id="account-subjects" autocomplete="off" placeholder="Separate subjects with commas">
        </div>
        <div>
          <label for="account-shift">Shift</label>
          <select id="account-shift"><option>Morning</option><option>Afternoon</option><option>Evening</option></select>
        </div>
        <p id="account-create-error" class="error full" role="alert" hidden></p>
        <div class="form-actions full"><button type="submit" class="primary">Create account</button></div>
      </form>
    </section>
    <section class="stu-card account-list-card">
      <div class="account-list-head">
        <div><h2>Created accounts</h2><p class="muted small">Accounts saved in this browser</p></div>
        <span class="account-count">${accounts.length} total</span>
      </div>
      <div class="att-scroll">
        <table class="stu-table account-table">
          <thead><tr><th>Role</th><th>Account ID</th><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${accounts.length ? accounts.map(user => `
            <tr>
              <td><span class="account-role-badge">${user.role === "teacher" ? "Teacher" : "Student"}</span></td>
              <td>${escapeHTML(accountIdOf(user))}</td>
              <td><strong>${escapeHTML(fullName(user))}</strong></td>
              <td>${escapeHTML(user.recoveryEmail || "—")}</td>
              <td><span class="teacher-status${user.active === false ? " is-inactive" : ""}">${user.active === false ? "Inactive" : "Active"}</span></td>
              <td><button type="button" class="secondary account-edit-btn" data-action="edit-account" data-role="${escapeHTML(user.role)}" data-id="${escapeHTML(accountIdOf(user))}">Edit</button></td>
            </tr>`).join("") : '<tr><td colspan="6" class="att-empty">No student or teacher accounts yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  </div>`;
}

function openEditAccount(role, id) {
  const account = getUsers().find(user => user.role === role && accountIdOf(user) === id);
  if (!account) {
    notify("That account could not be found.");
    return;
  }
  const teacher = role === "teacher";
  openModal(`Edit ${teacher ? "Teacher" : "Student"} Account`, `
    <form id="account-edit-form" class="stu-form" data-role="${escapeHTML(role)}" data-original-id="${escapeHTML(id)}" novalidate>
      <div><label for="edit-account-id">${teacher ? "Teacher ID" : "Student Number"}</label><input id="edit-account-id" value="${escapeHTML(accountIdOf(account))}" required autocomplete="off"></div>
      <div><label for="edit-account-email">Recovery email</label><input id="edit-account-email" type="email" value="${escapeHTML(account.recoveryEmail || "")}" autocomplete="email"></div>
      <div><label for="edit-account-first">First name</label><input id="edit-account-first" value="${escapeHTML(account.firstName || "")}" required autocomplete="given-name"></div>
      <div><label for="edit-account-last">Last name</label><input id="edit-account-last" value="${escapeHTML(account.lastName || "")}" required autocomplete="family-name"></div>
      ${teacher ? `
        <div class="full"><label for="edit-account-subjects">Subjects</label><input id="edit-account-subjects" value="${escapeHTML(Array.isArray(account.subjects) ? account.subjects.join(", ") : "")}" autocomplete="off"></div>
      ` : `
        <div><label for="edit-account-grade">Grade</label><select id="edit-account-grade">${[7, 8, 9, 10, 11, 12].map(grade => `<option${account.grade === `Grade ${grade}` ? " selected" : ""}>Grade ${grade}</option>`).join("")}</select></div>
        <div><label for="edit-account-section">Section</label><input id="edit-account-section" value="${escapeHTML(account.section || "")}" required autocomplete="off"></div>
        <div><label for="edit-account-guardian">Guardian name</label><input id="edit-account-guardian" value="${escapeHTML(account.guardianName || "")}" autocomplete="name"></div>
        <div><label for="edit-account-contact">Contact number</label><input id="edit-account-contact" type="tel" value="${escapeHTML(account.contactNumber || "")}" autocomplete="tel"></div>
        <div class="full"><label for="edit-account-address">Address</label><textarea id="edit-account-address" rows="2" autocomplete="street-address">${escapeHTML(account.address || "")}</textarea></div>
        <div><label for="edit-account-gender">Gender</label><select id="edit-account-gender"><option${account.gender === "Female" ? " selected" : ""}>Female</option><option${account.gender === "Male" ? " selected" : ""}>Male</option></select></div>
      `}
      <div><label for="edit-account-shift">Shift</label><select id="edit-account-shift">${["Morning", "Afternoon", "Evening"].map(shift => `<option${account.shift === shift ? " selected" : ""}>${shift}</option>`).join("")}</select></div>
      <div><label for="edit-account-status">Status</label><select id="edit-account-status"><option value="active"${account.active !== false ? " selected" : ""}>Active</option><option value="inactive"${account.active === false ? " selected" : ""}>Inactive</option></select></div>
      <p id="account-edit-error" class="error full" role="alert" hidden></p>
      <div class="form-actions full"><button type="button" class="secondary" data-ov="close">Cancel</button><button type="submit" class="primary">Save changes</button></div>
    </form>`);
}

function submitAccountEdit(event) {
  event.preventDefault();
  const form = event.target;
  const role = form.dataset.role;
  const oldId = form.dataset.originalId;
  const accountId = $("#edit-account-id").value.trim();
  const firstName = $("#edit-account-first").value.trim();
  const lastName = $("#edit-account-last").value.trim();
  const email = $("#edit-account-email").value.trim().toLowerCase();
  const section = role === "student" ? $("#edit-account-section").value.trim() : "";
  const error = $("#account-edit-error");
  const fail = message => {
    error.textContent = message;
    error.hidden = false;
  };
  if (!accountId || !firstName || !lastName || (role === "student" && !section)) {
    return fail("Fill in the account ID, first name, last name, and student section.");
  }
  if (email && !$("#edit-account-email").checkValidity()) return fail("Enter a valid recovery email address.");

  const users = getUsers();
  const account = users.find(user => user.role === role && accountIdOf(user) === oldId);
  if (!account) return fail("This account is no longer available. Close this form and try again.");
  if (users.some(user => user !== account && user.role === role && accountIdOf(user).trim().toLowerCase() === accountId.toLowerCase())) {
    return fail(`A ${role} account with that ID already exists.`);
  }

  account.id = accountId;
  if (account.username) account.username = accountId;
  if (role === "teacher") {
    account.teacherId = accountId;
    account.subjects = $("#edit-account-subjects").value.split(",").map(subject => subject.trim()).filter(Boolean);
  } else {
    account.studentNo = accountId;
    account.grade = $("#edit-account-grade").value;
    account.section = section;
    account.guardianName = $("#edit-account-guardian").value.trim();
    account.contactNumber = $("#edit-account-contact").value.trim();
    account.address = $("#edit-account-address").value.trim();
    account.gender = $("#edit-account-gender").value;
  }
  account.firstName = firstName;
  account.lastName = lastName;
  account.recoveryEmail = email;
  account.shift = $("#edit-account-shift").value;
  account.active = $("#edit-account-status").value === "active";
  saveUsers(users);
  closeOverlays();
  goToPage("accounts");
  notify(`${fullName(account)}'s account details were updated.`);
}

function updateAccountForm() {
  const role = $("#account-role")?.value === "teacher" ? "teacher" : "student";
  const teacher = role === "teacher";
  const label = $("#account-id-label");
  const idInput = $("#account-id");
  if (label) label.textContent = teacher ? "Teacher ID" : "Student Number";
  if (idInput) {
    idInput.placeholder = teacher ? "e.g. TCH-002" : "Enter student number";
    idInput.inputMode = teacher ? "text" : "numeric";
  }
  $$(".account-student-fields").forEach(field => { field.hidden = teacher; });
  $$(".account-teacher-fields").forEach(field => { field.hidden = !teacher; });
}

function submitAccountCreation(event) {
  event.preventDefault();
  const role = $("#account-role").value;
  const id = $("#account-id").value.trim();
  const firstName = $("#account-first").value.trim();
  const lastName = $("#account-last").value.trim();
  const email = $("#account-email").value.trim().toLowerCase();
  const password = $("#account-password").value;
  const section = $("#account-section").value.trim();
  const error = $("#account-create-error");
  const fail = message => {
    error.textContent = message;
    error.hidden = false;
  };

  if (!id || !firstName || !lastName || !password) {
    return fail("Enter an account ID, first name, last name, and temporary password.");
  }
  if (role === "student" && !section) return fail("Enter the student's section.");
  if (email && !$("#account-email").checkValidity()) return fail("Enter a valid recovery email address.");
  if (password.length < 4) return fail("Use a temporary password with at least 4 characters.");

  const users = getUsers();
  if (users.some(user => user.role === role && accountIdOf(user).trim().toLowerCase() === id.toLowerCase())) {
    return fail(`A ${role} account with that ID already exists.`);
  }

  const account = {
    id,
    role,
    firstName,
    lastName,
    password,
    recoveryEmail: email,
    shift: $("#account-shift").value,
    mustChangePassword: true,
    active: true
  };
  if (role === "teacher") {
    account.teacherId = id;
    account.subjects = $("#account-subjects").value.split(",").map(subject => subject.trim()).filter(Boolean);
  } else {
    account.studentNo = id;
    account.grade = $("#account-grade").value;
    account.section = section;
    account.guardianName = $("#account-guardian").value.trim();
    account.contactNumber = $("#account-contact").value.trim();
    account.address = $("#account-address").value.trim();
    account.gender = $("#account-gender").value;
    account.middleName = "";
  }

  users.push(account);
  saveUsers(users);
  goToPage("accounts");
  notify(`${fullName(account)}'s ${role} account was created. They can now sign in with their ${role === "teacher" ? "Teacher ID" : "Student Number"} and temporary password.`);
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

function openTeacherQR(id) {
  const teacher = allTeachers().find(item => String(item.teacherId || item.id || "") === String(id));
  if (!teacher) {
    notify("That teacher account could not be found.");
    return;
  }
  const teacherId = String(teacher.teacherId || teacher.id || "");
  const payload = `teacher:${teacherId}`;
  openModal(`${fullName(teacher)} — Attendance QR`, `
    <div class="qr-modal"><div id="modal-qr" class="modal-qr" role="img" aria-label="Attendance QR code for ${escapeHTML(fullName(teacher))}"></div>
    <p class="qr-number"><span>Teacher ID</span><strong>${escapeHTML(teacherId)}</strong></p>
    <p class="muted small">Scan with the admin attendance scanner. This QR identifies the teacher; it does not sign in to their account.</p></div>`);
  drawQR($("#modal-qr"), payload, 220);
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
      <div><label for="af-guardian">Guardian name</label><input id="af-guardian" autocomplete="name"></div>
      <div><label for="af-contact">Contact number</label><input id="af-contact" type="tel" autocomplete="tel"></div>
      <div class="full"><label for="af-address">Address</label><textarea id="af-address" rows="2" autocomplete="street-address"></textarea></div>
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
    guardianName: val("af-guardian"), contactNumber: val("af-contact"), address: val("af-address"),
    shift: "Morning", password: data.password, recoveryEmail: "",
    mustChangePassword: true, active: true
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
  if (target.id === "account-role") updateAccountForm();
  else if (target.id === "profile-photo-input") handlePhotoFile(target);
  else if (target.matches && target.matches("[data-admin-record-filter]")) refreshAdminDashboardTable();
  else if (target.matches && target.matches("[data-att-filter]")) renderAttendanceRows();
  else if (target.matches && target.matches("[data-sch-filter]")) renderScheduleRows();
  else if (target.matches && target.matches("[data-teacher-sch-filter]")) renderTeacherScheduleRows();
  else if (target.id === "teacher-student-section") refreshTeacherStudents();
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
    ["students", "♙", "Students"], ["teachers", "♧", "Teachers"], ["accounts", "♙", "Accounts"],
    ["attendance", "▤", "Attendance Records"]
  ],
  teacher: [
    ["teacher-attendance", "▤", "My Attendance"], ["teacher-profile", "♙", "My Profile"],
    ["teacher-id", "▦", "ID"],
    ["teacher-schedule", "▦", "My Schedule"], ["teacher-students", "♧", "My Students"]
  ],
  student: [
    ["student-home", "⌂", "Dashboard"], ["student-attendance", "▥", "Attendance Record"], ["student-qr", "▦", "ID"],
    ["student-profile", "♙", "My Profile"], ["student-schedule", "▤", "My Schedule"],
    ["student-calendar", "▦", "Calendar"]
  ]
};

function renderShell() {
  const app = $("#app");
  if (app) app.dataset.role = currentUser.role;
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
  if ($("#required-password-modal")) {
    notify("Change your temporary password before continuing.");
    return;
  }
  if (!(navigation[currentUser.role] || []).some(item => item[0] === page)) {
    notify("You don't have permission to open that page.");
    return;
  }

  stopScanner();
  stopCarousel();
  closeOverlays();
  currentPage = page;
  writeLoginSession({
    role: currentUser.role,
    accountId: accountIdOf(currentUser),
    page
  });
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
    students: "renderStudents", teachers: "renderTeachers", accounts: "renderAccounts", attendance: "renderAttendance", reports: "renderReports",
    "teacher-attendance": "renderTeacherAttendance", "teacher-profile": "renderTeacherProfile", "teacher-id": "renderTeacherID",
    "teacher-schedule": "renderTeacherSchedule", "teacher-students": "renderTeacherStudents",
    "student-home": "renderStudentHome", "student-qr": "renderStudentQR", "student-profile": "renderStudentProfile",
    "student-schedule": "renderStudentSchedule", "student-attendance": "renderStudentAttendance",
    "student-calendar": "renderFullCalendar"
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
  if (page === "students" || page === "teachers") drawRowQRs();

  if (page === "student-qr" && typeof renderStudentQRCode === "function") {
    renderStudentQRCode();
  }
  if (page === "teacher-id") renderTeacherQRCode();
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
  $("#page-content")?.addEventListener("keydown", event => {
    const card = event.target.closest(".student-id-card");
    if (!card || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    flipStudentID(card);
  });
  $("#page-content")?.addEventListener("submit", event => {
    if (event.target.id !== "scanner-manual-form") return;
    event.preventDefault();
    recordScannedIdentity($("#scanner-student-id").value);
    event.target.reset();
  });
  $("#page-content")?.addEventListener("change", handlePageChange);
  $("#page-content")?.addEventListener("input", event => {
    if (event.target.id === "stu-search") { stuState.search = event.target.value; stuState.page = 1; refreshStudents(); }
    if (event.target.id === "teacher-search") { teacherSearch = event.target.value; refreshTeachers(); }
    if (event.target.id === "admin-record-search") refreshAdminDashboardTable();
    if (event.target.id === "teacher-student-search") refreshTeacherStudents();
  });
  document.addEventListener("click", handleOverlayClick);
  document.addEventListener("submit", event => {
    if (event.target.id === "stu-add-form") submitAddStudent(event);
    else if (event.target.id === "teacher-add-form") submitAddTeacher(event);
    else if (event.target.id === "account-create-form") submitAccountCreation(event);
    else if (event.target.id === "account-edit-form") submitAccountEdit(event);
    else if (event.target.id === "required-password-form") submitRequiredPasswordChange(event);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if ($("#required-password-modal")) {
      event.preventDefault();
      notify("Change your temporary password before continuing.");
      return;
    }
    closeOverlays();
  });
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

  const session = readLoginSession();
  if (session && typeof session.role === "string" && typeof session.accountId === "string") {
    const user = getUsers().find(account =>
      account.role === session.role
      && accountIdOf(account) === session.accountId
      && account.active !== false
    );
    if (user) {
      currentUser = user;
      currentRole = user.role;
      chooseRole(user.role);
      openApplication(session.page);
      if (user.mustChangePassword) openRequiredPasswordChange();
    } else {
      writeLoginSession(null);
    }
  }
});