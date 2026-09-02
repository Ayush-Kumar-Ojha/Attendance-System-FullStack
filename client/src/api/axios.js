import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_BASE_URL || "http://localhost:4000";
const cleanBaseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
const baseURL = cleanBaseUrl.endsWith("/api") ? cleanBaseUrl : `${cleanBaseUrl}/api`;

const api = axios.create({
    baseURL,
});

// Attach Auth token to all network requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;