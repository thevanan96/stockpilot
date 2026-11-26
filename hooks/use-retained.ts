"use client";

import { useState } from "react";

/**
 * Keeps showing the last value while an overlay animates closed, so dialogs
 * and drawers don't flash empty content on exit.
 */
export function useRetained<T>(open: boolean, value: T): T {
  const [kept, setKept] = useState(value);
  if (open && value !== kept) setKept(value);
  return open ? value : kept;
}
