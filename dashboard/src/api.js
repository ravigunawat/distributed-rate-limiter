import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({ baseURL: API_URL });

export const getHealth = () => api.get("/api/health").then((r) => r.data);
export const getClients = () => api.get("/api/clients").then((r) => r.data);
export const createClient = (data) => api.post("/api/clients", data).then((r) => r.data);
export const updateClientTier = (id, tier) =>
  api.put(`/api/clients/${id}/tier`, { tier }).then((r) => r.data);
export const getPolicies = () => api.get("/api/policies").then((r) => r.data);
export const updatePolicy = (tier, data) =>
  api.put(`/api/policies/${tier}`, data).then((r) => r.data);
export const getUsage = (apiKey) => api.get(`/api/usage/${apiKey}`).then((r) => r.data);
export const checkRateLimit = (apiKey, route = "default") =>
  api
    .post(
      "/api/check",
      { route },
      { headers: { "X-API-Key": apiKey } }
    )
    .then((r) => r.data)
    .catch((e) => e.response?.data || { error: "request failed" });
