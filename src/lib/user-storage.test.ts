import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserByEmail, getUserByHandle, setFallbackStorageMode } from './user-storage';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  collection: vi.fn(),
  findOne: vi.fn(),
  localGetUserById: vi.fn(),
  localGetUserByEmail: vi.fn(),
  localGetUserByHandle: vi.fn(),
  localGetUserByDiscordId: vi.fn(),
  localCreateUser: vi.fn(),
  localUpdateUser: vi.fn(),
  localDeleteUser: vi.fn(),
  localGetAllUsers: vi.fn(),
}));

vi.mock('./mongodb', () => ({
  getDb: mocks.getDb,
}));

vi.mock('./local-storage', () => ({
  getUserById: mocks.localGetUserById,
  getUserByEmail: mocks.localGetUserByEmail,
  getUserByHandle: mocks.localGetUserByHandle,
  getUserByDiscordId: mocks.localGetUserByDiscordId,
  createUser: mocks.localCreateUser,
  updateUser: mocks.localUpdateUser,
  deleteUser: mocks.localDeleteUser,
  getAllUsers: mocks.localGetAllUsers,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const caseInsensitiveCollation = { locale: 'en', strength: 2 };

describe('user storage lookups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setFallbackStorageMode(false);
    mocks.collection.mockReturnValue({
      findOne: mocks.findOne,
    });
    mocks.getDb.mockResolvedValue({
      collection: mocks.collection,
    });
  });

  it('looks up handles by normalized field first', async () => {
    const user = {
      id: 'user-1',
      aydoHandle: 'Devil',
      aydoHandleLower: 'devil',
      email: 'devil@example.com',
      passwordHash: 'hash',
      clearanceLevel: 1,
      role: 'user',
      discordName: null,
      rsiAccountName: null,
    };
    mocks.findOne.mockResolvedValueOnce(user);

    await expect(getUserByHandle('Devil')).resolves.toMatchObject({ id: 'user-1' });

    expect(mocks.findOne).toHaveBeenCalledTimes(1);
    expect(mocks.findOne).toHaveBeenCalledWith(
      { aydoHandleLower: 'devil' },
      { projection: { _id: 0 } }
    );
  });

  it('falls back to legacy case-insensitive handle lookup without regex', async () => {
    const user = {
      id: 'legacy-user',
      aydoHandle: 'Devil',
      email: 'devil@example.com',
      passwordHash: 'hash',
      clearanceLevel: 1,
      role: 'user',
      discordName: null,
      rsiAccountName: null,
    };
    mocks.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    await expect(getUserByHandle('Devil')).resolves.toMatchObject({ id: 'legacy-user' });

    expect(mocks.findOne).toHaveBeenNthCalledWith(
      1,
      { aydoHandleLower: 'devil' },
      { projection: { _id: 0 } }
    );
    expect(mocks.findOne).toHaveBeenNthCalledWith(
      2,
      { aydoHandle: 'Devil' },
      {
        projection: { _id: 0 },
        collation: caseInsensitiveCollation,
      }
    );
  });

  it('falls back to legacy case-insensitive email lookup without regex', async () => {
    const user = {
      id: 'legacy-email-user',
      aydoHandle: 'Pilot',
      email: 'Pilot@Example.com',
      passwordHash: 'hash',
      clearanceLevel: 1,
      role: 'user',
      discordName: null,
      rsiAccountName: null,
    };
    mocks.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    await expect(getUserByEmail('pilot@example.com')).resolves.toMatchObject({
      id: 'legacy-email-user',
    });

    expect(mocks.findOne).toHaveBeenNthCalledWith(
      1,
      { emailLower: 'pilot@example.com' },
      { projection: { _id: 0 } }
    );
    expect(mocks.findOne).toHaveBeenNthCalledWith(
      2,
      { email: 'pilot@example.com' },
      {
        projection: { _id: 0 },
        collation: caseInsensitiveCollation,
      }
    );
  });
});
