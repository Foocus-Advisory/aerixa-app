import type {
  AcademicLevelResponse,
  AcquisitionChannelImportResultResponse,
  AcquisitionChannelResponse,
  AssignParentAdminRequest,
  AssignedOperatorResponse,
  ApiSuccessResponse,
  CandidateApplicationAuditEntryResponse,
  CandidateApplicationResponse,
  CandidateApplicationStageHistoryResponse,
  CandidateConversationMessageResponse,
  CandidateConversationResponse,
  CandidateImportResultResponse,
  CandidateNoteAttachmentResponse,
  CandidateNoteResponse,
  CandidateResponse,
  ChangePasswordRequest,
  CreateAcademicLevelRequest,
  CreateAcquisitionChannelRequest,
  CreateCandidateApplicationRequest,
  CreateCandidateConversationRequest,
  CreateCandidateNoteRequest,
  CreateCandidateRequest,
  CreateEntryDiplomaRequest,
  CreateEstablishmentRequest,
  CreateFunnelStageRequest,
  CreateFunnelStageTransitionRequest,
  CreateProgramTrackLevelRequest,
  CreateProgramTrackRequest,
  CreateUserRequest,
  EligibleProgramTrackLevelResponse,
  EntryDiplomaResponse,
  EstablishmentResponse,
  EstablishmentWhatsappConfigResponse,
  UpdateEstablishmentWhatsappConfigRequest,
  FunnelStageImportResultResponse,
  FunnelStageResponse,
  FunnelStageTransitionResponse,
  GoogleAuthConfigResponse,
  GoogleAuthRequest,
  TransitionCandidateApplicationRequest,
  UpdateProfileRequest,
  UpdateAcademicLevelRequest,
  UpdateAcquisitionChannelRequest,
  UpdateCandidateNoteRequest,
  UpdateCandidateRequest,
  UpdateEntryDiplomaRequest,
  UpdateEstablishmentRequest,
  UpdateFunnelStageRequest,
  UpdateFunnelStageTransitionRequest,
  UpdatePipelineViewPreferenceRequest,
  UpdateProgramTrackLevelRequest,
  UpdateProgramTrackRequest,
  UpdateUserRequest,
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  PagedResponse,
  PasswordResetRequestResult,
  PipelineViewPreferenceResponse,
  SendCandidateConversationMessageRequest,
  NotificationBulkActionResponse,
  AuditLogResponse,
  AuditDashboardSummaryResponse,
  NotificationReadStatus,
  NotificationResponse,
  NotificationUnreadCountResponse,
  OperatorEstablishmentAssignmentResponse,
  OperatorPerformanceResponse,
  ProfileLocationCountryResponse,
  ProgramTrackLevelResponse,
  ProgramTrackResponse,
  RbacPermissionResponse,
  RbacRoleResponse,
  UpdateRbacRolePermissionsRequest,
  RegisterRequest,
  RegisterResponse,
  SessionResponse,
  UserImportResultResponse,
  EntryDiplomaImportResultResponse,
  AcademicLevelImportResultResponse,
  ProgramTrackImportResultResponse,
  UserOptionResponse,
  UserResponse,
  UserStatusStatsResponse,
} from "@/lib/types";
import { useDashboardStore } from "@/store/dashboard-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// State pour gérer le refresh token en cours (évite les race conditions)
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiErrorPayload = {
  errorCode?: string;
  message?: string;
  messageKey?: string;
  timestamp?: string;
  path?: string;
  statusCode?: number;
  details?: unknown;
};

function normalizeApiPath(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return "/";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return "/";
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export class ApiError extends Error {
  readonly errorCode?: string;
  readonly messageKey?: string;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly path?: string;
  readonly timestamp?: string;

  constructor(statusCode: number, payload?: ApiErrorPayload) {
    super(payload?.message ?? `Erreur API (${statusCode})`);
    this.name = "ApiError";
    this.errorCode = payload?.errorCode;
    this.messageKey = payload?.messageKey;
    this.statusCode = statusCode;
    this.details = payload?.details;
    this.path = payload?.path;
    this.timestamp = payload?.timestamp;
  }
}

function buildNetworkApiError(path: string): ApiError {
  return new ApiError(0, {
    errorCode: "NETWORK_ERROR",
    message: "Impossible de contacter le serveur. Verifiez la connexion et l'URL API.",
    messageKey: "error.network_error",
    path,
    statusCode: 0,
  });
}

type BrowserMetadata = {
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function detectBrowserName(userAgent: string) {
  if (/Edg\//i.test(userAgent)) {
    return "Edge";
  }
  if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) {
    return "Opera";
  }
  if (/Firefox\//i.test(userAgent)) {
    return "Firefox";
  }
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent) && !/OPR\//i.test(userAgent)) {
    return "Chrome";
  }
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent) && !/Chromium\//i.test(userAgent)) {
    return "Safari";
  }
  return "Navigateur";
}

function detectPlatformName(userAgent: string) {
  const platform = typeof navigator !== "undefined" ? navigator.platform : "";

  if (/iPhone/i.test(userAgent)) {
    return "iPhone";
  }
  if (/iPad/i.test(userAgent)) {
    return "iPad";
  }
  if (/Android/i.test(userAgent)) {
    return "Android";
  }
  if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
    return "Windows";
  }
  if (/Mac/i.test(platform) || /Mac OS/i.test(userAgent)) {
    return "macOS";
  }
  if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
    return "Linux";
  }

  return "cet appareil";
}

function buildReadableDeviceName(userAgent: string) {
  return `${detectBrowserName(userAgent)} sur ${detectPlatformName(userAgent)}`;
}

function getBrowserMetadata(): BrowserMetadata {
  if (typeof window === "undefined") {
    return {};
  }

  const storageKey = "aerixa-browser-id";
  let deviceName = window.localStorage.getItem(storageKey);
  const userAgent = window.navigator.userAgent;

  if (!deviceName || isUuidLike(deviceName)) {
    deviceName = buildReadableDeviceName(userAgent);
    window.localStorage.setItem(storageKey, deviceName);
  }

  const deviceType = /Mobi|Android/i.test(userAgent) ? "MOBILE" : /Tablet|iPad/i.test(userAgent) ? "TABLET" : "DESKTOP";

  return { deviceName, deviceType, userAgent };
}

