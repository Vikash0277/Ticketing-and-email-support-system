import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  FolderTree,
  Pencil,
  PlusCircle,
  Search,
  Tags,
  XCircle,
} from "lucide-react";

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../api/resources";
import { getErrorMessage, getFieldErrors } from "../api/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  SkeletonRows,
  inputClass,
} from "../components/ui";
import { formatDate } from "../utils/format";

const EMPTY_FORM = { name: "", description: "" };

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modal, setModal] = useState({ open: false, category: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await listCategories({
        page,
        limit: 20,
        search,
        includeInactive: "true",
      });

      setCategories(result.items);
      setPagination(result.pagination);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to load categories right now")
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setModal({ open: true, category: null });
  };

  const openEdit = (category) => {
    setForm({
      name: category.name ?? "",
      description: category.description ?? "",
    });
    setFieldErrors({});
    setFormError("");
    setModal({ open: true, category });
  };

  const closeModal = () => {
    if (saving) return;
    setModal({ open: false, category: null });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFieldErrors({});

    try {
      if (modal.category) {
        await updateCategory(modal.category._id, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setNotice("Category updated");
      } else {
        await createCategory({
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setNotice("Category created");
      }

      setModal({ open: false, category: null });
      await load();
    } catch (requestError) {
      setFieldErrors(getFieldErrors(requestError));
      setFormError(
        getErrorMessage(requestError, "Unable to save this category")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (category) => {
    setBusyId(category._id);
    setError("");

    try {
      await updateCategory(category._id, { isActive: !category.isActive });
      setNotice(category.isActive ? "Category deactivated" : "Category activated");
      await load();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to update this category")
      );
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (category) => {
    if (
      !window.confirm(
        `Deactivate "${category.name}"? It will no longer be selectable for new tickets.`
      )
    ) {
      return;
    }

    setBusyId(category._id);
    setError("");

    try {
      await deleteCategory(category._id);
      setNotice("Category deactivated");
      await load();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to deactivate this category")
      );
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organise tickets into support categories."
        actions={
          <Button onClick={openCreate}>
            <PlusCircle size={16} />
            New category
          </Button>
        }
      />

      {notice ? (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      ) : null}
      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <Card className="mb-4 p-4">
        <div className="relative max-w-md">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search categories…"
            className={`${inputClass} pl-10`}
            aria-label="Search categories"
          />
        </div>
      </Card>

      {loading ? (
        <Card>
          <SkeletonRows rows={5} />
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderTree}
            title="No categories found"
            description={
              search
                ? "Try a different search term."
                : "Create your first category to start organising tickets."
            }
            action={
              <Button size="sm" onClick={openCreate}>
                <PlusCircle size={16} />
                Create a category
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <Card key={category._id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        category.isActive
                          ? "flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
                          : "flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                      }
                    >
                      <Tags size={19} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-slate-900">
                        {category.name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Created {formatDate(category.createdAt)}
                      </p>
                    </div>
                  </div>

                  <Badge
                    className={
                      category.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-slate-100 text-slate-500 ring-slate-200"
                    }
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <p className="mt-3 min-h-10 flex-1 text-sm text-slate-600">
                  {category.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(category)}
                  >
                    <Pencil size={14} />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === category._id}
                    disabled={Boolean(busyId)}
                    onClick={() => handleToggle(category)}
                  >
                    {category.isActive ? (
                      <>
                        <XCircle size={14} />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Activate
                      </>
                    )}
                  </Button>

                  {category.isActive ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={Boolean(busyId)}
                      onClick={() => handleDelete(category)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-4">
            <Pagination
              pagination={pagination}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </Card>
        </>
      )}

      <Modal
        open={modal.open}
        title={modal.category ? "Edit category" : "Create a category"}
        description="Categories help customers and agents route tickets correctly."
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="category-form"
              loading={saving}
              disabled={saving}
            >
              {modal.category ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          {formError ? <Alert>{formError}</Alert> : null}

          <Field
            label="Name"
            htmlFor="category-name"
            error={fieldErrors.name}
            hint="For example: Billing, Technical, Account access."
          >
            <input
              id="category-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              autoComplete="off"
            />
          </Field>

          <Field
            label="Description"
            htmlFor="category-description"
            error={fieldErrors.description}
          >
            <textarea
              id="category-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className={`${inputClass} resize-y`}
              placeholder="What kind of issues belong here?"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
