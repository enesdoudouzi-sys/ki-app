"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignInButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("github", { callbackUrl: "/" });
      }}
      className="h-11 w-full rounded-xl bg-accent px-4 font-medium text-accent-foreground disabled:opacity-60"
    >
      {pending ? "Weiterleitung …" : "Mit GitHub anmelden"}
    </button>
  );
}
