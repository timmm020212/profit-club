/**
 * Schedule Optimization Algorithm — Profit Club Beauty Salon
 *
 * Compacts appointments within a master's shift by closing large idle gaps
 * (>60 min), allowing masters to work in 1–2 continuous blocks rather than
 * sitting idle throughout the day.
 */

export interface AppointmentInput {
  id: number;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  duration: number;  // minutes
}

export interface Move {
  appointmentId: number;
  oldStartTime: string;
  oldEndTime: string;
  newStartTime: string;
  newEndTime: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60)
    .toString()
    .padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

/**
 * Compute a list of moves that would compact the given appointments so that
 * large idle gaps are eliminated while preserving appointment order.
 *
 * Rules:
 *  - Appointments are processed in chronological order (sorted by startTime).
 *  - A "cursor" tracks the earliest available slot, starting at shiftStart.
 *  - If the gap between the cursor and an appointment's startTime exceeds
 *    60 minutes, the appointment is moved to the cursor position.
 *  - Gaps ≤ 60 min (short breaks, transit time, etc.) are left untouched.
 *  - Appointments that begin within 2 hours of the current wall-clock time
 *    are never moved (too close to act on safely).
 *  - Moves that would push any part of an appointment outside the shift
 *    boundaries are skipped.
 *  - A Move entry is only emitted when the proposed time actually differs
 *    from the original time.
 */
export function computeOptimization(
  appointments: AppointmentInput[],
  shiftStart: string, // HH:MM
  shiftEnd: string,   // HH:MM
): Move[] {
  const moves: Move[] = [];

  if (appointments.length === 0) return moves;

  // Work in minutes-since-midnight throughout.
  const shiftStartMin = timeToMinutes(shiftStart);
  const shiftEndMin = timeToMinutes(shiftEnd);

  // Current time in minutes-since-midnight (used for the 2-hour freeze window).
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const freezeUntil = nowMin + 120; // appointments starting before this are frozen

  // Sort by original startTime (ascending) — do not mutate the caller's array.
  const sorted = [...appointments].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  // Cursor: the earliest minute at which the next appointment may be placed.
  let cursor = shiftStartMin;

  for (const appt of sorted) {
    const originalStart = timeToMinutes(appt.startTime);
    const originalEnd = timeToMinutes(appt.endTime);

    // --- Guard: too close to current time — never move ---
    if (originalStart <= freezeUntil) {
      // Advance cursor past this appointment so subsequent ones are placed
      // correctly relative to it.
      cursor = Math.max(cursor, originalEnd);
      continue;
    }

    const gap = originalStart - cursor;

    if (gap > 60) {
      // Large gap: attempt to move the appointment to the cursor position.
      const newStart = cursor;
      const newEnd = cursor + appt.duration;

      // --- Guard: new slot must fit inside the shift ---
      if (newStart < shiftStartMin || newEnd > shiftEndMin) {
        // Can't safely place it here; keep original position.
        cursor = Math.max(cursor, originalEnd);
        continue;
      }

      // Only emit a move if the time actually changes.
      if (newStart !== originalStart) {
        moves.push({
          appointmentId: appt.id,
          oldStartTime: appt.startTime,
          oldEndTime: appt.endTime,
          newStartTime: minutesToTime(newStart),
          newEndTime: minutesToTime(newEnd),
        });
      }

      cursor = newEnd;
    } else {
      // Small gap (≤60 min): keep appointment in place.
      cursor = Math.max(cursor, originalEnd);
    }
  }

  return moves;
}
