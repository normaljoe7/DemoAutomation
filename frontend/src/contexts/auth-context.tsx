"use client";

import React, { createContext, useContext, useCallback } from "react";

// ── AUTH DISABLED ─────────────────────────────────────────────────────────────
// All auth checks are bypassed. A mock admin user is provided to every hook
// so role-conditional UI renders at full access. Re-enable by restoring login
// logic and removing the mock user.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: number;
    email: string;
    role: string;
    name: string | null;
}

const MOCK_USER: AuthUser = {
    id: 1,
    email: "admin@company.com",
    role: "admin",
    name: "Admin",
};

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    getHeaders: (includeContentType?: boolean) => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const getHeaders = useCallback((includeContentType = true): Record<string, string> => {
        return includeContentType ? { "Content-Type": "application/json" } : {};
    }, []);

    const login = useCallback(async (_email: string, _password: string) => {
        // No-op while auth is disabled
    }, []);

    const logout = useCallback(() => {
        // No-op while auth is disabled
    }, []);

    return (
        <AuthContext.Provider value={{
            user: MOCK_USER,
            token: null,
            loading: false,
            login,
            logout,
            getHeaders,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
