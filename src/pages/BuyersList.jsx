import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./BuyersList.css";

// Buyers List Page
export default function BuyersList() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    city: "",
    propertyType: "",
    status: "",
    timeline: "",
  });
  const [search, setSearch] = useState("");

  // Fetch buyers from Supabase Edge Function
  async function fetchBuyers() {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    const params = new URLSearchParams({
      page,
      search,
      ...filters,
    });

    const res = await fetch("/functions/v1/list-buyers?" + params, {
      headers: { authorization: `Bearer ${jwt}` },
    });

    const json = await res.json();
    setBuyers(json.items || []);
    setTotalPages(json.totalPages || 1);
    setLoading(false);
  }

  useEffect(() => {
    fetchBuyers();
  }, [page, filters, search]);

  return (
    <div className="container">
      <h1>Buyer Leads</h1>

      {/* Search Input */}
      <input
        className="search-input"
        placeholder="Search by name, phone, email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="toolbar">
        <a className="btn" href="/buyers/import-export">
          Import / Export
        </a>
      </div>

      {/* Filter Dropdowns */}
      <div className="filters">
        <select
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
        >
          <option value="">All Cities</option>
          <option>Chandigarh</option>
          <option>Mohali</option>
          <option>Zirakpur</option>
          <option>Panchkula</option>
          <option>Other</option>
        </select>
        <select
          value={filters.propertyType}
          onChange={(e) =>
            setFilters((f) => ({ ...f, propertyType: e.target.value }))
          }
        >
          <option value="">All Types</option>
          <option>Apartment</option>
          <option>Villa</option>
          <option>Plot</option>
          <option>Office</option>
          <option>Retail</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
        >
          <option value="">All Status</option>
          <option>New</option>
          <option>Qualified</option>
          <option>Contacted</option>
          <option>Visited</option>
          <option>Negotiation</option>
          <option>Converted</option>
          <option>Dropped</option>
        </select>
      </div>

      {/* Buyers Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="buyers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>Type</th>
              <th>Budget</th>
              <th>Timeline</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((b) => (
              <tr key={b.id}>
                <td>{b.fullName}</td>
                <td>{b.phone}</td>
                <td>{b.city}</td>
                <td>{b.propertyType}</td>
                <td>
                  {b.budgetMin || ""} - {b.budgetMax || ""}
                </td>
                <td>{b.timeline}</td>
                <td>{b.status}</td>
                <td>{new Date(b.updatedAt).toLocaleDateString()}</td>
                <td>
                  <a href={`/buyers/${b.id}`}>View / Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
