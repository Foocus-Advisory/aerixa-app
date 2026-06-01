import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams?: { reason?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AuthShell>
      <LoginForm reason={searchParams?.reason} />
    </AuthShell>
  );
}
