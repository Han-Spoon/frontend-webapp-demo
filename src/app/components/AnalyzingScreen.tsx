import { useState, useEffect, useRef } from 'react';
import { Camera, ChevronDown, CircleAlert, CircleDashed, Clock, Database, Loader2, ScanText, Search, ShieldCheck } from 'lucide-react';
import { appliedScanProfile, deleteScan, getScanResult, mapMenuResult, normalizeScanStatus, startScan } from '../../api/scan';
import { ApiError } from '../../api/user';
import type { StoreSummary } from '../../api/store';
import type { Language, MenuAnalysis, PendingMenuImage, UserProfile } from '../types';
import { createTranslator, translateText, type LocalizedText } from '../locales';
import { FILMING_MENUS } from '../results/filmingFixtures';
import { ConfirmDialog } from './common/ConfirmDialog';

interface AnalyzingScreenProps {
  language: Language;
  image: PendingMenuImage | null;
  userProfile: UserProfile | null;
  fixedResults?: boolean;
  onComplete: (scanId: string | null, menus: MenuAnalysis[], store: StoreSummary | null, appliedProfile: UserProfile | null) => void;
  onRetryWithNewImage: () => void;
  onCancel: () => void;
}

type Phase = 'analyzing' | 'retake' | 'failed';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_MS = 300000;
/** 이 시간이 지나면 '평소보다 오래 걸림' 안내(실제 경과 시간 기준) */
const SLOW_NOTICE_MS = 30000;

/** 서버 문장이 없거나 한국어 외 사용자용 기본 촬영 팁 */
const RETAKE_TIPS: LocalizedText[] = [
  {
    ko: '메뉴판 전체가 화면에 들어오게 찍어 주세요.',
    en: 'Fit the whole menu inside the frame.',
    ar: 'اجعل القائمة كاملة داخل الإطار.',
    'zh-CN': '让整张菜单都在画面内。',
    ja: 'メニュー全体が画面に入るように撮ってください。',
    'zh-TW': '讓整張菜單都在畫面內。',
    es: 'Encuadra el menú completo.',
  },
  {
    ko: '밝은 곳에서, 빛이 반사되지 않게 찍어 주세요.',
    en: 'Use good light and avoid glare.',
    ar: 'صوّر في مكان مضاء وتجنّب انعكاس الضوء.',
    'zh-CN': '在光线充足处拍摄，避免反光。',
    ja: '明るい場所で、光が反射しないように撮ってください。',
    'zh-TW': '在光線充足處拍攝，避免反光。',
    es: 'Busca buena luz y evita los reflejos.',
  },
  {
    ko: '흔들리지 않게 정면에서 찍어 주세요.',
    en: 'Hold steady and shoot straight on.',
    ar: 'ثبّت الهاتف وصوّر من الأمام مباشرة.',
    'zh-CN': '保持稳定，正对菜单拍摄。',
    ja: '手ぶれしないよう、正面から撮ってください。',
    'zh-TW': '保持穩定，正對菜單拍攝。',
    es: 'Mantén el móvil firme y de frente.',
  },
];

/** 서버 한국어 문장 목록의 빈 값 제거(배열이 아니면 빈 목록) */
function cleanSentences(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map(item => item.trim()) : [];
}

