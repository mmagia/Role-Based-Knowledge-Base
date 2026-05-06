export type Writer = {
  nickname: string;
  is_confirmed: boolean;
  hashed_password?: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  writer: Writer;
};

export type Post = {
  post_id: string;
  writer_nickname: string;
  post_text: string;
  created_at: string;
};

export type PaginatedPosts = {
  posts: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PostCount = {
  writer_nickname: string;
  post_count: number;
};

export type DeleteResponse = {
  message: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return payload as T;
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await parseResponse<T>(await fetch(input, init));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Backend недоступен. Проверьте, что FastAPI запущен на localhost:8000.");
    }

    throw error;
  }
}

export async function registerWriter(nickname: string, password: string) {
  return request<Writer>(`${API_BASE_URL}/writer/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
}

export async function loginWriter(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.set("username", username);
  formData.set("password", password);

  return request<LoginResponse>(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });
}

export async function getCurrentWriter(token: string) {
  return request<Writer>(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getPosts(page = 1, pageSize = 8) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return request<PaginatedPosts>(`${API_BASE_URL}/post/paginated/?${params}`);
}

export async function getAllPosts(offset = 0, limit = 100) {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  return request<Post[]>(`${API_BASE_URL}/post/?${params}`);
}

export async function searchPosts(searchTerm: string) {
  const params = new URLSearchParams({ search_term: searchTerm });
  return request<Post[]>(`${API_BASE_URL}/post/search/?${params}`);
}

export async function getPostsByWriter(writerNickname: string) {
  return request<Post[]>(`${API_BASE_URL}/post/writer/${encodeURIComponent(writerNickname)}`);
}

export async function getRecentPosts(hours: number) {
  return request<Post[]>(`${API_BASE_URL}/post/recent/${hours}`);
}

export async function getPostsByDateRange(startDate: string, endDate: string) {
  const params = new URLSearchParams({
    start_date: new Date(startDate).toISOString(),
    end_date: new Date(endDate).toISOString(),
  });

  return request<Post[]>(`${API_BASE_URL}/post/date-range/?${params}`);
}

export async function getPost(postId: string) {
  return request<Post>(`${API_BASE_URL}/post/${postId}`);
}

export async function createPost(writerNickname: string, postText: string) {
  return request<Post>(`${API_BASE_URL}/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      writer_nickname: writerNickname,
      post_text: postText,
    }),
  });
}

export async function deletePost(postId: string) {
  return request<DeleteResponse>(`${API_BASE_URL}/post/${postId}`, {
    method: "DELETE",
  });
}

export async function getWriter(nickname: string) {
  return request<Writer>(`${API_BASE_URL}/writer/${encodeURIComponent(nickname)}`);
}

export async function getWriters(skip = 0, limit = 100) {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });

  return request<Writer[]>(`${API_BASE_URL}/writer/?${params}`);
}

export async function confirmWriter(nickname: string) {
  return request<Writer>(`${API_BASE_URL}/writer/confirm/${encodeURIComponent(nickname)}`, {
    method: "PATCH",
  });
}

export async function getPostCount(nickname: string) {
  return request<PostCount>(`${API_BASE_URL}/post/count/${encodeURIComponent(nickname)}`);
}

export async function deletePostsByWriter(nickname: string) {
  return request<DeleteResponse>(`${API_BASE_URL}/post/writer/${encodeURIComponent(nickname)}`, {
    method: "DELETE",
  });
}
