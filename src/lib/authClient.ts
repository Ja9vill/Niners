export interface AuthUser {
  level: number;
  role: string;
  name: string;
  poppo_id: string;
  nickname: string;
  position: string;
  status: string;
  manager_assigned: string;
  anchor_team: string;
  profile_photo: string;
  token: string;
}

export interface AuthResponse {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

export async function loginWithPoppoId(poppoId: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ poppoId, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || "Login failed",
      };
    }

    return data;
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Network error during login",
    };
  }
}

export async function logoutRequest(token?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || "Logout failed",
      };
    }

    return data;
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Network error during logout",
    };
  }
}