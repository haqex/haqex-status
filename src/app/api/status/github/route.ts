import { NextResponse } from "next/server";
import {
  githubRepos,
  type GitHubRepoStatus,
  type ServiceStatus,
} from "@/config/services";

export const revalidate = 120;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchGitHub(path: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function checkRepo(repo: (typeof githubRepos)[number]): Promise<GitHubRepoStatus> {
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
      status = "maintenance"; // build in progress
    } else if (run.conclusion === "failure") {
      status = "degraded";
    } else if (run.conclusion === "cancelled") {
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

export async function GET() {
  const results = await Promise.all(githubRepos.map(checkRepo));

  return NextResponse.json(results);
}
