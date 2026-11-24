import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReportReason, RestaurantReview } from '../../../api/reviews';
import type { Language, UserProfile } from '../../types';
import { HsButton } from '../hs/Button';
import { DietTag } from '../hs/Chip';
import { HsIconButton } from '../hs/IconButton';
import { FLIP_RTL, HsIcon } from '../hs/icons';
import { EmptyState, ErrorState, InlineError, SkeletonCard } from '../hs/StateBlocks';
import { HS_TEXT, tx, type AllText } from '../hs/text';
import { ChipMenu } from './ChipMenu';
import { REVIEW_TEXT, answerLabel, profileIds, profileTagText, toAnswerValue } from './reviewText';

const T = {
  all: { ko: '전체', en: 'All', ar: 'الكل', 'zh-CN': '全部', ja: 'すべて', 'zh-TW': '全部', es: 'Todo' },
  myDiet: { ko: '내 식단', en: 'My diet', ar: 'نظامي الغذائي', 'zh-CN': '我的饮食', ja: '私の食事', 'zh-TW': '我的飲食', es: 'Mi dieta' },
  myDietAll: { ko: '내 식단 전체', en: 'All my conditions', ar: 'كل شروطي', 'zh-CN': '我的全部条件', ja: '私の条件すべて', 'zh-TW': '我的全部條件', es: 'Todas mis condiciones' },
  menu: { ko: '메뉴', en: 'Menu', ar: 'الطبق', 'zh-CN': '菜品', ja: 'メニュー', 'zh-TW': '餐點', es: 'Plato' },
  filters: { ko: '후기 거르기', en: 'Filter reviews', ar: 'تصفية المراجعات', 'zh-CN': '筛选评价', ja: 'レビューを絞り込む', 'zh-TW': '篩選評價', es: 'Filtrar reseñas' },
  visitor: { ko: '방문자 후기', en: 'Visitor review', ar: 'مراجعة زائر', 'zh-CN': '访客评价', ja: '訪問者のレビュー', 'zh-TW': '訪客評價', es: 'Reseña de visitante' },
  mine: { ko: '내 후기', en: 'My review', ar: 'مراجعتي', 'zh-CN': '我的评价', ja: '私のレビュー', 'zh-TW': '我的評價', es: 'Mi reseña' },
  more: { ko: '후기 신고', en: 'Report review', ar: 'الإبلاغ عن المراجعة', 'zh-CN': '举报评价', ja: 'レビューを報告', 'zh-TW': '檢舉評價', es: 'Denunciar reseña' },
  reportTitle: { ko: '신고 사유를 선택해 주세요.', en: 'Choose a reason for reporting.', ar: 'اختر سبب الإبلاغ.', 'zh-CN': '请选择举报原因。', ja: '報告の理由を選んでください。', 'zh-TW': '請選擇檢舉原因。', es: 'Elige el motivo de la denuncia.' },
  reported: { ko: '신고가 접수됐어요.', en: 'Report received.', ar: 'تم استلام البلاغ.', 'zh-CN': '已收到举报。', ja: '報告を受け付けました。', 'zh-TW': '已收到檢舉。', es: 'Denuncia recibida.' },
  reportFailed: { ko: '신고를 접수하지 못했어요. 다시 시도해 주세요.', en: 'Could not send the report. Please try again.', ar: 'تعذر إرسال البلاغ. حاول مرة أخرى.', 'zh-CN': '举报提交失败，请重试。', ja: '報告を送信できませんでした。もう一度お試しください。', 'zh-TW': '檢舉提交失敗，請重試。', es: 'No se pudo enviar la denuncia. Inténtalo de nuevo.' },
  empty: { ko: '아직 후기가 없어요', en: 'No reviews yet', ar: 'لا توجد مراجعات بعد', 'zh-CN': '还没有评价', ja: 'まだレビューはありません', 'zh-TW': '還沒有評價', es: 'Aún no hay reseñas' },
  emptyBody: { ko: '이 식당에서 먹은 메뉴의 경험을 처음으로 남겨 주세요.', en: 'Be the first to share how your meal went here.', ar: 'كن أول من يشارك تجربة وجبته هنا.', 'zh-CN': '来第一个分享在这家店的用餐体验吧。', ja: 'このお店で食べたメニューの体験を最初に残してください。', 'zh-TW': '來第一個分享在這家店的用餐體驗吧。', es: 'Sé la primera persona en contar cómo fue tu comida aquí.' },
  noFiltered: { ko: '선택한 조건의 후기가 없어요', en: 'No reviews match this filter', ar: 'لا توجد مراجعات تطابق هذا المرشح', 'zh-CN': '没有符合条件的评价', ja: '条件に合うレビューはありません', 'zh-TW': '沒有符合條件的評價', es: 'Ninguna reseña coincide con el filtro' },
  clear: { ko: '전체 보기', en: 'Show all', ar: 'عرض الكل', 'zh-CN': '查看全部', ja: 'すべて表示', 'zh-TW': '查看全部', es: 'Ver todo' },
  present: { ko: '있었어요', en: 'It had it', ar: 'كان موجودًا', 'zh-CN': '含有', ja: '入っていた', 'zh-TW': '含有', es: 'Lo tenía' },
  absent: { ko: '없었어요', en: "It didn't", ar: 'لم يكن موجودًا', 'zh-CN': '不含', ja: '入っていなかった', 'zh-TW': '不含', es: 'No lo tenía' },
  unknown: { ko: '잘 모르겠어요', en: 'Not sure', ar: 'لست متأكدًا', 'zh-CN': '不确定', ja: 'よくわからない', 'zh-TW': '不確定', es: 'No estoy seguro' },
} satisfies Record<string, AllText>;

