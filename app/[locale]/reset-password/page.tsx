import { AuthShell } from "@/components/auth/auth-shell";
import { DefinePasswordForm } from "@/components/define-password-form";

export default async function LocalizedResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell>
      <DefinePasswordForm initialToken={token} />
    </AuthShell>
  );
}
