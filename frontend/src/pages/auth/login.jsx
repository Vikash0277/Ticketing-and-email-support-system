import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Headset,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  loginUser,
  requestLoginOtp,
  verifyLoginOtp,
  resetAuthState,
} from "../../redux/auth/authSlice";

const modes = [
  { id: "password", label: "Email & Password" },
  { id: "email", label: "Email OTP" },
];

const dashboardByRole = {
  customer: "/customer/dashboard",
  agent: "/agent/dashboard",
  admin: "/admin/dashboard",
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    isLoginLoading,
    isOtpLoginLoading,
    isOtpLoginSent,
    isError,
    message,
  } = useSelector((state) => state.auth);

  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const isLoading = isLoginLoading || isOtpLoginLoading;
  const otpMode = mode === "email";

  useEffect(() => {
    if (user?.role) {
      navigate(dashboardByRole[user.role] || "/", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => dispatch(resetAuthState());
  }, [dispatch]);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setEmail("");
    setPassword("");
    setOtp("");
    setErrors({});
    dispatch(resetAuthState());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (mode === "password" && !password) {
      nextErrors.password = "Please enter your password.";
    }

    if (otpMode && isOtpLoginSent && !/^\d{6}$/.test(otp)) {
      nextErrors.otp = "Enter the 6-digit OTP.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      if (mode === "password") {
        await dispatch(
          loginUser({ email: normalizedEmail, password })
        ).unwrap();
      } else if (!isOtpLoginSent) {
        await dispatch(requestLoginOtp({ email: normalizedEmail })).unwrap();
      } else {
        await dispatch(
          verifyLoginOtp({ email: normalizedEmail, otp })
        ).unwrap();
      }
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        submit:
          typeof error === "string"
            ? error
            : error?.message || "Login failed. Please try again.",
      }));
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-left text-sm text-slate-900 outline-none transition placeholder:text-left placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Branding */}
      <section className="relative hidden overflow-hidden bg-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

        <Link to="/login" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700">
            <Headset size={25} />
          </span>
          <span className="text-xl font-bold tracking-tight">BitMax</span>
        </Link>

        <div className="relative max-w-lg">
          <span className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium">
            CUSTOMER SUPPORT PLATFORM
          </span>

          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            Every conversation brings you closer to a solution.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-indigo-100">
            Sign in to manage support tickets, follow updates, and communicate
            with your support team.
          </p>

          <div className="mt-10 space-y-5">
            {[
              "Track all your support tickets",
              "Get updates on ticket progress",
              "Reply by email or from the portal",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm">
                  ✓
                </span>
                <span className="text-sm text-indigo-50">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-indigo-200">
          © {new Date().getFullYear()} BitMax. All rights reserved.
        </p>
      </section>

      {/* Login */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="mb-8 flex items-center justify-center gap-2 text-lg font-bold text-indigo-700 lg:hidden"
          >
            <Headset size={25} />
            BitMax
          </Link>

          <div className="mb-7">
            <p className="mb-3 text-left text-sm font-semibold tracking-wide text-indigo-600">
              WELCOME BACK
            </p>
            <h2 className="text-left text-3xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-3 text-left text-sm leading-6 text-slate-500">
              Choose how you want to access your account.
            </p>
          </div>

          {location.state?.message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {location.state.message}
            </div>
          )}

          {isError && message && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {message}
            </div>
          )}

          {/* Login method tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeMode(item.id)}
                className={`rounded-lg px-2 py-3 text-xs font-semibold transition sm:text-sm ${
                  mode === item.id
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-left text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors({});
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {mode === "password" && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="text-left text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>
            )}

            {otpMode && isOtpLoginSent && (
              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block text-left text-sm font-medium text-slate-700"
                >
                  Enter 6-digit OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter verification code"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-lg tracking-[0.4em] text-slate-900 outline-none transition placeholder:tracking-normal focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
                {errors.otp && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.otp}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Enter the code sent to your email. In development the OTP is
                  also printed in the API console.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {mode === "password"
                    ? "Sign in"
                    : isOtpLoginSent
                      ? "Verify OTP and sign in"
                      : "Send OTP"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {otpMode && isOtpLoginSent && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  dispatch(resetAuthState());
                  setOtp("");
                  setErrors({});
                }}
                className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                Change email address
              </button>
            )}
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">NEW TO BITMAX?</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Link
            to="/register"
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            Create an account
          </Link>

          <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <ShieldCheck size={15} />
            Secure authentication for your account.
          </p>
        </div>
      </section>
    </main>
  );
}
