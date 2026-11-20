import { useEffect, useState } from 'react';
import { Check, ChevronRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Language, MenuAnalysis, UserProfile } from '../../App';
import { BottomSheet } from '../discovery/BottomSheet';
import { RestaurantPicker } from '../discovery/RestaurantPicker';
import { RESTAURANTS } from '../../demo/restaurants';
import { saveVisit, type VisitRecord } from '../../demo/records';
import { createTranslator } from '../../locales';
import {
  getProfileCommunicationItems,
  localizeMenuText,
} from '../../results/resultViewModel';
import { readDemo, writeDemo } from '../../demo/storage';
import { getScanResult, saveScanRecord } from '../../../api/scan';
import type { StoreCandidate, StoreSummary } from '../../../api/store';

export function SaveScanSheet({
  language,
  menus,
  profile,
  recordId,
  sourceScanId,
  restaurantId,
  store,
  demoMode,
  onClose,
  onSaved,
}: {
  language: Language;
  menus: MenuAnalysis[];
  profile: UserProfile | null;
  recordId: string;
  sourceScanId?: string;
  restaurantId: string | null;
  store?: StoreSummary | null;
  demoMode: boolean;
  onClose: () => void;
  onSaved: (store: StoreSummary | null) => void;
}) {
  const t = createTranslator(language);
  const navigate = useNavigate();
  const existing = readDemo<VisitRecord[]>('records', []).find(
    (r) => r.id === recordId,
  );
  const [selected, setSelected] = useState<string | null>(
    existing ? existing.restaurantId : restaurantId,
  );
  const [picker, setPicker] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [liveStore, setLiveStore] = useState<StoreCandidate | null>(null);
  const [linkedStore, setLinkedStore] = useState<StoreSummary | null>(store ?? null);
  const [linkedMethod, setLinkedMethod] = useState<'gps_candidate' | 'name_search' | 'kakao_fallback' | null>(null);
  const [storeLocked, setStoreLocked] = useState(Boolean(store));
  const [feedback, setFeedback] = useState<VisitRecord['feedback']>(
    existing?.feedback ?? {},
  );
  const restaurant = RESTAURANTS.find((r) => r.id === selected);
  const items = getProfileCommunicationItems(profile);
  useEffect(() => {
    if (demoMode || !sourceScanId) return;
    let active = true;
    getScanResult(sourceScanId).then(result => {
      if (!active) return;
      setStoreLocked(result.record?.storeLocked ?? Boolean(result.store));
      setLinkedStore(result.record?.store ?? result.store ?? null);
      const method = result.record?.storeMatchMethod;
      setLinkedMethod(method && method !== 'store_detail' ? method : null);
    }).catch(requestError => { if (active) setError(requestError instanceof Error ? requestError.message : String(requestError)); });
    return () => { active = false; };
  }, [demoMode, sourceScanId]);
  if (picker)
    return (
      <RestaurantPicker
        language={language}
        demoMode={demoMode}
        selectedId={selected}
        selectedStore={liveStore}
        onClose={() => setPicker(false)}
        onSelectDemo={(r) => {
          setSelected(r?.id ?? null);
          setFeedback({});
          setPicker(false);
        }}
        onSelectStore={(candidate) => {
          setLiveStore(candidate);
          setLinkedStore(candidate ? { storeId: candidate.storeId, name: candidate.name } : null);
          setLinkedMethod(candidate?.matchMethod && candidate.matchMethod !== 'store_detail' ? candidate.matchMethod : null);
          setPicker(false);
        }}
      />
    );
  return (
    <BottomSheet
      language={language}
      title={
        done
          ? t(
              '오늘의 한 끼를 기록했어요',
              'A meal to remember',
              'تم حفظ وجبتك اليوم',
            )
          : t('오늘의 메뉴 기록하기', 'Keep today’s menu', 'احفظ قائمة اليوم')
      }
      description={
        done
          ? t(
              '스캔 기록에서 언제든 다시 볼 수 있어요.',
              'Find it again in your scan journal, anytime.',
              'يمكنك العودة إليه في سجل المسح في أي وقت.',
            )
          : t(
              '식당을 연결하거나, 메뉴만 간단히 저장하세요.',
              'Link a restaurant or simply save the menu.',
              'اربط مطعماً أو احفظ القائمة فقط.',
            )
      }
      onClose={onClose}
    >
      {done ? (
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
            <Check className="size-8" />
          </div>
          <button
            onClick={() => navigate('/history')}
            className="min-h-12 w-full rounded-xl bg-brand-primary font-bold text-white"
          >
            {t('스캔 기록 보기', 'Open scan journal', 'افتح سجل المسح')}
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => { if (!storeLocked) setPicker(true); }}
            disabled={!demoMode && storeLocked}
            className="mb-4 flex min-h-20 w-full items-center gap-3 rounded-2xl border border-border-warm p-4 text-start"
          >
            <MapPin className="size-5 shrink-0 text-brand-primary" />
            <span className="flex-1">
              <span className="block text-sm font-bold">
                {demoMode ? (restaurant
                  ? localizeMenuText(restaurant.name, language)
                  : t(
                      '식당 연결하기 · 선택',
                      'Add a restaurant · optional',
                      'أضف مطعماً · اختياري',
                    )) : linkedStore?.name ?? t('식당 연결하기 · 선택', 'Add a restaurant · optional', 'أضف مطعماً · اختياري')}
              </span>
              <span className="mt-1 block text-xs text-text-secondary">
                {demoMode ? (restaurant
                  ? restaurant.name.ko
                  : t(
                      '연결하지 않아도 기록이 저장돼요',
                      'Your scan is saved even without a restaurant',
                      'يُحفظ المسح حتى بدون مطعم',
                    )) : storeLocked ? t('스캔 때 선택한 식당은 바꿀 수 없어요', 'The restaurant chosen for this scan is fixed', 'المطعم المحدد أثناء المسح ثابت') : t('연결하지 않아도 기록이 저장돼요', 'Your scan is saved even without a restaurant', 'يُحفظ المسح حتى بدون مطعم')}
              </span>
            </span>
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
          {(demoMode ? restaurant : linkedStore && !storeLocked) && (
            <button
              onClick={() => {
                setSelected(null);
                setLiveStore(null);
                setLinkedStore(null);
                setLinkedMethod(null);
                setFeedback({});
              }}
              className="mb-4 min-h-11 text-xs font-semibold text-text-secondary underline"
            >
              {t('식당 연결 해제', 'Remove restaurant', 'إزالة المطعم')}
            </button>
          )}
          {demoMode && restaurant && items.length > 0 && (
            <section className="mb-5">
              <h3 className="text-sm font-extrabold">
                {t(
                  '내 식단을 전달하기 편했나요?',
                  'Was it easy to share your needs?',
                  'هل كان توضيح احتياجاتك سهلاً؟',
                )}
              </h3>
              <p className="mb-3 mt-1 text-xs leading-5 text-text-secondary">
                {t(
                  '직접 경험한 항목만 알려주세요. 나중에 남겨도 괜찮아요.',
                  'Share only what you experienced. You can also skip this.',
                  'شارك ما جربته فقط. يمكنك تخطي هذه الخطوة.',
                )}
              </p>
              {items.map((item) => (
                <fieldset
                  key={item.id}
                  className="mb-3 rounded-xl bg-surface-subtle p-3"
                >
                  <legend className="px-1 text-xs font-bold">
                    {localizeMenuText(item.label, language)}
                  </legend>
                  <div className="flex gap-1.5">
                    {(
                      [
                        ['yes', t('편했어요', 'Easy', 'سهل')],
                        ['no', t('어려웠어요', 'Difficult', 'صعب')],
                        [
                          'unknown',
                          t('잘 모르겠어요', 'Not sure', 'لست متأكداً'),
                        ],
                      ] as const
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border px-1 text-center text-xs font-semibold ${feedback[item.id] === value ? 'border-brand-primary bg-brand-primary text-white' : 'border-border-warm bg-rice-white'}`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={item.id}
                          checked={feedback[item.id] === value}
                          onChange={() =>
                            setFeedback((current) => ({
                              ...current,
                              [item.id]: value,
                            }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>
          )}
          <button
            disabled={saving}
            onClick={async () => {
              if (!demoMode && sourceScanId) {
                setSaving(true);
                setError('');
                try {
                  const savedRecord = await saveScanRecord(sourceScanId, !storeLocked && linkedStore && linkedMethod ? { storeId: linkedStore.storeId, storeMatchMethod: linkedMethod } : undefined);
                  setDone(true);
                  onSaved(savedRecord.store);
                } catch (requestError) {
                  setError(requestError instanceof Error ? requestError.message : String(requestError));
                } finally { setSaving(false); }
                return;
              }
              saveVisit({
                id: recordId,
                sourceScanId,
                restaurantId: selected,
                title: existing && existing.restaurantId === selected
                  ? existing.title
                  : restaurant
                    ? localizeMenuText(restaurant.name, language)
                    : t('나의 메뉴 스캔', 'My menu scan', 'مسح قائمتي'),
                date: existing?.date ?? new Date().toISOString(),
                menuCount: menus.length,
                dangerCount: menus.filter((m) => m.riskLevel === 'danger')
                  .length,
                menus,
                profileSnapshot: profile,
                feedback: restaurant
                  ? Object.fromEntries(
                      Object.entries(feedback).filter(([id]) =>
                        items.some((item) => item.id === id),
                      ),
                    )
                  : {},
              });
              writeDemo('selected-restaurant', selected);
              setDone(true);
              onSaved(null);
            }}
            className="min-h-12 w-full rounded-xl bg-brand-primary text-sm font-extrabold text-white"
          >
            {saving ? t('저장 중…', 'Saving…', 'جار الحفظ…') : t('기록 저장하기', 'Save to my journal', 'احفظ في سجلي')}
          </button>
          {error && <p role="alert" className="mt-2 text-sm text-status-danger-text">{error}</p>}
        </>
      )}
    </BottomSheet>
  );
}
