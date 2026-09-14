import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

// Handles product/variant photo, site-asset (logo/hero/QR/contact), and
// customer payment-screenshot uploads.
export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("file");
  const bucket = formData.get("bucket") || "product-images";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!["product-images", "payment-proofs", "site-assets"].includes(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }
  // Only the payment-proof bucket (checkout screenshots) accepts public
  // uploads; product photos and site assets (logo/hero/QR) can only be
  // changed by the admin.
  if (bucket !== "payment-proofs" && !isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type || "image/jpeg" });

  if (uploadError) {
    // Supabase's own error for a missing bucket is a generic "Bucket not
    // found" — surface it as a specific, actionable message instead of a
    // vague upload failure, since this is the most common real cause.
    const isMissingBucket = /bucket not found/i.test(uploadError.message);
    const message = isMissingBucket
      ? `The "${bucket}" storage bucket doesn't exist yet in this Supabase project. Go to Supabase → Storage → New bucket, create one named exactly "${bucket}", and set it to Public.`
      : uploadError.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // A bucket that exists but isn't marked Public won't error on upload —
  // the image link it returns will just silently fail to load afterward.
  // Catch that here so it surfaces immediately instead of as a mystery
  // broken image later.
  const { data: bucketInfo } = await supabaseAdmin.storage.getBucket(bucket);
  if (bucketInfo && !bucketInfo.public) {
    return NextResponse.json({
      error: `The upload worked, but the "${bucket}" bucket is set to Private, so the image link won't load on your site. Go to Supabase → Storage → ${bucket} → bucket settings, and turn on Public.`,
    }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
