import { NextResponse } from "next/server";
import { checkAllVercel } from "@/lib/checks";

export const revalidate = 120;

export async function GET() {
  const results = await checkAllVercel();
  return NextResponse.json(results);
}
