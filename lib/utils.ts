export { cn } from "cn";

/**
 * Keeps a modal drawer open when the user interacts with a toast, so toast
 * actions (e.g. "View stock") run instead of being swallowed as an outside click.
 */
export function ignoreToastInteractions(event: { target: EventTarget | null; preventDefault: () => void }) {
  if (event.target instanceof Element && event.target.closest("[data-sonner-toaster]")) event.preventDefault();
}
