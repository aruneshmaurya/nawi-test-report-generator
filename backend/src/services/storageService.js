import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabaseClient.js';

export const BUCKETS = {
  ATTACHMENTS: 'attachments',
  REPORTS: 'reports',
};

/**
 * Ensure Supabase Storage buckets exist and are configured as public
 */
export const ensureBuckets = async () => {
  if (!supabase) return;

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.warn('[STORAGE WARN] Could not list storage buckets:', error.message);
      return;
    }

    const existingNames = (buckets || []).map((b) => b.name);

    for (const bucketName of [BUCKETS.ATTACHMENTS, BUCKETS.REPORTS]) {
      if (!existingNames.includes(bucketName)) {
        const { error: createErr } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 25 * 1024 * 1024, // 25MB
        });
        if (createErr) {
          console.warn(`[STORAGE WARN] Could not create bucket "${bucketName}":`, createErr.message);
        } else {
          console.log(`[STORAGE] Created public bucket: "${bucketName}"`);
        }
      }
    }
  } catch (err) {
    console.warn('[STORAGE WARN] Bucket verification failed:', err.message);
  }
};

/**
 * Upload a file buffer to Supabase Storage (with fallback to local disk)
 * 
 * @param {string} bucket - Target bucket name ('attachments' | 'reports')
 * @param {string} filePath - Target storage path (e.g. 'sessions/123/photo.jpg' or 'reports/RPT-2026-0001.pdf')
 * @param {Buffer} buffer - File buffer content
 * @param {string} contentType - MIME type (e.g. 'application/pdf', 'image/jpeg')
 * @returns {Promise<{ publicUrl: string, storageType: 'supabase' | 'local' }>}
 */
export const uploadBuffer = async (bucket, filePath, buffer, contentType = 'application/octet-stream') => {
  // Clean file path (no leading slashes)
  const cleanPath = filePath.replace(/^\/+/, '');

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(cleanPath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.warn(`[SUPABASE STORAGE] Upload error for ${cleanPath}, attempting fallback:`, error.message);
      } else {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
        if (urlData?.publicUrl) {
          return {
            publicUrl: urlData.publicUrl,
            storageType: 'supabase',
          };
        }
      }
    } catch (err) {
      console.warn(`[SUPABASE STORAGE] Exception during upload to ${bucket}:`, err.message);
    }
  }

  // Local Disk Fallback
  const uploadBase = process.env.UPLOAD_DIR || './uploads';
  const localDest = path.resolve(uploadBase, bucket, cleanPath);
  const destDir = path.dirname(localDest);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.writeFileSync(localDest, buffer);
  return {
    publicUrl: `/uploads/${bucket}/${cleanPath}`,
    storageType: 'local',
  };
};

/**
 * Delete a file from storage by bucket and relative path
 * 
 * @param {string} bucket - Bucket name
 * @param {string} filePathOrUrl - Path or URL of file
 */
export const deleteFile = async (bucket, filePathOrUrl) => {
  if (!filePathOrUrl) return;

  if (supabase && filePathOrUrl.startsWith('http')) {
    try {
      // Extract path after bucket name in public URL
      const parts = filePathOrUrl.split(`/storage/v1/object/public/${bucket}/`);
      if (parts.length > 1) {
        const relativePath = decodeURIComponent(parts[1]);
        await supabase.storage.from(bucket).remove([relativePath]);
        return;
      }
    } catch (err) {
      console.warn('[STORAGE WARN] Could not delete file from Supabase storage:', err.message);
    }
  }

  // Local fallback cleanup
  if (filePathOrUrl.startsWith('/uploads/')) {
    const relativePath = filePathOrUrl.replace(/^\/uploads\//, '');
    const uploadBase = process.env.UPLOAD_DIR || './uploads';
    const localFile = path.resolve(uploadBase, relativePath);
    if (fs.existsSync(localFile)) {
      try {
        fs.unlinkSync(localFile);
      } catch {}
    }
  }
};

export default {
  BUCKETS,
  ensureBuckets,
  uploadBuffer,
  deleteFile,
};
