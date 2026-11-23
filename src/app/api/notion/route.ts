import { NextResponse } from "next/server";
import { getNotionData } from "@/lib/getNotionData";

export async function GET() {
  try {
    const data = await getNotionData();

    return NextResponse.json({
      success: true,
      total: data.length,
      results: data,
    });
  } catch (error) {
    console.error("Erro ao consultar Notion:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível consultar o Notion.",
      },
      { status: 500 }
    );
  }
}
