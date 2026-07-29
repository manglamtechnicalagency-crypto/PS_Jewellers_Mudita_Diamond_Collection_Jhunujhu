import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

const statuses = [
  "new",
  "contacted",
  "qualified",
  "showroom_visit_booked",
  "follow_up_required",
  "negotiation",
  "proposal",
  "won",
  "lost",
  "spam",
] as const;
const activityTypes = [
  "note",
  "email",
  "whatsapp",
  "phone",
  "status_change",
  "follow_up",
] as const;
const select =
  "id, name, email, phone, message, product_id, customer_id, status, source, preferred_contact, assigned_to, internal_notes, next_follow_up_at, last_contacted_at, resolved_at, created_at, updated_at, products(name, slug)";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error !== null)
    return errorResponse(
      auth.error === "forbidden" ? 403 : 401,
      "unauthorized",
      "Authentication is required",
    );

  const url = new URL(request.url);
  const enquiryId = url.searchParams.get("enquiryId");
  if (enquiryId) {
    const parsedId = z.string().uuid().safeParse(enquiryId);
    if (!parsedId.success)
      return errorResponse(422, "validation_error", "Enquiry id is invalid");
    const { data, error } = await auth.client
      .from("enquiry_activities")
      .select(
        "id, enquiry_id, actor_id, activity_type, body, created_at, profiles(display_name)",
      )
      .eq("enquiry_id", parsedId.data)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error)
      return errorResponse(
        500,
        "database_error",
        "Enquiry timeline could not be loaded",
      );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const page = Math.max(
    1,
    Math.min(10000, Number(url.searchParams.get("page") ?? "1") || 1),
  );
  const pageSize = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("pageSize") ?? "25") || 25),
  );
  const status = url.searchParams.get("status");
  const assignedTo = url.searchParams.get("assignedTo");
  const search = (url.searchParams.get("search") ?? "")
    .trim()
    .slice(0, 100)
    .replace(/[(),]/g, " ");
  const exportCsv = url.searchParams.get("export") === "csv";
  let query = auth.client
    .from("enquiries")
    .select(select, { count: "exact" })
    .order("created_at", { ascending: false });
  if (status && statuses.includes(status as (typeof statuses)[number]))
    query = query.eq("status", status);
  else if (status)
    return errorResponse(422, "validation_error", "Status filter is invalid");
  if (assignedTo === "unassigned") query = query.is("assigned_to", null);
  else if (assignedTo) {
    const parsed = z.string().uuid().safeParse(assignedTo);
    if (!parsed.success)
      return errorResponse(
        422,
        "validation_error",
        "Assignee filter is invalid",
      );
    query = query.eq("assigned_to", parsed.data);
  }
  if (search) {
    const term = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    query = query.or(
      `name.ilike.${term},email.ilike.${term},phone.ilike.${term},message.ilike.${term}`,
    );
  }
  if (exportCsv) {
    const { data, error } = await query.limit(10000);
    if (error)
      return errorResponse(
        500,
        "database_error",
        "Enquiries could not be exported",
      );
    const rows = [
      "id,name,email,phone,status,source,assigned_to,created_at,next_follow_up_at,message",
      ...(data ?? []).map((row) =>
        [
          row.id,
          row.name,
          row.email,
          row.phone,
          row.status,
          row.source,
          row.assigned_to,
          row.created_at,
          row.next_follow_up_at,
          row.message,
        ]
          .map(csvCell)
          .join(","),
      ),
    ];
    return new NextResponse(rows.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=enquiries.csv",
        "Cache-Control": "no-store",
      },
    });
  }
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error)
    return errorResponse(
      500,
      "database_error",
      "Enquiries could not be loaded",
    );
  return NextResponse.json(
    {
      data,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!hasValidSameOrigin(request))
    return errorResponse(
      403,
      "invalid_origin",
      "Request origin is not allowed",
    );
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error !== null)
    return errorResponse(
      auth.error === "forbidden" ? 403 : 401,
      "unauthorized",
      "You do not have permission to update enquiries",
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON",
    );
  }
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(statuses).optional(),
      internalNotes: z.string().trim().max(4000).optional(),
      assignedTo: z.string().uuid().nullable().optional(),
      nextFollowUpAt: z.string().datetime().nullable().optional(),
      activity: z
        .object({
          type: z.enum(activityTypes),
          body: z.string().trim().min(1).max(4000),
        })
        .optional(),
    })
    .strict()
    .refine(
      (value) =>
        value.status !== undefined ||
        value.internalNotes !== undefined ||
        value.assignedTo !== undefined ||
        value.nextFollowUpAt !== undefined ||
        value.activity !== undefined,
      { message: "At least one update is required" },
    )
    .safeParse(body);
  if (!parsed.success)
    return errorResponse(422, "validation_error", "Enquiry fields are invalid");
  const value = parsed.data;
  const { data, error } = await auth.client
    .from("enquiries")
    .update({
      ...(value.status === undefined ? {} : { status: value.status }),
      ...(value.internalNotes === undefined
        ? {}
        : { internal_notes: value.internalNotes }),
      ...(value.assignedTo === undefined
        ? {}
        : { assigned_to: value.assignedTo }),
      ...(value.nextFollowUpAt === undefined
        ? {}
        : { next_follow_up_at: value.nextFollowUpAt }),
      ...(value.activity &&
      ["email", "whatsapp", "phone"].includes(value.activity.type)
        ? { last_contacted_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", value.id)
    .select(
      "id, status, internal_notes, assigned_to, next_follow_up_at, last_contacted_at, resolved_at, updated_at",
    )
    .maybeSingle();
  if (error)
    return errorResponse(
      error.code === "23503" ? 422 : 500,
      error.code === "23503" ? "validation_error" : "database_error",
      error.code === "23503"
        ? "Assignee is not active staff"
        : "Enquiry could not be updated",
    );
  if (!data) return errorResponse(404, "not_found", "Enquiry was not found");
  if (value.activity) {
    const { error: activityError } = await auth.client
      .from("enquiry_activities")
      .insert({
        enquiry_id: value.id,
        actor_id: auth.user.id,
        activity_type: value.activity.type,
        body: value.activity.body,
      });
    if (activityError)
      return errorResponse(
        500,
        "database_error",
        "Enquiry activity could not be recorded",
      );
  }
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
