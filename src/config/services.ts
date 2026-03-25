export type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

// --- GitHub ---
export interface GitHubRepo {
  name: string;
  fullName: string; // e.g. "haqex/claude"
  description: string;
}

export interface GitHubRepoStatus extends GitHubRepo {
  status: ServiceStatus;
  lastWorkflow: {
    name: string;
    conclusion: string | null; // "success" | "failure" | "cancelled" | null
    status: string; // "completed" | "in_progress" | "queued"
    createdAt: string;
    url: string;
  } | null;
  openIssues: number;
  lastPush: string;
}

// --- npm ---
export interface NpmPackage {
  name: string; // e.g. "@haqex/claude"
  description: string;
}

export interface NpmPackageStatus extends NpmPackage {
  status: ServiceStatus;
  version: string;
  lastPublished: string;
  weeklyDownloads: number;
  license: string;
  npmUrl: string;
}

// --- Vercel ---
export interface VercelProject {
  name: string;
  projectId?: string; // optional, looked up dynamically
}

export interface VercelProjectStatus extends VercelProject {
  status: ServiceStatus;
  url: string | null;
  lastDeployment: {
    state: string; // "READY" | "ERROR" | "BUILDING" | "QUEUED" | "CANCELED"
    createdAt: string;
    url: string;
    source: string; // "git" | "cli" etc
  } | null;
  domains: string[];
}

// --- Unified ---
export interface StatusResponse {
  overallStatus: ServiceStatus;
  lastUpdated: string;
  github: GitHubRepoStatus[];
  npm: NpmPackageStatus[];
  vercel: VercelProjectStatus[];
}

// ==================== Configuration ====================

export const GITHUB_ORG = "haqex";

export const githubRepos: GitHubRepo[] = [
  {
    name: "claude",
    fullName: "haqex/claude",
    description: "Drop-in Claude Code bundles for AI skills",
  },
  {
    name: "media-enhancer",
    fullName: "haqex/media-enhancer",
    description: "Media processing and enhancement tools",
  },
  {
    name: "pixora",
    fullName: "haqex/pixora",
    description: "Image processing service",
  },
  {
    name: "obsidian",
    fullName: "haqex/obsidian",
    description: "Obsidian plugin ecosystem",
  },
  {
    name: "changelog",
    fullName: "haqex/changelog",
    description: "Automated changelog generation",
  },
  {
    name: "templates",
    fullName: "haqex/templates",
    description: "Project starter templates",
  },
];

export const npmPackages: NpmPackage[] = [
  {
    name: "@haqex/claude",
    description: "Drop-in Claude Code bundles — production-grade AI skills",
  },
];

export const vercelProjects: VercelProject[] = [
  { name: "haqex-status" },
  { name: "haqex-dev" },
  { name: "aymanhaque-portfolio" },
  { name: "modest-ellis" },
];
