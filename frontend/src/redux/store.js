import { configureStore } from "@reduxjs/toolkit";
import authReducer, { AUTH_SESSION_STORAGE_KEY } from "./auth/authSlice";
import ticketsReducer from "./tickets/ticketsSlice";
import categoriesReducer from "./categories/categoriesSlice";
import usersReducer from "./users/usersSlice";
import notificationsReducer from "./notifications/notificationsSlice";
import dashboardReducer from "./dashboard/dashboardSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    tickets: ticketsReducer,
    categories: categoriesReducer,
    users: usersReducer,
    notifications: notificationsReducer,
    dashboard: dashboardReducer,
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
