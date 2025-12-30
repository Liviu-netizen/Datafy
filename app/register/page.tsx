import Link from "next/link";
import { register } from "./actions";

export const runtime = "nodejs";

type RegisterPageProps = {
  searchParams?: Promise<{ error?: string | string[] }> | { error?: string | string[] };
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await Promise.resolve(searchParams);
  const errorValue = Array.isArray(params?.error) ? params?.error[0] : params?.error;

  return (
    <div className="mimo-shell">
      <div className="mimo-card float-in">
        <span className="mimo-pill">Start learning</span>
        <h1 className="mimo-title">Create your account</h1>
        <p className="mimo-subtitle">
          Build your streak and hit day 84 with confidence.
        </p>

        {errorValue ? (
          <div className="mimo-alert">{errorValue}</div>
        ) : null}

        <form action={register} className="mt-6 space-y-5">
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
              autoComplete="new-password"
              required
              placeholder="Create a password"
            />
            <p className="text-xs text-slate-500">At least 6 characters.</p>
          </div>
          <button className="mimo-button soft-glow" type="submit">
            Start day 1
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="mimo-link" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
