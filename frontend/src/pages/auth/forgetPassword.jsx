import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headset,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { forgotPassword, resetAuthState } from "../../redux/auth/authSlice";

export default function ForgotPassword() {
  const dispatch = useDispatch();

  const { isForgotPasswordLoading, isForgotPasswordSuccess, isError, message } =
    useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => dispatch(resetAuthState());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");

    try {
      await dispatch(forgotPassword({ email: normalizedEmail })).unwrap();
    } catch {
      // Redux stores the API error message.
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-left text-sm text-slate-900 outline-none transition placeholder:text-left placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
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
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <ShieldCheck size={30} />
          </span>
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            Get back to what matters.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-indigo-100">
            Recover access to your account securely and continue managing your
            support conversations.
          </p>
        </div>

        <p className="relative text-xs text-indigo-200">
          © {new Date().getFullYear()} BitMax. All rights reserved.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="mb-10 flex items-center justify-center gap-2 text-lg font-bold text-indigo-700 lg:hidden"
          >
            <Headset size={25} />
            BitMax
          </Link>

          <Link
            to="/login"
            className="mb-9 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to login
          </Link>

          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {isForgotPasswordSuccess ? (
              <CheckCircle2 size={30} />
            ) : (
              <Mail size={30} />
            )}
          </div>

          {isForgotPasswordSuccess ? (
            <>
              <h2 className="text-left text-3xl font-bold tracking-tight text-slate-900">
                Check your email
              </h2>
              <p className="mt-3 text-left text-sm leading-6 text-slate-500">
                If an account exists for{" "}
                <span className="font-semibold text-slate-700">
                  {email.trim()}
                </span>
                , you will receive instructions to reset your password. Check
                your inbox and spam folder.
              </p>

              <Link
                to="/login"
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Return to login
                <ArrowRight size={18} />
              </Link>
            </>
          ) : (
            <>
              <p className="mb-3 text-left text-sm font-semibold tracking-wide text-indigo-600">
                ACCOUNT RECOVERY
              </p>
              <h2 className="text-left text-3xl font-bold tracking-tight text-slate-900">
                Forgot your password?
              </h2>
              <p className="mt-3 text-left text-sm leading-6 text-slate-500">
                Enter the email address associated with your account. We will
                send you a password reset link.
              </p>

              {isError && message && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {message}
                </div>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-7 space-y-5"
              >
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
                      name="email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError("");
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotPasswordLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isForgotPasswordLoading ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" />
                      Sending instructions...
                    </>
                  ) : (
                    <>
                      Send reset link
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
