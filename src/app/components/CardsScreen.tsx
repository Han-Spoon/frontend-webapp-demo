import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language, UserProfile } from '../types';
import { deleteCard, getSavedCards, type CardText, type CardType, type SavedCard } from '../../api/card';
import { deleteDemoCard, listDemoCards } from '../demo/cards';
import { getProfileCommunicationItems, type ProfileCommunicationItem } from '../results/resultViewModel';
import { speak, ttsSupported } from '../utils/speech';
import symbol from '../../assets/brand/han-spoon-symbol.svg';
import { BottomNav, EmptyState, ErrorState, HsButton, HsIcon, HsIconButton, HsSheet, OfflineBanner, SkeletonCard, tx, txn, useToast, type AllText, type CountText, type HsIconName } from './hs';
import { HS_TEXT } from './hs/text';
import { localizedAll, secondaryLanguage } from './results/menuView';
import { staffSentence, type StaffSentence } from './results/staffText';

const T = {
  eyebrow: { ko: 'TALK TO STAFF', en: 'TALK TO STAFF', ar: 'تحدّث مع الموظف', 'zh-CN': 'TALK TO STAFF', ja: 'TALK TO STAFF', 'zh-TW': 'TALK TO STAFF', es: 'TALK TO STAFF' },
  title: { ko: '직원 소통 카드', en: 'Staff cards', ar: 'بطاقات التواصل مع الموظف', 'zh-CN': '店员沟通卡', ja: 'スタッフ会話カード', 'zh-TW': '店員溝通卡', es: 'Tarjetas para el personal' },
  description: { ko: '문장을 누르면 크게 보여 주고,\n한국어로 들려줘요.', en: 'Tap a sentence to show it large\nand hear it in Korean.', ar: 'اضغط على جملة لعرضها بخط كبير\nوسماعها بالكورية.', 'zh-CN': '点一下句子即可放大显示，\n并用韩语朗读。', ja: '文を押すと大きく表示して、\n韓国語で読み上げます。', 'zh-TW': '點一下句子即可放大顯示，\n並用韓語朗讀。', es: 'Toca una frase para verla en grande\ny escucharla en coreano.' },
  myPage: { ko: '마이페이지', en: 'My page', ar: 'صفحتي', 'zh-CN': '我的页面', ja: 'マイページ', 'zh-TW': '我的頁面', es: 'Mi página' },
  common: { ko: '식당에서 자주 쓰는 문장', en: 'Common restaurant phrases', ar: 'عبارات شائعة في المطعم', 'zh-CN': '餐厅常用句子', ja: 'お店でよく使う文', 'zh-TW': '餐廳常用句子', es: 'Frases útiles en el restaurante' },
  hint: { ko: '누르면 음성 버튼과 함께 더 자세히 볼 수 있어요.', en: 'Tap to see it larger with a voice button.', ar: 'اضغط لعرضها بشكل أكبر مع زر الصوت.', 'zh-CN': '点一下即可放大查看并播放语音。', ja: '押すと音声ボタンと一緒に大きく表示されます。', 'zh-TW': '點一下即可放大查看並播放語音。', es: 'Tócala para verla más grande con botón de voz.' },
  myDiet: { ko: '내 식단', en: 'My diet', ar: 'نظامي الغذائي', 'zh-CN': '我的饮食', ja: '私の食事', 'zh-TW': '我的飲食', es: 'Mi dieta' },
  saved: { ko: '저장한 카드', en: 'Saved cards', ar: 'البطاقات المحفوظة', 'zh-CN': '已保存的卡片', ja: '保存したカード', 'zh-TW': '已儲存的卡片', es: 'Tarjetas guardadas' },
  empty: { ko: '저장된 카드가 없어요', en: 'No saved cards yet', ar: 'لا توجد بطاقات محفوظة بعد', 'zh-CN': '还没有保存的卡片', ja: '保存したカードはまだありません', 'zh-TW': '還沒有儲存的卡片', es: 'Aún no hay tarjetas guardadas' },
  emptyBody: { ko: '메뉴를 스캔한 뒤 직원에게 보여 줄 문장을\n저장하면 여기에 모여요.', en: 'Scan a menu and save the sentences\nyou want to show the staff. They will appear here.', ar: 'امسح قائمة واحفظ الجمل\nالتي تريد عرضها على الموظف لتظهر هنا.', 'zh-CN': '扫描菜单后保存想给店员看的句子，\n就会出现在这里。', ja: 'メニューをスキャンして店員に見せる文を\n保存すると、ここに集まります。', 'zh-TW': '掃描菜單後儲存想給店員看的句子，\n就會出現在這裡。', es: 'Escanea un menú y guarda las frases\nque quieras mostrar. Aparecerán aquí.' },
  loadFailed: { ko: '카드를 불러오지 못했어요', en: 'Could not load cards', ar: 'تعذر تحميل البطاقات', 'zh-CN': '无法加载卡片', ja: 'カードを読み込めませんでした', 'zh-TW': '無法載入卡片', es: 'No se pudieron cargar las tarjetas' },
  checkConnection: { ko: '연결 상태를 확인하고 다시 시도해 주세요.', en: 'Check your connection and try again.', ar: 'تحقق من الاتصال وحاول مرة أخرى.', 'zh-CN': '请检查网络连接后重试。', ja: '接続を確認してもう一度お試しください。', 'zh-TW': '請檢查網路連線後重試。', es: 'Revisa tu conexión e inténtalo de nuevo.' },
  delete: { ko: '카드 삭제', en: 'Delete card', ar: 'حذف البطاقة', 'zh-CN': '删除卡片', ja: 'カードを削除', 'zh-TW': '刪除卡片', es: 'Eliminar tarjeta' },
  deleted: { ko: '카드를 삭제했어요.', en: 'Card deleted.', ar: 'تم حذف البطاقة.', 'zh-CN': '已删除卡片。', ja: 'カードを削除しました。', 'zh-TW': '已刪除卡片。', es: 'Tarjeta eliminada.' },
  deleteFailed: { ko: '삭제에 실패했어요.', en: 'Could not delete.', ar: 'تعذر الحذف.', 'zh-CN': '删除失败。', ja: '削除できませんでした。', 'zh-TW': '刪除失敗。', es: 'No se pudo eliminar.' },
  sheetTitle: { ko: '요청 카드', en: 'Request card', ar: 'بطاقة الطلب', 'zh-CN': '请求卡片', ja: 'リクエストカード', 'zh-TW': '請求卡片', es: 'Tarjeta de solicitud' },
  commonChip: { ko: '자주 쓰는 문장', en: 'Common phrase', ar: 'عبارة شائعة', 'zh-CN': '常用句子', ja: 'よく使う文', 'zh-TW': '常用句子', es: 'Frase útil' },
  listen: { ko: '한국어 음성 듣기', en: 'Listen in Korean', ar: 'استمع بالكورية', 'zh-CN': '收听韩语语音', ja: '韓国語の音声を聞く', 'zh-TW': '收聽韓語語音', es: 'Escuchar en coreano' },
} satisfies Record<string, AllText>;

