import { useId, useState } from 'react';
import { createReview, updateReview, type RestaurantReview, type ReviewAnswer, type ReviewMenu } from '../../../api/reviews';
import type { Language, UserProfile } from '../../types';
import { saveDemoReview } from '../../demo/reviews';
import { getProfileCommunicationItems } from '../../results/resultViewModel';
import { AddChip, ChoiceChip, HS_TEXT, HsButton, HsIcon, HsNote, HsSheet, InlineError, TextField, tx, type AllText } from '../hs';
import { dietTagLabel } from '../results/menuView';

type Store = { id: string | number; name: string };

const V = {
  title: { ko: '식사 후기 남기기', en: 'Leave a meal review', ar: 'أضف مراجعة للوجبة', 'zh-CN': '写用餐评价', ja: '食事レビューを書く', 'zh-TW': '寫用餐評價', es: 'Dejar una reseña' },
  doneTitle: { ko: '후기를 저장했어요', en: 'Review saved', ar: 'تم حفظ المراجعة', 'zh-CN': '评价已保存', ja: 'レビューを保存しました', 'zh-TW': '評價已儲存', es: 'Reseña guardada' },
  doneBody: { ko: '마이페이지의 내가 작성한 후기에서 다시 볼 수 있어요.', en: 'Find it in My Reviews on your page.', ar: 'يمكنك العثور عليها في مراجعاتي.', 'zh-CN': '可在"我的页面 > 我写的评价"中再次查看。', ja: 'マイページの「自分のレビュー」で見られます。', 'zh-TW': '可在「我的頁面 > 我寫的評價」中再次查看。', es: 'La encontrarás en Mis reseñas.' },
  intro: { ko: '먹은 메뉴를 고르고, 내 식단 항목이 들어 있었는지 알려 주세요.', en: 'Choose what you ate and tell us whether it contained what you avoid.', ar: 'اختر ما تناولته وأخبرنا إن كان يحتوي على ما تتجنبه.', 'zh-CN': '请选择吃过的菜，并告诉我们是否含有你忌口的东西。', ja: '食べたメニューを選び、食事条件の材料が入っていたか教えてください。', 'zh-TW': '請選擇吃過的菜，並告訴我們是否含有你忌口的東西。', es: 'Elige lo que comiste y cuéntanos si llevaba lo que evitas.' },
  store: { ko: '식당', en: 'Restaurant', ar: 'المطعم', 'zh-CN': '餐厅', ja: 'お店', 'zh-TW': '餐廳', es: 'Restaurante' },
  ate: { ko: '먹은 메뉴', en: 'What you ate', ar: 'ما تناولته', 'zh-CN': '吃过的菜', ja: '食べたメニュー', 'zh-TW': '吃過的菜', es: 'Lo que comiste' },
  several: { ko: '여러 개 고를 수 있어요', en: 'choose several', ar: 'يمكنك اختيار أكثر من طبق', 'zh-CN': '可多选', ja: '複数選べます', 'zh-TW': '可多選', es: 'puedes elegir varios' },
  otherMenu: { ko: '다른 메뉴 이름', en: 'Another dish', ar: 'طبق آخر', 'zh-CN': '其他菜名', ja: '別のメニュー名', 'zh-TW': '其他菜名', es: 'Otro plato' },
  add: { ko: '추가', en: 'Add', ar: 'إضافة', 'zh-CN': '添加', ja: '追加', 'zh-TW': '新增', es: 'Añadir' },
  yes: { ko: '있었어요', en: 'It did', ar: 'نعم، كان موجودًا', 'zh-CN': '有', ja: '入っていた', 'zh-TW': '有', es: 'Sí lo llevaba' },
  no: { ko: '없었어요', en: 'It didn’t', ar: 'لا، لم يكن موجودًا', 'zh-CN': '没有', ja: '入っていなかった', 'zh-TW': '沒有', es: 'No lo llevaba' },
  unsure: { ko: '잘 모르겠어요', en: 'Not sure', ar: 'لست متأكدًا', 'zh-CN': '不确定', ja: 'わからない', 'zh-TW': '不確定', es: 'No estoy seguro' },
  note: { ko: '이 메뉴에 남기고 싶은 말 (선택)', en: 'A note about this dish (optional)', ar: 'ملاحظة عن هذا الطبق (اختياري)', 'zh-CN': '想对这道菜说的话（选填）', ja: 'このメニューへのひとこと（任意）', 'zh-TW': '想對這道菜說的話（選填）', es: 'Una nota sobre este plato (opcional)' },
  placeholder: { ko: '예: 소스를 따로 달라고 하니 바로 바꿔 줬어요.', en: 'e.g. They served the sauce on the side when I asked.', ar: 'مثال: قدّموا الصلصة منفصلة عندما طلبت.', 'zh-CN': '例：我请店家把酱汁分开放，他们马上就换了。', ja: '例：ソースを別にしてと頼んだら、すぐに替えてくれました。', 'zh-TW': '例：我請店家把醬汁分開放，他們馬上就換了。', es: 'Ej.: Pedí la salsa aparte y la cambiaron enseguida.' },
  public: { ko: '이 응답은 다른 사용자에게 지도 후기로 보여요. 이름은 표시되지 않아요.', en: 'Others can see this review on the map. Your name is hidden.', ar: 'ستظهر هذه المراجعة للآخرين على الخريطة دون اسمك.', 'zh-CN': '这条回答会作为地图评价展示给其他用户，不会显示你的名字。', ja: 'この回答は地図のレビューとしてほかの人に表示されます。名前は表示されません。', 'zh-TW': '這則回答會作為地圖評價顯示給其他使用者，不會顯示你的名字。', es: 'Otras personas verán esta reseña en el mapa. Tu nombre no se muestra.' },
  pickFirst: { ko: '메뉴를 고르면 후기를 저장할 수 있어요.', en: 'Choose a dish to save a review.', ar: 'اختر طبقًا لحفظ المراجعة.', 'zh-CN': '选择菜后即可保存评价。', ja: 'メニューを選ぶとレビューを保存できます。', 'zh-TW': '選擇菜後即可儲存評價。', es: 'Elige un plato para guardar la reseña.' },
  overLimit: { ko: '500자를 넘은 메뉴의 말을 줄여 주세요.', en: 'Shorten the note that exceeds 500 characters.', ar: 'اختصر الملاحظة التي تتجاوز 500 حرف.', 'zh-CN': '请缩短超过500字的留言。', ja: '500文字を超えたひとことを短くしてください。', 'zh-TW': '請縮短超過500字的留言。', es: 'Acorta la nota que supera los 500 caracteres.' },
  save: { ko: '후기 저장하기', en: 'Save review', ar: 'حفظ المراجعة', 'zh-CN': '保存评价', ja: 'レビューを保存', 'zh-TW': '儲存評價', es: 'Guardar reseña' },
  error: { ko: '후기를 저장하지 못했어요. 다시 시도해 주세요.', en: 'Could not save the review. Please try again.', ar: 'تعذر حفظ المراجعة. حاول مرة أخرى.', 'zh-CN': '无法保存评价，请重试。', ja: 'レビューを保存できませんでした。もう一度お試しください。', 'zh-TW': '無法儲存評價，請重試。', es: 'No pudimos guardar la reseña. Inténtalo de nuevo.' },
} satisfies Record<string, AllText>;

