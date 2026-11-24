import type { ReactNode } from 'react';
import type { Language } from '../../locales';
import { HsLinkButton } from './Button';
import { CategoryTag, DietTag, type CurationCategory } from './Chip';
import { HsIconButton } from './IconButton';
import { HsIcon } from './icons';
import { RiskCountBadge } from './RiskBadge';
import { tx, txn, type AllText, type CountText } from './text';

/* ───────────── StoreCard ───────────── */

const T_STORE = {
  reviews: { ko: (n) => `후기 ${n}`, en: (n) => `${n} review${n === 1 ? '' : 's'}`, ar: (n) => `${n} تقييمات`, 'zh-CN': (n) => `评价 ${n}`, ja: (n) => `レビュー ${n}`, 'zh-TW': (n) => `評價 ${n}`, es: (n) => `${n} reseña${n === 1 ? '' : 's'}` } satisfies CountText,
  save: { ko: '가게 저장', en: 'Save restaurant', ar: 'حفظ المطعم', 'zh-CN': '收藏店铺', ja: 'お店を保存', 'zh-TW': '收藏店家', es: 'Guardar restaurante' } satisfies AllText,
  unsave: { ko: '가게 저장 해제', en: 'Remove saved restaurant', ar: 'إزالة المطعم المحفوظ', 'zh-CN': '取消收藏店铺', ja: 'お店の保存を解除', 'zh-TW': '取消收藏店家', es: 'Quitar restaurante guardado' } satisfies AllText,
};

const DISTANCE: Record<Language, (d: string) => string> = {
  ko: (d) => `내 위치에서 ${d}`,
  en: (d) => `${d} from you`,
  ar: (d) => `على بُعد ${d} منك`,
  'zh-CN': (d) => `距你 ${d}`,
  ja: (d) => `現在地から ${d}`,
  'zh-TW': (d) => `距你 ${d}`,
  es: (d) => `A ${d} de ti`,
};

