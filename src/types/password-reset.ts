export interface PasswordResetToken {
  id: string;
  userId: string;
  /**
   * SHA-256 hash of the raw reset token. The raw token is only ever sent to the
   * user via email; only its hash is persisted so a storage leak cannot be used
   * to reset passwords.
   */
  tokenHash: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}
