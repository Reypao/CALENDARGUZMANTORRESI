import { db, collection, addDoc, getDocs } from "./firebase.js";

// 🔐 PROTECCIÓN SIMPLE
const user = localStorage.getItem("user");

if (!user) {
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {

  const calendarEl = document.getElementById("calendar");
  const form = document.getElementById("eventForm");
  const notifyBtn = document.getElementById("notifyBtn");
  const eventList = document.getElementById("eventList");

  const filterToolbar = document.getElementById("filterPersonToolbar");

  let editingEventId = null;

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
      right: "dayGridMonth,timeGridWeek,listWeek"
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

  // ============================
  // LOAD EVENTS (FIREBASE)
  // ============================
  async function loadEventsFromFirestore() {
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
        backgroundColor: colors[event.person] || "#3788d8",
        extendedProps: {
          person: event.person,
          reminder: event.reminder || "0",
          location: event.location || "",
          description: event.description || "",
          allDay: event.allDay || false
        }
      });
    });

    renderEventList();
    applyFilter();

    // fallback si no hay eventos
    if (calendar.getEvents().length === 0) {
      calendar.addEvent({
        title: "No events yet",
        start: new Date()
      });
    }
  }

  // ============================
  // RENDER LIST
  // ============================
  function renderEventList() {
    const events = calendar.getEvents().sort((a, b) => {
      return new Date(a.start) - new Date(b.start);
    });

    if (events.length === 0) {
      eventList.innerHTML = "<p>No events saved yet.</p>";
      return;
    }

    eventList.innerHTML = events.map(event => `
      <div class="event-card">
        <h3>${event.title}</h3>
        <p><strong>Category:</strong> ${event.extendedProps.person || "-"}</p>
        <p><strong>Start:</strong> ${formatDate(event.start)}</p>
        <p><strong>End:</strong> ${formatDate(event.end)}</p>
      </div>
    `).join("");
  }

  // ============================
  // SAVE / UPDATE EVENT
  // ============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventData = {
      title: form.title.value,
      person: form.person.value,
      start: form.start.value,
      end: form.end.value,
      location: form.location.value,
      reminder: form.reminder.value,
      description: form.description.value,
      allDay: form.allDay.checked
    };

    // 👉 UPDATE
    if (editingEventId) {
      const event = calendar.getEventById(editingEventId);

      event.setProp("title", eventData.title);
      event.setStart(eventData.start);
      event.setEnd(eventData.end);
      event.setExtendedProp("person", eventData.person);
      event.setExtendedProp("location", eventData.location);
      event.setExtendedProp("description", eventData.description);
      event.setExtendedProp("reminder", eventData.reminder);

      editingEventId = null;

    } else {
      // 👉 CREATE
      await addDoc(collection(db, "events"), eventData);
    }

    form.reset();
    document.querySelector(".btn-primary").textContent = "Save Event";

    loadEventsFromFirestore().catch(err => {
      console.error("Firestore error:", err);
    });
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
  // HELPERS
  // ============================
  function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  }

  function formatForInput(date) {
    if (!date) return "";
    return new Date(date).toISOString().slice(0,16);
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
    mainTitle:"Guzman-Torresi Family Productivity System",
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
    upcoming: "Upcoming Events"
  },
  es: {
    mainTitle:"Guzman-Torresi Sistema de Productividad Familiar",
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
    upcoming: "Próximos Eventos"
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

 