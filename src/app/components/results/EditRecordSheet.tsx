import { useState } from 'react';
import { saveScanRecord, updateScanTitle, type ScanRecordResponse } from '../../../api/scan';
import type { StoreMatchMethod } from '../../../api/store';
import type { Language, MenuAnalysis, UserProfile } from '../../types';
import { RESTAURANTS } from '../../demo/restaurants';
import { saveVisit, type VisitRecord } from '../../demo/records';
import { readDemo, writeDemo } from '../../demo/storage';
import { localizeMenuText } from '../../results/resultViewModel';
import { RestaurantPicker } from '../discovery/RestaurantPicker';
import { HsButton, HsIcon, HsLinkButton, HsNote, HsSheet, InlineError, TextField, tx, type AllText } from '../hs';

const E = {
  title: { ko: '기록 수정', en: 'Edit record', ar: 'تعديل السجل', 'zh-CN': '编辑记录', ja: '記録を編集', 'zh-TW': '編輯紀錄', es: 'Editar registro' },
  autoSaved: { ko: '결과는 자동으로 저장돼요. 스캔 기록에서 언제든 다시 볼 수 있어요.', en: 'Results are saved automatically. You can open them anytime from your scan history.', ar: 'تُحفظ النتائج تلقائيًا. يمكنك فتحها في أي وقت من سجل المسح.', 'zh-CN': '结果会自动保存，可随时在扫描记录中查看。', ja: '結果は自動で保存されます。スキャン記録からいつでも見られます。', 'zh-TW': '結果會自動儲存，可隨時在掃描紀錄中查看。', es: 'Los resultados se guardan solos. Puedes verlos cuando quieras en tu historial.' },
  name: { ko: '기록 이름', en: 'Record name', ar: 'اسم السجل', 'zh-CN': '记录名称', ja: '記録の名前', 'zh-TW': '紀錄名稱', es: 'Nombre del registro' },
  nameEmpty: { ko: '기록 이름을 적어 주세요.', en: 'Enter a name for this record.', ar: 'أدخل اسمًا لهذا السجل.', 'zh-CN': '请输入记录名称。', ja: '記録の名前を入力してください。', 'zh-TW': '請輸入紀錄名稱。', es: 'Escribe un nombre para el registro.' },
  store: { ko: '식당', en: 'Restaurant', ar: 'المطعم', 'zh-CN': '餐厅', ja: 'お店', 'zh-TW': '餐廳', es: 'Restaurante' },
  lockedSub: { ko: '스캔할 때 선택한 식당', en: 'Chosen when you scanned', ar: 'تم اختياره عند المسح', 'zh-CN': '扫描时选择的餐厅', ja: 'スキャン時に選んだお店', 'zh-TW': '掃描時選擇的餐廳', es: 'Elegido al escanear' },
  lockedNote: { ko: '스캔할 때 고른 식당은 바꿀 수 없어요. 스캔 기록은 비공개예요.', en: 'The restaurant chosen at scan time can’t be changed. Scan records are private.', ar: 'لا يمكن تغيير المطعم المختار وقت المسح. سجلات المسح خاصة.', 'zh-CN': '扫描时选择的餐厅无法更改。扫描记录不公开。', ja: 'スキャン時に選んだお店は変更できません。スキャン記録は非公開です。', 'zh-TW': '掃描時選擇的餐廳無法更改。掃描紀錄不公開。', es: 'El restaurante elegido al escanear no se puede cambiar. Tus registros son privados.' },
  linkedSub: { ko: '스캔 뒤에 연결한 식당', en: 'Linked after scanning', ar: 'تم ربطه بعد المسح', 'zh-CN': '扫描后关联的餐厅', ja: 'スキャン後につないだお店', 'zh-TW': '掃描後連結的餐廳', es: 'Vinculado después de escanear' },
  change: { ko: '변경', en: 'Change', ar: 'تغيير', 'zh-CN': '更改', ja: '変更', 'zh-TW': '變更', es: 'Cambiar' },
  link: { ko: '식당 연결하기', en: 'Link a restaurant', ar: 'اربط مطعمًا', 'zh-CN': '关联餐厅', ja: 'お店をつなぐ', 'zh-TW': '連結餐廳', es: 'Vincular restaurante' },
  linkNote: { ko: '식당을 연결하면 기록과 후기에 쓸 수 있어요. 이미 나온 판정은 그대로예요. 스캔 기록은 비공개예요.', en: 'Link a restaurant to use this scan for records and reviews. Current results stay the same. Scan records are private.', ar: 'اربط مطعمًا لاستخدام هذا المسح في السجلات والمراجعات. تبقى النتائج الحالية كما هي. سجلات المسح خاصة.', 'zh-CN': '关联餐厅后可用于记录和评价，已有判定不变。扫描记录不公开。', ja: 'お店をつなぐと記録とレビューに使えます。すでに出た判定はそのままです。スキャン記録は非公開です。', 'zh-TW': '連結餐廳後可用於紀錄和評價，已有判定不變。掃描紀錄不公開。', es: 'Vincula un restaurante para usar este escaneo en registros y reseñas. Los resultados no cambian. Tus registros son privados.' },
  save: { ko: '저장', en: 'Save', ar: 'حفظ', 'zh-CN': '保存', ja: '保存', 'zh-TW': '儲存', es: 'Guardar' },
  saveError: { ko: '기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', en: 'Could not save this record. Please try again shortly.', ar: 'تعذر حفظ هذا السجل. يرجى المحاولة بعد قليل.', 'zh-CN': '无法保存记录，请稍后重试。', ja: '記録を保存できませんでした。しばらくしてからもう一度お試しください。', 'zh-TW': '無法儲存紀錄，請稍後重試。', es: 'No pudimos guardar el registro. Inténtalo de nuevo en un momento.' },
  defaultTitle: { ko: '나의 메뉴 스캔', en: 'My menu scan', ar: 'مسح قائمتي', 'zh-CN': '我的菜单扫描', ja: 'わたしのメニュースキャン', 'zh-TW': '我的菜單掃描', es: 'Mi escaneo de menú' },
} satisfies Record<string, AllText>;

