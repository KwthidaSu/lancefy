export interface FreelancerSkill {
  id: string;
  name: string;
  slug: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  role?: string | null;
  roles?: string[] | null;
  display_name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  status: string;
  kyc_status?: string;
  // Freelance fields (from UserFreelanceSkill)
  tagline?: string;
  tags?: string[];          // free-form tags — PATCH /auth/user
  skills?: FreelancerSkill[]; // structured skills — PUT /users/me/skills
  hourly_rate?: number;
  is_public?: boolean;
  created_at?: string;
}
