export type Relevance = "CAN_ANSWER" | "PARTIAL" | "NO_MATCH";

export interface QueryResponse {
  answer: string;
  verification_report: string;
  relevance: Relevance;
}

export interface UploadResponse {
  document_ids: string[];
}

export interface Example {
  id: string;
  title: string;
  description: string;
  sampleQuestion: string;
}

export type AppStatus = "idle" | "uploading" | "ready" | "querying" | "error";
