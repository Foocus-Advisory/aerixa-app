"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildPermissionSet, canAccessTab } from "@/lib/permissions";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTokenExpired } from "@/lib/jwt-utils";

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("candidate-applications");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["candidate-applications", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) return null;

  const canAccess = canAccessTab(permissionSet, "candidate-applications");

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Candidats" : "Candidates" },
              { label: locale === "fr" ? "Candidatures" : "Applications" },
            ]}
          />

          <div className="grid gap-6">
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{locale === "fr" ? "Candidatures" : "Applications"}</CardTitle>
                  <CardDescription>
                    {locale === "fr"
                      ? "Pipeline et transitions des candidatures par etablissement."
                      : "Pipeline and stage transitions for candidate applications."}
                  </CardDescription>
                </div>
                <Badge className="w-fit" variant="outline">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {locale === "fr" ? "Section : Candidatures" : "Section: Applications"}
                </Badge>
              </CardHeader>
            </Card>

            <Card className="border-border/60 bg-card/70">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {locale === "fr" ? "Module en cours de construction" : "Module under construction"}
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {canAccess
                    ? locale === "fr"
                      ? "La vue pipeline des candidatures et les transitions d'etapes seront disponibles ici prochainement."
                      : "The applications pipeline view and stage transitions will be available here soon."
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
