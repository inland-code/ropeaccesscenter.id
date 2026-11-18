/** Klien API dashboard. Semua panggilan ke Worker /api/admin/* (dilindungi login GitHub + cookie sesi). */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, { credentials: 'same-origin', ...init });
  const type = res.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError((data as { error?: string })?.error ?? `HTTP ${res.status}`, res.status);
  return data as T;
}

export type FileEntry = { path: string; sha: string; size: number };
export type FileData = { path: string; sha: string; content: string };
export type Me = { email: string; repo: string; branch: string; github: boolean; db: boolean };
export type Run = { id: number; status: string; conclusion: string | null; created_at: string; html_url: string; head_commit: string };
export type Message = {
  id: number;
  created_at: string;
  locale: string;
  page: string | null;
  name: string;
  phone: string | null;
  service: string | null;
  message: string;
  status: string;
  country: string | null;
  city: string | null;
};

export const api = {
  me: () => call<Me>('/me'),
  deploys: () => call<Run[]>('/deploys'),
  files: (dir: string) => call<FileEntry[]>(`/files?dir=${encodeURIComponent(dir)}`),
  read: (path: string) => call<FileData>(`/file?path=${encodeURIComponent(path)}`),
  write: (path: string, content: string, sha: string | undefined, message: string) =>
    call<{ sha: string; commit: string }>(`/file?path=${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sha, message }),
    }),
  remove: (path: string, sha: string) => call<{ ok: true }>(`/file?path=${encodeURIComponent(path)}&sha=${sha}`, { method: 'DELETE' }),
  upload: (file: Blob, name: string, folder: string) => {
    const fd = new FormData();
    fd.set('file', file, name);
    fd.set('name', name.replace(/\.[^.]+$/, ''));
    fd.set('folder', folder);
    return call<{ path: string; image: string }>('/media', { method: 'POST', body: fd });
  },
  messages: (status?: string) =>
    call<{ items: Message[]; counts: Record<string, number>; db: boolean }>(`/messages${status ? `?status=${status}` : ''}`),
  setMessageStatus: (id: number, status: string) =>
    call<{ ok: true }>(`/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
};

export const rawImageUrl = (image: string) => `/api/admin/media/raw?path=${encodeURIComponent(`src/assets/images/${image}`)}`;

/** Data statis hasil build: JSON Schema form + daftar tautan & gambar. */
export type JsonSchema = {
  type?: string | string[];
  title?: string;
  description?: string;
  widget?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  enum?: (string | number)[];
  const?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};
export type StaticSchema = {
  page: JsonSchema;
  post: JsonSchema;
  site: JsonSchema;
  data: Record<string, { title: string; schema: JsonSchema }>;
  links: { key: string; title: string; path: string }[];
  images: string[];
};
let schemaPromise: Promise<StaticSchema> | undefined;
export const loadSchema = () => (schemaPromise ??= fetch('/admin/schema.json').then((r) => r.json() as Promise<StaticSchema>));
