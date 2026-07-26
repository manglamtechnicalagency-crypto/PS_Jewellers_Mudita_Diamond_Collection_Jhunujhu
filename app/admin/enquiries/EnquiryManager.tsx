"use client";

import { useEffect, useState } from "react";

type Enquiry = {
  id: string;
  enquiry_number?: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  source: string;
  assigned_to?: string | null;
  internal_notes: string;
  next_follow_up_at?: string | null;
  created_at: string;
  products?:
    | { name?: string; sku?: string }
    | Array<{ name?: string; sku?: string }>
    | null;
};
type Staff = { id: string; display_name: string };
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
];
const labels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  showroom_visit_booked: "Showroom visit booked",
  follow_up_required: "Follow-up required",
  negotiation: "Negotiation",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

export default function EnquiryManager({
  initialEnquiries,
  staff,
}: {
  initialEnquiries: Enquiry[];
  staff: Staff[];
}) {
  const [items, setItems] = useState(initialEnquiries);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [message, setMessage] = useState("");
  const [timeline, setTimeline] = useState<
    Record<
      string,
      { body: string; activity_type: string; created_at: string }[]
    >
  >({});
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      void fetch(`/api/admin/enquiries?${params}`)
        .then(async (response) => {
          if (!response.ok) throw new Error();
          const payload = (await response.json()) as {
            data?: Enquiry[];
            pagination?: { totalPages: number };
          };
          setItems(payload.data ?? []);
          setPages(payload.pagination?.totalPages ?? 1);
        })
        .catch(() => setMessage("Enquiries could not be loaded"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, page]);
  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }
  async function update(
    item: Enquiry,
    patch: Record<string, unknown>,
    activity?: {
      type:
        "note" | "email" | "whatsapp" | "phone" | "status_change" | "follow_up";
      body: string;
    },
  ) {
    const response = await fetch("/api/admin/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        ...patch,
        ...(activity ? { activity } : {}),
      }),
    });
    if (!response.ok) {
      setMessage("Enquiry could not be updated");
      return;
    }
    const payload = (await response.json()) as { data?: Partial<Enquiry> };
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, ...patch, ...payload.data } : entry,
      ),
    );
    setMessage("Enquiry updated.");
  }
  async function showTimeline(id: string) {
    if (timeline[id]) {
      setTimeline((current) => ({ ...current, [id]: [] }));
      return;
    }
    const response = await fetch(`/api/admin/enquiries?enquiryId=${id}`);
    const payload = (await response.json()) as {
      data?: { body: string; activity_type: string; created_at: string }[];
    };
    setTimeline((current) => ({ ...current, [id]: payload.data ?? [] }));
  }
  return (
    <section className="mt-8 space-y-4">
      <div className="grid gap-3 rounded-xs border border-line bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          className="border border-line p-2 text-sm"
          placeholder="Search name, email, phone, message"
          value={search}
          onChange={(event) => changeFilter(setSearch, event.target.value)}
        />
        <select
          className="border border-line p-2 text-sm"
          value={status}
          onChange={(event) => changeFilter(setStatus, event.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {labels[value]}
            </option>
          ))}
        </select>
        <a
          className="border border-line px-3 py-2 text-center text-sm font-semibold"
          href={`/api/admin/enquiries?export=csv${status ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
        >
          Export CSV
        </a>
        <span className="p-2 text-right text-xs text-muted">
          Page {page} / {pages}
        </span>
      </div>
      {items.map((item) => {
        const product = Array.isArray(item.products)
          ? item.products[0]
          : item.products;
        const whatsapp = item.phone.replace(/[^0-9]/g, "");
        return (
          <article
            key={item.id}
            className="rounded-xs border border-line bg-white p-6"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <h2 className="font-serif text-2xl">{item.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {item.email} · {item.phone || "No phone"}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  aria-label={`Status for ${item.name}`}
                  className="h-fit border border-line p-2 text-sm"
                  value={item.status}
                  onChange={(event) =>
                    void update(
                      item,
                      { status: event.target.value },
                      {
                        type: "status_change",
                        body: `Status changed to ${labels[event.target.value] ?? event.target.value}`,
                      },
                    )
                  }
                >
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {labels[value]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Assignee for ${item.name}`}
                  className="h-fit border border-line p-2 text-sm"
                  value={item.assigned_to ?? ""}
                  onChange={(event) =>
                    void update(
                      item,
                      { assignedTo: event.target.value || null },
                      {
                        type: "note",
                        body: event.target.value
                          ? "Enquiry assigned"
                          : "Enquiry unassigned",
                      },
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name || person.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {product ? (
              <p className="mt-4 rounded-xs bg-gold-50 p-3 text-sm font-medium">
                Product: {product.name} · {product.sku}
              </p>
            ) : null}
            <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">
              {item.message}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="border border-line px-3 py-2 text-xs font-semibold"
                href={`mailto:${item.email}?subject=PS Jewellers enquiry`}
                onClick={() =>
                  void update(
                    item,
                    {},
                    { type: "email", body: "Email reply opened" },
                  )
                }
              >
                Email reply
              </a>
              {whatsapp ? (
                <a
                  className="border border-line px-3 py-2 text-xs font-semibold"
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello ${item.name}, thank you for contacting PS Jewellers.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    void update(
                      item,
                      {},
                      { type: "whatsapp", body: "WhatsApp reply opened" },
                    )
                  }
                >
                  WhatsApp reply
                </a>
              ) : null}
              <label className="flex items-center gap-2 border border-line px-3 py-2 text-xs">
                Follow-up{" "}
                <input
                  type="datetime-local"
                  value={
                    item.next_follow_up_at
                      ? item.next_follow_up_at.slice(0, 16)
                      : ""
                  }
                  onChange={(event) =>
                    void update(
                      item,
                      {
                        nextFollowUpAt: event.target.value
                          ? new Date(event.target.value).toISOString()
                          : null,
                      },
                      { type: "follow_up", body: "Follow-up reminder updated" },
                    )
                  }
                />
              </label>
              <button
                className="border border-line px-3 py-2 text-xs font-semibold"
                onClick={() => void showTimeline(item.id)}
              >
                {timeline[item.id] ? "Hide timeline" : "View timeline"}
              </button>
            </div>
            {timeline[item.id] ? (
              <div className="mt-4 border-l-2 border-gold-200 pl-4 text-sm">
                {timeline[item.id].map((event, index) => (
                  <p key={`${event.created_at}-${index}`} className="mb-2">
                    <strong>{event.activity_type}</strong> · {event.body}
                    <span className="ml-2 text-xs text-muted">
                      {new Date(event.created_at).toLocaleString("en-IN")}
                    </span>
                  </p>
                ))}
                {!timeline[item.id].length ? (
                  <p className="text-muted">No activity recorded.</p>
                ) : null}
              </div>
            ) : null}
            <p className="mt-4 text-xs uppercase tracking-wide text-muted">
              {item.source} ·{" "}
              {new Date(item.created_at).toLocaleString("en-IN")}
              {item.next_follow_up_at
                ? ` · follow up ${new Date(item.next_follow_up_at).toLocaleString("en-IN")}`
                : ""}
            </p>
          </article>
        );
      })}
      {!items.length ? (
        <p className="rounded-xs border border-line bg-white p-8 text-center text-sm text-muted">
          No enquiries found.
        </p>
      ) : null}
      <div className="flex justify-between">
        <button
          className="border border-line px-4 py-2 text-sm disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <button
          className="border border-line px-4 py-2 text-sm disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
      {message ? (
        <p className="text-sm text-ink-soft" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
