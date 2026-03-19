export interface BookingState {
  step: "category" | "service" | "master" | "date" | "time" | "confirm";
  categoryName?: string;
  serviceId?: number;
  serviceName?: string;
  serviceDuration?: number;
  servicePrice?: string;
  masterId?: number;
  masterName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  // For reschedule — old appointment to cancel after confirm
  rescheduleFromId?: number;
}

export const bookingStates = new Map<string, BookingState>();
