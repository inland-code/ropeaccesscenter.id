/**
 * Form editor yang dirender otomatis dari JSON Schema (diturunkan dari zod di src/content/schema.ts).
 * Mendukung: object, array (tambah/hapus/urutkan), union section (oneOf + const "type"),
 * string (text/textarea/image/link/date), enum, number, boolean.
 */
import { useState } from 'preact/hooks';
import type { JsonSchema } from './api';
import { ImageField } from './media';
import { useStatic } from './state';

type Val = unknown;
type OnChange = (v: Val) => void;

const isObj = (s: JsonSchema) => s.type === 'object' || !!s.properties;
const variants = (s: JsonSchema) => s.oneOf ?? s.anyOf;
const typeName = (v: JsonSchema) => v.properties?.type?.const;

export function defaultFor(s: JsonSchema): Val {
  if (s.default !== undefined) return structuredClone(s.default);
  const vs = variants(s);
  if (vs?.length) return defaultFor(vs[0]!);
  if (s.const !== undefined) return s.const;
  if (s.enum) return s.enum[0];
  if (isObj(s)) {
    const out: Record<string, Val> = {};
    for (const k of s.required ?? []) out[k] = defaultFor(s.properties![k]!);
    return out;
  }
  if (s.type === 'array') return Array.from({ length: s.minItems ?? 0 }, () => defaultFor(s.items!));
  if (s.type === 'number' || s.type === 'integer') return s.minimum ?? 0;
  if (s.type === 'boolean') return false;
  return '';
}

const label = (s: JsonSchema, key: string) => s.title ?? key;
const input =
  'mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-ink ring-1 ring-black/15 focus:ring-2 focus:ring-brand-500';

function Hint({ s }: { s: JsonSchema }) {
  const bits = [s.description, s.maxLength ? `maks ${s.maxLength} karakter` : ''].filter(Boolean);
  return bits.length ? <p class="mt-1 text-xs text-muted">{bits.join(' · ')}</p> : null;
}

function Counter({ value, s }: { value: string; s: JsonSchema }) {
  if (!s.maxLength && !s.minLength) return null;
  const n = value.length;
  const bad = (s.maxLength && n > s.maxLength) || (s.minLength && n < s.minLength);
  return (
    <span class={`ml-2 text-xs ${bad ? 'text-red-600' : 'text-muted'}`}>
      {n}
      {s.maxLength ? `/${s.maxLength}` : ''}
    </span>
  );
}

