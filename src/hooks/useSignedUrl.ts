import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSignedUrl = (bucket: string, path: string | null | undefined) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error:', err);
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [bucket, path]);

  return { signedUrl, loading };
};

// Helper to extract file path from full URL or return path as-is
export const extractFilePath = (urlOrPath: string | null | undefined): string | null => {
  if (!urlOrPath) return null;
  
  // If it's already just a path (no http), return as-is
  if (!urlOrPath.startsWith('http')) return urlOrPath;
  
  // Extract path from full Supabase storage URL
  const match = urlOrPath.match(/\/storage\/v1\/object\/public\/bookingReceipts\/(.+)$/);
  return match ? match[1] : null;
};
