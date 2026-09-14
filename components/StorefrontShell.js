"use client";
import Header from "./Header";
import CartDrawer from "./CartDrawer";

export default function StorefrontShell({ children }) {
  return (
    <>
      <Header />
      {children}
      <CartDrawer />
    </>
  );
}
