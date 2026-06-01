"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthErrorToast } from "@/lib/auth-error-toast";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast-provider";

type LoginFormProps = {
  reason?: string;
};

export function LoginForm({ reason }: LoginFormProps) {
  const router = useRouter();
  const { locale, setTokens } = useDashboardStore();
  const { toast } = useToast();
  const t = dictionaries[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => api.auth.login({ email, password }),
    onSuccess: (data) => {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      // Stocker l'email pour la page de session-locked
      useDashboardStore.getState().setUserEmail(data.user?.email || email);
      router.push("/dashboard");
    },
    onError: (error) => {
      const message = getAuthErrorToast(error, locale);
      toast({
        variant: "error",
        title: message.title,
        description: message.description,
      });
    },
  });

  return (
    <div className="space-y-4">
      {reason === "auth_required" ? (
        <div className="rounded-xl border border-border bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
          {t.authLoginRequired}
        </div>
      ) : null}

      <div className="space-y-2 text-center">
        <div className="mx-auto h-10 w-10 rounded-sm bg-primary/20" />
        <h2 className="text-[1.75rem] font-semibold tracking-tight">{t.authLoginTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.authLoginSubtitle}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">{t.authEmailLabel}</label>
          <Input id="email" type="email" className="h-11 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">{t.authPasswordLabel}</label>
          <PasswordInput id="password" className="h-11 rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Button
          className="h-11 w-full rounded-full"
          onClick={() => loginMutation.mutate()}
          disabled={loginMutation.isPending || !email || !password}
        >
          {loginMutation.isPending ? `${t.login}...` : t.login}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t.authForgotLink}
          </Link>
          <Link href="/register" className="text-primary hover:underline">
            {t.authCreateAccount}
          </Link>
        </div>
      </div>
    </div>
  );
}
