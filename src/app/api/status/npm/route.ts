import { NextResponse } from "next/server";
import { checkAllNpm } from "@/lib/checks";

export const revalidate = 300;

export async function GET() {
  const results = await checkAllNpm();
  return NextResponse.json(results);
}
