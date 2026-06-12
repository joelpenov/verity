import type { QueryResponse, UploadResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadDocuments(files: File[], token?: string): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function loadExample(exampleId: string, token?: string): Promise<UploadResponse> {
  const res = await fetch(`${API_URL}/examples/${exampleId}`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function queryDocuments(
  question: string,
  documentIds: string[],
  token?: string
): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ question, document_ids: documentIds }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
