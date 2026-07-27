import { useCallback, useEffect, useRef, useState } from "react";
import { archiveCustomer, createCustomer, getCustomerById, getCustomersByOrganization, searchCustomers, updateCustomer } from "../crm/services/customerService";
import {
  LayoutDashboard, Users, CreditCard, Bell, BarChart3, Settings,
  TrendingUp, TrendingDown, Target, QrCode, Gift, Calendar,
  Search, Plus, Download, Eye, Star, Crown, ArrowUpRight,
  ArrowDownRight, MoreHorizontal, LogOut, Phone, Palette, Shield,
  Send, DollarSign, Activity, FileText, Lock, Building2,
  CheckCircle, Clock, Zap, Globe, Edit, Trash2, Mail, Smartphone,
  Award, AlertCircle, RefreshCw, ChevronLeft, Utensils, Image,
  Copy, Coffee, Instagram, Chrome, ExternalLink, MapPin, X
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart
} from "recharts";
import { getDashboardSummary, type DashboardSummary } from "../dashboard/services/dashboardService";
import { createWalletCard, type WalletCardRecord } from "../wallet/services/walletService";
import { supabase } from "../shared/lib/supabase";
import type { Customer } from "../shared/types/database";

// ─── Data ─────────────────────────────────────────────────────────────────────

const REVENUE_DATA = [
  { month: "Jan", revenue: 42800, orders: 1240, customers: 890, newCustomers: 320, returning: 620 },
  { month: "Feb", revenue: 38200, orders: 1100, customers: 820, newCustomers: 280, returning: 590 },
  { month: "Mar", revenue: 51600, orders: 1480, customers: 1020, newCustomers: 410, returning: 740 },
  { month: "Apr", revenue: 47900, orders: 1350, customers: 940, newCustomers: 370, returning: 680 },
  { month: "May", revenue: 58400, orders: 1680, customers: 1150, newCustomers: 490, returning: 840 },
  { month: "Jun", revenue: 63200, orders: 1820, customers: 1280, newCustomers: 540, returning: 940 },
  { month: "Jul", revenue: 71800, orders: 2040, customers: 1420, newCustomers: 620, returning: 1060 },
];

const CAMPAIGN_DATA = [
  { day: "Mon", spend: 320, reach: 12400, impressions: 38200, clicks: 1240, conversions: 48, roas: 4.2 },
  { day: "Tue", spend: 280, reach: 10800, impressions: 33600, clicks: 1080, conversions: 42, roas: 3.8 },
  { day: "Wed", spend: 410, reach: 15600, impressions: 48400, clicks: 1560, conversions: 61, roas: 5.1 },
  { day: "Thu", spend: 380, reach: 14200, impressions: 44100, clicks: 1420, conversions: 55, roas: 4.7 },
  { day: "Fri", spend: 520, reach: 19800, impressions: 61400, clicks: 1980, conversions: 78, roas: 6.2 },
  { day: "Sat", spend: 680, reach: 26200, impressions: 81200, clicks: 2620, conversions: 104, roas: 7.8 },
  { day: "Sun", spend: 590, reach: 22600, impressions: 70100, clicks: 2260, conversions: 89, roas: 6.9 },
];

const ACQUISITION_DATA = [
  { name: "Meta Ads", value: 38, color: "#FF6B35" },
  { name: "Google Ads", value: 28, color: "#3B82F6" },
  { name: "Organic", value: 22, color: "#10B981" },
  { name: "Referral", value: 12, color: "#8B5CF6" },
];

const RETENTION_DATA = [
  { month: "Jan", rate: 68 },
  { month: "Feb", rate: 71 },
  { month: "Mar", rate: 69 },
  { month: "Apr", rate: 74 },
  { month: "May", rate: 78 },
  { month: "Jun", rate: 82 },
  { month: "Jul", rate: 85 },
];

const CUSTOMERS = [
  { id: 1, name: "Sofia Martins", email: "sofia.martins@gmail.com", phone: "+351 912 345 678", visits: 47, ltv: 3840, status: "VIP", tags: ["Birthday Club", "Wine Lover"], lastVisit: "2h ago", birthday: "Mar 14", favoriteItem: "Truffle Risotto", points: 2840, city: "Lisbon" },
  { id: 2, name: "Marco Ferreira", email: "marco.f@hotmail.com", phone: "+351 934 567 890", visits: 31, ltv: 2150, status: "Regular", tags: ["Lunch Regular", "Business"], lastVisit: "1d ago", birthday: "Jul 28", favoriteItem: "Wagyu Burger", points: 1520, city: "Porto" },
  { id: 3, name: "Ana Costa", email: "ana.costa@icloud.com", phone: "+351 916 234 567", visits: 12, ltv: 890, status: "New", tags: ["Weekend"], lastVisit: "3d ago", birthday: "Nov 5", favoriteItem: "Salmon Tartare", points: 640, city: "Lisbon" },
  { id: 4, name: "Ricardo Sousa", email: "r.sousa@empresa.pt", phone: "+351 963 789 012", visits: 68, ltv: 5620, status: "VIP", tags: ["Birthday Club", "Corporate"], lastVisit: "5h ago", birthday: "Aug 19", favoriteItem: "Tasting Menu", points: 4180, city: "Lisbon" },
  { id: 5, name: "Inês Rodrigues", email: "ines.r@gmail.com", phone: "+351 928 456 789", visits: 19, ltv: 1340, status: "Regular", tags: ["Birthday Club", "Veggie"], lastVisit: "2d ago", birthday: "Feb 22", favoriteItem: "Mushroom Ravioli", points: 980, city: "Braga" },
  { id: 6, name: "Diogo Oliveira", email: "d.oliveira@outlook.com", phone: "+351 945 012 345", visits: 8, ltv: 560, status: "At Risk", tags: ["Churned"], lastVisit: "32d ago", birthday: "Dec 10", favoriteItem: "Grilled Sea Bass", points: 240, city: "Porto" },
  { id: 7, name: "Beatriz Nunes", email: "bea.nunes@gmail.com", phone: "+351 918 765 432", visits: 24, ltv: 1890, status: "Regular", tags: ["Birthday Club"], lastVisit: "6h ago", birthday: "Apr 8", favoriteItem: "Lobster Bisque", points: 1240, city: "Lisbon" },
  { id: 8, name: "Tiago Santos", email: "t.santos@hotmail.com", phone: "+351 937 654 321", visits: 3, ltv: 210, status: "New", tags: [], lastVisit: "7d ago", birthday: "Jan 30", favoriteItem: "Ribeye Steak", points: 120, city: "Cascais" },
];

const CAMPAIGNS_LIST = [
  { id: 1, name: "Summer Tasting Menu", platform: "Meta", status: "Active", spend: 1240, reach: 48200, impressions: 142000, ctr: 3.2, cpc: 0.82, conversions: 156, roas: 8.4, budget: 2000 },
  { id: 2, name: "Lunch Business Promo", platform: "Google", status: "Active", spend: 890, reach: 32400, impressions: 98600, ctr: 2.8, cpc: 1.12, conversions: 98, roas: 6.2, budget: 1500 },
  { id: 3, name: "Weekend Brunch Special", platform: "Meta", status: "Paused", spend: 640, reach: 24600, impressions: 74200, ctr: 4.1, cpc: 0.64, conversions: 84, roas: 7.8, budget: 1200 },
  { id: 4, name: "Seafood Festival", platform: "Google", status: "Active", spend: 420, reach: 18200, impressions: 54800, ctr: 2.1, cpc: 1.38, conversions: 52, roas: 5.1, budget: 800 },
];

const ACTIVITY_FEED = [
  { icon: "checkin", customer: "Sofia Martins", detail: "Checked in · Table 8", time: "2 min ago", color: "#10B981" },
  { icon: "reward", customer: "Ricardo Sousa", detail: "Redeemed 500 pts · Free Dessert", time: "18 min ago", color: "#FF6B35" },
  { icon: "campaign", customer: "Summer Tasting Menu", detail: "Campaign hit 1,000 new users", time: "1h ago", color: "#3B82F6" },
  { icon: "birthday", customer: "Inês Rodrigues", detail: "Birthday tomorrow · Promo sent", time: "2h ago", color: "#F59E0B" },
  { icon: "wallet", customer: "Marco Ferreira", detail: "Added card to Apple Wallet", time: "3h ago", color: "#8B5CF6" },
  { icon: "review", customer: "Ana Costa", detail: "Left a 5-star review", time: "4h ago", color: "#10B981" },
];

const SCAN_HISTORY = [
  { customer: "Sofia Martins", action: "Check-in", points: "+50", date: "Today, 20:14", method: "QR Scan" },
  { customer: "Ricardo Sousa", action: "Reward Claim", points: "-500", date: "Today, 19:42", method: "QR Scan" },
  { customer: "Beatriz Nunes", action: "Check-in", points: "+50", date: "Today, 19:08", method: "NFC" },
  { customer: "Marco Ferreira", action: "Check-in", points: "+50", date: "Today, 18:55", method: "QR Scan" },
  { customer: "Ana Costa", action: "Birthday Bonus", points: "+200", date: "Today, 18:30", method: "Auto" },
  { customer: "Tiago Santos", action: "Check-in", points: "+50", date: "Today, 17:42", method: "QR Scan" },
];

