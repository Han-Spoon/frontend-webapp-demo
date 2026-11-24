import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Language } from '../types';
import { translateText } from '../locales';
import { CURATION_ARTICLES, CURATION_TAGS, EDITOR_PICK_ID, tagLabel, type CurationArticle, type CurationTag } from '../constants/curation';
import symbol from '../../assets/brand/han-spoon-symbol.svg';
import { BottomNav, EmptyState, FilterChip, HsIcon, HsIconButton, OfflineBanner, SearchField, tx, txn, type AllText, type CountText } from './hs';
import { ArticlePhoto, ArticleRow, CATEGORY_BG, ReferenceBadge, articleSubtitle, monthLabel, relativeDate } from './curation/curationView';

const T = {
  eyebrow: { ko: 'HAN SPOON JOURNAL', en: 'HAN SPOON JOURNAL', ar: 'مجلة HAN SPOON', 'zh-CN': 'HAN SPOON JOURNAL', ja: 'HAN SPOON JOURNAL', 'zh-TW': 'HAN SPOON JOURNAL', es: 'HAN SPOON JOURNAL' },
  title: { ko: '한 입 더, 한국', en: 'One more bite of Korea', ar: 'لقمة أخرى من كوريا', 'zh-CN': '再尝一口韩国', ja: 'もうひと口、韓国', 'zh-TW': '再嚐一口韓國', es: 'Un bocado más de Corea' },
  description: { ko: '식탁의 이야기부터 여행의 작은 요령까지 알아보기', en: 'From stories at the table to small travel tips', ar: 'من حكايات المائدة إلى نصائح السفر الصغيرة', 'zh-CN': '从餐桌故事到旅行小窍门', ja: '食卓の話から旅の小さなコツまで', 'zh-TW': '從餐桌故事到旅行小訣竅', es: 'Desde historias de la mesa hasta pequeños trucos de viaje' },
  myPage: { ko: '마이페이지', en: 'My page', ar: 'صفحتي', 'zh-CN': '我的页面', ja: 'マイページ', 'zh-TW': '我的頁面', es: 'Mi página' },
  search: { ko: '어떤 이야기가 궁금하세요?', en: 'What would you like to read about?', ar: 'عمّ تود أن تقرأ؟', 'zh-CN': '想看什么故事？', ja: 'どんな話が気になりますか？', 'zh-TW': '想看什麼故事？', es: '¿Sobre qué te gustaría leer?' },
  editor: { ko: "한스푼 에디터's 이 달의 칼럼", en: "Han Spoon editor's column of the month", ar: 'مقال الشهر من محرري هان سبون', 'zh-CN': '韩勺编辑本月专栏', ja: 'ハンスプーン編集部・今月のコラム', 'zh-TW': '韓勺編輯本月專欄', es: 'Columna del mes de Han Spoon' },
  read: { ko: '읽어 보기', en: 'Read', ar: 'اقرأ', 'zh-CN': '阅读', ja: '読む', 'zh-TW': '閱讀', es: 'Leer' },
  newColumns: { ko: '신규 칼럼', en: 'New columns', ar: 'مقالات جديدة', 'zh-CN': '最新专栏', ja: '新着コラム', 'zh-TW': '最新專欄', es: 'Columnas nuevas' },
  newBadge: { ko: 'NEW', en: 'NEW', ar: 'جديد', 'zh-CN': 'NEW', ja: 'NEW', 'zh-TW': 'NEW', es: 'NUEVO' },
  allColumns: { ko: '전체 칼럼', en: 'All columns', ar: 'كل المقالات', 'zh-CN': '全部专栏', ja: 'すべてのコラム', 'zh-TW': '全部專欄', es: 'Todas las columnas' },
  all: { ko: '전체', en: 'All', ar: 'الكل', 'zh-CN': '全部', ja: 'すべて', 'zh-TW': '全部', es: 'Todo' },
  categories: { ko: '칼럼 종류', en: 'Column categories', ar: 'فئات المقالات', 'zh-CN': '专栏分类', ja: 'コラムの種類', 'zh-TW': '專欄分類', es: 'Categorías' },
  found: { ko: '찾은 이야기', en: 'Stories found', ar: 'القصص التي وجدناها', 'zh-CN': '找到的故事', ja: '見つかった話', 'zh-TW': '找到的故事', es: 'Historias encontradas' },
  noResult: { ko: '찾는 이야기가 없어요', en: 'No stories found', ar: 'لم نجد قصصًا', 'zh-CN': '没有找到故事', ja: '話が見つかりません', 'zh-TW': '沒有找到故事', es: 'No encontramos historias' },
  noResultBody: { ko: '다른 말로 찾아보세요.', en: 'Try searching with other words.', ar: 'جرّب البحث بكلمات أخرى.', 'zh-CN': '换个词搜索试试。', ja: '別の言葉で探してみてください。', 'zh-TW': '換個詞搜尋試試。', es: 'Prueba a buscar con otras palabras.' },
  showAll: { ko: '전체 보기', en: 'Show all', ar: 'عرض الكل', 'zh-CN': '查看全部', ja: 'すべて表示', 'zh-TW': '查看全部', es: 'Ver todo' },
  slide: { ko: '신규 칼럼 넘기기', en: 'Browse new columns', ar: 'تصفح المقالات الجديدة', 'zh-CN': '浏览最新专栏', ja: '新着コラムを切り替える', 'zh-TW': '瀏覽最新專欄', es: 'Ver columnas nuevas' },
} satisfies Record<string, AllText>;