async function apiRequest<T>(
  path: string,
  method: HttpMethod,
  payload?: unknown,
  token?: string,
): Promise<T> {
  return apiRequestInternal<T>(path, method, payload, token, false);
}

async function apiRequestInternal<T>(
  path: string,
  method: HttpMethod,
  payload?: unknown,
  token?: string,
  isRetry: boolean = false,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const browserMetadata = getBrowserMetadata();

  if (browserMetadata.deviceName) {
    headers["X-Device-Name"] = browserMetadata.deviceName;
  }

  if (browserMetadata.deviceType) {
    headers["X-Device-Type"] = browserMetadata.deviceType;
  }

  if (browserMetadata.userAgent) {
    headers["X-Client-User-Agent"] = browserMetadata.userAgent;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store",
    });
  } catch {
    throw buildNetworkApiError(path);
  }

  if (!response.ok) {
    let errorBody: ApiErrorPayload | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorPayload;
    } catch {
      // Ignore parse errors and fallback to default message.
    }

    // Gestion du 401: essayer de rafraîchir le token
    if (response.status === 401 && !isRetry && token && typeof window !== "undefined") {
      try {
        const newTokens = await refreshAccessToken();
        if (newTokens) {
          // Réessayer la requête avec le nouveau token
          return apiRequestInternal<T>(path, method, payload, newTokens.accessToken, true);
        }
      } catch {
        // Refresh a échoué, continuer avec l'erreur originale
      }
    }

    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (response.status === 202 || response.status === 205) {
    const hasBody = (response.headers.get("content-length") ?? "0") !== "0";
    if (!hasBody) {
      return undefined as T;
    }
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return undefined as T;
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return undefined as T;
  }

  return JSON.parse(raw) as T;
}

async function apiRequestBlob(path: string, method: HttpMethod, token?: string, body?: BodyInit): Promise<{ blob: Blob; fileName: string }> {
  const headers: HeadersInit = {};

  const browserMetadata = getBrowserMetadata();
  if (browserMetadata.deviceName) {
    headers["X-Device-Name"] = browserMetadata.deviceName;
  }
  if (browserMetadata.deviceType) {
    headers["X-Device-Type"] = browserMetadata.deviceType;
  }
  if (browserMetadata.userAgent) {
    headers["X-Client-User-Agent"] = browserMetadata.userAgent;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    throw buildNetworkApiError(path);
  }

  if (!response.ok) {
    let errorBody: ApiErrorPayload | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorPayload;
    } catch {
      // Ignore parse errors.
    }
    throw new ApiError(response.status, errorBody);
  }

  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const fileNameMatch = contentDisposition.match(/filename=([^;]+)/i);
  const fileName = fileNameMatch?.[1]?.replace(/"/g, "") ?? "download.xlsx";

  return {
    blob: await response.blob(),
    fileName,
  };
}

