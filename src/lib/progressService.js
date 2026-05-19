import { supabase } from "./supabase";

// ── Weight logs ───────────────────────────────────────────────────────────────

export async function fetchWeightLogs(userId) {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("id, log_date, weight_kg, notes, created_at")
    .eq("user_id", userId)
    .order("log_date", { ascending: true });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    date: row.log_date,
    weightKg: parseFloat(row.weight_kg),
    notes: row.notes || "",
    createdAt: row.created_at,
  }));
}

export async function saveWeightLog(userId, date, weightKg, notes = "") {
  const { error } = await supabase
    .from("weight_logs")
    .upsert({
      user_id: userId,
      log_date: date,
      weight_kg: weightKg,
      notes,
    }, { onConflict: "user_id,log_date" });

  if (error) throw error;
}

export async function deleteWeightLog(logId) {
  const { error } = await supabase
    .from("weight_logs")
    .delete()
    .eq("id", logId);

  if (error) throw error;
}

// ── Progress photos ───────────────────────────────────────────────────────────

const BUCKET = "progress-photos";

export async function fetchProgressPhotos(userId) {
  const { data, error } = await supabase
    .from("progress_photos")
    .select("id, photo_date, storage_path, caption, created_at")
    .eq("user_id", userId)
    .order("photo_date", { ascending: false });

  if (error) throw error;

  const photos = await Promise.all((data || []).map(async row => {
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 3600);
    return {
      id: row.id,
      date: row.photo_date,
      storagePath: row.storage_path,
      caption: row.caption || "",
      url: urlData?.signedUrl || null,
      createdAt: row.created_at,
    };
  }));

  return photos;
}

export async function uploadProgressPhoto(userId, date, file, caption = "") {
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${userId}/${date}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase
    .from("progress_photos")
    .insert({
      user_id: userId,
      photo_date: date,
      storage_path: storagePath,
      caption,
    });

  if (insertError) {
    // Roll back storage upload on metadata failure
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }
}

export async function deleteProgressPhoto(photoId, storagePath) {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (storageError) throw storageError;

  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", photoId);

  if (error) throw error;
}
