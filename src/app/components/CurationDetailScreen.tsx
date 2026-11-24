import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Language } from '../types';
import { CURATION_ARTICLES, tagLabel } from '../constants/curation';
import { CURATION_BODIES } from '../constants/curationBodies';
import { CURATION_BODY_DRAFTS } from '../constants/curationBodyDrafts';
import { CURATION_STORES } from '../demo/curationStores';
import { MAP_AREAS } from './map/mapAreas';
import { FOOD_CATEGORY_LABELS } from './discovery/foodCategories';
import { useFixtureStoreSaves } from '../hooks/useFixtureStoreSaves';
import { translateText } from '../locales';
import { CategoryTag, EmptyState, HsButton, HsIcon, HsIconButton, OfflineBanner, StoreCard, tx, useToast, type AllText } from './hs';
import { FLIP_RTL } from './hs/icons';
import { HS_TEXT } from './hs/text';
import { ArticlePhoto, CATEGORY_BG, CURATION_TEXT, NextArticleRow, ReferenceBadge, articleSubtitle, dotDate } from './curation/curationView';

const T = {
  editorial: { ko: 'HAN SPOON 에디토리얼', en: 'HAN SPOON EDITORIAL', ar: 'افتتاحية HAN SPOON', 'zh-CN': 'HAN SPOON 编辑部', ja: 'HAN SPOON 編集部', 'zh-TW': 'HAN SPOON 編輯部', es: 'EDITORIAL HAN SPOON' },
  next: { ko: '다음 한 입의 이야기', en: 'Your next bite of story', ar: 'قصتك التالية', 'zh-CN': '下一口的故事', ja: '次のひと口の話', 'zh-TW': '下一口的故事', es: 'Tu próxima historia' },
  stores: { ko: '칼럼 속 식당을 만나보세요', en: 'Meet the restaurants in this column', ar: 'تعرّف على مطاعم هذا المقال', 'zh-CN': '去看看专栏里的餐厅', ja: 'コラムのお店に行ってみましょう', 'zh-TW': '去看看專欄裡的餐廳', es: 'Conoce los restaurantes de esta columna' },
  storesNote: { ko: '내 식단에 맞는지 확인된 추천이 아니에요. 메뉴판을 스캔해 재료를 확인해 보세요.', en: 'These are not checked against your diet. Scan the menu to check the ingredients.', ar: 'هذه ليست توصيات تم التحقق من ملاءمتها لنظامك الغذائي. امسح القائمة للتحقق من المكونات.', 'zh-CN': '这些并非已确认符合你饮食的推荐。请扫描菜单确认食材。', ja: '食事条件に合うか確認したおすすめではありません。メニューをスキャンして材料を確認してください。', 'zh-TW': '這些並非已確認符合你飲食的推薦。請掃描菜單確認食材。', es: 'No están verificados para tu dieta. Escanea la carta para comprobar los ingredientes.' },
  map: { ko: '지도에서 보기', en: 'View on map', ar: 'عرض على الخريطة', 'zh-CN': '在地图上查看', ja: '地図で見る', 'zh-TW': '在地圖上查看', es: 'Ver en el mapa' },
  notFound: { ko: '글을 찾을 수 없어요', en: 'Article not found', ar: 'المقال غير موجود', 'zh-CN': '找不到文章', ja: '記事が見つかりません', 'zh-TW': '找不到文章', es: 'No se encontró el artículo' },
  notFoundBody: { ko: '지워졌거나 주소가 바뀐 글이에요.', en: 'It may have been removed or moved.', ar: 'ربما تمت إزالته أو نقله.', 'zh-CN': '文章可能已删除或地址已变更。', ja: '削除されたか、アドレスが変わった可能性があります。', 'zh-TW': '文章可能已刪除或網址已變更。', es: 'Puede que se haya eliminado o movido.' },
  toList: { ko: '큐레이션으로', en: 'Back to stories', ar: 'العودة إلى المقالات', 'zh-CN': '返回精选', ja: 'コラム一覧へ', 'zh-TW': '返回精選', es: 'Volver a artículos' },
  savedToast: { ko: '가게를 저장했어요', en: 'Restaurant saved', ar: 'تم حفظ المطعم', 'zh-CN': '已收藏店铺', ja: 'お店を保存しました', 'zh-TW': '已收藏店家', es: 'Restaurante guardado' },
} satisfies Record<string, AllText>;

