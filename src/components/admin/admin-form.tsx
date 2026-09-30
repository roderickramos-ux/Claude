"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

type State = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;
type Action = (state: State, formData: FormData) => Promise<State>;

const ErrorsContext = createContext<Record<string, string>>({});
export const useFieldError = (name: string) => useContext(ErrorsContext)[name];

/** Form wrapper for admin server actions: shows success/errors and keeps field values after submit. */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  /** Ask for confirmation before submitting (destructive actions). */
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <ErrorsContext.Provider value={state?.errors ?? {}}>
      {/* Submitting via onSubmit (instead of the `action` prop) stops React from resetting
          uncontrolled fields, so values survive validation errors. */}
      <form
        ref={ref}
        className={className ?? "grid gap-5"}
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
          {state?.message && (
            <Alert tone={state.ok ? "success" : "danger"} className="py-2">{state.message}</Alert>
          )}
        </div>
      </form>
    </ErrorsContext.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const e = useFieldError(name);
  return e ? <p className="mt-1 text-sm text-danger">{e}</p> : null;
}

/** A small form that asks for confirmation before running a destructive action. */
export function ConfirmForm({
  action,
  children,
  confirm,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  confirm: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
