export type DeviceType = "DESKTOP" | "MOBILE" | "TABLET";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    roles: string[];
  };
}

export interface RegisterRequest {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  emailVerificationRequired: boolean;
}

export interface SessionResponse {
  id: string;
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  deviceName?: string;
  deviceType?: DeviceType;
  ipAddress: string;
  userAgent?: string;
  status?: "ACTIVE" | "REVOKED" | "EXPIRED" | string;
  createdAt: string;
  endedAt?: string;
  lastActivityAt: string;
  expiresAt: string;
  revokedAt?: string;
  isCurrentSession: boolean;
}

export interface CreateUserRequest {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  password: string;
  parentAdminId?: string;
  roles?: string[];
}

export interface UpdateUserRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles?: string[];
}

export interface UpdateProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  bio?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  bio?: string;
  profilePhotoUrl?: string;
  status: "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "DELETED";
  emailVerified: boolean;
  mustChangePassword: boolean;
  roles: string[];
  parentAdminId?: string;
  parentAdminEmail?: string;
  parentAdminDisplayName?: string;
  lastLoginAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatusStatsResponse {
  total: number;
  active: number;
  disabled: number;
  pendingVerification: number;
  deleted: number;
}

export interface UserImportResultResponse {
  totalRows: number;
  created: number;
  failed: number;
  errors: string[];
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiError {
  errorCode: string;
  message: string;
  messageKey: string;
  timestamp: string;
  path: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  timestamp: string;
  path: string;
  statusCode: number;
  data: T;
}

export interface PasswordResetRequestResult {
  accepted: boolean;
  queued: boolean;
  jobId?: string | null;
  recipient?: string | null;
  fallbackRecipient?: string | null;
}

export type NotificationReadStatus = "ALL" | "READ" | "UNREAD";

export interface NotificationResponse {
  id: string;
  title: string;
  description: string;
  notificationType: "INFO" | "WARNING" | "SECURITY" | string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface NotificationBulkActionResponse {
  affectedCount: number;
}
