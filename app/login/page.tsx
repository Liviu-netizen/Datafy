import Link from "next/link";
import { login } from "./actions";

export const runtime = "nodejs";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string | string[] }> | { error?: string | string[] };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await Promise.resolve(searchParams);
  const errorValue = Array.isArray(params?.error) ? params?.error[0] : params?.error;

  return (
    <div className="mimo-shell">
      <div className="mimo-card float-in">
        <span className="mimo-pill">Welcome back</span>
        <h1 className="mimo-title">Log in to continue</h1>
        <p className="mimo-subtitle">
          Pick up where you left off in your learning streak.
        </p>

        {errorValue ? (
          <div className="mimo-alert">{errorValue}</div>
        ) : null}

        <form action={login} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              className="mimo-input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              className="mimo-input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Your password"
            />
          </div>
          <button className="mimo-button soft-glow" type="submit">
            Continue
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          No account yet?{" "}
          <Link className="mimo-link" href="/register">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
