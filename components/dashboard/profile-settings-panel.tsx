"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Undo2,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { getGradientButtonClass } from "@/lib/button-gradients";
import { decodeJwt } from "@/lib/jwt-utils";
import type { Locale } from "@/lib/i18n";
import type { UpdateProfileRequest, UserResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast-provider";
import { phonePrefixes } from "@/lib/phone-prefixes";

type ProfileSettingsPanelProps = {
  accessToken: string;
  locale: Locale;
  onLog: (entry: string) => void;
};

function normalizeClaim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function computeInitials(user: Pick<UserResponse, "firstName" | "lastName" | "username" | "email"> | null) {
  const source = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.username || user?.email || "AU";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.readAsDataURL(file);
  });
}

function splitPhoneNumber(value: string) {
  const normalized = (value ?? "").replace(/\s+/g, "").trim();
  const sortedPrefixes = [...phonePrefixes].sort((a, b) => b.value.length - a.value.length);
  const detectedPrefix = sortedPrefixes.find((item) => normalized.startsWith(item.value));

  if (!detectedPrefix) {
    return { prefix: "+237", local: normalized };
  }

  return {
    prefix: detectedPrefix.value,
    local: normalized.slice(detectedPrefix.value.length),
  };
}

function resolveProfilePhotoUrl(rawUrl: string | undefined) {
  const normalized = (rawUrl ?? "").trim();
  if (!normalized) {
    return "";
  }

  if (/^(data:|blob:)/i.test(normalized)) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return "";
}

