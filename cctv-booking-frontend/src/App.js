import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Headphones,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MonitorSmartphone,
  Navigation,
  Phone,
  ShieldCheck,
  Share2,
  Star,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import AdminApp from "./admin/AdminApp";
import "./App.css";

const API_BASE =
  process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api");
const COMPANY_NAME = "THRINAINA";
const COMPANY_FULL_NAME = "THRINAINA Electronic Security System";
const OWNER_PHONE = "9849021269";
const OWNER_PHONE_DISPLAY = "+91 98490 21269";
const OWNER_EMAIL = "thrinainaelectronics@gmail.com";
const COMPANY_ADDRESS =
  "Hno:- 30-1347, Lane no :- 12, Vinayak Nagar, Neredmet, Medchal-Malkajgiri District";
const COMPANY_MAP_URL = "https://maps.app.goo.gl/Ui9y7ftXS2G8fzFk9";
const COMPANY_MAP_COORDS = "17.4685886,78.5402767";
const serviceTypes = ["New CCTV Installation", "Repair", "Maintenance", "Camera Upgrade"];

const emptyBooking = {
  fullName: "",
  phone: "",
  email: "",
  serviceAddress: "",
  serviceType: "New CCTV Installation",
  cameras: 1,
  preferredDate: "",
  preferredTime: "",
  message: "",
};

const emptyMaintenance = {
  name: "",
  phone: "",
  email: "",
  issueDescription: "",
  preferredVisitDate: "",
  message: "",
  issueImage: null,
};

const emptyContact = {
  name: "",
  phone: "",
  email: "",
  serviceType: "",
  location: "",
  message: "",
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
};