const question = (label: string): AllText => ({
  ko: `${label} 관련 재료가 들어 있었나요?`,
  en: `Did it contain anything related to ${label}?`,
  ar: `هل احتوى على شيء متعلق بـ${label}؟`,
  'zh-CN': `里面有和「${label}」相关的食材吗？`,
  ja: `「${label}」に関わる材料は入っていましたか？`,
  'zh-TW': `裡面有和「${label}」相關的食材嗎？`,
  es: `¿Llevaba algo relacionado con: ${label}?`,
});

/** F4-10 식사 후기: 먹은 메뉴 여러 개 + 내 식단 항목마다 있었어요/없었어요/잘 모르겠어요 + 메뉴별 한마디(500자) */
export function MealReviewSheet({ language, profile, store, menuNames = [], scanId, scanMenuIds = {}, demoMode,
  initialReview, onClose, onSaved }: {
  language: Language; profile: UserProfile | null; store: Store; menuNames?: string[];
  /** 스캔에서 쓴 후기일 때 메뉴 이름 → scanMenuId(명세 V2). */
  scanId?: string; scanMenuIds?: Record<string, string>; demoMode: boolean; initialReview?: RestaurantReview;
  onClose: () => void; onSaved: (review: RestaurantReview) => void;
}) {
  const baseId = useId();
  const items = getProfileCommunicationItems(profile);
  const initialNames = initialReview?.menus.map(menu => menu.name) ?? menuNames;
  const [available, setAvailable] = useState<string[]>(initialNames);
  const [selected, setSelected] = useState<string[]>(initialReview?.menus.map(menu => menu.name) ?? []);
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [menus, setMenus] = useState<Record<string, ReviewMenu>>(() => Object.fromEntries(
    (initialReview?.menus ?? []).map(menu => [menu.name, menu]),
  ));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const overLimit = selected.some(name => (menus[name]?.note ?? '').length > 500);

  const addMenu = () => {
    const name = draftName.trim();
    if (!name || name.length > 200) return;
    if (!available.includes(name)) setAvailable(current => [...current, name]);
    if (!selected.includes(name)) setSelected(current => [...current, name]);
    setDraftName('');
    setAdding(false);
  };
  const toggleMenu = (name: string) => {
    setSelected(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
  };
  const setAnswer = (name: string, itemId: string, answer: ReviewAnswer) => {
    setMenus(current => ({ ...current, [name]: {
      ...current[name], name, note: current[name]?.note ?? '', answers: { ...current[name]?.answers, [itemId]: answer },
    } }));
  };
  const setNote = (name: string, note: string) => {
    setMenus(current => ({ ...current, [name]: { ...current[name], name, answers: current[name]?.answers ?? {}, note } }));
  };
  const save = async () => {
    if (!selected.length || overLimit || saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = selected.map(name => {
        const menu = menus[name] ?? { name, answers: {}, note: '' };
        const scanMenuId = menu.scanMenuId ?? (scanId ? scanMenuIds[name] : undefined);
        return scanMenuId ? { ...menu, scanMenuId } : menu;
      });
      const review = demoMode
        ? saveDemoReview(String(store.id), payload, initialReview)
        : initialReview
          ? await updateReview(initialReview.id, payload)
          : await createReview(Number(store.id), payload, scanId);
      onSaved(review);
      setDone(true);
    } catch {
      setError(tx(language, V.error));
    } finally { setSaving(false); }
  };

  if (done) {
    return (
      <HsSheet language={language} onClose={onClose} title={tx(language, V.doneTitle)} footer={<HsButton variant="primary" size="cta" onClick={onClose}>{tx(language, HS_TEXT.close)}</HsButton>}>
        <p role="status" className="rounded-hs-xl bg-hs-mint-100 p-5 text-[14px] font-bold text-hs-brand-700">{tx(language, V.doneBody)}</p>
      </HsSheet>
    );
  }

  const answerOptions: Array<[ReviewAnswer, AllText]> = [['yes', V.yes], ['no', V.no], ['unknown', V.unsure]];
  return (
    <HsSheet
      language={language}
      onClose={onClose}
      title={tx(language, V.title)}
      footer={<>
        {error && <InlineError className="mb-2">{error}</InlineError>}
        {(overLimit || !selected.length) && <p className={`mb-2 text-[12px] font-bold ${overLimit ? 'text-hs-danger-700' : 'text-hs-ink-500'}`}>{tx(language, overLimit ? V.overLimit : V.pickFirst)}</p>}
        <HsButton variant="primary" size="cta" busy={saving} disabled={!selected.length || overLimit} onClick={() => void save()}>{tx(language, V.save)}</HsButton>
      </>}
    >
      <p className="-mt-1 text-[13px] leading-[1.5] font-semibold text-hs-ink-500">{tx(language, V.intro)}</p>
      <div className="mt-4 flex min-h-12 items-center gap-2 rounded-hs-lg bg-hs-surface-100 px-4">
        <HsIcon name="pin" size={17} className="flex-none text-hs-brand-700" />
        <span className="flex-none text-[12px] font-extrabold text-hs-ink-500">{tx(language, V.store)}</span>
        <span className="min-w-0 truncate text-[15px] font-black text-hs-ink-900">{store.name}</span>
      </div>

      <p className="mt-5 text-[14px] font-black text-hs-ink-900">{tx(language, V.ate)} <span className="text-[12px] font-bold text-hs-ink-500">· {tx(language, V.several)}</span></p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {available.map(name => <ChoiceChip key={name} selected={selected.includes(name)} onClick={() => toggleMenu(name)}>{name}</ChoiceChip>)}
        {!adding && <AddChip onClick={() => setAdding(true)}>{tx(language, V.otherMenu)}</AddChip>}
      </div>
      {adding && (
        <div className="mt-2.5 flex items-start gap-2">
          <TextField className="min-w-0 flex-1" label={tx(language, V.otherMenu)} placeholder={tx(language, V.otherMenu)} value={draftName} onChange={setDraftName} maxLength={200} autoFocus
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addMenu(); } }} />
          <HsButton variant="outline" size="lg" onClick={addMenu} disabled={!draftName.trim()}>{tx(language, V.add)}</HsButton>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {selected.map((name, menuIndex) => {
          const note = menus[name]?.note ?? '';
          const noteId = `${baseId}-note-${menuIndex}`;
          return (
            <section key={name} className="rounded-hs-2xl border-[1.5px] border-hs-line-200 p-4">
              <h3 className="text-[16px] font-black text-hs-ink-900">{name}</h3>
              {items.map(item => {
                const label = dietTagLabel(item, language);
                const value = menus[name]?.answers[item.id];
                return (
                  <fieldset key={item.id} className="mt-3">
                    <legend className="mb-2 text-[13px] font-extrabold text-hs-ink-900">{tx(language, question(label))}</legend>
                    <div className="grid grid-cols-3 gap-1.5 max-[340px]:grid-cols-1">
                      {answerOptions.map(([answer, text]) => (
                        <button key={answer} type="button" role="radio" aria-checked={value === answer} onClick={() => setAnswer(name, item.id, answer)}
                          className={`min-h-10 rounded-hs-pill px-1 text-[13px] font-extrabold ${value === answer ? 'bg-hs-brand-700 text-hs-surface-0' : 'border-[1.5px] border-hs-line-200 bg-hs-surface-0 text-hs-ink-900'}`}>
                          {tx(language, text)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
              <label htmlFor={noteId} className="mt-4 block text-[13px] font-extrabold text-hs-ink-900">{tx(language, V.note)}</label>
              <textarea id={noteId} value={note} onChange={event => setNote(name, event.target.value)} aria-invalid={note.length > 500 || undefined}
                placeholder={tx(language, V.placeholder)}
                className={`mt-1.5 min-h-[84px] w-full resize-y rounded-hs-lg border-[1.5px] bg-hs-surface-0 p-3 text-[14px] leading-[1.5] font-semibold text-hs-ink-900 outline-none placeholder:text-hs-ink-400 focus:border-2 focus:border-hs-brand-700 ${note.length > 500 ? 'border-hs-danger-500' : 'border-hs-line-200'}`} />
              <p dir="ltr" className={`text-end text-[12px] font-bold tabular-nums ${note.length > 500 ? 'text-hs-danger-700' : 'text-hs-ink-500'}`}>{note.length} / 500</p>
            </section>
          );
        })}
      </div>
      {selected.length > 0 && <HsNote className="mt-3">{tx(language, V.public)}</HsNote>}
    </HsSheet>
  );
}
