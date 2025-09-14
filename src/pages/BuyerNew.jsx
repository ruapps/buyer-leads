import React from "react";
import LeadForm from "../components/LeadForm";
import { supabase } from "../lib/supabaseClient";

// Page for creating a new Buyer
export default function BuyerNew() {
  // Function to handle form submission
  async function handleCreate(values) {
    // Get logged-in session (to send JWT for ownership)
    const { data: session } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    // Call Supabase Edge Function: create-buyer
    const res = await fetch("/functions/v1/create-buyer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(values),
    });

    if (res.status === 201) {
      // Redirect to buyer list after success
      window.location.href = "/buyers";
    } else {
      const json = await res.json();
      alert("Error: " + JSON.stringify(json));
    }
  }

  return (
    <div>
      <h1>Create Buyer</h1>
      {/* LeadForm handles all input fields */}
      <LeadForm onSubmit={handleCreate} />
    </div>
  );
}
