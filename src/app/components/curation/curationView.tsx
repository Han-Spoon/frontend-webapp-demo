import { useEffect, useState } from 'react';
import type { CurationArticle, CurationTag } from '../../constants/curation';
import { tagLabel } from '../../constants/curation';
import { LANGUAGE_LOCALES, translateText, type Language } from '../../locales';
import { CategoryTag } from '../hs/Chip';
import { FLIP_RTL, HsIcon } from '../hs/icons';
import { tx, type AllText } from '../hs/text';

export const CURATION_TEXT = {
  reference: { ko: '참고 사진', en: 'Reference photo', ar: 'صورة مرجعية', 'zh-CN': '参考图片', ja: '参考写真', 'zh-TW': '參考圖片', es: 'Foto de referencia' },
  imageNote: { ko: '사진은 글의 이해를 돕는 참고 이미지입니다.', en: 'Photos are reference images to help illustrate the story.', ar: 'الصور مرجعية لتوضيح المقال.', 'zh-CN': '图片为帮助理解文章的参考图片。', ja: '写真は記事の理解を助ける参考イメージです。', 'zh-TW': '圖片為幫助理解文章的參考圖片。', es: 'Las fotos son imágenes de referencia para ilustrar el artículo.' },
  imageFailed: { ko: '사진을 불러오지 못했어요', en: 'Image unavailable', ar: 'الصورة غير متاحة', 'zh-CN': '无法加载图片', ja: '写真を読み込めませんでした', 'zh-TW': '無法載入圖片', es: 'Imagen no disponible' },
} satisfies Record<string, AllText>;

/** 사진이 없거나 못 불러올 때 바탕 · 작은 태그 글자색(카테고리 태그와 같은 계열) */
export const CATEGORY_BG: Record<CurationTag, string> = {
  culture: 'bg-hs-mint-100',
  food: 'bg-hs-coral-100',
  restaurant: 'bg-hs-surface-100',
  tips: 'bg-hs-caution-100',
};
export const CATEGORY_TEXT: Record<CurationTag, string> = {
  culture: 'text-hs-brand-700',
  food: 'text-hs-coral-700',
  restaurant: 'text-hs-ink-700',
  tips: 'text-hs-caution-700',
};

/** 목록 · 카드 둘째 줄: 부제가 있으면 부제, 없으면 요약 */
export const articleSubtitle = (article: CurationArticle, language: Language) =>
  translateText(language, article.subtitle ?? article.excerpt);

/** 글 사진. 못 불러오면 카테고리 색 바탕 + 그릇 아이콘(글자는 스크린리더에만). */
export function ArticlePhoto({ article, language, className }: { article: CurationArticle; language: Language; className: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [article.image]);
  if (failed) {
    return (
      <div role="img" aria-label={tx(language, CURATION_TEXT.imageFailed)} className={`${className} flex items-center justify-center ${CATEGORY_BG[article.tag]} ${CATEGORY_TEXT[article.tag]}`}>
        <HsIcon name="bowl" size={28} />
      </div>
    );
  }
  return <img src={article.image} alt="" loading="lazy" onError={() => setFailed(true)} style={{ objectPosition: article.imagePosition ?? 'center' }} className={`${className} object-cover`} />;
}

/** 사진 위 '참고 사진' 작은 표시 */
export function ReferenceBadge({ language, className = '' }: { language: Language; className?: string }) {
  return <span className={`absolute rounded-[8px] bg-[rgba(23,32,28,0.55)] px-[7px] py-0.5 text-[10px] font-bold text-hs-surface-0 ${className}`}>{tx(language, CURATION_TEXT.reference)}</span>;
}

/** 전체 칼럼 · 찾은 이야기 목록 한 줄: 사진(그릇 모양) · 카테고리 태그 · 제목 · 부제 */
export function ArticleRow({ article, language, onOpen }: { article: CurationArticle; language: Language; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 border-b-[1.5px] border-hs-line-200 py-2.5 text-start">
        <ArticlePhoto article={article} language={language} className={`h-20 w-[92px] flex-none rounded-t-[18px] rounded-b-[30px] ${CATEGORY_BG[article.tag]}`} />
        <span className="min-w-0 flex-1">
          <CategoryTag category={article.tag}>{tagLabel(article.tag, language)}</CategoryTag>
          <span className="mt-[5px] block text-[15px] leading-[1.35] font-black text-hs-ink-900">{translateText(language, article.title)}</span>
          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-[1.45] font-semibold text-hs-ink-500">{articleSubtitle(article, language)}</span>
        </span>
      </button>
    </li>
  );
}

/** 상세 아래 '다음 한 입의 이야기' 한 줄(작은 사진 · 카테고리 글자 · 제목 · 부제 · ›) */
export function NextArticleRow({ article, language, onOpen, last }: { article: CurationArticle; language: Language; onOpen: () => void; last: boolean }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className={`flex w-full items-center gap-3.5 py-3 text-start ${last ? '' : 'border-b-[1.5px] border-hs-line-200'}`}>
        <ArticlePhoto article={article} language={language} className={`h-[60px] w-[68px] flex-none rounded-t-[16px] rounded-b-[26px] ${CATEGORY_BG[article.tag]}`} />
        <span className="min-w-0 flex-1">
          <span className={`block text-[11px] font-black ${CATEGORY_TEXT[article.tag]}`}>{tagLabel(article.tag, language)}</span>
          <span className="mt-0.5 block text-[15px] leading-[1.35] font-black text-hs-ink-900">{translateText(language, article.title)}</span>
          <span className="mt-0.5 block truncate text-[12px] font-semibold text-hs-ink-500">{articleSubtitle(article, language)}</span>
        </span>
        <HsIcon name="forward" size={18} strokeWidth={2.4} className={`flex-none text-hs-ink-400 ${FLIP_RTL}`} />
      </button>
    </li>
  );
}

const DAY = 86_400_000;

/** 신규 칼럼 날짜 표시: 오늘 · N일 전 · N주 전 · N개월 전(언어별) */
export function relativeDate(iso: string, language: Language, now = new Date()) {
  const then = new Date(`${iso}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(0, Math.round((today.getTime() - then.getTime()) / DAY));
  const format = new Intl.RelativeTimeFormat(LANGUAGE_LOCALES[language], { numeric: 'auto' });
  if (days < 7) return format.format(-days, 'day');
  if (days < 30) return format.format(-Math.floor(days / 7), 'week');
  if (days < 365) return format.format(-Math.floor(days / 30), 'month');
  return format.format(-Math.floor(days / 365), 'year');
}

/** 이 달의 칼럼 달 표시(예: 11월) */
export const monthLabel = (language: Language, now = new Date()) =>
  new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], { month: 'long' }).format(now);

/** 글 날짜 2026.06.05 */
export const dotDate = (iso: string) => iso.slice(0, 10).replaceAll('-', '.');
