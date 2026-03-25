import { NextResponse } from "next/server";
import type { ServiceStatus, StatusResponse } from "@/config/services";
import { checkAllGitHub, checkAllNpm, checkAllVercel } from "@/lib/checks";

export const revalidate = 60;

function deriveOverall(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.some((s) => s === "outage")) return "outage";
  if (statuses.some((s) => s === "degraded")) return "degraded";
  if (statuses.some((s) => s === "maintenance")) return "maintenance";
  return "operational";
}

export async function GET() {
  const [github, npm, vercel] = await Promise.all([
    checkAllGitHub(),
    checkAllNpm(),
    checkAllVercel(),
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
