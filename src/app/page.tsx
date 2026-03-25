"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  ServiceStatus,
  StatusResponse,
  GitHubRepoStatus,
  NpmPackageStatus,
  VercelProjectStatus,
} from "@/config/services";

// ── Status helpers ──────────────────────────────────────────────

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
    label: "In Progress",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
};

const overallMessages: Record<ServiceStatus, string> = {
  operational: "All systems operational",
  degraded: "Some systems experiencing issues",
  outage: "System outage detected",
  maintenance: "Builds in progress",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Components ──────────────────────────────────────────────────

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

function StatusBadge({ status }: { status: ServiceStatus }) {
  const config = statusConfig[status];
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 ${config.bg}`}>
      <span className="relative flex h-2 w-2">
        {status === "operational" && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${config.dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`} />
      </span>
      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-white/30">
      {children}
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] px-5 py-4 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] ${className}`}>
      {children}
    </div>
  );
}

function GitHubCard({ repo }: { repo: GitHubRepoStatus }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-zinc-400 dark:text-white/30" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <a
              href={`https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-800 dark:text-white/90 hover:underline truncate"
            >
              {repo.fullName}
            </a>
          </div>
          <span className="text-xs text-zinc-400 dark:text-white/40">{repo.description}</span>
          <div className="flex items-center gap-3 mt-1.5">
            {repo.lastWorkflow && (
              <a
                href={repo.lastWorkflow.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs hover:underline ${
                  repo.lastWorkflow.conclusion === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : repo.lastWorkflow.conclusion === "failure"
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-400 dark:text-white/40"
                }`}
              >
                {repo.lastWorkflow.name}: {repo.lastWorkflow.conclusion ?? repo.lastWorkflow.status}
              </a>
            )}
            {repo.openIssues > 0 && (
              <span className="text-xs text-zinc-400 dark:text-white/40">
                {repo.openIssues} issue{repo.openIssues !== 1 ? "s" : ""}
              </span>
            )}
            {repo.lastPush && (
              <span className="text-xs text-zinc-300 dark:text-white/20">
                pushed {timeAgo(repo.lastPush)}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-4">
          <StatusBadge status={repo.status} />
        </div>
      </div>
    </Card>
  );
}

function NpmCard({ pkg }: { pkg: NpmPackageStatus }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 256 256">
              <rect fill="currentColor" width="256" height="256" rx="0" />
              <path d="M48 48h160v160h-32V80h-48v128H48z" fill="white" />
            </svg>
            <a
              href={pkg.npmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-800 dark:text-white/90 hover:underline truncate"
            >
              {pkg.name}
            </a>
            <span className="rounded bg-zinc-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-xs font-mono text-zinc-500 dark:text-white/50">
              v{pkg.version}
            </span>
          </div>
          <span className="text-xs text-zinc-400 dark:text-white/40">{pkg.description}</span>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-zinc-400 dark:text-white/40">
              {pkg.weeklyDownloads.toLocaleString()} downloads/week
            </span>
            {pkg.lastPublished && (
              <span className="text-xs text-zinc-300 dark:text-white/20">
                published {timeAgo(pkg.lastPublished)}
              </span>
            )}
            {pkg.license && (
              <span className="text-xs text-zinc-300 dark:text-white/20">{pkg.license}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-4">
          <StatusBadge status={pkg.status} />
        </div>
      </div>
    </Card>
  );
}

function VercelCard({ project }: { project: VercelProjectStatus }) {
  const primaryDomain = project.domains.find((d) => !d.includes("vercel.app")) ?? project.domains[0];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-zinc-800 dark:text-white/80" viewBox="0 0 76 65" fill="currentColor">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
            <span className="text-sm font-medium text-zinc-800 dark:text-white/90 truncate">
              {project.name}
            </span>
            {primaryDomain && (
              <a
                href={`https://${primaryDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 dark:text-white/40 hover:underline truncate"
              >
                {primaryDomain}
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {project.lastDeployment && (
              <>
                <span className={`text-xs ${
                  project.lastDeployment.state === "READY"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : project.lastDeployment.state === "ERROR"
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-400 dark:text-white/40"
                }`}>
                  {project.lastDeployment.state.toLowerCase()}
                </span>
                <span className="text-xs text-zinc-300 dark:text-white/20">
                  {timeAgo(project.lastDeployment.createdAt)}
                </span>
                <span className="text-xs text-zinc-300 dark:text-white/20">
                  via {project.lastDeployment.source}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-4">
          <StatusBadge status={project.status} />
        </div>
      </div>
    </Card>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] animate-pulse rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]"
        />
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const json = await res.json();
      setData(json);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

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

        {/* Overall banner */}
        {loading ? (
          <div className="mb-10 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-200 dark:bg-white/20" />
              <span className="text-sm text-zinc-400 dark:text-white/40">Checking systems...</span>
            </div>
          </div>
        ) : data ? (
          <div className={`mb-10 rounded-xl border p-6 ${statusConfig[data.overallStatus].bg}`}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                {data.overallStatus === "operational" && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${statusConfig[data.overallStatus].dot}`} />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusConfig[data.overallStatus].dot}`} />
              </span>
              <span className={`text-sm font-medium ${statusConfig[data.overallStatus].color}`}>
                {overallMessages[data.overallStatus]}
              </span>
            </div>
          </div>
        ) : null}

        {/* Sections */}
        <div className="space-y-10">
          {/* GitHub Repositories */}
          <section>
            <SectionHeader>GitHub Repositories</SectionHeader>
            {loading ? (
              <SkeletonCards count={4} />
            ) : (
              <div className="space-y-2">
                {data?.github.map((repo) => (
                  <GitHubCard key={repo.fullName} repo={repo} />
                ))}
                {data?.github.length === 0 && (
                  <p className="text-sm text-zinc-400 dark:text-white/30">No repositories configured</p>
                )}
              </div>
            )}
          </section>

          {/* npm Packages */}
          <section>
            <SectionHeader>npm Packages</SectionHeader>
            {loading ? (
              <SkeletonCards count={1} />
            ) : (
              <div className="space-y-2">
                {data?.npm.map((pkg) => (
                  <NpmCard key={pkg.name} pkg={pkg} />
                ))}
                {data?.npm.length === 0 && (
                  <p className="text-sm text-zinc-400 dark:text-white/30">No packages configured</p>
                )}
              </div>
            )}
          </section>

          {/* Vercel Deployments */}
          <section>
            <SectionHeader>Vercel Deployments</SectionHeader>
            {loading ? (
              <SkeletonCards count={3} />
            ) : (
              <div className="space-y-2">
                {data?.vercel.map((project) => (
                  <VercelCard key={project.name} project={project} />
                ))}
                {data?.vercel.length === 0 && (
                  <p className="text-sm text-zinc-400 dark:text-white/30">No projects configured</p>
                )}
              </div>
            )}
          </section>
        </div>

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
