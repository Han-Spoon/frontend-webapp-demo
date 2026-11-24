import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Language, MenuAnalysis } from '../../types';
import { saveCard, type CardType } from '../../../api/card';
import { saveStaffAnswer, type StaffAnswer } from '../../../api/staff';
import { saveDemoCard } from '../../demo/cards';
import type { ProfileCommunicationItem } from '../../results/resultViewModel';
import { AnswerButtons, HsButton, HsNote, HsSheet, InlineError, OptionRow, StaffCard, tx, txn, useToast, type AllText, type CountText, type HsIconName } from '../hs';
import { localizedAll, menuNameAll, secondaryLanguage } from './menuView';
import { staffSentence } from './staffText';

export type StaffCardKind = 'ingredient' | 'exclude' | 'lessSpicy' | 'order';
type Answer = 'present' | 'absent' | 'unknown' | 'possible' | 'difficult';

const S = {
  title: { ko: '직원 소통 카드', en: 'Staff cards', ar: 'بطاقات الموظفين', 'zh-CN': '店员沟通卡', ja: 'スタッフ用カード', 'zh-TW': '店員溝通卡', es: 'Tarjetas para el personal' },
  pick: { ko: '직원에게 보여 줄 카드를 골라 주세요', en: 'Choose a card to show the staff', ar: 'اختر بطاقة لعرضها على الموظف', 'zh-CN': '请选择要给店员看的卡片', ja: 'スタッフに見せるカードを選んでください', 'zh-TW': '請選擇要給店員看的卡片', es: 'Elige la tarjeta que mostrarás al personal' },
  ingredient: { ko: '재료 확인', en: 'Ask about ingredients', ar: 'السؤال عن المكونات', 'zh-CN': '确认食材', ja: '材料の確認', 'zh-TW': '確認食材', es: 'Preguntar ingredientes' },
  ingredientDesc: { ko: '내 식단 재료가 들어가는지 물어봐요', en: 'Ask if it contains what I avoid', ar: 'اسأل إن كان يحتوي على ما أتجنبه', 'zh-CN': '询问是否含有我忌口的食材', ja: '食事条件の材料が入っているか聞きます', 'zh-TW': '詢問是否含有我忌口的食材', es: 'Pregunta si lleva lo que evitas' },
  exclude: { ko: '빼고 요청', en: 'Ask to leave out', ar: 'طلب الإزالة', 'zh-CN': '要求不放', ja: '抜いてもらう', 'zh-TW': '要求不放', es: 'Pedir sin' },
  excludeDesc: { ko: '내 식단 재료를 빼 달라고 부탁해요', en: 'Ask them to leave out what I avoid', ar: 'اطلب إزالة ما أتجنبه', 'zh-CN': '请店家不放我忌口的食材', ja: '食事条件の材料を抜いてもらいます', 'zh-TW': '請店家不放我忌口的食材', es: 'Pide que quiten lo que evitas' },
  lessSpicy: { ko: '덜 맵게 요청', en: 'Ask for less spicy', ar: 'طلب أقل حدة', 'zh-CN': '要求少辣', ja: '辛さ控えめを頼む', 'zh-TW': '要求少辣', es: 'Pedir menos picante' },
  lessSpicyDesc: { ko: '덜 맵게 만들어 달라고 부탁해요', en: 'Ask them to make it less spicy', ar: 'اطلب تحضيره أقل حدة', 'zh-CN': '请店家做得不那么辣', ja: '辛さを控えめにしてもらいます', 'zh-TW': '請店家做得不那麼辣', es: 'Pide que lo hagan menos picante' },
  order: { ko: '주문 카드', en: 'Order card', ar: 'بطاقة الطلب', 'zh-CN': '点餐卡', ja: '注文カード', 'zh-TW': '點餐卡', es: 'Tarjeta de pedido' },
  orderDesc: { ko: '이 메뉴를 주문해요', en: 'Order this dish', ar: 'اطلب هذا الطبق', 'zh-CN': '点这道菜', ja: 'このメニューを注文します', 'zh-TW': '點這道菜', es: 'Pide este plato' },
  answerPrompt: { ko: '직원의 답을 눌러 주세요', en: 'Tap the staff’s answer', ar: 'اضغط على إجابة الموظف', 'zh-CN': '请点选店员的回答', ja: 'スタッフの答えを押してください', 'zh-TW': '請點選店員的回答', es: 'Toca la respuesta del personal' },
  yes: { ko: '있어요', en: 'Yes, it does', ar: 'نعم، يحتوي', 'zh-CN': '有', ja: '入っています', 'zh-TW': '有', es: 'Sí, lo lleva' },
  no: { ko: '없어요', en: 'No, it doesn’t', ar: 'لا، لا يحتوي', 'zh-CN': '没有', ja: '入っていません', 'zh-TW': '沒有', es: 'No lo lleva' },
  notSure: { ko: '확실하지 않아요', en: 'Not sure', ar: 'غير متأكد', 'zh-CN': '不确定', ja: 'わかりません', 'zh-TW': '不確定', es: 'No estoy seguro' },
  possible: { ko: '가능해요', en: 'Possible', ar: 'ممكن', 'zh-CN': '可以', ja: 'できます', 'zh-TW': '可以', es: 'Se puede' },
  difficult: { ko: '어려워요', en: 'Difficult', ar: 'صعب', 'zh-CN': '比较难', ja: '難しいです', 'zh-TW': '比較難', es: 'Es difícil' },
  answerNote: { ko: "'있어요' 답이 내 식단과 겹치면 판정이 위험으로 바뀔 수 있어요.", en: "If the answer is 'Yes' for something in your diet, the result may change to Danger.", ar: "إذا كانت الإجابة 'نعم' لشيء في نظامك الغذائي، فقد تتغير النتيجة إلى خطر.", 'zh-CN': "如果对你忌口的食材回答'有'，判定可能会变为危险。", ja: "食事条件の材料に『入っています』と答えると、判定が危険に変わることがあります。", 'zh-TW': "如果對你忌口的食材回答'有'，判定可能會變為危險。", es: "Si responden 'Sí' sobre algo de tu dieta, el resultado puede pasar a Peligro." },
  save: { ko: '이 카드 저장하기', en: 'Save this card', ar: 'احفظ هذه البطاقة', 'zh-CN': '保存这张卡', ja: 'このカードを保存', 'zh-TW': '儲存這張卡', es: 'Guardar esta tarjeta' },
  saved: { ko: '저장한 카드예요', en: 'Card saved', ar: 'تم حفظ البطاقة', 'zh-CN': '已保存这张卡', ja: '保存済みのカードです', 'zh-TW': '已儲存這張卡', es: 'Tarjeta guardada' },
  savedToast: { ko: '카드를 저장했어요', en: 'Card saved', ar: 'تم حفظ البطاقة', 'zh-CN': '已保存卡片', ja: 'カードを保存しました', 'zh-TW': '已儲存卡片', es: 'Tarjeta guardada' },
  view: { ko: '보기', en: 'View', ar: 'عرض', 'zh-CN': '查看', ja: '見る', 'zh-TW': '查看', es: 'Ver' },
  saveError: { ko: '카드를 저장하지 못했어요. 다시 시도해 주세요.', en: 'Could not save the card. Please try again.', ar: 'تعذر حفظ البطاقة. حاول مرة أخرى.', 'zh-CN': '无法保存卡片，请重试。', ja: 'カードを保存できませんでした。もう一度お試しください。', 'zh-TW': '無法儲存卡片，請重試。', es: 'No pudimos guardar la tarjeta. Inténtalo de nuevo.' },
  answerError: { ko: '답을 저장하지 못했어요. 다시 시도해 주세요.', en: 'Could not save the answer. Please try again.', ar: 'تعذر حفظ الإجابة. حاول مرة أخرى.', 'zh-CN': '无法保存回答，请重试。', ja: '答えを保存できませんでした。もう一度お試しください。', 'zh-TW': '無法儲存回答，請重試。', es: 'No pudimos guardar la respuesta. Inténtalo de nuevo.' },
} satisfies Record<string, AllText>;

