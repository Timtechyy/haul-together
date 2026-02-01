import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedApiKey: string | null = null;
let fetchPromise: Promise<string> | null = null;

export function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string | null>(cachedApiKey);
  const [loading, setLoading] = useState(!cachedApiKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedApiKey) {
      setApiKey(cachedApiKey);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = supabase.functions
        .invoke("get-google-maps-key")
        .then(({ data, error }) => {
          if (error) throw error;
          cachedApiKey = data.apiKey;
          return data.apiKey;
        });
    }

    fetchPromise
      .then((key) => {
        setApiKey(key);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { apiKey, loading, error };
}
