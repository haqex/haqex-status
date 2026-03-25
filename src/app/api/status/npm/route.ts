import { NextResponse } from "next/server";
import {
  npmPackages,
  type NpmPackageStatus,
  type ServiceStatus,
} from "@/config/services";

export const revalidate = 300;

async function checkPackage(
  pkg: (typeof npmPackages)[number]
): Promise<NpmPackageStatus> {
  let status: ServiceStatus = "operational";
  let version = "unknown";
  let lastPublished = "";
  let weeklyDownloads = 0;
  let license = "";

  const encodedName = encodeURIComponent(pkg.name);

  try {
    const [registryRes, downloadsRes] = await Promise.all([
      fetch(`https://registry.npmjs.org/${encodedName}`),
      fetch(`https://api.npmjs.org/downloads/point/last-week/${encodedName}`),
    ]);

    if (registryRes.ok) {
      const data = await registryRes.json();
      const latest = data["dist-tags"]?.latest;
      version = latest ?? "unknown";
      license = data.license ?? data.versions?.[latest]?.license ?? "";

      const time = data.time?.[latest];
      if (time) {
        lastPublished = time;
        // If not published in 90+ days, mark as degraded (stale)
        const daysSince = (Date.now() - new Date(time).getTime()) / 86400000;
        if (daysSince > 90) {
          status = "degraded";
        }
      }
    } else {
      status = "outage";
    }

    if (downloadsRes.ok) {
      const dlData = await downloadsRes.json();
      weeklyDownloads = dlData.downloads ?? 0;
    }
  } catch {
    status = "outage";
  }

  return {
    ...pkg,
    status,
    version,
    lastPublished,
    weeklyDownloads,
    license,
    npmUrl: `https://www.npmjs.com/package/${pkg.name}`,
  };
}

export async function GET() {
  const results = await Promise.all(npmPackages.map(checkPackage));

  return NextResponse.json(results);
}
