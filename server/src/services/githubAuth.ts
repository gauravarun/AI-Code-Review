import { env } from "../config/env";

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubProfile {
  id: number;
  login: string;
  avatar_url: string;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code,
    }),
  });

  const data = (await response.json()) as GitHubTokenResponse;
  if (!data.access_token) {
    throw new Error(data.error_description ?? "GitHub did not return an access token");
  }
  return data.access_token;
}

export async function fetchGitHubProfile(accessToken: string): Promise<GitHubProfile> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-code-review-tool",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub profile: ${response.status}`);
  }

  return (await response.json()) as GitHubProfile;
}