const formatDistance = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(1).replace(/\.0$/, '')}km` : `${Math.round(meters)}m`);

/** 도로명 주소에서 구 · 군 이름을 잘라 지역으로 쓴다(예: 서울 성동구 … → 성동구). 없으면 시 · 도. */
export function districtOf(roadAddress?: string | null): string | null {
  if (!roadAddress) return null;
  const parts = roadAddress.trim().split(/\s+/);
  return parts.find((part) => /[구군]$/.test(part)) ?? parts.find((part) => /시$/.test(part)) ?? null;
}

export interface StoreCardProps {
  language: Language;
  name: string;
  reviewCount?: number | null;
  district?: string | null;
  category?: string | null;
  /** 좌표 없이 검색하면 null → 줄 숨김 */
  distanceMeters?: number | null;
  saved?: boolean;
  onToggleSave?: () => void;
  onClick?: () => void;
  /** 선택된 가게 */
  selected?: boolean;
  className?: string;
}

/**
 * 가게 한 곳(지도 목록 · 식당 선택 · 칼럼 속 식당 · 홈). API No 27이 주는 값만:
 * 이름 · 후기 N · 지역(구) · 음식 종류 · 내 위치에서 Nm · 저장(책갈피). 층 · 메뉴 태그 · 평점 · 사진 · 영업시간은 없다.
 */
export function StoreCard({ language, name, reviewCount, district, category, distanceMeters, saved, onToggleSave, onClick, selected = false, className = '' }: StoreCardProps) {
  const meta = [typeof reviewCount === 'number' ? txn(language, T_STORE.reviews, reviewCount) : null, district, category].filter(Boolean).join(' · ');
  const body = (
    <>
      <span className="block text-[16px] font-black text-hs-ink-900">{name}</span>
      {meta && <span className="mt-[3px] block text-[13px] font-semibold text-hs-ink-500">{meta}</span>}
      {typeof distanceMeters === 'number' && (
        <span className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-extrabold text-hs-brand-700">
          <HsIcon name="pin" size={13} strokeWidth={2.4} />
          <span>{DISTANCE[language](formatDistance(distanceMeters))}</span>
        </span>
      )}
    </>
  );
  return (
    <div className={`flex items-center gap-2 rounded-3xl bg-hs-surface-0 py-3.5 ps-[18px] pe-2.5 ${selected ? 'border-2 border-hs-brand-700' : 'border-[1.5px] border-hs-line-200'} ${className}`}>
      {onClick ? (
        <button type="button" onClick={onClick} className="min-w-0 flex-1 text-start">{body}</button>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
      {onToggleSave && (
        <HsIconButton
          icon="bookmark"
          tone="ghost"
          label={tx(language, saved ? T_STORE.unsave : T_STORE.save)}
          aria-pressed={saved}
          onClick={onToggleSave}
          className={saved ? 'text-hs-brand-700 [&_svg]:fill-current' : 'text-hs-ink-500'}
        />
      )}
    </div>
  );
}

/* ───────────── ScanHistoryCard ───────────── */

const T_HISTORY = {
  menus: { ko: (n) => `메뉴 ${n}개`, en: (n) => `${n} dish${n === 1 ? '' : 'es'}`, ar: (n) => `${n} أطباق`, 'zh-CN': (n) => `菜品 ${n} 个`, ja: (n) => `メニュー ${n}件`, 'zh-TW': (n) => `餐點 ${n} 道`, es: (n) => `${n} plato${n === 1 ? '' : 's'}` } satisfies CountText,
  caution: { ko: (n) => `주의 ${n}개`, en: (n) => `Caution ${n}`, ar: (n) => `تنبيه ${n}`, 'zh-CN': (n) => `注意 ${n} 个`, ja: (n) => `注意 ${n}件`, 'zh-TW': (n) => `注意 ${n} 道`, es: (n) => `Precaución ${n}` } satisfies CountText,
  danger: { ko: (n) => `위험 ${n}개`, en: (n) => `Danger ${n}`, ar: (n) => `خطر ${n}`, 'zh-CN': (n) => `危险 ${n} 个`, ja: (n) => `危険 ${n}件`, 'zh-TW': (n) => `危險 ${n} 道`, es: (n) => `Peligro ${n}` } satisfies CountText,
  more: { ko: '기록 메뉴', en: 'Record options', ar: 'خيارات السجل', 'zh-CN': '记录选项', ja: '記録メニュー', 'zh-TW': '紀錄選項', es: 'Opciones del registro' } satisfies AllText,
};

export interface ScanHistoryCardProps {
  language: Language;
  title: string;
  /** 제목이 일시와 같으면(기본 제목) 둘째 줄 일시는 다시 쓰지 않는다 */
  dateText: string;
  storeName?: string | null;
  menuCount: number;
  /** 목록 API(No 17)에는 주의 · 위험 개수만 있다(안전 개수 없음) */
  cautionCount?: number | null;
  dangerCount?: number | null;
  onOpen: () => void;
  /** ··· 메뉴(이름 수정 · 삭제) */
  onMore?: () => void;
  /** 제목 자리에 바로 입력(이름 수정)할 때 */
  titleSlot?: ReactNode;
  footer?: ReactNode;
}

/** 스캔 기록 한 건(회색 영역 위 흰 카드, shadow-card, 테두리 없음) */
export function ScanHistoryCard({ language, title, dateText, storeName, menuCount, cautionCount, dangerCount, onOpen, onMore, titleSlot, footer }: ScanHistoryCardProps) {
  const showDate = title.trim() !== dateText.trim();
  return (
    <div className="rounded-hs-xl bg-hs-surface-0 py-3.5 ps-4 pe-2 shadow-hs-card">
      <div className="flex items-start gap-1">
        {titleSlot ?? (
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1 text-start">
            <span className="block truncate text-[15px] font-black text-hs-ink-900">{title}</span>
            {(storeName || showDate) && (
              <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {storeName && (
                  <span className="inline-flex items-center gap-[3px] text-[12px] font-extrabold text-hs-brand-700">
                    <HsIcon name="pin" size={12} strokeWidth={2.4} />
                    {storeName}
                  </span>
                )}
                {showDate && <span dir="ltr" className="text-[12px] font-semibold text-hs-ink-500">{dateText}</span>}
              </span>
            )}
            <span className="mt-2.5 flex flex-wrap items-center gap-[5px]">
              <span className="text-[12px] font-extrabold text-hs-ink-700">{txn(language, T_HISTORY.menus, menuCount)}</span>
              {typeof cautionCount === 'number' && cautionCount > 0 && <RiskCountBadge risk="caution">{txn(language, T_HISTORY.caution, cautionCount)}</RiskCountBadge>}
              {typeof dangerCount === 'number' && dangerCount > 0 && <RiskCountBadge risk="danger">{txn(language, T_HISTORY.danger, dangerCount)}</RiskCountBadge>}
            </span>
          </button>
        )}
        {onMore && <HsIconButton icon="more" tone="ghost" label={tx(language, T_HISTORY.more)} onClick={onMore} className="text-hs-ink-500" />}
      </div>
      {footer}
    </div>
  );
}

/* ───────────── ReviewCard ───────────── */

export type ReviewAnswerValue = 'present' | 'absent' | 'unknown';

const T_REVIEW = {
  present: { ko: '있었어요', en: 'It had it', ar: 'كان موجودًا', 'zh-CN': '含有', ja: '入っていた', 'zh-TW': '含有', es: 'Lo tenía' } satisfies AllText,
  absent: { ko: '없었어요', en: "It didn't", ar: 'لم يكن موجودًا', 'zh-CN': '不含', ja: '入っていなかった', 'zh-TW': '不含', es: 'No lo tenía' } satisfies AllText,
  unknown: { ko: '잘 모르겠어요', en: 'Not sure', ar: 'لست متأكدًا', 'zh-CN': '不确定', ja: 'よくわからない', 'zh-TW': '不確定', es: 'No estoy seguro' } satisfies AllText,
  edit: { ko: '수정', en: 'Edit', ar: 'تعديل', 'zh-CN': '编辑', ja: '編集', 'zh-TW': '編輯', es: 'Editar' } satisfies AllText,
  delete: { ko: '삭제', en: 'Delete', ar: 'حذف', 'zh-CN': '删除', ja: '削除', 'zh-TW': '刪除', es: 'Eliminar' } satisfies AllText,
  report: { ko: '후기 신고', en: 'Report review', ar: 'الإبلاغ عن التقييم', 'zh-CN': '举报评价', ja: 'レビューを報告', 'zh-TW': '檢舉評價', es: 'Denunciar reseña' } satisfies AllText,
  hidden: { ko: '숨김 처리된 후기', en: 'Hidden review', ar: 'تقييم مخفي', 'zh-CN': '已隐藏的评价', ja: '非表示のレビュー', 'zh-TW': '已隱藏的評價', es: 'Reseña oculta' } satisfies AllText,
};

const ANSWER_COLOR: Record<ReviewAnswerValue, string> = {
  present: 'text-hs-danger-700',
  absent: 'text-hs-safe-700',
  unknown: 'text-hs-ink-500',
};

export interface ReviewCardProps {
  language: Language;
  storeName: string;
  dateText: string;
  /** 겹치는 프로필 조건 칩 */
  profileTags?: string[];
  menus: Array<{ name: string; answers: Array<{ label: string; answer: ReviewAnswerValue }>; comment?: string | null; commentLang?: string | null }>;
  mine?: boolean;
  hidden?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

/** 식사 후기 카드. 작성자 이름 없음(익명). 답은 글자만(아이콘 없음). 메모는 원문 그대로. */
export function ReviewCard({ language, storeName, dateText, profileTags = [], menus, mine = false, hidden = false, onEdit, onDelete, onReport }: ReviewCardProps) {
  return (
    <article className="rounded-hs-xl bg-hs-surface-0 p-3.5 shadow-hs-card">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-black text-hs-ink-900">{storeName}</h3>
        {mine ? (
          <>
            {onEdit && <HsLinkButton tone="brand" onClick={onEdit}>{tx(language, T_REVIEW.edit)}</HsLinkButton>}
            {onDelete && <HsLinkButton tone="danger" onClick={onDelete}>{tx(language, T_REVIEW.delete)}</HsLinkButton>}
          </>
        ) : (
          onReport && <HsIconButton icon="more" tone="ghost" label={tx(language, T_REVIEW.report)} onClick={onReport} className="-my-2 text-hs-ink-500" />
        )}
      </div>
      <p className="mt-0.5 text-[11px] font-bold text-hs-ink-500">{dateText}</p>
      {hidden && <p className="mt-2 inline-flex rounded-hs-pill bg-hs-surface-100 px-2.5 py-1 text-[11px] font-black text-hs-ink-700">{tx(language, T_REVIEW.hidden)}</p>}
      {profileTags.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{profileTags.map((tag) => <DietTag key={tag}>{tag}</DietTag>)}</div>}
      <div className="mt-2.5 space-y-2">
        {menus.map((menu, index) => (
          <div key={`${menu.name}-${index}`} className="rounded-hs-lg bg-hs-surface-100 p-3">
            <p className="text-[14px] font-black text-hs-ink-900">{menu.name}</p>
            {menu.answers.map((row) => (
              <p key={row.label} className="mt-1 text-[13px] font-bold text-hs-ink-700">
                {row.label} · <b className={`font-black ${ANSWER_COLOR[row.answer]}`}>{tx(language, T_REVIEW[row.answer])}</b>
              </p>
            ))}
            {menu.comment && <p lang={menu.commentLang ?? undefined} className="mt-2 text-[13px] font-semibold text-hs-ink-900">{menu.comment}</p>}
          </div>
        ))}
      </div>
    </article>
  );
}

/* ───────────── CurationCard ───────────── */

/** 한식 이야기 카드(판정 결과 목록 끝: 태그 + 제목만, 그림 없음, 흰 바탕 테두리 카드) */
export function CurationCard({ category, categoryLabel, title, onClick, className = '' }: { category: CurationCategory; categoryLabel: string; title: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-28 w-[200px] flex-none flex-col items-start rounded-3xl border-[1.5px] border-hs-line-200 bg-hs-surface-0 p-4 text-start ${className}`}>
      <CategoryTag category={category}>{categoryLabel}</CategoryTag>
      <span className="mt-2.5 text-[16px] leading-[1.35] font-black text-hs-ink-900">{title}</span>
    </button>
  );
}
