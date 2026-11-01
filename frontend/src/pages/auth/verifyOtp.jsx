import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headset,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  verifyOtp,
  resendOtp,
} from "../../redux/auth/authSlice";

export default function VerifyOtp() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const { isOtpLoading, isOtpSuccess, isResendingOtp, isError, message } =
    useSelector((state) => state.auth);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [notice, setNotice] = useState("");
  const [localError, setLocalError] = useState("");

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setSecondsLeft((seconds) => seconds - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (isOtpSuccess) {
      navigate("/login", {
        replace: true,
        state: { message },
      });
    }
  }, [isOtpSuccess, message, navigate]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    setOtp((previous) => {
      const updated = [...previous];
      updated[index] = digit;
      return updated;
    });

    setLocalError("");
    setNotice("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    const digits = Array.from({ length: 6 }, (_, index) => pasted[index] || "");

    setOtp(digits);
    setLocalError("");
    setNotice("");

    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const code = otp.join("");

    if (code.length !== 6) {
      setLocalError("Please enter all 6 digits.");
      return;
    }

    try {
      await dispatch(
        verifyOtp({
          email,
          otp: code,
        }),
      ).unwrap();

    } catch (error) {
      console.error("OTP verification failed:", error);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || isResendingOtp) return;

    setLocalError("");
    setNotice("");

    try {
      const result = await dispatch(resendOtp({ email })).unwrap();

      setOtp(["", "", "", "", "", ""]);
      setSecondsLeft(60);
      setNotice(result.message || "A new OTP has been sent.");
      inputRefs.current[0]?.focus();
    } catch {
      // The Redux slice stores the API error message.
    }
  };

  const displayError = localError || (isError ? message : "");

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Branding panel */}
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
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <ShieldCheck size={30} />
          </span>

          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            One more step to get started.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-indigo-100">
            Verify your email address to secure your account and start managing
            your support requests.
          </p>

          <div className="mt-10 flex items-center gap-3 text-sm text-indigo-100">
            <CheckCircle2 size={20} />
            <span>Secure account verification</span>
          </div>
        </div>

        <p className="relative text-xs text-indigo-200">
          © {new Date().getFullYear()} BitMax. All rights reserved.
        </p>
      </section>

      {/* Verification form */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/register"
            className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to registration
          </Link>

          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Mail size={30} />
          </div>

          <div className="mb-8">
            <p className="mb-3 text-left text-sm font-semibold tracking-wide text-indigo-600">
              EMAIL VERIFICATION
            </p>

            <h2 className="text-left text-3xl font-bold tracking-tight text-slate-900">
              Check your inbox
            </h2>

            <p className="mt-3 text-left text-sm leading-6 text-slate-500">
              We sent a verification code to
            </p>

            <p className="mt-1 break-all text-left text-sm font-semibold text-slate-800">
              {email || "your registered email"}
            </p>
          </div>

          {displayError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {displayError}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="mb-3 block text-left text-sm font-medium text-slate-700">
              Enter your 6-digit verification code
            </label>

            <div className="mb-6 grid grid-cols-6 gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  aria-label={`OTP digit ${index + 1}`}
                  className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white text-center text-xl font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:h-14"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isOtpLoading || otp.join("").length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isOtpLoading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify email
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 text-center">
            <p className="text-sm text-slate-500">Didn't receive the code?</p>

            <button
              type="button"
              onClick={handleResend}
              disabled={secondsLeft > 0 || isResendingOtp}
              className="mt-2 inline-flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isResendingOtp ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Sending code...
                </>
              ) : secondsLeft > 0 ? (
                `Resend code in 00:${String(secondsLeft).padStart(2, "0")}`
              ) : (
                <>
                  <RefreshCw size={15} />
                  Resend verification code
                </>
              )}
            </button>
          </div>

          <p className="mt-10 text-center text-xs leading-5 text-slate-400">
            If you don't see the email, check your spam or junk folder.
          </p>
        </div>
      </section>
    </main>
  );
}
