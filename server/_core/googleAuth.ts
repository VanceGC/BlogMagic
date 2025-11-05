import { Express, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { SignJWT } from "jose";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("[Google Auth] WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured");
}

// Configure Passport with Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value || "";
        const name = profile.displayName || "";
        const googleId = profile.id;

        // Check if user exists
        let user = await db.getUserByEmail(email);

        if (!user) {
          // Check if this is the first user (should be admin)
          const allUsers = await db.getAllUsers();
          const isFirstUser = allUsers.length === 0;
          
          // Create new user
          await db.createUser({
            openId: googleId,
            name: name,
            email: email,
            loginMethod: "google",
            role: isFirstUser ? "admin" : "user",
          });
          user = await db.getUserByEmail(email);
        } else {
          // Update last signed in
          if (user.openId) {
            await db.updateUser(user.openId, {
              lastSignedIn: new Date(),
            });
          }
        }

        return done(null, user);
      } catch (error) {
        console.error("[Google Auth] Error during authentication:", error);
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.openId);
});

passport.deserializeUser(async (openId: string, done) => {
  try {
    const user = await db.getUser(openId);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export function setupGoogleAuth(app: Express) {
  // Session middleware (required for Passport)
  app.use(
    session({
      secret: process.env.JWT_SECRET || "your-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as any;

        if (!user) {
          return res.redirect("/?error=auth_failed");
        }

        // Create JWT session cookie
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const sessionCookie = await new SignJWT({
          openId: user.openId,
          appId: process.env.VITE_APP_ID || "blogmagic",
          name: user.name,
          email: user.email,
          loginMethod: user.loginMethod,
          role: user.role,
        })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
          .sign(secret);

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionCookie, cookieOptions);

        // Redirect to dashboard
        res.redirect("/dashboard");
      } catch (error) {
        console.error("[Google Auth] Callback error:", error);
        res.redirect("/?error=auth_failed");
      }
    }
  );

  // Logout route
  app.get("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error("[Google Auth] Logout error:", err);
      }
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      res.redirect("/");
    });
  });
}

