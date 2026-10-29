import { z } from "zod";
import { callFriFunction } from "@/lib/supabase/functions";

const statusSchema = z.object({
  configured: z.boolean(),
  sender: z.string().nullable(),
  testRecipient: z.string().email().nullable(),
});
export type EmailStatus = z.infer<typeof statusSchema>;

export async function getEmailStatus() {
  return statusSchema.parse(await callFriFunction({ action: "email-status" }, true));
}
export async function sendTestEmail() {
  return z.object({ success: z.literal(true), recipient: z.string().email() })
    .parse(await callFriFunction({ action: "email-test" }, true));
}
