"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, type CaseStudy, type CaseStudyInput, type ServiceListItem, adminApi } from "@/lib/admin/api";
import { EditorShell, type SaveState, SeoSection } from "./EditorShell";
import { Checkbox, RowsField, Section, TagListField, TextField, slugify, useUnsavedChangesWarning } from "./fields";

const EMPTY: CaseStudyInput = {
  title: "",
  slug: "",
  client_name: null,
  summary: null,
  challenge: null,
  solution: null,
  results: [],
  tech_stack: [],
  live_url: null,
  // No client work yet: new case studies are demo projects unless someone says otherwise.
  is_demo: true,
  is_featured: false,
  status: "draft",
  service_ids: [],
  meta_title: null,
  meta_description: null,
  noindex: false,
};

const KEYS = Object.keys(EMPTY) as (keyof CaseStudyInput)[];

function toInput(study: CaseStudy): CaseStudyInput {
  const input = Object.fromEntries(KEYS.map((key) => [key, study[key]])) as CaseStudyInput;
  return { ...input, service_ids: [...input.service_ids].sort() };
}

const blank = (value: string | null) => value?.trim() || null;

export function CaseStudyEditor({ initial }: { initial: CaseStudy | null }) {
  const router = useRouter();
  const [form, setForm] = useState<CaseStudyInput>(initial ? toInput(initial) : { ...EMPTY });
  const [saved, setSaved] = useState<CaseStudy | null>(initial);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ saving: false, error: null, savedAt: null });
  const slugTouched = useRef(Boolean(initial));

  useEffect(() => {
    adminApi.services().then(setServices, () => setServices([]));
  }, []);

  const savedJson = useMemo(() => JSON.stringify(saved ? toInput(saved) : EMPTY), [saved]);
  const dirty = JSON.stringify(form) !== savedJson;
  useUnsavedChangesWarning(dirty);

  const set = (changes: Partial<CaseStudyInput>) => setForm((f) => ({ ...f, ...changes }));

  async function save() {
    setState((s) => ({ ...s, saving: true, error: null }));
    setErrors({});
    const payload: CaseStudyInput = {
      ...form,
      // Demos never name a client, even if one was typed before ticking Demo.
      client_name: form.is_demo ? null : blank(form.client_name),
      summary: blank(form.summary),
      challenge: blank(form.challenge),
      solution: blank(form.solution),
      live_url: blank(form.live_url),
      meta_title: blank(form.meta_title),
      meta_description: blank(form.meta_description),
    };
    try {
      const result = saved ? await adminApi.updateCaseStudy(saved.id, payload) : await adminApi.createCaseStudy(payload);
      setSaved(result);
      setForm(toInput(result));
      setState({ saving: false, error: null, savedAt: new Date() });
      slugTouched.current = true;
      if (!saved) router.replace(`/admin/case-studies/${result.id}`);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      setErrors(apiError?.fields ?? {});
      setState((s) => ({ ...s, saving: false, error: apiError?.message ?? "Could not save. Check your connection and try again." }));
    }
  }

  const toggleService = (id: string, on: boolean) =>
    set({ service_ids: (on ? [...form.service_ids, id] : form.service_ids.filter((s) => s !== id)).sort() });

  return (
    <EditorShell
      backHref="/admin/case-studies"
      backLabel="All case studies"
      heading={saved ? saved.title : "New case study"}
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
              await adminApi.deleteCaseStudy(saved.id);
              setSaved(null);
              setForm({ ...EMPTY });
              router.replace("/admin/case-studies");
            }
          : undefined
      }
      publicPath={saved ? `/work/${saved.slug}` : null}
      sidebar={
        <>
          <Section title="Labels">
            <Checkbox
              label="Demo project"
              hint="Built in-house to show what we can do. Shown with a “Demo project” label. Untick only for real client work."
              checked={form.is_demo}
              onChange={(is_demo) => set({ is_demo })}
            />
            <Checkbox label="Featured" hint="Shown on the home page (up to 3) and first in lists." checked={form.is_featured} onChange={(is_featured) => set({ is_featured })} />
          </Section>
          <Section title="Services" description="Shown as related work on these service pages.">
            {services.length === 0 ? (
              <p className="text-sm text-muted">No services yet.</p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="sr-only">Linked services</legend>
                {services.map((service) => (
                  <Checkbox
                    key={service.id}
                    label={service.title}
                    hint={service.status === "draft" ? "Draft: not linked publicly until published" : undefined}
                    checked={form.service_ids.includes(service.id)}
                    onChange={(on) => toggleService(service.id, on)}
                  />
                ))}
              </fieldset>
            )}
            {errors.service_ids && <p className="text-xs text-red-600">{errors.service_ids}</p>}
          </Section>
        </>
      }
    >
      <Section title="Basics">
        <TextField
          label="Title"
          required
          maxLength={200}
          value={form.title}
          onChange={(title) => set(slugTouched.current ? { title } : { title, slug: slugify(title) })}
          error={errors.title}
        />
        <TextField
          label="URL"
          required
          prefix="/work/"
          maxLength={160}
          value={form.slug}
          onChange={(v) => {
            slugTouched.current = true;
            set({ slug: v.toLowerCase().replace(/\s+/g, "-") });
          }}
          hint={saved?.status === "published" ? "Changing the URL of a live page breaks old links to it." : "Lowercase words joined by hyphens."}
          error={errors.slug}
        />
        {!form.is_demo && (
          <TextField label="Client" maxLength={160} value={form.client_name ?? ""} onChange={(v) => set({ client_name: v })} hint="Only with the client's permission." error={errors.client_name} />
        )}
        <TextField
          label="Summary"
          maxLength={400}
          multiline={2}
          value={form.summary ?? ""}
          onChange={(v) => set({ summary: v })}
          hint="One or two sentences for portfolio cards."
          error={errors.summary}
        />
        <TextField
          label="Live link"
          type="url"
          value={form.live_url ?? ""}
          onChange={(v) => set({ live_url: v })}
          placeholder="https://"
          hint={form.is_demo ? "Where people can try the demo." : "The live product, if public."}
          error={errors.live_url}
        />
      </Section>

      <Section title="The story">
        <TextField label="The challenge" maxLength={5000} multiline={4} value={form.challenge ?? ""} onChange={(v) => set({ challenge: v })} error={errors.challenge} />
        <TextField label="What we built" maxLength={5000} multiline={4} value={form.solution ?? ""} onChange={(v) => set({ solution: v })} error={errors.solution} />
        <RowsField
          label="Results"
          hint={form.is_demo ? "For demos, use measured results from testing, not invented client numbers." : "Measurable outcomes, e.g. “+180%” and “organic traffic in 6 months”."}
          rows={form.results}
          onChange={(results) => set({ results })}
          fields={[
            { key: "metric", label: "Number", maxLength: 30 },
            { key: "label", label: "What it measures", maxLength: 120 },
          ]}
          empty={{ metric: "", label: "" }}
          max={6}
          addLabel="Add result"
          errors={errors}
          errorPrefix="results"
        />
        <TagListField label="Tech stack" values={form.tech_stack} onChange={(tech_stack) => set({ tech_stack })} placeholder="e.g. FastAPI" error={errors.tech_stack} />
      </Section>

      <SeoSection
        path={`/work/${form.slug || "…"}`}
        fallbackTitle={form.title}
        fallbackDescription={form.summary ?? ""}
        metaTitle={form.meta_title ?? ""}
        metaDescription={form.meta_description ?? ""}
        noindex={form.noindex}
        onChange={(changes) => set(changes)}
        errors={errors}
      />
    </EditorShell>
  );
}
