"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--background, #fff)",
          color: "var(--foreground, #09090b)",
          border: "1px solid var(--border, #e4e4e7)",
          fontSize: "14px",
        },
      }}
    />
  );
}
