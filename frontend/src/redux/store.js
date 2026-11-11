import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authSlice from "./authSlice";
import jobSlice from "./jobSlice";
import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import companySlice from "./companySlice";
import applicationSlice from "./applicationSlice";

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  // Only the signed-in user is kept across reloads; lists (jobs, applicants, companies) are refetched
  whitelist: ["auth"],
};

const rootReducer = combineReducers({
  auth: authSlice,
  job: jobSlice,
  company: companySlice,
  application: applicationSlice,
});

// Logging out resets every slice, so persisted PII is overwritten on a shared machine
const resettingReducer = (state, action) =>
  action.type === "auth/logout" ? rootReducer(undefined, action) : rootReducer(state, action);

const persistedReducer = persistReducer(persistConfig, resettingReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});
export default store;
