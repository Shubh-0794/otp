export type AuthMode = 'whatsapp';
export type AuthStep = 'input' | 'verify' | 'authenticated';

export interface UserProfile {
  id: string;
  phone: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  bio?: string;
  createdAt: string;
  lastSignInAt?: string;
  metadata?: Record<string, any>;
}

export interface SupabaseConfig {
  projectUrl: string;
  anonKey: string;
  isCustom: boolean;
  isDemoMode: boolean;
  status: 'connected' | 'checking' | 'error' | 'demo';
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 'otp_requested' | 'otp_verified' | 'login_success' | 'sign_out' | 'profile_updated' | 'session_refreshed' | 'failed_verification';
  target: string;
  method: 'whatsapp';
  status: 'success' | 'failed';
  details: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionData {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  tokenType: string;
}

export interface SimulatedInboxMessage {
  id: string;
  type: 'whatsapp';
  target: string;
  code: string;
  timestamp: string;
  message: string;
  read: boolean;
}
