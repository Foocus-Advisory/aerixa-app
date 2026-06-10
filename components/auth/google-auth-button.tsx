"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthErrorToast } from "@/lib/auth-error-toast";
import { dictionaries, type Locale } from "@/lib/i18n";
import type { LoginResponse } from "@/lib/types";
import { useToast } from "@/components/ui/toast-provider";

type GoogleAuthButtonProps = {
  locale: Locale;
  mode: "login" | "register";
  onSuccess: (data: LoginResponse) => void;
  buttonWidth?: number;
  compact?: boolean;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number;
      logo_alignment?: "left" | "center";
      locale?: string;
    },
  ) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
    __aerixaGoogleInitializedClientId?: string;
  }
}

const GOOGLE_SCRIPT_ID = "aerixa-google-gsi-script";

export function GoogleAuthButton({ locale, mode, onSuccess, buttonWidth = 360, compact = false }: GoogleAuthButtonProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const t = dictionaries[locale];
  const googleLocale = locale === "fr" ? "fr" : "en";

  onSuccessRef.current = onSuccess;

  const configQuery = useQuery({
    queryKey: ["google-auth-config"],
    queryFn: () => api.auth.googleConfig(),
  });

  const authMutation = useMutation({
    mutationFn: (idToken: string) =>
      mode === "login" ? api.auth.googleLogin({ idToken }) : api.auth.googleRegister({ idToken }),
    onSuccess,
    onError: (error) => {
      const message = getAuthErrorToast(error, locale);
      toast({
        variant: "error",
        title: message.title,
        description: message.description,
      });
    },
  });

  const mutateRef = useRef(authMutation.mutate);
  mutateRef.current = authMutation.mutate;

  useEffect(() => {
    if (!configQuery.data?.enabled || !configQuery.data.clientId || !containerRef.current) {
      return;
    }

    const renderGoogleButton = () => {
      if (!containerRef.current || !window.google?.accounts?.id) {
        return;
      }

      containerRef.current.innerHTML = "";

      if (window.__aerixaGoogleInitializedClientId !== configQuery.data.clientId) {
        window.google.accounts.id.initialize({
          client_id: configQuery.data.clientId,
          callback: ({ credential }) => {
            if (!credential) {
              toast({
                variant: "error",
                title: t.authGoogleTokenMissingTitle,
                description: t.authGoogleTokenMissingDescription,
              });
              return;
            }
            mutateRef.current(credential, {
              onSuccess: (data) => onSuccessRef.current(data),
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.__aerixaGoogleInitializedClientId = configQuery.data.clientId;
      }

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        text: mode === "register" ? "signup_with" : "signin_with",
        shape: "pill",
        width: buttonWidth,
        logo_alignment: "left",
        locale: googleLocale,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
      const existingScriptLocale = existingScript?.dataset.googleLocale;
      if (existingScript && existingScriptLocale !== googleLocale) {
        existingScript.remove();
      }

      const script =
        existingScript && existingScriptLocale === googleLocale ? existingScript : document.createElement("script");

      if (script !== existingScript) {
        script.id = GOOGLE_SCRIPT_ID;
        script.dataset.googleLocale = googleLocale;
        script.src = `https://accounts.google.com/gsi/client?hl=${googleLocale}`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.addEventListener("load", renderGoogleButton, { once: true });
      return () => {
        script.removeEventListener("load", renderGoogleButton);
        window.google?.accounts?.id.cancel();
      };
    }

    return () => {
      window.google?.accounts?.id.cancel();
    };
  }, [buttonWidth, configQuery.data?.clientId, configQuery.data?.enabled, googleLocale, mode, t.authGoogleTokenMissingDescription, t.authGoogleTokenMissingTitle, toast]);

  if (!configQuery.data?.enabled) {
    return null;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {!compact ? <span className="h-px flex-1 bg-border/70" /> : null}
        <span>{t.authGoogleDivider}</span>
        {!compact ? <span className="h-px flex-1 bg-border/70" /> : null}
      </div>
      <div className="flex justify-center">
        <div ref={containerRef} className={authMutation.isPending ? "pointer-events-none opacity-70" : undefined} />
      </div>
    </div>
  );
}
