import type { Language } from '../../locales';
import { speak, ttsSupported } from '../../utils/speech';
import { HsIcon } from './icons';
import { HS_TEXT, tx } from './text';

interface StaffCardProps {
  language: Language;
  /** 직원이 읽는 한국어 문장(큰 글씨, 항상 한국어) */
  korean: string;
  /** 사용자가 읽는 번역(앱 언어, 한국어 앱이면 영어). 한국어 문장과 같으면 표시하지 않는다. */
  translated?: string;
  /** 위 작은 줄(기본: 직원에게 보여주세요) */
  kicker?: string;
  size?: 'lg' | 'xl' | 'md';
  /** 한국어 음성 듣기 버튼(음성을 지원하지 않는 기기에서는 숨김) */
  voice?: boolean;
  className?: string;
}

/**
 * 직원에게 보여주는 문장 카드(직원 소통 카드, 자주 쓰는 문장, 내 식단 보여주기).
 * 내 식단이 들어가는 문장은 재료마다 한 장으로 만들어 넘긴다(묶지 않음).
 */
export function StaffCard({ language, korean, translated, kicker, size = 'lg', voice = true, className = '' }: StaffCardProps) {
  const sentence = size === 'xl' ? 'hs-staff-xl' : size === 'md' ? 'text-[22px] leading-[1.35] font-black' : 'hs-staff-lg';
  return (
    <div className={`rounded-[28px] bg-hs-mint-100 px-5 pt-5 pb-[18px] ${className}`}>
      <p className="text-[12px] font-extrabold text-hs-brand-700">{kicker ?? tx(language, HS_TEXT.showStaff)}</p>
      <p lang="ko" className={`mt-2 break-keep text-hs-ink-900 ${sentence}`}>{korean}</p>
      {translated && translated !== korean && <p className="mt-2 text-[14px] font-semibold text-hs-ink-700">{translated}</p>}
      {voice && ttsSupported && (
        <button
          type="button"
          onClick={() => speak(korean, 'ko-KR')}
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-hs-pill bg-hs-surface-0 px-3.5 text-[13px] font-extrabold text-hs-brand-700"
        >
          <HsIcon name="speaker" size={16} />
          {tx(language, HS_TEXT.listenKorean)}
        </button>
      )}
    </div>
  );
}

export interface AnswerOption<T extends string> {
  value: T;
  label: string;
}

/**
 * 직원의 대답을 기록하는 큰 버튼 줄(그릇 모양 20 / 30, 64 높이, 글자만).
 * 선택됨: 2px ink-900 테두리(다시 눌러 고칠 수 있음).
 */
export function AnswerButtons<T extends string>({ options, value, onChange, label, disabled = false }: { options: AnswerOption<T>[]; value: T | null; onChange: (value: T) => void; label: string; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`min-h-16 flex-1 break-keep rounded-t-[20px] rounded-b-[30px] bg-hs-surface-0 px-1.5 py-2 text-[15px] leading-[1.25] font-black text-hs-ink-900 disabled:opacity-50 ${on ? 'border-2 border-hs-ink-900' : 'border-[1.5px] border-hs-line-300'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
