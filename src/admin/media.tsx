import { useEffect, useState } from 'preact/hooks';
import { api, rawImageUrl, type FileEntry } from './api';
import { useStatic, useToast } from './state';

const PREFIX = 'src/assets/images/';
const MAX_EDGE = 2560;

/**
 * Kompres gambar di browser sebelum diunggah (repo tetap ringan):
 * sisi terpanjang maks 2560px, WebP kualitas 0.86. PNG transparan tetap PNG.
 */
export async function compressImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { blob: file, name: file.name };
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const keepPng = file.type === 'image/png' && hasAlpha(ctx.getImageData(0, 0, w, h).data);
  const type = keepPng ? 'image/png' : 'image/webp';
  const blob = await canvas.convertToBlob({ type, quality: 0.86 });
  const base = file.name.replace(/\.[^.]+$/, '');
  const out = blob.size < file.size || scale < 1 ? blob : file;
  return { blob: out, name: `${base}.${out.type === 'image/png' ? 'png' : out.type === 'image/jpeg' ? 'jpg' : 'webp'}` };
}
function hasAlpha(d: Uint8ClampedArray): boolean {
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i]! < 255) return true;
  return false;
}

export function useImages() {
  const statics = useStatic();
  const [items, setItems] = useState<string[]>(statics.images);
  const reload = () =>
    api
      .files('src/assets/images')
      .then((f: FileEntry[]) => setItems(f.map((x) => x.path.replace(PREFIX, '')).sort()))
      .catch(() => {});
  useEffect(() => {
    reload();
  }, []);
  return { items, reload };
}

export function Uploader({ onDone, folder: initial = 'uploads' }: { onDone: (image: string) => void; folder?: string }) {
  const [folder, setFolder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const { blob, name } = await compressImage(file);
      const res = await api.upload(blob, name, folder);
      toast({ kind: 'ok', text: `Terunggah: ${res.image} (${Math.round(blob.size / 1024)} KB)` });
      onDone(res.image);
    } catch (e) {
      toast({ kind: 'err', text: `Gagal mengunggah: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="flex flex-wrap items-end gap-3 rounded-xl bg-brand-50 p-4">
      <label class="text-sm font-medium text-navy-900">
        Folder
        <input
          class="mt-1 block w-40 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/15"
          value={folder}
          onInput={(e) => setFolder((e.target as HTMLInputElement).value)}
        />
      </label>
      <label class="cursor-pointer rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
        {busy ? 'Mengunggah…' : 'Unggah gambar'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          class="sr-only"
          disabled={busy}
          onChange={(e) => onFile((e.target as HTMLInputElement).files?.[0])}
        />
      </label>
      <p class="text-xs text-muted">Otomatis dikompres (maks 2560px, WebP). Gambar baru tampil di situs setelah build selesai.</p>
    </div>
  );
}

export function Thumb({ image, class: cls = '' }: { image: string; class?: string }) {
  return <img src={rawImageUrl(image)} alt={image} loading="lazy" class={`bg-sand object-cover ${cls}`} />;
}

export function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div class="mt-1 flex items-center gap-3">
      {value ? <Thumb image={value} class="size-16 rounded-lg" /> : <div class="size-16 rounded-lg bg-sand" />}
      <div class="min-w-0 flex-1">
        <input
          class="block w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/15"
          value={value}
          onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        />
        <button type="button" class="mt-1 text-xs font-semibold text-brand-800 hover:underline" onClick={() => setOpen(true)}>
          Pilih / unggah gambar
        </button>
      </div>
      {open && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div class="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-bold text-navy-900">Pilih gambar</h3>
              <button type="button" class="text-sm text-muted" onClick={() => setOpen(false)}>
                Tutup
              </button>
            </div>
            <MediaGrid
              onPick={(img) => {
                onChange(img);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function MediaGrid({ onPick }: { onPick?: (image: string) => void }) {
  const { items, reload } = useImages();
  const [q, setQ] = useState('');
  const toast = useToast();
  const shown = items.filter((i) => i.includes(q.toLowerCase()));
  return (
    <div class="space-y-4">
      <Uploader
        onDone={(img) => {
          reload();
          onPick?.(img);
        }}
      />
      <input
        class="block w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/15"
        placeholder="Cari gambar…"
        value={q}
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
      />
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map((img) => (
          <li>
            <button
              type="button"
              class="group block w-full overflow-hidden rounded-xl text-left ring-1 ring-black/10 hover:ring-brand-500"
              onClick={() => {
                if (onPick) onPick(img);
                else navigator.clipboard?.writeText(img).then(() => toast({ kind: 'ok', text: `Path disalin: ${img}` }));
              }}
            >
              <Thumb image={img} class="aspect-[4/3] w-full" />
              <span class="block truncate px-2 py-1.5 text-xs text-muted">{img}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
