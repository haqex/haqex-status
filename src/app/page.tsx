"use client";

import { useEffect, useState, useCallback } from "react";
import type { ServiceWithStatus, ServiceStatus } from "@/config/services";

interface StatusData {
  overallStatus: ServiceStatus;
  services: ServiceWithStatus[];
  lastUpdated: string;
}

const statusConfig: Record<
  ServiceStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  operational: {
    label: "Operational",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  degraded: {
    label: "Degraded",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
    dot: "bg-yellow-500 dark:bg-yellow-400",
  },
  outage: {
    label: "Outage",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-400/10 border-red-400/20",
    dot: "bg-red-500 dark:bg-red-400",
  },
  maintenance: {
    label: "Maintenance",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
};

const overallMessages: Record<ServiceStatus, string> = {
  operational: "All systems operational",
  degraded: "Some systems experiencing issues",
  outage: "System outage detected",
  maintenance: "Scheduled maintenance in progress",
};

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-black/[0.08] dark:border-white/[0.08] p-2 text-zinc-500 dark:text-white/40 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-zinc-700 dark:hover:text-white/60"
      aria-label="Toggle theme"
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function StatusDot({ status, pulse }: { status: ServiceStatus; pulse?: boolean }) {
  const config = statusConfig[status];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && status === "operational" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${config.dot}`}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dot}`} />
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceWithStatus }) {
  const config = statusConfig[service.status];
  return (
    <div className="flex items-center justify-between rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] px-5 py-4 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-zinc-800 dark:text-white/90">{service.name}</span>
        <span className="text-xs text-zinc-400 dark:text-white/40">{service.description}</span>
      </div>
      <div className="flex items-center gap-3">
        {service.responseTime !== null && (
          <span className="text-xs tabular-nums text-zinc-300 dark:text-white/30">
            {service.responseTime}ms
          </span>
        )}
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1 ${config.bg}`}>
          <StatusDot status={service.status} />
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const json = await res.json();
      setData(json);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const groups = data
    ? data.services.reduce<Record<string, ServiceWithStatus[]>>((acc, s) => {
        (acc[s.group] ??= []).push(s);
        return acc;
      }, {})
    : {};

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-white transition-colors">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-white/90">
            haqex
            <span className="ml-1 text-zinc-300 dark:text-white/30 font-normal">status</span>
          </h1>
          <ThemeToggle />
        </div>

        {/* Overall status banner */}
        {loading ? (
          <div className="mb-10 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-200 dark:bg-white/20" />
              <span className="text-sm text-zinc-400 dark:text-white/40">Checking systems...</span>
            </div>
          </div>
        ) : data ? (
          <div
            className={`mb-10 rounded-xl border p-6 ${statusConfig[data.overallStatus].bg}`}
          >
            <div className="flex items-center gap-3">
              <StatusDot status={data.overallStatus} pulse />
              <span className={`text-sm font-medium ${statusConfig[data.overallStatus].color}`}>
                {overallMessages[data.overallStatus]}
              </span>
            </div>
          </div>
        ) : null}

        {/* Service groups */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([group, groupServices]) => (
              <div key={group}>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-300 dark:text-white/30">
                  {group}
                </h2>
                <div className="space-y-2">
                  {groupServices.map((service) => (
                    <ServiceCard key={service.name} service={service} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] pt-6">
          <span className="text-xs text-zinc-300 dark:text-white/20">
            &copy; {new Date().getFullYear()} Haqex LLC
          </span>
          {data && (
            <span className="text-xs text-zinc-300 dark:text-white/20">
              Last checked{" "}
              {new Date(data.lastUpdated).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
