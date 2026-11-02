import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, ArrowDownToLine, ArrowUpFromLine, CalendarCheck, CheckCircle2,
  CircleHelp, Coins, Copy, Gem, History, LogOut, Pickaxe, ShieldCheck,
  Sparkles, Wallet, Zap
} from "lucide-react";
import { isConfigured, supabase } from "./lib/supabase";

type Profile = { full_name: string | null; phone: string | null; role: string };
type WalletRow = { balance: number; currency: string };
type Tx = { id: string; type: string; amount: number; status: string; description: string; created_at: string };

const money = (value: number) => new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(value);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) void loadDashboard();
    else { setProfile(null); setWallet(null); setTransactions([]); }
  }, [session?.user.id]);

  async function loadDashboard() {
    if (!supabase || !session?.user) return;
    const userId = session.user.id;
    const [p, w, t] = await Promise.all([
      supabase.from("profiles").select("full_name,phone,role").eq("id", userId).single(),
      supabase.from("wallets").select("balance,currency").eq("user_id", userId).single(),
      supabase.from("transactions").select("id,type,amount,status,description,created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(8)
    ]);
    if (p.data) setProfile(p.data as Profile);
    if (w.data) setWallet(w.data as WalletRow);
    if (t.data) setTransactions(t.data as Tx[]);
    if (p.error || w.error || t.error) setNotice("Some dashboard information could not load. Check your Supabase setup and database policies.");
  }

  async function handleAuth(event: FormEvent) {
  event.preventDefault();
  if (!supabase) return;

  setBusy(true);
  setNotice("");

  const result = authMode === "signup"
    ? await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim()
          },
          emailRedirectTo: "https://cosmic-pixie-4a4167.netlify.app/"
        }
      })
    : await supabase.auth.signInWithPassword({ email, password });

  setBusy(false);

  if (result.error) {
    setNotice(result.error.message);
  } else if (authMode === "signup" && !result.data.session) {
    setNotice("Account created. Check your email to confirm your address, then sign in.");
  } else {
    setNotice("Welcome to Mine Master.");
  }
  }

  async function claimReward(kind: "mining" | "checkin") {
    if (!session?.access_token) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/.netlify/functions/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kind })
      });
      const result = authMode === "signup"
  ? await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim()
        },
        emailRedirectTo: "https://cosmic-pixie-4a4167.netlify.app/"
      }
    })
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  if (!isConfigured || !supabase) {
    return <SetupScreen />;
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <Brand />
          <p className="eyebrow">YOUR REWARDS START HERE</p>
          <h1>{authMode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="muted">Access your Mine Master rewards dashboard.</p>
          <form onSubmit={handleAuth} className="form">
            {authMode === "signup" && <>
              <label>Full name<input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" /></label>
              <label>Phone number <span className="optional">(optional)</span><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" /></label>
            </>}
            <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            <button className="primary full" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"}</button>
          </form>
          {notice && <p className="notice">{notice}</p>}
          <p className="switch-auth">{authMode === "signup" ? "Already registered?" : "New to Mine Master?"} <button className="text-button" onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setNotice(""); }}>{authMode === "signup" ? "Sign in" : "Create account"}</button></p>
          <p className="fine-print"><ShieldCheck size={14} /> Secure account access powered by Supabase</p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="side-label">WORKSPACE</div>
        <a className="side-link active"><Activity size={18}/> Overview</a>
        <a className="side-link"><Wallet size={18}/> My wallet</a>
        <a className="side-link"><Pickaxe size={18}/> Mining rewards</a>
        <a className="side-link"><History size={18}/> Transactions</a>
        <div className="sidebar-bottom">
          <div className="secure-note"><ShieldCheck size={17}/><span>Account protected<br/><small>Secure session</small></span></div>
          <button className="side-link logout" onClick={signOut}><LogOut size={18}/> Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">MINING & REWARDS</p><h1>Dashboard</h1></div>
          <div className="user-chip"><div className="avatar">{(profile?.full_name || session.user.email || "M").charAt(0).toUpperCase()}</div><span>{profile?.full_name || session.user.email}</span></div>
        </header>

        <section className="welcome-row">
          <div><h2>Hello, {(profile?.full_name || "Miner").split(" ")[0]} <span>👋</span></h2><p className="muted">Here’s your Mine Master account overview.</p></div>
          <div className="status-pill"><span className="pulse"/> Account active</div>
        </section>

        <section className="balance-card">
          <div className="balance-top"><span><Wallet size={17}/> TOTAL REWARD BALANCE</span><span className="live-label">● LIVE ACCOUNT</span></div>
          <div className="balance-value">{money(Number(wallet?.balance || 0))} <small>{wallet?.currency || "MM points"}</small></div>
          <p className="balance-caption">Your accumulated platform reward points</p>
          <div className="balance-actions">
            <button className="light-button" onClick={() => setNotice("Deposits are not enabled in this starter build. A verified payment provider must be connected first.")}><ArrowDownToLine size={17}/> Deposit</button>
            <button className="outline-button" onClick={() => setNotice("Withdrawals are not enabled yet. They require verified payout integration and admin review.")}><ArrowUpFromLine size={17}/> Withdraw</button>
          </div>
          <div className="coin-art"><Gem size={94}/><Sparkles size={22}/></div>
        </section>

        <section className="stats-grid">
          <Stat icon={<Coins/>} label="Wallet balance" value={`${money(Number(wallet?.balance || 0))} pts`} />
          <Stat icon={<Zap/>} label="Daily mining" value="Reward available" />
          <Stat icon={<CalendarCheck/>} label="Daily check-in" value="Once per day" />
        </section>

        <section className="section-heading"><div><p className="eyebrow">EARN REWARDS</p><h2>Daily activities</h2></div><span className="muted small">Rewards are platform points</span></section>
        <section className="activity-grid">
          <div className="activity-card"><div className="activity-icon gold"><Pickaxe/></div><h3>Daily mining reward</h3><p>Claim your configured daily mining points. One claim per UTC day.</p><button className="primary" disabled={busy} onClick={() => claimReward("mining")}> <Pickaxe size={16}/> Claim mining reward</button></div>
          <div className="activity-card"><div className="activity-icon blue"><CalendarCheck/></div><h3>Daily check-in</h3><p>Check in once a day and add your configured points to your balance.</p><button className="secondary" disabled={busy} onClick={() => claimReward("checkin")}><CheckCircle2 size={16}/> Check in today</button></div>
        </section>

        <section className="section-heading"><div><p className="eyebrow">ACCOUNT ACTIVITY</p><h2>Recent transactions</h2></div></section>
        <section className="transactions-card">
          {transactions.length === 0 ? <div className="empty-state"><History size={28}/><p>No transactions yet. Claim a daily reward to see activity here.</p></div> :
            transactions.map(tx => <div className="transaction-row" key={tx.id}><div className="tx-icon"><Coins size={17}/></div><div className="tx-details"><strong>{tx.description}</strong><small>{new Date(tx.created_at).toLocaleString()}</small></div><div className="tx-amount">+{money(Number(tx.amount))} pts<small>{tx.status}</small></div></div>)}
        </section>
        {notice && <div className="notice notice-bottom"><CircleHelp size={17}/>{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
        <footer className="footer">© {new Date().getFullYear()} Mine Master. Rewards are platform points, not a bank deposit.</footer>
      </main>
    </div>
  );
}

function Brand() {
  return <div className="brand"><div className="brand-mark"><Pickaxe size={23}/></div><div><strong>MINE MASTER</strong><small>MINING & REWARDS</small></div></div>;
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></div>;
}
function SetupScreen() {
  return <main className="setup-shell"><div className="setup-card"><Brand/><div className="setup-icon"><Copy size={24}/></div><h1>Connect your project</h1><p>To activate Mine Master, add your Supabase project URL and anon key to a local <code>.env</code> file.</p><ol><li>Create a Supabase project.</li><li>Copy <b>Project URL</b> and <b>anon / publishable key</b>.</li><li>Copy <code>.env.example</code> to <code>.env</code> and fill in those two values.</li><li>Run the SQL in <code>supabase/schema.sql</code>.</li></ol><p className="muted">Never place your Supabase service-role key in frontend code.</p></div></main>;
}