const SHEETS: CountText = {
  ko: (n) => `${n}장`, en: (n) => `${n} ${n === 1 ? 'card' : 'cards'}`, ar: (n) => `${n} بطاقة`, 'zh-CN': (n) => `${n}张`, ja: (n) => `${n}枚`, 'zh-TW': (n) => `${n}張`, es: (n) => `${n} ${n === 1 ? 'tarjeta' : 'tarjetas'}`,
};

const KIND_META: Record<StaffCardKind, { title: AllText; desc: AllText; icon: HsIconName; cardType: CardType }> = {
  ingredient: { title: S.ingredient, desc: S.ingredientDesc, icon: 'search', cardType: 'ingredient_check' },
  exclude: { title: S.exclude, desc: S.excludeDesc, icon: 'minus', cardType: 'exclude' },
  lessSpicy: { title: S.lessSpicy, desc: S.lessSpicyDesc, icon: 'chili', cardType: 'less_spicy' },
  order: { title: S.order, desc: S.orderDesc, icon: 'cards', cardType: 'order' },
};

interface StaffCardEntry {
  key: string;
  /** 진행 줄에 쓰는 재료 이름(앱 언어) */
  label: string | null;
  sentence: AllText;
  /** 서버 직원 질문(No 23 저장). 없으면 답은 화면에만. */
  questionId?: string;
  serverAnswer?: StaffAnswer | null;
}