const COUNT: CountText = {
  ko: (n) => `${n}편`, en: (n) => `${n}`, ar: (n) => `${n}`, 'zh-CN': (n) => `${n}篇`, ja: (n) => `${n}本`, 'zh-TW': (n) => `${n}篇`, es: (n) => `${n}`,
};
const NEW_COUNT: CountText = {
  ko: (n) => `새로 올라온 ${n}편`, en: (n) => `${n} new`, ar: (n) => `${n} جديدة`, 'zh-CN': (n) => `新上线 ${n} 篇`, ja: (n) => `新着 ${n}本`, 'zh-TW': (n) => `新上線 ${n} 篇`, es: (n) => `${n} nuevas`,
};

/** 신규 칼럼 개수 */
const NEW_COUNT_SIZE = 3;

/** 흐름 5 큐레이션(F5-01 목록 · F5-02 검색). 글 데이터는 `constants/curation*` 그대로. */
export function CurationScreen({ language, onMyPage }: { language: Language; onMyPage: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<CurationTag | 'all'>('all');
  const open = (article: CurationArticle) => navigate(`/curation/${article.id}`);
  const searching = query.trim().length > 0;

  const editorPick = CURATION_ARTICLES.find((article) => article.id === EDITOR_PICK_ID) ?? CURATION_ARTICLES[0];
  // 최근 글 순(같은 날은 목록 순서)
  const newest = useMemo(
    () => CURATION_ARTICLES.map((article, index) => ({ article, index })).sort((a, b) => b.article.date.localeCompare(a.article.date) || a.index - b.index).slice(0, NEW_COUNT_SIZE).map(({ article }) => article),
    [],
  );
  const filtered = useMemo(() => {
    const words = query.trim().toLocaleLowerCase();
    return CURATION_ARTICLES.filter((article) => {
      // 검색은 고른 태그와 상관없이 전체 칼럼에서 찾는다(태그는 검색어가 없을 때만).
      if (!words) return tag === 'all' || article.tag === tag;
      const text = [article.title, article.subtitle, article.excerpt].flatMap((item) => item ? [translateText(language, item), item.ko, item.en] : []).join(' ').toLocaleLowerCase();
      return text.includes(words);
    });
  }, [language, query, tag]);

  const chips = (
    <div role="group" aria-label={tx(language, T.categories)} className="flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
      <FilterChip selected={tag === 'all'} onClick={() => setTag('all')} className="h-[38px]! text-[13px]!">{tx(language, T.all)}</FilterChip>
      {CURATION_TAGS.map((item) => (
        <FilterChip key={item.key} selected={tag === item.key} onClick={() => setTag(tag === item.key ? 'all' : item.key)} className="h-[38px]! text-[13px]!">{tagLabel(item.key, language)}</FilterChip>
      ))}
    </div>
  );
  const list = filtered.length > 0 ? (
    <ul className="px-5 pt-1.5">{filtered.map((article) => <ArticleRow key={article.id} article={article} language={language} onOpen={() => open(article)} />)}</ul>
  ) : (
    <EmptyState
      icon="search"
      title={tx(language, T.noResult)}
      description={tx(language, T.noResultBody)}
      action={<button type="button" onClick={() => { setQuery(''); setTag('all'); }} className="h-10 rounded-hs-pill border-[1.5px] border-hs-line-300 px-4 text-[14px] font-black text-hs-ink-900">{tx(language, T.showAll)}</button>}
      className="mx-5 mt-4"
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <main className="min-h-0 flex-1 overflow-y-auto pb-8">
        <header className="relative overflow-hidden rounded-b-[44px] bg-hs-mint-100 pb-[22px]">
          <img src={symbol} alt="" aria-hidden="true" className="pointer-events-none absolute -end-[34px] top-10 w-[150px] opacity-[0.14]" />
          <div className="relative flex items-center justify-between gap-3 ps-6 pe-5 pt-[max(18px,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <p lang={language === 'ar' ? undefined : 'en'} className="text-[11px] font-black tracking-[0.16em] text-hs-brand-700">{tx(language, T.eyebrow)}</p>
              <h1 className="mt-1 text-[26px] font-black tracking-[-0.02em]">{tx(language, T.title)}</h1>
            </div>
            <HsIconButton icon="user" label={tx(language, T.myPage)} onClick={onMyPage} />
          </div>
          <p className="relative mx-6 mt-1.5 text-[14px] font-semibold text-hs-ink-700">{tx(language, T.description)}</p>
          <div className="relative px-5 pt-4">
            <SearchField
              value={query}
              onChange={setQuery}
              language={language}
              label={tx(language, T.search)}
              placeholder={tx(language, T.search)}
              className="bg-hs-surface-0! shadow-[0_4px_14px_rgba(23,107,77,0.08)]"
            />
          </div>
        </header>
        <OfflineBanner language={language} className="mx-5 mt-3" />

        {searching ? (
          <section aria-labelledby="curation-found" className="pt-4">
            <h2 id="curation-found" className="mx-5 mt-1 text-[16px] font-black">
              {tx(language, T.found)} <span dir="ltr" className="text-hs-brand-700">{txn(language, COUNT, filtered.length)}</span>
            </h2>
            {list}
          </section>
        ) : (
          <>
            <section aria-labelledby="curation-editor" className="px-5 pt-6">
              <h2 id="curation-editor" className="text-[18px] font-black">{tx(language, T.editor)}</h2>
              <button type="button" onClick={() => open(editorPick)} className="relative mt-3 block h-[300px] w-full overflow-hidden rounded-[30px] text-start">
                <ArticlePhoto article={editorPick} language={language} className={`absolute inset-0 size-full ${CATEGORY_BG[editorPick.tag]}`} />
                <span className="absolute start-4 top-4 flex gap-1.5">
                  <span className="inline-flex h-6 items-center rounded-hs-pill bg-hs-mint-100 px-[9px] text-[11px] font-black text-hs-brand-700">{tagLabel(editorPick.tag, language)}</span>
                  <span className="inline-flex h-6 items-center rounded-hs-pill bg-white/90 px-[9px] text-[11px] font-black text-hs-ink-900">{monthLabel(language)}</span>
                </span>
                <ReferenceBadge language={language} className="end-3.5 top-4" />
                <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(12,38,28,0)_0%,rgba(12,38,28,0.55)_45%,rgba(12,38,28,0.86)_100%)] px-5 pt-[70px] pb-5">
                  <span className="block text-[23px] leading-[1.3] font-black tracking-[-0.02em] text-white">{translateText(language, editorPick.title)}</span>
                  <span className="mt-1.5 block text-[14px] leading-[1.5] font-semibold text-white/90">{articleSubtitle(editorPick, language)}</span>
                  <span className="mt-3 inline-flex h-[34px] items-center gap-1.5 rounded-hs-pill bg-hs-surface-0 px-3.5 text-[13px] font-black text-hs-brand-700">
                    {tx(language, T.read)}
                    <HsIcon name="forward" size={14} strokeWidth={2.6} className="rtl:-scale-x-100" />
                  </span>
                </span>
              </button>
            </section>

            <NewColumns language={language} articles={newest} onOpen={open} />

            <section aria-labelledby="curation-all" className="pt-[30px]">
              <h2 id="curation-all" className="mx-5 text-[18px] font-black">
                {tx(language, T.allColumns)} <span dir="ltr" className="text-[14px] text-hs-brand-700">{txn(language, COUNT, filtered.length)}</span>
              </h2>
              <div className="pt-3.5">{chips}</div>
              {list}
            </section>
          </>
        )}
      </main>
      <BottomNav language={language} />
    </div>
  );
}