const REASONS: Array<[ReportReason, AllText]> = [
  ['AD_SPAM', { ko: '광고·스팸', en: 'Ads or spam', ar: 'إعلان أو رسائل مزعجة', 'zh-CN': '广告·垃圾信息', ja: '広告・スパム', 'zh-TW': '廣告·垃圾訊息', es: 'Publicidad o spam' }],
  ['INAPPROPRIATE', { ko: '부적절한 내용', en: 'Inappropriate content', ar: 'محتوى غير لائق', 'zh-CN': '不当内容', ja: '不適切な内容', 'zh-TW': '不當內容', es: 'Contenido inapropiado' }],
  ['FALSE_INFORMATION', { ko: '허위 정보', en: 'False information', ar: 'معلومات خاطئة', 'zh-CN': '虚假信息', ja: '虚偽の情報', 'zh-TW': '不實資訊', es: 'Información falsa' }],
  ['OTHER', { ko: '기타', en: 'Other', ar: 'أخرى', 'zh-CN': '其他', ja: 'その他', 'zh-TW': '其他', es: 'Otro' }],
];

const ANSWER_COLOR = { present: 'text-hs-danger-700', absent: 'text-hs-safe-700', unknown: 'text-hs-ink-500' } as const;

type DietFilter = 'mine' | string;

