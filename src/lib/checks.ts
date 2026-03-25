import {
  githubRepos,
  npmPackages,
  vercelProjects,
  type GitHubRepoStatus,
  type NpmPackageStatus,
  type VercelProjectStatus,
  type ServiceStatus,
} from "@/config/services";

// ── GitHub ──────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchGitHub(path: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com${path}`, {
    headers,
    next: { revalidate: 120 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function checkRepo(
  repo: (typeof githubRepos)[number]
): Promise<GitHubRepoStatus> {
  const [repoData, runsData] = await Promise.all([
    fetchGitHub(`/repos/${repo.fullName}`),
    fetchGitHub(`/repos/${repo.fullName}/actions/runs?per_page=1`),
  ]);

  let status: ServiceStatus = "operational";
  let lastWorkflow: GitHubRepoStatus["lastWorkflow"] = null;

  if (runsData?.workflow_runs?.length > 0) {
    const run = runsData.workflow_runs[0];
    lastWorkflow = {
      name: run.name,
      conclusion: run.conclusion,
      status: run.status,
      createdAt: run.created_at,
      url: run.html_url,
    };

    if (run.status !== "completed") {
      status = "maintenance";
    } else if (
      run.conclusion === "failure" ||
      run.conclusion === "cancelled"
    ) {
      status = "degraded";
    }
  }

  if (!repoData) {
    status = "outage";
  }

  return {
    ...repo,
    status,
    lastWorkflow,
    openIssues: repoData?.open_issues_count ?? 0,
    lastPush: repoData?.pushed_at ?? "",
  };
}

export async function checkAllGitHub(): Promise<GitHubRepoStatus[]> {
  return Promise.all(githubRepos.map(checkRepo));
}

// ── npm ─────────────────────────────────────────────────────────

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
      fetch(`https://registry.npmjs.org/${encodedName}`, {
        next: { revalidate: 300 },
      }),
      fetch(
        `https://api.npmjs.org/downloads/point/last-week/${encodedName}`,
        { next: { revalidate: 300 } }
      ),
    ]);

    if (registryRes.ok) {
      const data = await registryRes.json();
      const latest = data["dist-tags"]?.latest;
      version = latest ?? "unknown";
      license = data.license ?? data.versions?.[latest]?.license ?? "";

      const time = data.time?.[latest];
      if (time) {
        lastPublished = time;
        const daysSince =
          (Date.now() - new Date(time).getTime()) / 86400000;
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

export async function checkAllNpm(): Promise<NpmPackageStatus[]> {
  return Promise.all(npmPackages.map(checkPackage));
}

// ── Vercel ──────────────────────────────────────────────────────

const HAQEX_VERCEL_TOKEN = process.env.HAQEX_VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function fetchVercel(path: string) {
  if (!HAQEX_VERCEL_TOKEN) return null;
  const separator = path.includes("?") ? "&" : "?";
  const teamParam = VERCEL_TEAM_ID
    ? `${separator}teamId=${VERCEL_TEAM_ID}`
    : "";
  const res = await fetch(`https://api.vercel.com${path}${teamParam}`, {
    headers: { Authorization: `Bearer ${HAQEX_VERCEL_TOKEN}` },
    next: { revalidate: 120 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function checkProject(
  project: (typeof vercelProjects)[number]
): Promise<VercelProjectStatus> {
  let status: ServiceStatus = "operational";

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
    } else if (
      state === "BUILDING" ||
      state === "QUEUED" ||
      state === "INITIALIZING"
    ) {
      status = "maintenance";
    } else if (state === "CANCELED") {
      status = "degraded";
    }
  }

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

export async function checkAllVercel(): Promise<VercelProjectStatus[]> {
  return Promise.all(vercelProjects.map(checkProject));
}
