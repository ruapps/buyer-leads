// src/pages/BuyerImportExport.jsx
import React, { useState } from "react";
import CSVImporter from "../components/CSVImporter";
import { supabase } from "../lib/supabaseClient";
import "./BuyerImportExport.css";

export default function BuyerImportExport() {
  const [exportUrl, setExportUrl] = useState(null);
  const [loadingExport, setLoadingExport] = useState(false);

  // When user clicks Export:
  // - request CSV from edge function
  // - create blob URL and show a download link
  async function handleExport(filters = {}) {
    setLoadingExport(true);
    // Get current user's JWT so function can enforce ownership rules if necessary
    const { data: session } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    // If you want to pass filters (city/status etc.), append as query params.
    // For simplicity we export all filtered data server-side; here we send no filters.
    const res = await fetch("/functions/v1/export-buyers", {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({ error: "Unknown" }));
      alert("Export failed: " + (json.error || res.status));
      setLoadingExport(false);
      return;
    }

    const csvText = await res.text();
    const blob = new Blob([csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    setExportUrl(url);
    setLoadingExport(false);
  }

  return (
    <div className="container import-export-page">
      <h1>Import / Export Buyers</h1>

      <section className="import-section">
        <h2>Import CSV</h2>
        <CSVImporter />
      </section>

      <section className="export-section">
        <h2>Export CSV</h2>
        <p>Export the current filtered list of buyers as CSV.</p>
        <button
          className="btn"
          onClick={() => handleExport()}
          disabled={loadingExport}
        >
          {loadingExport ? "Preparing..." : "Export CSV"}
        </button>
        {exportUrl && (
          <div className="download">
            <a href={exportUrl} download="buyers.csv" className="btn">
              Download buyers.csv
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
