"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="ai-sign-out-button"
      onClick={() => void signOut({ redirectTo: "/" })}
    >
      {label}
    </button>
  );
}
