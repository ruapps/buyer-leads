import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import LeadForm from "../components/LeadForm";
import "./BuyerView.css";

export default function BuyerView() {
  const { id } = useParams(); // get buyer ID from URL
  const [buyer, setBuyer] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Fetch buyer and history
  async function fetchBuyer() {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    const res = await fetch(`/functions/v1/get-buyer?id=${id}`, {
      headers: { authorization: `Bearer ${jwt}` },
    });
    const json = await res.json();
    setBuyer(json.buyer);
    setHistory(json.history || []);
    setLoading(false);
  }

  // Save edits
  async function handleUpdate(values) {
    const { data: session } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    const res = await fetch("/functions/v1/update-buyer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ ...values, id, updatedAt: buyer.updatedAt }),
    });
    if (res.status === 200) {
      alert("Updated successfully!");
      setEditMode(false);
      fetchBuyer();
    } else {
      const err = await res.json();
      alert("Error: " + JSON.stringify(err));
    }
  }

  useEffect(() => {
    fetchBuyer();
  }, [id]);

  if (loading) return <p className="container">Loading...</p>;
  if (!buyer) return <p className="container">Buyer not found.</p>;

  return (
    <div className="container">
      <h1>Buyer Details</h1>

      {editMode ? (
        <LeadForm initial={buyer} onSubmit={handleUpdate} />
      ) : (
        <div className="buyer-card">
          <p>
            <strong>Name:</strong> {buyer.fullName}
          </p>
          <p>
            <strong>Email:</strong> {buyer.email}
          </p>
          <p>
            <strong>Phone:</strong> {buyer.phone}
          </p>
          <p>
            <strong>City:</strong> {buyer.city}
          </p>
          <p>
            <strong>Type:</strong> {buyer.propertyType}
          </p>
          <p>
            <strong>BHK:</strong> {buyer.bhk || "-"}
          </p>
          <p>
            <strong>Budget:</strong> {buyer.budgetMin || ""} -{" "}
            {buyer.budgetMax || ""}
          </p>
          <p>
            <strong>Status:</strong> {buyer.status}
          </p>
          <p>
            <strong>Timeline:</strong> {buyer.timeline}
          </p>
          <p>
            <strong>Notes:</strong> {buyer.notes}
          </p>
          <button className="btn" onClick={() => setEditMode(true)}>
            Edit
          </button>
        </div>
      )}

      {/* Buyer history */}
      <div className="history">
        <h2>Recent Updates</h2>
        {history.length === 0 ? (
          <p>No changes yet.</p>
        ) : (
          <ul>
            {history.map((h, i) => (
              <li key={i}>
                <span>
                  {new Date(h.changedAt).toLocaleString()} — {h.changedBy}
                </span>
                <pre>{JSON.stringify(h.diff, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
