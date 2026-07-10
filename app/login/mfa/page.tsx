"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { BrandLogo, AUTH_LOGO_CLASS } from "@/components/brand-logo";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";

export default function MfaLoginPage() {
  return (
    <Suspense>
      <MfaLoginPageContent />
    </Suspense>
  );
}

function MfaLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, unlockSession, setUnlockingInProgress, preLockPath } = useDashboardStore();
  const { toast } = useToast();

  const challengeId = useMemo(() => searchParams.get("challengeId") ?? "", [searchParams]);
  const shouldUnlockSession = useMemo(() => searchParams.get("unlock") === "1", [searchParams]);
  const [code, setCode] = useState("");

  const verifyMutation = useMutation({
    mutationFn: () => api.auth.verifyMfa({ challengeId, code }),
    onSuccess: (data) => {
      if (!data.accessToken || !data.refreshToken) {
        toast({
          variant: "error",
          title: "Verification MFA invalide",
          description: "La reponse est incomplete.",
        });
        return;
      }

      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      if (shouldUnlockSession) {
        unlockSession();
        setUnlockingInProgress(false);
        router.push(preLockPath || "/dashboard");
        return;
      }
      setUnlockingInProgress(false);
      router.push("/dashboard");
    },
    onError: () => {
      // Réinitialiser le flag si MFA échoue
      setUnlockingInProgress(false);
      toast({
        variant: "error",
        title: "Code MFA invalide",
        description: "Verifiez votre code et reessayez.",
      });
    },
  });

  if (!challengeId) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <BrandLogo className={AUTH_LOGO_CLASS} priority />
          <h2 className="text-[1.5rem] font-semibold tracking-tight">MFA requis</h2>
          <p className="text-sm text-muted-foreground">Le challenge MFA est manquant. Reconnectez-vous.</p>
          <Button className="h-11 rounded-full" onClick={() => router.push("/login")}>Retour a la connexion</Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <BrandLogo className={AUTH_LOGO_CLASS} priority />
          <h2 className="text-[1.75rem] font-semibold tracking-tight">Verification MFA</h2>
          <p className="text-sm text-muted-foreground">Entrez le code a 6 chiffres de votre application d&apos;authentification.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="mfa-code">Code MFA</label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            className="h-11 rounded-xl"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
          />
        </div>

        <Button
          className="h-11 w-full rounded-full"
          onClick={() => verifyMutation.mutate()}
          disabled={verifyMutation.isPending || code.length !== 6}
        >
          {verifyMutation.isPending ? "Verification..." : "Verifier"}
        </Button>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => router.push("/login")}>Retour</Button>
        </div>
      </div>
    </AuthShell>
  );
}
