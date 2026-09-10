"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS, useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@blockledger.io");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [personaBusy, setPersonaBusy] = useState<string | null>(null);
  const { login, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const attempt = async (nextEmail: string, nextPassword: string) => {
    setError("");
    try {
      const success = await login(nextEmail, nextPassword);
      if (success) {
        router.push("/dashboard");
        return true;
      }
      setError(
        "Invalid email or password. Try admin@blockledger.io with password123"
      );
      return false;
    } catch {
      setError("Sign-in failed. Please try again.");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attempt(email, password);
  };

  const signInAs = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setPersonaBusy(account.email);
    setEmail(account.email);
    setPassword(account.password);
    await attempt(account.email, account.password);
    setPersonaBusy(null);
  };

  // One shortcut per distinct role — role switching is central to the demo.
  const personas = DEMO_ACCOUNTS.filter(
    (a, i, all) => all.findIndex((x) => x.role === a.role) === i
  );

  const roleAccent: Record<string, string> = {
    ADMIN: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    MANAGER: "text-sky-300 border-sky-500/30 bg-sky-500/10",
    AUDITOR: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    USER: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10",
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0b0e] p-4">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-blue-600/30 via-blue-500/20 to-transparent blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-40 -bottom-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-cyan-500/25 via-blue-400/15 to-transparent blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -60, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <Link
        href="/"
        className="group absolute top-6 left-6 z-20 flex items-center gap-2 text-zinc-400 transition-all duration-300 hover:text-blue-400"
      >
        <svg
          className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span className="text-sm font-medium">Back to Home</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-blue-600/20 opacity-60 blur-xl" />

          <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-8 shadow-2xl backdrop-blur-2xl">
            {/* Header */}
            <div className="relative mb-8 text-center">
              <Link href="/" className="mb-6 inline-block">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 opacity-60 blur-lg" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
                    <span className="text-lg font-bold tracking-tight text-white">
                      BL
                    </span>
                  </div>
                </div>
              </Link>

              <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
                Sign in to BlockLedger
              </h1>
              <p className="text-sm text-zinc-400">
                Decentralized identity, smart-contract access control and an
                immutable audit trail.
              </p>
            </div>

            {/* Persona picker */}
            <div className="relative mb-8">
              <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Sign in as…
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {personas.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void signInAs(account)}
                    className="group flex flex-col gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.07] disabled:opacity-50"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">
                        {account.name}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          roleAccent[account.role] ?? roleAccent.USER
                        }`}
                      >
                        {account.role}
                      </span>
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {account.organization}
                    </span>
                    <span className="line-clamp-2 text-[11px] text-zinc-500/80">
                      {account.description}
                    </span>
                    {personaBusy === account.email ? (
                      <span className="text-[11px] text-blue-400">
                        Signing in…
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0f1116] px-4 text-zinc-500">
                  or sign in with credentials
                </span>
              </div>
            </div>

            {/* Credentials form */}
            <form onSubmit={handleSubmit} className="relative space-y-5">
              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 backdrop-blur-sm">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-zinc-300"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@blockledger.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-white/[0.08] bg-white/[0.05] px-4 text-white placeholder:text-zinc-500 focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-300"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-white/[0.08] bg-white/[0.05] px-4 text-white placeholder:text-zinc-500 focus:border-blue-500/50"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400"
              >
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="relative mt-6 text-center">
              <p className="text-sm text-zinc-400">
                Need an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
                >
                  Request access
                </Link>
              </p>
              <p className="mt-3 text-[11px] text-zinc-600">
                Demo build · every persona shares the password{" "}
                <span className="font-mono">password123</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
