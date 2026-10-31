import { useSelector } from "react-redux";

export default function AdminDashboard() {
  const { user } = useSelector((state) => state.auth);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Admin Dashboard
      </h1>
      <p className="mt-2 text-slate-600">
        Welcome, {user?.name}
      </p>
      <p className="mt-4">
        Manage all tickets, users, agents, and categories.
      </p>
    </main>
  );
}