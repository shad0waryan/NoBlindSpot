import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nbs_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("nbs_token");
      localStorage.removeItem("nbs_user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.patch("/auth/profile", data),
  onboard: (data) => api.post("/auth/onboard", data),

  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);

    return api.post("/auth/avatar", fd, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  deleteAvatar: () => api.delete("/auth/avatar"),
};

// ── Maps ─────────────────────────────────────
export const mapsAPI = {
  generate: (topic) => api.post("/maps/generate", { topic }),
  explain: (concept, parentTopic) =>
    api.post("/maps/explain", { concept, parentTopic }),
  quiz: (concepts, parentTopic) =>
    api.post("/maps/quiz", { concepts, parentTopic }),

  getAll: () => api.get("/maps"),
  getById: (id) => api.get(`/maps/${id}`),
  exportMap: (id) => api.get(`/maps/${id}/export`),
  learningPath: (id) => api.get(`/maps/${id}/learning-path`),

  updateNodes: (id, nodes) =>
    api.patch(`/maps/${id}/nodes`, { nodes }),

  saveNote: (id, nodeId, note) =>
    api.patch(`/maps/${id}/notes`, { nodeId, note }),

  delete: (id) => api.delete(`/maps/${id}`),
};

// ── Donate ───────────────────────────────────
export const donateAPI = {
  getTiers: () => api.get("/donate/tiers"),
  checkout: (data) => api.post("/donate/checkout", data),
};

export default api;