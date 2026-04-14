import { db, collection, addDoc, getDocs, updateDoc, doc } from "./firebase.js";
import { EMAILJS_CONFIG, REMINDER_RECIPIENTS } from "./emailjs-config.js";


// 🔐 PROTECCIÓN SIMPLE
const user = localStorage.getItem("user");

if (!user) {
  window.location.href = "login.html";
}

// 🔐 EMAIL JS CONFIG

if (window.emailjs) {
  window.emailjs.init({
    publicKey: EMAILJS_CONFIG.PUBLIC_KEY
  })
}


document.addEventListener("DOMContentLoaded", () => {

  const calendarEl = document.getElementById("calendar");
  const form = document.getElementById("eventForm");
  const notifyBtn = document.getElementById("notifyBtn");
  const eventList = document.getElementById("eventList");
  const logOutbtn = document.getElementById("logoutBtn");

  const filterToolbar = document.getElementById("filterPersonToolbar");

  let editingEventId = null;
  let reminderTimeouts = new Map();

  const colors = {
    School: "#43a047",
    Efrey: "#fb8c00",
    Paola: "#d81b60",
    Family: "#3949ab",
    Church: "#8e24aa",
    BYU: "#1565c0",
    Task: "#6d4c41"
  };

  // ============================
  // CALENDAR
  // ============================
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: window.innerWidth < 700 ? "timeGridDay" : "dayGridMonth",
    editable: false,
    selectable: true,
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek,listDay"
    },

    views: {
      dayGridMonth: { buttonText: "Month" },
      timeGridWeek: { buttonText: "Week" },
      listWeek: { buttonText: "List" },
      listDay: { buttonText: "Day" },
    },

    events: [],

    // 👉 CLICK DAY (CREATE)
    dateClick(info) {
      editingEventId = null;

      form.title.value = "";
      form.start.value = info.dateStr + "T09:00";
      form.end.value = info.dateStr + "T10:00";
      form.person.value = "";
      form.location.value = "";
      form.description.value = "";
      form.reminder.value = "0";
      form.allDay.checked = false;

      document.querySelector(".btn-primary").textContent = "Save Event";

      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    // 👉 CLICK EVENT (EDIT)
    eventClick(info) {
      const event = info.event;
      editingEventId = event.id;

      form.title.value = event.title;
      form.start.value = formatForInput(event.start);
      form.end.value = formatForInput(event.end);
      form.person.value = event.extendedProps.person;
      form.location.value = event.extendedProps.location || "";
      form.description.value = event.extendedProps.description || "";
      form.reminder.value = event.extendedProps.reminder || "0";
      form.allDay.checked = event.extendedProps.allDay || false;

      document.querySelector(".btn-primary").textContent = "Update Event";

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  calendar.render();


  logOutbtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });

  // ============================
  // LOAD EVENTS (FIREBASE)
  // ============================
  async function loadEventsFromFirestore() {
    clearAllReminderTimeouts();
    calendar.removeAllEvents();
    eventList.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "events"));

    querySnapshot.forEach((docSnap) => {
      const event = docSnap.data();

      calendar.addEvent({
        id: docSnap.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay || false,
        backgroundColor: colors[event.person] || "#3788d8",
        borderColor: colors[event.person] || "#3788d8",
        extendedProps: {
          person: event.person,
          reminder: String(event.reminder || "0"),
          location: event.location || "",
          description: event.description || "",
          allDay: event.allDay || false,
          reminderSentAt: event.reminderSentAt || null,
        }
      });
    });

    renderEventList();
    applyFilter();
    scheduleAllReminders();
  }

  // ============================
  // RENDER LIST
  // ============================
  function renderEventList() {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfDayAfterTomorrow = new Date(startOfToday);
    startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 2);

    const events = calendar.getEvents();

    const todayEvents = events
      .filter(event => {
        if (!event.start) return false;
        const d = new Date(event.start);
        return d >= startOfToday && d < startOfTomorrow;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const tomorrowEvents = events
      .filter(event => {
        if (!event.start) return false;
        const d = new Date(event.start);
        return d >= startOfTomorrow && d < startOfDayAfterTomorrow;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    let html = "";

    // 👉 TODAY
    html += `<h3 style="margin-top:0;">Today</h3>`;

    if (todayEvents.length === 0) {
      html += `<p>No events today.</p>`;
    } else {
      html += todayEvents.map(event => `
      <div class="event-card">
        <h3>${event.title}</h3>
        <p><strong>Category:</strong> ${event.extendedProps.person || "-"}</p>
        <p><strong>Start:</strong> ${formatDate(event.start)}</p>
        <p><strong>End:</strong> ${formatDate(event.end)}</p>
      </div>
    `).join("");
    }

    // 👉 TOMORROW
    html += `<h3 style="margin-top:1.5rem;">Tomorrow</h3>`;

    if (tomorrowEvents.length === 0) {
      html += `<p>No events tomorrow.</p>`;
    } else {
      html += tomorrowEvents.map(event => `
      <div class="event-card">
        <h3>${event.title}</h3>
        <p><strong>Category:</strong> ${event.extendedProps.person || "-"}</p>
        <p><strong>Start:</strong> ${formatDate(event.start)}</p>
        <p><strong>End:</strong> ${formatDate(event.end)}</p>
      </div>
    `).join("");
    }

    eventList.innerHTML = html;
  }

  // ============================
  // SAVE / UPDATE EVENT
  // ============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventData = {
      title: form.title.value.trim(),
      person: form.person.value,
      start: form.start.value,
      end: form.end.value,
      location: form.location.value.trim(),
      reminder: form.reminder.value,
      description: form.description.value.trim(),
      allDay: form.allDay.checked
    };

    if (!eventData.title || !eventData.start || !eventData.end) {
      alert("Please complete title, start, and end.");
      return;
    }

    if (!eventData.person || eventData.person === "Select") {
      alert("Please choose a category/person.");
      return;
    }

    if (new Date(eventData.end) < new Date(eventData.start)) {
      alert("End date cannot be earlier than start date.");
      return;
    }

    try {
      if (editingEventId) {
        await updateDoc(doc(db, "events", editingEventId), eventData);
        editingEventId = null;
      } else {
        await addDoc(collection(db, "events"), eventData);
      }

      form.reset();
      form.person.value = "";
      form.reminder.value = "0";
      form.allDay.checked = false;
      document.querySelector(".btn-primary").textContent = "Save Event";
      await loadEventsFromFirestore();
    } catch (err) {
      console.error("Error saving event:", err);
      alert("The event could not be saved. Check the browser console.");
    }
  });

  // ============================
  // FILTER
  // ============================
  function applyFilter() {
    const value = filterToolbar.value;

    calendar.getEvents().forEach(event => {
      if (!value || event.extendedProps.person === value) {
        event.setProp("display", "auto");
      } else {
        event.setProp("display", "none");
      }
    });
  }

  filterToolbar.addEventListener("change", applyFilter);

  // ============================
  // NOTIFICATIONS
  // ============================
  notifyBtn.addEventListener("click", async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      alert("Notifications ON");
    }
  });

  // ============================
  // EMAIL REMINDERS
  // ============================
  function scheduleAllReminders() {
    const events = calendar.getEvents();
    events.forEach((event) => {
      scheduleReminderForEvent(event);
    });
  }

  function scheduleReminderForEvent(event) {
    const reminderMinutes = Number(event.extendedProps.reminder || 0);

    if (!reminderMinutes || reminderMinutes <= 0) return;
    if (event.extendedProps.reminderSentAt) return;

    const reminderDate = getReminderDate(event);
    if (!reminderDate) return;

    const now = Date.now();
    const eventStart = new Date(event.start).getTime();

    // si ya pasó el momento del recordatorio pero el evento todavía no empezó,
    // se manda al abrir la app
    if (now >= reminderDate.getTime() && now < eventStart) {
      sendReminderEmail(event);
      return;
    }

    const delay = reminderDate.getTime() - now;

    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        sendReminderEmail(event);
      }, delay);

      reminderTimeouts.set(event.id, timeoutId);
    }
  }

  async function sendReminderEmail(event) {
    if (!window.emailjs) {
      console.error("EmailJS not loaded.");
      return;
    }

    if (!EMAILJS_CONFIG.PUBLIC_KEY || !EMAILJS_CONFIG.SERVICE_ID || !EMAILJS_CONFIG.TEMPLATE_ID) {
      console.error("EmailJS config incomplete.");
      return;
    }

    if (event.extendedProps.reminderSentAt) return;

    try {
      const templateParams = {
        to_email: REMINDER_RECIPIENTS.join(", "),
        event_title: event.title || "",
        category: event.extendedProps.person || "",
        start_date: formatDate(event.start),
        end_date: formatDate(event.end),
        location: event.extendedProps.location || "No location",
        description: event.extendedProps.description || "No description",
        reminder_minutes: event.extendedProps.reminder || "0",
        app_name: "Family Productivity System"
      };

      await window.emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );

      const sentAt = new Date().toISOString();

      await updateDoc(doc(db, "events", event.id), {
        reminderSentAt: sentAt
      });

      event.setExtendedProp("reminderSentAt", sentAt);

      if (Notification.permission === "granted") {
        new Notification("Reminder sent by email", {
          body: event.title
        });
      }

      console.log("Reminder email sent:", event.title);
    } catch (error) {
      console.error("Email reminder error:", error);
    }
  }

  function clearAllReminderTimeouts() {
    reminderTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    reminderTimeouts.clear();
  }

  function getReminderDate(event) {
    if (!event.start) return null;

    const reminderMinutes = Number(event.extendedProps.reminder || 0);
    if (!reminderMinutes || reminderMinutes <= 0) return null;

    const eventStart = new Date(event.start).getTime();
    return new Date(eventStart - reminderMinutes * 60 * 1000);
  }

  // ============================
  // HELPERS
  // ============================
  function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  }

  function formatForInput(date) {
    if (!date) return "";

    const local = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");

    const year = local.getFullYear();
    const month = pad(local.getMonth() + 1);
    const day = pad(local.getDate());
    const hours = pad(local.getHours());
    const minutes = pad(local.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // ============================
  // INIT
  // ============================
  loadEventsFromFirestore().catch(err => {
    console.error("Firestore error:", err);
  });

});

