import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { db } from "../../db";
import { meruUserRoles, meruAdmin2fa } from "@shared/schema";
import { eq } from "drizzle-orm";

async function lookupRole(userId: string): Promise<string> {
  const [row] = await db.select().from(meruUserRoles).where(eq(meruUserRoles.userId, userId));
  return row?.role ?? "user";
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      const role = await lookupRole(userId);
      const admin = role === "admin";

      let twoFaEnabled = false;
      let twoFaVerified = false;
      if (admin) {
        const [record] = await db.select().from(meruAdmin2fa).where(eq(meruAdmin2fa.userId, userId));
        twoFaEnabled = record?.isEnabled ?? false;
        twoFaVerified = !!(req.session as any)?.twoFaVerified;
      }

      res.json({
        ...user,
        role,
        twoFaEnabled,
        twoFaVerified,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/auth/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      const role = await lookupRole(userId);
      const admin = role === "admin";

      let twoFaEnabled = false;
      let twoFaVerified = false;
      if (admin) {
        const [record] = await db.select().from(meruAdmin2fa).where(eq(meruAdmin2fa.userId, userId));
        twoFaEnabled = record?.isEnabled ?? false;
        twoFaVerified = !!(req.session as any)?.twoFaVerified;
      }

      res.json({
        user: user ?? null,
        role,
        twoFaEnabled,
        twoFaVerified,
      });
    } catch (error) {
      console.error("Error fetching /api/auth/me:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
