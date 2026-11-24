import { useState } from 'react';
import type { StoreMenu } from '../../../api/store';
import { menuPrice } from '../../demo/currency';
import type { Language } from '../../types';
import { HsIcon } from '../hs/icons';
import { tx, type AllText } from '../hs/text';

export const MENU_ROW_TEXT = {
  priceUnknown: { ko: '가격 확인 필요', en: 'Check the price', ar: 'تحقق من السعر', 'zh-CN': '价格需确认', ja: '価格は要確認', 'zh-TW': '價格需確認', es: 'Consulta el precio' },
  photo: { ko: '사진', en: 'Photo', ar: 'الصورة', 'zh-CN': '图片', ja: '写真', 'zh-TW': '圖片', es: 'Foto' },
  noPhoto: { ko: '사진 없음', en: 'No photo', ar: 'لا توجد صورة', 'zh-CN': '无图片', ja: '写真なし', 'zh-TW': '無圖片', es: 'Sin foto' },
} satisfies Record<string, AllText>;

/**
 * 잘리지 않게 전체(contain) + 남는 곳 어두운 바탕(디자인 시스템 사진 규칙).
 * 주소가 없거나 불러오기에 실패하면 `fallback`(사진 없음 칸 등)을 그린다.
 */
export function ContainPhoto({ src, alt, className, fallback }: { src?: string | null; alt: string; className: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <>{fallback}</>;
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-[#1F2623] ${className}`}>
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(src)} className="h-full w-full object-contain" />
    </div>
  );
}

/** 메뉴 사진 없음 칸(surface-100 + 그림 아이콘) */
export function NoPhotoTile({ language, className }: { language: Language; className: string }) {
  return (
    <div role="img" aria-label={tx(language, MENU_ROW_TEXT.noPhoto)} className={`flex items-center justify-center bg-hs-surface-100 text-[#A9B4AF] ${className}`}>
      <HsIcon name="photo" size={26} strokeWidth={2} />
    </div>
  );
}

/**
 * 가게 상세 · 메뉴 탭의 메뉴 한 줄(디자인 시스템 StoreMenuRow).
 * 사진 · 이름 · 번역 이름 · ₩가격 + 고정 환율 환산 · 가격 옵션 · 설명 · 사진 출처. **판정 · 하트 없음**, 누르는 동작 없음.
 */
export function StoreMenuRow({ language, menu }: { language: Language; menu: StoreMenu }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const price = menuPrice(menu.priceText ?? undefined, language);
  const options = (menu.priceOptions ?? [])
    .map((option) => ({ label: option.label, price: menuPrice(option.priceText, language)?.original ?? option.priceText }))
    .filter((option) => option.label || option.price);
  const hasPhoto = Boolean(menu.imageUrl) && !photoFailed;
  const tile = 'size-[88px] flex-none rounded-[18px]';

  return (
    <li className="flex gap-3.5 border-b-[1.5px] border-hs-line-200 py-4">
      {menu.imageUrl && !photoFailed ? (
        <div className={`${tile} flex items-center justify-center overflow-hidden bg-[#1F2623]`}>
          <img src={menu.imageUrl} alt={menu.name} loading="lazy" onError={() => setPhotoFailed(true)} className="h-full w-full object-contain" />
        </div>
      ) : (
        <NoPhotoTile language={language} className={tile} />
      )}
      <div className="min-w-0 flex-1">
        <p lang="ko" className="text-[16px] font-black break-words text-hs-ink-900">{menu.name}</p>
        {menu.translatedName && <p dir="auto" className="mt-px text-[13px] font-bold break-words text-hs-ink-500">{menu.translatedName}</p>}
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
          {price ? (
            <>
              <span dir="ltr" className="text-[15px] font-black text-hs-ink-900">{price.original}</span>
              {price.converted && <span dir="ltr" className="text-[12px] font-bold text-hs-ink-500">≈ {price.converted}</span>}
            </>
          ) : (
            <span className="text-[13px] font-extrabold text-hs-ink-500">{tx(language, MENU_ROW_TEXT.priceUnknown)}</span>
          )}
        </p>
        {options.length > 0 && (
          <p className="mt-0.5 text-[12px] font-bold text-hs-ink-500">
            {options.map((option, index) => (
              <span key={`${option.label}-${index}`}>
                {index > 0 && ' · '}
                <span lang="ko">{option.label}</span> <span dir="ltr">{option.price}</span>
              </span>
            ))}
          </p>
        )}
        {menu.description && <p dir="auto" className="mt-1.5 text-[13px] leading-[1.45] font-semibold text-hs-ink-700">{menu.description}</p>}
        {hasPhoto && menu.imageAttribution && (
          <p className="mt-1.5 text-[11px] font-bold text-hs-ink-400">{tx(language, MENU_ROW_TEXT.photo)} · <span dir="auto">{menu.imageAttribution}</span></p>
        )}
      </div>
    </li>
  );
}
