import React, { useState } from "react";
import { createBuyerSchema } from "../lib/zodSchemas";

// Reusable form: works for both "create" and "edit" buyer
export default function LeadForm({ initial = {}, onSubmit }) {
  // form state
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "Chandigarh",
    propertyType: "Apartment",
    bhk: "",
    purpose: "Buy",
    budgetMin: "",
    budgetMax: "",
    timeline: "0-3m",
    source: "Website",
    notes: "",
    tags: [],
    ...initial, // prefill when editing
  });

  // errors state
  const [errors, setErrors] = useState({});

  // update state when user types
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  // submit handler
  async function submit(e) {
    e.preventDefault();
    const parsed = createBuyerSchema.safeParse(form);
    if (!parsed.success) {
      // collect validation errors
      const zErrors = parsed.error.format();
      setErrors(zErrors);
      return;
    }
    setErrors({});
    await onSubmit(parsed.data);
  }

  return (
    <form onSubmit={submit}>
      <div>
        <label htmlFor="fullName">Full name</label>
        <input
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          aria-invalid={!!errors.fullName}
        />
        {errors.fullName && (
          <div role="alert" style={{ color: "red" }}>
            {errors.fullName._errors.join(", ")}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="phone">Phone</label>
        <input name="phone" value={form.phone} onChange={handleChange} />
        {errors.phone && (
          <div role="alert" style={{ color: "red" }}>
            {errors.phone._errors.join(", ")}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="propertyType">Property Type</label>
        <select
          name="propertyType"
          value={form.propertyType}
          onChange={handleChange}
        >
          <option>Apartment</option>
          <option>Villa</option>
          <option>Plot</option>
          <option>Office</option>
          <option>Retail</option>
        </select>
      </div>

      {/* Conditional BHK field */}
      {["Apartment", "Villa"].includes(form.propertyType) && (
        <div>
          <label htmlFor="bhk">BHK</label>
          <select name="bhk" value={form.bhk} onChange={handleChange}>
            <option value="">Select</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="Studio">Studio</option>
          </select>
        </div>
      )}

      <button type="submit">Save</button>
    </form>
  );
}