async function apiRequestMultipart<T>(path: string, method: "POST" | "PATCH", formData: FormData, token?: string): Promise<T> {
  const headers: HeadersInit = {};

  const browserMetadata = getBrowserMetadata();
  if (browserMetadata.deviceName) {
    headers["X-Device-Name"] = browserMetadata.deviceName;
  }
  if (browserMetadata.deviceType) {
    headers["X-Device-Type"] = browserMetadata.deviceType;
  }
  if (browserMetadata.userAgent) {
    headers["X-Client-User-Agent"] = browserMetadata.userAgent;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw buildNetworkApiError(path);
  }

  if (!response.ok) {
    let errorBody: ApiErrorPayload | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorPayload;
    } catch {
      // Ignore parse errors.
    }
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Rafraîchit l'access token en utilisant le refresh token stocké
 * Retourne les nouveaux tokens ou null si le refresh a échoué
 */
async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // Si un refresh est déjà en cours, attendre son résultat
  if (refreshPromise) {
    return refreshPromise;
  }

  const store = useDashboardStore.getState();
  const currentRefreshToken = store.refreshToken;

  if (!currentRefreshToken) {
    // Pas de refresh token disponible
    return null;
  }

  // Créer la promesse de refresh et la stocker
  refreshPromise = (async () => {
    try {
      // Appel au backend pour rafraîchir les tokens
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
        cache: "no-store",
      });

      if (!response.ok) {
        // Le refresh a échoué (refresh token expiré ou invalide)
        store.clearTokens();
        // Rediriger vers login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return null;
      }

      const data = (await response.json()) as LoginResponse;
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;

      if (!newAccessToken || !newRefreshToken) {
        // Réponse invalide du serveur
        store.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return null;
      }

      // Sauvegarder les nouveaux tokens
      store.setTokens({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      // Erreur réseau ou autre
      console.error("Erreur lors du refresh token:", error);
      store.clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null;
    } finally {
      // Réinitialiser la promesse après que le refresh soit terminé
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const api = {
  auth: {
    login: (payload: LoginRequest) =>
      apiRequest<LoginResponse>("/api/v1/auth/login", "POST", payload),
    register: (payload: RegisterRequest) =>
      apiRequest<RegisterResponse>("/api/v1/auth/register", "POST", payload),
    googleConfig: () =>
      apiRequest<GoogleAuthConfigResponse>("/api/v1/auth/google/config", "GET"),
    googleLogin: (payload: GoogleAuthRequest) =>
      apiRequest<LoginResponse>("/api/v1/auth/google/login", "POST", payload),
    googleRegister: (payload: GoogleAuthRequest) =>
      apiRequest<LoginResponse>("/api/v1/auth/google/register", "POST", payload),
    refresh: (refreshToken: string) =>
      apiRequest<LoginResponse>("/api/v1/auth/refresh", "POST", { refreshToken }),
    verifyMfa: (payload: MfaVerifyRequest) =>
      apiRequest<LoginResponse>("/api/v1/auth/verify-mfa", "POST", payload),
    logout: (token: string) => apiRequest<void>("/api/v1/auth/logout", "POST", undefined, token),
    passwordResetRequest: (email: string) =>
      apiRequest<ApiSuccessResponse<PasswordResetRequestResult>>("/api/v1/auth/password-reset/request", "POST", { email })
        .then((response) => response?.data),
    passwordResetConfirm: (token: string, newPassword: string) =>
      apiRequest<{ message: string }>("/api/v1/auth/password-reset/confirm", "POST", {
        token,
        newPassword,
      }),
  },
  sessions: {
    list: (token: string) =>
      apiRequest<SessionResponse[]>("/api/v1/auth/sessions", "GET", undefined, token),
    revoke: (token: string, sessionId: string) =>
      apiRequest<void>(`/api/v1/auth/sessions/${sessionId}`, "DELETE", undefined, token),
    revokeOthers: (token: string) =>
      apiRequest<void>("/api/v1/auth/sessions/revoke-others", "POST", undefined, token),
    listAdmin: (
      token: string,
      params: {
        page: number;
        size: number;
        status?: "ALL" | "ACTIVE" | "REVOKED" | "EXPIRED";
        userId?: string;
        userQuery?: string;
        startedFrom?: string;
        startedTo?: string;
      },
    ) => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", `${params.page}`);
      searchParams.set("size", `${params.size}`);
      if (params.status && params.status !== "ALL") {
        searchParams.set("status", params.status);
      }
      if (params.userId) {
        searchParams.set("userId", params.userId);
      }
      if (params.userQuery) {
        searchParams.set("userQuery", params.userQuery);
      }
      if (params.startedFrom) {
        searchParams.set("startedFrom", params.startedFrom);
      }
      if (params.startedTo) {
        searchParams.set("startedTo", params.startedTo);
      }

      return apiRequest<PagedResponse<SessionResponse>>(`/api/v1/sessions?${searchParams.toString()}`, "GET", undefined, token);
    },
    exportAdmin: (
      token: string,
      params: {
        status?: "ALL" | "ACTIVE" | "REVOKED" | "EXPIRED";
        userId?: string;
        userQuery?: string;
        startedFrom?: string;
        startedTo?: string;
      },
      format: "csv" | "xlsx",
    ) => {
      const searchParams = new URLSearchParams();
      if (params.status && params.status !== "ALL") {
        searchParams.set("status", params.status);
      }
      if (params.userId) {
        searchParams.set("userId", params.userId);
      }
      if (params.userQuery) {
        searchParams.set("userQuery", params.userQuery);
      }
      if (params.startedFrom) {
        searchParams.set("startedFrom", params.startedFrom);
      }
      if (params.startedTo) {
        searchParams.set("startedTo", params.startedTo);
      }
      searchParams.set("format", format);

      return apiRequestBlob(`/api/v1/sessions/export?${searchParams.toString()}`, "GET", token);
    },
    getAdmin: (token: string, sessionId: string) =>
      apiRequest<SessionResponse>(`/api/v1/sessions/${sessionId}`, "GET", undefined, token),
    revokeAdmin: (token: string, sessionId: string) =>
      apiRequest<void>(`/api/v1/sessions/${sessionId}/revoke`, "POST", undefined, token),
  },
  users: {
    list: (token: string, page = 0, size = 20, status?: "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "DELETED" | "ALL") =>
      apiRequest<PagedResponse<UserResponse>>(
        `/api/v1/users?page=${page}&size=${size}&sortBy=createdAt&direction=desc${status && status !== "ALL" ? `&status=${status}` : ""}`,
        "GET",
        undefined,
        token,
      ),
    stats: (token: string) => apiRequest<UserStatusStatsResponse>("/api/v1/users/stats", "GET", undefined, token),
    get: (token: string, id: string) => apiRequest<UserResponse>(`/api/v1/users/${id}`, "GET", undefined, token),
    getMe: (token: string) => apiRequest<UserResponse>("/api/v1/users/me", "GET", undefined, token),
    options: (token: string) => apiRequest<UserOptionResponse[]>("/api/v1/users/options", "GET", undefined, token),
    getProfileLocationOptions: (token: string) =>
      apiRequest<ProfileLocationCountryResponse[]>("/api/v1/users/profile-location-options", "GET", undefined, token),
    create: (token: string, payload: CreateUserRequest) =>
      apiRequest<ApiSuccessResponse<UserResponse>>("/api/v1/users", "POST", payload, token)
        .then((response) => {
          if (!response?.data) {
            throw new Error("Reponse de creation utilisateur invalide");
          }
          return response.data;
        }),
    update: (token: string, id: string, payload: UpdateUserRequest) =>
      apiRequest<UserResponse>(`/api/v1/users/${id}`, "PATCH", payload, token),
    assignParentAdmin: (token: string, id: string, payload: AssignParentAdminRequest) =>
      apiRequest<UserResponse>(`/api/v1/users/${id}/parent-admin`, "PATCH", payload, token),
    listAssignedEstablishments: (token: string, id: string) =>
      apiRequest<OperatorEstablishmentAssignmentResponse[]>(`/api/v1/users/${id}/establishments`, "GET", undefined, token),
    assignEstablishment: (token: string, id: string, establishmentId: string) =>
      apiRequest<OperatorEstablishmentAssignmentResponse>(
        `/api/v1/users/${id}/establishments/${establishmentId}`,
        "PUT",
        undefined,
        token,
      ),
    unassignEstablishment: (token: string, id: string, establishmentId: string) =>
      apiRequest<void>(`/api/v1/users/${id}/establishments/${establishmentId}`, "DELETE", undefined, token),
    updateMe: (token: string, payload: UpdateProfileRequest) =>
      apiRequest<UserResponse>("/api/v1/users/me", "PATCH", payload, token),
    uploadMyProfilePhoto: (token: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequestMultipart<UserResponse>("/api/v1/users/me/profile-photo", "POST", formData, token);
    },
    getProfilePhotoBlob: async (token: string, pathOrUrl: string) => {
      const normalizedPath = normalizeApiPath(pathOrUrl);

      try {
        const response = await apiRequestBlob(normalizedPath, "GET", token);
        return response.blob;
      } catch (error) {
        const isForbidden = error instanceof ApiError && error.statusCode === 403;
        const isUserPhotoPath = /^\/api\/v1\/users\/[0-9a-f-]{36}\/profile-photo$/i.test(normalizedPath);

        if (isForbidden && isUserPhotoPath) {
          const fallbackResponse = await apiRequestBlob("/api/v1/users/me/profile-photo", "GET", token);
          return fallbackResponse.blob;
        }

        throw error;
      }
    },
    deleteMyProfilePhoto: (token: string) =>
      apiRequest<UserResponse>("/api/v1/users/me/profile-photo", "DELETE", undefined, token),
    changeMyPassword: (token: string, payload: ChangePasswordRequest) =>
      apiRequest<{ message: string }>("/api/v1/users/me/change-password", "POST", payload, token),
    toggleStatus: (token: string, id: string) =>
      apiRequest<UserResponse>(`/api/v1/users/${id}/status`, "PATCH", undefined, token),
    revokeSessions: (token: string, id: string) =>
      apiRequest<{ message: string }>(`/api/v1/users/${id}/revoke-sessions`, "POST", undefined, token),
    exportExcel: (token: string, status?: "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "DELETED" | "ALL") =>
      apiRequestBlob(`/api/v1/users/export${status && status !== "ALL" ? `?status=${status}` : ""}`, "GET", token),
    importTemplate: (token: string) => apiRequestBlob("/api/v1/users/import-template", "GET", token),
    importExcel: async (token: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/v1/users/import`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        cache: "no-store",
      });

      if (!response.ok) {
        let errorBody: ApiErrorPayload | undefined;
        try {
          errorBody = (await response.json()) as ApiErrorPayload;
        } catch {
          // Ignore parse errors.
        }
        throw new ApiError(response.status, errorBody);
      }

      return (await response.json()) as UserImportResultResponse;
    },
    softDelete: (token: string, id: string) =>
      apiRequest<{ message: string }>(`/api/v1/users/${id}`, "DELETE", undefined, token),
    restore: (token: string, id: string) =>
      apiRequest<{ message: string }>(`/api/v1/users/${id}/restore`, "PATCH", undefined, token),
    hardDelete: (token: string, id: string) =>
      apiRequest<{ message: string }>(`/api/v1/users/${id}/hard`, "DELETE", undefined, token),
    resendInitialPassword: (token: string, id: string) =>
      apiRequest<ApiSuccessResponse<PasswordResetRequestResult>>(`/api/v1/users/${id}/resend-initial-password`, "POST", undefined, token)
        .then((response) => response?.data),
    resetPassword: (token: string, id: string, password?: string) =>
      apiRequest<ApiSuccessResponse<PasswordResetRequestResult>>(
        `/api/v1/users/${id}/reset-password`,
        "POST",
        password ? { password } : undefined,
        token,
      ).then((response) => response?.data),
  },
  rbac: {
    permissions: {
      list: (token: string) =>
        apiRequest<RbacPermissionResponse[]>("/api/v1/rbac/permissions", "GET", undefined, token),
    },
    roles: {
      list: (token: string) =>
        apiRequest<RbacRoleResponse[]>("/api/v1/rbac/roles", "GET", undefined, token),
      updatePermissions: (token: string, roleId: string, permissionIds: string[]) =>
        apiRequest<RbacRoleResponse>(
          `/api/v1/rbac/roles/${roleId}/permissions`,
          "PATCH",
          { permissionIds } satisfies UpdateRbacRolePermissionsRequest,
          token,
        ),
    },
  },
  notifications: {
    list: (token: string, page = 0, size = 10, readStatus: NotificationReadStatus = "ALL") =>
      apiRequest<PagedResponse<NotificationResponse>>(
        `/api/v1/notifications?page=${page}&size=${size}&readStatus=${readStatus}`,
        "GET",
        undefined,
        token,
      ),
    unreadCount: (token: string) =>
      apiRequest<NotificationUnreadCountResponse>("/api/v1/notifications/unread-count", "GET", undefined, token),
    setReadStatus: (token: string, id: string, read: boolean) =>
      apiRequest<NotificationResponse>(`/api/v1/notifications/${id}/read-status`, "PATCH", { read }, token),
    setReadStatusBulk: (token: string, ids: string[], read: boolean) =>
      apiRequest<NotificationBulkActionResponse>("/api/v1/notifications/read-status", "PATCH", { ids, read }, token),
    delete: (token: string, id: string) =>
      apiRequest<void>(`/api/v1/notifications/${id}`, "DELETE", undefined, token),
    deleteBulk: (token: string, ids: string[]) =>
      apiRequest<NotificationBulkActionResponse>("/api/v1/notifications/bulk-delete", "POST", { ids }, token),
  },
  auditLogs: {
    list: (
      token: string,
      params: {
        page: number;
        size: number;
        search?: string;
        action?: string;
        status?: "ALL" | "OK" | "ERROR" | "INFO";
      },
    ) => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", `${params.page}`);
      searchParams.set("size", `${params.size}`);
      if (params.search && params.search.trim().length > 0) {
        searchParams.set("search", params.search.trim());
      }
      if (params.action && params.action !== "ALL") {
        searchParams.set("action", params.action);
      }
      if (params.status && params.status !== "ALL") {
        searchParams.set("status", params.status);
      }

      return apiRequest<PagedResponse<AuditLogResponse>>(`/api/v1/audit-logs?${searchParams.toString()}`, "GET", undefined, token);
    },
    listMine: (
      token: string,
      params: {
        page: number;
        size: number;
        search?: string;
        action?: string;
        status?: "ALL" | "OK" | "ERROR" | "INFO";
      },
    ) => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", `${params.page}`);
      searchParams.set("size", `${params.size}`);
      if (params.search && params.search.trim().length > 0) {
        searchParams.set("search", params.search.trim());
      }
      if (params.action && params.action !== "ALL") {
        searchParams.set("action", params.action);
      }
      if (params.status && params.status !== "ALL") {
        searchParams.set("status", params.status);
      }
      return apiRequest<PagedResponse<AuditLogResponse>>(`/api/v1/audit-logs/me?${searchParams.toString()}`, "GET", undefined, token);
    },
    summary: (token: string) => apiRequest<AuditDashboardSummaryResponse>("/api/v1/audit-logs/summary", "GET", undefined, token),
  },
  configuration: {
    establishments: {
      create: (token: string, payload: CreateEstablishmentRequest) =>
        apiRequest<EstablishmentResponse>("/api/v1/establishments", "POST", payload, token),
      list: (token: string) =>
        apiRequest<EstablishmentResponse[]>("/api/v1/establishments", "GET", undefined, token),
      get: (token: string, id: string) =>
        apiRequest<EstablishmentResponse>(`/api/v1/establishments/${id}`, "GET", undefined, token),
      update: (token: string, id: string, payload: UpdateEstablishmentRequest) =>
        apiRequest<EstablishmentResponse>(`/api/v1/establishments/${id}`, "PATCH", payload, token),
      listOperators: (token: string, id: string) =>
        apiRequest<AssignedOperatorResponse[]>(`/api/v1/establishments/${id}/operators`, "GET", undefined, token),
      listOperatorPerformance: (token: string, id: string) =>
        apiRequest<OperatorPerformanceResponse[]>(`/api/v1/establishments/${id}/operator-performance`, "GET", undefined, token),
      uploadLogo: (token: string, id: string, file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiRequestMultipart<EstablishmentResponse>(`/api/v1/establishments/${id}/logo`, "POST", formData, token);
      },
      getLogoBlob: (token: string, id: string) =>
        apiRequestBlob(`/api/v1/establishments/${id}/logo`, "GET", token).then((response) => response.blob),
      deleteLogo: (token: string, id: string) =>
        apiRequest<EstablishmentResponse>(`/api/v1/establishments/${id}/logo`, "DELETE", undefined, token),
      delete: (token: string, id: string) =>
        apiRequest<EstablishmentResponse>(`/api/v1/establishments/${id}`, "DELETE", undefined, token),
      activate: (token: string, id: string) =>
        apiRequest<EstablishmentResponse>(`/api/v1/establishments/${id}/activate`, "POST", undefined, token),
      deactivate: (token: string, id: string) =>
        apiRequest<EstablishmentResponse>(`/api/v1/establishments/${id}/deactivate`, "POST", undefined, token),
    },
    entryDiplomas: {
      create: (token: string, payload: CreateEntryDiplomaRequest) =>
        apiRequest<EntryDiplomaResponse>("/api/v1/entry-diplomas", "POST", payload, token),
      list: (token: string, establishmentId: string) =>
        apiRequest<EntryDiplomaResponse[]>(`/api/v1/entry-diplomas?establishmentId=${establishmentId}`, "GET", undefined, token),
      get: (token: string, id: string, establishmentId: string) =>
        apiRequest<EntryDiplomaResponse>(`/api/v1/entry-diplomas/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, id: string, establishmentId: string, payload: UpdateEntryDiplomaRequest) =>
        apiRequest<EntryDiplomaResponse>(`/api/v1/entry-diplomas/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
      delete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/entry-diplomas/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      activate: (token: string, id: string, establishmentId: string) =>
        apiRequest<EntryDiplomaResponse>(`/api/v1/entry-diplomas/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
      deactivate: (token: string, id: string, establishmentId: string) =>
        apiRequest<EntryDiplomaResponse>(`/api/v1/entry-diplomas/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
      hardDelete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/entry-diplomas/${id}/hard-delete?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      exportExcel: (token: string, establishmentId: string) =>
        apiRequestBlob(`/api/v1/entry-diplomas/export?establishmentId=${establishmentId}`, "GET", token),
      importTemplate: (token: string) =>
        apiRequestBlob("/api/v1/entry-diplomas/import-template", "GET", token),
      importExcel: async (token: string, establishmentId: string, file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_BASE_URL}/api/v1/entry-diplomas/import?establishmentId=${establishmentId}`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
          cache: "no-store",
        });
        if (!response.ok) {
          let errorBody: ApiErrorPayload | undefined;
          try { errorBody = (await response.json()) as ApiErrorPayload; } catch { /* ignore */ }
          throw new ApiError(response.status, errorBody);
        }
        return (await response.json()) as EntryDiplomaImportResultResponse;
      },
    },
    academicLevels: {
      create: (token: string, payload: CreateAcademicLevelRequest) =>
        apiRequest<AcademicLevelResponse>("/api/v1/academic-levels", "POST", payload, token),
      list: (token: string, establishmentId: string) =>
        apiRequest<AcademicLevelResponse[]>(`/api/v1/academic-levels?establishmentId=${establishmentId}`, "GET", undefined, token),
      get: (token: string, id: string, establishmentId: string) =>
        apiRequest<AcademicLevelResponse>(`/api/v1/academic-levels/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, id: string, establishmentId: string, payload: UpdateAcademicLevelRequest) =>
        apiRequest<AcademicLevelResponse>(`/api/v1/academic-levels/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
      delete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/academic-levels/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      activate: (token: string, id: string, establishmentId: string) =>
        apiRequest<AcademicLevelResponse>(`/api/v1/academic-levels/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
      deactivate: (token: string, id: string, establishmentId: string) =>
        apiRequest<AcademicLevelResponse>(`/api/v1/academic-levels/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
      hardDelete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/academic-levels/${id}/hard-delete?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      exportExcel: (token: string, establishmentId: string) =>
        apiRequestBlob(`/api/v1/academic-levels/export?establishmentId=${establishmentId}`, "GET", token),
      importTemplate: (token: string) =>
        apiRequestBlob("/api/v1/academic-levels/import-template", "GET", token),
      importExcel: async (token: string, establishmentId: string, file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_BASE_URL}/api/v1/academic-levels/import?establishmentId=${establishmentId}`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
          cache: "no-store",
        });
        if (!response.ok) {
          let errorBody: ApiErrorPayload | undefined;
          try { errorBody = (await response.json()) as ApiErrorPayload; } catch { /* ignore */ }
          throw new ApiError(response.status, errorBody);
        }
        return (await response.json()) as AcademicLevelImportResultResponse;
      },
      listEntryDiplomas: (token: string, id: string, establishmentId: string) =>
        apiRequest<EntryDiplomaResponse[]>(`/api/v1/academic-levels/${id}/entry-diplomas?establishmentId=${establishmentId}`, "GET", undefined, token),
      attachEntryDiploma: (token: string, id: string, entryDiplomaId: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/academic-levels/${id}/entry-diplomas/${entryDiplomaId}?establishmentId=${establishmentId}`, "POST", undefined, token),
      detachEntryDiploma: (token: string, id: string, entryDiplomaId: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/academic-levels/${id}/entry-diplomas/${entryDiplomaId}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
    },
    programTracks: {
      create: (token: string, payload: CreateProgramTrackRequest) =>
        apiRequest<ProgramTrackResponse>("/api/v1/program-tracks", "POST", payload, token),
      list: (token: string, establishmentId: string) =>
        apiRequest<ProgramTrackResponse[]>(`/api/v1/program-tracks?establishmentId=${establishmentId}`, "GET", undefined, token),
      get: (token: string, id: string, establishmentId: string) =>
        apiRequest<ProgramTrackResponse>(`/api/v1/program-tracks/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, id: string, establishmentId: string, payload: UpdateProgramTrackRequest) =>
        apiRequest<ProgramTrackResponse>(`/api/v1/program-tracks/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
      delete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/program-tracks/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      activate: (token: string, id: string, establishmentId: string) =>
        apiRequest<ProgramTrackResponse>(`/api/v1/program-tracks/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
      deactivate: (token: string, id: string, establishmentId: string) =>
        apiRequest<ProgramTrackResponse>(`/api/v1/program-tracks/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
      hardDelete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/program-tracks/${id}/hard?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      exportExcel: (token: string, establishmentId: string) =>
        apiRequestBlob(`/api/v1/program-tracks/export?establishmentId=${establishmentId}`, "GET", token),
      importTemplate: (token: string) =>
        apiRequestBlob("/api/v1/program-tracks/import-template", "GET", token),
      importExcel: async (token: string, establishmentId: string, file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_BASE_URL}/api/v1/program-tracks/import?establishmentId=${establishmentId}`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
          cache: "no-store",
        });
        if (!response.ok) {
          let errorBody: ApiErrorPayload | undefined;
          try { errorBody = (await response.json()) as ApiErrorPayload; } catch { /* ignore */ }
          throw new ApiError(response.status, errorBody);
        }
        return (await response.json()) as ProgramTrackImportResultResponse;
      },
    },
    programTrackLevels: {
      create: (token: string, payload: CreateProgramTrackLevelRequest) =>
        apiRequest<ProgramTrackLevelResponse>("/api/v1/program-track-levels", "POST", payload, token),
      list: (token: string, establishmentId: string) =>
        apiRequest<ProgramTrackLevelResponse[]>(`/api/v1/program-track-levels?establishmentId=${establishmentId}`, "GET", undefined, token),
      get: (token: string, id: string, establishmentId: string) =>
        apiRequest<ProgramTrackLevelResponse>(`/api/v1/program-track-levels/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, id: string, establishmentId: string, payload: UpdateProgramTrackLevelRequest) =>
        apiRequest<ProgramTrackLevelResponse>(`/api/v1/program-track-levels/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
      delete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/program-track-levels/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      activate: (token: string, id: string, establishmentId: string) =>
        apiRequest<ProgramTrackLevelResponse>(`/api/v1/program-track-levels/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
      deactivate: (token: string, id: string, establishmentId: string) =>
        apiRequest<ProgramTrackLevelResponse>(`/api/v1/program-track-levels/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
    },
    acquisitionChannels: {
      create: (token: string, payload: CreateAcquisitionChannelRequest) =>
        apiRequest<AcquisitionChannelResponse>("/api/v1/acquisition-channels", "POST", payload, token),
      list: (token: string, establishmentId: string) =>
        apiRequest<AcquisitionChannelResponse[]>(`/api/v1/acquisition-channels?establishmentId=${establishmentId}`, "GET", undefined, token),
      get: (token: string, id: string, establishmentId: string) =>
        apiRequest<AcquisitionChannelResponse>(`/api/v1/acquisition-channels/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, id: string, establishmentId: string, payload: UpdateAcquisitionChannelRequest) =>
        apiRequest<AcquisitionChannelResponse>(`/api/v1/acquisition-channels/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
      delete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/acquisition-channels/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      activate: (token: string, id: string, establishmentId: string) =>
        apiRequest<AcquisitionChannelResponse>(`/api/v1/acquisition-channels/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
      deactivate: (token: string, id: string, establishmentId: string) =>
        apiRequest<AcquisitionChannelResponse>(`/api/v1/acquisition-channels/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
      hardDelete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/acquisition-channels/${id}/hard?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      exportExcel: (token: string, establishmentId: string) =>
        apiRequestBlob(`/api/v1/acquisition-channels/export?establishmentId=${establishmentId}`, "GET", token),
      importTemplate: (token: string) =>
        apiRequestBlob("/api/v1/acquisition-channels/import-template", "GET", token),
      importExcel: async (token: string, establishmentId: string, file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_BASE_URL}/api/v1/acquisition-channels/import?establishmentId=${establishmentId}`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
          cache: "no-store",
        });
        if (!response.ok) {
          let errorBody: ApiErrorPayload | undefined;
          try { errorBody = (await response.json()) as ApiErrorPayload; } catch { /* ignore */ }
          throw new ApiError(response.status, errorBody);
        }
        return (await response.json()) as AcquisitionChannelImportResultResponse;
      },
    },
    funnelStages: {
      create: (token: string, payload: CreateFunnelStageRequest) =>
        apiRequest<FunnelStageResponse>("/api/v1/funnel-stages", "POST", payload, token),
      list: (token: string, establishmentId: string) =>
        apiRequest<FunnelStageResponse[]>(`/api/v1/funnel-stages?establishmentId=${establishmentId}`, "GET", undefined, token),
      get: (token: string, id: string, establishmentId: string) =>
        apiRequest<FunnelStageResponse>(`/api/v1/funnel-stages/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, id: string, establishmentId: string, payload: UpdateFunnelStageRequest) =>
        apiRequest<FunnelStageResponse>(`/api/v1/funnel-stages/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
      delete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/funnel-stages/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      activate: (token: string, id: string, establishmentId: string) =>
        apiRequest<FunnelStageResponse>(`/api/v1/funnel-stages/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
      deactivate: (token: string, id: string, establishmentId: string) =>
        apiRequest<FunnelStageResponse>(`/api/v1/funnel-stages/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
      hardDelete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/funnel-stages/${id}/hard?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      exportExcel: (token: string, establishmentId: string) =>
        apiRequestBlob(`/api/v1/funnel-stages/export?establishmentId=${establishmentId}`, "GET", token),
      importTemplate: (token: string) =>
        apiRequestBlob("/api/v1/funnel-stages/import-template", "GET", token),
      importExcel: async (token: string, establishmentId: string, file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_BASE_URL}/api/v1/funnel-stages/import?establishmentId=${establishmentId}`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
          cache: "no-store",
        });
        if (!response.ok) {
          let errorBody: ApiErrorPayload | undefined;
          try { errorBody = (await response.json()) as ApiErrorPayload; } catch { /* ignore */ }
          throw new ApiError(response.status, errorBody);
        }
        return (await response.json()) as FunnelStageImportResultResponse;
      },
    },
    funnelStageTransitions: {
      create: (token: string, payload: CreateFunnelStageTransitionRequest) =>
        apiRequest<FunnelStageTransitionResponse>("/api/v1/funnel-stage-transitions", "POST", payload, token),
      list: (token: string, establishmentId: string) =>
        apiRequest<FunnelStageTransitionResponse[]>(`/api/v1/funnel-stage-transitions?establishmentId=${establishmentId}`, "GET", undefined, token),
      get: (token: string, id: string, establishmentId: string) =>
        apiRequest<FunnelStageTransitionResponse>(`/api/v1/funnel-stage-transitions/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, id: string, establishmentId: string, payload: UpdateFunnelStageTransitionRequest) =>
        apiRequest<FunnelStageTransitionResponse>(`/api/v1/funnel-stage-transitions/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
      delete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/funnel-stage-transitions/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      hardDelete: (token: string, id: string, establishmentId: string) =>
        apiRequest<void>(`/api/v1/funnel-stage-transitions/${id}/hard?establishmentId=${establishmentId}`, "DELETE", undefined, token),
      activate: (token: string, id: string, establishmentId: string) =>
        apiRequest<FunnelStageTransitionResponse>(`/api/v1/funnel-stage-transitions/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
      deactivate: (token: string, id: string, establishmentId: string) =>
        apiRequest<FunnelStageTransitionResponse>(`/api/v1/funnel-stage-transitions/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
    },
    pipelineViewPreference: {
      get: (token: string, establishmentId: string) =>
        apiRequest<PipelineViewPreferenceResponse>(`/api/v1/pipeline-view-preference?establishmentId=${establishmentId}`, "GET", undefined, token),
      update: (token: string, payload: UpdatePipelineViewPreferenceRequest) =>
        apiRequest<PipelineViewPreferenceResponse>("/api/v1/pipeline-view-preference", "PUT", payload, token),
    },
    whatsappConfig: {
      get: (token: string, establishmentId: string) =>
        apiRequest<EstablishmentWhatsappConfigResponse>(`/api/v1/establishments/${establishmentId}/whatsapp-config`, "GET", undefined, token),
      update: (token: string, establishmentId: string, payload: UpdateEstablishmentWhatsappConfigRequest) =>
        apiRequest<EstablishmentWhatsappConfigResponse>(`/api/v1/establishments/${establishmentId}/whatsapp-config`, "PUT", payload, token),
    },
  },
  candidates: {
    create: (token: string, payload: CreateCandidateRequest) =>
      apiRequest<CandidateResponse>("/api/v1/candidates", "POST", payload, token),
    list: (token: string, establishmentId: string) =>
      apiRequest<CandidateResponse[]>(`/api/v1/candidates?establishmentId=${establishmentId}`, "GET", undefined, token),
    listPaged: (
      token: string,
      establishmentId: string,
      params: { page?: number; size?: number; sortBy?: string; direction?: "asc" | "desc"; search?: string; status?: string } = {},
    ) => {
      const searchParams = new URLSearchParams();
      searchParams.set("establishmentId", establishmentId);
      searchParams.set("page", String(params.page ?? 0));
      searchParams.set("size", String(params.size ?? 20));
      searchParams.set("sortBy", params.sortBy ?? "createdAt");
      searchParams.set("direction", params.direction ?? "desc");
      if (params.search && params.search.trim().length > 0) {
        searchParams.set("search", params.search.trim());
      }
      if (params.status && params.status !== "ALL") {
        searchParams.set("status", params.status);
      }
      return apiRequest<PagedResponse<CandidateResponse>>(`/api/v1/candidates?${searchParams.toString()}`, "GET", undefined, token);
    },
    get: (token: string, id: string, establishmentId: string) =>
      apiRequest<CandidateResponse>(`/api/v1/candidates/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
    update: (token: string, id: string, establishmentId: string, payload: UpdateCandidateRequest) =>
      apiRequest<CandidateResponse>(`/api/v1/candidates/${id}?establishmentId=${establishmentId}`, "PATCH", payload, token),
    delete: (token: string, id: string, establishmentId: string) =>
      apiRequest<void>(`/api/v1/candidates/${id}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
    hardDelete: (token: string, id: string, establishmentId: string) =>
      apiRequest<void>(`/api/v1/candidates/${id}/hard?establishmentId=${establishmentId}`, "DELETE", undefined, token),
    activate: (token: string, id: string, establishmentId: string) =>
      apiRequest<CandidateResponse>(`/api/v1/candidates/${id}/activate?establishmentId=${establishmentId}`, "POST", undefined, token),
    deactivate: (token: string, id: string, establishmentId: string) =>
      apiRequest<CandidateResponse>(`/api/v1/candidates/${id}/deactivate?establishmentId=${establishmentId}`, "POST", undefined, token),
    listEligibleProgramTrackLevels: (token: string, id: string, establishmentId: string) =>
      apiRequest<EligibleProgramTrackLevelResponse[]>(`/api/v1/candidates/${id}/eligible-program-track-levels?establishmentId=${establishmentId}`, "GET", undefined, token),
    exportExcel: (token: string, establishmentId: string) =>
      apiRequestBlob(`/api/v1/candidates/export?establishmentId=${establishmentId}`, "GET", token),
    importTemplate: (token: string) =>
      apiRequestBlob("/api/v1/candidates/import-template", "GET", token),
    importExcel: async (token: string, establishmentId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE_URL}/api/v1/candidates/import?establishmentId=${establishmentId}`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
        cache: "no-store",
      });
      if (!response.ok) {
        let errorBody: ApiErrorPayload | undefined;
        try { errorBody = (await response.json()) as ApiErrorPayload; } catch { /* ignore */ }
        throw new ApiError(response.status, errorBody);
      }
      return (await response.json()) as CandidateImportResultResponse;
    },
  },
  candidateApplications: {
    create: (token: string, candidateId: string, payload: CreateCandidateApplicationRequest) =>
      apiRequest<CandidateApplicationResponse>(`/api/v1/candidates/${candidateId}/applications`, "POST", payload, token),
    listByCandidate: (token: string, candidateId: string, establishmentId: string) =>
      apiRequest<CandidateApplicationResponse[]>(`/api/v1/candidates/${candidateId}/applications?establishmentId=${establishmentId}`, "GET", undefined, token),
    list: (token: string, establishmentId: string) =>
      apiRequest<CandidateApplicationResponse[]>(`/api/v1/candidate-applications?establishmentId=${establishmentId}`, "GET", undefined, token),
    get: (token: string, id: string, establishmentId: string) =>
      apiRequest<CandidateApplicationResponse>(`/api/v1/candidate-applications/${id}?establishmentId=${establishmentId}`, "GET", undefined, token),
    transition: (token: string, id: string, payload: TransitionCandidateApplicationRequest) =>
      apiRequest<CandidateApplicationResponse>(`/api/v1/candidate-applications/${id}/transitions`, "POST", payload, token),
    history: (token: string, id: string, establishmentId: string) =>
      apiRequest<CandidateApplicationStageHistoryResponse[]>(`/api/v1/candidate-applications/${id}/history?establishmentId=${establishmentId}`, "GET", undefined, token),
    listNotes: (token: string, candidateApplicationId: string, establishmentId: string) =>
      apiRequest<CandidateNoteResponse[]>(`/api/v1/candidate-applications/${candidateApplicationId}/notes?establishmentId=${establishmentId}`, "GET", undefined, token),
    listAudit: (token: string, candidateApplicationId: string, establishmentId: string) =>
      apiRequest<CandidateApplicationAuditEntryResponse[]>(`/api/v1/candidate-applications/${candidateApplicationId}/audit?establishmentId=${establishmentId}`, "GET", undefined, token),
  },
  candidateNotes: {
    create: (token: string, candidateId: string, payload: CreateCandidateNoteRequest) =>
      apiRequest<CandidateNoteResponse>(`/api/v1/candidates/${candidateId}/notes`, "POST", payload, token),
    update: (token: string, candidateId: string, noteId: string, establishmentId: string, payload: UpdateCandidateNoteRequest) =>
      apiRequest<CandidateNoteResponse>(`/api/v1/candidates/${candidateId}/notes/${noteId}?establishmentId=${establishmentId}`, "PUT", payload, token),
    delete: (token: string, candidateId: string, noteId: string, establishmentId: string) =>
      apiRequest<void>(`/api/v1/candidates/${candidateId}/notes/${noteId}?establishmentId=${establishmentId}`, "DELETE", undefined, token),
    uploadAttachment: (token: string, candidateId: string, noteId: string, establishmentId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequestMultipart<CandidateNoteAttachmentResponse>(
        `/api/v1/candidates/${candidateId}/notes/${noteId}/attachments?establishmentId=${establishmentId}`,
        "POST",
        formData,
        token,
      );
    },
    getAttachmentBlob: (token: string, candidateId: string, noteId: string, attachmentId: string, establishmentId: string) =>
      apiRequestBlob(
        `/api/v1/candidates/${candidateId}/notes/${noteId}/attachments/${attachmentId}?establishmentId=${establishmentId}`,
        "GET",
        token,
      ).then((response) => response.blob),
    deleteAttachment: (token: string, candidateId: string, noteId: string, attachmentId: string, establishmentId: string) =>
      apiRequest<void>(
        `/api/v1/candidates/${candidateId}/notes/${noteId}/attachments/${attachmentId}?establishmentId=${establishmentId}`,
        "DELETE",
        undefined,
        token,
      ),
  },
  candidateConversations: {
    create: (token: string, candidateId: string, payload: CreateCandidateConversationRequest) =>
      apiRequest<CandidateConversationResponse>(`/api/v1/candidates/${candidateId}/conversations`, "POST", payload, token),
    listForCandidate: (token: string, candidateId: string, establishmentId: string) =>
      apiRequest<CandidateConversationResponse[]>(`/api/v1/candidates/${candidateId}/conversations?establishmentId=${establishmentId}`, "GET", undefined, token),
    listMessages: (token: string, conversationId: string, establishmentId: string) =>
      apiRequest<CandidateConversationMessageResponse[]>(`/api/v1/candidate-conversations/${conversationId}/messages?establishmentId=${establishmentId}`, "GET", undefined, token),
    sendMessage: (token: string, conversationId: string, establishmentId: string, payload: SendCandidateConversationMessageRequest) =>
      apiRequest<CandidateConversationMessageResponse>(`/api/v1/candidate-conversations/${conversationId}/messages?establishmentId=${establishmentId}`, "POST", payload, token),
  },
};