/** F2-05 가게 후기 전체 화면: 전체 · 내 식단 · 메뉴로 거르기, 주의 안내, 방문자 후기, 신고, [후기 작성] */
export function StoreReviewsScreen({ language, storeName, profile, reviews, loading, error, canWrite, onRetry, onBack, onReport, onWrite }: {
  language: Language;
  storeName: string;
  profile: UserProfile | null;
  reviews: RestaurantReview[];
  loading: boolean;
  error: boolean;
  /** 후기 기능 준비 중이면 false */
  canWrite: boolean;
  onRetry: () => void;
  onBack: () => void;
  onReport: (review: RestaurantReview, reason: ReportReason) => Promise<void>;
  onWrite: () => void;
}) {
  const myIds = useMemo(() => profileIds(profile), [profile]);
  const [diet, setDiet] = useState<DietFilter | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 열리면 뒤로 버튼에 초점. Esc로 닫기.
  useEffect(() => {
    rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) onBack(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  const visible = reviews.filter((review) => !review.hidden || review.mine);
  const menuNames = [...new Set(visible.flatMap((review) => review.menus.map((item) => item.name)))];
  const dietIds = diet === null ? [] : diet === 'mine' ? myIds : [diet];
  const filtered = visible.flatMap((review) => {
    const menus = review.menus.filter((item) =>
      (!menu || item.name === menu) && (dietIds.length === 0 || dietIds.some((id) => item.answers[id] !== undefined)));
    return menus.length ? [{ ...review, menus }] : [];
  });
  const clear = () => { setDiet(null); setMenu(null); };
  const chipClass = (on: boolean) => `inline-flex h-[38px] max-w-[180px] items-center gap-1 rounded-hs-pill px-3.5 text-[13px] font-extrabold ${on ? 'bg-hs-ink-900 text-hs-surface-0' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0 text-hs-ink-700'}`;
  const dietLabel = diet === null || diet === 'mine' ? tx(language, T.myDiet) : profileTagText(diet, language);

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="store-reviews-title" className="absolute inset-0 z-[60] flex flex-col bg-hs-surface-0">
      <header className="flex flex-none items-center gap-2 px-5 pt-[max(18px,env(safe-area-inset-top))]">
        <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={onBack} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-extrabold text-hs-ink-500">{storeName}</p>
          <h1 id="store-reviews-title" className="truncate text-[17px] font-black text-hs-ink-900">{tx(language, REVIEW_TEXT.title)}</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {visible.length > 0 && !loading && !error && (
          <div role="group" aria-label={tx(language, T.filters)} className="flex flex-wrap gap-1.5 pt-4">
            <button type="button" aria-pressed={diet === null && menu === null} onClick={clear} className={chipClass(diet === null && menu === null)}>{tx(language, T.all)}</button>
            {myIds.length > 0 && (
              <ChipMenu
                menuLabel={tx(language, T.myDiet)}
                value={diet}
                onChange={(value) => setDiet(value)}
                options={[{ value: 'mine', label: tx(language, T.myDietAll) }, ...myIds.map((id) => ({ value: id, label: profileTagText(id, language) }))]}
                className={chipClass(diet !== null)}
              >
                <span className="truncate">{dietLabel}</span>
                <HsIcon name="chevronDown" size={14} strokeWidth={2.6} className="flex-none" />
              </ChipMenu>
            )}
            {menuNames.length > 0 && (
              <ChipMenu
                menuLabel={tx(language, T.menu)}
                value={menu}
                onChange={(value) => setMenu(value)}
                options={menuNames.map((name) => ({ value: name, label: name }))}
                className={chipClass(menu !== null)}
              >
                <span className="truncate">{menu ?? tx(language, T.menu)}</span>
                <HsIcon name="chevronDown" size={14} strokeWidth={2.6} className="flex-none" />
              </ChipMenu>
            )}
          </div>
        )}

        <p className="mt-3.5 flex items-start gap-2 rounded-[18px] bg-hs-coral-100 px-3.5 py-3 text-[13px] leading-[1.5] font-bold text-hs-coral-700">
          <HsIcon name="alert" size={16} strokeWidth={2.4} className="mt-0.5 flex-none" />
          <span>{tx(language, REVIEW_TEXT.caution)}</span>
        </p>

        <div className="mt-3.5 space-y-3">
          {loading ? (
            <>
              <SkeletonCard language={language} lines={['40%', '70%', '55%']} className="border-[1.5px] border-hs-line-200" />
              <SkeletonCard language={language} lines={['40%', '60%']} className="border-[1.5px] border-hs-line-200" />
            </>
          ) : error ? (
            <ErrorState language={language} title={tx(language, REVIEW_TEXT.loadFailed)} onRetry={onRetry} />
          ) : visible.length === 0 ? (
            <EmptyState icon="message" title={tx(language, T.empty)} description={tx(language, T.emptyBody)} />
          ) : filtered.length === 0 ? (
            <EmptyState icon="search" title={tx(language, T.noFiltered)} action={<HsButton variant="outline" size="md" onClick={clear}>{tx(language, T.clear)}</HsButton>} />
          ) : (
            filtered.map((review) => <VisitorReviewCard key={review.id} language={language} review={review} myIds={myIds} onReport={onReport} />)
          )}
        </div>
      </div>

      <div className="flex-none bg-hs-surface-0 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <HsButton size="cta" disabled={!canWrite} onClick={onWrite}>{tx(language, REVIEW_TEXT.writeReview)}</HsButton>
        {!canWrite && <p className="mt-2 text-center text-[12px] font-bold text-hs-ink-500">{tx(language, REVIEW_TEXT.preparing)}</p>}
      </div>
    </div>
  );
}

function VisitorReviewCard({ language, review, myIds, onReport }: {
  language: Language;
  review: RestaurantReview;
  myIds: string[];
  onReport: (review: RestaurantReview, reason: ReportReason) => Promise<void>;
}) {
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [failed, setFailed] = useState(false);
  const shared = myIds.filter((id) => review.menus.some((menu) => menu.answers[id] !== undefined));

  const report = async (reason: ReportReason) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onReport(review, reason);
      setReported(true);
      setReporting(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-[26px] border-[1.5px] border-hs-line-200 p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 flex-none items-center justify-center rounded-hs-pill bg-hs-mint-100 text-hs-brand-700"><HsIcon name="person" size={16} /></span>
        <h2 className="min-w-0 flex-1 truncate text-[14px] font-black text-hs-ink-900">{tx(language, review.mine ? T.mine : T.visitor)}</h2>
        {!review.mine && !reported && (
          <HsIconButton icon="more" tone="ghost" label={tx(language, T.more)} aria-expanded={reporting} onClick={() => setReporting(!reporting)} className="-my-1.5 -me-1.5 text-hs-ink-500" />
        )}
      </div>
      {shared.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-[5px]">{shared.map((id) => <DietTag key={id}>{profileTagText(id, language)}</DietTag>)}</div>
      )}
      {review.menus.map((menu, index) => (
        <div key={`${menu.name}-${index}`} className="mt-2.5 rounded-[18px] bg-hs-surface-100 p-3">
          <p className="text-[14px] font-black text-hs-ink-900">{menu.name}</p>
          {Object.entries(menu.answers).map(([id, answer]) => {
            const value = toAnswerValue(answer);
            return (
              <p key={id} className="mt-1 text-[13px] font-bold text-hs-ink-700">
                {answerLabel(id, language)} · <span className={`font-extrabold ${ANSWER_COLOR[value]}`}>{tx(language, T[value])}</span>
              </p>
            );
          })}
          {menu.note && <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-[1.5] font-medium text-hs-ink-900">{menu.note}</p>}
        </div>
      ))}
      {reported && <p role="status" className="mt-2.5 text-[12px] font-bold text-hs-ink-500">{tx(language, T.reported)}</p>}
      {reporting && (
        <div className="mt-2.5 rounded-[18px] border-[1.5px] border-hs-line-200 p-3">
          <p className="mb-2 text-[12px] font-extrabold text-hs-ink-900">{tx(language, T.reportTitle)}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {REASONS.map(([reason, label]) => (
              <button key={reason} type="button" disabled={busy} onClick={() => report(reason)} className="min-h-11 rounded-[14px] border-[1.5px] border-hs-line-200 bg-hs-surface-0 px-2 text-[13px] font-bold text-hs-ink-900 disabled:opacity-50">
                {tx(language, label)}
              </button>
            ))}
          </div>
          {failed && <InlineError className="mt-2">{tx(language, T.reportFailed)}</InlineError>}
        </div>
      )}
    </article>
  );
}
