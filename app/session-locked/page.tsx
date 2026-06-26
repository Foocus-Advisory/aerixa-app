"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthErrorToast } from "@/lib/auth-error-toast";
import { dictionaries } from "@/lib/i18n";
import { isTokenExpired } from "@/lib/jwt-utils";
import { useDashboardStore } from "@/store/dashboard-store";
import type { LoginResponse } from "@/lib/types";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast-provider";
import { AuthControls } from "@/components/auth/auth-controls";
import { Lock } from "lucide-react";

export default function SessionLockedPage() {
  const router = useRouter();
  const { userEmail, locale, theme, sessionLocked, accessToken, preLockPath, unlockSession, setTokens, setUserEmail, setUnlockingInProgress } = useDashboardStore();
  const { toast } = useToast();
  const t = dictionaries[locale];
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!sessionLocked && accessToken && !isTokenExpired(accessToken)) {
      // Réinitialiser le flag de déverrouillage en cours
      setUnlockingInProgress(false);
      router.replace("/dashboard");
    }
  }, [sessionLocked, accessToken, router, setUnlockingInProgress]);

  const handleUnlockSuccess = (data: LoginResponse) => {
    if (data.mfaRequired && data.mfaChallengeId) {
      setUnlockingInProgress(true);
      router.push(`/login/mfa?challengeId=${data.mfaChallengeId}&unlock=1`);
      return;
    }

    if (!data.accessToken || !data.refreshToken) {
      toast({
        variant: "error",
        title: t.sessionLockedError,
        description: locale === "fr"
          ? "La réponse d'authentification est incomplète."
          : "Authentication response is incomplete.",
      });
      return;
    }

    // Marquer le déverrouillage comme en cours (grâce period pour éviter les race conditions)
    setUnlockingInProgress(true);
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    if (data.user?.email) {
      setUserEmail(data.user.email);
    }
    unlockSession();
    router.push(preLockPath || "/dashboard");
  };

  const unlockMutation = useMutation({
    mutationFn: () => {
      if (!userEmail) {
        throw new Error("Email not found");
      }
      return api.auth.login({ email: userEmail, password });
    },
    onSuccess: handleUnlockSuccess,
    onError: (error) => {
      const message = getAuthErrorToast(error, locale);
      toast({
        variant: "error",
        title: message.title,
        description: message.description,
      });
      setPassword("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast({
        variant: "error",
        title: t.sessionLockedError,
        description: t.sessionLockedPasswordRequired,
      });
      return;
    }
    unlockMutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-lg">
        {/* Contrôles thème et langue */}
        <AuthControls />

        {/* Logo */}
        <div className="flex justify-center mt-4">
          <Image
            src={theme === "dark" ? "/img/logo-white.png" : "/img/logo-black.png"}
            alt="AERIXA"
            width={96}
            height={96}
            className="h-24 w-24 object-contain"
            priority
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-primary/10 p-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Titre */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">{t.sessionLockedTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.sessionLockedSubtitle}</p>
        </div>

        {/* Affichage de l'email */}
        {userEmail && (
          <div className="rounded-lg bg-muted/50 px-4 py-2 mb-6 text-center">
            <p className="text-sm text-muted-foreground">{t.sessionLockedAs}</p>
            <p className="text-sm font-medium text-foreground">{userEmail}</p>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t.sessionLockedPassword}
            </label>
            <PasswordInput
              id="password"
              placeholder={t.sessionLockedPasswordPlaceholder}
              className="h-11 rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={unlockMutation.isPending}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-full"
            disabled={unlockMutation.isPending || !password}
          >
            {unlockMutation.isPending ? t.sessionLockedVerifying : t.sessionLockedReconnect}
          </Button>

          <GoogleAuthButton locale={locale} mode="login" onSuccess={handleUnlockSuccess} buttonWidth={260} compact />
        </form>

        {/* Lien logout */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t.sessionLockedNotYours}{" "}
            <button
              onClick={() => {
                useDashboardStore.getState().clearTokens();
                router.push("/login");
              }}
              className="text-primary hover:underline font-medium"
            >
              {t.sessionLockedLogout}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
