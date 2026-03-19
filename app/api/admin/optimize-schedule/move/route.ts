import { NextResponse } from "next/server";
import { db } from "@/db";
import { optimizationMoves } from "@/db/schema";
import { eq } from "drizzle-orm";


export const dynamic = "force-dynamic";

// PATCH — admin edits a move's proposed times
export async function PATCH(request: Request) {
  try {

    const body = await request.json();
    const { moveId, newStartTime, newEndTime } = body;

    if (!moveId || !newStartTime || !newEndTime) {
      return NextResponse.json(
        { error: "moveId, newStartTime, and newEndTime are required" },
        { status: 400 }
      );
    }

    // Validate move exists
    const [move] = await db
      .select()
      .from(optimizationMoves)
      .where(eq(optimizationMoves.id, moveId));

    if (!move) {
      return NextResponse.json(
        { error: "Move not found" },
        { status: 404 }
      );
    }

    // Only allow editing pending moves
    if (move.clientResponse !== "pending") {
      return NextResponse.json(
        { error: "Can only edit moves with pending client response" },
        { status: 400 }
      );
    }

    // Update the move
    const [updated] = await db
      .update(optimizationMoves)
      .set({ newStartTime, newEndTime })
      .where(eq(optimizationMoves.id, moveId))
      .returning();

    return NextResponse.json({ move: updated });
  } catch (error) {
    console.error("optimize-schedule/move PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
