import { z } from "zod";
import { callFriFunction } from "@/lib/supabase/functions";

const connectionSchema = z.object({
  google_email: z.string().email(),
  connected_at: z.string(),
}).nullable();
const slotSchema = z.object({
  connected: z.boolean(),
  slots: z.array(z.string()),
  timeZone: z.string().optional(),
});
const agendaSchema = z.object({
  connection: connectionSchema,
  appointments: z.array(z.object({
    id: z.string(),
    request_id: z.string(),
    request_code: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    client_name: z.string(),
    vehicle: z.string(),
    status: z.enum(["pending", "confirmed"]),
  })),
});

export type AgendaData = z.infer<typeof agendaSchema>;
export async function getCalendarSlots(day: string) {
  return slotSchema.parse(await callFriFunction({ action: "calendar-slots", day }));
}
export async function bookCalendarSlot(id: string, token: string, startsAt: string) {
  return z.object({ success: z.literal(true), startsAt: z.string(), endsAt: z.string() })
    .parse(await callFriFunction({ action: "calendar-book", id, token, startsAt }));
}
export async function getCalendarAgenda() {
  return agendaSchema.parse(await callFriFunction({ action: "calendar-agenda" }, true));
}
export async function getCalendarConnection() {
  return z.object({ connection: connectionSchema })
    .parse(await callFriFunction({ action: "calendar-status" }, true)).connection;
}
export async function getGoogleConnectUrl() {
  return z.object({ url: z.string().url() })
    .parse(await callFriFunction({ action: "calendar-connect" }, true)).url;
}