const COUNT: CountText = {
  ko: (n) => `${n}개`, en: (n) => `${n}`, ar: (n) => `${n}`, 'zh-CN': (n) => `${n}个`, ja: (n) => `${n}件`, 'zh-TW': (n) => `${n}個`, es: (n) => `${n}`,
};

/** 저장한 카드 종류 태그(색은 보드 그대로) */
const CARD_TYPE: Record<CardType, { label: AllText; className: string }> = {
  exclude: { label: { ko: '빼고 요청', en: 'Leave out', ar: 'طلب الإزالة', 'zh-CN': '要求不放', ja: '抜いてもらう', 'zh-TW': '要求不放', es: 'Pedir sin' }, className: 'bg-hs-coral-100 text-hs-coral-700' },
  ingredient_check: { label: { ko: '재료 확인', en: 'Ingredient check', ar: 'التحقق من المكونات', 'zh-CN': '确认食材', ja: '材料の確認', 'zh-TW': '確認食材', es: 'Ingredientes' }, className: 'bg-hs-mint-100 text-hs-brand-700' },
  order: { label: { ko: '주문', en: 'Order', ar: 'طلب', 'zh-CN': '点餐', ja: '注文', 'zh-TW': '點餐', es: 'Pedido' }, className: 'bg-hs-brand-700 text-hs-surface-0' },
  less_spicy: { label: { ko: '덜 맵게', en: 'Less spicy', ar: 'أقل حرارة', 'zh-CN': '少辣', ja: '辛さ控えめ', 'zh-TW': '少辣', es: 'Menos picante' }, className: 'bg-hs-caution-100 text-hs-caution-700' },
};

