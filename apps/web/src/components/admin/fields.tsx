"use client";

import { useEffect, useId, useState } from "react";

/*
 * Small form kit for the admin editors. Errors come from the API's validation (see ApiError.fields) and
 * are shown under the field they belong to.
 */

export const inputClass =
  "mt-1 block w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-link";

function border(error?: string) {
  return error ? "border-red-500" : "border-line";
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

/** Warns before leaving the page with unsaved edits (tab close, reload or typed URL). */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  multiline?: number;
  type?: string;
  prefix?: string;
};

export function TextField({ label, hint, error, value, onChange, maxLength, required, placeholder, multiline, type, prefix }: FieldProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const shared = {
    id,
    value,
    required,
    maxLength,
    placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${inputClass} ${border(error)} ${prefix ? "rounded-l-none" : ""}`,
  };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-muted"> *</span>}
        </label>
        {maxLength && (
          <span className={`text-xs ${value.length > maxLength * 0.9 ? "text-amber-600" : "text-muted"}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {multiline ? (
        <textarea {...shared} rows={multiline} onChange={(e) => onChange(e.target.value)} />
      ) : prefix ? (
        <div className="mt-1 flex">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-line px-3 text-sm text-muted">{prefix}</span>
          <input {...shared} type={type ?? "text"} className={shared.className.replace("mt-1 ", "")} onChange={(e) => onChange(e.target.value)} />
        </div>
      ) : (
        <input {...shared} type={type ?? "text"} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="font-medium">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Edit a list of short strings: add with Enter or the button, remove with ×. */
export function TagListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  max = 30,
  error,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
  error?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim().slice(0, 200);
    if (value && !values.includes(value) && values.length < max) onChange([...values, value]);
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value} className="flex items-center gap-1 rounded-full border border-line py-1 pl-3 pr-1 text-sm">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Remove ${value}`}
                className="rounded-full px-1.5 text-muted hover:bg-foreground/10 hover:text-foreground"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={values.length >= max ? `Maximum of ${max} reached` : placeholder}
          disabled={values.length >= max}
          className={`${inputClass} ${border(error)} mt-0`}
        />
        <button type="button" onClick={add} className="rounded-lg border border-line px-3 text-sm hover:border-link">
          Add
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

type RowField<T> = { key: keyof T & string; label: string; maxLength: number; multiline?: number; width?: string };

/** Edit a list of small records (process steps, FAQs, result metrics): add, remove and reorder rows. */
export function RowsField<T extends Record<string, string>>({
  label,
  hint,
  rows,
  onChange,
  fields,
  empty,
  max,
  addLabel,
  errors,
  errorPrefix,
}: {
  label: string;
  hint?: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  fields: RowField<T>[];
  empty: T;
  max: number;
  addLabel: string;
  errors: Record<string, string>;
  errorPrefix: string;
}) {
  const update = (index: number, key: keyof T, value: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const move = (index: number, by: number) => {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(index + by, 0, row);
    onChange(next);
  };
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <ol className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <li key={index} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>#{index + 1}</span>
              <span className="flex gap-1">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${label} ${index + 1} up`} className="rounded px-2 py-0.5 hover:bg-foreground/10 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" disabled={index === rows.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${label} ${index + 1} down`} className="rounded px-2 py-0.5 hover:bg-foreground/10 disabled:opacity-30">
                  ↓
                </button>
                <button type="button" onClick={() => onChange(rows.filter((_, i) => i !== index))} aria-label={`Remove ${label} ${index + 1}`} className="rounded px-2 py-0.5 text-red-600 dark:text-red-400 hover:bg-red-500/10">
                  Remove
                </button>
              </span>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
              {fields.map((field) => (
                <div key={field.key} className={field.width}>
                  <TextField
                    label={field.label}
                    value={row[field.key] ?? ""}
                    onChange={(value) => update(index, field.key, value)}
                    maxLength={field.maxLength}
                    multiline={field.multiline}
                    error={errors[`${errorPrefix}.${index}.${field.key}`]}
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={rows.length >= max}
        onClick={() => onChange([...rows, { ...empty }])}
        className="mt-3 rounded-lg border border-dashed border-line px-3 py-2 text-sm hover:border-link disabled:opacity-40"
      >
        + {addLabel}
      </button>
      {rows.length >= max && <span className="ml-2 text-xs text-muted">Maximum of {max}</span>}
    </fieldset>
  );
}
