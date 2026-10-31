import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Headset,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { resetPassword, resetAuthState } from "../../redux/auth/authSlice";

export default function ResetPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const { isResetPasswordLoading, isResetPasswordSuccess, isError, message } =
    useSelector((state) => state.auth);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    return () => dispatch(resetAuthState());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!token) {
      nextErrors.token = "This reset link is missing its token.";
    }

    if (password.length < 8) {
      nextErrors.password = "Password must contain at least 8 characters.";
    } else if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      nextErrors.password = "Use uppercase, lowercase, and numeric characters.";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      await dispatch(resetPassword({ token, password })).unwrap();
    } catch {
      // Redux stores the API error message.
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-left text-sm text-slate-900 outline-none transition placeholder:text-left placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

        <Link to="/login" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700">
            <Headset size={25} />
          </span>
          <span className="text-xl font-bold tracking-tight">SupportDesk</span>
        </Link>

        <div className="relative max-w-lg">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <LockKeyhole size={30} />
          </span>
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            A fresh start for your account.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-indigo-100">
            Choose a strong, unique password to protect your account and support
            conversations.
          </p>
        </div>

        <p className="relative text-xs text-indigo-200">
          © {new Date().getFullYear()} SupportDesk. All rights reserved.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="mb-10 flex items-center justify-center gap-2 text-lg font-bold text-indigo-700 lg:hidden"
          >
            <Headset size={25} />
            SupportDesk
          </Link>

          <Link
            to="/login"
            className="mb-9 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to login
          </Link>

          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {isResetPasswordSuccess ? (
              <CheckCircle2 size={30} />
            ) : (
              <LockKeyhole size={30} />
            )}
          </div>

          {isResetPasswordSuccess ? (
            <>
              <h2 className="text-left text-3xl font-bold tracking-tight text-slate-900">
                Password updated
              </h2>
              <p className="mt-3 text-left text-sm leading-6 text-slate-500">
                Your password has been reset successfully. You can now sign in
                using your new password.
              </p>

              <button
                type="button"
                onClick={() => {
                  dispatch(resetAuthState());
                  navigate("/login", { replace: true });
                }}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Continue to login
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <p className="mb-3 text-left text-sm font-semibold tracking-wide text-indigo-600">
                ACCOUNT RECOVERY
              </p>
              <h2 className="text-left text-3xl font-bold tracking-tight text-slate-900">
                Reset your password
              </h2>
              <p className="mt-3 text-left text-sm leading-6 text-slate-500">
                Create a new password for your account.
              </p>

              {!token && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  This reset link is missing its token. Please request a new
                  password reset email.
                  <Link
                    to="/forgot-password"
                    className="ml-1 font-semibold underline"
                  >
                    Request a new link
                  </Link>
                </div>
              )}

              {isError && message && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {message}
                </div>
              )}

              {errors.token && (
                <p className="mt-2 text-sm text-red-600">{errors.token}</p>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-7 space-y-5"
              >
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-left text-sm font-medium text-slate-700"
                  >
                    New password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setErrors((previous) => ({
                          ...previous,
                          password: "",
                        }));
                      }}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {errors.password ? (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.password}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500">
                      At least 8 characters, including uppercase, lowercase, and
                      a number.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-left text-sm font-medium text-slate-700"
                  >
                    Confirm new password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setErrors((previous) => ({
                          ...previous,
                          confirmPassword: "",
                        }));
                      }}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isResetPasswordLoading || !token}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetPasswordLoading ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      Reset password
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <ShieldCheck size={15} />
            Secure account recovery
          </p>
        </div>
      </section>
    </main>
  );
}
