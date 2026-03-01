"use client";

import LoginForm from "@/components/login-form";
import BackendSelector from "@/components/backend-selector";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101622]">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#0d59f2]/20 mb-4">
            <svg className="w-7 h-7 text-[#0d59f2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
            Global AI Viral Intelligence Tracker{" "}
            <span className="text-[#0d59f2]">v4.0</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Enter your credentials to access the dashboard
          </p>
        </div>
        <div className="flex justify-center mb-6">
          <BackendSelector onSwitch={() => {}} />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