// ─── Shared Components ────────────────────────────────────────────────────────

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" | "orange" }) {
  const styles: Record<string, string> = {
    default: "bg-white/8 text-slate-300",
    success: "bg-emerald-500/15 text-emerald-400",
    warning: "bg-amber-500/15 text-amber-400",
    danger: "bg-red-500/15 text-red-400",
    info: "bg-blue-500/15 text-blue-400",
    orange: "bg-[#FF6B35]/15 text-[#FF6B35]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

function Btn({ children, variant = "primary", size = "md", onClick, className = "" }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded-lg transition-all cursor-pointer select-none";
  const variants: Record<string, string> = {
    primary: "bg-[#FF6B35] text-white hover:bg-[#e55a24] shadow-sm",
    secondary: "bg-white/6 text-white hover:bg-white/10 border border-white/10",
    ghost: "text-slate-400 hover:text-white hover:bg-white/6",
    danger: "bg-red-500/15 text-red-400 hover:bg-red-500/25",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

function StatCard({ label, value, sub, trend, icon: Icon, accent = "#FF6B35" }: {
  label: string; value: string; sub?: string; trend?: number; icon?: React.ElementType; accent?: string;
}) {
  return (
    <div className="bg-[#111827] border border-white/6 rounded-xl p-5 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className="p-2 rounded-lg" style={{ background: `${accent}18` }}>
            <Icon size={14} style={{ color: accent }} />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1.5">
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-slate-500 text-xs">{sub}</span>}
        </div>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111827] border border-white/6 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="text-white font-semibold">{title}</h3>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 bg-white/4 p-1 rounded-xl w-fit">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${active === tab ? "bg-[#1E293B] text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function FWInput({ label, placeholder, type = "text", defaultValue, onChange }: {
  label?: string; placeholder?: string; type?: string; defaultValue?: string; onChange?: (value: string) => void;
}) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={event => onChange?.(event.target.value)}
        className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF6B35]/50 transition-all"
      />
    </div>
  );
}

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div className={`w-10 h-5 rounded-full relative cursor-pointer flex-shrink-0 transition-colors ${enabled ? "bg-[#FF6B35]" : "bg-white/15"}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${enabled ? "right-0.5" : "left-0.5"}`} />
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#1E293B] border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value > 999 ? `€${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const sizes: Record<string, string> = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-16 h-16 text-lg" };
  return (
    <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#e55a24] flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── AUTH: Login ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onRegister, onForgot }: { onLogin: () => void; onRegister: () => void; onForgot: () => void }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      <div className="hidden lg:flex w-1/2 flex-col bg-[#111827] border-r border-white/6 p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(255,107,53,0.07) 0%, transparent 55%)" }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full border border-white/3 pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full border border-white/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B35] flex items-center justify-center shadow-lg">
              <Utensils size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">FoodWave</span>
          </div>
          <div className="mt-auto">
            <h1 className="text-4xl font-semibold text-white leading-tight mb-4 tracking-tight">
              The loyalty platform<br />restaurants love.
            </h1>
            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              Manage customers, run smart campaigns,<br />and reward loyalty — all in one place.
            </p>
            <div className="space-y-4">
              {[
                { icon: Users, text: "14,200+ loyal customers managed", sub: "Across 80+ restaurants" },
                { icon: BarChart3, text: "€2.8M in tracked revenue", sub: "Jan–Jul 2026" },
                { icon: Target, text: "Meta & Google Ads connected", sub: "Real-time sync" },
              ].map(({ icon: Icon, text, sub }) => (
                <div key={text} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#FF6B35]/12 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-[#FF6B35]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{text}</p>
                    <p className="text-slate-500 text-xs">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 p-4 bg-white/3 border border-white/6 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex -space-x-2">
                  {["JS", "MF", "AC", "RS"].map(a => (
                    <div key={a} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#e55a24] border-2 border-[#111827] flex items-center justify-center text-white text-xs font-bold">{a}</div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} size={12} className="text-amber-400 fill-amber-400" />)}
                </div>
              </div>
              <p className="text-slate-300 text-sm">"FoodWave transformed how we manage loyalty. ROAS went from 3x to 8x."</p>
              <p className="text-slate-500 text-xs mt-1">João Silva · Restaurante Lisboa</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B35] flex items-center justify-center">
              <Utensils size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg">FoodWave</span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-1 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your restaurant dashboard</p>
          <div className="space-y-4 mb-4">
            <FWInput label="Email address" type="email" placeholder="chef@restaurante.com" />
            <FWInput label="Password" type="password" placeholder="••••••••" />
          </div>
          <div className="flex justify-end mb-6">
            <button onClick={onForgot} className="text-xs text-[#FF6B35] hover:text-[#e55a24] transition-colors">Forgot password?</button>
          </div>
          <Btn variant="primary" size="lg" onClick={onLogin} className="w-full justify-center">Sign in</Btn>
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-slate-600 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/6" />
          </div>
          <button className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-white/10 bg-white/4 text-white text-sm hover:bg-white/7 transition-all">
            <Chrome size={15} />
            Google
          </button>
          <p className="text-center text-slate-500 text-sm mt-6">
            No account?{" "}
            <button onClick={onRegister} className="text-[#FF6B35] hover:text-[#e55a24] font-medium">Create one free</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH: Register ───────────────────────────────────────────────────────────

function RegisterScreen({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ChevronLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B35] flex items-center justify-center">
            <Utensils size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">FoodWave</span>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-1 tracking-tight">Create your account</h2>
        <p className="text-slate-500 text-sm mb-8">14-day free trial · No credit card required</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FWInput label="First name" placeholder="João" />
            <FWInput label="Last name" placeholder="Silva" />
          </div>
          <FWInput label="Email" type="email" placeholder="chef@restaurante.com" />
          <FWInput label="Restaurant name" placeholder="Restaurante Lisboa" />
          <FWInput label="Password" type="password" placeholder="Min. 8 characters" />
        </div>
        <Btn variant="primary" size="lg" onClick={onLogin} className="w-full justify-center mt-6">Create account</Btn>
        <p className="text-center text-slate-600 text-xs mt-4">
          By creating an account you agree to our{" "}
          <span className="text-slate-400">Terms</span> and{" "}
          <span className="text-slate-400">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

// ─── AUTH: Forgot Password ────────────────────────────────────────────────────

function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ChevronLeft size={15} /> Back to sign in
        </button>
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B35] flex items-center justify-center">
            <Utensils size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">FoodWave</span>
        </div>
        {!sent ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B35]/15 flex items-center justify-center mb-6">
              <Lock size={20} className="text-[#FF6B35]" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-1 tracking-tight">Reset password</h2>
            <p className="text-slate-500 text-sm mb-8">Enter your email and we'll send reset instructions.</p>
            <FWInput label="Email address" type="email" placeholder="chef@restaurante.com" />
            <Btn variant="primary" size="lg" onClick={() => setSent(true)} className="w-full justify-center mt-5">Send reset link</Btn>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
            <p className="text-slate-400 text-sm mb-8">We sent reset instructions to your email address.</p>
            <Btn variant="secondary" onClick={onBack} className="justify-center mx-auto">Back to sign in</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setLoading(true);
      const { data, error } = await getDashboardSummary();

      if (!isMounted) return;

      if (error || !data) {
        setError(error ?? 'Unable to load dashboard data');
        setSummary(null);
      } else {
        setSummary(data);
        setError(null);
      }

      setLoading(false);
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const headerName = summary?.loggedInUser?.split(" ")[0] ?? "there";
  const hasRestaurant = Boolean(summary?.restaurantName);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Good evening, {loading ? "there" : headerName} 👋</h1>
          <p className="text-slate-400 text-sm mt-1">
            {loading
              ? "Loading your restaurant overview..."
              : hasRestaurant
                ? `Here's what's happening at ${summary?.restaurantName} today.`
                : "Create your first restaurant to populate this dashboard."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/12 border border-emerald-500/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">Restaurant open</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Restaurant" value={loading ? "Loading..." : summary?.restaurantName ?? "No restaurant"} sub="Current workspace" icon={Building2} />
        <StatCard label="Current Plan" value={loading ? "Loading..." : summary?.plan ?? "—"} sub="Subscription tier" icon={Crown} accent="#10B981" />
        <StatCard label="Logged In User" value={loading ? "Loading..." : summary?.loggedInUser ?? "—"} sub="Account owner" icon={Users} accent="#3B82F6" />
        <StatCard label="Total Users" value={loading ? "Loading..." : String(summary?.totalUsers ?? 0)} sub="Restaurant members" icon={Target} accent="#8B5CF6" />
      </div>

      <Card className="p-5">
        <SectionHeader title="Restaurant Snapshot" subtitle="Live counts from your workspace" />
        {error ? (
          <p className="text-sm text-slate-400">{error}</p>
        ) : loading ? (
          <p className="text-sm text-slate-400">Loading live dashboard metrics...</p>
        ) : !hasRestaurant ? (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-sm text-slate-400">
            No restaurant is linked to this account yet. Complete onboarding to unlock the full dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Total Customers</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary?.totalCustomers ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Total Campaigns</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary?.totalCampaigns ?? 0}</p>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <SectionHeader
            title="Revenue Overview"
            subtitle="Monthly performance"
            action={<TabBar tabs={["7 mo", "30d", "12 mo"]} active="7 mo" onChange={() => {}} />}
          />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#FF6B35" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Acquisition" subtitle="By channel" />
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={ACQUISITION_DATA} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" strokeWidth={0}>
                {ACQUISITION_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-1">
            {ACQUISITION_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-slate-400 text-xs">{d.name}</span>
                </div>
                <span className="text-white text-xs font-semibold">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <SectionHeader
            title="Active Campaigns"
            subtitle="Real-time performance"
            action={<Btn variant="ghost" size="sm"><ExternalLink size={12} /> View all</Btn>}
          />
          <div className="space-y-2">
            {CAMPAIGNS_LIST.filter(c => c.status === "Active").map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.platform === "Meta" ? "bg-blue-500/12" : "bg-emerald-500/12"}`}>
                  {c.platform === "Meta" ? <Instagram size={14} className="text-blue-400" /> : <Chrome size={14} className="text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.name}</p>
                  <p className="text-slate-500 text-xs">{c.platform} · €{c.spend.toLocaleString()} spent of €{c.budget.toLocaleString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-sm font-semibold">ROAS {c.roas}x</p>
                  <p className="text-emerald-400 text-xs">{c.conversions} conversions</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Recent Activity" />
          <div className="space-y-3">
            {ACTIVITY_FEED.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18` }}>
                  {item.icon === "checkin" && <CheckCircle size={11} style={{ color: item.color }} />}
                  {item.icon === "reward" && <Gift size={11} style={{ color: item.color }} />}
                  {item.icon === "campaign" && <Target size={11} style={{ color: item.color }} />}
                  {item.icon === "birthday" && <Star size={11} style={{ color: item.color }} />}
                  {item.icon === "wallet" && <CreditCard size={11} style={{ color: item.color }} />}
                  {item.icon === "review" && <Award size={11} style={{ color: item.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{item.customer}</p>
                  <p className="text-slate-500 text-xs truncate">{item.detail}</p>
                </div>
                <span className="text-slate-600 text-xs flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Wallet Cards" value="2,840" sub="active" icon={CreditCard} accent="#8B5CF6" />
        <StatCard label="Reservations" value="47" sub="today" icon={Calendar} accent="#F59E0B" />
        <StatCard label="Avg. ROAS" value="6.9x" sub="all campaigns" trend={3.2} icon={BarChart3} />
        <StatCard label="Points Issued" value="428K" sub="lifetime" icon={Gift} accent="#10B981" />
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function AnalyticsScreen() {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Campaign Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Connected to Meta Ads & Google Ads · Last synced 3 min ago</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm"><RefreshCw size={12} /> Sync</Btn>
          <Btn variant="secondary" size="sm"><Download size={12} /> Export</Btn>
        </div>
      </div>
      <TabBar tabs={["Overview", "Meta Ads", "Google Ads", "Compare"]} active={tab} onChange={setTab} />
      {tab === "Overview" && <AnalyticsOverview />}
      {tab === "Meta Ads" && <AnalyticsMeta />}
      {tab === "Google Ads" && <AnalyticsGoogle />}
      {tab === "Compare" && <AnalyticsCompare />}
    </div>
  );
}

function AnalyticsOverview() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Spend" value="€3,190" sub="this week" trend={-4.2} icon={DollarSign} />
        <StatCard label="Total Reach" value="124.2K" sub="unique users" trend={18.6} icon={Eye} accent="#3B82F6" />
        <StatCard label="Impressions" value="389.9K" sub="this week" trend={22.1} icon={Activity} accent="#8B5CF6" />
        <StatCard label="Conversions" value="477" sub="this week" trend={31.4} icon={Target} accent="#10B981" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <SectionHeader title="Daily Performance" subtitle="Spend vs Conversions this week" />
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={CAMPAIGN_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#475569", fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="spend" name="Spend (€)" fill="#FF6B35" opacity={0.8} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke="#10B981" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Key Metrics" subtitle="This week" />
          <div className="space-y-3">
            {[
              { label: "Avg. CTR", value: "3.28%", delta: "vs 2.91% lw", good: true },
              { label: "Avg. CPC", value: "€0.94", delta: "vs €1.12 lw", good: true },
              { label: "Avg. ROAS", value: "6.9x", delta: "vs 5.8x lw", good: true },
              { label: "Conv. Rate", value: "4.21%", delta: "vs 3.84% lw", good: true },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between p-3 bg-white/3 rounded-xl">
                <div>
                  <p className="text-slate-500 text-xs">{m.label}</p>
                  <p className="text-white font-semibold text-sm">{m.value}</p>
                </div>
                <span className="text-emerald-400 text-xs text-right">{m.delta}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <SectionHeader title="All Campaigns" action={<Btn variant="primary" size="sm"><Plus size={12} /> New Campaign</Btn>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/6">
                {["Campaign", "Platform", "Status", "Spend", "Reach", "CTR", "CPC", "ROAS", "Conv."].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-600 pb-3 pr-4 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {CAMPAIGNS_LIST.map(c => (
                <tr key={c.id} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 pr-4 text-sm font-medium text-white">{c.name}</td>
                  <td className="py-3 pr-4"><Badge variant={c.platform === "Meta" ? "info" : "success"}>{c.platform}</Badge></td>
                  <td className="py-3 pr-4"><Badge variant={c.status === "Active" ? "success" : "warning"}>{c.status}</Badge></td>
                  <td className="py-3 pr-4 text-sm text-slate-300">€{c.spend.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-sm text-slate-300">{c.reach.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-sm text-slate-300">{c.ctr}%</td>
                  <td className="py-3 pr-4 text-sm text-slate-300">€{c.cpc}</td>
                  <td className="py-3 pr-4 text-sm font-semibold text-emerald-400">{c.roas}x</td>
                  <td className="py-3 pr-4 text-sm text-slate-300">{c.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AnalyticsMeta() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Meta Spend" value="€1,880" sub="this week" trend={-2.1} icon={DollarSign} accent="#1877F2" />
        <StatCard label="Meta Reach" value="72.8K" sub="unique users" trend={24.3} icon={Eye} accent="#1877F2" />
        <StatCard label="Meta ROAS" value="8.1x" sub="avg. return" trend={15.2} icon={TrendingUp} accent="#1877F2" />
        <StatCard label="Conversions" value="240" sub="this week" trend={28.6} icon={Target} accent="#1877F2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader title="Reach & Impressions" subtitle="Meta campaigns daily" />
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={CAMPAIGN_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1877F2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="reach" name="Reach" stroke="#1877F2" strokeWidth={2} fill="url(#metaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Meta Campaigns" />
          <div className="space-y-3">
            {CAMPAIGNS_LIST.filter(c => c.platform === "Meta").map(c => (
              <div key={c.id} className="p-4 bg-white/3 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-medium">{c.name}</span>
                  <Badge variant={c.status === "Active" ? "success" : "warning"}>{c.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div><p className="text-slate-500 text-xs">Spend</p><p className="text-white text-sm font-semibold">€{c.spend}</p></div>
                  <div><p className="text-slate-500 text-xs">ROAS</p><p className="text-emerald-400 text-sm font-semibold">{c.roas}x</p></div>
                  <div><p className="text-slate-500 text-xs">Conv.</p><p className="text-white text-sm font-semibold">{c.conversions}</p></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Budget</span>
                    <span>€{c.spend} / €{c.budget}</span>
                  </div>
                  <div className="w-full h-1 bg-white/6 rounded-full">
                    <div className="h-1 bg-[#1877F2] rounded-full" style={{ width: `${(c.spend / c.budget) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsGoogle() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Google Spend" value="€1,310" sub="this week" trend={-5.8} icon={DollarSign} accent="#4285F4" />
        <StatCard label="Google Reach" value="50.6K" sub="unique users" trend={11.4} icon={Eye} accent="#4285F4" />
        <StatCard label="Google ROAS" value="5.7x" sub="avg. return" trend={8.2} icon={TrendingUp} accent="#4285F4" />
        <StatCard label="Conversions" value="150" sub="this week" trend={14.3} icon={Target} accent="#4285F4" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader title="Clicks & Conversions" subtitle="Google campaigns daily" />
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={CAMPAIGN_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#475569", fontSize: 11 }} />
              <Bar dataKey="clicks" name="Clicks" fill="#4285F4" opacity={0.7} radius={[3, 3, 0, 0]} />
              <Bar dataKey="conversions" name="Conversions" fill="#10B981" opacity={0.9} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Google Campaigns" />
          <div className="space-y-3">
            {CAMPAIGNS_LIST.filter(c => c.platform === "Google").map(c => (
              <div key={c.id} className="p-4 bg-white/3 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-medium">{c.name}</span>
                  <Badge variant={c.status === "Active" ? "success" : "warning"}>{c.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div><p className="text-slate-500 text-xs">Spend</p><p className="text-white text-sm font-semibold">€{c.spend}</p></div>
                  <div><p className="text-slate-500 text-xs">ROAS</p><p className="text-emerald-400 text-sm font-semibold">{c.roas}x</p></div>
                  <div><p className="text-slate-500 text-xs">CTR</p><p className="text-white text-sm font-semibold">{c.ctr}%</p></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Budget</span><span>€{c.spend} / €{c.budget}</span>
                  </div>
                  <div className="w-full h-1 bg-white/6 rounded-full">
                    <div className="h-1 bg-[#4285F4] rounded-full" style={{ width: `${(c.spend / c.budget) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsCompare() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader title="Platform Comparison" subtitle="Meta vs Google Ads — this week" />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={[
            { metric: "Reach (K)", meta: 72.8, google: 50.6 },
            { metric: "Clicks (K)", meta: 14.6, google: 8.7 },
            { metric: "Conversions", meta: 240, google: 150 },
          ]} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="metric" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "#475569", fontSize: 11 }} />
            <Bar dataKey="meta" name="Meta Ads" fill="#1877F2" radius={[4, 4, 0, 0]} />
            <Bar dataKey="google" name="Google Ads" fill="#4285F4" radius={[4, 4, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: "Meta Ads", color: "#1877F2", metrics: [{ l: "Spend", v: "€1,880" }, { l: "ROAS", v: "8.1x" }, { l: "CTR", v: "3.7%" }, { l: "CPC", v: "€0.73" }, { l: "Conversions", v: "240" }] },
          { label: "Google Ads", color: "#4285F4", metrics: [{ l: "Spend", v: "€1,310" }, { l: "ROAS", v: "5.7x" }, { l: "CTR", v: "2.4%" }, { l: "CPC", v: "€1.18" }, { l: "Conversions", v: "150" }] },
        ].map(p => (
          <Card key={p.label} className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <h3 className="text-white font-semibold">{p.label}</h3>
            </div>
            <div className="space-y-3">
              {p.metrics.map(m => (
                <div key={m.l} className="flex justify-between items-center py-2 border-b border-white/4 last:border-0">
                  <span className="text-slate-400 text-sm">{m.l}</span>
                  <span className="text-white font-semibold text-sm">{m.v}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

type CustomerRecord = Customer & { customer_status: string | null };

type CustomerSummary = {
  totalCustomers: number;
  newCustomersThisMonth: number;
  vipCustomers: number;
  customersAtRisk: number;
  lostCustomers: number;
  birthdaysThisMonth: number;
  averageCustomerValue: number;
};

function getCustomerStatusLabel(customer: Customer): string {
  if (customer.marketing_segment === "vip") return "VIP";
  if (customer.marketing_segment === "at_risk") return "At Risk";
  if (customer.marketing_segment === "lost") return "Lost";
  if (customer.marketing_segment === "regular") return "Regular";
  if (customer.marketing_segment === "new") return "New";
  if (customer.lifecycle_status === "inactive") return "Inactive";
  if (customer.lifecycle_status === "archived") return "Archived";
  return "Active";
}

function toCustomerRecord(customer: Customer): CustomerRecord {
  return {
    ...customer,
    customer_status: getCustomerStatusLabel(customer),
  };
}

function buildCustomerSummary(customers: CustomerRecord[]): CustomerSummary {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const newCustomersThisMonth = customers.filter((customer) => {
    const createdAt = new Date(customer.created_at);
    return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
  }).length;

  const birthdaysThisMonth = customers.filter((customer) => {
    if (!customer.birthday) return false;
    const birthday = new Date(customer.birthday);
    return birthday.getMonth() === currentMonth;
  }).length;

  const totalSpent = customers.reduce((sum, customer) => sum + Number(customer.total_spent ?? 0), 0);

  return {
    totalCustomers: customers.length,
    newCustomersThisMonth,
    vipCustomers: customers.filter((customer) => customer.marketing_segment === "vip").length,
    customersAtRisk: customers.filter((customer) => customer.marketing_segment === "at_risk").length,
    lostCustomers: customers.filter((customer) => customer.marketing_segment === "lost").length,
    birthdaysThisMonth,
    averageCustomerValue: customers.length > 0 ? totalSpent / customers.length : 0,
  };
}

async function getCurrentOrganizationId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.organization_id ?? null;
}

function CRMCreateEditModal({
  customer,
  organizationId,
  onClose,
  onSaved,
}: {
  customer?: CustomerRecord | null;
  organizationId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(customer?.first_name ?? "");
  const [lastName, setLastName] = useState(customer?.last_name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [birthday, setBirthday] = useState(customer?.birthday ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [tags, setTags] = useState((customer?.tags ?? []).join(", "));
  const [totalVisits, setTotalVisits] = useState(String(customer?.total_visits ?? 0));
  const [totalSpent, setTotalSpent] = useState(String(customer?.total_spent ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      birthday: birthday || null,
      notes: notes || null,
      tags: tags.split(",").map((tag: string) => tag.trim()).filter(Boolean),
      total_visits: Number(totalVisits) || 0,
      total_spent: Number(totalSpent) || 0,
      last_visit: customer?.last_visit ?? null,
    };

    if (!customer?.id && !organizationId) {
      setLoading(false);
      setError("No organization linked to this account");
      return;
    }

    const result = customer?.id
      ? await updateCustomer(customer.id, payload)
      : await createCustomer({
          organization_id: organizationId as string,
          ...payload,
        });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold">{customer ? "Edit customer" : "Create customer"}</h3>
            <p className="text-slate-500 text-sm">Keep the customer profile up to date.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <FWInput label="First name" placeholder="First name" defaultValue={firstName} onChange={(value) => setFirstName(value)} />
          <FWInput label="Last name" placeholder="Last name" defaultValue={lastName} onChange={(value) => setLastName(value)} />
          <FWInput label="Email" type="email" placeholder="customer@email.com" defaultValue={email} onChange={(value) => setEmail(value)} />
          <FWInput label="Phone" placeholder="Phone" defaultValue={phone} onChange={(value) => setPhone(value)} />
          <FWInput label="Birthday" type="date" defaultValue={birthday} onChange={(value) => setBirthday(value)} />
          <FWInput label="Total visits" type="number" defaultValue={String(totalVisits)} onChange={(value) => setTotalVisits(value)} />
          <FWInput label="Total spent" type="number" defaultValue={String(totalSpent)} onChange={(value) => setTotalSpent(value)} />
          <FWInput label="Tags" placeholder="VIP, Birthday Club" defaultValue={tags} onChange={(value) => setTags(value)} />
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-slate-400 uppercase tracking-wide">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF6B35]/50 transition-all"
              rows={4}
              placeholder="Notes"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "Saving..." : customer ? "Save changes" : "Create customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CRMScreen({ onViewProfile }: { onViewProfile: (id: string) => void }) {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const resolvedOrganizationId = organizationId ?? await getCurrentOrganizationId();

    if (!resolvedOrganizationId) {
      setCustomers([]);
      setSummary(buildCustomerSummary([]));
      setError('No organization linked to this account');
      setLoading(false);
      return;
    }

    if (!organizationId) {
      setOrganizationId(resolvedOrganizationId);
    }

    const customerResult = search.trim()
      ? await searchCustomers(resolvedOrganizationId, search)
      : await getCustomersByOrganization(resolvedOrganizationId);

    if (customerResult.error) {
      setError(customerResult.error ?? 'Unable to load CRM data');
      setLoading(false);
      return;
    }

    const normalizedCustomers = (customerResult.data ?? []).map((customer) => toCustomerRecord(customer));
    setCustomers(normalizedCustomers);
    setSummary(buildCustomerSummary(normalizedCustomers));
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [search]);

  const handleDelete = async (customerId: string) => {
    const result = await archiveCustomer(customerId);
    if (result.error) {
      setError(result.error);
      return;
    }
    void loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">CRM</h1>
          <p className="text-slate-400 text-sm mt-1">
            {summary ? `${summary.totalCustomers} customers · ${summary.vipCustomers} VIP · ${summary.birthdaysThisMonth} birthdays this month` : 'Loading CRM summary...'}
          </p>
        </div>
        <Btn variant="primary" onClick={() => setShowModal(true)}><Plus size={13} /> Add Customer</Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="VIP Customers" value={summary ? String(summary.vipCustomers) : "—"} icon={Crown} accent="#F59E0B" />
        <StatCard label="Customers at Risk" value={summary ? String(summary.customersAtRisk) : "—"} icon={AlertCircle} accent="#EF4444" />
        <StatCard label="Lost Customers" value={summary ? String(summary.lostCustomers) : "—"} icon={RefreshCw} accent="#8B5CF6" />
        <StatCard label="Birthdays This Month" value={summary ? String(summary.birthdaysThisMonth) : "—"} sub="celebrations" icon={Calendar} accent="#10B981" />
        <StatCard label="Average Customer Value" value={summary ? `€${summary.averageCustomerValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} sub="per customer" icon={DollarSign} accent="#FF6B35" />
      </div>

      <Card>
        <div className="p-4 border-b border-white/6 flex items-center gap-3 flex-wrap">
          <div className="flex-1 relative min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full bg-white/4 border border-white/6 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF6B35]/40 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 text-sm text-slate-400">Loading customers...</div>
          ) : error ? (
            <div className="p-5 text-sm text-red-300">{error}</div>
          ) : customers.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">No customers found for this restaurant yet.</div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-white/4">
                  {['Customer', 'Contact', 'Status', 'Visits', 'Spent', 'Tags', 'Last Visit', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-600 px-4 py-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => onViewProfile(customer.id)} className="flex items-center gap-3 text-left">
                        <Avatar name={`${customer.first_name} ${customer.last_name}`} size="sm" />
                        <div>
                          <p className="text-white text-sm font-medium">{customer.first_name} {customer.last_name}</p>
                          <p className="text-slate-500 text-xs">{customer.email || 'No email'}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{customer.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={customer.customer_status === 'VIP' ? 'orange' : customer.customer_status === 'At Risk' ? 'danger' : customer.customer_status === 'Lost' ? 'warning' : 'success'}>
                        {customer.customer_status || 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{customer.total_visits}</td>
                    <td className="px-4 py-3 text-sm text-white">€{Number(customer.total_spent).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{customer.tags.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onViewProfile(customer.id)} className="text-slate-400 hover:text-white">View</button>
                        <button onClick={() => handleDelete(customer.id)} className="text-red-400 hover:text-red-300">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {showModal && <CRMCreateEditModal organizationId={organizationId} onClose={() => setShowModal(false)} onSaved={() => { void loadData(); }} />}
    </div>
  );
}

function CRMProfileScreen({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadCustomer = useCallback(async () => {
    setLoading(true);
      const { data, error: requestError } = await getCustomerById(customerId);
    if (!mountedRef.current) return;
    if (requestError || !data) {
      setError(requestError ?? 'Customer not found');
      setCustomer(null);
    } else {
      setError(null);
        setCustomer(toCustomerRecord(data));
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadCustomer();

    return () => {
      mountedRef.current = false;
    };
  }, [loadCustomer]);

  if (loading) {
    return <div className="text-sm text-slate-400">Loading customer profile...</div>;
  }

  if (error || !customer) {
    return <div className="text-sm text-red-300">{error ?? 'Customer not found'}</div>;
  }

  const handleCreateWalletCard = async () => {
    if (!customer) return;

    setWalletMessage(null);
    const result = await createWalletCard({
      customer_id: customer.id,
      pass_identifier: `fw-${customer.id}`,
      platform: 'Apple Wallet',
    });

    if (result.error) {
      setWalletMessage(result.error);
      return;
    }

    setWalletMessage('Wallet pass record prepared for Apple Wallet integration.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/4 hover:bg-white/8 text-slate-400 hover:text-white transition-all">
          <ChevronLeft size={17} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">{customer.first_name} {customer.last_name}</h1>
          <p className="text-slate-400 text-sm">Customer profile</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Btn variant="secondary" size="sm" onClick={() => setShowModal(true)}><Edit size={12} /> Edit</Btn>
          <Btn variant="secondary" size="sm" onClick={() => { void handleCreateWalletCard(); }}><CreditCard size={12} /> Wallet</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-center mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#e55a24] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-orange-500/20">
              {`${customer.first_name} ${customer.last_name}`.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <h3 className="text-white font-semibold text-lg">{customer.first_name} {customer.last_name}</h3>
            <p className="text-slate-500 text-sm">{customer.email || 'No email provided'}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Badge variant={customer.customer_status === 'VIP' ? 'orange' : customer.customer_status === 'At Risk' ? 'danger' : customer.customer_status === 'Lost' ? 'warning' : 'success'}>
                {customer.customer_status || 'Active'}
              </Badge>
              <Badge>
                Score {customer.customer_score ?? 0}
              </Badge>
            </div>
          </div>
          <div className="space-y-3 border-t border-white/6 pt-4">
            {[
              { icon: Phone, text: customer.phone || 'No phone provided' },
              { icon: Calendar, text: customer.birthday ? `Birthday: ${new Date(customer.birthday).toLocaleDateString()}` : 'Birthday: —' },
              { icon: DollarSign, text: `Spent: €${Number(customer.total_spent).toLocaleString()}` },
              { icon: Utensils, text: `Visits: ${customer.total_visits}` },
              { icon: TrendingUp, text: `Avg. ticket: €${Number(customer.average_ticket ?? 0).toLocaleString()}` },
              { icon: Award, text: `Lifetime value: €${Number(customer.lifetime_value ?? 0).toLocaleString()}` },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon size={13} className="text-slate-600 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/6">
            <p className="text-slate-600 text-xs uppercase tracking-wide mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {customer.tags.length > 0 ? customer.tags.map((tag: string) => <Badge key={tag}>{tag}</Badge>) : <span className="text-slate-500 text-sm">No tags</span>}
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <SectionHeader title="Notes" subtitle="Customer context" />
            <p className="text-slate-400 text-sm">{customer.notes || 'No notes yet.'}</p>
          </Card>
          {walletMessage && (
            <Card className="p-4">
              <p className="text-sm text-slate-300">{walletMessage}</p>
            </Card>
          )}
        </div>
      </div>

      {showModal && <CRMCreateEditModal customer={customer} organizationId={customer.organization_id} onClose={() => setShowModal(false)} onSaved={() => { void loadCustomer(); }} />}
    </div>
  );
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

function WalletScreen() {
  const [tab, setTab] = useState("Cards");
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Loyalty Wallet</h1>
          <p className="text-slate-400 text-sm mt-1">2,840 active cards · Apple, Google & Huawei Wallet</p>
        </div>
        <Btn variant="primary"><Plus size={13} /> Issue Card</Btn>
      </div>
      <TabBar tabs={["Cards", "QR Code", "Rewards", "Scan History"]} active={tab} onChange={setTab} />
      {tab === "Cards" && <WalletCards />}
      {tab === "QR Code" && <WalletQR />}
      {tab === "Rewards" && <WalletRewards />}
      {tab === "Scan History" && <WalletHistory />}
    </div>
  );
}

function WalletCards() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Cards" value="2,840" icon={CreditCard} />
        <StatCard label="Apple Wallet" value="1,240" icon={Smartphone} accent="#10B981" />
        <StatCard label="Google Wallet" value="1,180" icon={Globe} accent="#4285F4" />
        <StatCard label="Huawei Wallet" value="420" icon={Smartphone} accent="#CF0A2C" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-white font-semibold mb-4">Card Preview</h3>
          <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/40" style={{ aspectRatio: "1.586/1", background: "linear-gradient(135deg, #0d1b3e 0%, #1a2a4a 40%, #0f2847 100%)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 75% 25%, rgba(255,107,53,0.18) 0%, transparent 50%)" }} />
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full border border-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full border border-white/4 translate-y-1/3 -translate-x-1/3 pointer-events-none" />
            <div className="relative h-full p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FF6B35] flex items-center justify-center shadow-lg">
                    <Utensils size={13} className="text-white" />
                  </div>
                  <div>
                    <span className="text-white font-semibold text-sm">Restaurante Lisboa</span>
                    <p className="text-white/40 text-xs leading-none">LOYALTY CARD</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#FF6B35]/80" />
                  <div className="w-6 h-6 rounded-full bg-amber-400/70 -ml-3" />
                </div>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Points Balance</p>
                <p className="text-white text-4xl font-bold tracking-tight">2,840</p>
                <p className="text-white/40 text-xs mt-1">≈ €28.40 redeemable value</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider">Cardholder</p>
                  <p className="text-white text-sm font-semibold">Sofia Martins</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Tier</p>
                  <div className="flex items-center gap-1">
                    <Crown size={11} className="text-[#FF6B35]" />
                    <p className="text-[#FF6B35] text-sm font-semibold">VIP Gold</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Btn variant="secondary" size="sm" className="flex-1 justify-center"><Smartphone size={12} /> Apple Wallet</Btn>
            <Btn variant="secondary" size="sm" className="flex-1 justify-center"><Globe size={12} /> Google</Btn>
          </div>
        </div>

        <Card className="p-5">
          <SectionHeader title="Card Configuration" />
          <div className="space-y-4">
            <FWInput label="Card Title" defaultValue="Restaurante Lisboa" />
            <FWInput label="Points Label" defaultValue="Loyalty Points" />
            <div className="grid grid-cols-2 gap-3">
              <FWInput label="Points Ratio" defaultValue="1 pt = €0.01" />
              <FWInput label="Expiry" defaultValue="12 months" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide">Tier Levels</label>
              {[
                { name: "Bronze", pts: "0+", color: "#CD7F32" },
                { name: "Silver", pts: "1,000+", color: "#94A3B8" },
                { name: "Gold VIP", pts: "2,500+", color: "#FF6B35" },
              ].map(t => (
                <div key={t.name} className="flex items-center gap-3 p-2.5 hover:bg-white/3 rounded-xl transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-white text-sm flex-1">{t.name}</span>
                  <span className="text-slate-500 text-xs">{t.pts} pts</span>
                </div>
              ))}
            </div>
            <Btn variant="primary" className="w-full justify-center">Save Configuration</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function WalletQR() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-8 text-center">
          <h3 className="text-white font-semibold mb-1">Restaurant Check-in QR</h3>
          <p className="text-slate-500 text-sm mb-8">Customers scan this to earn points when dining</p>
          <div className="mx-auto w-48 h-48 bg-white rounded-2xl p-3 mb-6 shadow-xl">
            <div className="w-full h-full bg-[#0F172A] rounded-xl flex items-center justify-center p-2">
              <svg viewBox="0 0 50 50" className="w-full h-full">
                {[...Array(7)].map((_, row) => [...Array(7)].map((__, col) => {
                  const isCorner = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
                  const filled = isCorner || Math.sin(row * 7 + col * 3) > 0;
                  return filled ? (
                    <rect key={`${row}-${col}`} x={col * 7} y={row * 7} width={6} height={6} rx={1} fill="white" />
                  ) : null;
                }))}
              </svg>
            </div>
          </div>
          <p className="text-slate-600 text-xs font-mono mb-6">FW-REST-12847-LISBOA</p>
          <div className="flex gap-3 justify-center">
            <Btn variant="primary"><Download size={13} /> Download PNG</Btn>
            <Btn variant="secondary"><Copy size={13} /> Copy Link</Btn>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-white font-semibold mb-4">QR Settings</h3>
            <div className="space-y-3">
              {[
                { label: "Auto-award points", sub: "+50 points per scan", on: true },
                { label: "1 scan per day limit", sub: "Prevent duplicate scans", on: true },
                { label: "Staff verification", sub: "Require staff approval", on: false },
                { label: "NFC support", sub: "Apple/Google tap-to-scan", on: true },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 hover:bg-white/3 rounded-xl transition-colors">
                  <div>
                    <p className="text-white text-sm font-medium">{s.label}</p>
                    <p className="text-slate-500 text-xs">{s.sub}</p>
                  </div>
                  <Toggle enabled={s.on} />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-3">Today's Scans</p>
            <p className="text-5xl font-bold text-white">48</p>
            <div className="flex justify-center gap-8 mt-4">
              <div><p className="text-2xl font-bold text-emerald-400">42</p><p className="text-slate-500 text-xs">Earned pts</p></div>
              <div><p className="text-2xl font-bold text-[#FF6B35]">6</p><p className="text-slate-500 text-xs">Redeemed</p></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function WalletRewards() {
  const rewards = [
    { name: "Free Dessert", points: 500, claimed: 84, active: true, desc: "Any dessert from our menu" },
    { name: "10% Discount", points: 300, claimed: 142, active: true, desc: "Valid on total bill" },
    { name: "Free Coffee", points: 200, claimed: 218, active: true, desc: "Any hot or cold coffee" },
    { name: "Birthday Dinner for 2", points: 2000, claimed: 12, active: true, desc: "Valid on birthday week" },
    { name: "Free Bottle of Wine", points: 1000, claimed: 38, active: false, desc: "House wine selection" },
    { name: "Tasting Menu Upgrade", points: 1500, claimed: 8, active: true, desc: "+2 courses added" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
          <StatCard label="Active Rewards" value="5" icon={Gift} />
          <StatCard label="Claimed (month)" value="502" icon={Award} accent="#10B981" />
          <StatCard label="Points Spent" value="182K" icon={Zap} accent="#F59E0B" />
        </div>
        <Btn variant="primary"><Plus size={13} /> New Reward</Btn>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {rewards.map((r, i) => (
          <Card key={i} className="p-5 hover:border-white/10 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/12 flex items-center justify-center">
                <Gift size={17} className="text-[#FF6B35]" />
              </div>
              <Badge variant={r.active ? "success" : "warning"}>{r.active ? "Active" : "Paused"}</Badge>
            </div>
            <h3 className="text-white font-semibold mb-1">{r.name}</h3>
            <p className="text-slate-500 text-xs mb-4">{r.desc}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[#FF6B35]">
                <Zap size={11} />
                <span className="text-sm font-semibold">{r.points.toLocaleString()} pts</span>
              </div>
              <span className="text-slate-500 text-xs">{r.claimed} claimed</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WalletHistory() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scans Today" value="48" icon={QrCode} />
        <StatCard label="Points Awarded" value="2,400" sub="today" icon={Zap} accent="#10B981" />
        <StatCard label="Points Redeemed" value="3,200" sub="today" icon={Gift} accent="#FF6B35" />
        <StatCard label="Unique Customers" value="38" sub="today" icon={Users} accent="#3B82F6" />
      </div>
      <Card>
        <div className="p-4 border-b border-white/6">
          <h3 className="text-white font-semibold">Scan History</h3>
        </div>
        <div className="divide-y divide-white/4">
          {SCAN_HISTORY.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-white/2 transition-colors">
              <Avatar name={s.customer} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{s.customer}</p>
                <p className="text-slate-500 text-xs">{s.action} · {s.method}</p>
              </div>
              <span className={`text-sm font-semibold ${s.points.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>{s.points} pts</span>
              <span className="text-slate-500 text-xs w-32 text-right">{s.date}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsScreen() {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Campaigns & Notifications</h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage customer communication</p>
        </div>
        <Btn variant="primary"><Plus size={13} /> New Campaign</Btn>
      </div>
      <div className="flex gap-1 flex-wrap">
        {["Overview", "Push", "Birthday", "Happy Hour", "Events", "Schedule", "Segments"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[#FF6B35] text-white" : "text-slate-400 hover:text-white hover:bg-white/6"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && <NotifOverview />}
      {tab === "Push" && <NotifPush />}
      {tab === "Birthday" && <NotifBirthday />}
      {tab === "Happy Hour" && <NotifHappyHour />}
      {tab === "Events" && <NotifEvents />}
      {tab === "Schedule" && <NotifSchedule />}
      {tab === "Segments" && <NotifSegments />}
    </div>
  );
}

function NotifOverview() {
  const campaigns = [
    { name: "Summer Welcome", type: "Push", sent: 2840, opened: 1420, ctr: "50.0%", status: "Sent", date: "Jul 24" },
    { name: "Birthday Club – Jul", type: "Birthday", sent: 84, opened: 72, ctr: "85.7%", status: "Sent", date: "Jul 20" },
    { name: "Happy Hour Friday", type: "Happy Hour", sent: 1240, opened: 680, ctr: "54.8%", status: "Scheduled", date: "Jul 28" },
    { name: "Seafood Festival Invite", type: "Event", sent: 0, opened: 0, ctr: "—", status: "Draft", date: "Jul 30" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sent Today" value="340" icon={Send} />
        <StatCard label="Open Rate" value="54.2%" sub="avg. this week" trend={8.4} icon={Eye} accent="#10B981" />
        <StatCard label="Scheduled" value="3" sub="pending" icon={Clock} accent="#F59E0B" />
        <StatCard label="Segments" value="8" sub="customer groups" icon={Users} accent="#8B5CF6" />
      </div>
      <Card>
        <div className="p-4 border-b border-white/6"><h3 className="text-white font-semibold">Recent Campaigns</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/4">
                {["Campaign", "Type", "Sent", "Opened", "CTR", "Status", "Date"].map(h => (
                  <th key={h} className="text-left text-xs text-slate-600 px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {campaigns.map((c, i) => (
                <tr key={i} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3"><Badge>{c.type}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-300">{c.sent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{c.opened.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{c.ctr}</td>
                  <td className="px-4 py-3"><Badge variant={c.status === "Sent" ? "success" : c.status === "Scheduled" ? "info" : "warning"}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-500">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function NotifPush() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5">
        <SectionHeader title="Create Push Notification" />
        <div className="space-y-4">
          <FWInput label="Campaign Name" placeholder="e.g. Weekend Special Offer" />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Audience Segment</label>
            <select className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
              <option>All Customers (2,840)</option>
              <option>VIP Members (184)</option>
              <option>Regular Customers (1,420)</option>
              <option>Inactive 30+ Days (240)</option>
            </select>
          </div>
          <FWInput label="Notification Title" placeholder="Don't miss out! 🍽️" />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Message</label>
            <textarea className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF6B35]/50 resize-none" rows={3} placeholder="Join us this weekend for our special tasting menu..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FWInput label="Send Date" type="date" />
            <FWInput label="Send Time" type="time" />
          </div>
          <div className="flex gap-3 pt-1">
            <Btn variant="secondary" className="flex-1 justify-center">Save Draft</Btn>
            <Btn variant="primary" className="flex-1 justify-center"><Send size={13} /> Send Now</Btn>
          </div>
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-5">Preview</h3>
          <div className="bg-[#1a1a2e] rounded-2xl p-4 max-w-xs mx-auto border border-white/8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-[#FF6B35] flex items-center justify-center">
                <Utensils size={10} className="text-white" />
              </div>
              <span className="text-white text-xs font-medium">FoodWave</span>
              <span className="text-slate-500 text-xs ml-auto">now</span>
            </div>
            <p className="text-white text-sm font-semibold">Don't miss out! 🍽️</p>
            <p className="text-slate-400 text-xs mt-1">Join us this weekend for our special tasting menu...</p>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-white font-semibold mb-4">Performance Stats</h3>
          <div className="space-y-3">
            {[
              { l: "Avg. Open Rate", v: "54.2%" },
              { l: "Avg. CTR", v: "18.4%" },
              { l: "Best send time", v: "Fri 18:00–19:00" },
              { l: "Best audience", v: "VIP Members" },
            ].map(m => (
              <div key={m.l} className="flex justify-between py-2 border-b border-white/4 last:border-0">
                <span className="text-slate-400 text-sm">{m.l}</span>
                <span className="text-white font-medium text-sm">{m.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function NotifBirthday() {
  const upcoming = [
    { name: "Inês Rodrigues", birthday: "Jul 27", visits: 19, status: "Sending tomorrow" },
    { name: "Marco Ferreira", birthday: "Jul 28", visits: 31, status: "Scheduled" },
    { name: "Sofia Martins", birthday: "Aug 14", visits: 47, status: "Pending" },
    { name: "Tiago Santos", birthday: "Aug 30", visits: 3, status: "Pending" },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5">
        <SectionHeader title="Birthday Campaign Template" />
        <div className="space-y-4">
          <FWInput label="Send (days before birthday)" defaultValue="3 days before" />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Message Template</label>
            <textarea className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/50 resize-none" rows={3} defaultValue="Happy Birthday, {{first_name}}! 🎂 Celebrate with us and enjoy a complimentary dessert on your special day!" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Birthday Reward</label>
            <select className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
              <option>+200 Bonus Points</option>
              <option>Free Dessert</option>
              <option>10% Discount</option>
              <option>Free Birthday Dinner for 2</option>
            </select>
          </div>
          <Btn variant="primary" className="w-full justify-center">Save Template</Btn>
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Upcoming Birthdays" subtitle="Next 30 days" />
        <div className="space-y-3">
          {upcoming.map((u, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl hover:bg-white/5 transition-all">
              <Avatar name={u.name} size="sm" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{u.name}</p>
                <p className="text-slate-500 text-xs">{u.birthday} · {u.visits} visits</p>
              </div>
              <Badge variant={u.status === "Sending tomorrow" ? "warning" : u.status === "Scheduled" ? "info" : "default"}>{u.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotifHappyHour() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5">
        <SectionHeader title="Happy Hour Settings" />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FWInput label="Start Time" type="time" defaultValue="17:00" />
            <FWInput label="End Time" type="time" defaultValue="19:00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">Days</label>
            <div className="flex gap-2">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
                <button key={d} className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${[0,1,2,3,4].includes(i) ? "bg-[#FF6B35] text-white" : "bg-white/6 text-slate-400 hover:bg-white/10"}`}>{d}</button>
              ))}
            </div>
          </div>
          <FWInput label="Offer Text" defaultValue="2× points on all drinks · Mon–Fri 17–19h" />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Notification Message</label>
            <textarea className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none resize-none" rows={2} defaultValue="Happy Hour starts in 1 hour! 🍹 Earn 2× points on all drinks." />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/3 rounded-xl">
            <div>
              <p className="text-white text-sm font-medium">Send 1h reminder</p>
              <p className="text-slate-500 text-xs">Automatic push before happy hour</p>
            </div>
            <Toggle enabled={true} />
          </div>
          <Btn variant="primary" className="w-full justify-center">Save Happy Hour</Btn>
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Happy Hour Performance" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/3 rounded-xl text-center">
              <p className="text-3xl font-bold text-[#FF6B35]">2.4×</p>
              <p className="text-slate-400 text-xs mt-1">Visits during HH</p>
            </div>
            <div className="p-4 bg-white/3 rounded-xl text-center">
              <p className="text-3xl font-bold text-emerald-400">68%</p>
              <p className="text-slate-400 text-xs mt-1">Notif open rate</p>
            </div>
          </div>
          <div className="p-4 bg-white/3 rounded-xl">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Best performing day</p>
            <p className="text-white font-semibold">Friday 17:00–19:00</p>
            <p className="text-slate-500 text-xs mt-0.5">Avg. +84 check-ins per session</p>
          </div>
          <div className="p-4 bg-white/3 rounded-xl">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Revenue uplift</p>
            <p className="text-white font-semibold">+€1,840 / week</p>
            <p className="text-slate-500 text-xs mt-0.5">Attributed to happy hour traffic</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function NotifEvents() {
  const events = [
    { name: "Seafood Festival", date: "Aug 3, 2026", cap: 80, reg: 64, status: "Open" },
    { name: "Wine Pairing Dinner", date: "Aug 10, 2026", cap: 24, reg: 24, status: "Full" },
    { name: "Chef's Table Experience", date: "Aug 17, 2026", cap: 12, reg: 8, status: "Open" },
    { name: "Anniversary Gala", date: "Sep 1, 2026", cap: 120, reg: 32, status: "Open" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex justify-end"><Btn variant="primary"><Plus size={13} /> Create Event</Btn></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {events.map((e, i) => (
          <Card key={i} className="p-5 hover:border-white/10 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">{e.name}</h3>
                <p className="text-slate-500 text-sm mt-0.5">{e.date}</p>
              </div>
              <Badge variant={e.status === "Full" ? "danger" : "success"}>{e.status}</Badge>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                <span>Registered</span><span>{e.reg} / {e.cap}</span>
              </div>
              <div className="w-full h-1.5 bg-white/6 rounded-full">
                <div className={`h-1.5 rounded-full ${e.status === "Full" ? "bg-red-400" : "bg-[#FF6B35]"}`} style={{ width: `${(e.reg / e.cap) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" className="flex-1 justify-center"><Bell size={11} /> Notify</Btn>
              <Btn variant="ghost" size="sm"><Edit size={11} /></Btn>
              <Btn variant="ghost" size="sm"><Trash2 size={11} /></Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotifSchedule() {
  const scheduled = [
    { name: "Weekend Brunch Reminder", type: "Push", audience: "All", date: "Jul 28, 08:00" },
    { name: "Happy Hour Friday", type: "Happy Hour", audience: "Regulars", date: "Jul 28, 16:00" },
    { name: "VIP Wine Dinner Invite", type: "Event", audience: "VIP", date: "Jul 29, 10:00" },
    { name: "Inactive Customer Win-back", type: "Push", audience: "At Risk", date: "Jul 30, 12:00" },
  ];
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader title="Scheduled Notifications" action={<Btn variant="primary" size="sm"><Plus size={13} /> Schedule</Btn>} />
        <div className="space-y-2">
          {scheduled.map((s, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white/3 rounded-xl hover:bg-white/5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/12 flex items-center justify-center flex-shrink-0">
                <Clock size={15} className="text-[#FF6B35]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{s.name}</p>
                <p className="text-slate-500 text-xs">{s.type} · {s.audience}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white text-sm">{s.date}</p>
                <Badge variant="info">Scheduled</Badge>
              </div>
              <button className="text-slate-600 hover:text-red-400 p-1.5 rounded transition-colors flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotifSegments() {
  const segments = [
    { name: "VIP Gold Members", count: 184, desc: "2,500+ lifetime points", color: "#FF6B35" },
    { name: "Birthday Club", count: 640, desc: "Opted into birthday promos", color: "#F59E0B" },
    { name: "Lunch Regulars", count: 320, desc: "Visited 2+ times on weekdays", color: "#3B82F6" },
    { name: "Weekend Warriors", count: 480, desc: "Primarily weekend visitors", color: "#8B5CF6" },
    { name: "At-Risk Customers", count: 240, desc: "No visit in 30+ days", color: "#EF4444" },
    { name: "New Members", count: 380, desc: "Joined in last 30 days", color: "#10B981" },
    { name: "Corporate Diners", count: 128, desc: "Tagged as business", color: "#06B6D4" },
    { name: "Vegetarian/Vegan", count: 96, desc: "Dietary preference tag", color: "#84CC16" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-slate-400 text-sm">8 segments · 2,840 total customers</p>
        <Btn variant="primary" size="sm"><Plus size={13} /> New Segment</Btn>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {segments.map((seg, i) => (
          <Card key={i} className="p-4 hover:border-white/12 transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${seg.color}18` }}>
              <Users size={14} style={{ color: seg.color }} />
            </div>
            <h3 className="text-white text-sm font-semibold mb-1">{seg.name}</h3>
            <p className="text-slate-500 text-xs mb-4">{seg.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">{seg.count.toLocaleString()}</span>
              <button className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all">
                <Send size={12} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function ReportsScreen() {
  const [tab, setTab] = useState("Sales");
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Business performance analytics · Jan–Jul 2026</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm"><Download size={12} /> Export PDF</Btn>
          <Btn variant="secondary" size="sm"><FileText size={12} /> Export Excel</Btn>
        </div>
      </div>
      <TabBar tabs={["Sales", "Marketing", "Retention", "Campaigns", "Acquisition"]} active={tab} onChange={setTab} />
      {tab === "Sales" && <ReportsSales />}
      {tab === "Marketing" && <ReportsMarketing />}
      {tab === "Retention" && <ReportsRetention />}
      {tab === "Campaigns" && <ReportsCampaigns />}
      {tab === "Acquisition" && <ReportsAcquisition />}
    </div>
  );
}

function ReportsSales() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value="€372.7K" sub="Jan–Jul 2026" trend={18.4} icon={DollarSign} />
        <StatCard label="Avg. Order Value" value="€48.20" sub="per visit" trend={6.2} icon={TrendingUp} accent="#10B981" />
        <StatCard label="Total Orders" value="10,710" trend={14.8} icon={Utensils} accent="#3B82F6" />
        <StatCard label="Revenue / Customer" value="€81.40" sub="avg. LTV this year" trend={22.1} icon={Users} accent="#8B5CF6" />
      </div>
      <Card className="p-5">
        <SectionHeader title="Monthly Revenue" subtitle="Jan–Jul 2026" />
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#FF6B35" strokeWidth={2.5} fill="url(#salesGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader title="Orders vs Customers" />
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#475569", fontSize: 11 }} />
              <Bar dataKey="orders" name="Orders" fill="#3B82F6" radius={[3,3,0,0]} opacity={0.8} />
              <Bar dataKey="customers" name="Customers" fill="#FF6B35" radius={[3,3,0,0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Top Items by Revenue" />
          <div className="space-y-3">
            {[
              { name: "Tasting Menu (6 courses)", rev: "€18,240", orders: 152 },
              { name: "Truffle Risotto", rev: "€12,480", orders: 624 },
              { name: "Wagyu Burger", rev: "€8,960", orders: 448 },
              { name: "Salmon Tartare", rev: "€6,720", orders: 480 },
              { name: "Lobster Bisque", rev: "€5,280", orders: 440 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/4 last:border-0">
                <span className="text-slate-600 text-xs w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.name}</p>
                  <p className="text-slate-500 text-xs">{item.orders} orders</p>
                </div>
                <span className="text-white font-semibold text-sm">{item.rev}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReportsMarketing() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Ad Spend" value="€14,840" sub="Jan–Jul" icon={DollarSign} />
        <StatCard label="Attributed Revenue" value="€102.4K" trend={24.2} icon={TrendingUp} accent="#10B981" />
        <StatCard label="Avg. ROAS" value="6.9x" sub="blended" trend={12.8} icon={BarChart3} accent="#3B82F6" />
        <StatCard label="Total Conversions" value="2,840" trend={31.6} icon={Target} accent="#8B5CF6" />
      </div>
      <Card className="p-5">
        <SectionHeader title="Ad Spend vs New Customers" subtitle="Jan–Jul 2026" />
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "#475569", fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#FF6B35" opacity={0.55} radius={[4,4,0,0]} />
            <Line yAxisId="right" dataKey="newCustomers" name="New Customers" stroke="#10B981" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function ReportsRetention() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Retention Rate" value="85%" sub="Jul 2026" trend={3.2} icon={TrendingUp} />
        <StatCard label="Churn Rate" value="15%" sub="Jul 2026" trend={-3.2} icon={TrendingDown} accent="#EF4444" />
        <StatCard label="Avg. Visits/Year" value="18.4" sub="per customer" trend={8.1} icon={Utensils} accent="#10B981" />
        <StatCard label="Re-engaged" value="48" sub="inactive → active" icon={RefreshCw} accent="#F59E0B" />
      </div>
      <Card className="p-5">
        <SectionHeader title="Monthly Retention Rate" subtitle="Jan–Jul 2026" />
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={RETENTION_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="rate" name="Retention %" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 4, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function ReportsCampaigns() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader title="Campaign Performance Summary" subtitle="All campaigns Jan–Jul 2026" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/6">
                {["Campaign", "Platform", "Spend", "Revenue", "ROAS", "Conv.", "CTR", "Status"].map(h => (
                  <th key={h} className="text-left text-xs text-slate-600 pb-3 pr-4 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {CAMPAIGNS_LIST.map(c => (
                <tr key={c.id} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 pr-4 text-sm font-medium text-white">{c.name}</td>
                  <td className="py-3 pr-4"><Badge variant={c.platform === "Meta" ? "info" : "success"}>{c.platform}</Badge></td>
                  <td className="py-3 pr-4 text-sm text-slate-300">€{c.spend.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-sm text-emerald-400 font-medium">€{(c.spend * c.roas).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-sm font-bold text-white">{c.roas}x</td>
                  <td className="py-3 pr-4 text-sm text-slate-300">{c.conversions}</td>
                  <td className="py-3 pr-4 text-sm text-slate-300">{c.ctr}%</td>
                  <td className="py-3 pr-4"><Badge variant={c.status === "Active" ? "success" : "warning"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="ROAS by Campaign" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={CAMPAIGNS_LIST.map(c => ({ name: c.name.split(" ").slice(0, 2).join(" "), roas: c.roas, platform: c.platform }))} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="roas" name="ROAS" fill="#FF6B35" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function ReportsAcquisition() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="New Customers" value="2,840" sub="Jan–Jul 2026" trend={28.4} icon={Users} />
        <StatCard label="Avg. CAC" value="€5.22" sub="cost per acquisition" trend={-12.1} icon={DollarSign} accent="#10B981" />
        <StatCard label="LTV:CAC Ratio" value="15.6×" sub="healthy > 3×" trend={8.4} icon={TrendingUp} accent="#3B82F6" />
        <StatCard label="Payback Period" value="2.4 mo" sub="avg. recovery time" icon={Clock} accent="#F59E0B" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader title="Acquisition by Channel" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ACQUISITION_DATA} cx="50%" cy="50%" outerRadius={85} innerRadius={50} dataKey="value" strokeWidth={0}>
                {ACQUISITION_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#475569", fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <SectionHeader title="New Customers by Month" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="newCustomers" name="New Customers" fill="#FF6B35" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsScreen() {
  const [section, setSection] = useState("profile");
  const sections = [
    { id: "profile", label: "Restaurant Profile", icon: Building2 },
    { id: "users", label: "Users & Team", icon: Users },
    { id: "permissions", label: "Permissions", icon: Shield },
    { id: "meta", label: "Meta Integration", icon: Instagram },
    { id: "google", label: "Google Ads", icon: Chrome },
    { id: "wallet", label: "Wallet Config", icon: CreditCard },
    { id: "brand", label: "Brand Colors", icon: Palette },
    { id: "notifs", label: "Notifications", icon: Bell },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your restaurant and platform settings</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-0.5">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setSection(s.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${section === s.id ? "bg-[#FF6B35]/12 text-[#FF6B35]" : "text-slate-400 hover:text-white hover:bg-white/4"}`}>
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-3">
          {section === "profile" && <SettingsProfile />}
          {section === "users" && <SettingsUsers />}
          {section === "permissions" && <SettingsPermissions />}
          {section === "meta" && <SettingsMeta />}
          {section === "google" && <SettingsGoogle />}
          {section === "wallet" && <SettingsWalletConfig />}
          {section === "brand" && <SettingsBrand />}
          {section === "notifs" && <SettingsNotifs />}
        </div>
      </div>
    </div>
  );
}

function SettingsProfile() {
  return (
    <Card className="p-6">
      <SectionHeader title="Restaurant Profile" subtitle="Update your restaurant information" />
      <div className="space-y-5">
        <div className="flex items-center gap-5 pb-5 border-b border-white/6">
          <div className="w-20 h-20 rounded-2xl bg-[#FF6B35] flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
            <Utensils size={30} className="text-white" />
          </div>
          <div>
            <Btn variant="secondary" size="sm"><Image size={12} /> Change Logo</Btn>
            <p className="text-slate-600 text-xs mt-2">PNG, JPG up to 2MB</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FWInput label="Restaurant Name" defaultValue="Restaurante Lisboa" />
          <FWInput label="Category" defaultValue="Fine Dining · Portuguese" />
        </div>
        <FWInput label="Address" defaultValue="Rua Augusta 124, 1100-048 Lisboa, Portugal" />
        <div className="grid grid-cols-2 gap-4">
          <FWInput label="Phone" defaultValue="+351 213 456 789" />
          <FWInput label="Email" type="email" defaultValue="info@restaurantelisboa.pt" />
        </div>
        <FWInput label="Website" defaultValue="https://restaurantelisboa.pt" />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea className="w-full bg-[#1E293B] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/50 resize-none" rows={3} defaultValue="Award-winning fine dining restaurant in the heart of Lisbon, celebrating authentic Portuguese flavors with modern techniques." />
        </div>
        <Btn variant="primary">Save Changes</Btn>
      </div>
    </Card>
  );
}

function SettingsUsers() {
  const team = [
    { name: "João Silva", email: "joao@restaurantelisboa.pt", role: "Owner", status: "Active" },
    { name: "Maria Santos", email: "maria@restaurantelisboa.pt", role: "Manager", status: "Active" },
    { name: "Carlos Pereira", email: "carlos@restaurantelisboa.pt", role: "Staff", status: "Active" },
    { name: "Ana Lima", email: "ana@restaurantelisboa.pt", role: "Marketing", status: "Invited" },
  ];
  return (
    <Card className="p-6">
      <SectionHeader title="Users & Team" subtitle="Manage team access" action={<Btn variant="primary" size="sm"><Plus size={13} /> Invite User</Btn>} />
      <div className="space-y-3">
        {team.map((m, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white/3 rounded-xl hover:bg-white/5 transition-all">
            <Avatar name={m.name} />
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{m.name}</p>
              <p className="text-slate-500 text-xs">{m.email}</p>
            </div>
            <Badge variant={m.role === "Owner" ? "orange" : "default"}>{m.role}</Badge>
            <Badge variant={m.status === "Active" ? "success" : "warning"}>{m.status}</Badge>
            <button className="text-slate-600 hover:text-white p-1 rounded transition-colors">
              <MoreHorizontal size={15} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SettingsPermissions() {
  const perms = [
    { name: "View Dashboard", owner: true, manager: true, staff: true, marketing: true },
    { name: "Manage Campaigns", owner: true, manager: true, staff: false, marketing: true },
    { name: "Access CRM", owner: true, manager: true, staff: false, marketing: true },
    { name: "Issue Rewards", owner: true, manager: true, staff: true, marketing: false },
    { name: "View Reports", owner: true, manager: true, staff: false, marketing: true },
    { name: "Manage Settings", owner: true, manager: false, staff: false, marketing: false },
    { name: "Export Data", owner: true, manager: true, staff: false, marketing: false },
  ];
  return (
    <Card className="p-6">
      <SectionHeader title="Permissions" subtitle="Role-based access control" />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/6">
              <th className="text-left text-xs text-slate-600 pb-3 pr-8 uppercase tracking-wide">Permission</th>
              {["Owner", "Manager", "Staff", "Marketing"].map(r => (
                <th key={r} className="text-center text-xs text-slate-600 pb-3 px-4 uppercase tracking-wide">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {perms.map((p, i) => (
              <tr key={i} className="hover:bg-white/2 transition-colors">
                <td className="py-3 pr-8 text-sm text-slate-300">{p.name}</td>
                {[p.owner, p.manager, p.staff, p.marketing].map((v, j) => (
                  <td key={j} className="py-3 px-4 text-center">
                    {v
                      ? <CheckCircle size={15} className="text-emerald-400 mx-auto" />
                      : <div className="w-4 h-4 rounded-full border border-white/12 mx-auto" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SettingsMeta() {
  return (
    <Card className="p-6">
      <SectionHeader title="Meta Ads Integration" subtitle="Connect your Meta Business account" />
      <div className="space-y-5">
        <div className="p-4 bg-blue-500/8 border border-blue-500/20 rounded-xl flex items-center gap-3">
          <CheckCircle size={17} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Connected to Meta Business Suite</p>
            <p className="text-slate-400 text-xs">Restaurante Lisboa · Account ID: 123456789</p>
          </div>
          <Btn variant="danger" size="sm">Disconnect</Btn>
        </div>
        <FWInput label="Meta Business Account ID" defaultValue="123456789012345" />
        <FWInput label="Meta Pixel ID" defaultValue="987654321098765" />
        <FWInput label="Access Token" type="password" defaultValue="EAAxxxxxxxxxxxxxxxxxx" />
        <div className="grid grid-cols-2 gap-4">
          <FWInput label="Ad Account ID" defaultValue="act_123456789" />
          <FWInput label="Catalog ID" defaultValue="cat_987654321" />
        </div>
        <div className="p-4 bg-white/3 rounded-xl">
          <p className="text-slate-600 text-xs uppercase tracking-wide mb-3">Synced Data</p>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-white font-bold text-lg">4</p><p className="text-slate-500 text-xs">Campaigns</p></div>
            <div><p className="text-white font-bold text-lg">€1,880</p><p className="text-slate-500 text-xs">Spend (7d)</p></div>
            <div><p className="text-white font-bold text-lg">3 min</p><p className="text-slate-500 text-xs">Last sync</p></div>
          </div>
        </div>
        <Btn variant="primary">Save Integration</Btn>
      </div>
    </Card>
  );
}

function SettingsGoogle() {
  return (
    <Card className="p-6">
      <SectionHeader title="Google Ads Integration" subtitle="Connect your Google Ads account" />
      <div className="space-y-5">
        <div className="p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-xl flex items-center gap-3">
          <CheckCircle size={17} className="text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Connected to Google Ads</p>
            <p className="text-slate-400 text-xs">Restaurante Lisboa · Customer ID: 123-456-7890</p>
          </div>
          <Btn variant="danger" size="sm">Disconnect</Btn>
        </div>
        <FWInput label="Google Ads Customer ID" defaultValue="123-456-7890" />
        <FWInput label="OAuth Client ID" defaultValue="xxxxx.apps.googleusercontent.com" />
        <FWInput label="OAuth Client Secret" type="password" defaultValue="GOCSPX-xxxxxxxxxx" />
        <FWInput label="Conversion Action ID" defaultValue="AW-12345678/AbCdEfGhIj" />
        <div className="p-4 bg-white/3 rounded-xl">
          <p className="text-slate-600 text-xs uppercase tracking-wide mb-3">Synced Data</p>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-white font-bold text-lg">2</p><p className="text-slate-500 text-xs">Campaigns</p></div>
            <div><p className="text-white font-bold text-lg">€1,310</p><p className="text-slate-500 text-xs">Spend (7d)</p></div>
            <div><p className="text-white font-bold text-lg">3 min</p><p className="text-slate-500 text-xs">Last sync</p></div>
          </div>
        </div>
        <Btn variant="primary">Save Integration</Btn>
      </div>
    </Card>
  );
}

function SettingsWalletConfig() {
  return (
    <Card className="p-6">
      <SectionHeader title="Wallet Configuration" subtitle="Configure loyalty card settings" />
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FWInput label="Points per €1 spent" defaultValue="10" />
          <FWInput label="Point value (€)" defaultValue="0.01" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FWInput label="Welcome bonus (pts)" defaultValue="100" />
          <FWInput label="Points expiry (months)" defaultValue="12" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide">Wallet Platforms</label>
          {[
            { name: "Apple Wallet", on: true },
            { name: "Google Wallet", on: true },
            { name: "Huawei Wallet", on: true },
            { name: "SMS Fallback (QR link)", on: true },
          ].map(p => (
            <div key={p.name} className="flex items-center justify-between p-3 hover:bg-white/3 rounded-xl transition-colors">
              <span className="text-white text-sm">{p.name}</span>
              <Toggle enabled={p.on} />
            </div>
          ))}
        </div>
        <Btn variant="primary">Save Wallet Config</Btn>
      </div>
    </Card>
  );
}

function SettingsBrand() {
  const colors = [
    { name: "Primary Accent", value: "#FF6B35", label: "Buttons, highlights, CTAs" },
    { name: "Card Background", value: "#111827", label: "Card surfaces" },
    { name: "Page Background", value: "#0F172A", label: "Main background" },
    { name: "Success Color", value: "#10B981", label: "Positive indicators" },
  ];
  return (
    <Card className="p-6">
      <SectionHeader title="Brand Colors" subtitle="Customize your platform visual identity" />
      <div className="space-y-4">
        {colors.map(c => (
          <div key={c.name} className="flex items-center gap-4 p-4 bg-white/3 rounded-xl hover:bg-white/5 transition-all">
            <div className="w-11 h-11 rounded-xl border border-white/8 flex-shrink-0 shadow-inner" style={{ background: c.value }} />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{c.name}</p>
              <p className="text-slate-500 text-xs">{c.label}</p>
            </div>
            <code className="text-slate-400 text-xs font-mono bg-white/5 px-2 py-1 rounded-lg">{c.value}</code>
            <Btn variant="ghost" size="sm"><Edit size={11} /></Btn>
          </div>
        ))}
        <div className="mt-2">
          <label className="block text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide">Logo Upload</label>
          <div className="border-2 border-dashed border-white/8 rounded-xl p-8 text-center hover:border-white/16 transition-colors cursor-pointer">
            <Image size={22} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Drop your logo here or click to browse</p>
            <p className="text-slate-600 text-xs mt-1">SVG, PNG, JPG · Max 2MB</p>
          </div>
        </div>
        <Btn variant="primary">Save Brand Settings</Btn>
      </div>
    </Card>
  );
}

function SettingsNotifs() {
  const toggles = [
    { label: "New customer registration", desc: "Get notified when a customer joins", on: true },
    { label: "New QR scan", desc: "Alert on every check-in scan", on: false },
    { label: "Campaign performance alerts", desc: "ROAS drops below threshold", on: true },
    { label: "Birthday reminders", desc: "24h before a customer birthday", on: true },
    { label: "Low points expiry warnings", desc: "Customer points nearing expiry", on: true },
    { label: "Weekly report digest", desc: "Summary every Monday at 9:00 AM", on: true },
    { label: "Wallet card added", desc: "When customer adds card to wallet", on: false },
    { label: "At-risk customer alert", desc: "Customer inactive 30+ days", on: true },
  ];
  return (
    <Card className="p-6">
      <SectionHeader title="Notification Preferences" subtitle="Control what you get notified about" />
      <div className="space-y-1">
        {toggles.map((t, i) => (
          <div key={i} className="flex items-center justify-between p-4 hover:bg-white/3 rounded-xl transition-colors">
            <div>
              <p className="text-white text-sm font-medium">{t.label}</p>
              <p className="text-slate-500 text-xs">{t.desc}</p>
            </div>
            <Toggle enabled={t.on} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Marketing",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "notifications", label: "Campaigns", icon: Bell },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "crm", label: "CRM", icon: Users },
      { id: "wallet", label: "Wallet", icon: CreditCard },
    ],
  },
  {
    label: "Insights",
    items: [{ id: "reports", label: "Reports", icon: FileText }],
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

function Sidebar({ current, onChange, onLogout }: { current: string; onChange: (s: string) => void; onLogout?: () => Promise<void> | void }) {
  return (
    <div className="fixed left-0 top-0 h-full w-56 bg-[#111827] border-r border-white/6 flex flex-col z-20">
      <div className="p-5 border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B35] flex items-center justify-center shadow-md">
            <Utensils size={15} className="text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm tracking-tight">FoodWave</span>
            <p className="text-slate-600 text-xs">Rest. Lisboa</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-slate-700 text-xs font-semibold uppercase tracking-widest px-2 mb-1.5">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const active = current === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-left ${active ? "bg-[#FF6B35]/12 text-[#FF6B35] font-medium" : "text-slate-500 hover:text-white hover:bg-white/4"}`}
                  >
                    <Icon size={14} />
                    <span className="flex-1">{item.label}</span>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/6">
        <button
          type="button"
          onClick={() => { void onLogout?.(); }}
          className="flex w-full items-center gap-3 p-2 rounded-xl hover:bg-white/4 cursor-pointer transition-all group text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#e55a24] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            JS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">João Silva</p>
            <p className="text-slate-600 text-xs">Owner · Admin</p>
          </div>
          <LogOut size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </button>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShell({ section, onSectionChange, onLogout }: { section: string; onSectionChange: (s: string) => void; onLogout?: () => Promise<void> | void }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const renderContent = () => {
    if (section === "crm" && selectedCustomerId !== null) {
      return <CRMProfileScreen customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />;
    }
    switch (section) {
      case "dashboard": return <DashboardScreen />;
      case "analytics": return <AnalyticsScreen />;
      case "crm": return <CRMScreen onViewProfile={id => setSelectedCustomerId(id)} />;
      case "wallet": return <WalletScreen />;
      case "notifications": return <NotificationsScreen />;
      case "reports": return <ReportsScreen />;
      case "settings": return <SettingsScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Sidebar current={section} onChange={s => { onSectionChange(s); setSelectedCustomerId(null); }} onLogout={onLogout} />
      <div className="ml-56 p-7 min-h-screen">
        <div className="max-w-[1200px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App({ onLogout }: { onLogout?: () => Promise<void> | void }) {
  const [auth, setAuth] = useState<"login" | "register" | "forgot" | "app">("app");
  const [section, setSection] = useState("dashboard");

  if (auth === "register") return <RegisterScreen onBack={() => setAuth("login")} onLogin={() => setAuth("app")} />;
  if (auth === "forgot") return <ForgotPasswordScreen onBack={() => setAuth("login")} />;
  if (auth === "login") return <LoginScreen onLogin={() => setAuth("app")} onRegister={() => setAuth("register")} onForgot={() => setAuth("forgot")} />;
  return <AppShell section={section} onSectionChange={setSection} onLogout={onLogout} />;
}