function NewColumns({ language, articles, onOpen }: { language: Language; articles: CurationArticle[]; onOpen: (article: CurationArticle) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const onScroll = () => {
    const element = rail.current;
    if (!element) return;
    const card = element.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : element.clientWidth;
    setSlide(Math.min(articles.length - 1, Math.round(Math.abs(element.scrollLeft) / step)));
  };
  const goTo = (index: number) => {
    const card = rail.current?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };
  return (
    <section aria-labelledby="curation-new" className="pt-[30px]">
      <div className="flex items-baseline justify-between gap-3 px-5">
        <h2 id="curation-new" className="text-[18px] font-black">{tx(language, T.newColumns)}</h2>
        <span className="text-[13px] font-extrabold text-hs-ink-500">{txn(language, NEW_COUNT, articles.length)}</span>
      </div>
      <div ref={rail} onScroll={onScroll} className="mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 [scrollbar-width:none]">
        {articles.map((article) => (
          <button key={article.id} type="button" onClick={() => onOpen(article)} className="relative h-[300px] w-[226px] flex-none snap-start overflow-hidden rounded-[28px] text-start">
            <ArticlePhoto article={article} language={language} className={`absolute inset-0 size-full ${CATEGORY_BG[article.tag]}`} />
            <span className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
              <span className="inline-flex h-6 items-center rounded-hs-pill bg-hs-orange-500 px-[9px] text-[10px] font-black tracking-[0.08em] text-white">{tx(language, T.newBadge)}</span>
              <span className="inline-flex h-6 items-center rounded-hs-pill bg-white/90 px-[9px] text-[11px] font-black text-hs-ink-900">{relativeDate(article.date, language)}</span>
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(12,38,28,0)_0%,rgba(12,38,28,0.62)_38%,rgba(12,38,28,0.9)_100%)] px-4 pt-[46px] pb-4">
              <span className="block text-[11px] font-extrabold text-white/80">{tagLabel(article.tag, language)}</span>
              <span className="mt-[3px] line-clamp-2 block text-[17px] leading-[1.3] font-black text-white">{translateText(language, article.title)}</span>
              <span className="mt-1 line-clamp-2 block text-[12px] leading-[1.45] font-semibold text-white/85">{articleSubtitle(article, language)}</span>
            </span>
          </button>
        ))}
      </div>
      {articles.length > 1 && (
        <div role="group" aria-label={tx(language, T.slide)} className="mt-1 flex justify-center">
          {articles.map((article, index) => (
            <button key={article.id} type="button" aria-label={`${index + 1} / ${articles.length}`} aria-current={index === slide ? 'true' : undefined} onClick={() => goTo(index)} className="flex h-11 w-6 items-center justify-center">
              <i aria-hidden="true" className={`h-1.5 rounded-hs-pill ${index === slide ? 'w-[18px] bg-hs-brand-700' : 'w-1.5 bg-hs-line-200'}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
