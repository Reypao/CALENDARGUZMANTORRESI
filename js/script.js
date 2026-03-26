import { db, collection, addDoc, getDocs } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const form = document.getElementById("eventForm");
  const notifyBtn = document.getElementById("notifyBtn");
  const eventList = document.getElementById("eventList");

  const filterForm = document.getElementById("filterPersonForm");
  const filterToolbar = document.getElementById("filterPersonToolbar");

  const colors = {
    School: "#43a047",
    Efrey: "#fb8c00",
    Paola: "#d81b60",
    Family: "#3949ab",
    Church: "#8e24aa",
    BYU: "#1565c0",
    Task: "#6d4c41"
  };

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: window.innerWidth < 700 ? "listWeek" : "dayGridMonth",
    editable: false,
    selectable: false,
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek"
    },

    events: []
  });

  calendar.render();

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
    applyCurrentFilter();
  }

  function renderEventList() {
    const events = calendar.getEvents().sort((a, b) => {
      return new Date(a.start) - new Date(b.start);
    });

    if (events.length === 0) {
      eventList.innerHTML = "<p>No events saved yet.</p>";
      return;
    }

    eventList.innerHTML = events.map(event => {
      return `
        <div class="event-card">
          <h3>${event.title}</h3>
          <p><strong>Category:</strong> ${event.extendedProps.person || "-"}</p>
          <p><strong>Start:</strong> ${formatDate(event.start)}</p>
          <p><strong>End:</strong> ${formatDate(event.end)}</p>
        </div>
      `;
    }).join("");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newEvent = {
      title: form.title.value,
      person: form.person.value,
      start: form.start.value,
      end: form.end.value,
      location: form.location.value,
      reminder: form.reminder.value,
      description: form.description.value,
      allDay: form.allDay.checked
    };

    await addDoc(collection(db, "events"), newEvent);

    form.reset();
    await loadEventsFromFirestore();
    alert("Evento guardado en Firestore");
  });

  function applyCurrentFilter() {
    const value = filterToolbar.value || filterForm.value || "";

    calendar.getEvents().forEach(event => {
      if (!value || event.extendedProps.person === value) {
        event.setProp("display", "auto");
      } else {
        event.setProp("display", "none");
      }
    });
  }

  filterToolbar.addEventListener("change", () => {
    filterForm.value = filterToolbar.value;
    applyCurrentFilter();
  });

  filterForm.addEventListener("change", () => {
    filterToolbar.value = filterForm.value;
    applyCurrentFilter();
  });

  notifyBtn.addEventListener("click", async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      alert("Notifications ON");
    }
  });

  function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  }

  await loadEventsFromFirestore();
});