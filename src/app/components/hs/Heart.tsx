import type { Language } from '../../locales';
import { HsIcon } from './icons';
import { tx } from './text';

interface HsHeartProps {
  on: boolean;
  onToggle: () => void;
  language: Language;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}

const LABEL = {
  save: { ko: '찜하기', en: 'Save dish', ar: 'حفظ الطبق', 'zh-CN': '收藏', ja: 'お気に入りに追加', 'zh-TW': '收藏', es: 'Guardar plato' },
  unsave: { ko: '찜 해제', en: 'Remove saved dish', ar: 'إزالة الطبق المحفوظ', 'zh-CN': '取消收藏', ja: 'お気に入りを解除', 'zh-TW': '取消收藏', es: 'Quitar de guardados' },
};

/**
 * 메뉴 찜 하트. 모든 화면에서 같은 모양 하나(40px 원).
 * 켜짐: 코랄 바탕 + 주황 채운 하트 / 꺼짐: 연회색 바탕 + 회색 선 하트.
 * 판정 화면 '판정색 외 무채색' 규칙의 예외.
 */
export function HsHeart({ on, onToggle, language, disabled = false, busy = false, className = '' }: HsHeartProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={tx(language, on ? LABEL.unsave : LABEL.save)}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={onToggle}
      className={`relative inline-flex size-[var(--hs-size-heart)] flex-none items-center justify-center rounded-hs-pill before:absolute before:-inset-0.5 before:content-[''] disabled:opacity-50 ${on ? 'bg-hs-coral-100 text-hs-orange-500' : 'bg-hs-surface-100 text-hs-ink-400'} ${className}`}
    >
      <HsIcon name="heart" size={20} filled={on} strokeWidth={on ? 2 : 2.2} />
    </button>
  );
}
