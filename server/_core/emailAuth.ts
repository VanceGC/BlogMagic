import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import * as db from "../db";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a password reset token
 */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new user with email and password
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
) {
  // Check if user already exists
  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Check if this is the first user (should be admin)
  const allUsers = await db.getAllUsers();
  const isFirstUser = allUsers.length === 0;

  // Create the user
  await db.createUser({
    email,
    password: hashedPassword,
    name: name || null,
    loginMethod: "email",
    role: isFirstUser ? "admin" : "user",
    lastSignedIn: new Date(),
  });

  // Get the created user
  const user = await db.getUserByEmail(email);
  return user;
}

/**
 * Authenticate a user with email and password
 */
export async function authenticateUser(email: string, password: string) {
  // Get user by email
  const user = await db.getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user has a password (not OAuth user)
  if (!user.password) {
    throw new Error("This account uses Google sign-in. Please use 'Continue with Google'");
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // Update last signed in
  await db.updateUserById(user.id, {
    lastSignedIn: new Date(),
  });

  return user;
}

/**
 * Request a password reset
 */
export async function requestPasswordReset(email: string) {
  const user = await db.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists
    return { success: true };
  }

  // Check if user has a password (not OAuth user)
  if (!user.password) {
    throw new Error("This account uses Google sign-in and cannot reset password");
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

  // Save token to database
  await db.updateUserById(user.id, {
    passwordResetToken: resetToken,
    passwordResetExpires: resetExpires,
  });

  // TODO: Send email with reset link
  // For now, just return the token (in production, this would be sent via email)
  console.log(`[Email Auth] Password reset token for ${email}: ${resetToken}`);

  return { success: true, token: resetToken };
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  // Find user with this token
  const allUsers = await db.getAllUsers();
  const user = allUsers.find(
    (u) =>
      u.passwordResetToken === token &&
      u.passwordResetExpires &&
      u.passwordResetExpires > new Date()
  );

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear reset token
  await db.updateUserById(user.id, {
    password: hashedPassword,
    passwordResetToken: null,
    passwordResetExpires: null,
  });

  return { success: true };
}

