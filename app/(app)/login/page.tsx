import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#09090D]">
      <Header />
      <div className="mx-auto max-w-md px-4 py-16">
        <LoginForm />
      </div>
    </main>
  );
}
