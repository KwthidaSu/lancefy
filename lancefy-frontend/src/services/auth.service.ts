import { authHttp } from "@/lib/authHttp";
import type { CurrentUser } from "@/auth/auth.types";

type UpdateCurrentUserPayload = Partial<Omit<CurrentUser, "skills" | "tags">> & {
  tags?: string[];
};

class AuthService {
  async getCurrentUser(): Promise<CurrentUser> {
    const res = await authHttp.get<CurrentUser>("/auth/user");
    return res.data;
  }

  async updateCurrentUser(data: UpdateCurrentUserPayload): Promise<CurrentUser> {
    const res = await authHttp.patch<CurrentUser>("/auth/user", data);
    return res.data;
  }
}

export const authService = new AuthService();
