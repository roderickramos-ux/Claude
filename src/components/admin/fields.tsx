"use client";

import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useFieldError } from "./admin-form";

type Base = { name: string; label: string; hint?: React.ReactNode; className?: string; required?: boolean };

function Wrap({ name, label, hint, className, required, children }: Base & { children: React.ReactNode }) {
  const error = useFieldError(name);
  return (
    <div className={className}>
      <Label htmlFor={`af-${name}`}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </Label>
      {children}
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function TextField(props: Base & { defaultValue?: string | number | null; type?: string; placeholder?: string; step?: string }) {
  const { name, defaultValue, type = "text", placeholder, step, required } = props;
  return (
    <Wrap {...props}>
      <Input id={`af-${name}`} name={name} type={type} step={step} defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} aria-invalid={useFieldError(name) ? true : undefined} />
    </Wrap>
  );
}

export function TextAreaField(props: Base & { defaultValue?: string | null; rows?: number; markdown?: boolean; placeholder?: string }) {
  const { name, defaultValue, rows = 5, markdown, placeholder } = props;
  return (
    <Wrap {...props} hint={props.hint ?? (markdown ? "Markdown supported: ## Heading, **bold**, - bullet list, [link](https://…)" : undefined)}>
      <Textarea id={`af-${name}`} name={name} rows={rows} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={cn(markdown && "font-mono text-sm")} />
    </Wrap>
  );
}

export function SelectField(props: Base & { defaultValue?: string | null; options: { value: string; label: string }[] }) {
  const { name, defaultValue, options } = props;
  return (
    <Wrap {...props}>
      <Select id={`af-${name}`} name={name} defaultValue={defaultValue ?? ""}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Wrap>
  );
}

export function CheckField({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <Checkbox name={name} defaultChecked={defaultChecked} />
      <span>{label}{hint && <span className="block text-xs text-ink-muted">{hint}</span>}</span>
    </label>
  );
}

export function FileField(props: Base & { accept: string; current?: string | null; removeName?: string }) {
  const { name, accept, current, removeName } = props;
  return (
    <Wrap {...props}>
      <Input id={`af-${name}`} name={name} type="file" accept={accept} className="h-auto py-2" />
      {current && (
        <div className="mt-2 flex items-center gap-3 text-sm">
          <a href={current} target="_blank" rel="noopener" className="text-primary underline">Current file ↗</a>
          {removeName && <label className="flex items-center gap-1.5 text-ink-muted"><Checkbox name={removeName} /> Remove</label>}
        </div>
      )}
    </Wrap>
  );
}

export function CheckboxGroup({ name, label, options, selected }: { name: string; label: string; options: { value: string; label: string }[]; selected: string[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <Checkbox name={name} value={o.value} defaultChecked={selected.includes(o.value)} /> {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
