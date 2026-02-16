/**
 * Shared storage error classes for optimistic locking across all storage modules.
 */

/**
 * Thrown when an optimistic-locking version mismatch is detected.
 * API routes should catch this and return 409 Conflict.
 */
export class StaleDocumentError extends Error {
  constructor(collection: string, id: string) {
    super(`Document in ${collection} with id ${id} was modified by another request. Please reload and try again.`);
    this.name = 'StaleDocumentError';
  }
}
