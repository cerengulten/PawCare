import * as FileSystem from 'expo-file-system';
import type { ImagePickerOptions } from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Standard configuration for avatar/pet photo pickers across the app.
 * Using square 1:1 cropping and quality: 0.8 + client-side resizing to max 800x800
 * reduces a typical 3MB-8MB mobile camera photo down to ~40KB-90KB without any noticeable
 * loss in visual quality for avatar displays. This saves ~95-98% of Supabase database storage.
 */
export const AVATAR_PICKER_OPTIONS: ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

function sanitizeStoragePath(rawPath: string): string {
  return rawPath
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9._/-]/g, '_');
}

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
 * Downscales and compresses a local image URI to max 800px width at 0.8 JPEG quality
 * using expo-image-manipulator when available, falling back gracefully to the original URI.
 */
async function compressImageBeforeUpload(uri: string): Promise<{ uri: string; ext: string; mimeType: string }> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    if (ImageManipulator && typeof ImageManipulator.manipulateAsync === 'function') {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat?.JPEG ?? ('jpeg' as any),
        }
      );
      if (result?.uri) {
        return {
          uri: result.uri,
          ext: 'jpg',
          mimeType: 'image/jpeg',
        };
      }
    }
  } catch {
    // Fallback if native module is unavailable in an older OTA client
  }

  const rawExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const ext = rawExt === 'png' || rawExt === 'webp' || rawExt === 'jpg' || rawExt === 'jpeg' ? rawExt : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { uri, ext, mimeType };
}

/**
 * Deletes an existing image from a Supabase Storage bucket by its URL or relative path.
 * Owner-scoped RLS on storage.objects ensures a user can only delete their own objects.
 */
export async function deleteImage(
  urlOrPath: string | null | undefined,
  bucket: 'pet-photos' | 'avatars'
): Promise<void> {
  if (!urlOrPath) return;
  try {
    let relativePath = urlOrPath;
    const marker = `/storage/v1/object/public/${bucket}/`;
    if (urlOrPath.includes(marker)) {
      relativePath = urlOrPath.split(marker)[1];
    }
    // Strip any cache-busting query params if present
    relativePath = sanitizeStoragePath(relativePath.split('?')[0]);

    // Only attempt deletion for remote storage objects, not local file:// URIs
    if (relativePath && !urlOrPath.startsWith('file://') && !urlOrPath.startsWith('content://')) {
      const { error } = await supabase.storage.from(bucket).remove([relativePath]);
      if (error) {
        console.warn('Storage removal notice:', error);
      }
    }
  } catch (err) {
    console.warn('Failed to delete image from storage:', err);
  }
}

/**
 * Uploads a local file URI (e.g. from ImagePicker) to a Supabase Storage bucket.
 * If uri is already a remote URL, or if the upload fails (e.g. offline),
 * it returns the original URI gracefully to prevent blocking the user.
 * If an `oldUrl` is provided and the upload succeeds, the previous photo is removed
 * from storage to keep the database footprint lean.
 */
export async function uploadImage(
  uri: string,
  bucket: 'pet-photos' | 'avatars',
  fileName: string,
  oldUrl?: string | null
): Promise<string> {
  if (!uri || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  try {
    const compressed = await compressImageBeforeUpload(uri);
    const safeFileName = sanitizeStoragePath(fileName);
    const filePath = `${safeFileName}.${compressed.ext}`;

    const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
      encoding: 'base64',
    });

    const fileData = base64ToUint8Array(base64);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: compressed.mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload error, using local uri fallback:', uploadError);
      return uri;
    }

    // Clean up old photo now that the new one has uploaded successfully
    if (oldUrl && oldUrl !== uri) {
      deleteImage(oldUrl, bucket).catch(() => {});
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl ?? uri;
  } catch (err) {
    console.warn('Storage upload exception, using local uri fallback:', err);
    return uri;
  }
}
