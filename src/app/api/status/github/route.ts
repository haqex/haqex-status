import { NextResponse } from "next/server";
import { checkAllGitHub } from "@/lib/checks";

export const revalidate = 120;

export async function GET() {
  const results = await checkAllGitHub();
  return NextResponse.json(results);
}
