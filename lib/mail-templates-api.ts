import type {
  ApiSuccessResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetRequestResult,
  RegisterRequest,
  RegisterResponse,
} from "./types";

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    public path: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  body?: unknown,
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = (await response.json()) as {
      message: string;
      errorCode: string;
      path: string;
      statusCode: number;
    };
    throw new ApiError(
      error.statusCode || response.status,
      error.errorCode || "UNKNOWN_ERROR",
      error.path || endpoint,
      error.message || response.statusText
    );
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

export const api = {
  auth: {
    register: (payload: RegisterRequest) =>
      apiRequest<RegisterResponse>("/api/v1/auth/register", "POST", payload),

    login: (payload: LoginRequest) =>
      apiRequest<LoginResponse>("/api/v1/auth/login", "POST", payload),

    passwordResetRequest: (email: string) =>
      apiRequest<ApiSuccessResponse<PasswordResetRequestResult>>(
        "/api/v1/auth/password-reset/request",
        "POST",
        { email }
      ).then((response) => response?.data),
  },

  mailTemplates: {
    // Mail Types
    getMailTypeCategories: (token: string) =>
      apiRequest<ApiSuccessResponse<MailTypeCategoryOptionResponse[]>>(
        "/api/v1/admin/mail-templates/types/categories",
        "GET",
        undefined,
        token
      ).then((response) => response?.data || []),

    getMailTypes: (token: string) =>
      apiRequest<ApiSuccessResponse<MailTypeResponse[]>>(
        "/api/v1/admin/mail-templates/types",
        "GET",
        undefined,
        token
      ).then((response) => response?.data || []),

    getMailType: (token: string, id: string) =>
      apiRequest<ApiSuccessResponse<MailTypeResponse>>(
        `/api/v1/admin/mail-templates/types/${id}`,
        "GET",
        undefined,
        token
      ).then((response) => response?.data),

    createMailType: (token: string, payload: MailTypeRequest) =>
      apiRequest<ApiSuccessResponse<MailTypeResponse>>(
        "/api/v1/admin/mail-templates/types",
        "POST",
        payload,
        token
      ).then((response) => response?.data),

    updateMailType: (token: string, id: string, payload: MailTypeRequest) =>
      apiRequest<ApiSuccessResponse<MailTypeResponse>>(
        `/api/v1/admin/mail-templates/types/${id}`,
        "PUT",
        payload,
        token
      ).then((response) => response?.data),

    deleteMailType: (token: string, id: string) =>
      apiRequest<void>(
        `/api/v1/admin/mail-templates/types/${id}`,
        "DELETE",
        undefined,
        token
      ),

    toggleMailTypeStatus: (token: string, id: string) =>
      apiRequest<ApiSuccessResponse<MailTypeResponse>>(
        `/api/v1/admin/mail-templates/types/${id}/toggle`,
        "PATCH",
        undefined,
        token
      ).then((response) => response?.data),

    // Templates
    getTemplates: (token: string, mailTypeId: string) =>
      apiRequest<ApiSuccessResponse<MailTemplateResponse[]>>(
        `/api/v1/admin/mail-templates/${mailTypeId}/templates`,
        "GET",
        undefined,
        token
      ).then((response) => response?.data || []),

    getTemplateVersions: (token: string, mailTypeId: string) =>
      apiRequest<ApiSuccessResponse<MailTemplateResponse[]>>(
        `/api/v1/admin/mail-templates/${mailTypeId}/templates/versions`,
        "GET",
        undefined,
        token
      ).then((response) => response?.data || []),

    createOrUpdateTemplate: (
      token: string,
      mailTypeId: string,
      payload: MailTemplateRequest
    ) =>
      apiRequest<ApiSuccessResponse<MailTemplateResponse>>(
        `/api/v1/admin/mail-templates/${mailTypeId}/templates`,
        "POST",
        payload,
        token
      ).then((response) => response?.data),

    activateTemplate: (token: string, templateId: string) =>
      apiRequest<ApiSuccessResponse<MailTemplateResponse>>(
        `/api/v1/admin/mail-templates/templates/${templateId}/activate`,
        "PATCH",
        undefined,
        token
      ).then((response) => response?.data),

    toggleTemplateStatus: (token: string, templateId: string) =>
      apiRequest<ApiSuccessResponse<MailTemplateResponse>>(
        `/api/v1/admin/mail-templates/templates/${templateId}/toggle`,
        "PATCH",
        undefined,
        token
      ).then((response) => response?.data),

    deleteTemplate: (token: string, templateId: string) =>
      apiRequest<void>(
        `/api/v1/admin/mail-templates/templates/${templateId}`,
        "DELETE",
        undefined,
        token
      ),

    // Preview
    previewTemplate: (
      token: string,
      payload: MailTemplatePreviewRequest
    ) =>
      apiRequest<ApiSuccessResponse<MailTemplatePreviewResponse>>(
        "/api/v1/admin/mail-templates/templates/preview",
        "POST",
        payload,
        token
      ).then((response) => response?.data),

    // Variables
    getVariables: (token: string) =>
      apiRequest<ApiSuccessResponse<MailTemplateVariableResponse[]>>(
        "/api/v1/admin/mail-templates/variables",
        "GET",
        undefined,
        token
      ).then((response) => response?.data || []),

    getVariablesByCategory: (
      token: string
    ) =>
      apiRequest<ApiSuccessResponse<Record<string, MailTemplateVariableResponse[]>>>(
        "/api/v1/admin/mail-templates/variables/by-category",
        "GET",
        undefined,
        token
      ).then((response) => response?.data || {}),
  },
};

export { ApiError };

// Type definitions for mail templates
export interface MailTypeRequest {
  code: string;
  category: string;
  name: string;
  description?: string;
  defaultRecipient?: string;
  active: boolean;
  minResendIntervalSeconds: number;
  maxRetries: number;
  showSystemComments: boolean;
}

export interface MailTypeResponse extends MailTypeRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MailTypeCategoryOptionResponse {
  value: string;
  module: string;
  action: string;
  defaultCode: string;
  label: string;
  description: string;
}

export interface MailTemplateRequest {
  mailTypeId: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  preview?: string;
  language: string;
  versionNotes?: string;
  createNewVersion: boolean;
  supportedVariables?: string;
  customStyles?: string;
}

export interface MailTemplateResponse extends MailTemplateRequest {
  id: string;
  mailTypeCode: string;
  mailTypeName: string;
  versionNumber: number;
  isCurrent: boolean;
  createdByUserId?: string;
  lastModifiedByUserId?: string;
  publishedAt?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MailTemplatePreviewRequest {
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, string>;
}

export interface MailTemplatePreviewResponse {
  subject: string;
  htmlContent: string;
  textContent?: string;
  preview?: string;
  renderedHtml: string;
  renderedText?: string;
}

export interface MailTemplateVariableResponse {
  id: string;
  code: string;
  label: string;
  description?: string;
  exampleValue?: string;
  category: string;
  dataType: string;
  required: boolean;
  active: boolean;
  displayOrder: number;
  pattern?: string;
  applicableMailTypes?: string;
  createdAt: string;
  updatedAt: string;
}
