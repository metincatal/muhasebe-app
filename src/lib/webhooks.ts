import { createHmac } from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function dispatchWebhook(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
) {
  try {
    const supabase = await createClient();

    const { data: hooks } = await supabase
      .from("webhooks")
      .select("id, url, secret, failure_count")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .contains("events", [event]);

    if (!hooks || hooks.length === 0) return;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      organization_id: organizationId,
      data: payload,
    });

    await Promise.allSettled(
      hooks.map(async (hook) => {
        const signature = createHmac("sha256", hook.secret)
          .update(body)
          .digest("hex");

        try {
          const res = await fetch(hook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Muhasebe-Signature": `sha256=${signature}`,
              "X-Muhasebe-Event": event,
            },
            body,
            signal: AbortSignal.timeout(10_000),
          });

          if (res.ok) {
            await supabase
              .from("webhooks")
              .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
              .eq("id", hook.id);
          } else {
            await supabase
              .from("webhooks")
              .update({ failure_count: hook.failure_count + 1 })
              .eq("id", hook.id);
          }
        } catch {
          await supabase
            .from("webhooks")
            .update({ failure_count: hook.failure_count + 1 })
            .eq("id", hook.id);
        }
      })
    );
  } catch {
    // Webhook hatası ana işlemi engellemesin
  }
}