function PublicSite() {
  const [page, setPage] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [booking, setBooking] = useState(emptyBooking);
  const [maintenance, setMaintenance] = useState(emptyMaintenance);
  const [contact, setContact] = useState(emptyContact);
  const [alerts, setAlerts] = useState({});
  const [submitting, setSubmitting] = useState({});
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  };

  const setAlert = (key, type, message) => {
    setAlerts((current) => ({ ...current, [key]: { type, message } }));
  };

  const navigate = (target) => {
    setPage(target);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    try {
      const data = await request("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking),
      });
      setBooking(emptyBooking);
      setAlert("booking", "success", data.message);
    } catch (error) {
      setAlert("booking", "error", error.message);
    }
  };

  const handleMaintenanceSubmit = async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(maintenance).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      const data = await request("/maintenance", { method: "POST", body: formData });
      setMaintenance(emptyMaintenance);
      event.target.reset();
      setAlert("maintenance", "success", data.message);
    } catch (error) {
      setAlert("maintenance", "error", error.message);
    }
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    setSubmitting((current) => ({ ...current, contact: true }));
    try {
      const data = await request("/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      setContact(emptyContact);
      setAlert("contact", "success", data.message);
    } catch (error) {
      setAlert("contact", "error", error.message);
    } finally {
      setSubmitting((current) => ({ ...current, contact: false }));
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-midnight text-white">
      <div className="noise-overlay fixed inset-0 -z-10" />
      <Header page={page} navigate={navigate} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {page === "home" && <HomePage navigate={navigate} />}
      {page === "about" && <AboutPage />}
      {page === "services" && <ServicesPage />}
      {page === "packages" && <PackagesSection standalone />}
      {page === "booking" && (
        <BookingPage
          booking={booking}
          setBooking={setBooking}
          today={today}
          alert={alerts.booking}
          onSubmit={handleBookingSubmit}
        />
      )}
      {page === "maintenance" && (
        <MaintenancePage
          maintenance={maintenance}
          setMaintenance={setMaintenance}
          today={today}
          alert={alerts.maintenance}
          onSubmit={handleMaintenanceSubmit}
        />
      )}
      {page === "contact" && (
        <ContactPage contact={contact} setContact={setContact} alert={alerts.contact} onSubmit={handleContactSubmit} submitting={submitting.contact} />
      )}
      <FloatingWhatsApp />
      <Footer navigate={navigate} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<PublicSite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Header({ page, navigate, mobileOpen, setMobileOpen }) {
  const nav = [
    ["home", "Home"],
    ["about", "About"],
    ["services", "Services"],
    ["packages", "Packages"],
    ["booking", "Booking"],
    ["maintenance", "Maintenance"],
    ["contact", "Contact"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight/75 backdrop-blur-2xl">
      <div className="mx-auto flex w-[min(1180px,92vw)] items-center justify-between gap-4 py-4">
        <button className="min-w-0 shrink-0 text-left" onClick={() => navigate("home")}>
          <img className="h-auto w-48 rounded-xl bg-white object-contain p-1 shadow-glow sm:w-64 lg:w-56 xl:w-64 2xl:w-80" src="/thrinaina-logo.svg" alt="THRINAINA Electronic Security System logo" />
        </button>

        <div className="hidden shrink-0 items-center gap-3 2xl:flex">
          <a className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/10" href="/admin">
            Admin
          </a>
          <a className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/10" href={`tel:+91${OWNER_PHONE}`}>
            Call Now
          </a>
          <button className="rounded-full bg-gradient-to-r from-sky-400 to-blue-600 px-5 py-2 text-sm font-black text-white shadow-glow" onClick={() => navigate("booking")}>
            Book Now
          </button>
        </div>

        <button className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 2xl:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      <nav className="mx-auto hidden w-[min(1180px,92vw)] items-center justify-center gap-2 pb-4 2xl:flex">
        {nav.map(([id, label]) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              page === id ? "bg-white text-navy" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {mobileOpen && (
        <div className="mx-auto grid w-[min(1180px,92vw)] gap-2 pb-4 2xl:hidden">
          <a href="/admin" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left font-semibold">
            Admin Login
          </a>
          {nav.map(([id, label]) => (
            <button key={id} onClick={() => navigate(id)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left font-semibold">
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

function HomePage({ navigate }) {
  return (
    <main>
      <section className="hero-bg relative">
        <div className="mx-auto grid min-h-[760px] w-[min(1180px,92vw)] items-center gap-12 py-20 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <Badge icon={<LockKeyhole size={16} />} text="Premium CCTV installation and service" />
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Secure Your Home & Business with Professional CCTV Installation
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              High-definition surveillance, clean installation, remote viewing setup, and rapid
              maintenance support from a team built for serious security needs.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <PrimaryButton onClick={() => navigate("booking")}>Book Installation</PrimaryButton>
              <SecondaryButton onClick={() => navigate("maintenance")}>Request Maintenance</SecondaryButton>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="glass rounded-[2rem] p-5">
            <div className="rounded-[1.5rem] border border-sky-300/20 bg-slate-950/70 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Live security status</p>
                  <h3 className="text-2xl font-black">All zones protected</h3>
                </div>
                <Activity className="text-sky-300" />
              </div>
              <div className="grid gap-3">
                {["Front Gate", "Parking Area", "Office Entry", "Warehouse"].map((zone, index) => (
                  <div key={zone} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="flex items-center gap-3"><Camera size={18} className="text-sky-300" />{zone}</span>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-300">Online</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <StatsSection />
      <ServicesSection />
      <PackagesSection />
      <TestimonialsSection />
    </main>
  );
}

function StatsSection() {
  const stats = [
    ["2000+", "Projects Completed"],
    ["1500+", "Happy Customers"],
    ["20+", "Years Experience"],
    ["1L+", "Cameras Installed"],
  ];
  return (
    <section className="mx-auto grid w-[min(1180px,92vw)] gap-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(([value, label], index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08 }}
          className="glass rounded-3xl p-6 text-center"
        >
          <strong className="block bg-gradient-to-r from-white to-sky-300 bg-clip-text text-4xl font-black text-transparent">{value}</strong>
          <span className="mt-2 block text-sm font-semibold text-slate-400">{label}</span>
        </motion.div>
      ))}
    </section>
  );
}

function ServicesPage() {
  return (
    <PageShell eyebrow="Our expertise" title="Security services built for reliable protection">
      <ServicesSection compact />
      <TestimonialsSection />
    </PageShell>
  );
}

function ServicesSection({ compact = false }) {
  const services = [
    ["CCTV Installation", "Complete planning, wiring, DVR/NVR setup, camera alignment, and mobile viewing.", Camera],
    ["Repair & Maintenance", "Fix offline feeds, damaged cabling, recording failures, display faults, and power issues.", Wrench],
    ["Remote Monitoring Setup", "Secure phone access, cloud viewing, alerts, user permissions, and network checks.", MonitorSmartphone],
    ["Camera Upgrade Services", "Upgrade old cameras to HD, IP, night vision, and smarter analytics-ready systems.", ArrowRight],
    ["Annual Maintenance Contract", "Scheduled inspections, lens cleaning, storage checks, and priority support visits.", Calendar],
  ];
  return (
    <section className={compact ? "" : "mx-auto w-[min(1180px,92vw)] py-16"}>
      {!compact && <SectionTitle eyebrow="Services" title="Modern CCTV solutions for every property" />}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {services.map(([title, text, Icon], index) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.06 }}
            className="glass group rounded-[1.7rem] p-6 transition hover:-translate-y-1 hover:border-sky-300/50"
          >
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 shadow-glow">
              <Icon size={26} />
            </div>
            <h3 className="text-xl font-black">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function BookingPage({ booking, setBooking, today, alert, onSubmit }) {
  return (
    <PageShell eyebrow="Online booking" title="Schedule a CCTV service visit" subtitle="Your request is stored in MySQL and emailed instantly to the owner through the existing backend.">
      <Alert alert={alert} />
      <motion.form initial="hidden" animate="show" variants={fadeUp} onSubmit={onSubmit} className="glass grid gap-5 rounded-[2rem] p-6 md:grid-cols-2 md:p-8">
        <Input icon={<Headphones />} label="Full name" value={booking.fullName} onChange={(v) => setBooking({ ...booking, fullName: v })} required />
        <Input icon={<Phone />} label="Phone number" type="tel" value={booking.phone} onChange={(v) => setBooking({ ...booking, phone: v })} required />
        <Input icon={<Mail />} label="Email address" type="email" value={booking.email} onChange={(v) => setBooking({ ...booking, email: v })} required />
        <Select label="Service type" value={booking.serviceType} onChange={(v) => setBooking({ ...booking, serviceType: v })} options={serviceTypes} />
        <Input icon={<Camera />} label="Number of cameras" type="number" min="1" value={booking.cameras} onChange={(v) => setBooking({ ...booking, cameras: v })} required />
        <Input icon={<Calendar />} label="Preferred date" type="date" min={today} value={booking.preferredDate} onChange={(v) => setBooking({ ...booking, preferredDate: v })} required />
        <Input icon={<Clock />} label="Preferred time" type="time" value={booking.preferredTime} onChange={(v) => setBooking({ ...booking, preferredTime: v })} required />
        <TextArea label="Service address / location" value={booking.serviceAddress} onChange={(v) => setBooking({ ...booking, serviceAddress: v })} required />
        <TextArea className="md:col-span-2" label="Additional message / notes" value={booking.message} onChange={(v) => setBooking({ ...booking, message: v })} />
        <div className="md:col-span-2"><PrimaryButton type="submit">Submit Booking</PrimaryButton></div>
      </motion.form>
    </PageShell>
  );
}

function MaintenancePage({ maintenance, setMaintenance, today, alert, onSubmit }) {
  return (
    <PageShell eyebrow="Service request" title="Request CCTV maintenance" subtitle="Upload an optional issue image and choose your preferred visit date.">
      <Alert alert={alert} />
      <motion.form initial="hidden" animate="show" variants={fadeUp} onSubmit={onSubmit} className="glass grid gap-5 rounded-[2rem] p-6 md:grid-cols-2 md:p-8">
        <Input label="Name" value={maintenance.name} onChange={(v) => setMaintenance({ ...maintenance, name: v })} required />
        <Input icon={<Phone />} label="Phone number" type="tel" value={maintenance.phone} onChange={(v) => setMaintenance({ ...maintenance, phone: v })} required />
        <Input icon={<Mail />} label="Email address" type="email" value={maintenance.email} onChange={(v) => setMaintenance({ ...maintenance, email: v })} required />
        <Input icon={<Calendar />} label="Preferred visit date" type="date" min={today} value={maintenance.preferredVisitDate} onChange={(v) => setMaintenance({ ...maintenance, preferredVisitDate: v })} required />
        <TextArea className="md:col-span-2" label="Existing issue description" value={maintenance.issueDescription} onChange={(v) => setMaintenance({ ...maintenance, issueDescription: v })} required />
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          <span className="flex items-center gap-2"><Upload size={16} className="text-sky-300" /> Optional issue image</span>
          <input className="premium-input file:mr-4 file:rounded-full file:border-0 file:bg-sky-400 file:px-4 file:py-2 file:font-bold file:text-navy" type="file" accept="image/*" onChange={(e) => setMaintenance({ ...maintenance, issueImage: e.target.files[0] })} />
        </label>
        <TextArea className="md:col-span-2" label="Message" value={maintenance.message} onChange={(v) => setMaintenance({ ...maintenance, message: v })} />
        <div className="md:col-span-2"><PrimaryButton type="submit">Send Maintenance Request</PrimaryButton></div>
      </motion.form>
    </PageShell>
  );
}

function ContactPage({ contact, setContact, alert, onSubmit, submitting }) {
  return (
    <PageShell eyebrow="Contact" title="Talk to a CCTV specialist" subtitle="Send a message, call directly, or reach us on WhatsApp for faster support.">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <ContactInfo icon={<Phone />} title="Business phone" text={OWNER_PHONE_DISPLAY} />
          <ContactInfo icon={<Mail />} title="Email" text={OWNER_EMAIL} />
          <ContactInfo icon={<MapPin />} title="Company location" text={COMPANY_ADDRESS} />
          <div className="glass overflow-hidden rounded-[2rem]">
            <iframe
              title="THRINAINA Electronic Security System location"
              className="h-80 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(COMPANY_MAP_COORDS)}&z=17&output=embed`}
            />
            <div className="p-5">
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-5 py-3 font-black text-sky-100 transition hover:bg-sky-300/15"
                href={COMPANY_MAP_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={18} />
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="glass grid gap-5 rounded-[2rem] p-6 md:grid-cols-2 md:p-8">
          <Alert alert={alert} />
          <Input label="Name" value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} required />
          <Input icon={<Phone />} label="Phone number" type="tel" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} required />
          <Input icon={<Mail />} label="Email address" type="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} required />
          <Select label="Service type" value={contact.serviceType} onChange={(v) => setContact({ ...contact, serviceType: v })} options={["", ...serviceTypes]} />
          <Input icon={<MapPin />} label="Location" value={contact.location} onChange={(v) => setContact({ ...contact, location: v })} />
          <TextArea className="md:col-span-2" label="Customer message" value={contact.message} onChange={(v) => setContact({ ...contact, message: v })} required />
          <div className="md:col-span-2"><PrimaryButton type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send Message"}</PrimaryButton></div>
        </form>
      </div>
    </PageShell>
  );
}

function PackagesSection({ standalone = false }) {
  const packages = [
    ["Essential Home", "4+ cameras", "HD cameras, DVR setup, mobile access, clean cable routing."],
    ["Smart Business", "8+ cameras", "Office and retail coverage with storage planning and remote access."],
    ["Enterprise Shield", "16+ cameras", "NVR/IP setup, advanced coverage planning, and priority support."],
  ];
  const content = (
    <>
      <SectionTitle eyebrow="CCTV packages" title="Premium coverage plans for every property" />
      <div className="grid gap-5 lg:grid-cols-3">
        {packages.map(([name, count, text]) => (
          <article key={name} className="glass rounded-[2rem] p-7 transition hover:-translate-y-1 hover:border-sky-300/50">
            <Building2 className="text-sky-300" size={32} />
            <h3 className="mt-5 text-2xl font-black">{name}</h3>
            <p className="mt-2 text-4xl font-black text-sky-300">{count}</p>
            <p className="mt-4 leading-7 text-slate-400">{text}</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {["Installation support", "Mobile viewing setup", "Owner notification workflow"].map((item) => (
                <li key={item} className="flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-300" />{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
  return standalone ? <PageShell eyebrow="Packages" title="Choose a CCTV package">{content}</PageShell> : <section className="mx-auto w-[min(1180px,92vw)] py-16">{content}</section>;
}

function TestimonialsSection() {
  const reviews = [
    ["Clean installation and the mobile view was configured before the team left.", "Ravi Kumar"],
    ["The maintenance request was handled quickly. Camera feed and recording are both stable now.", "Neha Sharma"],
    ["Professional planning for our office cameras. The dashboard makes follow-up easy.", "Amit Verma"],
  ];
  return (
    <section className="mx-auto w-[min(1180px,92vw)] py-16">
      <SectionTitle eyebrow="Testimonials" title="Trusted by homeowners and businesses" />
      <div className="grid gap-5 md:grid-cols-3">
        {reviews.map(([text, name]) => (
          <article key={name} className="glass rounded-[2rem] p-7">
            <div className="mb-5 flex gap-1 text-amber-300">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={18} fill="currentColor" />)}</div>
            <p className="leading-7 text-slate-300">"{text}"</p>
            <strong className="mt-5 block text-white">{name}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <PageShell eyebrow={`About ${COMPANY_NAME}`} title="A premium CCTV service experience from booking to completion">
      <div className="glass rounded-[2rem] p-8">
        <p className="max-w-4xl text-lg leading-8 text-slate-300">
          {COMPANY_FULL_NAME} provides installation, repair, camera upgrades, and annual maintenance
          support for homes and commercial spaces. The website is connected to your existing backend,
          so every customer submission is saved, tracked, and emailed to the owner instantly.
        </p>
      </div>
      <StatsSection />
    </PageShell>
  );
}

function PageShell({ eyebrow, title, subtitle, children }) {
  return (
    <main className="mx-auto w-[min(1180px,92vw)] py-14 md:py-20">
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mb-10 max-w-4xl">
        <Badge text={eyebrow} icon={<ShieldCheck size={16} />} />
        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
        {subtitle && <p className="mt-4 text-lg leading-8 text-slate-400">{subtitle}</p>}
      </motion.div>
      <div className="space-y-6">{children}</div>
    </main>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="mb-8 max-w-3xl">
      <Badge text={eyebrow} icon={<ShieldCheck size={16} />} />
      <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
    </div>
  );
}

function Badge({ icon, text }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm font-bold text-sky-200">{icon}{text}</span>;
}

function PrimaryButton({ children, ...props }) {
  return <button {...props} className="blue-glow inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-700 px-7 py-4 font-black text-white transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60">{children}<ArrowRight size={18} /></button>;
}

function SecondaryButton({ children, ...props }) {
  return <button {...props} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-4 font-black text-white transition hover:bg-white/15">{children}</button>;
}

function Input({ label, value, onChange, icon, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      <span className="flex items-center gap-2">{icon && React.cloneElement(icon, { size: 16, className: "text-sky-300" })}{label}</span>
      <input className="premium-input" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      <select className="premium-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option || "Select service"}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, className = "", ...props }) {
  return (
    <label className={`grid gap-2 text-sm font-bold text-slate-200 ${className}`}>
      {label}
      <textarea className="premium-input min-h-32 resize-y" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </label>
  );
}

function Alert({ alert }) {
  if (!alert) return null;
  const good = alert.type === "success";
  return <div className={`rounded-2xl border p-4 font-bold ${good ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-red-300/25 bg-red-400/10 text-red-200"}`}>{alert.message}</div>;
}

function ContactInfo({ icon, title, text }) {
  return (
    <div className="glass flex items-start gap-4 rounded-[2rem] p-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-400/15 text-sky-300">{icon}</span>
      <div><h3 className="font-black">{title}</h3><p className="mt-1 text-slate-400">{text}</p></div>
    </div>
  );
}

function FloatingWhatsApp() {
  return (
    <a href={`https://wa.me/91${OWNER_PHONE}`} target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-50 rounded-full bg-emerald-400 px-5 py-4 font-black text-emerald-950 shadow-glow transition hover:-translate-y-1">
      WhatsApp
    </a>
  );
}

function Footer({ navigate }) {
  const quick = ["home", "services", "packages", "booking", "maintenance", "contact"];
  return (
    <footer className="border-t border-white/10 bg-black/25">
      <div className="mx-auto grid w-[min(1180px,92vw)] gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img className="h-auto w-80 rounded-xl bg-white object-contain p-1 sm:w-96" src="/thrinaina-logo.svg" alt="THRINAINA Electronic Security System logo" />
          </div>
          <p className="mt-4 leading-7 text-slate-400">Premium CCTV installation, repair, upgrades, monitoring setup, and annual maintenance.</p>
        </div>
        <div>
          <h4 className="font-black">Quick Links</h4>
          <div className="mt-4 grid gap-2 text-slate-400">{quick.map((item) => <button key={item} className="text-left capitalize hover:text-white" onClick={() => navigate(item)}>{item}</button>)}</div>
        </div>
        <div>
          <h4 className="font-black">Services</h4>
          <div className="mt-4 grid gap-2 text-slate-400"><span>CCTV Installation</span><span>Repair & Maintenance</span><span>Remote Monitoring</span><span>Camera Upgrades</span></div>
        </div>
        <div>
          <h4 className="font-black">Contact Info</h4>
          <div className="mt-4 grid gap-3 text-slate-400"><span>{OWNER_PHONE_DISPLAY}</span><span>{OWNER_EMAIL}</span><span>{COMPANY_ADDRESS}</span></div>
          <div className="mt-5 flex gap-3 text-sky-300"><Share2 /><MonitorSmartphone /><Camera /></div>
        </div>
      </div>
    </footer>
  );
}

export default App;
