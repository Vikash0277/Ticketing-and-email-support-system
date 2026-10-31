import client from "../../api/client";

const API_URL = "/auth";

async function request(path, payload) {
  const response = await client.post(`${API_URL}${path}`, payload);
  return response.data;
}

const register = (userData) => request("/register", userData);

const verifyOtp = (data) => request("/verify-otp", data);

const resendOtp = (data) => request("/resend-otp", data);

const login = (credentials) => request("/login-password", credentials);

const requestLoginOtp = (data) => request("/login-otp", data);

const verifyLoginOtp = (data) => request("/verify-login-otp", data);

const forgotPassword = (data) => request("/forgot-password", data);

const resetPassword = (data) => request("/reset-password", data);

const authService = {
  register,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  requestLoginOtp,
  verifyLoginOtp,
  resetPassword,
};

export default authService;
