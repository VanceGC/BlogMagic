import { Router } from "express";
import * as emailAuth from "../_core/emailAuth";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";

const router = Router();

/**
 * POST /api/auth/signup
 * Create a new user with email and password
 */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Create user
    const user = await emailAuth.createUser(email, password, name);

    if (!user) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    // Create JWT session token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      ENV.jwtSecret,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[Email Auth] Signup error:", error);
    res.status(400).json({ error: error.message || "Signup failed" });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Authenticate user
    const user = await emailAuth.authenticateUser(email, password);

    // Create JWT session token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      ENV.jwtSecret,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[Email Auth] Login error:", error);
    res.status(401).json({ error: error.message || "Login failed" });
  }
});

/**
 * POST /api/auth/request-reset
 * Request a password reset
 */
router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await emailAuth.requestPasswordReset(email);
    
    // Always return success to avoid revealing if user exists
    res.json({ success: true, message: "If an account exists with this email, a password reset link has been sent." });
  } catch (error: any) {
    console.error("[Email Auth] Password reset request error:", error);
    res.status(400).json({ error: error.message || "Password reset request failed" });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    await emailAuth.resetPassword(token, password);

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error: any) {
    console.error("[Email Auth] Password reset error:", error);
    res.status(400).json({ error: error.message || "Password reset failed" });
  }
});

export default router;

