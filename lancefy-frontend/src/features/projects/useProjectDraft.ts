export type ProjectDraft = {
  title: string;
  description?: string;
  images?: string[];
  budget: number;
  currency: string;
  category_code: string;
  category_label: string;
  category_codes?: string[];
  deadline_date?: string;
};

const STORAGE_KEY = "create-project-draft";

export function useProjectDraft() {
  const save = (draft: ProjectDraft) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  };

  const load = (): ProjectDraft | null => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  };

  const clear = () => {
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return { save, load, clear };
}