/** 흐름 5 글 상세(F5-03 본문 · F5-04 다음 이야기 · 칼럼 속 식당). 하단 내비 없음. */
export function CurationDetailScreen({ language }: { language: Language }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const article = CURATION_ARTICLES.find((item) => item.id === id);
  const articleBody = article ? CURATION_BODIES[article.id] : undefined;
  const { isSaved, toggleSave } = useFixtureStoreSaves();

  // 다른 글로 옮기면 맨 위로
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [id]);

  // 다음 이야기 3편: 같은 카테고리 먼저, 모자라면 다른 글
  const next = useMemo(() => {
    if (!article) return [];
    const others = CURATION_ARTICLES.filter((item) => item.id !== article.id);
    return [...others.filter((item) => item.tag === article.tag), ...others.filter((item) => item.tag !== article.tag)].slice(0, 3);
  }, [article]);

  const back = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate('/curation');
  };

  if (!article || !articleBody) {
    return (
      <div className="flex h-dvh flex-col bg-hs-surface-0">
        <div className="flex-none px-5 pt-[max(18px,env(safe-area-inset-top))]">
          <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={() => navigate('/curation')} />
        </div>
        <div className="flex flex-1 items-center px-5">
          <EmptyState
            icon="book"
            title={tx(language, T.notFound)}
            description={tx(language, T.notFoundBody)}
            action={<HsButton variant="outline" size="md" onClick={() => navigate('/curation')}>{tx(language, T.toList)}</HsButton>}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  // 본문: ko · en · ar 원문, 나머지 언어는 번역 초안(없으면 영어)
  const body = language === 'ko' || language === 'en' || language === 'ar'
    ? translateText(language, articleBody)
    : CURATION_BODY_DRAFTS[article.id]?.[language] ?? translateText(language, articleBody);
  const paragraphs = body.split('\n\n');
  const subtitle = articleSubtitle(article, language);

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative">
          <div className={`relative h-[330px] overflow-hidden rounded-b-[44px] ${CATEGORY_BG[article.tag]}`}>
            <ArticlePhoto article={article} language={language} className="absolute inset-0 size-full" />
            <ReferenceBadge language={language} className="start-2.5 bottom-2.5" />
          </div>
          <div className="absolute start-5 top-[max(18px,env(safe-area-inset-top))]">
            <HsIconButton icon="back" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={back} />
          </div>
        </div>

        <OfflineBanner language={language} className="mx-5 mt-3" />
        <article className="px-6 pt-[22px]">
          <CategoryTag category={article.tag}>{tagLabel(article.tag, language)}</CategoryTag>
          <h1 className="mt-2.5 text-[28px] leading-[1.3] font-black tracking-[-0.02em]">{translateText(language, article.title)}</h1>
          {subtitle && <p className="mt-2 text-[16px] leading-[1.5] font-bold text-hs-ink-700">{subtitle}</p>}
          <p className="mt-3.5 border-b-[1.5px] border-hs-line-200 pb-[18px] text-[12px] font-extrabold tracking-[0.04em] text-hs-ink-500">
            {tx(language, T.editorial)} · <span dir="ltr">{dotDate(article.date)}</span>
          </p>
          <div className="pt-5">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="mb-4 text-[16px] leading-[1.8] font-medium text-[#2A322E]">{paragraph}</p>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-hs-ink-500">
            <HsIcon name="photo" size={14} strokeWidth={2.4} className="flex-none" />
            {tx(language, CURATION_TEXT.imageNote)}
          </p>
        </article>

        <div aria-hidden="true" className="mt-7 h-2.5 bg-hs-surface-100" />

        <section aria-labelledby="curation-next" className="px-6 pt-6">
          <h2 id="curation-next" className="text-[18px] font-black">{tx(language, T.next)}</h2>
          <ul className="mt-1.5">
            {next.map((item, index) => (
              <NextArticleRow key={item.id} article={item} language={language} last={index === next.length - 1} onOpen={() => navigate(`/curation/${item.id}`)} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="curation-stores" className="mt-[30px] rounded-t-[36px] bg-hs-surface-100 px-5 pt-[26px] pb-[max(28px,env(safe-area-inset-bottom))]">
          <h2 id="curation-stores" className="mx-1 text-[18px] font-black">{tx(language, T.stores)}</h2>
          <div className="mt-3.5 space-y-2">
            {CURATION_STORES.map((store) => {
              const center = MAP_AREAS.find((area) => area.id === store.area)?.center;
              return (
                <StoreCard
                  key={store.id}
                  language={language}
                  name={translateText(language, store.name)}
                  reviewCount={store.reviewCount}
                  district={translateText(language, store.district)}
                  category={translateText(language, FOOD_CATEGORY_LABELS[store.category])}
                  distanceMeters={store.distanceMeters}
                  saved={isSaved(store.id)}
                  onToggleSave={() => { if (toggleSave(store.id)) toast.show(tx(language, T.savedToast), { tone: 'success' }); }}
                  onClick={() => navigate('/map', { state: center ? { searchCenter: center } : undefined })}
                  className="border-transparent!"
                />
              );
            })}
          </div>
          <p className="mx-1 mt-3 flex items-start gap-1.5 text-[12px] leading-[1.5] font-semibold text-hs-ink-700">
            <HsIcon name="alert" size={14} strokeWidth={2.4} className="mt-0.5 flex-none" />
            {tx(language, T.storesNote)}
          </p>
          <HsButton block variant="outline" size="md" icon="map" onClick={() => navigate('/map')} className="mt-3 h-12! border-hs-mint-200! text-hs-brand-700!">
            {tx(language, T.map)}
          </HsButton>
        </section>
      </div>
    </div>
  );
}