// ============================
// 🌎 LANGUAGE SYSTEM traduccion
// ============================

const langToggle = document.getElementById("langToggle");

let currentLang = localStorage.getItem("lang") || "en";

const translations = {
  en: {
    mainTitle: "Guzman-Torresi Family Productivity System",
    addEvent: "Add Event / Task",
    title: "Title",
    category: "Category / Person",
    start: "Start",
    end: "End",
    location: "Location",
    reminder: "Reminder",
    description: "Description",
    saveBtn: "Save Event",
    updateBtn: "Update Event",
    notifications: "Enable Notifications",
    subtitle: "Family calendar, school schedule, church activities, tasks, reminders and study planning.",
    upcoming: "Upcoming Events",
    min1: "1 minute before(test)"
  },
  es: {
    mainTitle: "Guzman-Torresi Sistema de Productividad Familiar",
    addEvent: "Agregar Evento / Tarea",
    title: "Título",
    category: "Categoría / Persona",
    start: "Inicio",
    end: "Fin",
    location: "Ubicación",
    reminder: "Recordatorio",
    description: "Descripción",
    saveBtn: "Guardar Evento",
    updateBtn: "Actualizar Evento",
    notifications: "Activar Notificaciones",
    subtitle: "Calendario familiar, escuela, iglesia, tareas y planificación.",
    upcoming: "Próximos Eventos",
    min1: "1 minuto antes(prueba)"
  }
};

// 👉 APPLY LANGUAGE
function applyLanguage(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // botón save/update dinámico
  const btn = document.querySelector(".btn-primary");
  if (btn.textContent.includes("Update") || btn.textContent.includes("Actualizar")) {
    btn.textContent = translations[lang].updateBtn;
  } else {
    btn.textContent = translations[lang].saveBtn;
  }

  langToggle.textContent = lang === "en" ? "ES" : "EN";
  localStorage.setItem("lang", lang);
}

// 👉 TOGGLE
langToggle.addEventListener("click", () => {
  currentLang = currentLang === "en" ? "es" : "en";
  applyLanguage(currentLang);
});

// 👉 INIT
applyLanguage(currentLang);