/** 내 알레르기 → 이 메뉴의 riskIngredients 이름 → 같은 이름의 target=ingredient 질문(flag 질문은 쓰지 않음) */
function linkedQuestion(menu: MenuAnalysis, profileId: string) {
  const names = new Set((menu.explainability?.ingredients ?? []).filter((item) => item.profileIds?.includes(profileId)).map((item) => item.name.ko.trim()));
  return (menu.staffQuestions ?? []).find((question) => question.target === 'ingredient' && question.status !== 'expired' && names.has((question.ingredientName ?? '').trim()));
}

export function buildStaffCards(menu: MenuAnalysis, items: ProfileCommunicationItem[], language: Language): Record<StaffCardKind, StaffCardEntry[]> {
  const avoid = items.filter((item) => item.kind === 'allergy' || item.kind === 'alcohol');
  const diets = items.filter((item) => item.kind === 'diet');
  const label = (item: ProfileCommunicationItem) => localizedAll(item.label)[language];
  const spicy = Boolean(menu.isSpicy || menu.is_spicy);
  return {
    ingredient: [
      ...avoid.map((item) => {
        const question = linkedQuestion(menu, item.id);
        return { key: `ingredient:${item.id}`, label: label(item), sentence: staffSentence.ingredientCheck(localizedAll(item.label)), questionId: question?.questionId, serverAnswer: question?.answer ?? null };
      }),
      ...diets.map((item) => ({ key: `ingredient:${item.id}`, label: label(item), sentence: staffSentence.dietCheck(localizedAll(item.label)) })),
    ],
    exclude: avoid.map((item) => ({ key: `exclude:${item.id}`, label: label(item), sentence: staffSentence.exclude(localizedAll(item.label)) })),
    lessSpicy: spicy ? [{ key: 'lessSpicy', label: null, sentence: staffSentence.lessSpicy }] : [],
    order: [{ key: 'order', label: null, sentence: staffSentence.order(menuNameAll(menu)) }],
  };
}

interface StaffCardsSheetProps {
  language: Language;
  menu: MenuAnalysis;
  items: ProfileCommunicationItem[];
  demoMode: boolean;
  scanId?: string;
  /** 화면에만 남기는 답(메뉴 · 카드별) */
  answers: Record<string, Answer>;
  onAnswer: (key: string, answer: Answer) => void;
  /** 서버에 답을 저장한 뒤(판정 다시 받기) */
  onServerAnswer: () => void;
  onClose: () => void;
}

