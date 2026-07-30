import Link from "next/link";
import BrandLogo from "@/src/components/BrandLogo";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function AdminForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-16 text-ink">
      <div className="mx-auto max-w-md rounded-xs border border-line bg-white p-8 shadow-sm">
        <BrandLogo className="h-24 w-24" priority />
        <h1 className="mt-3 font-serif text-4xl">Reset admin password</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Enter the admin email address. If it is registered, Supabase will send a secure password-reset link.
        </p>
        <ForgotPasswordForm />
        <Link href="/admin/login" className="mt-5 block text-center text-sm font-medium text-gold-600 hover:underline">
          Back to admin sign in
        </Link>
      </div>
    </main>
  );
}
