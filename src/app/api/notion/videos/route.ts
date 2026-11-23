import { NextResponse } from "next/server";
import { getNotionVideos } from "@/lib/notion-videos";

export async function GET() {
  try {
    const data = await getNotionVideos();

    return NextResponse.json({
      success: true,
      total: data.length,
      results: data,
    });
  } catch (error) {
    console.error("Erro ao consultar vídeos:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro ao consultar os vídeos.",
      },
      { status: 500 }
    );
  }
}