import { NextResponse } from "next/server";

// force-static keeps this route compatible with "output: export" (Android APK build)
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}