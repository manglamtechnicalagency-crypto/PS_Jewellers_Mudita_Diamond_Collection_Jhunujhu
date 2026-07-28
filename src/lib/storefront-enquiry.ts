import type { CartProduct, Product } from "../types";

export const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919829407255"
).replace(/\D/g, "");

export function generateWhatsappMessage(
  product: Product,
  currentUrl?: string,
  customerMessage?: string,
): string {
  const productLink = currentUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  return [
    "Hello PS Jewellers,",
    "",
    "I am interested in the following jewellery.",
    "",
    `Product:\n${product.name}`,
    `Category:\n${product.category}`,
    `Purity:\n${product.purity}`,
    `Weight:\n${product.weight}`,
    `SKU:\n${product.sku}`,
    `Product Link:\n${productLink}`,
    "",
    "Please share",
    "• Today's Gold Price",
    "• Making Charges",
    "• Availability",
    "• Hallmark Details",
    "• More Photos",
    "• Delivery Information",
    customerMessage?.trim() ? `\nMy message:\n${customerMessage.trim()}` : "",
    "",
    "Thank you.",
  ].filter(Boolean).join("\n");
}

export function whatsappHref(
  product: Product,
  phoneNumber = WHATSAPP_NUMBER,
  currentUrl?: string,
  customerMessage?: string,
): string {
  const message = generateWhatsappMessage(product, currentUrl, customerMessage);
  return `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
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
