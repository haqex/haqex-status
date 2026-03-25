import { NextResponse } from "next/server";
import {
  vercelProjects,
  type VercelProjectStatus,
  type ServiceStatus,
} from "@/config/services";

export const revalidate = 120;

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function fetchVercel(path: string) {
  if (!VERCEL_TOKEN) return null;
  const separator = path.includes("?") ? "&" : "?";
  const teamParam = VERCEL_TEAM_ID ? `${separator}teamId=${VERCEL_TEAM_ID}` : "";
  const res = await fetch(`https://api.vercel.com${path}${teamParam}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function checkProject(
  project: (typeof vercelProjects)[number]
): Promise<VercelProjectStatus> {
  let status: ServiceStatus = "operational";

  // Get project details
  const projectData = await fetchVercel(`/v9/projects/${project.name}`);
  if (!projectData) {
    return {
      ...project,
      status: "outage",
      url: null,
      lastDeployment: null,
      domains: [],
    };
  }

  // Get latest production deployment
  const deploymentsData = await fetchVercel(
    `/v6/deployments?projectId=${projectData.id}&target=production&limit=1`
  );

  let lastDeployment: VercelProjectStatus["lastDeployment"] = null;

  if (deploymentsData?.deployments?.length > 0) {
    const d = deploymentsData.deployments[0];
    lastDeployment = {
      state: d.state ?? d.readyState ?? "UNKNOWN",
      createdAt: new Date(d.created).toISOString(),
      url: `https://${d.url}`,
      source: d.source ?? "unknown",
    };

    const state = (d.state ?? d.readyState ?? "").toUpperCase();
    if (state === "ERROR") {
      status = "outage";
    } else if (state === "BUILDING" || state === "QUEUED" || state === "INITIALIZING") {
      status = "maintenance";
    } else if (state === "CANCELED") {
      status = "degraded";
    }
  }

  // Get domains
  const domainsData = await fetchVercel(
    `/v9/projects/${projectData.id}/domains`
  );
  const domains: string[] =
    domainsData?.domains?.map((d: { name: string }) => d.name) ?? [];

  return {
    ...project,
    status,
    url: projectData.targets?.production?.url
      ? `https://${projectData.targets.production.url}`
      : null,
    lastDeployment,
    domains,
  };
}

export async function GET() {
  const results = await Promise.all(vercelProjects.map(checkProject));

  return NextResponse.json(results);
}
