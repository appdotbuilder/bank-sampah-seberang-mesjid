import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type User } from '../schema';

export const login = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Validate password (in production, use proper password hashing)
    if (user.password !== input.password) {
      throw new Error('Invalid credentials');
    }

    // Return user data without password
    return {
      id: user.id,
      username: user.username,
      password: '', // Never return actual password
      name: user.name,
      role: user.role,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const getCurrentUser = async (userId: number): Promise<User> => {
  try {
    // Find user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Return user data without password
    return {
      id: user.id,
      username: user.username,
      password: '', // Never return actual password
      name: user.name,
      role: user.role,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
};