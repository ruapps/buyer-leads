// src/components/CSVImporter.jsx
import React, { useState } from "react";
import Papa from "papaparse";
import { createBuyerSchema } from "../lib/zodSchemas";
import { supabase } from "../lib/supabaseClient";
import "./CSVImporter.css";

export default function CSVImporter() {
  const [rawRows, setRawRows] = useState([]); // original parsed CSV rows
  const [validRows, setValidRows] = useState([]); // rows that passed client validation
  const [rowErrors, setRowErrors] = useState([]); // row-level errors [{row, message}]
  const [uploading, setUploading] = useState(false);
  const [insertResult, setInsertResult] = useState(null);

  // Parse CSV file when selected
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data;
        if (rows.length > 200) {
          alert("CSV has more than 200 rows. Please split into smaller files.");
          return;
        }
        setRawRows(rows);
        validateRows(rows);
      },
      error: (err) => {
        alert("Failed to parse CSV: " + err.message);
      },
    });
  }

  // Validate rows client-side using createBuyerSchema
  function validateRows(rows) {
    const valids = [];
    const errors = [];
    rows.forEach((r, idx) => {
      // Normalize keys from CSV to expected names if needed:
      // Accept headers like fullName or full_name — simple mapping:
      const normalized = {
        fullName: r.fullName ?? r.full_name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        city: r.city ?? "",
        propertyType: r.propertyType ?? r.property_type ?? "",
        bhk: r.bhk ?? "",
        purpose: r.purpose ?? "",
        budgetMin: r.budgetMin ? Number(r.budgetMin) : undefined,
        budgetMax: r.budgetMax ? Number(r.budgetMax) : undefined,
        timeline: r.timeline ?? "",
        source: r.source ?? "",
        notes: r.notes ?? "",
        tags: r.tags
          ? typeof r.tags === "string"
            ? r.tags
                .split(";")
                .map((t) => t.trim())
                .filter(Boolean)
            : r.tags
          : [],
      };

      const parsed = createBuyerSchema.safeParse(normalized);
      if (!parsed.success) {
        // Collect a readable message for this row
        const msgs = parsed.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        errors.push({ row: idx + 1, message: msgs });
      } else {
        valids.push(parsed.data);
      }
    });
    setValidRows(valids);
    setRowErrors(errors);
  }

  // Send valid rows to the server for transactional insert
  async function handleUpload() {
    if (validRows.length === 0) {
      alert("No valid rows to insert.");
      return;
    }
    setUploading(true);
    setInsertResult(null);
    const { data: session } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    // Call edge function for import. Server does final validation & inserts.
    const res = await fetch("/functions/v1/import-buyers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ rows: validRows }),
    });

    const json = await res.json().catch(() => ({ error: "Invalid response" }));
    if (res.ok) {
      setInsertResult({ success: true, inserted: json.inserted });
      setRawRows([]);
      setValidRows([]);
      setRowErrors([]);
    } else {
      // The server returns structured row errors or an error message
      setInsertResult({
        success: false,
        errors: json.errors || json.error || "Unknown",
      });
    }
    setUploading(false);
  }

  return (
    <div className="csv-importer">
      <input type="file" accept=".csv" onChange={handleFile} />
      {rawRows.length > 0 && (
        <div className="preview">
          <h3>Preview ({rawRows.length} rows)</h3>

          <div className="preview-actions">
            <button
              className="btn"
              onClick={() => {
                setRawRows([]);
                setValidRows([]);
                setRowErrors([]);
                setInsertResult(null);
              }}
            >
              Clear
            </button>
            <button
              className="btn"
              onClick={handleUpload}
              disabled={uploading || validRows.length === 0}
            >
              {uploading
                ? "Uploading..."
                : `Insert ${validRows.length} valid rows`}
            </button>
          </div>

          {rowErrors.length > 0 && (
            <div className="errors">
              <h4>Row Errors</h4>
              <ul>
                {rowErrors.map((e) => (
                  <li key={e.row}>
                    <strong>Row {e.row}:</strong> {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <table className="csv-preview">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>City</th>
                <th>Type</th>
                <th>Budget</th>
                <th>Valid</th>
              </tr>
            </thead>
            <tbody>
              {rawRows.map((r, i) => {
                const isError = rowErrors.some((err) => err.row === i + 1);
                const norm = validRows.find(
                  (v) => v.fullName === (r.fullName ?? r.full_name)
                ); // simple map to show
                return (
                  <tr key={i} className={isError ? "invalid" : "valid"}>
                    <td>{i + 1}</td>
                    <td>{r.fullName ?? r.full_name}</td>
                    <td>{r.phone}</td>
                    <td>{r.city}</td>
                    <td>{r.propertyType ?? r.property_type}</td>
                    <td>
                      {r.budgetMin ?? ""} - {r.budgetMax ?? ""}
                    </td>
                    <td>{isError ? "No" : "Yes"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {insertResult && insertResult.success && (
            <div className="success">
              Inserted {insertResult.inserted} rows successfully.
            </div>
          )}
          {insertResult && !insertResult.success && (
            <div className="failure">
              <h4>Import failed</h4>
              <pre>{JSON.stringify(insertResult.errors, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
