import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "API работает!",
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      items: [1, 2, 3, 4, 5]
    }
  });
}
