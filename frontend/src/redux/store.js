import { configureStore } from "@reduxjs/toolkit";
import authReducer, { AUTH_SESSION_STORAGE_KEY } from "./auth/authSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

if (typeof window !== "undefined") {
  store.subscribe(() => {
    const { user, accessToken, refreshToken } = store.getState().auth;

    try {
      if (user) {
        localStorage.setItem(
          AUTH_SESSION_STORAGE_KEY,
          JSON.stringify({ user, accessToken, refreshToken }),
        );
      } else {
        localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Unable to save the authentication session.", error);
    }
  });
}

export default store;