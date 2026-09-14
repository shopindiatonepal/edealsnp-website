import { supabaseAdmin } from "./supabaseAdmin";

// Every status change gets its own row here — this table is append-only by
// convention (nothing in the app ever updates or deletes a row from it), so
// the full timeline is always reconstructable.
export async function logStatusChange({ orderId, status, note, courierName, trackingNumber, trackingUrl, createdBy }) {
  await supabaseAdmin.from("order_status_history").insert({
    order_id: orderId,
    status,
    note: note || null,
    courier_name: courierName || null,
    tracking_number: trackingNumber || null,
    tracking_url: trackingUrl || null,
    created_by: createdBy,
  });
}
