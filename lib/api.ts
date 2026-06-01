import type {
  ApiSuccessResponse,
  ChangePasswordRequest,
  CreateUserRequest,
  UpdateProfileRequest,
  UpdateUserRequest,
  LoginRequest,
  LoginResponse,
  PagedResponse,
  PasswordResetRequestResult,
  NotificationBulkActionResponse,
  NotificationReadStatus,
  NotificationResponse,
  NotificationUnreadCountResponse,
  RegisterRequest,
  RegisterResponse,
  SessionResponse,
  UserImportResultResponse,
  UserResponse,
  UserStatusStatsResponse,
} from "@/lib/types";
import { useDashboardStore } from "@/store/dashboard-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// State pour gérer le refresh token en cours (évite les race conditions)
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type ApiErrorPayload = {
  errorCode?: string;
  message?: string;
  messageKey?: string;
  timestamp?: string;
  path?: string;
  statusCode?: number;
  details?: unknown;
};

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body,
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
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
    refresh: (refreshToken: string) =>
      apiRequest<LoginResponse>("/api/v1/auth/refresh", "POST", { refreshToken }),
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
    updateMe: (token: string, payload: UpdateProfileRequest) =>
      apiRequest<UserResponse>("/api/v1/users/me", "PATCH", payload, token),
    uploadMyProfilePhoto: (token: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequestMultipart<UserResponse>("/api/v1/users/me/profile-photo", "POST", formData, token);
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
};
