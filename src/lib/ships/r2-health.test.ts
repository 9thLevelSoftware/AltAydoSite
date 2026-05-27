import { describe, expect, it, vi } from 'vitest';
import { checkCloudflareR2Health } from './r2-health';
import { createMirrorTestConfig } from './r2-image-mirror';

describe('checkCloudflareR2Health', () => {
  it('writes, heads, publicly reads, and deletes a smoke object', async () => {
    const sentCommands: string[] = [];
    const s3Client = {
      send: vi.fn(async (command: unknown) => {
        sentCommands.push(command?.constructor?.name ?? 'unknown');
        return {};
      }),
    };
    const fetchImpl = vi.fn(async () => new Response('aydocorp-r2-health ok', { status: 200 }));

    const result = await checkCloudflareR2Health({
      config: createMirrorTestConfig({ prefix: 'ships' }),
      s3Client,
      fetchImpl,
    });

    expect(result.success).toBe(true);
    expect(result.putOk).toBe(true);
    expect(result.headOk).toBe(true);
    expect(result.publicReadOk).toBe(true);
    expect(result.deleteOk).toBe(true);
    expect(result.errors).toEqual([]);
    expect(sentCommands).toEqual(['PutObjectCommand', 'HeadObjectCommand', 'DeleteObjectCommand']);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/images\.aydocorp\.space\/ships\/health\/pr-check-/),
      { cache: 'no-store' }
    );
  });

  it('fails when public CDN read does not return the health object', async () => {
    const s3Client = {
      send: vi.fn(async () => ({})),
    };
    const fetchImpl = vi.fn(async () => new Response('not found', { status: 404 }));

    const result = await checkCloudflareR2Health({
      config: createMirrorTestConfig({ prefix: 'ships' }),
      s3Client,
      fetchImpl,
    });

    expect(result.success).toBe(false);
    expect(result.putOk).toBe(true);
    expect(result.headOk).toBe(true);
    expect(result.publicReadOk).toBe(false);
    expect(result.deleteOk).toBe(true);
    expect(result.errors.some((error) => error.includes('public read failed'))).toBe(true);
  });
});
