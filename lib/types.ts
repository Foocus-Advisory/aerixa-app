export type DeviceType = "DESKTOP" | "MOBILE" | "TABLET";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  mustChangePassword: boolean;
  mfaRequired?: boolean;
  mfaChallengeId?: string;
  mfaMethod?: string;
  mfaExpiresAt?: string;
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

export interface MfaVerifyRequest {
  challengeId: string;
  code: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface GoogleAuthConfigResponse {
  enabled: boolean;
  clientId?: string | null;
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

export interface AssignParentAdminRequest {
  parentAdminId: string;
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
  permissions?: string[];
  parentAdminId?: string;
  parentAdminEmail?: string;
  parentAdminDisplayName?: string;
  lastLoginAt?: string;
  deletedAt?: string;
  createdByLabel?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserOptionResponse {
  id: string;
  displayName: string;
  email?: string;
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

export interface EntryDiplomaImportResultResponse {
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

export interface RbacPermissionResponse {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
}

export interface RbacRoleResponse {
  id: string;
  name: string;
  description?: string;
  level: number;
  isSystem: boolean;
  usersCount: number;
  permissions: string[];
}

export interface UpdateRbacRolePermissionsRequest {
  permissionIds: string[];
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

export type AuditLogStatus = "ALL" | "OK" | "ERROR" | "INFO";

export interface AuditLogResponse {
  id: string;
  timestamp: string;
  action: string;
  status: Exclude<AuditLogStatus, "ALL">;
  outcome?: "SUCCESS" | "FAILURE" | string;
  message: string;
  resourcePath?: string;
  statusCode?: number;
  errorMessage?: string;
  correlationId?: string;
  actorId?: string;
  userId?: string;
  actorRoles?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  targetId?: string;
  targetType?: string;
  reasonCode?: string;
  details?: string;
  establishmentId?: string;
}

export interface AuditDashboardSummaryResponse {
  refreshFailures: AuditMetricWindowResponse;
  reuseAttempts: AuditMetricWindowResponse;
  revokeSessions: AuditMetricWindowResponse;
  loginFailures: AuditMetricWindowResponse;
  loginFailuresBySourceIp: AuditKeyValueCountResponse[];
  adminActionsByActor: AuditActorCountResponse[];
  topSourceIps: AuditKeyValueCountResponse[];
}

export interface AuditMetricWindowResponse {
  last24h: number;
  last7d: number;
  last30d: number;
}

export interface AuditKeyValueCountResponse {
  key: string;
  count: number;
}

export interface AuditActorCountResponse {
  actorId: string;
  actorEmail?: string;
  count: number;
}

export interface ProfileLocationCountryResponse {
  code: string;
  name: string;
  cities: string[];
}

export type PipelineViewType = "KANBAN" | "TABLE" | "LIST";

export interface EstablishmentResponse {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  status?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  whatsappPhone?: string;
  whatsappPhonePrefix?: string;
  otherPhone?: string;
  otherPhonePrefix?: string;
  email?: string;
  logoUrl?: string;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEstablishmentRequest {
  code?: string;
  name: string;
  shortName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  whatsappPhone?: string;
  whatsappPhonePrefix?: string;
  otherPhone?: string;
  otherPhonePrefix?: string;
  email?: string;
  logoUrl?: string;
}

export interface UpdateEstablishmentRequest {
  code?: string;
  name?: string;
  shortName?: string;
  status?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  whatsappPhone?: string;
  whatsappPhonePrefix?: string;
  otherPhone?: string;
  otherPhonePrefix?: string;
  email?: string;
  logoUrl?: string;
}

export interface EntryDiplomaResponse {
  id: string;
  establishmentId: string;
  code: string;
  label: string;
  rankOrder?: number;
  active: boolean;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicLevelResponse {
  id: string;
  establishmentId: string;
  code: string;
  label: string;
  rankOrder?: number;
  active: boolean;
  entryDiplomasCount?: number;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicLevelImportResultResponse {
  totalRows: number;
  created: number;
  failed: number;
  errors: string[];
}

export interface ProgramTrackImportResultResponse {
  totalRows: number;
  created: number;
  failed: number;
  errors: string[];
}

export interface ProgramTrackResponse {
  id: string;
  establishmentId: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramTrackLevelResponse {
  id: string;
  establishmentId: string;
  programTrackId: string;
  academicLevelId: string;
  openForApplication: boolean;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export type AcquisitionChannelType = "DIRECT" | "INDIRECT";

export type FunnelStageType = "INITIAL" | "INTERMEDIATE" | "FINAL_SUCCESS" | "FINAL_FAILURE";

export interface AcquisitionChannelResponse {
  id: string;
  establishmentId: string;
  code: string;
  name: string;
  type: AcquisitionChannelType;
  active: boolean;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcquisitionChannelImportResultResponse {
  totalRows: number;
  created: number;
  failed: number;
  errors: string[];
}

export interface FunnelStageResponse {
  id: string;
  establishmentId: string;
  code: string;
  name: string;
  description?: string;
  stageType: FunnelStageType;
  positionOrder: number;
  active: boolean;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStageImportResultResponse {
  totalRows: number;
  created: number;
  failed: number;
  errors: string[];
}

export interface FunnelStageTransitionResponse {
  id: string;
  establishmentId: string;
  fromStageId: string;
  toStageId: string;
  active: boolean;
  createdByUserId?: string;
  createdByLabel?: string;
  updatedByUserId?: string;
  updatedByLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineViewPreferenceResponse {
  id: string;
  userId: string;
  establishmentId: string;
  preferredView: PipelineViewType;
  updatedAt: string;
}

export interface UpdatePipelineViewPreferenceRequest {
  establishmentId: string;
  preferredView: PipelineViewType;
}

export interface CreateEntryDiplomaRequest {
  establishmentId: string;
  code?: string;
  label: string;
  rankOrder?: number;
  active?: boolean;
}

export interface UpdateEntryDiplomaRequest {
  code?: string;
  label?: string;
  rankOrder?: number;
  active?: boolean;
}

export interface CreateAcademicLevelRequest {
  establishmentId: string;
  code?: string;
  label: string;
  rankOrder?: number;
  active?: boolean;
}

export interface UpdateAcademicLevelRequest {
  code?: string;
  label?: string;
  rankOrder?: number;
  active?: boolean;
}

export interface CreateProgramTrackRequest {
  establishmentId: string;
  code?: string;
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateProgramTrackRequest {
  code?: string;
  name?: string;
  description?: string;
  active?: boolean;
}

export interface CreateProgramTrackLevelRequest {
  establishmentId: string;
  programTrackId: string;
  academicLevelId: string;
  openForApplication?: boolean;
}

export interface UpdateProgramTrackLevelRequest {
  programTrackId?: string;
  academicLevelId?: string;
  openForApplication?: boolean;
}

export interface CreateAcquisitionChannelRequest {
  establishmentId: string;
  code?: string;
  name: string;
  type: AcquisitionChannelType;
}

export interface UpdateAcquisitionChannelRequest {
  name?: string;
  type?: AcquisitionChannelType;
}

export interface CreateFunnelStageRequest {
  establishmentId: string;
  code?: string;
  name: string;
  description?: string;
  stageType: FunnelStageType;
  positionOrder: number;
}

export interface UpdateFunnelStageRequest {
  name?: string;
  description?: string;
  stageType?: FunnelStageType;
  positionOrder?: number;
}

export interface CreateFunnelStageTransitionRequest {
  establishmentId: string;
  fromStageId: string;
  toStageId: string;
}

export interface UpdateFunnelStageTransitionRequest {
  toStageId?: string;
}
