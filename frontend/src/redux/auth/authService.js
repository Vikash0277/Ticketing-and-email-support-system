import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

const verifyOtp = async (data) => {
  const response = await axios.post(`${API_URL}/verify-otp`, data);
  return response.data;
};

const resendOtp = async (data) => {
  const response = await axios.post(`${API_URL}/resend-otp`, data);
  return response.data;
};

const login = async (credentials) => {
  const response = await axios.post(`${API_URL}/login-password`, credentials);
  return response.data;
};

const forgotPassword = async (data) => {
  const response = await axios.post(`${API_URL}/forgot-password`, data);
  return response.data;
};

const requestLoginOtp = async (data) => {
  const response = await axios.post(
    `${API_URL}/login-otp`,
    data
  );
  return response.data;
};

const verifyLoginOtp = async (data) => {
  const response = await axios.post(
    `${API_URL}/verify-login-otp`,
    data
  );
  return response.data;
};

const resetPassword = async (data) => {
  const response = await axios.post(
    `${API_URL}/reset-password`,
    data
  );
  return response.data;
};

const authService = {
  register,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  requestLoginOtp,
  verifyLoginOtp,
  resetPassword
};

export default authService;