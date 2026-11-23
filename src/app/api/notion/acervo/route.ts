import { NextResponse } from "next/server";
import { getNotionAcervo } from "@/lib/notion-acervo";

export async function GET() {
  try {
    const data = await getNotionAcervo();

    return NextResponse.json({
      success: true,
      total: data.length,
      results: data,
    });
  } catch (error) {
    console.error("Erro ao consultar acervo:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro ao consultar o acervo.",
      },
      { status: 500 }
    );
  }
}