export function AnalyzingScreen({ language, image, userProfile, fixedResults = false, onComplete, onRetryWithNewImage, onCancel }: AnalyzingScreenProps) {
  const [phase, setPhase] = useState<Phase>('analyzing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryRequiresNewUpload, setRetryRequiresNewUpload] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retakeReasons, setRetakeReasons] = useState<string[]>([]);
  const [retakeSuggestions, setRetakeSuggestions] = useState<string[]>([]);
  const activeScanId = useRef<string | null>(null);

  const t = createTranslator(language);
  const tr = (text: LocalizedText) => translateText(language, text);
  // 진행 중 서버 스캔은 취소 시 삭제.
  const cancel = () => {
    if (activeScanId.current) void deleteScan(activeScanId.current).catch(error => console.warn('Scan cancellation failed:', error));
    activeScanId.current = null;
    onCancel();
  };
  const cancelDialog = confirmCancel && (
    <ConfirmDialog
      language={language}
      title={t('분석을 취소할까요?', 'Cancel the analysis?', 'هل تريد إلغاء التحليل؟')}
      description={t('이 사진의 분석 화면에서 나가요.', 'You will leave this photo’s analysis.', 'ستغادر تحليل هذه الصورة.')}
      cancelLabel={t('계속 분석', 'Keep analyzing', 'متابعة التحليل')}
      confirmLabel={t('분석 취소', 'Cancel analysis', 'إلغاء التحليل')}
      onCancel={() => setConfirmCancel(false)}
      onConfirm={cancel}
    />
  );

  const steps = [
    { icon: ScanText, label: t('메뉴 이름과 설명을 읽고 있어요', 'Reading menu names and descriptions', 'جار قراءة أسماء الأطباق وأوصافها') },
    { icon: Search, label: t('조리법과 재료 정보를 찾고 있어요', 'Finding cooking and ingredient information', 'جار البحث عن معلومات الطهي والمكونات') },
    { icon: Database, label: t('육수와 소스 속 숨은 재료도 확인하고 있어요', 'Checking hidden ingredients in broths and sauces', 'جار التحقق من المكونات المخفية في المرق والصلصات') },
    { icon: ShieldCheck, label: t('내 식단 기준과 비교하고 있어요', 'Comparing with your dietary profile', 'جار المقارنة مع ملفك الغذائي') },
  ];

  const scanFailureMessage = (failureCode?: string | null) => {
    switch (failureCode) {
      case 'OCR_SERVICE_ERROR':
        return tr({ ko: '메뉴판 글자를 읽지 못했어요. 새 사진으로 다시 시도해 주세요.', en: 'We couldn’t read the menu text. Please try again with a new photo.', ar: 'لم نتمكن من قراءة نص القائمة. حاول مجددًا بصورة جديدة.', 'zh-CN': '无法识别菜单上的文字。请换一张照片再试。', ja: 'メニューの文字を読み取れませんでした。新しい写真でもう一度お試しください。', 'zh-TW': '無法辨識菜單上的文字。請換一張照片再試。', es: 'No pudimos leer el texto del menú. Inténtalo de nuevo con otra foto.' });
      case 'SCAN_PROCESSING_TIMEOUT':
        return tr({ ko: '분석이 너무 오래 걸려 멈췄어요. 잠시 후 새 사진으로 다시 시도해 주세요.', en: 'The analysis took too long and stopped. Please try a new photo in a moment.', ar: 'استغرق التحليل وقتًا طويلًا فتوقف. حاول بصورة جديدة بعد قليل.', 'zh-CN': '分析耗时过长，已停止。请稍后换一张照片再试。', ja: '分析に時間がかかりすぎて止まりました。少し待ってから新しい写真でお試しください。', 'zh-TW': '分析耗時過長，已停止。請稍後換一張照片再試。', es: 'El análisis tardó demasiado y se detuvo. Prueba con otra foto en un momento.' });
      case 'AI_SERVICE_OVERLOADED':
      case 'AI_SERVICE_UNAVAILABLE':
        return tr({ ko: '지금 분석 요청이 많아요. 잠시 후 다시 시도해 주세요.', en: 'We’re getting a lot of requests right now. Please try again shortly.', ar: 'هناك طلبات كثيرة الآن. حاول مجددًا بعد قليل.', 'zh-CN': '当前分析请求较多。请稍后再试。', ja: 'ただいま分析の依頼が混み合っています。しばらくしてからお試しください。', 'zh-TW': '目前分析請求較多。請稍後再試。', es: 'Ahora mismo hay muchas solicitudes. Inténtalo de nuevo en un momento.' });
      case 'RULE_ENGINE_ERROR':
      case 'RESULT_SERVICE_ERROR':
      case 'AI_RESULT_MISMATCH':
        return tr({ ko: '메뉴 분석을 끝내지 못했어요. 새 사진으로 다시 시도해 주세요.', en: 'We couldn’t finish analyzing the menu. Please try again with a new photo.', ar: 'لم نتمكن من إكمال تحليل القائمة. حاول مجددًا بصورة جديدة.', 'zh-CN': '未能完成菜单分析。请换一张照片再试。', ja: 'メニューの分析を完了できませんでした。新しい写真でもう一度お試しください。', 'zh-TW': '未能完成菜單分析。請換一張照片再試。', es: 'No pudimos terminar el análisis del menú. Inténtalo de nuevo con otra foto.' });
      default:
        return tr({ ko: '문제가 생겨 분석이 멈췄어요. 새 사진으로 다시 시도해 주세요.', en: 'Something went wrong and the analysis stopped. Please try again with a new photo.', ar: 'حدثت مشكلة وتوقف التحليل. حاول مجددًا بصورة جديدة.', 'zh-CN': '出现问题，分析已停止。请换一张照片再试。', ja: '問題が起きて分析が止まりました。新しい写真でもう一度お試しください。', 'zh-TW': '發生問題，分析已停止。請換一張照片再試。', es: 'Algo salió mal y el análisis se detuvo. Inténtalo de nuevo con otra foto.' });
    }
  };

  useEffect(() => {
    if (!image) {
      setErrorMessage(tr({ ko: '분석할 사진이 없어요. 새 사진을 선택해 주세요.', en: 'There’s no photo to analyze. Please choose a new photo.', ar: 'لا توجد صورة لتحليلها. اختر صورة جديدة.', 'zh-CN': '没有可分析的照片。请选择新照片。', ja: '分析する写真がありません。新しい写真を選んでください。', 'zh-TW': '沒有可分析的照片。請選擇新照片。', es: 'No hay ninguna foto para analizar. Elige una foto nueva.' }));
      setRetryRequiresNewUpload(true);
      setPhase('failed');
      return;
    }

    if (fixedResults) {
      setPhase('analyzing');
      setErrorMessage(null);
      const timer = window.setTimeout(() => {
        onComplete(null, FILMING_MENUS, image.store ? { storeId: image.store.storeId, name: image.store.name } : null, null);
      }, 4200);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const run = async () => {
      setPhase('analyzing');
      setErrorMessage(null);
      setRetryRequiresNewUpload(false);

      if (!image.storage?.key) {
        setErrorMessage(tr({ ko: '사진을 올리지 못했어요. 새 사진으로 다시 시도해 주세요.', en: 'We couldn’t upload the photo. Please try again with a new photo.', ar: 'لم نتمكن من رفع الصورة. حاول مجددًا بصورة جديدة.', 'zh-CN': '照片上传失败。请换一张照片再试。', ja: '写真をアップロードできませんでした。新しい写真でもう一度お試しください。', 'zh-TW': '照片上傳失敗。請換一張照片再試。', es: 'No pudimos subir la foto. Inténtalo de nuevo con otra foto.' }));
        setRetryRequiresNewUpload(true);
        setPhase('failed');
        return;
      }

      try {
        const { scanId } = await startScan({
          storageKey: image.storage.key,
          source: image.source,
          ...(image.store
            ? { storeId: image.store.storeId, storeMatchMethod: image.store.matchMethod }
            : {}),
        });
        activeScanId.current = scanId;
        const deadline = Date.now() + MAX_POLL_MS;

        while (!cancelled) {
          const result = await getScanResult(scanId);
          if (cancelled) return;

          const status = normalizeScanStatus(result.status);

          if (status === 'completed') {
            activeScanId.current = null;
            // 방금 시작한 스캔: 스냅샷이 없으면 지금 식단이 판정 기준.
            const appliedProfile = appliedScanProfile(result.dietSnapshot, userProfile, result.locale ?? language) ?? userProfile;
            onComplete(scanId, (result.menus ?? []).map((menu, index) => mapMenuResult(menu, index, result.locale ?? language, appliedProfile)), result.record?.store ?? result.store ?? null, appliedProfile);
            return;
          }
          if (status === 'needs_retake') {
            setRetakeReasons(cleanSentences(result.retakeReasons));
            setRetakeSuggestions(cleanSentences(result.retakeSuggestions));
            setPhase('retake');
            return;
          }
          if (status === 'failed') {
            setErrorMessage(scanFailureMessage(result.failureCode));
            // storageKey 멱등성 때문에 같은 키로 다시 시작하면 기존 FAILED 반환.
            setRetryRequiresNewUpload(true);
            setPhase('failed');
            return;
          }
          if (status === 'unknown') {
            console.warn('Unknown scan status:', result.status, result);
          }
          if (Date.now() >= deadline) {
            setErrorMessage(tr({ ko: '결과가 아직 나오지 않았어요. 잠시 후 다시 시도해 주세요.', en: 'The result isn’t ready yet. Please try again shortly.', ar: 'النتيجة ليست جاهزة بعد. حاول مجددًا بعد قليل.', 'zh-CN': '结果还没出来。请稍后再试。', ja: 'まだ結果が出ていません。しばらくしてからもう一度お試しください。', 'zh-TW': '結果還沒出來。請稍後再試。', es: 'El resultado aún no está listo. Inténtalo de nuevo en un momento.' }));
            setPhase('failed');
            return;
          }
          await delay(POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Unable to complete scan analysis:', error);
        if (!navigator.onLine) {
          setErrorMessage(tr({ ko: '인터넷 연결이 끊겼어요. 연결을 확인한 뒤 다시 시도해 주세요.', en: 'You’re offline. Check your connection and try again.', ar: 'أنت غير متصل. تحقق من اتصالك وحاول مجددًا.', 'zh-CN': '网络已断开。请检查连接后重试。', ja: 'インターネット接続が切れました。接続を確認してもう一度お試しください。', 'zh-TW': '網路已中斷。請檢查連線後再試一次。', es: 'Sin conexión. Revisa tu conexión e inténtalo de nuevo.' }));
        } else if (error instanceof ApiError && [400, 413, 415, 422].includes(error.status)) {
          setRetryRequiresNewUpload(true);
          setErrorMessage(tr({ ko: '이 사진으로는 분석을 시작하지 못했어요. 새 사진을 선택해 주세요.', en: 'We couldn’t start analyzing this photo. Please choose a new one.', ar: 'لم نتمكن من بدء تحليل هذه الصورة. اختر صورة جديدة.', 'zh-CN': '无法用这张照片开始分析。请选择新照片。', ja: 'この写真では分析を始められませんでした。新しい写真を選んでください。', 'zh-TW': '無法用這張照片開始分析。請選擇新照片。', es: 'No pudimos empezar a analizar esta foto. Elige otra.' }));
        } else {
          setErrorMessage(tr({ ko: '분석 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', en: 'We couldn’t load the analysis result. Please try again shortly.', ar: 'تعذر تحميل نتيجة التحليل. حاول مجددًا بعد قليل.', 'zh-CN': '无法加载分析结果。请稍后再试。', ja: '分析結果を読み込めませんでした。しばらくしてからもう一度お試しください。', 'zh-TW': '無法載入分析結果。請稍後再試。', es: 'No pudimos cargar el resultado del análisis. Inténtalo de nuevo en un momento.' }));
        }
        setPhase('failed');
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [image, attempt, fixedResults]);

  useEffect(() => {
    setSlow(false);
    // 실패·재촬영으로 바뀌면 열려 있던 취소 확인창 닫기.
    if (phase !== 'analyzing') { setConfirmCancel(false); return; }
    const timer = window.setTimeout(() => setSlow(true), SLOW_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, attempt]);

  // 재촬영 안내(needs_retake). 서버 이유·제안은 번역 없는 한국어라 한국어 사용자에게만.
  if (phase === 'retake') {
    const serverTips = language === 'ko';
    const reasons = serverTips ? retakeReasons : [];
    const tips = serverTips && retakeSuggestions.length > 0 ? retakeSuggestions : RETAKE_TIPS.map(tr);
    return (
      <div className="flex h-dvh flex-col bg-surface-base">
        <div className="relative flex h-16 flex-shrink-0 items-center justify-center border-b border-border-warm bg-surface-raised/95 px-5">
          <h1 className="text-base font-bold text-soy-ink">{tr({ ko: '다시 찍어 주세요', en: 'Please retake the photo', ar: 'يرجى إعادة التصوير', 'zh-CN': '请重新拍摄', ja: 'もう一度撮ってください', 'zh-TW': '請重新拍攝', es: 'Vuelve a hacer la foto' })}</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-8">
          <div className="mx-auto w-full max-w-sm">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-border-warm bg-surface-raised shadow-[var(--shadow-card)]">
              <Camera className="size-7 text-brand-accent" aria-hidden="true" />
            </div>
            <p className="text-center text-lg font-bold leading-relaxed text-soy-ink">
              {tr({ ko: '이 사진으로는 메뉴를 확인하기 어려워요.', en: 'It’s hard to check the menu from this photo.', ar: 'يصعب فحص القائمة من هذه الصورة.', 'zh-CN': '这张照片难以识别菜单。', ja: 'この写真ではメニューを確認しにくいです。', 'zh-TW': '這張照片難以辨識菜單。', es: 'Es difícil revisar el menú con esta foto.' })}
            </p>
            {reasons.length > 0 && (
              <ul lang="ko" className="mt-3 space-y-1 text-center text-sm leading-6 text-text-secondary">
                {reasons.map(reason => <li key={reason}>{reason}</li>)}
              </ul>
            )}
            <div className="mt-6 rounded-[var(--radius-card)] border border-border-warm bg-surface-raised p-4 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-extrabold text-text-primary">{tr({ ko: '이렇게 찍어 보세요', en: 'Try this', ar: 'جرّب ما يلي', 'zh-CN': '可以这样拍', ja: 'こう撮ってみてください', 'zh-TW': '可以這樣拍', es: 'Prueba así' })}</h2>
              <ul lang={serverTips ? 'ko' : undefined} className="mt-3 space-y-2">
                {tips.map((tip, index) => (
                  <li key={tip} className="flex gap-3 text-sm leading-6 text-text-primary">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-xs font-bold tabular-nums text-text-secondary" aria-hidden="true">{index + 1}</span>
                    <span className="min-w-0 flex-1">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 space-y-2 border-t border-border-warm bg-surface-raised/95 px-5 py-3">
          <button
            type="button"
            onClick={onRetryWithNewImage}
            className="min-h-12 w-full rounded-xl bg-brand-primary font-bold text-white shadow-sm hover:bg-brand-primary-hover"
          >
            {t('다시 촬영', 'Retake', 'إعادة التصوير')}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="min-h-12 w-full rounded-[18px] border border-border-warm bg-surface-raised text-sm font-bold text-text-primary hover:bg-surface-subtle"
          >
            {t('홈으로', 'Home', 'الرئيسية')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-surface-base">
      <div className="relative flex h-16 flex-shrink-0 items-center justify-center border-b border-border-warm bg-surface-raised/95 px-5">
        <h1 className="text-base font-bold text-soy-ink">
          {phase === 'failed'
            ? tr({ ko: '분석하지 못했어요', en: 'Couldn’t analyze the menu', ar: 'تعذر تحليل القائمة', 'zh-CN': '未能完成分析', ja: '分析できませんでした', 'zh-TW': '未能完成分析', es: 'No pudimos analizar el menú' })
            : t('메뉴판 분석 중', 'Analyzing menu', 'جار تحليل القائمة')}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="relative mx-auto mb-5 aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-[24px] border border-border-warm bg-surface-raised shadow-[var(--shadow-card)]">
          {image ? (
            <img src={image.previewUrl} alt={t('분석 중인 메뉴판', 'Menu being analyzed', 'القائمة قيد التحليل')} className="w-full h-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-text-secondary">
              <span className="text-6xl">📋</span>
            </div>
          )}
          {phase === 'analyzing' && (
            <div className="animate-scan-line pointer-events-none absolute inset-x-5 top-[12%] h-0.5 rounded-full bg-brand-primary shadow-[0_0_12px_rgba(23,100,73,0.35)]" aria-hidden="true" />
          )}
        </div>

        <div className="mx-auto w-full max-w-sm">
          {phase === 'analyzing' ? (
            <>
              <div className="mb-4 text-center">
                <Loader2 className="mx-auto mb-3 size-7 animate-spin text-brand-primary" />
                <p className="text-base font-extrabold text-text-primary">{t('필요한 정보를 차근차근 확인하고 있어요', 'We are carefully checking the information', 'نتحقق من المعلومات بعناية')}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">{tr({ ko: '결과가 나오면 바로 보여 드릴게요.', en: 'We’ll show the result as soon as it’s ready.', ar: 'سنعرض النتيجة فور جاهزيتها.', 'zh-CN': '结果一出来就会马上显示。', ja: '結果が出たらすぐにお見せします。', 'zh-TW': '結果一出來就會馬上顯示。', es: 'Te mostraremos el resultado en cuanto esté listo.' })}</p>
              </div>
              <div role="status" aria-live="polite">
                {slow && (
                  <p className="mb-3 flex items-start gap-2 rounded-xl border border-border-warm bg-surface-raised px-3.5 py-3 text-sm leading-5 text-text-primary">
                    <Clock className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden="true" />
                    {tr({ ko: '평소보다 오래 걸리고 있어요. 조금만 더 기다려 주세요.', en: 'This is taking longer than usual. Please wait a little longer.', ar: 'يستغرق هذا وقتًا أطول من المعتاد. يرجى الانتظار قليلًا.', 'zh-CN': '比平时花的时间更长。请再稍等一下。', ja: 'いつもより時間がかかっています。もう少しお待ちください。', 'zh-TW': '比平常花的時間更長。請再稍等一下。', es: 'Está tardando más de lo habitual. Espera un poco más.' })}
                  </p>
                )}
              </div>
              <p className="mb-2 px-1 text-xs font-bold text-text-secondary">{tr({ ko: '이런 순서로 확인해요', en: 'What we check, in order', ar: 'ما نتحقق منه بالترتيب', 'zh-CN': '我们按以下顺序检查', ja: 'この順番で確認します', 'zh-TW': '我們依以下順序檢查', es: 'Lo que revisamos, en orden' })}</p>
              <ol className="space-y-2 rounded-[var(--radius-card)] border border-border-warm bg-surface-raised p-3 shadow-[var(--shadow-card)]">
                {steps.map(({ icon: Icon, label }, index) => (
                  <li key={label} className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-secondary"><Icon className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-text-primary">{label}</span>
                    <span className="text-xs font-bold tabular-nums text-text-tertiary">{index + 1}</span>
                  </li>
                ))}
              </ol>

              <button onClick={() => setShowDetails((current) => !current)} aria-expanded={showDetails} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-border-warm bg-surface-raised px-3.5 text-sm font-bold text-text-secondary hover:bg-surface-subtle">
                <span>{t('분석 과정 자세히 보기', 'See how analysis works', 'عرض تفاصيل عملية التحليل')}</span>
                <ChevronDown className={`size-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </button>
              {showDetails && (
                <div className="mt-2 rounded-xl border border-border-warm bg-surface-subtle p-4 text-xs leading-5 text-text-secondary">
                  <div className="mb-2 flex items-center gap-2 font-extrabold text-text-primary"><CircleDashed className="size-4 text-brand-primary" aria-hidden="true" />{tr({ ko: '어떻게 확인하나요?', en: 'How do we check?', ar: 'كيف نتحقق؟', 'zh-CN': '我们如何检查？', ja: 'どうやって確認するの？', 'zh-TW': '我們如何檢查？', es: '¿Cómo lo revisamos?' })}</div>
                  <p>{tr({ ko: '사진 속 글자를 읽고, 메뉴마다 흔히 들어가는 재료를 찾아요. 육수·소스처럼 겉으로 안 보이는 재료도 살펴보고, 내 식단과 겹치는지 비교해요. 가게 직원이 답한 기록이 있으면 함께 반영해요.', en: 'We read the text in your photo and look up the ingredients each dish usually contains. We also look for hidden ingredients, like those in broths and sauces, and compare them with your diet. If restaurant staff have answered before, we use that too.', ar: 'نقرأ النص في صورتك ونبحث عن المكونات المعتادة لكل طبق. ونبحث أيضًا عن المكونات غير الظاهرة مثل مكونات المرق والصلصات، ونقارنها بنظامك الغذائي. وإذا أجاب موظفو المطعم من قبل، نأخذ إجاباتهم في الاعتبار.', 'zh-CN': '我们会读取照片中的文字，查找每道菜常用的食材，也会检查汤底、酱料等看不见的食材，并与你的饮食限制比对。如果店员以前回答过，也会一起参考。', ja: '写真の文字を読み取り、料理ごとによく使われる材料を調べます。だしやソースのように見えない材料も確認し、あなたの食事制限と照らし合わせます。お店のスタッフの回答記録があれば、それも反映します。', 'zh-TW': '我們會讀取照片中的文字，查找每道菜常用的食材，也會檢查湯底、醬料等看不見的食材，並與你的飲食限制比對。如果店員以前回答過，也會一起參考。', es: 'Leemos el texto de tu foto y buscamos los ingredientes habituales de cada plato. También revisamos ingredientes que no se ven, como los de caldos y salsas, y los comparamos con tu dieta. Si el personal del restaurante ya respondió antes, también lo tenemos en cuenta.' })}</p>
                  <p className="mt-2">{tr({ ko: '단계마다 얼마나 진행됐는지는 알 수 없어서 퍼센트는 보여 드리지 않아요.', en: 'We can’t tell how far each step has gone, so we don’t show a percentage.', ar: 'لا يمكننا معرفة مدى تقدّم كل خطوة، لذلك لا نعرض نسبة مئوية.', 'zh-CN': '我们无法得知每一步的进度，所以不显示百分比。', ja: '各段階の進み具合はわからないため、パーセントは表示しません。', 'zh-TW': '我們無法得知每一步的進度，所以不顯示百分比。', es: 'No podemos saber cuánto ha avanzado cada paso, así que no mostramos un porcentaje.' })}</p>
                  {/* TODO: 서버 단계 상태 제공 시 항목별 진행 상태 연결 */}
                </div>
              )}
            </>
          ) : (
            <div role="alert" className="rounded-[20px] border border-border-warm bg-surface-raised px-5 py-5 text-center shadow-[var(--shadow-card)]">
              <CircleAlert className="mx-auto mb-2 size-6 text-text-secondary" aria-hidden="true" />
              <p className="text-sm font-semibold leading-6 text-text-primary">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 space-y-2 border-t border-border-warm bg-surface-raised/95 px-5 py-3">
        {phase === 'failed' && (
          <button
            type="button"
            onClick={retryRequiresNewUpload ? onRetryWithNewImage : () => setAttempt((a) => a + 1)}
            className="min-h-12 w-full rounded-xl bg-brand-primary font-bold text-white shadow-sm hover:bg-brand-primary-hover"
          >
            {retryRequiresNewUpload
              ? t('새 사진으로 다시 시도', 'Try a new photo', 'المحاولة بصورة جديدة')
              : t('다시 시도', 'Retry', 'إعادة المحاولة')}
          </button>
        )}
        {/* 분석 중: 확인 뒤 취소 / 실패 뒤: 바로 홈 */}
        <button
          type="button"
          onClick={phase === 'failed' ? cancel : () => setConfirmCancel(true)}
          className="min-h-12 w-full rounded-[18px] border border-border-warm bg-surface-raised text-sm font-bold text-text-primary hover:bg-surface-subtle"
        >
          {phase === 'failed' ? t('홈으로', 'Home', 'الرئيسية') : t('취소', 'Cancel', 'إلغاء')}
        </button>
      </div>
      {cancelDialog}
    </div>
  );
}
