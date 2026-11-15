import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChatLoader } from "@/components/chat/chat-loader";
import { getCurrentUser } from "@/lib/server/auth";

async function AuthenticatedChat() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ChatLoader user={user} />;
}

export default function HomePage() {
  return (
    <main>
      {/* The session is read per request, so it streams in behind a boundary. */}
      <Suspense fallback={null}>
        <AuthenticatedChat />
      </Suspense>
    </main>
  );
}
