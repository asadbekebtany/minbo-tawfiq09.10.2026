import { NextRequest, NextResponse } from "next/server";
import { GET as catalogGet, POST } from "@/app/api/products/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.searchParams.set("mine", "true");
  return catalogGet(new NextRequest(url, request));
}

export { POST };
