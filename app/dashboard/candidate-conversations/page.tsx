"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MobileSectionTabs } from "@/components/dashboard/mobile-section-tabs";
import { buildPermissionSet, canAccessTab } from "@/lib/permissions";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTokenExpired } from "@/lib/jwt-utils";

export default function CandidateConversationsPage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("candidate-conversations");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["candidate-conversations", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) return null;

  const canAccess = canAccessTab(permissionSet, "candidate-conversations");

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Candidats" : "Candidates" },
              { label: locale === "fr" ? "Conversations WhatsApp" : "WhatsApp conversations" },
            ]}
          />

          <MobileSectionTabs permissionSet={permissionSet} />

          <div className="grid gap-6">
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {locale === "fr" ? "Conversations WhatsApp" : "WhatsApp conversations"}
                  </CardTitle>
                  <CardDescription>
                    {locale === "fr"
                      ? "Echanges WhatsApp avec les candidats par etablissement."
                      : "WhatsApp exchanges with candidates per establishment."}
                  </CardDescription>
                </div>
                <Badge className="w-fit" variant="outline">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {locale === "fr" ? "Section : Conversations WhatsApp" : "Section: WhatsApp conversations"}
                </Badge>
              </CardHeader>
            </Card>

            <Card className="border-border/60 bg-card/70">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {locale === "fr" ? "Module en cours de construction" : "Module under construction"}
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {canAccess
                    ? locale === "fr"
                      ? "La messagerie WhatsApp avec les candidats sera disponible ici prochainement."
                      : "WhatsApp messaging with candidates will be available here soon."
                    : locale === "fr"
                      ? "Vous n'avez pas la permission d'acceder a ce module."
                      : "You do not have permission to access this module."}
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
