/**
 * WhatsApp glyph.
 *
 * Replaces the 💬 and ↗ emoji the CTAs used to carry. Emoji render differently
 * on every platform, cannot inherit currentColor, and read as informal — not
 * what you want on the primary action of a fine-jewellery storefront.
 */
export default function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.29-.47-2.45-1.51-.9-.81-1.51-1.81-1.69-2.11-.17-.3-.02-.47.13-.62.15-.15.35-.42.52-.62.17-.2.22-.35.35-.55.12-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.46s1.06 2.85 1.21 3.05c.15.2 2.06 3.29 5.02 4.48.7.3 1.25.48 1.68.62.78.25 1.49.21 2.05.13.63-.09 1.94-.79 2.21-1.56.27-.77.27-1.44.2-1.58-.08-.15-.28-.22-.58-.37z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.19-.31a8.17 8.17 0 0 1-1.25-4.36c0-4.54 3.7-8.23 8.24-8.23a8.23 8.23 0 0 1 0 16.45z" />
    </svg>
  );
}
