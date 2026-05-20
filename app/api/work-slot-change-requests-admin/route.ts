import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdminSession";
import { db } from "@/db";
import { workSlotChangeRequests, workSlots, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";


export const dynamic = "force-dynamic";

// GET /api/work-slot-change-requests-admin - все запросы на изменение
export async function GET(request: Request) {
  const { session, response } = await requireAdminSession("schedule");
  if (response) return response;
  const salonId = session.user.salonId ?? null;
  try {

    // Filter via JOIN to workSlots.salonId when acting as salon admin
    const rows = await db
      .select({
        id: workSlotChangeRequests.id,
        workSlotId: workSlotChangeRequests.workSlotId,
        masterId: workSlotChangeRequests.masterId,
        suggestedWorkDate: workSlotChangeRequests.suggestedWorkDate,
        suggestedStartTime: workSlotChangeRequests.suggestedStartTime,
        suggestedEndTime: workSlotChangeRequests.suggestedEndTime,
        status: workSlotChangeRequests.status,
        type: workSlotChangeRequests.type,
        createdAt: workSlotChangeRequests.createdAt,
        masterName: masters.fullName,
        masterSpecialization: masters.specialization,
        originalWorkDate: workSlots.workDate,
        originalStartTime: workSlots.startTime,
        originalEndTime: workSlots.endTime,
      })
      .from(workSlotChangeRequests)
      .leftJoin(masters, eq(workSlotChangeRequests.masterId, masters.id))
      .innerJoin(workSlots, eq(workSlotChangeRequests.workSlotId, workSlots.id))
      .where(
        salonId
          ? and(eq(workSlotChangeRequests.status, "pending"), eq(workSlots.salonId, salonId))
          : eq(workSlotChangeRequests.status, "pending")
      )
      .orderBy(workSlotChangeRequests.createdAt);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching work slot change requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch work slot change requests" },
      { status: 500 }
    );
  }
}

// PATCH /api/work-slot-change-requests-admin?id=1&action=accept|reject - принять или отклонить запрос
export async function PATCH(request: Request) {
  const { session, response } = await requireAdminSession("schedule");
  if (response) return response;
  const salonId = session.user.salonId ?? null;
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action"); // accept или reject

    if (!id || !action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const requestId = Number(id);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400 }
      );
    }

    // Получаем запрос — verify it belongs to this salon via JOIN
    const requests = await db
      .select({
        id: workSlotChangeRequests.id,
        workSlotId: workSlotChangeRequests.workSlotId,
        suggestedWorkDate: workSlotChangeRequests.suggestedWorkDate,
        suggestedStartTime: workSlotChangeRequests.suggestedStartTime,
        suggestedEndTime: workSlotChangeRequests.suggestedEndTime,
      })
      .from(workSlotChangeRequests)
      .innerJoin(workSlots, eq(workSlotChangeRequests.workSlotId, workSlots.id))
      .where(
        salonId
          ? and(eq(workSlotChangeRequests.id, requestId), eq(workSlots.salonId, salonId))
          : eq(workSlotChangeRequests.id, requestId)
      );

    if (!requests.length) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const changeRequest = requests[0];

    // Обновляем статус запроса
    await db
      .update(workSlotChangeRequests)
      .set({ status: action })
      .where(eq(workSlotChangeRequests.id, requestId));

    if (action === "accept") {
      // Применяем изменения к рабочему слоту (scoped by salonId for safety)
      await db
        .update(workSlots)
        .set({
          workDate: changeRequest.suggestedWorkDate,
          startTime: changeRequest.suggestedStartTime,
          endTime: changeRequest.suggestedEndTime,
          adminUpdateStatus: "accepted",
        })
        .where(
          salonId
            ? and(eq(workSlots.id, changeRequest.workSlotId), eq(workSlots.salonId, salonId))
            : eq(workSlots.id, changeRequest.workSlotId)
        );

      console.log("Change request accepted and applied to work slot");
    } else {
      // Отклоняем запрос, возвращаем статус слота в normal
      await db
        .update(workSlots)
        .set({ adminUpdateStatus: "rejected" })
        .where(
          salonId
            ? and(eq(workSlots.id, changeRequest.workSlotId), eq(workSlots.salonId, salonId))
            : eq(workSlots.id, changeRequest.workSlotId)
        );

      console.log("Change request rejected");
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Error updating work slot change request:", error);
    return NextResponse.json(
      { error: "Failed to update work slot change request" },
      { status: 500 }
    );
  }
}
