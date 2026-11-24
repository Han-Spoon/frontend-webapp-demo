import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Language } from '../../types';
import type { ProfileCommunicationItem } from '../../results/resultViewModel';
import { speak, ttsSupported } from '../../utils/speech';
import { useReturnFocus } from '../common/returnFocus';
import { ChoiceChip, FLIP_RTL, HS_TEXT, HsButton, HsIcon, HsIconButton, HsSheet, OptionRow, tx, type AllText, type HsIconName } from '../hs';
import { dietTagLabel, localizedAll, secondaryLanguage } from './menuView';
import { staffSentence, type StaffSentence } from './staffText';

type Mode = 'share' | 'check' | 'exclude';

const D = {
  title: { ko: '직원에게 내 식단 보여주기', en: 'Show staff my diet', ar: 'اعرض نظامي الغذائي على الموظف', 'zh-CN': '向店员出示我的饮食', ja: 'スタッフに食事条件を見せる', 'zh-TW': '向店員出示我的飲食', es: 'Mostrar mi dieta al personal' },
  pickItems: { ko: '전달할 식단 항목을 선택해 주세요.', en: 'Choose what to tell the staff.', ar: 'اختر ما تريد إخبار الموظف به.', 'zh-CN': '请选择要告诉店员的饮食项目。', ja: '伝える食事条件を選んでください。', 'zh-TW': '請選擇要告訴店員的飲食項目。', es: 'Elige qué quieres contarle al personal.' },
  how: { ko: '어떻게 전달할까요?', en: 'How should we say it?', ar: 'كيف نقولها؟', 'zh-CN': '要怎么传达？', ja: 'どう伝えますか？', 'zh-TW': '要怎麼傳達？', es: '¿Cómo lo decimos?' },
  share: { ko: '식단 기준 전달하기', en: 'Share my diet', ar: 'شارك نظامي الغذائي', 'zh-CN': '说明我的饮食', ja: '食事条件を伝える', 'zh-TW': '說明我的飲食', es: 'Contar mi dieta' },
  shareDesc: { ko: '고른 재료마다 한 장씩 보여줘요', en: 'One card for each item you chose', ar: 'بطاقة لكل بند اخترته', 'zh-CN': '每个项目各一张', ja: '選んだ項目ごとに1枚ずつ見せます', 'zh-TW': '每個項目各一張', es: 'Una tarjeta por cada elemento' },
  check: { ko: '재료 확인하기', en: 'Ask about an ingredient', ar: 'اسأل عن مكوّن', 'zh-CN': '确认食材', ja: '材料を確認する', 'zh-TW': '確認食材', es: 'Preguntar por un ingrediente' },
  checkDesc: { ko: '이 재료가 들어가는지 물어봐요', en: 'Ask if it is used', ar: 'اسأل إن كان مستخدمًا', 'zh-CN': '询问是否含有这种食材', ja: 'この材料が入っているか聞きます', 'zh-TW': '詢問是否含有這種食材', es: 'Pregunta si lo usan' },
  exclude: { ko: '빼고 요청', en: 'Ask to leave out', ar: 'طلب الإزالة', 'zh-CN': '要求不放', ja: '抜いてもらう', 'zh-TW': '要求不放', es: 'Pedir sin' },
  excludeDesc: { ko: '이 재료를 빼 달라고 부탁해요', en: 'Ask them to leave it out', ar: 'اطلب إزالته', 'zh-CN': '请店家不放这种食材', ja: 'この材料を抜いてもらいます', 'zh-TW': '請店家不放這種食材', es: 'Pide que lo quiten' },
  show: { ko: '직원에게 보여주기', en: 'Show the staff', ar: 'اعرض على الموظف', 'zh-CN': '出示给店员', ja: 'スタッフに見せる', 'zh-TW': '出示給店員', es: 'Mostrar al personal' },
  showScreen: { ko: '직원에게 이 화면을 보여주세요', en: 'Show this screen to the staff', ar: 'اعرض هذه الشاشة على الموظف', 'zh-CN': '请把这个画面给店员看', ja: 'この画面をスタッフに見せてください', 'zh-TW': '請把這個畫面給店員看', es: 'Muestra esta pantalla al personal' },
  otherItem: { ko: '다른 항목 선택', en: 'Choose another', ar: 'اختر بندًا آخر', 'zh-CN': '选择其他项目', ja: '別の項目を選ぶ', 'zh-TW': '選擇其他項目', es: 'Elegir otro' },
  next: { ko: '다음', en: 'Next', ar: 'التالي', 'zh-CN': '下一张', ja: '次へ', 'zh-TW': '下一張', es: 'Siguiente' },
  done: { ko: '완료', en: 'Done', ar: 'تم', 'zh-CN': '完成', ja: '完了', 'zh-TW': '完成', es: 'Listo' },
} satisfies Record<string, AllText>;

