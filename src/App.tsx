
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "./lib/supabase";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  created_at: string;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      void loadDashboard();
    } else {
      setBalance(0);
      setTransactions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  async function loadDashboard() {
    if (!supabase || !session?.user) return;

    const wallet = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (wallet.error) {
      setNotice("Wallet loading error: " + wallet.error.message);
    } else {
      setBalance(Number(wallet.data?.balance ?? 0));
    }

    const history = await supabase
      .from("transactions")
      .select("id, type, amount, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!history.error && history.data) {
      setTransactions(history.data as Transaction[]);
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setNotice("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim()
            },
            emailRedirectTo:
              "https://cosmic-pixie-4a4167.netlify.app/"
          }
        });

        if (error) throw error;

        if (!data.session) {
          setNotice(
            "Account created! Check your email and confirm your account before signing in."
          );
        } else {
          setNotice("Your account has been created successfully.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
        setNotice("You are now signed in.");
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function claimReward(kind: "mining" | "checkin") {
    if (!session?.access_token) return;

    setBusy(true);
    setNotice("");

    try {
      const response = await fetch(
        "/.netlify/functions/claim-reward",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ kind })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Reward could not be claimed."
        );
      }

      setNotice(
        `Success! ${result.amount} points added to your wallet.`
      );

      await loadDashboard();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;

    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);

    setNotice(
      error ? error.message : "You have signed out."
    );
  }

  if (loading) {
    return (
      <main className="loading-screen">
        Loading Mine Master...
      </main>
    );
  }

  if (!isConfigured || !supabase) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">M</div>
          <p className="eyebrow">WELCOME TO</p>
          <h1>MINE MASTER</h1>
          <p className="muted">Your points dashboard</p>
          <div className="notice error">
            Supabase is not configured. Check your Netlify environment variables.
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">M</div>
          <p className="eyebrow">WELCOME TO</p>
          <h1>MINE MASTER</h1>
          <p className="muted">
            Create an account and start collecting platform points.
          </p>

          <div className="auth-tabs">
            <button
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
              type="button"
            >
              Create account
            </button>

            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              Sign in
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {mode === "signup" && (
              <>
                <label>Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />

                <label>Phone number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </>
            )}

            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />

            <button
              className="primary-button"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Please wait..."
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          {notice && <p className="notice">{notice}</p>}

          <p className="fine-print">
            Mine Master points are internal platform rewards.
            They are not cash or guaranteed income.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark small">M</span>
          <span>MINE MASTER</span>
        </div>

        <button
          className="outline-button"
          onClick={signOut}
          disabled={busy}
        >
          Sign out
        </button>
      </header>

      <section className="welcome">
        <p className="eyebrow">YOUR PERSONAL DASHBOARD</p>
        <h1>
          Welcome back
          {session.user.user_metadata?.full_name
            ? `, ${session.user.user_metadata.full_name}`
            : ""}
          .
        </h1>
        <p className="muted">
          Keep track of your Mine Master points and activity.
        </p>
      </section>

      <section className="balance-card">
        <div>
          <p className="balance-label">AVAILABLE POINTS</p>
          <div className="balance-number">
            {balance.toLocaleString()}
          </div>
          <p className="balance-caption">
            Your current platform points balance
          </p>
        </div>

        <div className="coin-art">M</div>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">EARN POINTS</p>
          <h2>Daily activities</h2>
        </div>
      </section>

      <section className="reward-grid">
        <article className="reward-card">
          <div className="reward-icon">⛏</div>
          <h3>Daily mining</h3>
          <p>Claim your daily platform points.</p>
          <button
            className="primary-button"
            onClick={() => claimReward("mining")}
            disabled={busy}
          >
            Claim mining points
          </button>
        </article>

        <article className="reward-card">
          <div className="reward-icon">✓</div>
          <h3>Daily check-in</h3>
          <p>Check in and collect your daily reward.</p>
          <button
            className="secondary-button"
            onClick={() => claimReward("checkin")}
            disabled={busy}
          >
            Claim check-in
          </button>
        </article>
      </section>

      {notice && (
        <p className="notice dashboard-notice">{notice}</p>
      )}

      <section className="history-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENT ACTIVITY</p>
            <h2>Transaction history</h2>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            No transactions yet. Your reward activity will appear here.
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map((item) => (
              <div className="transaction-row" key={item.id}>
                <div>
                  <strong>{item.type}</strong>
                  <span>
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                <strong className="amount">
                  +{Number(item.amount).toLocaleString()} pts
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="footer-note">
        Mine Master · Internal platform points only. Points have no cash value unless the platform separately announces otherwise.
      </footer>
    </main>
  );
}
