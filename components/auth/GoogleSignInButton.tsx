"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export function GoogleSignInButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="auth-google-button"
      onClick={() => void signIn("google", { redirectTo: "/ai-chats" })}
    >
      <LogIn size={17} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
