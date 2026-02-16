/**
 * Server-side file validation with magic byte inspection.
 *
 * Uses the `file-type` package (ESM-only) via dynamic import to detect
 * actual file content type from magic bytes, preventing Content-Type
 * header spoofing attacks (SEC-13).
 */

import { logger } from '@/lib/logger';

/** Maximum allowed image upload size in bytes (5 MB). */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export { ALLOWED_IMAGE_TYPES };

export interface ValidationResult {
  valid: boolean;
  detectedType?: string;
  error?: string;
}

/**
 * Validates an image buffer by inspecting its magic bytes.
 *
 * @param buffer - The raw file buffer to validate
 * @param declaredType - The Content-Type header declared by the client
 * @returns ValidationResult indicating whether the file is a valid image
 */
export async function validateImageBuffer(
  buffer: Buffer,
  declaredType: string
): Promise<ValidationResult> {
  // Dynamic import required: file-type v19+ is ESM-only
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return { valid: false, error: 'Could not determine file type from content' };
  }

  if (!ALLOWED_IMAGE_TYPES.has(detected.mime)) {
    return {
      valid: false,
      detectedType: detected.mime,
      error: `File content is ${detected.mime}, not an allowed image type`,
    };
  }

  // Warn if declared type doesn't match detected type (possible spoofing attempt)
  if (detected.mime !== declaredType) {
    logger.warn('SECURITY: File type mismatch detected', {
      module: 'file-validation',
      declaredType,
      detectedType: detected.mime,
    });
  }

  return { valid: true, detectedType: detected.mime };
}
