import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
