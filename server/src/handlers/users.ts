import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash password before storing (in production, use bcrypt)
    const hashedPassword = await hashPassword(input.password);

    // Check if username already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUser.length > 0) {
      throw new Error(`Username '${input.username}' already exists`);
    }

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password: hashedPassword,
        name: input.name,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    // Exclude password field from returned data
    return results.map(user => ({
      ...user,
      password: ''
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<void> => {
  try {
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Delete the user
    await db.delete(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};

// Simple password hashing function (in production, use bcrypt with proper salt)
async function hashPassword(password: string): Promise<string> {
  // This is a simple implementation for demo purposes
  // In production, use bcrypt: await bcrypt.hash(password, 10)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'simple_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}