import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignInButton } from "@/components/auth/sign-in-button";
import { getCurrentUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Anmelden – KI-Chat" };

function errorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "AccessDenied") return "Dieses GitHub-Konto ist für diese App nicht freigeschaltet.";
  return "Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.";
}

async function LoginCard({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  if (await getCurrentUser()) redirect("/");

  const { error } = await searchParams;
  const message = errorMessage(typeof error === "string" ? error : undefined);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">KI-Chat</h1>
      <p className="mt-1 mb-6 text-muted">Melde dich an, um den Chat zu nutzen.</p>
      {message ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {message}
        </p>
      ) : null}
      <SignInButton />
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Suspense fallback={null}>
        <LoginCard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
