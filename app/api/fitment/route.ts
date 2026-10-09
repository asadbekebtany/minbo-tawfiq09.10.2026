import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkDatabaseConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ makes: [], models: [], generations: [], engines: [] });
  }

  const { searchParams } = new URL(request.url);
  const makeId = searchParams.get("makeId");
  const modelId = searchParams.get("modelId");
  const generationId = searchParams.get("generationId");

  if (generationId) {
    const engines = await prisma.carEngine.findMany({
      where: { generationId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ engines });
  }

  if (modelId) {
    const generations = await prisma.carGeneration.findMany({
      where: { modelId },
      orderBy: { yearFrom: "desc" },
    });
    return NextResponse.json({ generations });
  }

  if (makeId) {
    const models = await prisma.carModel.findMany({
      where: { makeId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ models });
  }

  const makes = await prisma.carMake.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ makes });
}