export interface EditRecordResult {
  title: string;
  record?: ScanRecordResponse;
  /** 기기 기록에 연결한 시연 식당 */
  restaurantId?: string | null;
  storeName: string | null;
}

interface EditRecordSheetProps {
  language: Language;
  menus: MenuAnalysis[];
  profile: UserProfile | null;
  recordId: string;
  sourceScanId?: string;
  demoMode: boolean;
  title: string | null;
  /** 스캔할 때 고른 식당(바꿀 수 없음) */
  lockedStore: { storeId: number; name: string } | null;
  /** 스캔 뒤 연결한 식당 */
  linkedStore: { storeId: number; name: string } | null;
  restaurantId: string | null;
  /** 식당 연결부터 시작(식당 없는 스캔의 후기 남기기) */
  startWithPicker?: boolean;
  onClose: () => void;
  onSaved: (result: EditRecordResult) => void;
}

/** F4-11 기록 수정: 기록 이름(30자) + 식당(스캔 때 고른 식당은 잠김, 없으면 연결) */
export function EditRecordSheet({ language, menus, profile, recordId, sourceScanId, demoMode, title, lockedStore, linkedStore, restaurantId, startWithPicker = false, onClose, onSaved }: EditRecordSheetProps) {
  const existing = readDemo<VisitRecord[]>('records', []).find((record) => record.id === recordId);
  // 기기 기록이 있으면 그대로 편집, 실제 스캔만 서버 저장.
  const isServer = Boolean(sourceScanId) && !demoMode && !existing;
  const [selectedDemo, setSelectedDemo] = useState<string | null>(existing?.restaurantId ?? restaurantId);
  const [selectedStore, setSelectedStore] = useState<{ storeId: number; name: string; matchMethod?: StoreMatchMethod } | null>(linkedStore);
  const demoRestaurant = RESTAURANTS.find((item) => item.id === selectedDemo);
  const storeName = lockedStore?.name ?? selectedStore?.name ?? (demoRestaurant ? localizeMenuText(demoRestaurant.name, language) : null);
  const initialTitle = (title ?? existing?.title ?? storeName ?? tx(language, E.defaultTitle)).slice(0, 30);
  const [name, setName] = useState(initialTitle);
  const [picker, setPicker] = useState(startWithPicker && !lockedStore);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const trimmed = name.trim();

  const save = async () => {
    if (!trimmed) { setError(tx(language, E.nameEmpty)); return; }
    setSaving(true);
    setError('');
    try {
      if (isServer && sourceScanId) {
        if (trimmed !== (title ?? '').trim()) await updateScanTitle(sourceScanId, trimmed);
        const newStore = !lockedStore && selectedStore && selectedStore.storeId !== linkedStore?.storeId && selectedStore.matchMethod && selectedStore.matchMethod !== 'store_detail'
          ? { storeId: selectedStore.storeId, storeMatchMethod: selectedStore.matchMethod as Exclude<StoreMatchMethod, 'store_detail'> }
          : null;
        const record = newStore ? await saveScanRecord(sourceScanId, newStore) : undefined;
        onSaved({ title: trimmed, record, storeName });
        return;
      }
      saveVisit({
        ...(existing ?? {}),
        id: recordId,
        sourceScanId,
        restaurantId: lockedStore ? String(lockedStore.storeId) : selectedDemo,
        title: trimmed,
        date: existing?.date ?? new Date().toISOString(),
        menuCount: menus.length,
        dangerCount: menus.filter((menu) => menu.riskLevel === 'danger').length,
        cautionCount: menus.filter((menu) => menu.riskLevel === 'caution').length,
        store: storeName ? { storeId: lockedStore?.storeId ?? selectedStore?.storeId ?? 0, name: storeName } : null,
        menus,
        profileSnapshot: profile,
        feedback: existing?.feedback ?? {},
      });
      if (!lockedStore) writeDemo('selected-restaurant', selectedDemo);
      onSaved({ title: trimmed, restaurantId: selectedDemo, storeName });
    } catch {
      setError(tx(language, E.saveError));
    } finally { setSaving(false); }
  };

  if (picker) {
    return (
      <RestaurantPicker
        language={language}
        demoMode={!isServer}
        selectedId={selectedDemo}
        selectedStoreId={selectedStore?.storeId}
        onClose={() => setPicker(false)}
        onSelectDemo={(restaurant) => { setSelectedDemo(restaurant?.id ?? null); setPicker(false); }}
        onSelectStore={(store) => {
          setSelectedStore(store ? { storeId: store.storeId, name: store.branchName ? `${store.name} ${store.branchName}` : store.name, matchMethod: store.matchMethod } : null);
          setPicker(false);
        }}
      />
    );
  }

  const linkedName = !lockedStore ? storeName : null;
  return (
    <HsSheet
      language={language}
      onClose={onClose}
      title={tx(language, E.title)}
      footer={<HsButton variant="primary" size="cta" busy={saving} disabled={!trimmed} onClick={() => void save()}>{tx(language, E.save)}</HsButton>}
    >
      <p className="-mt-1 text-[13px] leading-[1.5] font-semibold text-hs-ink-500">{tx(language, E.autoSaved)}</p>
      <TextField className="mt-5" label={tx(language, E.name)} showLabel value={name} onChange={(value) => { setName(value.slice(0, 30)); setError(''); }} maxLength={30} error={!trimmed ? tx(language, E.nameEmpty) : undefined} />
      <p className="mt-5 mb-1.5 text-[13px] font-extrabold text-hs-ink-900">{tx(language, E.store)}</p>
      {lockedStore ? (
        <>
          <div className="flex items-center gap-3 rounded-hs-lg border-[1.5px] border-hs-brand-700 bg-hs-mint-100 py-3 ps-4 pe-3">
            <HsIcon name="pin" size={18} className="flex-none text-hs-brand-700" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-black text-hs-ink-900">{lockedStore.name}</span>
              <span className="block text-[12px] font-semibold text-hs-ink-500">{tx(language, E.lockedSub)}</span>
            </span>
            <span className="flex size-9 flex-none items-center justify-center rounded-hs-pill bg-hs-surface-0 text-hs-ink-500"><HsIcon name="lock" size={16} label={tx(language, E.lockedNote)} /></span>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-hs-ink-500">{tx(language, E.lockedNote)}</p>
        </>
      ) : linkedName ? (
        <>
          <div className="flex items-center gap-3 rounded-hs-lg border-[1.5px] border-hs-line-200 bg-hs-surface-0 py-2 ps-4 pe-2">
            <HsIcon name="pin" size={18} className="flex-none text-hs-brand-700" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-black text-hs-ink-900">{linkedName}</span>
              <span className="block text-[12px] font-semibold text-hs-ink-500">{tx(language, E.linkedSub)}</span>
            </span>
            <HsLinkButton tone="brand" className="px-2" onClick={() => setPicker(true)}>{tx(language, E.change)}</HsLinkButton>
          </div>
          <HsNote className="mt-2">{tx(language, E.linkNote)}</HsNote>
        </>
      ) : (
        <>
          <HsButton variant="outline" size="lg" block icon="pin" onClick={() => setPicker(true)}>{tx(language, E.link)}</HsButton>
          <HsNote className="mt-2">{tx(language, E.linkNote)}</HsNote>
        </>
      )}
      {error && trimmed && <InlineError className="mt-3">{error}</InlineError>}
    </HsSheet>
  );
}
