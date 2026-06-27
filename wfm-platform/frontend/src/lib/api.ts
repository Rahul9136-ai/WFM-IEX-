import axios from "axios"

/**
 * Central HTTP client. Auth-token injection + 401 refresh interceptors are
 * added in Module 2 (Authentication). For now it carries the base URL and a
 * sane timeout, and unwraps the API error envelope.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
})

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const envelope = error.response?.data?.error as ApiError | undefined
    return Promise.reject(envelope ?? { code: "network_error", message: error.message })
  },
)