export function ProfileSettingsPanel({ accessToken, locale, onLog }: ProfileSettingsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const payload = decodeJwt(accessToken);
  const userId = normalizeClaim(payload?.sub);
  const userEmail = normalizeClaim(payload?.email) || normalizeClaim(payload?.preferred_username);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [serverDraft, setServerDraft] = useState<Partial<UpdateProfileRequest>>({});
  const [avatarPreview, setAvatarPreview] = useState("");
  const [persistedAvatarUrl, setPersistedAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileQuery = useQuery({
    queryKey: ["settings-profile", userId || userEmail],
    enabled: Boolean(accessToken && (userId || userEmail)),
    queryFn: () => api.users.getMe(accessToken),
  });

  const locationOptionsQuery = useQuery({
    queryKey: ["profile-location-options"],
    enabled: Boolean(accessToken),
    queryFn: () => api.users.getProfileLocationOptions(accessToken),
  });

  const currentUser = profileQuery.data ?? null;
  const mergedProfile = {
    username: serverDraft.username ?? currentUser?.username ?? "",
    firstName: serverDraft.firstName ?? currentUser?.firstName ?? "",
    lastName: serverDraft.lastName ?? currentUser?.lastName ?? "",
    phoneNumber: serverDraft.phoneNumber ?? currentUser?.phoneNumber ?? "",
    addressLine1: serverDraft.addressLine1 ?? currentUser?.addressLine1 ?? "",
    addressLine2: serverDraft.addressLine2 ?? currentUser?.addressLine2 ?? "",
    city: serverDraft.city ?? currentUser?.city ?? "",
    postalCode: serverDraft.postalCode ?? currentUser?.postalCode ?? "",
    country: serverDraft.country ?? currentUser?.country ?? "",
    bio: serverDraft.bio ?? currentUser?.bio ?? "",
  };

  const { prefix: selectedPhonePrefix, local: localPhoneNumber } = splitPhoneNumber(mergedProfile.phoneNumber);

  const countryOptions = useMemo(() => {
    const base = (locationOptionsQuery.data ?? []).map((country) => ({
      value: country.name,
      label: country.name,
      keywords: [country.code.toLowerCase(), country.name.toLowerCase()],
    }));

    const currentCountry = mergedProfile.country.trim();
    if (currentCountry && !base.some((item) => item.value.toLowerCase() === currentCountry.toLowerCase())) {
      base.push({
        value: currentCountry,
        label: currentCountry,
        keywords: [currentCountry.toLowerCase()],
      });
    }

    return base;
  }, [locationOptionsQuery.data, mergedProfile.country]);

  const cityOptions = useMemo(() => {
    const selectedCountry = (locationOptionsQuery.data ?? []).find(
      (country) => country.name.toLowerCase() === mergedProfile.country.trim().toLowerCase(),
    );

    const base = (selectedCountry?.cities ?? []).map((city) => ({
      value: city,
      label: city,
      keywords: [city.toLowerCase()],
    }));

    const currentCity = mergedProfile.city.trim();
    if (currentCity && !base.some((item) => item.value.toLowerCase() === currentCity.toLowerCase())) {
      base.push({
        value: currentCity,
        label: currentCity,
        keywords: [currentCity.toLowerCase()],
      });
    }

    return base;
  }, [locationOptionsQuery.data, mergedProfile.country, mergedProfile.city]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        throw new Error("Profil indisponible.");
      }

      const payloadToSave: UpdateProfileRequest = {
        username: mergedProfile.username.trim() || undefined,
        firstName: mergedProfile.firstName.trim() || undefined,
        lastName: mergedProfile.lastName.trim() || undefined,
        phoneNumber: (() => {
          const trimmed = mergedProfile.phoneNumber.trim();
          if (!trimmed) {
            return undefined;
          }
          const parsed = splitPhoneNumber(trimmed);
          return parsed.local ? trimmed : undefined;
        })(),
        addressLine1: mergedProfile.addressLine1.trim() || undefined,
        addressLine2: mergedProfile.addressLine2.trim() || undefined,
        city: mergedProfile.city.trim() || undefined,
        postalCode: mergedProfile.postalCode.trim() || undefined,
        country: mergedProfile.country.trim() || undefined,
        bio: mergedProfile.bio.trim() || undefined,
      };

      const updatedUser = await api.users.updateMe(accessToken, payloadToSave);
      return updatedUser;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["settings-profile", userId || userEmail], updatedUser);
      setServerDraft({});
      toast({
        title: locale === "fr" ? "Profil mis à jour" : "Profile updated",
        description:
          locale === "fr"
            ? "Les informations de profil ont été enregistrées."
            : "Profile information has been saved.",
      });
      onLog(`PROFILE UPDATE OK: ${updatedUser.email}`);
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: locale === "fr" ? "Échec de mise à jour" : "Update failed",
        description: (error as Error).message,
      });
      onLog(`PROFILE UPDATE ERROR: ${(error as Error).message}`);
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => api.users.uploadMyProfilePhoto(accessToken, file),
    onSuccess: (updatedUser) => {
      setAvatarPreview("");
      queryClient.setQueryData(["settings-profile", userId || userEmail], updatedUser);
      toast({
        title: locale === "fr" ? "Photo mise à jour" : "Photo updated",
        description:
          locale === "fr"
            ? "Votre photo de profil a été enregistrée."
            : "Your profile photo has been saved.",
      });
      onLog(`PROFILE PHOTO UPDATE OK: ${currentUser?.email ?? userEmail}`);
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: locale === "fr" ? "Échec de la mise à jour" : "Update failed",
        description: (error as Error).message,
      });
      onLog(`PROFILE PHOTO UPDATE ERROR: ${(error as Error).message}`);
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: () => api.users.deleteMyProfilePhoto(accessToken),
    onSuccess: (updatedUser) => {
      setAvatarPreview("");
      queryClient.setQueryData(["settings-profile", userId || userEmail], updatedUser);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => api.users.changeMyPassword(accessToken, { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: locale === "fr" ? "Mot de passe mis à jour" : "Password updated",
        description:
          locale === "fr"
            ? "Votre mot de passe a été changé avec succès."
            : "Your password has been changed successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: locale === "fr" ? "Échec du changement" : "Change failed",
        description: (error as Error).message,
      });
    },
  });

  useEffect(() => {
    const profilePhotoPath = currentUser?.profilePhotoUrl?.trim() ?? "";
    if (!accessToken || !profilePhotoPath) {
      setPersistedAvatarUrl("");
      return;
    }

    let cancelled = false;
    let localObjectUrl = "";

    api.users
      .getProfilePhotoBlob(accessToken, profilePhotoPath)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        localObjectUrl = URL.createObjectURL(blob);
        setPersistedAvatarUrl(localObjectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setPersistedAvatarUrl("");
        }
      });

    return () => {
      cancelled = true;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [accessToken, currentUser?.profilePhotoUrl]);

  const handleResetDraft = () => {
    setServerDraft({});
    setAvatarPreview("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleAvatarSelection = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setAvatarPreview(dataUrl);
    uploadPhotoMutation.mutate(file);
  };

  if (profileQuery.isLoading) {
    return (
      <Card className="border-border/60 bg-card/70">
        <CardContent className="flex min-h-56 items-center justify-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span>{locale === "fr" ? "Chargement du profil..." : "Loading profile..."}</span>
        </CardContent>
      </Card>
    );
  }

  if (profileQuery.isError || !currentUser) {
    return (
      <Card className="border-destructive/40 bg-card/70">
        <CardHeader>
          <CardTitle>{locale === "fr" ? "Profil indisponible" : "Profile unavailable"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Impossible de charger les informations du compte connecté."
              : "Unable to load the connected account information."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const initials = computeInitials(currentUser);
  const effectiveAvatar = avatarPreview || persistedAvatarUrl || resolveProfilePhotoUrl(currentUser.profilePhotoUrl);

  return (
    <section className="grid gap-6">
      <Card className="overflow-hidden border-border/60 bg-card/70">
        <CardContent className="relative p-0">
          <div className="h-28 bg-[radial-gradient(circle_at_top_left,rgba(87,164,255,0.35),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
          <div className="grid gap-5 px-5 pb-5 md:grid-cols-[auto,1fr,auto] md:items-end">
            <div className="-mt-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-background bg-muted text-2xl font-semibold">
              {effectiveAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={effectiveAvatar} alt={currentUser.email} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {`${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim() || currentUser.username || currentUser.email}
                </h2>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={currentUser.status === "ACTIVE" ? "success" : "outline"}>{currentUser.status}</Badge>
                {currentUser.roles.map((role) => (
                  <Badge key={role} variant="outline">{role}</Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Button variant="outline" onClick={handleResetDraft}>
                <Undo2 className="h-4 w-4" />
                {locale === "fr" ? "Réinitialiser" : "Reset"}
              </Button>
              <Button className={getGradientButtonClass("primary")} onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>
                {saveProfileMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {locale === "fr" ? "Enregistrer le profil" : "Save profile"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <div className="grid gap-6">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> {locale === "fr" ? "Informations personnelles" : "Personal information"}</CardTitle>
              <CardDescription>
                {locale === "fr"
                  ? "Données principales synchronisées avec le compte utilisateur."
                  : "Main data synchronized with the user account."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Nom d'utilisateur" : "Username"}
                <Input value={mergedProfile.username} onChange={(event) => setServerDraft((current) => ({ ...current, username: event.target.value }))} placeholder={locale === "fr" ? "nom.utilisateur" : "username"} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Email
                <Input value={currentUser.email} disabled readOnly />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Prénom" : "First name"}
                <Input value={mergedProfile.firstName} onChange={(event) => setServerDraft((current) => ({ ...current, firstName: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Nom" : "Last name"}
                <Input value={mergedProfile.lastName} onChange={(event) => setServerDraft((current) => ({ ...current, lastName: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> {locale === "fr" ? "Numéro de téléphone" : "Phone number"}</span>
                <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                  <SearchableSelect
                    options={phonePrefixes}
                    value={selectedPhonePrefix}
                    onValueChange={(prefix) => setServerDraft((current) => ({
                      ...current,
                      phoneNumber: `${prefix}${localPhoneNumber}`,
                    }))}
                    placeholder={locale === "fr" ? "Indicatif pays" : "Country code"}
                    searchPlaceholder={locale === "fr" ? "Rechercher un pays" : "Search a country"}
                  />
                  <Input
                    value={localPhoneNumber}
                    onChange={(event) => {
                      const sanitized = event.target.value.replace(/\s+/g, "");
                      setServerDraft((current) => ({
                        ...current,
                        phoneNumber: `${selectedPhonePrefix}${sanitized}`,
                      }));
                    }}
                    placeholder="6XXXXXXXX"
                  />
                </div>
              </label>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {locale === "fr" ? "Adresse et informations complémentaires" : "Address and additional information"}</CardTitle>
              <CardDescription>
                {locale === "fr"
                  ? "Champs complémentaires conservés localement tant qu'une API profil dédiée n'est pas exposée."
                  : "Additional fields kept locally until a dedicated profile API is exposed."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                {locale === "fr" ? "Adresse" : "Address"}
                <Input value={mergedProfile.addressLine1} onChange={(event) => setServerDraft((current) => ({ ...current, addressLine1: event.target.value }))} placeholder={locale === "fr" ? "Rue, quartier, immeuble" : "Street, district, building"} />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                {locale === "fr" ? "Complément d'adresse" : "Address line 2"}
                <Input value={mergedProfile.addressLine2} onChange={(event) => setServerDraft((current) => ({ ...current, addressLine2: event.target.value }))} placeholder={locale === "fr" ? "Appartement, étage, repère" : "Apartment, floor, landmark"} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Ville" : "City"}
                <SearchableSelect
                  options={cityOptions}
                  value={mergedProfile.city}
                  onValueChange={(value) => setServerDraft((current) => ({ ...current, city: value }))}
                  placeholder={locale === "fr" ? "Sélectionner une ville" : "Select a city"}
                  searchPlaceholder={locale === "fr" ? "Rechercher une ville..." : "Search a city..."}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Code postal" : "Postal code"}
                <Input value={mergedProfile.postalCode} onChange={(event) => setServerDraft((current) => ({ ...current, postalCode: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                {locale === "fr" ? "Pays" : "Country"}
                <SearchableSelect
                  options={countryOptions}
                  value={mergedProfile.country}
                  onValueChange={(value) => setServerDraft((current) => ({ ...current, country: value, city: "" }))}
                  placeholder={locale === "fr" ? "Sélectionner un pays" : "Select a country"}
                  searchPlaceholder={locale === "fr" ? "Rechercher un pays..." : "Search a country..."}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                {locale === "fr" ? "Bio / notes" : "Bio / notes"}
                <textarea
                  value={mergedProfile.bio}
                  onChange={(event) => setServerDraft((current) => ({ ...current, bio: event.target.value }))}
                  rows={4}
                  placeholder={locale === "fr" ? "Présentez rapidement votre profil" : "Briefly describe your profile"}
                  className="w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> {locale === "fr" ? "Photo de profil" : "Profile photo"}</CardTitle>
              <CardDescription>
                {locale === "fr"
                  ? "Photo synchronisée avec le backend via téléversement sécurisé."
                  : "Photo synchronized with backend using secure upload."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => handleAvatarSelection(event.target.files?.[0])}
              />
              <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-muted text-lg font-semibold">
                  {effectiveAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={effectiveAvatar} alt={currentUser.email} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadPhotoMutation.isPending}>
                    <ImagePlus className="h-4 w-4" />
                    {locale === "fr" ? "Choisir une photo" : "Choose a photo"}
                  </Button>
                  <Button variant="ghost" onClick={() => deletePhotoMutation.mutate()} disabled={deletePhotoMutation.isPending || !effectiveAvatar}>
                    {locale === "fr" ? "Retirer la photo" : "Remove photo"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> {locale === "fr" ? "Sécurité du compte" : "Account security"}</CardTitle>
              <CardDescription>
                {locale === "fr"
                  ? "Changement direct du mot de passe en session authentifiée."
                  : "Direct password change in authenticated session."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Mot de passe actuel" : "Current password"}
                <PasswordInput value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Nouveau mot de passe" : "New password"}
                <PasswordInput value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {locale === "fr" ? "Confirmer le nouveau mot de passe" : "Confirm new password"}
                <PasswordInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              <Button
                variant="outline"
                onClick={() => {
                  if (newPassword !== confirmPassword) {
                    toast({
                      variant: "error",
                      title: locale === "fr" ? "Validation" : "Validation",
                      description: locale === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.",
                    });
                    return;
                  }
                  changePasswordMutation.mutate();
                }}
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              >
                {changePasswordMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {locale === "fr" ? "Changer le mot de passe" : "Change password"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>{locale === "fr" ? "Aperçu du compte" : "Account overview"}</CardTitle>
              <CardDescription>
                {locale === "fr" ? "Informations utiles en lecture seule." : "Useful read-only information."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">{locale === "fr" ? "Dernière connexion" : "Last login"}</span>
                <span className="font-medium">{currentUser.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US") : (locale === "fr" ? "Jamais" : "Never")}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</span>
                <span className="font-medium">{new Date(currentUser.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}