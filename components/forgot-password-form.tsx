"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const { locale, theme } = useDashboardStore();
  const t = dictionaries[locale];
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const forgotMutation = useMutation({
    mutationFn: () => api.auth.passwordResetRequest(email),
    onSuccess: () => setFeedback(t.authRequestSuccess),
    onError: (error) => setFeedback((error as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <Image
          src={theme === "dark" ? "/img/logo-white.png" : "/img/logo-black.png"}
          alt="AERIXA"
          width={96}
          height={96}
          className="mx-auto h-24 w-24 object-contain"
          priority
        />
        <h2 className="text-[1.4rem] font-semibold tracking-tight">{t.authForgotTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.authForgotSubtitle}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="forgot-email">{t.authEmailLabel}</label>
        <Input id="forgot-email" className="h-11 rounded-xl" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

      <Button className="h-11 w-full rounded-full" onClick={() => forgotMutation.mutate()} disabled={forgotMutation.isPending || !email}>
        {forgotMutation.isPending ? `${t.request}...` : t.authSendLink}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link className="text-primary hover:underline" href="/login">{t.authBackToLogin}</Link>
      </p>
    </div>
  );
}
