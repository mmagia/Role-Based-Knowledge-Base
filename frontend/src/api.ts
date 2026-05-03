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
