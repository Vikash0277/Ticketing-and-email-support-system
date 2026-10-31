import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import authService from "./authService";

export const AUTH_SESSION_STORAGE_KEY = "authSession";

const getPersistedSession = () => {
    if (typeof window === "undefined") {
        return {};
    }

    try {
        const serializedSession = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (!serializedSession) {
            return {};
        }

        const session = JSON.parse(serializedSession);
        if (!session?.user || typeof session.user !== "object") {
            localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
            return {};
        }

        return {
            user: session.user,
            accessToken: typeof session.accessToken === "string" ? session.accessToken : null,
            refreshToken: typeof session.refreshToken === "string" ? session.refreshToken : null,
        };
    } catch (error) {
        console.error("Unable to restore the saved authentication session.", error);
        localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return {};
    }
};

const getAuthData = (response) => response?.data ?? response;

export const registerUser = createAsyncThunk(
    "auth/register",
    async (userData, { rejectWithValue }) => {
        try {
            return await authService.register(userData);
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Registration failed. Please try again."
            );
        }
    }
);

export const verifyOtp = createAsyncThunk(
    "auth/verifyOtp",
    async (data, thunkAPI) => {
        try {
            return await authService.verifyOtp(data);
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "OTP verification failed."
            );
        }
    }
);

export const resendOtp = createAsyncThunk(
    "auth/resendOtp",
    async (data, thunkAPI) => {
        try {
            return await authService.resendOtp(data);
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Could not resend OTP."
            );
        }
    }
);

export const loginUser = createAsyncThunk(
    "auth/login",
    async (credentials, thunkAPI) => {
        try {
            return await authService.login(credentials);
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Unable to sign in."
            );
        }
    }
);

export const requestLoginOtp = createAsyncThunk(
    "auth/requestLoginOtp",
    async (data, thunkAPI) => {
        try {
            return await authService.requestLoginOtp(data);
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Unable to send OTP."
            );
        }
    }
);

export const verifyLoginOtp = createAsyncThunk(
    "auth/verifyLoginOtp",
    async (data, thunkAPI) => {
        try {
            return await authService.verifyLoginOtp(data);
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || "Invalid or expired OTP."
            );
        }
    }
);

export const forgotPassword = createAsyncThunk(
    "auth/forgotPassword",
    async (data, thunkAPI) => {
        try {
            return await authService.forgotPassword(data);
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ||
                "Unable to process your request."
            );
        }
    }
);

export const resetPassword = createAsyncThunk(
    "auth/resetPassword",
    async (data, thunkAPI) => {
        try {
            return await authService.resetPassword(data);
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ||
                "Unable to reset your password."
            );
        }
    }
);