export function StaffCardsSheet({ language, menu, items, demoMode, scanId, answers, onAnswer, onServerAnswer, onClose }: StaffCardsSheetProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const cards = useMemo(() => buildStaffCards(menu, items, language), [menu, items, language]);
  const kinds = (Object.keys(KIND_META) as StaffCardKind[]).filter((kind) => cards[kind].length > 0);
  const [kind, setKind] = useState<StaffCardKind | null>(null);
  const [index, setIndex] = useState(0);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'save' | 'answer' | null>(null);
  const [error, setError] = useState('');

  if (!kind) {
    return (
      <HsSheet language={language} onClose={onClose} title={tx(language, S.title)} subtitle={`${menu.menuName} · ${tx(language, S.pick)}`}>
        <div className="space-y-2">
          {kinds.map((item) => (
            <OptionRow
              key={item}
              icon={KIND_META[item].icon}
              title={tx(language, KIND_META[item].title)}
              description={tx(language, KIND_META[item].desc)}
              trailing={txn(language, SHEETS, cards[item].length)}
              onClick={() => { setKind(item); setIndex(0); setError(''); }}
            />
          ))}
        </div>
      </HsSheet>
    );
  }

  const list = cards[kind];
  const card = list[Math.min(index, list.length - 1)];
  const answerKey = `${menu.id}:${card.key}`;
  const linked = Boolean(card.questionId && scanId && !demoMode);
  const value = answers[answerKey] ?? (linked ? card.serverAnswer ?? null : null);
  const options = kind === 'ingredient'
    ? [{ value: 'present' as const, label: tx(language, S.yes) }, { value: 'absent' as const, label: tx(language, S.no) }, { value: 'unknown' as const, label: tx(language, S.notSure) }]
    : kind === 'order' ? [] : [{ value: 'possible' as const, label: tx(language, S.possible) }, { value: 'difficult' as const, label: tx(language, S.difficult) }];
  const progress = list.length > 1 ? `${menu.menuName} · ${index + 1} / ${list.length}${card.label ? ` · ${card.label}` : ''}` : menu.menuName;
  const saved = savedKeys.has(answerKey);

  const answer = async (next: Answer) => {
    setError('');
    onAnswer(answerKey, next);
    if (!linked || !card.questionId || !scanId || (next !== 'present' && next !== 'absent' && next !== 'unknown')) return;
    setBusy('answer');
    try {
      await saveStaffAnswer(scanId, card.questionId, next);
      onServerAnswer();
    } catch {
      setError(tx(language, S.answerError));
    } finally { setBusy(null); }
  };

  const save = async () => {
    if (saved || busy) return;
    setBusy('save');
    setError('');
    try {
      const request = { type: KIND_META[kind].cardType, menuNameKo: menu.menuName, text: card.sentence, ...(scanId && !demoMode ? { scanId } : {}) };
      if (demoMode) saveDemoCard(request);
      else await saveCard(request);
      setSavedKeys((current) => new Set(current).add(answerKey));
      toast.show(tx(language, S.savedToast), { tone: 'success', action: { label: tx(language, S.view), onClick: () => navigate('/cards') } });
    } catch {
      setError(tx(language, S.saveError));
    } finally { setBusy(null); }
  };

  return (
    <HsSheet
      language={language}
      onClose={onClose}
      title={tx(language, KIND_META[kind].title)}
      subtitle={<span dir="auto">{progress}</span>}
      pager={list.length > 1 ? { index, total: list.length, onPrev: () => { setIndex((i) => Math.max(0, i - 1)); setError(''); }, onNext: () => { setIndex((i) => Math.min(list.length - 1, i + 1)); setError(''); } } : undefined}
      footer={
        <HsButton variant="outline" size="lg" block icon={saved ? 'check' : 'bookmark'} busy={busy === 'save'} disabled={saved} onClick={() => void save()}>
          {tx(language, saved ? S.saved : S.save)}
        </HsButton>
      }
    >
      <StaffCard key={card.key} language={language} korean={card.sentence.ko} translated={card.sentence[secondaryLanguage(language)]} />
      {options.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[13px] font-extrabold text-hs-ink-500">{tx(language, S.answerPrompt)}</p>
          <AnswerButtons<Answer> options={options} value={value} onChange={(next) => void answer(next)} label={tx(language, S.answerPrompt)} disabled={busy === 'answer'} />
          {kind === 'ingredient' && linked && <HsNote className="mt-3">{tx(language, S.answerNote)}</HsNote>}
        </div>
      )}
      {error && <InlineError className="mt-3">{error}</InlineError>}
    </HsSheet>
  );
}
