"use client";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import BackendSelector from "./backend-selector";

export default function NavBar() {
  const { logout } = useAuth();

  return (
    <nav className="w-full border-b border-[#2a3a55] bg-[#0d1420]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0d59f2] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                Global AI Viral Intelligence Tracker
              </h1>
              <span className="text-[10px] text-gray-500 font-mono">
                v4.0 / DEEP RESEARCH ENGINE
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 ml-6">
            <StatusIndicator
              label="Deep Research Engine"
              color="#00f2ff"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <BackendSelector />
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Online
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function StatusIndicator({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span className="text-[11px] font-medium text-gray-300">{label}</span>
    </div>
  );
}
