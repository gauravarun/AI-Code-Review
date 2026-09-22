import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { exchangeCodeForToken, fetchGitHubProfile } from "../services/githubAuth";
import { encryptToken } from "../services/crypto";
import { AUTH_COOKIE_NAME, requireAuth, signAuthToken } from "../middleware/auth";

export const authRouter = Router();

const OAUTH_STATE_COOKIE = "acr_oauth_state";

authRouter.get("/github", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: env.github.clientId,
    redirect_uri: env.github.callbackUrl,
    scope: "read:user repo",
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

authRouter.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE);

  if (typeof code !== "string" || typeof state !== "string" || state !== expectedState) {
    res.redirect(`${env.clientUrl}/login?error=oauth_failed`);
    return;
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const profile = await fetchGitHubProfile(accessToken);

    const user = await prisma.user.upsert({
      where: { githubId: String(profile.id) },
      update: {
        username: profile.login,
        avatarUrl: profile.avatar_url,
        githubAccessToken: encryptToken(accessToken),
      },
      create: {
        githubId: String(profile.id),
        username: profile.login,
        avatarUrl: profile.avatar_url,
        githubAccessToken: encryptToken(accessToken),
      },
    });

    const sessionToken = signAuthToken({ userId: user.id });
    res.cookie(AUTH_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.nodeEnv === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(env.clientUrl);
  } catch (error) {
    console.error("GitHub OAuth callback failed", error);
    res.redirect(`${env.clientUrl}/login?error=oauth_failed`);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, avatarUrl: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).end();
});
