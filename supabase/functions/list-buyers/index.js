import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Edge Function: list buyers with filters, pagination, search
export default async function handler(req, res) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10;
  const search = url.searchParams.get("search") || "";
  const filters = {
    city: url.searchParams.get("city"),
    propertyType: url.searchParams.get("propertyType"),
    status: url.searchParams.get("status"),
  };

  let query = supabase.from("buyers").select("*", { count: "exact" });

  // Search across multiple fields
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // Apply filters
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.propertyType)
    query = query.eq("property_type", filters.propertyType);
  if (filters.status) query = query.eq("status", filters.status);

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    return res.json({ error: error.message }, { status: 400 });
  }

  res.json({
    items: data.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      city: row.city,
      propertyType: row.property_type,
      budgetMin: row.budget_min,
      budgetMax: row.budget_max,
      timeline: row.timeline,
      status: row.status,
      updatedAt: row.updated_at,
    })),
    totalPages: Math.ceil(count / pageSize),
  });
}
