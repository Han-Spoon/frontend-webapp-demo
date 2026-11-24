import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { getScanImage } from '../../../api/scan';
import { ApiError } from '../../../api/user';
import type { Language } from '../../types';
import { LANGUAGE_LOCALES } from '../../locales';
import { useReturnFocus } from '../common/returnFocus';
import { HS_TEXT, HsButton, HsIcon, HsIconButton, tx, type AllText } from '../hs';

const P = {
  title: { ko: '스캔한 메뉴판 사진', en: 'Scanned menu photo', ar: 'صورة القائمة الممسوحة', 'zh-CN': '扫描的菜单照片', ja: 'スキャンしたメニュー写真', 'zh-TW': '掃描的菜單照片', es: 'Foto del menú escaneado' },
  retention: { ko: "메뉴판 사진은 90일 동안 보관하고, 기간이 지나면 '보관 기간이 지나 사진을 볼 수 없어요'로 바뀌어요.", en: 'Menu photos are kept for 90 days. After that, you’ll see “This photo is past its retention period.”', ar: 'تُحفظ صور القوائم لمدة 90 يومًا، وبعدها تظهر رسالة «انتهت مدة حفظ هذه الصورة».', 'zh-CN': '菜单照片保存90天，过期后会显示"已超过保存期限，无法查看照片"。', ja: 'メニュー写真は90日間保管し、期間が過ぎると「保管期間が過ぎたため写真を見られません」と表示されます。', 'zh-TW': '菜單照片保存90天，過期後會顯示「已超過保存期限，無法查看照片」。', es: 'Guardamos las fotos del menú 90 días. Después verás «Esta foto superó su periodo de conservación».' },
  expired: { ko: '보관 기간이 지나 사진을 볼 수 없어요', en: 'This photo is past its retention period.', ar: 'انتهت مدة حفظ هذه الصورة.', 'zh-CN': '已超过保存期限，无法查看照片', ja: '保管期間が過ぎたため写真を見られません', 'zh-TW': '已超過保存期限，無法查看照片', es: 'Esta foto superó su periodo de conservación.' },
  failed: { ko: '사진을 불러오지 못했어요. 다시 시도해 주세요.', en: 'Could not load the photo. Please try again.', ar: 'تعذر تحميل الصورة. حاول مرة أخرى.', 'zh-CN': '无法加载照片，请重试。', ja: '写真を読み込めませんでした。もう一度お試しください。', 'zh-TW': '無法載入照片，請重試。', es: 'No pudimos cargar la foto. Inténtalo de nuevo.' },
} satisfies Record<string, AllText>;

const untilText = (iso: string, language: Language): Record<Language, string> | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const d = new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  return { ko: `${d}까지 볼 수 있어요.`, en: `Available until ${d}.`, ar: `متاحة حتى ${d}.`, 'zh-CN': `可查看至${d}。`, ja: `${d}まで見られます。`, 'zh-TW': `可查看至${d}。`, es: `Disponible hasta el ${d}.` };
};

/** F4-12 메뉴판 사진 전체 화면(어두운 바탕). 기기 사진이 없으면 서버 사진을 받는다(410 = 보관 기간 지남). */
export function MenuPhotoViewer({ language, localUrl, scanId, onClose }: { language: Language; localUrl: string | null; scanId?: string; onClose: () => void }) {
  const returnFocus = useReturnFocus();
  const [url, setUrl] = useState<string | null>(localUrl);
  const [until, setUntil] = useState<string | null>(null);
  const [state, setState] = useState<'ready' | 'loading' | 'expired' | 'failed'>(localUrl ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (localUrl || !scanId) { if (!localUrl) setState('failed'); return; }
    let active = true;
    setState('loading');
    getScanImage(scanId)
      .then((image) => { if (!active) return; setUrl(image.imageUrl); setUntil(image.availableUntil); setState('ready'); })
      .catch((error) => { if (active) setState(error instanceof ApiError && error.status === 410 ? 'expired' : 'failed'); });
    return () => { active = false; };
  }, [localUrl, scanId, attempt]);

  const untilLine = until ? untilText(until, language)?.[language] : null;
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Content aria-describedby={undefined} onCloseAutoFocus={returnFocus} dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-[55] mx-auto flex w-full max-w-[430px] flex-col bg-[#101413] px-4 pt-[18px] pb-[max(20px,env(safe-area-inset-bottom))] text-hs-surface-0 focus:outline-none">
          <div className="flex items-center gap-2">
            <Dialog.Close asChild><HsIconButton icon="x" tone="ghost" label={tx(language, HS_TEXT.close)} className="bg-white/10! text-hs-surface-0!" /></Dialog.Close>
            <Dialog.Title className="min-w-0 flex-1 text-center text-[16px] font-black">{tx(language, P.title)}</Dialog.Title>
            <span className="size-11 flex-none" aria-hidden="true" />
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            {state === 'ready' && url && (
              <img src={url} alt={tx(language, P.title)} onError={() => { setUrl(null); setState('failed'); }} className="max-h-full max-w-full rounded-hs-sm object-contain" />
            )}
            {state === 'loading' && <p role="status" className="text-[14px] font-bold text-white/70">{tx(language, HS_TEXT.loading)}</p>}
            {(state === 'expired' || state === 'failed') && (
              <div className="text-center">
                <HsIcon name="photo" size={32} className="mx-auto text-white/60" />
                <p role="alert" className="mt-3 text-[15px] font-black">{tx(language, state === 'expired' ? P.expired : P.failed)}</p>
                {state === 'failed' && scanId && !localUrl && <HsButton variant="outline" size="md" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>{tx(language, HS_TEXT.retry)}</HsButton>}
              </div>
            )}
          </div>
          <p className="flex gap-2 rounded-hs-xl bg-white/10 px-4 py-3.5 text-[13px] leading-[1.5] font-bold text-white/90">
            <HsIcon name="alert" size={14} strokeWidth={2.4} className="mt-0.5 flex-none" />
            <span>{untilLine ? `${untilLine} ` : ''}{tx(language, P.retention)}</span>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
