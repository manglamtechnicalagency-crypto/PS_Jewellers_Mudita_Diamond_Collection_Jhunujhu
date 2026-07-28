import type { Product } from "../types";
import { WHATSAPP_NUMBER } from "../../config/contact";

export function generateWhatsAppMessage(product: Product, currentUrl?: string, customerMessage?: string): string {
  const productLink = currentUrl ?? (typeof window !== "undefined"
    ? `${window.location.origin}/product/${product.slug}`
    : `/product/${product.slug}`);
  const metal = product.specs.metal ?? product.stoneType ?? "Gold";

  return [
    "Hello PS Jewellers,",
    customerMessage?.trim() ? `\nMy message:\n${customerMessage.trim()}` : "",
    "",
    "I am interested in this jewellery.",
    "",
    `Product Name:\n${product.name}`,
    `Category:\n${product.category}`,
    `Metal:\n${metal}`,
    `Purity:\n${product.purity}`,
    `Weight:\n${product.weight}`,
    `Product Link:\n${productLink}`,
    "",
    "Please share:",
    "• Today's Price",
    "• Making Charges",
    "• Availability",
    "• Hallmark Details",
    "• More Images",
    "",
    "Thank you.",
  ].join("\n");
}

// Keep the previous spelling available for existing imports while exposing the requested helper name.
export const generateWhatsappMessage = generateWhatsAppMessage;

export function whatsappHref(
  product: Product,
  phoneNumber = WHATSAPP_NUMBER,
  currentUrl?: string,
  customerMessage?: string,
): string {
  return `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(generateWhatsAppMessage(product, currentUrl, customerMessage))}`;
}
