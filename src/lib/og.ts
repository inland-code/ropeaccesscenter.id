import { readFile } from 'node:fs/promises';
import satori from 'satori';
import sharp, { type Sharp } from 'sharp';
import site from '@/data/site.json';

/**
 * Gambar Open Graph bermerek RAC 1200×630 (preview saat link dibagikan ke WhatsApp, LinkedIn, Facebook, X).
 * Dibuat saat build: panel navy + logo RAC + judul (Archivo) + diagonal merah & siluet pemanjat (atau foto halaman
 * bila ada). Teks dirender menjadi path oleh satori, lalu SVG diubah ke JPEG oleh sharp — tidak butuh font sistem.
 */

const W = 1200;
const H = 630;
const NAVY = '#0d1b2a';
const RED = '#e30613';
type FontDef = { name: string; data: Buffer; weight: 400 | 600 | 800; style: 'normal' };
let fonts: FontDef[] | undefined;
let logo: string | undefined;
let climber: string | undefined;

const font = async (name: string, file: string, weight: FontDef['weight']): Promise<FontDef> => ({
  name,
  data: await readFile(`node_modules/@fontsource/${file}`),
  weight,
  style: 'normal',
});
const dataUrl = async (img: Sharp) => `data:image/png;base64,${(await img.png().toBuffer()).toString('base64')}`;

async function assets() {
  fonts ??= [
    await font('Archivo', 'archivo/files/archivo-latin-800-normal.woff', 800),
    await font('Montserrat', 'montserrat/files/montserrat-latin-400-normal.woff', 400),
    await font('Montserrat', 'montserrat/files/montserrat-latin-600-normal.woff', 600),
  ];
  logo ??= await dataUrl(sharp('src/assets/brand/logo-onDark-720.webp').resize({ height: 130 }));
  climber ??= await dataUrl(sharp('src/assets/brand/climber-420.webp').resize({ height: 470 }));
  return { fonts, logo, climber };
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

export async function renderOg(opts: { title: string; eyebrow?: string; photoPath?: string; locale: 'id' | 'en' }): Promise<Buffer> {
  const { fonts, logo, climber } = await assets();
  const title = opts.title.length > 90 ? `${opts.title.slice(0, 87).trim()}…` : opts.title;
  const size = title.length > 60 ? 46 : title.length > 36 ? 54 : 62;

  const right = opts.photoPath
    ? h('img', { width: 480, height: H, objectFit: 'cover' }, undefined, {
        src: `data:image/jpeg;base64,${(await sharp(opts.photoPath).resize(480, H, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82 }).toBuffer()).toString('base64')}`,
        width: 480,
        height: H,
      })
    : h('div', { display: 'flex', position: 'relative', width: 480, height: H, background: '#111c2b' }, [
        h('div', {
          position: 'absolute',
          left: 250,
          top: -40,
          width: 46,
          height: H + 80,
          background: RED,
          transform: 'rotate(14deg)',
        }),
        h('img', { position: 'absolute', left: 150, top: 90, height: 470 }, undefined, { src: climber, height: 470 }),
      ]);

  const tree = h('div', { display: 'flex', width: W, height: H, background: NAVY, fontFamily: 'Montserrat' }, [
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: W - 480,
        height: H,
        padding: '48px 56px 44px',
        color: '#fff',
        borderBottom: `10px solid ${RED}`,
      },
      [
        h('img', { height: 104 }, undefined, { src: logo, height: 104 }),
        h('div', { display: 'flex', flexDirection: 'column' }, [
          ...(opts.eyebrow
            ? [
                h(
                  'div',
                  {
                    display: 'flex',
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    color: '#fa3844',
                    marginBottom: 14,
                  },
                  opts.eyebrow,
                ),
              ]
            : []),
          h('div', { fontFamily: 'Archivo', fontSize: size, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5 }, title),
        ]),
        h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 22, color: '#c9d4e2' }, [
          h('div', { display: 'flex' }, 'ropeaccesscenter.id'),
          h(
            'div',
            { display: 'flex', background: RED, color: '#fff', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 20 },
            `WhatsApp ${site.phoneDisplay}`,
          ),
        ]),
      ],
    ),
    right,
  ]);

  const svg = await satori(tree as never, { width: W, height: H, fonts });
  return sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
}

/** "/" -> "/og/index.jpg", "/a/" -> "/og/a.jpg", "/en/a/" -> "/og/en/a.jpg" */
export function ogPath(path: string): string {
  const clean = path.replace(/^\/|\/$/g, '');
  if (!clean) return '/og/index.jpg';
  if (clean === 'en') return '/og/en/index.jpg';
  return `/og/${clean}.jpg`;
}
