import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, wired for screen readers via `aria-invalid` on the control. */
export function FormField({ id, label, error, hint, optional, className, children }: FormFieldProps) {
  return (
    <Field data-invalid={Boolean(error)} className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={id} className="text-[13px] font-medium text-foreground/90">
        {label}
        {optional && <span className="font-normal text-subtle-foreground">Optional</span>}
      </FieldLabel>
      {children}
      {error ? (
        <FieldError id={`${id}-error`} className="text-xs">
          {error}
        </FieldError>
      ) : (
        hint && <FieldDescription className="text-xs">{hint}</FieldDescription>
      )}
    </Field>
  );
}
