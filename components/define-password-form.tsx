"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { BrandLogo, AUTH_LOGO_CLASS } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

interface DefinePasswordFormProps {
  initialToken?: string;
}

export function DefinePasswordForm({ initialToken = "" }: DefinePasswordFormProps) {
  const router = useRouter();
  const { locale } = useDashboardStore();
  const t = dictionaries[locale];

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const defineMutation = useMutation({
    mutationFn: () => api.auth.passwordResetConfirm(initialToken, password),
    onSuccess: () => {
      setFeedback(t.authConfirmSuccess);
      setTimeout(() => router.push("/login"), 1200);
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const passwordPolicyValid = hasMinLength && hasUppercase && hasLowercase && hasDigit;
  const passwordsMatch = password === confirmPassword;

  const isInvalid = !initialToken || !password || !passwordPolicyValid || !passwordsMatch;

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <BrandLogo className={AUTH_LOGO_CLASS} priority />
        <h2 className="text-[1.4rem] font-semibold tracking-tight">{t.authDefineTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.authDefineSubtitle}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="define-password">{t.authPasswordLabel}</label>
        <PasswordInput
          id="define-password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{t.authPasswordMinLength}</p>
          {!hasUppercase && password.length > 0 ? <p>{t.authPasswordRequireUppercase}</p> : null}
          {!hasLowercase && password.length > 0 ? <p>{t.authPasswordRequireLowercase}</p> : null}
          {!hasDigit && password.length > 0 ? <p>{t.authPasswordRequireDigit}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="define-confirm">{t.authPasswordConfirmLabel}</label>
        <PasswordInput
          id="define-confirm"
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {confirmPassword.length > 0 && !passwordsMatch ? (
          <p className="text-xs text-destructive">{t.authPasswordMismatch}</p>
        ) : null}
      </div>

      {!initialToken ? (
        <p className="text-sm text-destructive">{t.authTokenMissing}</p>
      ) : null}

      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

      <Button className="h-11 w-full rounded-full" disabled={isInvalid || defineMutation.isPending} onClick={() => defineMutation.mutate()}>
        {defineMutation.isPending ? `${t.confirm}...` : t.authValidate}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link className="text-primary hover:underline" href="/login">{t.authBackToLogin}</Link>
      </p>
    </div>
  );
}
