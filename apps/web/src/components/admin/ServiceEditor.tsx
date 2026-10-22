"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ApiError, type Service, type ServiceInput, adminApi } from "@/lib/admin/api";
import { EditorShell, type SaveState, SeoSection } from "./EditorShell";
import { RowsField, Section, TagListField, TextField, slugify, useUnsavedChangesWarning } from "./fields";

const EMPTY: ServiceInput = {
  title: "",
  slug: "",
  tagline: null,
  summary: "",
  body: { problem: null, process: [], faqs: [] },
  deliverables: [],
  tech_stack: [],
  sort_order: 0,
  status: "draft",
  meta_title: null,
  meta_description: null,
  noindex: false,
};

function toInput(service: Service): ServiceInput {
  const { id: _id, created_at: _c, updated_at: _u, ...input } = service;
  void _id;
  void _c;
  void _u;
  return { ...input, body: { problem: input.body?.problem ?? null, process: input.body?.process ?? [], faqs: input.body?.faqs ?? [] } };
}

const blank = (value: string) => value.trim() || null;

export function ServiceEditor({ initial }: { initial: Service | null }) {
  const router = useRouter();
  const [form, setForm] = useState<ServiceInput>(initial ? toInput(initial) : { ...EMPTY });
  const [saved, setSaved] = useState<Service | null>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ saving: false, error: null, savedAt: null });
  // New services take their slug from the title until someone edits the slug themselves.
  const slugTouched = useRef(Boolean(initial));

  const savedJson = useMemo(() => JSON.stringify(saved ? toInput(saved) : EMPTY), [saved]);
  const dirty = JSON.stringify(form) !== savedJson;
  useUnsavedChangesWarning(dirty);

  const set = (changes: Partial<ServiceInput>) => setForm((f) => ({ ...f, ...changes }));
  const setBody = (changes: Partial<ServiceInput["body"]>) => setForm((f) => ({ ...f, body: { ...f.body, ...changes } }));

  async function save() {
    setState((s) => ({ ...s, saving: true, error: null }));
    setErrors({});
    const payload: ServiceInput = {
      ...form,
      tagline: blank(form.tagline ?? ""),
      meta_title: blank(form.meta_title ?? ""),
      meta_description: blank(form.meta_description ?? ""),
      body: { ...form.body, problem: blank(form.body.problem ?? "") },
    };
    try {
      const result = saved ? await adminApi.updateService(saved.id, payload) : await adminApi.createService(payload);
      setSaved(result);
      setForm(toInput(result));
      setState({ saving: false, error: null, savedAt: new Date() });
      slugTouched.current = true;
      if (!saved) router.replace(`/admin/services/${result.id}`);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      setErrors(apiError?.fields ?? {});
      setState((s) => ({ ...s, saving: false, error: apiError?.message ?? "Could not save. Check your connection and try again." }));
    }
  }

  return (
    <EditorShell
      backHref="/admin/services"
      backLabel="All services"
      heading={saved ? saved.title : "New service"}
      isNew={!saved}
      dirty={dirty}
      state={state}
      status={form.status}
      savedStatus={saved?.status ?? null}
      onStatusChange={(status) => set({ status })}
      onSave={save}
      onDelete={
        saved
          ? async () => {
              await adminApi.deleteService(saved.id);
              setSaved(null);
              setForm({ ...EMPTY });
              router.replace("/admin/services");
            }
          : undefined
      }
      publicPath={saved ? `/services/${saved.slug}` : null}
      sidebar={
        <Section title="Order">
          <TextField
            label="Position in lists"
            hint="Lower numbers come first on the home and services pages."
            type="number"
            value={String(form.sort_order)}
            onChange={(v) => set({ sort_order: Math.max(0, Math.min(1000, Number(v) || 0)) })}
            error={errors.sort_order}
          />
        </Section>
      }
    >
      <Section title="Basics">
        <TextField
          label="Title"
          required
          maxLength={160}
          value={form.title}
          onChange={(title) => set(slugTouched.current ? { title } : { title, slug: slugify(title) })}
          error={errors.title}
        />
        <TextField
          label="URL"
          required
          prefix="/services/"
          maxLength={160}
          value={form.slug}
          onChange={(v) => {
            slugTouched.current = true;
            set({ slug: v.toLowerCase().replace(/\s+/g, "-") });
          }}
          hint={saved?.status === "published" ? "Changing the URL of a live page breaks old links to it." : "Lowercase words joined by hyphens."}
          error={errors.slug}
        />
        <TextField label="Tagline" maxLength={255} value={form.tagline ?? ""} onChange={(v) => set({ tagline: v })} hint="One short line under the title." error={errors.tagline} />
        <TextField
          label="Summary"
          required
          maxLength={600}
          multiline={3}
          value={form.summary}
          onChange={(summary) => set({ summary })}
          hint="Shown on service cards and used as the search description unless you set one."
          error={errors.summary}
        />
      </Section>

      <Section title="Page content" description="Each section appears on the page only when it has content.">
        <TextField
          label="The problem we solve"
          maxLength={2000}
          multiline={4}
          value={form.body.problem ?? ""}
          onChange={(problem) => setBody({ problem })}
          error={errors["body.problem"]}
        />
        <TagListField
          label="What you get"
          hint="Deliverables, one per item."
          values={form.deliverables}
          onChange={(deliverables) => set({ deliverables })}
          placeholder="e.g. Technical SEO audit"
          error={errors.deliverables}
        />
        <RowsField
          label="How it works"
          hint="The steps of your process, in order."
          rows={form.body.process}
          onChange={(process) => setBody({ process })}
          fields={[
            { key: "title", label: "Step", maxLength: 200 },
            { key: "text", label: "What happens", maxLength: 600, multiline: 2 },
          ]}
          empty={{ title: "", text: "" }}
          max={8}
          addLabel="Add step"
          errors={errors}
          errorPrefix="body.process"
        />
        <TagListField
          label="Tech we use"
          values={form.tech_stack}
          onChange={(tech_stack) => set({ tech_stack })}
          placeholder="e.g. Next.js"
          error={errors.tech_stack}
        />
        <RowsField
          label="FAQs"
          hint="Shown as expandable questions and given to Google as FAQ data."
          rows={form.body.faqs}
          onChange={(faqs) => setBody({ faqs })}
          fields={[
            { key: "question", label: "Question", maxLength: 200 },
            { key: "answer", label: "Answer", maxLength: 2000, multiline: 3 },
          ]}
          empty={{ question: "", answer: "" }}
          max={15}
          addLabel="Add question"
          errors={errors}
          errorPrefix="body.faqs"
        />
      </Section>

      <SeoSection
        path={`/services/${form.slug || "…"}`}
        fallbackTitle={form.title}
        fallbackDescription={form.summary}
        metaTitle={form.meta_title ?? ""}
        metaDescription={form.meta_description ?? ""}
        noindex={form.noindex}
        onChange={(changes) => set(changes)}
        errors={errors}
      />
    </EditorShell>
  );
}