function LinkField({ value, onChange }: { value: string; onChange: OnChange }) {
  const { links } = useStatic();
  const id = `links-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <>
      <input class={input} value={value} list={id} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
      <datalist id={id}>
        <option value="#whatsapp">WhatsApp</option>
        {links.map((l) => (
          <option value={l.key}>{`${l.title} (${l.path})`}</option>
        ))}
      </datalist>
    </>
  );
}

export function Field({
  schema,
  value,
  onChange,
  name,
  required = true,
}: {
  schema: JsonSchema;
  value: Val;
  onChange: OnChange;
  name: string;
  required?: boolean;
}) {
  const title = label(schema, name);

  // Field opsional yang belum diisi → tombol tambah.
  if (!required && value === undefined) {
    return (
      <button type="button" class="text-sm font-medium text-brand-800 hover:underline" onClick={() => onChange(defaultFor(schema))}>
        + {title}
      </button>
    );
  }
  const removeBtn = !required && (
    <button type="button" class="ml-2 text-xs text-red-600 hover:underline" onClick={() => onChange(undefined)}>
      hapus
    </button>
  );

  const vs = variants(schema);
  if (vs && vs.some((v) => typeName(v))) return <UnionField schema={schema} value={value as Record<string, Val>} onChange={onChange} />;

  if (isObj(schema)) {
    return (
      <fieldset class="rounded-xl border border-black/10 bg-white/60 p-4">
        <legend class="px-1 text-sm font-semibold text-navy-900">
          {title}
          {removeBtn}
        </legend>
        <ObjectFields schema={schema} value={(value ?? {}) as Record<string, Val>} onChange={onChange} />
      </fieldset>
    );
  }

  if (schema.type === 'array') return <ArrayField schema={schema} value={(value ?? []) as Val[]} onChange={onChange} title={title} />;

  if (schema.enum) {
    return (
      <label class="block text-sm font-medium text-navy-900">
        {title}
        {removeBtn}
        <select class={input} value={String(value)} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
          {schema.enum.map((o) => (
            <option value={String(o)}>{String(o)}</option>
          ))}
        </select>
      </label>
    );
  }
  if (schema.type === 'boolean') {
    return (
      <label class="flex items-center gap-2 text-sm font-medium text-navy-900">
        <input
          type="checkbox"
          class="size-4 accent-brand-600"
          checked={Boolean(value)}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
        />
        {title}
      </label>
    );
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return (
      <label class="block text-sm font-medium text-navy-900">
        {title}
        {removeBtn}
        <input
          type="number"
          class={input}
          value={value as number}
          min={schema.minimum}
          max={schema.maximum}
          onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        />
      </label>
    );
  }

  const str = String(value ?? '');
  return (
    <div class="block text-sm font-medium text-navy-900">
      <span>
        {title}
        <Counter value={str} s={schema} />
        {removeBtn}
      </span>
      {schema.widget === 'textarea' ? (
        <textarea class={`${input} min-h-24`} value={str} onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)} />
      ) : schema.widget === 'image' ? (
        <ImageField value={str} onChange={onChange} />
      ) : schema.widget === 'link' ? (
        <LinkField value={str} onChange={onChange} />
      ) : schema.widget === 'date' ? (
        <input type="date" class={input} value={str.slice(0, 10)} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
      ) : (
        <input class={input} value={str} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
      )}
      <Hint s={schema} />
    </div>
  );
}

export function ObjectFields({
  schema,
  value,
  onChange,
  hide = [],
  only,
}: {
  schema: JsonSchema;
  value: Record<string, Val>;
  onChange: OnChange;
  hide?: string[];
  only?: string[];
}) {
  const req = new Set(schema.required ?? []);
  return (
    <div class="space-y-4">
      {Object.entries(schema.properties ?? {})
        .filter(([k]) => !hide.includes(k) && (!only || only.includes(k)))
        .map(([k, s]) => (
          <Field
            key={k}
            name={k}
            schema={s}
            required={req.has(k) || s.default !== undefined}
            value={value[k] ?? (s.default !== undefined ? s.default : undefined)}
            onChange={(v) => {
              const next = { ...value };
              if (v === undefined) delete next[k];
              else next[k] = v;
              onChange(next);
            }}
          />
        ))}
    </div>
  );
}

function ArrayField({ schema, value, onChange, title }: { schema: JsonSchema; value: Val[]; onChange: OnChange; title: string }) {
  const item = schema.items!;
  const itemTitle = item.title ?? 'Item';
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  const isUnion = !!variants(item)?.some((v) => typeName(v));
  return (
    <div class="rounded-xl border border-dashed border-black/15 p-4">
      <p class="text-sm font-semibold text-navy-900">
        {title} <span class="font-normal text-muted">({value.length})</span>
      </p>
      <ol class="mt-3 space-y-3">
        {value.map((v, i) => (
          <li class="rounded-xl bg-surface-alt p-3 ring-1 ring-black/5">
            <div class="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
              <span class="font-semibold">
                {itemTitle} {i + 1}
                {isUnion && ` — ${variants(item)!.find((x) => typeName(x) === (v as { type?: string }).type)?.title ?? ''}`}
              </span>
              <span class="flex gap-1">
                <button
                  type="button"
                  class="rounded px-2 py-1 hover:bg-white disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Naik"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-1 hover:bg-white disabled:opacity-30"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Turun"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-1 text-red-600 hover:bg-white disabled:opacity-30"
                  disabled={value.length <= (schema.minItems ?? 0)}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  Hapus
                </button>
              </span>
            </div>
            <Field name={itemTitle} schema={item} value={v} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
          </li>
        ))}
      </ol>
      {(!schema.maxItems || value.length < schema.maxItems) && (
        <AddItem schema={item} onAdd={(nv) => onChange([...value, nv])} label={itemTitle} />
      )}
    </div>
  );
}

function AddItem({ schema, onAdd, label: l }: { schema: JsonSchema; onAdd: (v: Val) => void; label: string }) {
  const vs = variants(schema)?.filter((v) => typeName(v));
  const [pick, setPick] = useState(vs?.[0] ? typeName(vs[0]) : '');
  if (vs?.length) {
    return (
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <select
          class="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/15"
          value={pick}
          onChange={(e) => setPick((e.target as HTMLSelectElement).value)}
        >
          {vs.map((v) => (
            <option value={typeName(v)}>{v.title ?? typeName(v)}</option>
          ))}
        </select>
        <button
          type="button"
          class="rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => onAdd(defaultFor(vs.find((v) => typeName(v) === pick)!))}
        >
          + Tambah section
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      class="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-navy-900 ring-1 ring-black/15 hover:bg-brand-50"
      onClick={() => onAdd(defaultFor(schema))}
    >
      + {l}
    </button>
  );
}

function UnionField({ schema, value, onChange }: { schema: JsonSchema; value: Record<string, Val>; onChange: OnChange }) {
  const v = variants(schema)!.find((x) => typeName(x) === value?.type) ?? variants(schema)![0]!;
  return <ObjectFields schema={v} value={value} onChange={onChange} hide={['type']} />;
}

/** Kolom teknis (slug, kunci terjemahan, dll.) dilipat agar tidak terubah tanpa sengaja. */
export function TechnicalFields({
  schema,
  value,
  onChange,
  keys,
}: {
  schema: JsonSchema;
  value: Record<string, Val>;
  onChange: OnChange;
  keys: string[];
}) {
  return (
    <details class="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <summary class="cursor-pointer text-sm font-semibold text-amber-900">Pengaturan teknis (jangan diubah tanpa perlu)</summary>
      <p class="mt-2 text-xs text-amber-900/80">
        Mengubah slug akan mengubah alamat URL halaman dan bisa merusak SEO. Kunci terjemahan menghubungkan versi ID &amp; EN.
      </p>
      <div class="mt-4">
        <ObjectFields schema={schema} value={value} onChange={onChange} only={keys} />
      </div>
    </details>
  );
}
