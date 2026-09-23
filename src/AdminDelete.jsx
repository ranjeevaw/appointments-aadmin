import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";

import { db } from "./firebase";

import {
  doc,
  updateDoc,
} from "firebase/firestore";

export default function AdminDelete() {
  const { id } = useParams();
  const navigate = useNavigate();

const [error, setError] = useState("");

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user) {
      navigate("/admin");
    }
  });

  return unsubscribe;
}, [navigate]);

  const handleDelete = async () => {
    setError("");


    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(doc(db, "appointments", id), {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: auth.currentUser?.email || "Unknown",
        updated: new Date(),
      });

      alert("Appointment cancelled successfully");

      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Failed to cancel appointment");
    }
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h2>Admin Appointment Cancellation</h2>

      <p>
        Please click cancel appointment below to cancel the appointment.
      </p>

      {error && (
        <div
          style={{
            backgroundColor: "#ffe5e5",
            color: "#c62828",
            border: "1px solid #ef9a9a",
            padding: 12,
            marginBottom: 15,
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}



      <div
        style={{
          display: "flex",
          gap: 10,
        }}
      >
        <button onClick={handleDelete}>
          Cancel Appointment
        </button>

        <button
          onClick={() => navigate("/")}
        >
          Back
        </button>
      </div>
    </div>
  );
}
