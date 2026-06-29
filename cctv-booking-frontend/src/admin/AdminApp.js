import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileBarChart,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Pencil,
  Search,
  Settings,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import "./AdminApp.css";

const API_BASE =
  process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api");

const AuthContext = createContext(null);
const bookingStatuses = ["Pending", "Confirmed", "Scheduled", "In Progress", "Completed", "Cancelled"];
const serviceStatuses = ["Pending", "Assigned", "In Progress", "Completed"];
const priorities = ["Low", "Medium", "High", "Urgent"];
const colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#7c3aed", "#0f766e"];

function createApi(token) {
  const client = axios.create({ baseURL: `${API_BASE}/admin` });
  client.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [admin, setAdmin] = useState(() => JSON.parse(localStorage.getItem("admin_user") || "null"));
  const api = useMemo(() => createApi(token), [token]);

  const login = async (credentials) => {
    const { data } = await createApi().post("/login", credentials);
    localStorage.setItem("admin_token", data.token);
    localStorage.setItem("admin_user", JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
  };

  const logout = async () => {
    try {
      if (token) await api.post("/logout");
    } catch (error) {
      // Local logout still succeeds if the server session has already expired.
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setAdmin(null);
  };

  return <AuthContext.Provider value={{ token, admin, setAdmin, api, login, logout }}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return children;
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (token) return <Navigate to="/admin" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-mark">
          <Lock size={24} />
        </div>
        <h1>Admin Login</h1>
        <p>Sign in to manage CCTV bookings, service requests, customers, reports, and notifications.</p>
        {error && <div className="admin-alert error">{error}</div>}
        <label>
          Username or email
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        </label>
        <button className="admin-primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { logout, admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = [
    ["/admin", "Dashboard", LayoutDashboard],
    ["/admin/bookings", "Bookings", ClipboardList],
    ["/admin/services", "Services", Wrench],
    ["/admin/customers", "Customers", Users],
    ["/admin/notifications", "Notifications", Bell],
    ["/admin/reports", "Reports", FileBarChart],
    ["/admin/profile", "Profile", Settings],
  ];

  const signOut = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/thrinaina-logo.svg" alt="THRINAINA" />
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className={location.pathname === to ? "active" : ""}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={signOut}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div>
            <strong>{admin?.username || admin?.email}</strong>
            <span>Admin console</span>
          </div>
        </header>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function useApiResource(path, params = {}) {
  const { api, logout } = useAuth();
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const reload = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await api.get(path, { params });
      setState({ data: response.data, loading: false, error: "" });
    } catch (error) {
      if (error.response?.status === 401) await logout();
      setState({ data: null, loading: false, error: error.response?.data?.message || error.message });
    }
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(params)]);
  return { ...state, reload };
}

