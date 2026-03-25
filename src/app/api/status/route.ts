import { NextResponse } from "next/server";
import type {
  ServiceStatus,
  StatusResponse,
  GitHubRepoStatus,
  NpmPackageStatus,
  VercelProjectStatus,
} from "@/config/services";

export const revalidate = 60;

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function fetchInternal<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/status/${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function deriveOverall(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.some((s) => s === "outage")) return "outage";
  if (statuses.some((s) => s === "degraded")) return "degraded";
  if (statuses.some((s) => s === "maintenance")) return "maintenance";
  return "operational";
}

export async function GET() {
  const [github, npm, vercel] = await Promise.all([
    fetchInternal<GitHubRepoStatus>("github"),
    fetchInternal<NpmPackageStatus>("npm"),
    fetchInternal<VercelProjectStatus>("vercel"),
  ]);

  const allStatuses: ServiceStatus[] = [
    ...github.map((g) => g.status),
    ...npm.map((n) => n.status),
    ...vercel.map((v) => v.status),
  ];

  const response: StatusResponse = {
    overallStatus: deriveOverall(allStatuses),
    lastUpdated: new Date().toISOString(),
    github,
    npm,
    vercel,
  };

  return NextResponse.json(response);
}