const MODES: Array<{ mode: Mode; icon: HsIconName; title: AllText; desc: AllText }> = [
  { mode: 'share', icon: 'shield', title: D.share, desc: D.shareDesc },
  { mode: 'check', icon: 'search', title: D.check, desc: D.checkDesc },
  { mode: 'exclude', icon: 'minus', title: D.exclude, desc: D.excludeDesc },
];

function sentenceFor(item: ProfileCommunicationItem, mode: Mode): StaffSentence {
  const term = localizedAll(item.label);
  if (item.kind === 'spicy') return mode === 'share' ? staffSentence.spicyShare : { main: mode === 'check' ? staffSentence.spicyCheck : staffSentence.lessSpicy };
  if (item.kind === 'diet') return mode === 'share' ? staffSentence.dietShare(term) : { main: staffSentence.dietCheck(term) };
  if (mode === 'check') return { main: staffSentence.ingredientCheck(term) };
  if (mode === 'exclude') return { main: staffSentence.exclude(term) };
  return item.kind === 'alcohol' ? staffSentence.avoidShare(term) : staffSentence.allergyShare(term);
}

/** 한국어 큰 문장 안의 재료 이름을 위험색으로 */
function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? text.indexOf(term) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<span className="text-hs-danger-700">{term}</span>{text.slice(at + term.length)}</>;
}

