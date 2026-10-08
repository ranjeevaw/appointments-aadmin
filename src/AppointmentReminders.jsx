import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { collection, getDocs, updateDoc, doc, query, where, serverTimestamp } from "firebase/firestore";

import emailjs from "@emailjs/browser";

import { db } from "./firebase";

const EMAIL_SERVICE_ID = "service_xtf9mt7";

const EMAIL_TEMPLATE_ID = "template_ultwh8g";

const EMAIL_PUBLIC_KEY = "8G68XWPnW2CkhVGMW";

function getMelbourneDateString(date = new Date()) {

  const parts = new Intl.DateTimeFormat("en-AU", {

    timeZone: "Australia/Melbourne",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",

  }).formatToParts(date);

  const values = Object.fromEntries(

    parts.map((part) => [part.type, part.value])

  );

  return `${values.year}-${values.month}-${values.day}`;

}

function addDaysToDateString(dateString, days) {

  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);

}

export default function AppointmentReminders() {

  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState("");

  const [results, setResults] = useState([]);
  const [daysBefore, setDaysBefore] = useState(2);

  const today = useMemo(() => getMelbourneDateString(), []);
  const targetDate = useMemo(
    () => addDaysToDateString(today, daysBefore),
    [today, daysBefore]
  );
  const reminderSentField = `reminderSentForOffset_${daysBefore}`;
  const reminderSentAtField = `reminderSentAtOffset_${daysBefore}`;
  const reminderLabel = daysBefore === 0
    ? "Due today"
    : daysBefore === 1
      ? "Due tomorrow (1 day before)"
      : "Due in 2 days";

  const hasReminderBeenSent = (appointment) =>
    appointment[reminderSentField] === targetDate ||
    (daysBefore === 2 && appointment.reminderSentForDate === targetDate);

  const loadAppointments = async () => {

    setLoading(true);

    setMessage("");

    setResults([]);

    try {

      const q = query(

        collection(db, "appointments"),

        where("apt_date", "==", targetDate)

      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs

        .map((appointmentDoc) => ({

          id: appointmentDoc.id,

          ...appointmentDoc.data(),

        }))

        .filter((appointment) => appointment.deleted !== true)

        .sort((a, b) => (a.apt_time || "").localeCompare(b.apt_time || ""));

      setAppointments(data);

    } catch (error) {

      console.error("Failed to load reminder appointments:", error);

      setMessage("Failed to load appointments. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    loadAppointments();

  }, [targetDate]);

  const pendingAppointments = appointments.filter(

    (appointment) =>

      appointment.email && !hasReminderBeenSent(appointment)

  );

  const alreadySentAppointments = appointments.filter(

    (appointment) => hasReminderBeenSent(appointment)

  );

  const sendReminder = async (appointment) => {

    await emailjs.send(

      EMAIL_SERVICE_ID,

      EMAIL_TEMPLATE_ID,

      {

        action: "Reminded",

        name: appointment.name || "Devotee",

        email: appointment.email,

        purpose: appointment.purpose || "Appointment",

        apt_date: appointment.apt_date || "",

        apt_time: appointment.apt_time || "",

        address: appointment.address || "English Dhamma Temple",

        contact_number: appointment.contact_number || "",

        details: appointment.details || "",

      },

      EMAIL_PUBLIC_KEY

    );

    await updateDoc(doc(db, "appointments", appointment.id), {

      [reminderSentField]: targetDate,
      [reminderSentAtField]: serverTimestamp(),

    });

  };

  const handleSendReminders = async () => {

    if (pendingAppointments.length === 0) {

      setMessage("There are no unsent reminder emails for this date.");

      return;

    }

    const confirmed = window.confirm(

      `Send ${reminderLabel.toLowerCase()} reminder emails to ${pendingAppointments.length} devotee(s) for appointment date ${targetDate}?`

    );

    if (!confirmed) return;

    setSending(true);

    setMessage("");

    setResults([]);

    const sendResults = [];

    for (const appointment of pendingAppointments) {

      try {

        await sendReminder(appointment);

        sendResults.push({

          id: appointment.id,

          name: appointment.name || "Devotee",

          email: appointment.email,

          status: "sent",

        });

      } catch (error) {

        console.error(`Reminder failed for ${appointment.email}:`, error);

        sendResults.push({

          id: appointment.id,

          name: appointment.name || "Devotee",

          email: appointment.email,

          status: "failed",

          error: error?.text || error?.message || "Email failed",

        });

      }

    }

    setResults(sendResults);

    setSending(false);

    await loadAppointments();

  };

  return (

    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>

      <div

        style={{

          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          gap: "12px",

          flexWrap: "wrap",

          marginBottom: "20px",

        }}

      >

        <div>

          <h1 style={{ marginBottom: "6px" }}>📧 Appointment Reminders</h1>

          <div style={{ marginTop: "8px" }}>
            <label htmlFor="reminderTiming" style={{ marginRight: "10px", fontWeight: 600 }}>
              Reminder timing:
            </label>
            <select
              id="reminderTiming"
              value={daysBefore}
              disabled={sending}
              onChange={(event) => setDaysBefore(Number(event.target.value))}
              style={{ padding: "8px", borderRadius: "6px", fontSize: "15px" }}
            >
              <option value={2}>2 days before</option>
              <option value={1}>1 day before</option>
              <option value={0}>On the day</option>
            </select>
          </div>
          <div style={{ marginTop: "8px" }}>
            {reminderLabel}: appointments on <strong>{targetDate}</strong>
          </div>

          <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>

            This date is calculated using Australia/Melbourne time.

          </div>

        </div>

        <button

          onClick={() => navigate("/alms-calendar")}

          disabled={sending}

          style={{

            padding: "9px 14px",

            cursor: sending ? "default" : "pointer",

            background: "#555",

            color: "white",

            border: "none",

            borderRadius: "6px",

          }}

        >

          ← Back to Calendar

        </button>

      </div>

      {message && (

        <div

          style={{

            marginBottom: "15px",

            padding: "12px",

            background: "#fff8e8",

            border: "1px solid #e0c97f",

            borderRadius: "8px",

          }}

        >

          {message}

        </div>

      )}

      {loading ? (

        <p>Loading appointments...</p>

      ) : (

        <>

          <div

            style={{

              display: "flex",

              gap: "12px",

              flexWrap: "wrap",

              marginBottom: "20px",

            }}

          >

            <div style={cardStyle}>

              <strong>{pendingAppointments.length}</strong>

              <span>Reminder(s) to send</span>

            </div>

            <div style={cardStyle}>

              <strong>{alreadySentAppointments.length}</strong>

              <span>Already sent</span>

            </div>

            <div style={cardStyle}>

              <strong>{appointments.length}</strong>

              <span>Total appointments</span>

            </div>

          </div>

          <div style={{ overflowX: "auto" }}>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>

              <thead>

                <tr>

                  <th style={thStyle}>Time</th>

                  <th style={thStyle}>Name</th>

                  <th style={thStyle}>Email</th>

                  <th style={thStyle}>Purpose</th>

                  <th style={thStyle}>Status</th>

                </tr>

              </thead>

              <tbody>

                {appointments.map((appointment) => {

                  const sent = hasReminderBeenSent(appointment);

                  const hasEmail = !!appointment.email;

                  return (

                    <tr key={appointment.id}>

                      <td style={tdStyle}>{appointment.apt_time || ""}</td>

                      <td style={tdStyle}>{appointment.name || ""}</td>

                      <td style={tdStyle}>{appointment.email || "—"}</td>

                      <td style={tdStyle}>{appointment.purpose || ""}</td>

                      <td style={tdStyle}>

                        {sent ? (

                          <span style={{ color: "#2e7d32", fontWeight: 600 }}>

                            ✓ Sent

                          </span>

                        ) : !hasEmail ? (

                          <span style={{ color: "#c62828" }}>No email</span>

                        ) : (

                          <span style={{ color: "#b26a00" }}>Ready to send</span>

                        )}

                      </td>

                    </tr>

                  );

                })}

                {appointments.length === 0 && (

                  <tr>

                    <td colSpan="5" style={{ padding: "20px", textAlign: "center" }}>

                      No appointments found for {targetDate}.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

          <div style={{ marginTop: "20px" }}>

            <button

              onClick={handleSendReminders}

              disabled={sending || pendingAppointments.length === 0}

              style={{

                padding: "12px 20px",

                cursor:

                  sending || pendingAppointments.length === 0

                    ? "default"

                    : "pointer",

                background:

                  sending || pendingAppointments.length === 0

                    ? "#aaa"

                    : "#2e7d32",

                color: "white",

                border: "none",

                borderRadius: "6px",

                fontSize: "16px",

                fontWeight: 600,

              }}

            >

              {sending ? "Sending reminders..." : "📧 Send Reminder Emails"}

            </button>

          </div>

          {results.length > 0 && (

            <div style={{ marginTop: "25px" }}>

              <h3>Sending Results</h3>

              {results.map((result) => (

                <div

                  key={result.id}

                  style={{

                    padding: "8px 0",

                    borderBottom: "1px solid #eee",

                  }}

                >

                  {result.status === "sent" ? "✓" : "✗"} {result.name} — {result.email}

                  {result.status === "failed" && (

                    <span style={{ color: "#c62828" }}> — {result.error}</span>

                  )}

                </div>

              ))}

            </div>

          )}

        </>

      )}

    </div>

  );

}

const cardStyle = {

  minWidth: "150px",

  padding: "14px",

  border: "1px solid #ddd",

  borderRadius: "8px",

  display: "flex",

  flexDirection: "column",

  gap: "4px",

};

const thStyle = {

  textAlign: "left",

  padding: "10px",

  borderBottom: "2px solid #ddd",

  background: "#f5f5f5",

};

const tdStyle = {

  padding: "10px",

  borderBottom: "1px solid #eee",

};

