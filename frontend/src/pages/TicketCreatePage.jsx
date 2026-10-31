import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Paperclip, Send, X } from "lucide-react";

import { createTicket } from "../api/tickets";
import { listCategories } from "../api/resources";
import { getErrorMessage, getFieldErrors } from "../api/client";
import {
  Alert,
  Button,
  Card,
  Field,
  PageHeader,
  inputClass,
} from "../components/ui";
import { formatBytes } from "../utils/format";

const PRIORITIES = [
  { value: "low", label: "Low — minor issue" },
  { value: "medium", label: "Medium — normal request" },
  { value: "high", label: "High — blocking work" },
  { value: "urgent", label: "Urgent — service down" },
];

export default function TicketCreatePage() {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role ?? "customer";
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    categoryId: "",
    priority: "medium",
    tags: "",
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    listCategories({ limit: 100 })
      .then((result) => {
        if (!active) return;
        setCategories(result.items);

        if (result.items.length > 0) {
          setForm((previous) =>
            previous.categoryId
              ? previous
              : { ...previous, categoryId: result.items[0]._id }
          );
        }
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setError("");
  };

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files ?? []);
    const merged = [...files, ...selected].slice(0, 5);
    setFiles(merged);
    event.target.value = "";
  };

  const validate = () => {
    const nextErrors = {};

    if (form.subject.trim().length < 3) {
      nextErrors.subject = "Add a subject with at least 3 characters.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Describe the issue so we can help.";
    }

    if (!form.categoryId) {
      nextErrors.categoryId = "Choose a category.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10);

      const ticket = await createTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        priority: form.priority,
        tags,
        attachments: files,
      });

      navigate(`/${role}/tickets/${ticket._id}`, { replace: true });
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(
        getErrorMessage(requestError, "Unable to create the ticket right now")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Create a support ticket"
        description="Give us the details and our team will follow up by email and in the portal."
        actions={
          <Link to={`/${role}/tickets`}>
            <Button variant="secondary">
              <ArrowLeft size={16} />
              Back to tickets
            </Button>
          </Link>
        }
      />

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error ? <Alert>{error}</Alert> : null}

          <Field
            label="Subject"
            htmlFor="subject"
            error={errors.subject}
            hint="A short summary of the issue."
          >
            <input
              id="subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="e.g. Invoice charged twice for October"
              className={inputClass}
              maxLength={200}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Category"
              htmlFor="categoryId"
              error={errors.categoryId}
            >
              <select
                id="categoryId"
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority" htmlFor="priority" error={errors.priority}>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputClass}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="description"
            error={errors.description}
            hint="Include steps to reproduce, error messages, and what you expected to happen."
          >
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={8}
              placeholder="Tell us what happened…"
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field
            label="Tags"
            htmlFor="tags"
            hint="Optional, comma separated (for example: billing, refund)."
          >
            <input
              id="tags"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="billing, refund"
              className={inputClass}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Attachments
            </p>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
              <Paperclip size={20} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                Click to attach files
              </span>
              <span className="text-xs text-slate-500">
                Images, PDF, text, CSV, Word, Excel or ZIP · up to 5 files · 10 MB each
              </span>
              <input
                type="file"
                multiple
                onChange={handleFiles}
                className="hidden"
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
              />
            </label>

            {files.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((previous) =>
                          previous.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Link to={`/${role}/tickets`}>
              <Button variant="secondary" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Send size={16} />
              {loading ? "Creating…" : "Create ticket"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
