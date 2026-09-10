"use client";

/**
 * AuthContext — the demo's entry point.
 *
 * Authentication itself stays mocked (this is a hackathon demo, not an IdP),
 * but every session now carries a real BlockLedger identity: a `did:blkl:sol`
 * DID, a Solana address, a `Role` and the permission set that role implies.
 * Those are what the contract layer authorises against.
 *
 * ── DEMO CREDENTIALS (password is `password123` for all) ──────────────────
 *   admin@blockledger.io     ADMIN    Dr. Ananya Rao        BEL Corporate Office
 *   manager@blockledger.io   MANAGER  Vikram Iyer           BEL Bengaluru Complex
 *   auditor@blockledger.io   AUDITOR  R. Krishnamurthy      BEL Internal Audit
 *   user@blockledger.io      USER     Sandeep Nair          BEL Machilipatnam Unit
 *   priya@blockledger.io     MANAGER  Priya Deshmukh        BEL Ghaziabad Unit
 * ──────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ROLE_DESCRIPTIONS,
  hasPermission,
  permissionsFor,
} from "@/lib/contracts/AccessControl";
import { addressFromDid, didFromAddress } from "@/lib/blockchain/did";
import { toBase58Like, unsafeShortId } from "@/lib/blockchain/crypto";
import { SEED_DIDS } from "@/lib/blockchain/seed";
import type { Address, Did, Permission, Role } from "@/lib/blockchain/types";

export const AUTH_STORAGE_KEY = "blockledger.auth.user";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan?: "free" | "pro" | "enterprise";
  /** BlockLedger identity — the subject of every contract call. */
  did: Did;
  address: Address;
  role: Role;
  permissions: Permission[];
  organization: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  /** Convenience guard for conditionally rendering UI affordances. */
  can: (permission: Permission) => boolean;
  /** Switch the demo persona without logging out — handy on stage. */
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface MockUser extends User {
  password: string;
}

function mockUser(
  id: string,
  name: string,
  email: string,
  did: Did,
  role: Role,
  organization: string,
  plan: User["plan"]
): MockUser {
  return {
    id,
    name,
    email,
    password: "password123",
    avatar: "/placeholder-user.jpg",
    plan,
    did,
    address: addressFromDid(did),
    role,
    permissions: permissionsFor(role),
    organization,
  };
}

/** One account per role, all bound to seeded identities in `lib/blockchain/seed`. */
const MOCK_USERS: MockUser[] = [
  mockUser(
    "1",
    "Dr. Ananya Rao",
    "admin@blockledger.io",
    SEED_DIDS.admin,
    "ADMIN",
    "BEL Corporate Office, Bengaluru",
    "enterprise"
  ),
  mockUser(
    "2",
    "Vikram Iyer",
    "manager@blockledger.io",
    SEED_DIDS.managerBlr,
    "MANAGER",
    "BEL Bengaluru Complex",
    "pro"
  ),
  mockUser(
    "3",
    "R. Krishnamurthy",
    "auditor@blockledger.io",
    SEED_DIDS.auditor,
    "AUDITOR",
    "BEL Internal Audit & Compliance",
    "pro"
  ),
  mockUser(
    "4",
    "Sandeep Nair",
    "user@blockledger.io",
    SEED_DIDS.engineer,
    "USER",
    "BEL Machilipatnam Unit",
    "free"
  ),
  mockUser(
    "5",
    "Priya Deshmukh",
    "priya@blockledger.io",
    SEED_DIDS.managerGzb,
    "MANAGER",
    "BEL Ghaziabad Unit",
    "pro"
  ),
];

/** Public list for the login screen's "sign in as…" shortcuts. */
export const DEMO_ACCOUNTS = MOCK_USERS.map((u) => ({
  email: u.email,
  password: u.password,
  name: u.name,
  role: u.role,
  organization: u.organization,
  description: ROLE_DESCRIPTIONS[u.role],
}));

/**
 * Deterministic pseudo-address for accounts created via signup.
 * Display-only: it is not a key pair and cannot sign anything.
 */
function derivedAddress(email: string): Address {
  const seed = `${unsafeShortId(email)}${unsafeShortId(`blkl:${email}`)}`;
  return toBase58Like(seed.repeat(6), 44);
}

function withPermissions(user: User): User {
  return { ...user, permissions: permissionsFor(user.role) };
}

function isStoredUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const u = value as Partial<User>;
  return (
    typeof u.id === "string" &&
    typeof u.email === "string" &&
    typeof u.did === "string" &&
    typeof u.role === "string"
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isStoredUser(parsed)) {
          // Re-derive permissions so a matrix change takes effect on reload.
          setUser(withPermissions(parsed));
        } else {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setIsLoading(false);
  }, []);

  const persist = (next: User | null) => {
    setUser(next);
    if (typeof window === "undefined") return;
    try {
      if (next) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to persist auth session:", error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const found = MOCK_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password
    );

    if (found) {
      const { password: _password, ...rest } = found;
      persist(withPermissions(rest));
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const signup = async (
    name: string,
    email: string,
    _password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (MOCK_USERS.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setIsLoading(false);
      return false;
    }

    const address = derivedAddress(email);
    const newUser: User = withPermissions({
      id: Date.now().toString(),
      name,
      email,
      avatar: "/placeholder-user.jpg",
      plan: "free",
      did: didFromAddress(address),
      address,
      role: "USER",
      permissions: [],
      organization: "Unaffiliated",
    });

    persist(newUser);
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    persist(null);
    router.push("/");
  };

  const switchRole = (role: Role) => {
    if (!user) return;
    persist(withPermissions({ ...user, role }));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    can: (permission: Permission) =>
      user ? hasPermission(user.role, permission) : false,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * When set, an authenticated user lacking this permission sees an explicit
   * "access denied" panel rather than a redirect — RBAC has to be *visible*
   * for the demo to make its point.
   */
  requiredPermission?: Permission;
  className?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  className,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return (
      <div
        className={cn(
          "flex min-h-[60vh] items-center justify-center p-6",
          className
        )}
      >
        <Card className="w-full max-w-lg border-destructive/40">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="size-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg">Access denied</CardTitle>
                <CardDescription>
                  Blocked by the AccessControl contract
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="text-muted-foreground">
              Your role{" "}
              <Badge variant="outline" className="mx-1 font-mono">
                {user.role}
              </Badge>{" "}
              lacks the permission{" "}
              <Badge variant="outline" className="mx-1 font-mono">
                {requiredPermission}
              </Badge>
              , so this view cannot be rendered.
            </div>
            <p className="rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
              AccessControl: account {user.address.slice(0, 6)}…
              {user.address.slice(-4)} with role {user.role}_ROLE is missing
              permission {requiredPermission}
            </p>
            <p className="text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[user.role]}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