/** 식당 공통 문장(모두 같음). 음성은 언제나 한국어. */
const COMMON_PHRASES: Array<{ icon: HsIconName; text: AllText }> = [
  { icon: 'utensils', text: { ko: '숟가락과 젓가락은 어디에 있나요?', en: 'Where are the spoons and chopsticks?', ar: 'أين الملاعق وعيدان الأكل؟', 'zh-CN': '勺子和筷子在哪里？', ja: 'スプーンと箸はどこにありますか？', 'zh-TW': '湯匙和筷子在哪裡？', es: '¿Dónde están las cucharas y los palillos?' } },
  { icon: 'refill', text: { ko: '반찬 리필 가능할까요?', en: 'Can I get a refill of side dishes?', ar: 'هل يمكنني الحصول على المزيد من الأطباق الجانبية؟', 'zh-CN': '可以续小菜吗？', ja: 'おかずのおかわりはできますか？', 'zh-TW': '可以續小菜嗎？', es: '¿Me pueden rellenar los acompañamientos?' } },
  { icon: 'restroom', text: { ko: '화장실은 어디에 있나요?', en: 'Where is the restroom?', ar: 'أين دورة المياه؟', 'zh-CN': '洗手间在哪里？', ja: 'トイレはどこですか？', 'zh-TW': '洗手間在哪裡？', es: '¿Dónde está el baño?' } },
  { icon: 'pay', text: { ko: '계산하고 싶어요.', en: "I'd like to pay, please.", ar: 'أريد أن أدفع من فضلك.', 'zh-CN': '我想结账。', ja: 'お会計をお願いします。', 'zh-TW': '我想結帳。', es: 'Quisiera pagar, por favor.' } },
  { icon: 'bell', text: { ko: '주문하겠습니다.', en: "I'd like to order, please.", ar: 'أريد أن أطلب من فضلك.', 'zh-CN': '我要点餐。', ja: '注文をお願いします。', 'zh-TW': '我要點餐。', es: 'Quisiera pedir, por favor.' } },
];

/** 내 식단 문장: 결과의 '내 식단 보여주기 · 식단 기준 전달'과 같은 문장(재료마다 한 장) */
function dietSentence(item: ProfileCommunicationItem): StaffSentence {
  const term = localizedAll(item.label);
  if (item.kind === 'spicy') return staffSentence.spicyShare;
  if (item.kind === 'diet') return staffSentence.dietShare(term);
  if (item.kind === 'alcohol') return staffSentence.avoidShare(term);
  return staffSentence.allergyShare(term);
}
const joinSentence = (sentence: StaffSentence): AllText => (sentence.sub
  ? Object.fromEntries(Object.entries(sentence.main).map(([lang, main]) => [lang, `${main} ${sentence.sub![lang as keyof AllText]}`])) as AllText
  : sentence.main);

/** 저장 카드의 빠진 언어는 영어, 그다음 한국어 */
const cardText = (text: CardText, language: Language) => text[language] || text.en || text.ko;

interface ShownCard {
  korean: string;
  translated: string;
  header: ReactNode;
}