/** F4-09 전체 화면 카드: 고른 항목마다 한 장 */
function DietFullScreen({ language, items, mode, onBack, onDone }: { language: Language; items: ProfileCommunicationItem[]; mode: Mode; onBack: () => void; onDone: () => void }) {
  const returnFocus = useReturnFocus();
  const [index, setIndex] = useState(0);
  const item = items[index];
  const sentence = sentenceFor(item, mode);
  const second = secondaryLanguage(language);
  const label = (target: ProfileCommunicationItem) => localizedAll(target.label)[language];
  const nextItem = items[index + 1];
  const translated = [sentence.main[second], sentence.sub?.[second]].filter(Boolean).join(' ');
  const korean = [sentence.main.ko, sentence.sub?.ko].filter(Boolean).join(' ');
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onBack(); }}>
      <Dialog.Portal>
        <Dialog.Content aria-describedby={undefined} onCloseAutoFocus={returnFocus} dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-[55] mx-auto flex w-full max-w-[430px] flex-col overflow-y-auto bg-hs-mint-100 px-5 pt-[18px] pb-[max(24px,env(safe-area-inset-bottom))] focus:outline-none">
          <div className="flex items-center gap-2">
            <HsIconButton icon="back" tone="white" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={onBack} />
            <Dialog.Title className="min-w-0 flex-1 text-center text-[14px] font-black text-hs-brand-700">{tx(language, D.showScreen)}</Dialog.Title>
            <span className="size-11 flex-none" aria-hidden="true" />
          </div>
          {items.length > 1 && (
            <p className="mx-auto mt-4 inline-flex h-7 items-center rounded-hs-pill bg-hs-surface-0 px-3 text-[13px] font-black text-hs-ink-900" dir="auto">{index + 1} / {items.length} · {label(item)}</p>
          )}
          <section className="mt-3 rounded-[28px] bg-hs-surface-0 px-6 pt-7 pb-6 shadow-[0_10px_30px_rgba(23,32,28,0.08)]">
            <p lang="ko" className="hs-staff-xl break-keep text-hs-ink-900"><Highlight text={sentence.main.ko} term={localizedAll(item.label).ko} /></p>
            {sentence.sub && <p lang="ko" className="mt-3 break-keep text-[22px] leading-[1.4] font-black text-hs-ink-700">{sentence.sub.ko}</p>}
            {translated && translated !== korean && (
              <p lang={second} className="mt-5 border-t-[1.5px] border-hs-line-200 pt-5 text-[16px] leading-[1.5] font-bold text-hs-ink-500">{translated}</p>
            )}
            {ttsSupported && (
              <button type="button" onClick={() => speak(korean, 'ko-KR')} className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-hs-pill bg-hs-mint-100 px-4 text-[14px] font-extrabold text-hs-brand-700">
                <HsIcon name="speaker" size={17} />
                {tx(language, HS_TEXT.listenKorean)}
              </button>
            )}
          </section>
          <div className="mt-5 flex gap-2">
            <HsButton variant="outline" size="md" className="flex-1" iconNode={<HsIcon name="back" size={16} strokeWidth={2.6} className={FLIP_RTL} />} onClick={onBack}>{tx(language, D.otherItem)}</HsButton>
            {nextItem
              ? <HsButton variant="ink" size="md" className="flex-1" iconNode={<HsIcon name="forward" size={16} strokeWidth={2.6} className={FLIP_RTL} />} onClick={() => setIndex(index + 1)}>{tx(language, D.next)} · {label(nextItem)}</HsButton>
              : <HsButton variant="ink" size="md" className="flex-1" icon="check" onClick={onDone}>{tx(language, D.done)}</HsButton>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** F4-08 직원에게 내 식단 보여주기: 항목 여러 개 고르기 + 전달 방식 → 전체 화면 카드 */
export function ShowDietSheet({ language, items, onClose }: { language: Language; items: ProfileCommunicationItem[]; onClose: () => void }) {
  const defaults = items.filter((item) => item.kind === 'allergy');
  const [selected, setSelected] = useState<string[]>((defaults.length ? defaults : items.slice(0, 1)).map((item) => item.id));
  const [mode, setMode] = useState<Mode>('share');
  const [showing, setShowing] = useState(false);
  const chosen = items.filter((item) => selected.includes(item.id));

  if (showing && chosen.length) return <DietFullScreen language={language} items={chosen} mode={mode} onBack={() => setShowing(false)} onDone={onClose} />;

  return (
    <HsSheet
      language={language}
      onClose={onClose}
      title={tx(language, D.title)}
      footer={<HsButton variant="primary" size="cta" disabled={!chosen.length} onClick={() => setShowing(true)}>{tx(language, D.show)}</HsButton>}
    >
      <p className="text-[14px] font-extrabold text-hs-ink-900">{tx(language, D.pickItems)}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {items.map((item) => {
          const on = selected.includes(item.id);
          return (
            <ChoiceChip key={item.id} selected={on} className="min-h-10 text-[14px]" onClick={() => setSelected((current) => on ? current.filter((id) => id !== item.id) : [...current, item.id])}>
              {dietTagLabel(item, language)}
            </ChoiceChip>
          );
        })}
      </div>
      <p className="mt-6 text-[14px] font-extrabold text-hs-ink-900" id="show-diet-mode">{tx(language, D.how)}</p>
      <div role="radiogroup" aria-labelledby="show-diet-mode" className="mt-2.5 space-y-2">
        {MODES.map((item) => (
          <OptionRow key={item.mode} icon={item.icon} title={tx(language, item.title)} description={tx(language, item.desc)} selected={mode === item.mode} onClick={() => setMode(item.mode)} />
        ))}
      </div>
    </HsSheet>
  );
}
