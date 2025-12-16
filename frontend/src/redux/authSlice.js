import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
    name: "auth",
    initialState: {
        loading: false,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
        lastActivity: null,
        sessionExpiry: null
    },
    reducers: {
        // Set loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
            if (action.payload) {
                state.error = null; // Clear errors when loading starts
            }
        },
        // Set user after login/register
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
            state.lastActivity = Date.now();
            state.error = null;
        },
        // Set token
        setToken: (state, action) => {
            state.token = action.payload;
        },
        // Set authentication error
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        // Clear error
        clearError: (state) => {
            state.error = null;
        },
        // Update user profile
        updateUserProfile: (state, action) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },
        // Update specific profile field
        updateProfileField: (state, action) => {
            if (state.user && state.user.profile) {
                state.user.profile = { ...state.user.profile, ...action.payload };
            }
        },
        // Logout user
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            state.lastActivity = null;
            state.sessionExpiry = null;
        },
        // Update last activity timestamp
        updateLastActivity: (state) => {
            state.lastActivity = Date.now();
        },
        // Set session expiry
        setSessionExpiry: (state, action) => {
            state.sessionExpiry = action.payload;
        },
        // Add saved job
        addSavedJob: (state, action) => {
            if (state.user && !state.user.savedJobs) {
                state.user.savedJobs = [];
            }
            if (state.user && !state.user.savedJobs.includes(action.payload)) {
                state.user.savedJobs.push(action.payload);
            }
        },
        // Remove saved job
        removeSavedJob: (state, action) => {
            if (state.user && state.user.savedJobs) {
                state.user.savedJobs = state.user.savedJobs.filter(
                    jobId => jobId !== action.payload
                );
            }
        }
    }
});

export const {
    setLoading,
    setUser,
    setToken,
    setError,
    clearError,
    updateUserProfile,
    updateProfileField,
    logout,
    updateLastActivity,
    setSessionExpiry,
    addSavedJob,
    removeSavedJob
} = authSlice.actions;

export default authSlice.reducer;