/** 흐름 6 직원 소통 카드(F6-01 목록 · F6-02/03 크게 보기 · F6-04 빈 상태) */
export function CardsScreen({ language, onMyPage, demoMode, userProfile }: { language: Language; demoMode: boolean; userProfile: UserProfile | null; onMyPage: () => void }) {
  const toast = useToast();
  const second = secondaryLanguage(language);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [shown, setShown] = useState<ShownCard | null>(null);
  const dietItems = useMemo(() => getProfileCommunicationItems(userProfile), [userProfile]);
  const phraseCount = dietItems.length + COMMON_PHRASES.length;

  const loadCards = async () => {
    setLoading(true);
    setFailed(false);
    try {
      setCards(demoMode ? listDemoCards() : await getSavedCards());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadCards();
    return () => { if (ttsSupported) window.speechSynthesis.cancel(); };
  }, []);

  const remove = async (card: SavedCard) => {
    if (deletingId) return;
    setDeletingId(card.cardId);
    try {
      if (demoMode) deleteDemoCard(card.cardId);
      else await deleteCard(card.cardId);
      setCards((current) => current.filter((item) => item.cardId !== card.cardId));
      toast.show(tx(language, T.deleted), { tone: 'success' });
    } catch {
      toast.show(tx(language, T.deleteFailed), { tone: 'error', action: { label: tx(language, HS_TEXT.retry), onClick: () => void remove(card) } });
    } finally {
      setDeletingId(null);
    }
  };
  const close = () => {
    if (ttsSupported) window.speechSynthesis.cancel();
    setShown(null);
  };

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <header className="relative overflow-hidden rounded-b-[44px] bg-hs-mint-100 ps-6 pe-5 pt-[max(18px,env(safe-area-inset-top))] pb-[26px]">
          <img src={symbol} alt="" aria-hidden="true" className="pointer-events-none absolute -end-[30px] top-[30px] w-[140px] opacity-[0.14]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p lang={language === 'ar' ? undefined : 'en'} className="text-[11px] font-black tracking-[0.16em] text-hs-brand-700">{tx(language, T.eyebrow)}</p>
              <h1 className="mt-1 text-[26px] font-black tracking-[-0.02em]">{tx(language, T.title)}</h1>
            </div>
            <HsIconButton icon="user" label={tx(language, T.myPage)} onClick={onMyPage} />
          </div>
          <p className="relative mt-2 whitespace-pre-line text-[14px] leading-[1.5] font-semibold text-hs-ink-700">{tx(language, T.description)}</p>
        </header>

        <OfflineBanner language={language} onRetry={() => void loadCards()} className="mx-5 mt-5" />

        <section aria-labelledby="cards-common" className="px-5 pt-6">
          <button type="button" aria-expanded={expanded} aria-controls="cards-common-list" onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2.5 text-start">
            <span id="cards-common" className="flex-1 text-[18px] font-black">
              {tx(language, T.common)} <span dir="ltr" className="text-[14px] text-hs-brand-700">{txn(language, COUNT, phraseCount)}</span>
            </span>
            <span className="flex size-9 flex-none items-center justify-center rounded-hs-pill bg-hs-surface-100">
              <HsIcon name={expanded ? 'chevronUp' : 'chevronDown'} size={18} strokeWidth={2.4} />
            </span>
          </button>
          {expanded && (
            <div id="cards-common-list">
              <p className="mt-1.5 flex items-center gap-[5px] text-[13px] font-bold text-hs-ink-500">
                {ttsSupported && <HsIcon name="speaker" size={15} className="flex-none" />}
                {tx(language, T.hint)}
              </p>
              {dietItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {dietItems.map((item) => {
                    const text = joinSentence(dietSentence(item));
                    const label = localizedAll(item.label)[language];
                    const chip = (
                      <span className="inline-flex h-6 items-center gap-1 rounded-hs-pill bg-hs-surface-0 px-[9px] text-[11px] font-black text-hs-brand-700">
                        <HsIcon name="leaf" size={12} strokeWidth={2.4} />
                        {tx(language, T.myDiet)} · {label}
                      </span>
                    );
                    return (
                      <button key={item.id} type="button" onClick={() => setShown({ korean: text.ko, translated: text[second], header: chip })} className="block w-full rounded-3xl border-[1.5px] border-hs-mint-200 bg-hs-mint-100 py-3.5 ps-[18px] pe-4 text-start">
                        {chip}
                        <span lang="ko" className="mt-2 block break-keep text-[16px] leading-[1.45] font-black">{text.ko}</span>
                        <span className="mt-[3px] block text-[12px] leading-[1.45] font-semibold text-hs-ink-700">{text[second]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {COMMON_PHRASES.map((phrase, index) => {
                  const wide = index === COMMON_PHRASES.length - 1 && COMMON_PHRASES.length % 2 === 1;
                  const chip = (
                    <span className="inline-flex h-[26px] items-center gap-[5px] rounded-hs-pill bg-hs-surface-100 px-2.5 text-[12px] font-black text-hs-ink-700">
                      <HsIcon name={phrase.icon} size={14} strokeWidth={2.4} />
                      {tx(language, T.commonChip)}
                    </span>
                  );
                  return (
                    <button
                      key={phrase.text.ko}
                      type="button"
                      onClick={() => setShown({ korean: phrase.text.ko, translated: phrase.text[second], header: chip })}
                      className={`flex gap-2.5 rounded-t-[22px] rounded-b-[30px] bg-hs-surface-100 p-3.5 text-start ${wide ? 'col-span-2 flex-row items-center gap-3' : 'min-h-[132px] flex-col'}`}
                    >
                      <span className="flex size-10 flex-none items-center justify-center rounded-[14px] bg-hs-surface-0 text-hs-brand-700"><HsIcon name={phrase.icon} size={20} /></span>
                      <span className="block min-w-0">
                        <span lang="ko" className="block break-keep text-[15px] leading-[1.4] font-black">{phrase.text.ko}</span>
                        {phrase.text[second] !== phrase.text.ko && <span className="mt-[3px] block text-[12px] leading-[1.4] font-semibold text-hs-ink-500">{phrase.text[second]}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="cards-saved" className="mt-7 min-h-[60%] rounded-t-[36px] bg-hs-surface-100 px-5 pt-6 pb-10">
          <h2 id="cards-saved" className="text-[18px] font-black">
            {tx(language, T.saved)} {!loading && !failed && cards.length > 0 && <span dir="ltr" className="text-[14px] text-hs-brand-700">{txn(language, COUNT, cards.length)}</span>}
          </h2>
          <div className="mt-3 space-y-2">
            {loading ? (
              <>
                <SkeletonCard language={language} lines={['30%', '80%', '60%']} />
                <SkeletonCard language={language} lines={['30%', '70%']} />
              </>
            ) : failed ? (
              <ErrorState language={language} title={tx(language, T.loadFailed)} description={tx(language, T.checkConnection)} onRetry={() => void loadCards()} />
            ) : cards.length === 0 ? (
              <EmptyState icon="message" title={tx(language, T.empty)} description={<span className="whitespace-pre-line">{tx(language, T.emptyBody)}</span>} className="bg-hs-surface-0" />
            ) : (
              cards.map((card) => {
                const type = CARD_TYPE[card.type] ?? CARD_TYPE.ingredient_check;
                const tag = (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={`inline-flex h-6 flex-none items-center rounded-hs-pill px-[9px] text-[11px] font-black ${type.className}`}>{tx(language, type.label)}</span>
                    {card.menuNameKo && <span lang="ko" className="truncate text-[12px] font-extrabold text-hs-ink-500">{card.menuNameKo}</span>}
                  </span>
                );
                const translated = cardText(card.text, second);
                return (
                  <div key={card.cardId} className="flex items-start gap-1.5 rounded-3xl border-[1.5px] border-hs-line-200 bg-hs-surface-0 py-4 ps-[18px] pe-2">
                    <button type="button" onClick={() => setShown({ korean: card.text.ko, translated, header: tag })} className="min-w-0 flex-1 text-start">
                      {tag}
                      <span lang="ko" className="mt-[9px] block break-keep text-[16px] leading-[1.45] font-black">{card.text.ko}</span>
                      {translated !== card.text.ko && <span className="mt-[3px] block text-[12px] leading-[1.45] font-semibold text-hs-ink-500">{translated}</span>}
                    </button>
                    <HsIconButton icon="trash" tone="ghost" label={tx(language, T.delete)} disabled={deletingId === card.cardId} onClick={() => void remove(card)} className="text-hs-ink-500" />
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
      <BottomNav language={language} />

      {shown && (
        <HsSheet
          language={language}
          onClose={close}
          title={tx(language, T.sheetTitle)}
          header={shown.header}
          footer={(
            <div className="space-y-2">
              {ttsSupported && <HsButton size="cta" icon="speaker" className="h-[58px]!" onClick={() => speak(shown.korean, 'ko-KR')}>{tx(language, T.listen)}</HsButton>}
              <HsButton variant="soft" block className="h-[50px]! font-extrabold!" onClick={close}>{tx(language, HS_TEXT.close)}</HsButton>
            </div>
          )}
        >
          <div className="rounded-[30px] bg-hs-mint-100 px-[22px] pt-[26px] pb-[22px]">
            <p className="text-[12px] font-extrabold text-hs-brand-700">{tx(language, HS_TEXT.showStaff)}</p>
            <p lang="ko" className="mt-2.5 break-keep text-[32px] leading-[1.32] font-black tracking-[-0.01em] text-hs-ink-900">{shown.korean}</p>
            {shown.translated && shown.translated !== shown.korean && (
              <>
                <div aria-hidden="true" className="mt-[18px] mb-3.5 h-[1.5px] bg-hs-mint-200" />
                <p className="text-[15px] leading-[1.5] font-semibold text-hs-ink-700">{shown.translated}</p>
              </>
            )}
          </div>
        </HsSheet>
      )}
    </div>
  );
}