const initialState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    ...getPersistedSession(),
    registrationData: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    isOtpLoading: false,
    isOtpSuccess: false,
    isLoginLoading: false,
    isLoginSuccess: false,
    isOtpLoginLoading: false,
    isOtpLoginSent: false,
    isOtpLoginSuccess: false,
    isForgotPasswordLoading: false,
    isForgotPasswordSuccess: false,
    isResetPasswordLoading: false,
    isResetPasswordSuccess: false,
    message: "",
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        resetAuthState: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isOtpLoading = false;
            state.isOtpSuccess = false;
            state.isResendingOtp = false;
            state.isLoginLoading = false;
            state.isLoginSuccess = false;
            state.isOtpLoginLoading = false;
            state.isOtpLoginSent = false;
            state.isOtpLoginSuccess = false;
            state.isForgotPasswordLoading = false;
            state.isForgotPasswordSuccess = false;
            state.isResetPasswordLoading = false;
            state.isResetPasswordSuccess = false;
            state.isError = false;
            state.message = "";
        },
        clearRegistrationData: (state) => {
            state.registrationData = null;
        },
        setSession: (state, action) => {
            const session = action.payload ?? {};

            state.user = session.user ?? state.user;
            state.accessToken = session.accessToken ?? state.accessToken;
            state.refreshToken = session.refreshToken ?? state.refreshToken;
        },
        setUser: (state, action) => {
            state.user = action.payload ?? null;
        },
        clearAuth: () => ({
            ...initialState,
            user: null,
            accessToken: null,
            refreshToken: null,
        }),
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.isSuccess = false;
                state.isOtpLoading = false;
                state.isOtpSuccess = false;
                state.isError = false;
                state.message = "";
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.isError = false;
                state.message =
                    action.payload?.message || "Registration successful.";
                state.registrationData = action.payload;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isSuccess = false;
                state.isError = true;
                state.message = action.payload || "Something went wrong.";
            })
            .addCase(verifyOtp.pending, (state) => {
                state.isOtpLoading = true;
                state.isOtpSuccess = false;
                state.isError = false;
                state.message = "";
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.isOtpLoading = false;
                state.isOtpSuccess = true;
                state.isError = false;
                state.message =
                    action.payload?.message || "OTP verified successfully.";
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.isOtpLoading = false;
                state.isOtpSuccess = false;
                state.isError = true;
                state.message = action.payload || "OTP verification failed.";
            })
            // Resend OTP
            .addCase(resendOtp.pending, (state) => {
                state.isResendingOtp = true;
                state.isError = false;
                state.message = "";
            })
            .addCase(resendOtp.fulfilled, (state, action) => {
                state.isResendingOtp = false;
                state.message = action.payload.message ?? "A new OTP has been sent.";
            })
            .addCase(resendOtp.rejected, (state, action) => {
                state.isResendingOtp = false;
                state.isError = true;
                state.message = action.payload || "Could not resend OTP.";
            })
            .addCase(loginUser.pending, (state) => {
                state.isLoginLoading = true;
                state.isLoginSuccess = false;
                state.isError = false;
                state.message = "";
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoginLoading = false;
                state.isLoginSuccess = false;
                state.isError = true;
                state.message = action.payload || "Unable to sign in.";
            })
            .addCase(requestLoginOtp.pending, (state) => {
                state.isOtpLoginLoading = true;
                state.isOtpLoginSent = false;
                state.isError = false;
                state.message = "";
            })
            .addCase(requestLoginOtp.fulfilled, (state, action) => {
                state.isOtpLoginLoading = false;
                state.isOtpLoginSent = true;
                state.message = action.payload.message || "OTP sent successfully.";
            })
            .addCase(requestLoginOtp.rejected, (state, action) => {
                state.isOtpLoginLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(verifyLoginOtp.pending, (state) => {
                state.isOtpLoginLoading = true;
                state.isOtpLoginSuccess = false;
                state.isError = false;
                state.message = "";
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoginLoading = false;
                state.isLoginSuccess = true;
                state.isError = false;

                const authData = getAuthData(action.payload);

                state.user = authData?.user ?? null;
                state.accessToken = authData?.accessToken ?? null;
                state.refreshToken = authData?.refreshToken ?? null;
                state.message = action.payload?.message || "Login successful.";
            })
            .addCase(verifyLoginOtp.fulfilled, (state, action) => {
                state.isOtpLoginLoading = false;
                state.isOtpLoginSuccess = true;
                state.isError = false;

                const authData = getAuthData(action.payload);

                state.user = authData?.user ?? null;
                state.accessToken = authData?.accessToken ?? null;     
                state.refreshToken = authData?.refreshToken ?? null;
                state.message = action.payload?.message || "Login successful.";
            })
            // Forgot password
            .addCase(forgotPassword.pending, (state) => {
                state.isForgotPasswordLoading = true;
                state.isForgotPasswordSuccess = false;
                state.isError = false;
                state.message = "";
            })
            .addCase(forgotPassword.fulfilled, (state, action) => {
                state.isForgotPasswordLoading = false;
                state.isForgotPasswordSuccess = true;
                state.message =
                    action.payload.message ||
                    "If an account exists for this email, reset instructions will be sent.";
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.isForgotPasswordLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Reset password
            .addCase(resetPassword.pending, (state) => {
                state.isResetPasswordLoading = true;
                state.isResetPasswordSuccess = false;
                state.isError = false;
                state.message = "";
            })
            .addCase(resetPassword.fulfilled, (state, action) => {
                state.isResetPasswordLoading = false;
                state.isResetPasswordSuccess = true;
                state.message =
                    action.payload.message || "Password reset successfully.";
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.isResetPasswordLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
    },
});

export const {
    resetAuthState,
    clearRegistrationData,
    setSession,
    setUser,
    clearAuth,
} = authSlice.actions;

export default authSlice.reducer;