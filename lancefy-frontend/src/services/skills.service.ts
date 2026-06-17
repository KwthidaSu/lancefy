import { authHttp } from "@/lib/authHttp";
import { publicApi } from "@/services/api";

export interface SkillResponse {
  id: string;
  name: string;
  slug: string;
}

export interface CategorySimpleResponse {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface CategoryResponse extends CategorySimpleResponse {
  subcategories: SubcategoryResponse[];
}

export interface SubcategoryResponse {
  id: string;
  name: string;
  slug: string;
  skills: SkillResponse[];
}

// ─────────────────────────────────────────────────────────────────
// Categories (public)
// ─────────────────────────────────────────────────────────────────

export function listCategories() {
  return publicApi.get<CategoryResponse[]>("/skills/categories");
}

export function listCategoriesSimple() {
  return publicApi.get<CategorySimpleResponse[]>("/skills/categories/simple");
}

// ─────────────────────────────────────────────────────────────────
// Skills search (public)
// ─────────────────────────────────────────────────────────────────

export function searchSkills(q: string, limit = 20) {
  return publicApi.get<SkillResponse[]>("/skills/search", { params: { q, limit } });
}

// ─────────────────────────────────────────────────────────────────
// User skills (auth required)
// ─────────────────────────────────────────────────────────────────

export function getMySkills() {
  return authHttp.get<{ data: SkillResponse[] }>("/users/me/skills");
}

export function setMySkills(skillIds: string[]) {
  return authHttp.put<{ data: SkillResponse[] }>("/users/me/skills", { skill_ids: skillIds });
}

export function getOrCreateSkill(name: string) {
  return authHttp.post<SkillResponse>("/skills/get-or-create", { name });
}

export function addMySkill(skillId: string) {
  return authHttp.post("/users/me/skills", { skill_id: skillId });
}

export function removeMySkill(skillId: string) {
  return authHttp.delete(`/users/me/skills/${skillId}`);
}
