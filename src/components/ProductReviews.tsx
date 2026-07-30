"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

/**
 * Customer reviews for a product: the approved list, plus the submission form.
 *
 * Reviews are fetched client-side because the storefront router is a client
 * component — the product page has no server render to hang this off.
 *
 * Submitted reviews are held for moderation, and the copy says so before the
 * customer types anything. Telling them only after they submit reads as a
 * bait-and-switch, and they would otherwise refresh looking for a review that
 * is never going to appear.
 */

export type PublicReview = {
  id: string;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  is_verified_purchase: boolean;
  created_at: string;
};

/**
 * A review this visitor just submitted, held locally for the rest of the page
 * view.
 *
 * The server cannot return it: it is `pending`, and the public read path is
 * approved-only by design. Without this the customer submits, sees the list
 * still say "No reviews yet", and reasonably concludes the form is broken —
 * which is exactly what happened.
 *
 * It is labelled as pending and never merged into the public list, so nobody
 * is misled into thinking unapproved text is live on the storefront. It
 * disappears on refresh, because it was never public in the first place.
 */
type LocalPendingReview = PublicReview & { pending: true };

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="text-gold-600" aria-label={`${rating} out of 5 stars`}>
      <span aria-hidden="true">
        {"★".repeat(Math.max(0, Math.min(5, rounded)))}
        <span className="text-line">{"★".repeat(Math.max(0, 5 - rounded))}</span>
      </span>
    </span>
  );
}

/** Accessible radio group. A row of buttons would not be keyboard navigable. */
function RatingPicker({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-ink">Your rating</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer p-1">
            <input
              type="radio"
              name="rating"
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only peer"
              required
            />
            <span
              aria-hidden="true"
              className={`text-2xl leading-none transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold-500 ${
                star <= value ? "text-gold-600" : "text-line"
              }`}
            >
              ★
            </span>
            <span className="sr-only">
              {star} star{star === 1 ? "" : "s"}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xs border border-line px-3 text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200";

export default function ProductReviews({
  productId,
  ratingAverage,
  ratingCount,
}: {
  productId: string;
  ratingAverage?: number;
  ratingCount?: number;
}) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [myPending, setMyPending] = useState<LocalPendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/reviews?productId=${encodeURIComponent(productId)}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: PublicReview[] };
      setReviews(payload.data ?? []);
    } catch {
      // A failed read must not break the product page. The section simply shows
      // no reviews; the customer can still buy and still write one.
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, authorName, authorEmail, rating, title: "", body }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "Your review could not be submitted. Please try again.");
        return;
      }
      // Show it back to the customer straight away. Built from what they just
      // typed, not from the server, because the server will not return a
      // pending row to a public reader.
      setMyPending((current) => [
        {
          id: `pending-${Date.now()}`,
          author_name: authorName,
          rating,
          title: "",
          body,
          is_verified_purchase: false,
          created_at: new Date().toISOString(),
          pending: true,
        },
        ...current,
      ]);
      setSubmitted(true);
      setRating(0);
      setBody("");
      setAuthorName("");
      setAuthorEmail("");
    } catch {
      setError("Your review could not be submitted. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="reviews-heading" className="font-serif text-xl text-ink sm:text-2xl">
          Customer Reviews
        </h2>
        {ratingCount && ratingCount > 0 && ratingAverage ? (
          <p className="text-sm text-ink-soft">
            <Stars rating={ratingAverage} />{" "}
            <span className="ml-1">
              {ratingAverage.toFixed(1)} from {ratingCount} review{ratingCount === 1 ? "" : "s"}
            </span>
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div>
          {loading ? (
            <p className="text-sm text-muted">Loading reviews…</p>
          ) : myPending.length || reviews.length ? (
            <div className="grid gap-4">
              {/* This visitor's just-submitted reviews sit on top, visually
                  separated so they are never mistaken for published ones. */}
              {myPending.map((review) => (
                <article key={review.id} className="rounded-xs border border-dashed border-gold-500 bg-gold-50/40 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars rating={review.rating} />
                    <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      Awaiting approval
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-ink-soft">{review.body}</p>
                  <p className="mt-3 text-sm">
                    <strong className="text-ink">{review.author_name}</strong>
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    This is your review. Only you can see it — it will appear here for everyone once our team has
                    approved it.
                  </p>
                </article>
              ))}
              {reviews.map((review) => (
                <article key={review.id} className="rounded-xs border border-line bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars rating={review.rating} />
                    <span className="text-xs text-muted">{dateFormat.format(new Date(review.created_at))}</span>
                  </div>
                  {review.title ? <strong className="mt-2 block text-ink">{review.title}</strong> : null}
                  <p className="mt-2 whitespace-pre-line text-ink-soft">{review.body}</p>
                  <p className="mt-3 text-sm">
                    <strong className="text-ink">{review.author_name}</strong>
                    {review.is_verified_purchase ? (
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-gold-600">
                        Verified purchase
                      </span>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              No reviews yet. Be the first to share your experience with this piece.
            </p>
          )}
        </div>

        <div className="rounded-xs border border-line bg-cream p-6">
          <h3 className="font-serif text-lg text-ink">Write a review</h3>
          {submitted ? (
            <div className="mt-3 flex flex-col gap-3">
              <p role="status" className="rounded-xs border border-gold-500 bg-white p-3 text-sm leading-6 text-ink-soft">
                Thank you. Your review is shown on the left and has been sent to our team — it will be visible to
                everyone once approved.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="min-h-11 text-sm font-medium text-gold-600 hover:underline"
              >
                Write another review
              </button>
            </div>
          ) : (
            <form className="mt-4 flex flex-col gap-4" onSubmit={submit}>
              <RatingPicker value={rating} onChange={setRating} />

              <label className="flex flex-col gap-1 text-sm font-medium">
                Your review
                <textarea
                  required
                  maxLength={4000}
                  rows={4}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="What did you think of the craftsmanship, finish and fit?"
                  className="w-full rounded-xs border border-line p-3 text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Your name
                <input
                  required
                  maxLength={80}
                  autoComplete="name"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Email address
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={authorEmail}
                  onChange={(event) => setAuthorEmail(event.target.value)}
                  className={inputClass}
                />
                <span className="text-xs font-normal text-muted">
                  Never published. Used only so the showroom can contact you about your review.
                </span>
              </label>

              {error ? (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              ) : null}

              <button
                disabled={pending || rating === 0}
                className="min-h-12 rounded-xs bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
              >
                {pending ? "Sending…" : "Submit review"}
              </button>
              <p className="text-xs leading-5 text-muted">
                Reviews are checked by our team before they appear, so yours will not show up straight away.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
