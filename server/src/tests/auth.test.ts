import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  password: 'testpass123',
  name: 'Test User',
  role: 'administrator' as const
};

const testPetugas = {
  username: 'petugas1',
  password: 'petugaspass',
  name: 'Petugas Satu',
  role: 'petugas' as const
};

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    beforeEach(async () => {
      // Create test users
      await db.insert(usersTable)
        .values([testUser, testPetugas])
        .execute();
    });

    it('should authenticate user with valid credentials', async () => {
      const input: LoginInput = {
        username: testUser.username,
        password: testUser.password
      };

      const result = await login(input);

      expect(result.username).toEqual(testUser.username);
      expect(result.name).toEqual(testUser.name);
      expect(result.role).toEqual(testUser.role);
      expect(result.password).toEqual(''); // Password should be empty for security
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should authenticate petugas user with valid credentials', async () => {
      const input: LoginInput = {
        username: testPetugas.username,
        password: testPetugas.password
      };

      const result = await login(input);

      expect(result.username).toEqual(testPetugas.username);
      expect(result.name).toEqual(testPetugas.name);
      expect(result.role).toEqual(testPetugas.role);
      expect(result.password).toEqual('');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent username', async () => {
      const input: LoginInput = {
        username: 'nonexistent',
        password: 'anypassword'
      };

      expect(login(input)).rejects.toThrow(/invalid credentials/i);
    });

    it('should throw error for incorrect password', async () => {
      const input: LoginInput = {
        username: testUser.username,
        password: 'wrongpassword'
      };

      expect(login(input)).rejects.toThrow(/invalid credentials/i);
    });

    it('should throw error for empty username', async () => {
      const input: LoginInput = {
        username: '',
        password: testUser.password
      };

      expect(login(input)).rejects.toThrow(/invalid credentials/i);
    });

    it('should throw error for empty password', async () => {
      const input: LoginInput = {
        username: testUser.username,
        password: ''
      };

      expect(login(input)).rejects.toThrow(/invalid credentials/i);
    });
  });

  describe('getCurrentUser', () => {
    let userId: number;

    beforeEach(async () => {
      // Create test user and get ID
      const result = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      
      userId = result[0].id;
    });

    it('should return user data for valid user ID', async () => {
      const result = await getCurrentUser(userId);

      expect(result.id).toEqual(userId);
      expect(result.username).toEqual(testUser.username);
      expect(result.name).toEqual(testUser.name);
      expect(result.role).toEqual(testUser.role);
      expect(result.password).toEqual(''); // Password should be empty for security
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user ID', async () => {
      const nonExistentId = 99999;
      
      expect(getCurrentUser(nonExistentId)).rejects.toThrow(/user not found/i);
    });

    it('should throw error for invalid user ID', async () => {
      const invalidId = -1;
      
      expect(getCurrentUser(invalidId)).rejects.toThrow(/user not found/i);
    });

    it('should return correct user when multiple users exist', async () => {
      // Create another user
      const anotherUser = await db.insert(usersTable)
        .values(testPetugas)
        .returning()
        .execute();

      const anotherUserId = anotherUser[0].id;

      // Get first user
      const result1 = await getCurrentUser(userId);
      expect(result1.username).toEqual(testUser.username);
      expect(result1.role).toEqual(testUser.role);

      // Get second user
      const result2 = await getCurrentUser(anotherUserId);
      expect(result2.username).toEqual(testPetugas.username);
      expect(result2.role).toEqual(testPetugas.role);
    });

    it('should not return password in response', async () => {
      const result = await getCurrentUser(userId);

      expect(result.password).toEqual('');
      expect(result.password).not.toEqual(testUser.password);
    });

    it('should verify user exists in database after retrieval', async () => {
      const result = await getCurrentUser(userId);

      // Verify the user actually exists in database
      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].username).toEqual(testUser.username);
      expect(dbUsers[0].name).toEqual(testUser.name);
      expect(dbUsers[0].role).toEqual(testUser.role);
    });
  });
});