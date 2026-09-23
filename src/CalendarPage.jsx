import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "./firebase";
import { signOut } from "firebase/auth";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { useAuthState } from "react-firebase-hooks/auth";

import "react-big-calendar/lib/css/react-big-calendar.css";

export const formatLocalDate = (date) =>
  format(date, "yyyy-MM-dd");

export const formatLocalTime = (date) =>
  format(date, "HH:mm");

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr) return new Date();

  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "00:00").split(":").map(Number);

  return new Date(y, m - 1, d, hh, mm);
};

export default function CalendarPage() {

  const [user, loading] = useAuthState(auth);
  const [events, setEvents] = useState([]);
  const [copied, setCopied] = useState("");
  const navigate = useNavigate();

const isAdmin = !!user;

const copyToClipboard = async (text, field) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(field);

    setTimeout(() => {
      setCopied("");
    }, 2000);
  } catch (error) {
    console.error("Failed to copy:", error);
    alert("Unable to copy. Please copy it manually.");
  }
};

useEffect(() => {

  const eventsRef = collection(db, "appointments");

  const unsub = onSnapshot(eventsRef, (snapshot) => {

    const data = snapshot.docs.map((doc) => {

      const d = doc.data();

      const start = buildDateTime(
        d.apt_date,
        d.apt_time
      );

      const duration = d.duration || 30;

      const end = new Date(
        start.getTime() + duration * 60000
      );

      return {
        id: doc.id,
        title: d.deleted
          ? `[CANCELLED] ${d.purpose || "BOOKED"}`
          : `${d.purpose || "BOOKED"} - BOOKED`,
        start,
        end,
        raw: d,
        deleted: d.deleted ?? false,
      };

    });

    setEvents(data);

  });

  return () => unsub();

}, []);


if (loading) {
  return <p>Loading...</p>;
}


const eventPropGetter = (event) => {
    if (event.deleted) {
      return {
        style: {
          textDecoration: "line-through",
          opacity: 0.5,
          backgroundColor: "#999",
        },
      };
    }

    return {};
  };

const handleSelectSlot = (slotInfo) => {
  const selectedDate = new Date(slotInfo.start);

  const today = new Date();

  const selectedYmd = format(selectedDate, "yyyy-MM-dd");
  const todayYmd = format(today, "yyyy-MM-dd");

  if (selectedYmd < todayYmd) {
    return;
  }

  const apt_date = format(selectedDate, "yyyy-MM-dd");
  const apt_time = format(selectedDate, "HH:mm");

  navigate(
    `/appointment/new?date=${apt_date}&time=${apt_time}`
  );
};

const handleSelectEvent = (event) => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate < today) {
        alert("Past appointments cannot be edited.");
        return;
    }

    if (isAdmin && event.deleted) {
        navigate(`/cancelled/${event.id}`);
        return;
    }

    if (isAdmin) {
        navigate(`/appointment/${event.id}`);
        return;
    }

    navigate(`/booking/${event.id}`);
};

const dayPropGetter = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cellDate = new Date(date);
  cellDate.setHours(0, 0, 0, 0);

  if (cellDate < today) {
    return {
      style: {
        backgroundColor: "#f3f3f3",
        color: "#999",
      },
    };
  }

  return {};
};

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "10px",
  }}
>
  <h2>📅 Appointments (දානය) Calendar</h2>

  {isAdmin ? (
    <button
onClick={async () => {
    await signOut(auth);
    navigate("/");
}}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        background: "#c62828",
        color: "white",
        border: "none",
        borderRadius: "6px",
      }}
    >
      Logout Admin
    </button>
  ) : (
    <button
      onClick={() => navigate("/admin-login")}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        background: "#2e7d32",
        color: "white",
        border: "none",
        borderRadius: "6px",
      }}
    >
      Admin Login
    </button>
  )}
</div>

<div
  style={{
    margin: "10px",
    padding: "15px",
    background: "#fff8e8",
    border: "1px solid #e0c97f",
    borderRadius: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  }}
>
  <h3 style={{ marginTop: 0 }}>
    📝 Booking Instructions
  </h3>

  <ul style={{ marginBottom: 0 }}>
    <li>On Mobile phones long press on an empty cell to start adding a new appointment. If there are other appointments and you need to add another long press on empty part of the cell.</li>
    <li>Select an available future date on the calendar.</li>
    <li>Choose the appropriate meal offering type.</li>
    <li>Complete all required fields in the booking form.</li>
    <li>Only one booking is allowed per meal slot per day.</li>
    <li>Click an existing booking to view it. To change/cancel existing booking please contact us.</li>
    <li>Past appointments cannot be modified.</li>
    <li>If you still have problems/questions please contact us.</li>
    <li>If you are inviting our reverend to your home please note somebody from your household need to come along. This is to make sure the relics are receiving the deserved honor.</li>
    <li>The English Dhamma Temple Daily running cost is 295AUD. (Electricity, water, Gas etc). Therefore kindly deposit 295$ when you make an appointment to help us with
        running cost of the temple. </li>
    <li>295AUD can be deposited to our account below</li>
  </ul><br />
<h4 style={{ marginTop: 0 }}>
  Account Name: ENGLISH DHAMMA ORG <br />

  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
    BSB: 013-542

    <button
      onClick={() => copyToClipboard("013-542", "bsb")}
      style={{
        padding: "4px 8px",
        fontSize: "12px",
        cursor: "pointer",
        background: "#2e7d32",
        color: "white",
        border: "none",
        borderRadius: "4px",
      }}
    >
      {copied === "bsb" ? "Copied!" : "Copy"}
    </button>
  </span>

  <br />

  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
    Account Number: 430308072

    <button
      onClick={() => copyToClipboard("430308072", "account")}
      style={{
        padding: "4px 8px",
        fontSize: "12px",
        cursor: "pointer",
        background: "#2e7d32",
        color: "white",
        border: "none",
        borderRadius: "4px",
      }}
    >
      {copied === "account" ? "Copied!" : "Copy"}
    </button>
  </span>

  <br />

  Reference: Donation
</h4>
</div>

<div
  style={{
    height: "800px",
    margin: "10px",
  }}
>

<Calendar
  localizer={localizer}
  events={events}
  startAccessor="start"
  endAccessor="end"
  selectable="ignoreEvents"
  longPressThreshold={250}
  onSelectSlot={handleSelectSlot}
  onSelectEvent={handleSelectEvent}
  dayPropGetter={dayPropGetter}
  eventPropGetter={eventPropGetter}
  style={{ height: "100%" }}
/>
      </div>
    </div>
  );
}
