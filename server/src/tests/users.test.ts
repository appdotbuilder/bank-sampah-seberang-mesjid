import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser, getUsers, deleteUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testUserInput: CreateUserInput = {
  username: 'testuser',
  password: 'testpassword123',
  name: 'Test User',
  role: 'petugas'
};

const testAdminInput: CreateUserInput = {
  username: 'admin',
  password: 'adminpass456',
  name: 'Admin User',
  role: 'administrator'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with petugas role', async () => {
    const result = await createUser(testUserInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('petugas');
    expect(result.password).toEqual(''); // Password should be empty in response
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user with administrator role', async () => {
    const result = await createUser(testAdminInput);

    expect(result.username).toEqual('admin');
    expect(result.name).toEqual('Admin User');
    expect(result.role).toEqual('administrator');
    expect(result.password).toEqual('');
    expect(result.id).toBeDefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await createUser(testUserInput);

    // Query database directly to verify storage
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const dbUser = users[0];
    expect(dbUser.username).toEqual('testuser');
    expect(dbUser.name).toEqual('Test User');
    expect(dbUser.role).toEqual('petugas');
    expect(dbUser.password).not.toEqual(''); // Password should be hashed
    expect(dbUser.password).not.toEqual('testpassword123'); // Should not be plain text
    expect(dbUser.created_at).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate username', async () => {
    // Create first user
    await createUser(testUserInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      ...testUserInput,
      name: 'Another User'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should validate required fields', async () => {
    // Test with missing username
    const invalidInput = {
      password: 'test123',
      name: 'Test',
      role: 'petugas' as const
    };

    // This should fail at TypeScript level, but let's test runtime behavior
    await expect(createUser(invalidInput as any)).rejects.toThrow();
  });
});

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users without passwords', async () => {
    // Create test users
    await createUser(testUserInput);
    await createUser(testAdminInput);

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Check first user
    const petugasUser = result.find(u => u.username === 'testuser');
    expect(petugasUser).toBeDefined();
    expect(petugasUser!.name).toEqual('Test User');
    expect(petugasUser!.role).toEqual('petugas');
    expect(petugasUser!.password).toEqual(''); // Password should be empty
    expect(petugasUser!.id).toBeDefined();
    expect(petugasUser!.created_at).toBeInstanceOf(Date);

    // Check admin user
    const adminUser = result.find(u => u.username === 'admin');
    expect(adminUser).toBeDefined();
    expect(adminUser!.name).toEqual('Admin User');
    expect(adminUser!.role).toEqual('administrator');
    expect(adminUser!.password).toEqual('');
  });

  it('should return users ordered by creation', async () => {
    // Create users in sequence
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(testAdminInput);

    const result = await getUsers();
    expect(result).toHaveLength(2);

    // Users should maintain their order
    expect(result[0].id).toEqual(user1.id);
    expect(result[1].id).toEqual(user2.id);
  });
});

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing user', async () => {
    // Create a user first
    const user = await createUser(testUserInput);

    // Delete the user
    await deleteUser(user.id);

    // Verify user is deleted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should throw error when deleting non-existent user', async () => {
    const nonExistentId = 999;

    await expect(deleteUser(nonExistentId)).rejects.toThrow(/not found/i);
  });

  it('should not affect other users when deleting one user', async () => {
    // Create multiple users
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(testAdminInput);

    // Delete one user
    await deleteUser(user1.id);

    // Verify only the correct user was deleted
    const remainingUsers = await getUsers();
    expect(remainingUsers).toHaveLength(1);
    expect(remainingUsers[0].id).toEqual(user2.id);
    expect(remainingUsers[0].username).toEqual('admin');
  });

  it('should handle deletion of user with different roles', async () => {
    // Create admin user
    const adminUser = await createUser(testAdminInput);

    // Delete admin user
    await deleteUser(adminUser.id);

    // Verify deletion
    const users = await getUsers();
    expect(users).toHaveLength(0);
  });
});

describe('User integration scenarios', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should handle complete user lifecycle', async () => {
    // Create user
    const createdUser = await createUser(testUserInput);
    expect(createdUser.username).toEqual('testuser');

    // Verify user appears in list
    let allUsers = await getUsers();
    expect(allUsers).toHaveLength(1);
    expect(allUsers[0].id).toEqual(createdUser.id);

    // Delete user
    await deleteUser(createdUser.id);

    // Verify user no longer appears in list
    allUsers = await getUsers();
    expect(allUsers).toHaveLength(0);
  });

  it('should maintain data integrity with multiple operations', async () => {
    // Create multiple users
    const users = [
      await createUser({ ...testUserInput, username: 'user1' }),
      await createUser({ ...testUserInput, username: 'user2', role: 'administrator' }),
      await createUser({ ...testUserInput, username: 'user3' })
    ];

    // Verify all users exist
    let allUsers = await getUsers();
    expect(allUsers).toHaveLength(3);

    // Delete middle user
    await deleteUser(users[1].id);

    // Verify correct users remain
    allUsers = await getUsers();
    expect(allUsers).toHaveLength(2);
    expect(allUsers.map(u => u.username).sort()).toEqual(['user1', 'user3']);
  });
});