import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Headset,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import { registerUser, resetAuthState } from "../../redux/auth/authSlice";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.auth,
  );

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      navigate("/verify-otp", {
        state: { email: form.email.trim().toLowerCase() },
      });

      dispatch(resetAuthState());
    }
  }, [isSuccess, navigate, dispatch, form.email]);

  useEffect(() => {
    return () => {
      dispatch(resetAuthState());
    };
  }, [dispatch]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
      form: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (form.name.trim().length < 2) {
      nextErrors.name = "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    const normalizedPhone = form.phone.replace(/[\s()-]/g, "");

    if (normalizedPhone && !/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) {
      nextErrors.phone = "Enter a valid phone number with country code.";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Password must contain at least 8 characters.";
    } else if (
      !/[A-Z]/.test(form.password) ||
      !/[a-z]/.test(form.password) ||
      !/[0-9]/.test(form.password)
    ) {
      nextErrors.password = "Use uppercase, lowercase, and numeric characters.";
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!acceptedTerms) {
      nextErrors.terms = "Please accept the terms to continue.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading || !validateForm()) return;

    const userData = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    const normalizedPhone = form.phone.replace(/[\s()-]/g, "");
    if (normalizedPhone) userData.phone = normalizedPhone;

    try {
      await dispatch(registerUser(userData)).unwrap();
    } catch (error) {
      const errorMessage =
        typeof error === "string" ? error : error.message;

      if (errorMessage === "This email is already verified. Please sign in.") {
        navigate("/login", {
          replace: true,
          state: { message: errorMessage },
        });
        return;
      }

      setErrors({
        form: errorMessage || "Registration failed. Please try again.",
      });
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2 pl-11 pr-4 text-left text-sm text-slate-900 outline-none transition placeholder:text-left placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  const renderField = ({
    label,
    name,
    type = "text",
    placeholder,
    icon: Icon,
    autoComplete,
    togglePassword,
    passwordVisible,
    required = true,
  }) => (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <Icon
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />

        <input
          id={name}
          name={name}
          type={type}
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          className={`${inputClass} ${togglePassword ? "pr-12" : ""}`}
          required={required}
        />

        {togglePassword && (
          <button
            type="button"
            onClick={() => togglePassword(!passwordVisible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {errors[name] && (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-red-600">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Left branding panel */}
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
            Customer Support Platform
          </span>

          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            Great support starts with a conversation.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-indigo-100">
            Create your account to manage support requests, track updates, and
            communicate with our support team in one place.
          </p>

          <div className="mt-10 space-y-5">
            {[
              "Track every support request",
              "Get updates on ticket progress",
              "Continue conversations through email",
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

      {/* Registration form */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="mb-9 flex items-center justify-center gap-2 text-lg font-bold text-indigo-700 lg:hidden"
          >
            <Headset size={25} />
            BitMax
          </Link>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold text-indigo-600">
              CREATE YOUR ACCOUNT
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Get started
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create an account to submit and track your support tickets.
            </p>
          </div>

          {isError && message && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {renderField({
              label: "Full name",
              name: "name",
              placeholder: "Enter your full name",
              icon: UserRound,
              autoComplete: "name",
            })}

            {renderField({
              label: "Email address",
              name: "email",
              type: "email",
              placeholder: "you@example.com",
              icon: Mail,
              autoComplete: "email",
            })}

            {renderField({
              label: "Phone number (optional)",
              name: "phone",
              type: "tel",
              placeholder: "+91 9876543210",
              icon: Phone,
              autoComplete: "tel",
              required: false,
            })}

            {renderField({
              label: "Password",
              name: "password",
              type: showPassword ? "text" : "password",
              placeholder: "Create a strong password",
              icon: LockKeyhole,
              autoComplete: "new-password",
              togglePassword: setShowPassword,
              passwordVisible: showPassword,
            })}

            <p className="-mt-3 text-xs text-slate-500">
              Use at least 8 characters with uppercase, lowercase, and a number.
            </p>

            {renderField({
              label: "Confirm password",
              name: "confirmPassword",
              type: showConfirmPassword ? "text" : "password",
              placeholder: "Re-enter your password",
              icon: LockKeyhole,
              autoComplete: "new-password",
              togglePassword: setShowConfirmPassword,
              passwordVisible: showConfirmPassword,
            })}

            <div>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />

                <span className="text-sm leading-5 text-slate-600">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {errors.terms && (
                <p className="mt-1.5 text-xs text-red-600" role="alert">
                  {errors.terms}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-10 text-center text-xs text-slate-400">
            Your information is handled according to our privacy policy.
          </p>
        </div>
      </section>
    </main>
  );
}
