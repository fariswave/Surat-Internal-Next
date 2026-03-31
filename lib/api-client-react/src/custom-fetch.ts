export type ErrorType<T = unknown> = T;
export type BodyType<T> = T;
export type CustomFetchOptions = RequestInit & { responseType?: "json" | "text" | "blob" | "auto" };

export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    let errorMessage = response.statusText;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorMessage;
    } catch (e) {
      // Ignore
    }
    throw { message: errorMessage };
  }
  
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    return {} as T; // Fallback
  }
};
