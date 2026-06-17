import { authHttp } from "@/lib/authHttp";
import { publicApi } from "@/services/api";

export interface PortfolioFile {
  id: string;
  portfolio_id: string;
  file_url: string;
  created_at: string;
}

export interface FreelancerPortfolio {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  is_public?: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  files: PortfolioFile[];
}

export interface PortfolioUpsert {
  title?: string;
  description?: string;
}

/** Public � get any user portfolio */
export function getUserPortfolio(userId: string) {
  return publicApi.get<FreelancerPortfolio>(`/portfolio/user/${userId}`);
}

/** Auth � get my portfolio */
export function getMyPortfolio() {
  return authHttp.get<FreelancerPortfolio>("/portfolio/mine");
}

/** Auth � create or update portfolio info */
export function upsertMyPortfolio(data: PortfolioUpsert) {
  return authHttp.put<FreelancerPortfolio>("/portfolio/mine", data);
}

/** Auth � upload a file to my portfolio */
export function uploadPortfolioFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return authHttp.post<PortfolioFile>("/portfolio/mine/files", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** Auth � delete a file from my portfolio */
export function deletePortfolioFile(fileId: string) {
  return authHttp.delete(`/portfolio/mine/files/${fileId}`);
}
// ── Multi-folder management ───────────────────────────────────────────────

/** Auth — list all my portfolio folders */
export function getMyPortfolios() {
  return authHttp.get<FreelancerPortfolio[]>("/portfolio/mine/all");
}

/** Public — list all portfolio folders for a user */
export function getUserPortfolios(userId: string) {
  return publicApi.get<FreelancerPortfolio[]>(`/portfolio/user/${userId}/all`);
}

/** Auth — create a new portfolio folder */
export function createPortfolio(data: PortfolioUpsert & { is_public?: boolean }) {
  return authHttp.post<FreelancerPortfolio>("/portfolio/mine", data);
}

/** Auth — update a specific portfolio folder */
export function updatePortfolio(id: string, data: PortfolioUpsert & { is_public?: boolean }) {
  return authHttp.patch<FreelancerPortfolio>(`/portfolio/mine/${id}`, data);
}

/** Auth — delete a specific portfolio folder */
export function deletePortfolio(id: string) {
  return authHttp.delete(`/portfolio/mine/${id}`);
}

/** Auth — upload a file to a specific portfolio folder */
export function uploadFileToPortfolio(portfolioId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return authHttp.post<PortfolioFile>(`/portfolio/mine/${portfolioId}/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** Auth — delete a file from a specific portfolio folder */
export function deleteFileFromPortfolio(portfolioId: string, fileId: string) {
  return authHttp.delete(`/portfolio/mine/${portfolioId}/files/${fileId}`);
}