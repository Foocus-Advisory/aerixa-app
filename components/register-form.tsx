"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactCountryFlag from "react-country-flag";
import { api } from "@/lib/api";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { BrandLogo, AUTH_LOGO_CLASS } from "@/components/brand-logo";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { phonePrefixes } from "@/lib/phone-prefixes";

export function RegisterForm() {
  const router = useRouter();
  const { locale, setTokens } = useDashboardStore();
  const t = dictionaries[locale];
  const [form, setForm] = useState({
    username: "",
    email: "",
    phonePrefix: "+237",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleGoogleSuccess = (data: Awaited<ReturnType<typeof api.auth.googleRegister>>) => {
    if (data.mfaRequired && data.mfaChallengeId) {
      router.push(`/login/mfa?challengeId=${data.mfaChallengeId}`);
      return;
    }

    if (!data.accessToken || !data.refreshToken) {
      setFeedback(locale === "fr" ? "La reponse Google est incomplete." : "Google response is incomplete.");
      return;
    }

    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    useDashboardStore.getState().setUserEmail(data.user?.email || form.email);
    router.push("/dashboard");
  };

  const registerMutation = useMutation({
    mutationFn: () => {
      const sanitizedNumber = form.phoneNumber.replace(/\s+/g, "");
      return api.auth.register({
        username: form.username,
        email: form.email,
        phoneNumber: `${form.phonePrefix}${sanitizedNumber}`,
        password: form.password,
      });
    },
    onSuccess: () => {
      setFeedback(t.authRegisterSuccess);
      setTimeout(() => router.push("/login"), 1200);
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <BrandLogo className={AUTH_LOGO_CLASS} priority />
        <h2 className="text-[1.65rem] font-semibold tracking-tight">{t.authRegisterTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.authRegisterSubtitle}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-username">{t.authUsernameLabel}</label>
        <Input
          id="register-username"
          className="h-11 rounded-xl"
          placeholder="nom.utilisateur"
          value={form.username}
          onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-email">{t.authEmailLabel}</label>
        <Input
          id="register-email"
          className="h-11 rounded-xl"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t.authPhoneLabel}</label>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
          <SearchableSelect
            options={phonePrefixes.map((item) => ({
              label: item.label,
              value: item.value,
              keywords: [...item.keywords],
              icon: <ReactCountryFlag countryCode={item.countryCode} svg style={{ width: "1.1em", height: "1.1em" }} />,
            }))}
            value={form.phonePrefix}
            onValueChange={(value) => setForm((s) => ({ ...s, phonePrefix: value }))}
            placeholder={t.authCountryCodePlaceholder}
            searchPlaceholder={t.authCountrySearchPlaceholder}
          />
          <Input
            className="h-10 rounded-xl"
            placeholder={t.authPhonePlaceholder}
            value={form.phoneNumber}
            onChange={(e) => setForm((s) => ({ ...s, phoneNumber: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-password">{t.authPasswordLabel}</label>
        <PasswordInput
          id="register-password"
          className="h-11 rounded-xl"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-confirm">{t.authPasswordConfirmLabel}</label>
        <PasswordInput
          id="register-confirm"
          className="h-11 rounded-xl"
          value={form.confirmPassword}
          onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
        />
      </div>

      {form.confirmPassword && form.password !== form.confirmPassword ? (
        <p className="text-sm text-destructive">{t.authPasswordMismatch}</p>
      ) : null}
      {form.password && form.password.length < 8 ? <p className="text-sm text-destructive">{t.authPasswordMinLength}</p> : null}
      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

      <Button
        className="h-11 w-full rounded-full"
        onClick={() => registerMutation.mutate()}
        disabled={
          registerMutation.isPending ||
          !form.username ||
          !form.email ||
          !form.phoneNumber ||
          !form.password ||
          form.password.length < 8 ||
          form.password !== form.confirmPassword
        }
      >
        {registerMutation.isPending ? `${t.register}...` : t.register}
      </Button>

      <GoogleAuthButton locale={locale} mode="register" onSuccess={handleGoogleSuccess} />

      <p className="text-center text-sm text-muted-foreground">
        {t.authAlreadyAccount} <Link className="text-primary hover:underline" href="/login">{t.authSignInLink}</Link>
      </p>
    </div>
  );
}
