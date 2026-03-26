document.addEventListener("DOMContentLoaded", () => {

  const calendarEl = document.getElementById("calendar");
  const form = document.getElementById("eventForm");
  const notifyBtn = document.getElementById("notifyBtn");
  const filterSelect = document.getElementById("filterPerson");

  const STORAGE_KEY = "familyCalendarPRO";

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
  // DEFAULT EVENTS (RECURRING)
  // ============================
  const defaultEvents = [
    {
      title: "Triplets School",
      daysOfWeek: [1,2,3,4,5],
      startTime: "08:35",
      endTime: "15:15",
      backgroundColor: colors.School,
      extendedProps: { person: "School", reminder: "30" }
    },
    {
      title: "Efrey Work",
      daysOfWeek: [1,2,3,4,5],
      startTime: "08:00",
      endTime: "17:00",
      backgroundColor: colors.Efrey,
      extendedProps: { person: "Efrey", reminder: "30" }
    },
    {
      title: "Paola Work (Canyons District)",
      daysOfWeek: [1,2,3,4,5],
      startTime: "10:00",
      endTime: "14:00",
      backgroundColor: colors.Paola,
      extendedProps: { person: "Paola", reminder: "30" }
    },
    {
      title: "Pick Up Girls",
      daysOfWeek: [1,2,3,4,5],
      startTime: "15:15",
      endTime: "15:45",
      backgroundColor: colors.Family,
      extendedProps: { person: "Family", reminder: "10" }
    },
    {
      title: "LDS Church",
      daysOfWeek: [0],
      startTime: "10:00",
      endTime: "12:00",
      backgroundColor: colors.Church,
      extendedProps: { person: "Church", reminder: "60" }
    },
    {
      title: "BYU Study",
      daysOfWeek: [1,3,5],
      startTime: "19:00",
      endTime: "21:00",
      backgroundColor: colors.BYU,
      extendedProps: { person: "BYU", reminder: "30" }
    }
  ];

  // ============================
  // LOAD STORAGE
  // ============================
  let savedEvents = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  if (savedEvents.length === 0) {
    savedEvents = defaultEvents;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedEvents));
  }

  // ============================
  // CALENDAR
  // ============================
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: window.innerWidth < 700 ? "listWeek" : "dayGridMonth",
    editable: true,
    selectable: true,
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek"
    },

    events: savedEvents,

    eventClick(info) {
      const e = info.event;
      editingEventId = e.id;

      form.title.value = e.title;
      form.start.value = formatForInput(e.start);
      form.end.value = formatForInput(e.end);
      form.person.value = e.extendedProps.person;
      form.reminder.value = e.extendedProps.reminder;

      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    eventDrop: saveAll,
    eventResize: saveAll
  });

  calendar.render();

  // ============================
  // ADD / EDIT EVENT
  // ============================
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {
      title: form.title.value,
      start: form.start.value,
      end: form.end.value,
      person: form.person.value,
      reminder: form.reminder.value
    };

    if (editingEventId) {
      const event = calendar.getEventById(editingEventId);
      event.setProp("title", data.title);
      event.setStart(data.start);
      event.setEnd(data.end);
      event.setExtendedProp("person", data.person);
      event.setExtendedProp("reminder", data.reminder);
      event.setProp("backgroundColor", colors[data.person]);

      editingEventId = null;
    } else {
      calendar.addEvent({
        id: createId(),
        title: data.title,
        start: data.start,
        end: data.end,
        backgroundColor: colors[data.person],
        extendedProps: {
          person: data.person,
          reminder: data.reminder
        }
      });
    }

    saveAll();
    form.reset();
  });

  // ============================
  // FILTER
  // ============================
  filterSelect.addEventListener("change", () => {
    const value = filterSelect.value;

    calendar.getEvents().forEach(e => {
      if (!value || e.extendedProps.person === value) {
        e.setProp("display", "auto");
      } else {
        e.setProp("display", "none");
      }
    });
  });

  // ============================
  // NOTIFICATIONS
  // ============================
  notifyBtn.addEventListener("click", async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") alert("Notifications ON");
  });

  function scheduleReminder(event) {
    if (Notification.permission !== "granted") return;

    const minutes = parseInt(event.extendedProps.reminder);
    if (!minutes) return;

    const delay = new Date(event.start) - Date.now() - minutes * 60000;

    if (delay > 0) {
      setTimeout(() => {
        new Notification("Reminder", {
          body: event.title
        });
      }, delay);
    }
  }

  // ============================
  // SAVE
  // ============================
  function saveAll() {
    const events = calendar.getEvents().map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: e.backgroundColor,
      extendedProps: e.extendedProps
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

    events.forEach(scheduleReminder);
  }

  // ============================
  // HELPERS
  // ============================
  function createId() {
    return "id-" + Date.now();
  }

  function formatForInput(date) {
    if (!date) return "";
    return new Date(date).toISOString().slice(0,16);
  }

});