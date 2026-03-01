"use client";

import { useEffect, useState } from "react";
import {
  Backend,
  getSelectedBackend,
  setSelectedBackend,
} from "@/lib/backend";

export function useBackend() {
  // Start with the server-safe default ("rust") to avoid hydration mismatch,
  // then sync with localStorage after mount.
  const [backend, setBackend] = useState<Backend>("rust");

  useEffect(() => {
    setBackend(getSelectedBackend());
  }, []);

  function switchBackend(b: Backend) {
    setSelectedBackend(b);
    setBackend(b);
  }

  return { backend, switchBackend } as const;
}
