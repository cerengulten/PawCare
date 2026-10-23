import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = globalThis.atob
    ? globalThis.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uploads a local file URI (e.g. from ImagePicker) to a Supabase Storage bucket.
 * If uri is already a remote URL, or if the upload fails (e.g. offline),
 * it returns the original URI gracefully to prevent blocking the user.
 */
export async function uploadImage(
  uri: string,
  bucket: 'pet-photos' | 'avatars',
  fileName: string
): Promise<string> {
  if (!uri || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  try {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const filePath = `${fileName}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const fileData = base64ToUint8Array(base64);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload error, using local uri fallback:', uploadError);
      return uri;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl ?? uri;
  } catch (err) {
    console.warn('Storage upload exception, using local uri fallback:', err);
    return uri;
  }
}