function DashboardPage() {
  const { data, loading, error } = useApiResource("/dashboard");
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  const cards = [
    ["Total Bookings", data.stats.totalBookings, ClipboardList],
    ["Pending Bookings", data.stats.pendingBookings, CalendarDays],
    ["Confirmed Bookings", data.stats.confirmedBookings, CheckCircle2],
    ["Completed Bookings", data.stats.completedBookings, CheckCircle2],
    ["Total Services", data.stats.totalServiceRequests, Wrench],
    ["Pending Services", data.stats.pendingServiceRequests, CalendarDays],
    ["Completed Services", data.stats.completedServiceRequests, CheckCircle2],
    ["Total Customers", data.stats.totalCustomers, Users],
  ];

  return (
    <Page title="Dashboard" action={<RefreshHint />}>
      <div className="stat-grid">
        {cards.map(([label, value, Icon]) => (
          <article className="stat-card" key={label}>
            <span><Icon size={20} /></span>
            <div>
              <strong>{value}</strong>
              <p>{label}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="admin-panel wide">
          <PanelTitle title="Monthly booking trends" />
          <ChartFrame>
            <LineChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line dataKey="bookings" stroke="#2563eb" strokeWidth={3} />
            </LineChart>
          </ChartFrame>
        </section>
        <Timeline items={data.timeline} />
        <MiniList title="Recent bookings" rows={data.recentBookings} primary="full_name" secondary="service_type" status="status" />
        <MiniList title="Recent service requests" rows={data.recentServices} primary="name" secondary="issue_description" status="status" />
      </div>
    </Page>
  );
}

function BookingsPage() {
  const [query, setQuery] = useState({ search: "", status: "", date: "", sort: "newest", page: 1, limit: 10 });
  const { api } = useAuth();
  const { data, loading, error, reload } = useApiResource("/bookings", query);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  const remove = async (row) => {
    if (!window.confirm(`Delete booking for ${row.full_name}?`)) return;
    await api.delete(`/bookings/${row.id}`);
    reload();
  };

  return (
    <Page title="Booking Management">
      <Filters query={query} setQuery={setQuery} statuses={bookingStatuses} includeDate />
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <DataTable
            columns={["Customer", "Phone", "Service", "Preferred", "Status", "Booked"]}
            rows={data.data}
            render={(row) => [
              row.full_name,
              row.phone,
              row.service_type,
              formatDate(row.preferred_date),
              <StatusBadge value={row.status} />,
              formatDate(row.created_at),
            ]}
            actions={(row) => (
              <>
                <IconAction title="View" icon={Eye} onClick={() => setSelected(row)} />
                <IconAction title="Edit" icon={Pencil} onClick={() => setEditing(row)} />
                <IconAction title="Delete" icon={Trash2} onClick={() => remove(row)} danger />
              </>
            )}
          />
          <Pagination meta={data.meta} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
      {editing && <BookingEditor booking={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </Page>
  );
}

function ServicesPage() {
  const [query, setQuery] = useState({ search: "", status: "", priority: "", sort: "newest", page: 1, limit: 10 });
  const { api } = useAuth();
  const { data, loading, error, reload } = useApiResource("/services", query);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  const remove = async (row) => {
    if (!window.confirm(`Delete service request for ${row.name}?`)) return;
    await api.delete(`/services/${row.id}`);
    reload();
  };

  return (
    <Page title="Service Request Management">
      <Filters query={query} setQuery={setQuery} statuses={serviceStatuses} priorities={priorities} />
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <DataTable
            columns={["Customer", "Phone", "Issue", "Priority", "Status", "Requested"]}
            rows={data.data}
            render={(row) => [
              row.name,
              row.phone,
              truncate(row.issue_description, 44),
              <StatusBadge value={row.priority} tone="priority" />,
              <StatusBadge value={row.status} />,
              formatDate(row.created_at),
            ]}
            actions={(row) => (
              <>
                <IconAction title="View" icon={Eye} onClick={() => setSelected(row)} />
                <IconAction title="Edit" icon={Pencil} onClick={() => setEditing(row)} />
                <IconAction title="Delete" icon={Trash2} onClick={() => remove(row)} danger />
              </>
            )}
          />
          <Pagination meta={data.meta} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
      {selected && <ServiceDetails service={selected} onClose={() => setSelected(null)} />}
      {editing && <ServiceEditor service={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </Page>
  );
}

function CustomersPage() {
  const [query, setQuery] = useState({ search: "", page: 1, limit: 10 });
  const { data, loading, error } = useApiResource("/customers", query);
  const [selectedEmail, setSelectedEmail] = useState(null);

  return (
    <Page title="Customer Management">
      <div className="filter-bar">
        <SearchBox value={query.search} onChange={(search) => setQuery({ ...query, search, page: 1 })} placeholder="Search customers" />
      </div>
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <DataTable
            columns={["Name", "Phone", "Email", "Address", "Bookings", "Last Activity"]}
            rows={data.data}
            render={(row) => [row.name, row.phone, row.email, truncate(row.address || "-", 40), row.total_bookings, formatDate(row.last_activity)]}
            actions={(row) => <IconAction title="View history" icon={Eye} onClick={() => setSelectedEmail(row.email)} />}
          />
          <Pagination meta={data.meta} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
      {selectedEmail && <CustomerHistory email={selectedEmail} onClose={() => setSelectedEmail(null)} />}
    </Page>
  );
}

function NotificationsPage() {
  const { api } = useAuth();
  const { data, loading, error, reload } = useApiResource("/notifications");
  const mark = async (row, is_read) => {
    await api.put(`/notifications/${row.id}`, { is_read });
    reload();
  };

  return (
    <Page title="Notification Center">
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      <div className="notification-list">
        {(data || []).map((item) => (
          <article className={`notification-item ${item.is_read ? "" : "unread"}`} key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <span>{formatDateTime(item.created_at)}</span>
            </div>
            <button className="admin-secondary" onClick={() => mark(item, !item.is_read)}>
              {item.is_read ? "Mark unread" : "Mark read"}
            </button>
          </article>
        ))}
      </div>
    </Page>
  );
}

function ReportsPage() {
  const { data, loading, error } = useApiResource("/reports");
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  const exportRows = [
    ...data.monthlyBookings.map((row) => ({ report: "Monthly Bookings", ...row })),
    ...data.serviceRequests.map((row) => ({ report: "Service Requests", ...row })),
    ...data.bookingStatus.map((row) => ({ report: "Booking Status", ...row })),
    ...data.customerGrowth.map((row) => ({ report: "Customer Growth", ...row })),
  ];

  return (
    <Page
      title="Reports & Analytics"
      action={
        <div className="export-actions">
          <button className="admin-secondary" onClick={() => exportCsv(exportRows, "admin-reports.csv")}><Download size={16} />CSV</button>
          <button className="admin-secondary" onClick={() => exportExcel(exportRows, "admin-reports.xlsx")}><Download size={16} />Excel</button>
          <button className="admin-secondary" onClick={() => exportPdf(exportRows, "admin-reports.pdf")}><Download size={16} />PDF</button>
        </div>
      }
    >
      <div className="report-grid">
        <ReportChart title="Monthly bookings" data={data.monthlyBookings} type="bar" />
        <ReportChart title="Service requests" data={data.serviceRequests} type="line" />
        <ReportPie title="Booking status distribution" data={data.bookingStatus} />
        <ReportChart title="Customer growth" data={data.customerGrowth} type="bar" />
      </div>
    </Page>
  );
}

function ProfilePage() {
  const { api, admin, setAdmin } = useAuth();
  const { data, loading, error, reload } = useApiResource("/profile");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({ username: admin?.username || "", email: admin?.email || "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (data?.admin) setProfile({ username: data.admin.username || "", email: data.admin.email || "" });
  }, [data]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const response = await api.put("/profile", profile);
    setAdmin({ ...admin, ...profile });
    localStorage.setItem("admin_user", JSON.stringify({ ...admin, ...profile }));
    setMessage(response.data.message);
    reload();
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const response = await api.put("/profile/password", passwords);
    setPasswords({ currentPassword: "", newPassword: "" });
    setMessage(response.data.message);
  };

  return (
    <Page title="Admin Profile">
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {message && <div className="admin-alert success">{message}</div>}
      <div className="profile-grid">
        <form className="admin-panel form-grid" onSubmit={saveProfile}>
          <PanelTitle title="Profile details" />
          <label>Username<input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} required /></label>
          <label>Email<input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required /></label>
          <button className="admin-primary">Save profile</button>
        </form>
        <form className="admin-panel form-grid" onSubmit={savePassword}>
          <PanelTitle title="Change password" />
          <label>Current password<input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required /></label>
          <label>New password<input type="password" minLength="8" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required /></label>
          <button className="admin-primary">Change password</button>
        </form>
      </div>
      <section className="admin-panel">
        <PanelTitle title="Login history" />
        <DataTable
          columns={["IP Address", "Device", "Logged In"]}
          rows={data?.loginHistory || []}
          render={(row) => [row.ip_address || "-", truncate(row.user_agent || "-", 70), formatDateTime(row.logged_in_at)]}
        />
      </section>
    </Page>
  );
}

function BookingEditor({ booking, onClose, onSaved }) {
  const { api } = useAuth();
  const [form, setForm] = useState({ ...booking });
  const save = async (event) => {
    event.preventDefault();
    await api.put(`/bookings/${booking.id}`, form);
    onSaved();
    onClose();
  };
  return (
    <Modal title="Edit booking" onClose={onClose}>
      <form className="modal-form" onSubmit={save}>
        <label>Customer Name<input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
        <label>Phone<input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Service Type<input value={form.service_type || ""} onChange={(e) => setForm({ ...form, service_type: e.target.value })} /></label>
        <label>Preferred Date<input type="date" value={dateInput(form.preferred_date)} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} /></label>
        <label>Status<select value={form.status || "Pending"} onChange={(e) => setForm({ ...form, status: e.target.value })}>{bookingStatuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="full">Address<textarea value={form.service_address || ""} onChange={(e) => setForm({ ...form, service_address: e.target.value })} /></label>
        <label className="full">Notes<textarea value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
        <button className="admin-primary">Save booking</button>
      </form>
    </Modal>
  );
}

function ServiceEditor({ service, onClose, onSaved }) {
  const { api } = useAuth();
  const [form, setForm] = useState({ ...service });
  const save = async (event) => {
    event.preventDefault();
    await api.put(`/services/${service.id}`, form);
    onSaved();
    onClose();
  };
  return (
    <Modal title="Edit service request" onClose={onClose}>
      <form className="modal-form" onSubmit={save}>
        <label>Customer Name<input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Phone<input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Preferred Visit<input type="date" value={dateInput(form.preferred_visit_date)} onChange={(e) => setForm({ ...form, preferred_visit_date: e.target.value })} /></label>
        <label>Status<select value={form.status || "Pending"} onChange={(e) => setForm({ ...form, status: e.target.value })}>{serviceStatuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Priority<select value={form.priority || "Medium"} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="full">Issue<textarea value={form.issue_description || ""} onChange={(e) => setForm({ ...form, issue_description: e.target.value })} /></label>
        <label className="full">Notes<textarea value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
        <button className="admin-primary">Save request</button>
      </form>
    </Modal>
  );
}

function BookingDetails({ booking, onClose }) {
  return (
    <Modal title="Booking details" onClose={onClose}>
      <DetailGrid rows={[
        ["Customer Name", booking.full_name],
        ["Phone Number", booking.phone],
        ["Email", booking.email],
        ["Address", booking.service_address],
        ["Service Type", booking.service_type],
        ["Installation Details", `${booking.cameras} camera(s), ${booking.preferred_time || "time not set"}`],
        ["Preferred Date", formatDate(booking.preferred_date)],
        ["Notes", booking.message || "-"],
        ["Booking Date", formatDateTime(booking.created_at)],
        ["Status", booking.status],
      ]} />
    </Modal>
  );
}

function ServiceDetails({ service, onClose }) {
  return (
    <Modal title="Service request details" onClose={onClose}>
      <DetailGrid rows={[
        ["Customer Name", service.name],
        ["Phone", service.phone],
        ["Email", service.email],
        ["Service Issue", service.issue_description],
        ["Priority", service.priority],
        ["Status", service.status],
        ["Preferred Visit", formatDate(service.preferred_visit_date)],
        ["Request Date", formatDateTime(service.created_at)],
        ["Notes", service.message || "-"],
      ]} />
    </Modal>
  );
}

function CustomerHistory({ email, onClose }) {
  const { data, loading, error } = useApiResource(`/customers/${encodeURIComponent(email)}`);
  return (
    <Modal title="Customer history" onClose={onClose} large>
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <div className="history-stack">
          <DetailGrid rows={[["Name", data.profile.full_name || data.profile.name], ["Phone", data.profile.phone], ["Email", data.email]]} />
          <MiniList title="Bookings" rows={data.bookings} primary="full_name" secondary="service_type" status="status" />
          <MiniList title="Service requests" rows={data.services} primary="name" secondary="issue_description" status="status" />
        </div>
      )}
    </Modal>
  );
}

function Page({ title, action, children }) {
  return (
    <main className="admin-page">
      <div className="page-head">
        <h1>{title}</h1>
        {action}
      </div>
      {children}
    </main>
  );
}

function Filters({ query, setQuery, statuses, priorities: priorityOptions, includeDate }) {
  return (
    <div className="filter-bar">
      <SearchBox value={query.search} onChange={(search) => setQuery({ ...query, search, page: 1 })} placeholder="Search" />
      <select value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value, page: 1 })}>
        <option value="">All statuses</option>
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
      {priorityOptions && (
        <select value={query.priority} onChange={(e) => setQuery({ ...query, priority: e.target.value, page: 1 })}>
          <option value="">All priorities</option>
          {priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}
        </select>
      )}
      {includeDate && <input type="date" value={query.date} onChange={(e) => setQuery({ ...query, date: e.target.value, page: 1 })} />}
      <select value={query.sort} onChange={(e) => setQuery({ ...query, sort: e.target.value, page: 1 })}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function DataTable({ columns, rows, render, actions }) {
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="empty-cell">No records found</td></tr>}
          {rows.map((row) => (
            <tr key={row.id || row.email}>
              {render(row).map((cell, index) => <td key={index}>{cell}</td>)}
              {actions && <td><div className="row-actions">{actions(row)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="icon-button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft size={18} /></button>
      <span>Page {meta.page} of {meta.totalPages}</span>
      <button className="icon-button" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}><ChevronRight size={18} /></button>
    </div>
  );
}

function Modal({ title, onClose, children, large }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className={`admin-modal ${large ? "large" : ""}`}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function DetailGrid({ rows }) {
  return <dl className="detail-grid">{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v || "-"}</dd></React.Fragment>)}</dl>;
}

function MiniList({ title, rows, primary, secondary, status }) {
  return (
    <section className="admin-panel">
      <PanelTitle title={title} />
      <div className="mini-list">
        {rows.length === 0 && <p className="muted">No records yet</p>}
        {rows.map((row) => (
          <article key={`${title}-${row.id}`}>
            <div>
              <strong>{row[primary]}</strong>
              <span>{truncate(row[secondary], 56)}</span>
            </div>
            <StatusBadge value={row[status]} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Timeline({ items }) {
  return (
    <section className="admin-panel">
      <PanelTitle title="Activity timeline" />
      <div className="timeline">
        {items.length === 0 && <p className="muted">No activity yet</p>}
        {items.map((item, index) => (
          <article key={`${item.created_at}-${index}`}>
            <span />
            <div>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <small>{formatDateTime(item.created_at)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportChart({ title, data, type }) {
  return (
    <section className="admin-panel">
      <PanelTitle title={title} />
      <ChartFrame>
        {type === "bar" ? (
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#2563eb" /></BarChart>
        ) : (
          <LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="value" stroke="#10b981" strokeWidth={3} /></LineChart>
        )}
      </ChartFrame>
    </section>
  );
}

function ReportPie({ title, data }) {
  return (
    <section className="admin-panel">
      <PanelTitle title={title} />
      <ChartFrame>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" outerRadius={92} label>
            {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ChartFrame>
    </section>
  );
}

function ChartFrame({ children }) {
  return <div className="chart-frame"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

function PanelTitle({ title }) {
  return <h2 className="panel-title">{title}</h2>;
}

function IconAction({ title, icon: Icon, onClick, danger }) {
  return <button className={`icon-action ${danger ? "danger" : ""}`} title={title} onClick={onClick}><Icon size={16} /></button>;
}

function StatusBadge({ value, tone }) {
  return <span className={`status-badge ${tone === "priority" ? `priority-${String(value).toLowerCase()}` : ""}`}>{value || "-"}</span>;
}

function Loading() {
  return <div className="admin-loading">Loading...</div>;
}

function ErrorState({ message }) {
  return <div className="admin-alert error">{message}</div>;
}

function RefreshHint() {
  return <span className="refresh-hint">Live data from MySQL</span>;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function dateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function truncate(value, max) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function exportCsv(rows, filename) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  downloadUrl(url, filename);
}

function exportExcel(rows, filename) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Reports");
  XLSX.writeFile(workbook, filename);
}

function exportPdf(rows, filename) {
  const doc = new jsPDF();
  doc.text("Admin Reports", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["Report", "Label", "Value"]],
    body: rows.map((row) => [row.report, row.label, row.value]),
  });
  doc.save(filename);
}

function downloadUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
