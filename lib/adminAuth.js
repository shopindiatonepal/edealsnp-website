import { cookies } from "next/headers";

const COOKIE_NAME = "edeals_admin";

// Simple, honest auth for a one-owner store: the cookie value is checked
// against ADMIN_PASSWORD on every mutating request. It's httpOnly so client
// JS can't read it, and it's only ever set after a correct password.
// If you want proper multi-admin accounts later, swap this for Supabase Auth.
export function isAdminRequest() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && session === process.env.ADMIN_PASSWORD);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
