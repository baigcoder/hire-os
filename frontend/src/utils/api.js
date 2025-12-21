import axios from "axios";

const getBaseUrl = () => {
    let base = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
    if (base.endsWith("/")) base = base.slice(0, -1);
    if (!base.endsWith("/api/v1") && base.startsWith("http") && !base.includes("/api/v")) {
        base = `${base}/api/v1`;
    }
    return base;
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// Add a request interceptor to include the JWT token in headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If we get a 401, the token might be expired
        if (error.response?.status === 401) {
            console.warn("🔐 Session expired or invalid token");
            // Optional: Redirect to login or clear local state
        }
        return Promise.reject(error);
    }
);

export default api;
