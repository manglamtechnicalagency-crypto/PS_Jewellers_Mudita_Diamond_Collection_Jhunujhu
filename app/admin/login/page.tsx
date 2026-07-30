import LoginForm from "./LoginForm";
import BrandLogo from "@/src/components/BrandLogo";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-16 text-ink">
      <div className="mx-auto max-w-md rounded-xs border border-line bg-white p-8 shadow-sm">
        <BrandLogo className="h-28 w-auto" priority />
        <h1 className="mt-3 font-serif text-4xl">Admin sign in</h1>
        <p className="mt-2 text-sm text-ink-soft">Password and mandatory two-factor verification are required.</p>
        <LoginForm />
      </div>
    </main>
  );
}
