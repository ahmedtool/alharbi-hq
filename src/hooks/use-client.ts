
"use client";

import { useState, useEffect } from 'react';

/**
 * A simple hook that returns true only after the component has mounted on the client.
 * This is useful for deferring the rendering of client-side-only components
 * to prevent hydration mismatches.
 */
export default function useClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
