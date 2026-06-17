import { authHttp } from "@/lib/authHttp";

export interface FileUploadResponse {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number | null;
  file_url: string;
  context: string | null;
  context_id: string | null;
  created_at: string;
}

export function uploadFile(
  file: File,
  context?: string,
  contextId?: string,
): Promise<{ data: FileUploadResponse }> {
  const form = new FormData();
  form.append("file", file);
  const params: Record<string, string> = {};
  if (context) params.context = context;
  if (contextId) params.context_id = contextId;

  return authHttp.post<FileUploadResponse>("/files/upload", form, {
    params,
    headers: { "Content-Type": "multipart/form-data" },
  });
}
