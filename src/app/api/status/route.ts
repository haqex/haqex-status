import { NextResponse } from "next/server";
import { services, type ServiceWithStatus, type ServiceStatus } from "@/config/services";

export const revalidate = 60; // revalidate every 60 seconds

async function checkService(service: (typeof services)[number]): Promise<ServiceWithStatus> {
  const start = Date.now();
  let status: ServiceStatus = "operational";
  let responseTime: number | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(service.url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    responseTime = Date.now() - start;

    if (res.status >= 500) {
      status = "outage";
    } else if (res.status >= 400) {
      status = "degraded";
    } else if (responseTime > 3000) {
      status = "degraded";
    }
  } catch {
    status = "outage";
    responseTime = null;
  }

  return {
    ...service,
    status,
    responseTime,
    lastChecked: new Date().toISOString(),
  };
}

export async function GET() {
  const results = await Promise.all(services.map(checkService));

  const allOperational = results.every((s) => s.status === "operational");
  const hasOutage = results.some((s) => s.status === "outage");

  let overallStatus: ServiceStatus = "operational";
  if (hasOutage) overallStatus = "outage";
  else if (!allOperational) overallStatus = "degraded";

  return NextResponse.json({
    overallStatus,
    services: results,
    lastUpdated: new Date().toISOString(),
  });
}
