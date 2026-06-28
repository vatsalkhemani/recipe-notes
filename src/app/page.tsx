"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { SignInScreen } from "@/components/sign-in-screen";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </main>
    );
  }

  return user ? <AppShell /> : <SignInScreen />;
}
