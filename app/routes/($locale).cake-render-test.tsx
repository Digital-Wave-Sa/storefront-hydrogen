/**
 * A bench for the new cake renderer, inside Hydrogen.
 *
 * ── Why this route exists ──
 *
 * The engine has to prove three things before it goes anywhere near the real
 * builder, and all three are about the environment rather than the maths:
 *
 *   1. It survives SSR. The engine is browser-only, and if the dynamic import
 *      is wrong the whole route 500s on the server rather than failing softly.
 *   2. Every asset resolves from /public under Oxygen, not just on disk.
 *   3. It is fast enough on a phone. The readout below is the actual number —
 *      not a guess — and it is the one that decides whether we keep the
 *      software rasterizer or move it to WebGL.
 *
 * DELETE THIS ROUTE before launch. It is a diagnostic, it is unlinked from the
 * site, and it exposes every format and filling regardless of what the client
 * has priced.
 */

import {useState, useCallback, useRef} from 'react';
import CakeRenderer from '~/components/CakeBuilder/CakeRenderer';
import {
  CAKE_FORMATS,
  CAKE_FILLINGS,
  CAKE_COLORS,
  CAKE_DECORATIONS,
  CAKE_ANGLES,
  CAKE_VIEWS,
} from '~/lib/cake-render/catalog';
import type {CakeView, CakeAngle} from '~/lib/cake-render/compose';

export function meta() {
  // Never index a diagnostic.
  return [
    {title: 'Cake renderer bench'},
    {name: 'robots', content: 'noindex, nofollow'},
  ];
}

export default function CakeRenderTest() {
  const [formatId, setFormatId] = useState('round-20x20-h8');
  const [fillingId, setFillingId] = useState('07');
  const [colorId, setColorId] = useState('00');
  const [decorationId, setDecorationId] = useState('rose-garden');
  const [view, setView] = useState<CakeView>('whole');
  const [angle, setAngle] = useState<CakeAngle>('original');
  const [message, setMessage] = useState('');
  const [ms, setMs] = useState<number | null>(null);

  // Wall-clock from the moment the props change to the moment pixels land.
  // Started here rather than inside the engine so it includes the texture
  // fetch and the React work, which is what a shopper actually waits through.
  const started = useRef<number>(0);
  started.current = performance.now();

  const onRendered = useCallback(() => {
    setMs(Math.round(performance.now() - started.current));
  }, []);

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border transition ${
      active
        ? 'bg-[#294941] text-white border-[#294941]'
        : 'bg-white text-[#294941] border-gray-200 hover:border-[#294941]'
    }`;

  return (
    <div dir="rtl" className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black text-[#294941]">
          مختبر رسم الكيك
        </h1>
        <p className="text-sm text-gray-500">
          صفحة تشخيص — احذفها قبل الإطلاق. الرقم بالمللي ثانية هو زمن الرسم
          الحقيقي على هذا الجهاز.
        </p>
      </header>

      <div className="grid md:grid-cols-[minmax(0,420px)_1fr] gap-8 items-start">
        <div className="space-y-3">
          <div className="bg-[#f6f1e7] rounded-2xl p-3">
            <CakeRenderer
              formatId={formatId}
              fillingId={fillingId}
              colorId={colorId}
              decorationId={decorationId}
              view={view}
              angle={angle}
              text={{
                value: message,
                color: '#6d3747',
                scale: 1,
                x: 0,
                y: -0.2,
                font: 'Noto Sans Arabic',
              }}
              onRendered={onRendered}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-gray-600 px-1">
            <span>
              {ms === null ? 'لم يُرسم بعد' : `زمن الرسم: ${ms} ms`}
            </span>
            <span>
              {ms === null
                ? ''
                : ms < 250
                  ? 'جيد'
                  : ms < 600
                    ? 'مقبول'
                    : 'بطيء — يحتاج WebGL'}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <Row label="العرض">
            {CAKE_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={pill(view === v.id)}
                onClick={() => setView(v.id as CakeView)}
              >
                {v.nameAr}
              </button>
            ))}
          </Row>

          <Row label="الزاوية">
            {CAKE_ANGLES.map((a) => (
              <button
                key={a.id}
                type="button"
                className={pill(angle === a.id)}
                onClick={() => setAngle(a.id as CakeAngle)}
              >
                {a.nameAr}
              </button>
            ))}
          </Row>

          <Row label={`القالب — ${CAKE_FORMATS.length}`}>
            <select
              value={formatId}
              onChange={(e) => setFormatId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            >
              {CAKE_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nameAr}
                </option>
              ))}
            </select>
          </Row>

          <Row label={`الحشوة — ${CAKE_FILLINGS.length}`}>
            <select
              value={fillingId}
              onChange={(e) => setFillingId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            >
              {CAKE_FILLINGS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nameAr}
                </option>
              ))}
            </select>
          </Row>

          <Row label={`التزيين — ${CAKE_DECORATIONS.length}`}>
            <select
              value={decorationId}
              onChange={(e) => setDecorationId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            >
              {CAKE_DECORATIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr}
                </option>
              ))}
            </select>
          </Row>

          <Row label={`اللون — ${CAKE_COLORS.length}`}>
            <div className="flex flex-wrap gap-1.5">
              {CAKE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.nameAr}
                  aria-label={c.nameAr}
                  onClick={() => setColorId(c.id)}
                  className={`w-7 h-7 rounded-md border cursor-pointer ${
                    colorId === c.id
                      ? 'ring-2 ring-offset-2 ring-[#294941] border-transparent'
                      : 'border-black/15'
                  }`}
                  style={{background: c.id === '00' ? '#f5f3ee' : c.hex}}
                />
              ))}
            </div>
          </Row>

          <Row label="الكتابة">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 40))}
              maxLength={40}
              placeholder="كل سنة وأنت بخير"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            />
          </Row>

          <p className="text-xs text-gray-500 leading-relaxed max-w-prose">
            ما يستحق الفحص: هل تبقى طبقات الحشوة ملتصقة بوجه القطع عند تغيير
            الزاوية؟ هل يجلس التزيين على حافة القالب في كل زاوية؟ وهل «القطعة»
            بالزاوية الأساسية على قالب دائري تبدو كصورة حقيقية — فهي وحدها
            مبنية من صورة، والباقي مرسوم.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold tracking-wider uppercase text-gray-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 items-center">{children}</div>
    </div>
  );
}
