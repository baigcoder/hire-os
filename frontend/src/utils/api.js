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
const API_ORIGIN = new URL(API_BASE_URL).origin;

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

/**
 * Sessions live in httpOnly cookies the page can't read: a 15-minute access
 * cookie and a refresh cookie. Requests to our API carry the cookies and the
 * header the server's CSRF check expects; a 401 renews the session once and
 * retries. Installed on `api` and on the global axios many screens still use.
 */
const toOurApi = (config) => {
    const url = config.baseURL && !/^https?:/.test(config.url ?? "") ? config.baseURL : config.url ?? "";
    try {
        return new URL(url, window.location.href).origin === API_ORIGIN;
    } catch {
        return false;
    }
};

// Calls that sign in or renew must not themselves trigger a renewal
const NO_RENEW = /\/user\/(login|register|refresh-token|logout)|\/otp\//;

let renewing = null;
const renewSession = () => {
    renewing ??= api
        .post("/user/refresh-token")
        .finally(() => {
            renewing = null;
        });
    return renewing;
};

const installAuth = (instance) => {
    instance.interceptors.request.use((config) => {
        if (toOurApi(config)) {
            config.withCredentials = true;
            config.headers["X-Requested-With"] = "XMLHttpRequest";
        }
        return config;
    });
    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const { config, response } = error;
            if (response?.status !== 401 || !config || config._renewed || !toOurApi(config) || NO_RENEW.test(config.url ?? "")) {
                return Promise.reject(error);
            }
            try {
                await renewSession();
            } catch {
                window.dispatchEvent(new Event("session-ended"));
                return Promise.reject(error);
            }
            config._renewed = true;
            return instance(config);
        },
    );
};

installAuth(api);
installAuth(axios);

// Tokens used to be kept here, readable by any script on the page
try {
    localStorage.removeItem("token");
} catch {
    // storage blocked: nothing to clear
}

export default api;
