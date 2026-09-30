import { startTransition, type FormEvent } from "react";

/**
 * React 19 resets uncontrolled form fields after a form `action` completes, which wipes the
 * user's input when the server returns validation errors. Submitting through onSubmit avoids that.
 */
export function submitWithoutReset(formAction: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
}
