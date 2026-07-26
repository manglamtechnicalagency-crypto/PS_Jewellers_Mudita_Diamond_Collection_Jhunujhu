import type { CartProduct, Product } from "../types";

export const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""
).replace(/\D/g, "");

export function whatsappHref(product: Product): string {
  const message = `Hello PS Jewellers, I would like to enquire about ${product.name} (${product.sku}).`;
  return WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    : "/checkout";
}

export function shortlistMessage(
  items: CartProduct[],
  customerMessage: string,
): string {
  const lines = items.map(
    (item) => `- ${item.name} (${item.sku}) × ${item.quantity}`,
  );
  return [
    `Shortlist enquiry:`,
    ...lines,
    customerMessage.trim() ? `Requirement: ${customerMessage.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function createStorefrontEnquiry(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredContact: "email" | "phone" | "whatsapp";
  productIds: string[];
  idempotencyKey?: string;
  selectedOptions?: Record<string, string>;
}): Promise<{ enquiryNumber: string; whatsappUrl: string }> {
  const idempotencyKey =
    input.idempotencyKey ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`);
  const response = await fetch("/api/public/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      source: "product_enquiry",
      consent: true,
      idempotencyKey,
      selectedOptions: input.selectedOptions ?? {},
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      utmSource: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_source") ?? undefined : undefined,
      utmMedium: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_medium") ?? undefined : undefined,
      utmCampaign: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_campaign") ?? undefined : undefined,
    }),
  });
  if (!response.ok) throw new Error("Enquiry could not be sent");
  const payload = (await response.json()) as {
    data?: { enquiryNumber?: string; whatsappUrl?: string };
  };
  if (!payload.data?.enquiryNumber || !payload.data.whatsappUrl)
    throw new Error("Enquiry response was incomplete");
  return {
    enquiryNumber: payload.data.enquiryNumber,
    whatsappUrl: payload.data.whatsappUrl,
  };
}
