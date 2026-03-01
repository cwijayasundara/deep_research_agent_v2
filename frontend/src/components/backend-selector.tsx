"use client";

import { useBackend } from "@/hooks/use-backend";
import type { Backend } from "@/lib/backend";

interface BackendSelectorProps {
  onSwitch?: (backend: Backend) => void;
}

export default function BackendSelector({ onSwitch }: BackendSelectorProps) {
  const { backend, switchBackend } = useBackend();

  function handleSelect(b: Backend) {
    if (b === backend) return;
    switchBackend(b);
    if (onSwitch) {
      onSwitch(b);
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="flex items-center rounded-lg bg-white/5 border border-white/10 p-0.5">
      <button
        onClick={() => handleSelect("rust")}
        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
          backend === "rust"
            ? "bg-[#ff6b35]/20 text-[#ff6b35] border border-[#ff6b35]/40"
            : "text-gray-400 hover:text-gray-200 border border-transparent"
        }`}
      >
        Rust
      </button>
      <button
        onClick={() => handleSelect("python")}
        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
          backend === "python"
            ? "bg-[#3572A5]/20 text-[#3572A5] border border-[#3572A5]/40"
            : "text-gray-400 hover:text-gray-200 border border-transparent"
        }`}
      >
        Python
      </button>
    </div>
  );
}
