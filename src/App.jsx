import Calendar from "./Calendar"; // adjust path if different
import { Routes, Route, Link } from "react-router-dom";
import AppointmentNew from "./EditAppointment";
import AppointmentDetails from "./EditAppointment";
import AdminDelete from "./AdminDelete";
import { useState } from "react";
import emailjs from "@emailjs/browser";
import AdminLogin from "./AdminLogin";
import ProtectedRoute from "./ProtectedRoute";
import BookingView from "./BookingView";
import CancelledAppointments from "./CancelledAppointments";
import AppointmentReminders from "./AppointmentReminders";

const Page = ({title, children}) => (
  <div className="page">
    <h1>{title}</h1>
    {children}
  </div>
);

export default function App() {

const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });


const sendContactEmail = async (e) => {
  e.preventDefault();

  try {

    await emailjs.send(
      "service_xtf9mt7",
      "template_opk6ili",
      {
        from_name: contactForm.name,
        from_email: contactForm.email,
        subject: contactForm.subject,
        message: contactForm.message,
      },
      "8G68XWPnW2CkhVGMW"
    );

//    alert("Message sent successfully.");

    setContactForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });

  } catch (err) {

    console.error(err);

    alert(
      "Failed to send message. Please try again."
    );
  }
};


  return (
    <>



      <Routes>
<Route
  path="/"
    element={
            <Calendar />
    }
/>

<Route
    path="/alms-calendar"
    element={
            <Calendar />
    }
/>
<Route
    path="/appointment/new"
    element={
            <AppointmentNew />
    }
/>
<Route
    path="/admin/delete/:id"
    element={
        <ProtectedRoute>
            <AdminDelete />
        </ProtectedRoute>
    }
/>
<Route
    path="/appointment/:id"
    element={
        <ProtectedRoute>
            <AppointmentDetails />
        </ProtectedRoute>
    }
/>
<Route
    path="/cancelled/:id"
    element={
        <ProtectedRoute>
            <CancelledAppointments />
        </ProtectedRoute>
    }
/>


<Route
    path="/admin-login"
    element={<AdminLogin />}
/>

<Route
    path="/admin/reminders"
    element={
        <ProtectedRoute>
            <AppointmentReminders />
        </ProtectedRoute>
    }
/>

<Route
    path="/booking/:id"
    element={<BookingView />}
/>

</Routes>





    </>
  );


}
