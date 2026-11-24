import { useState, useEffect, useRef } from 'react';
import { appliedScanProfile, deleteScan, getScanResult, mapMenuResult, normalizeScanStatus, startScan, type ScanRecordResponse } from '../../api/scan';
import { ApiError } from '../../api/user';
import type { StoreSummary } from '../../api/store';
import type { Language, MenuAnalysis, PendingMenuImage, UserProfile } from '../types';
import { translateText, type LocalizedText } from '../locales';
import { FILMING_MENUS } from '../results/filmingFixtures';
import { HsButton, HsDialog, HsIcon, HsLinkButton, tx, type AllText, type HsIconName } from './hs';

interface AnalyzingScreenProps {
  language: Language;
  image: PendingMenuImage | null;
  userProfile: UserProfile | null;
  fixedResults?: boolean;
  onComplete: (scanId: string | null, menus: MenuAnalysis[], store: StoreSummary | null, appliedProfile: UserProfile | null, meta?: { title?: string | null; scannedAt?: string | null; record?: ScanRecordResponse | null }) => void;
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

const A = {
  analyzing: { ko: '메뉴판 분석 중', en: 'Analyzing the menu', ar: 'جار تحليل القائمة', 'zh-CN': '正在分析菜单', ja: 'メニューを分析中', 'zh-TW': '正在分析菜單', es: 'Analizando el menú' },
  checking: { ko: '필요한 정보를 차근차근 확인하고 있어요', en: 'We’re checking everything step by step', ar: 'نتحقق من المعلومات خطوة بخطوة', 'zh-CN': '正在一步步确认所需信息', ja: '必要な情報を一つずつ確認しています', 'zh-TW': '正在一步步確認所需資訊', es: 'Revisamos todo paso a paso' },
  soon: { ko: '결과가 나오면 바로 보여 드릴게요.', en: 'We’ll show the result as soon as it’s ready.', ar: 'سنعرض النتيجة فور جاهزيتها.', 'zh-CN': '结果一出来就会马上显示。', ja: '結果が出たらすぐにお見せします。', 'zh-TW': '結果一出來就會馬上顯示。', es: 'Te mostraremos el resultado en cuanto esté listo.' },
  slow: { ko: '평소보다 오래 걸리고 있어요. 조금만 더 기다려 주세요.', en: 'This is taking longer than usual. Please wait a little longer.', ar: 'يستغرق هذا وقتًا أطول من المعتاد. يرجى الانتظار قليلًا.', 'zh-CN': '比平时花的时间更长。请再稍等一下。', ja: 'いつもより時間がかかっています。もう少しお待ちください。', 'zh-TW': '比平時花的時間更長。請再稍等一下。', es: 'Está tardando más de lo normal. Espera un poco más.' },
  order: { ko: '이런 순서로 확인해요', en: 'What we check, in order', ar: 'ما نتحقق منه بالترتيب', 'zh-CN': '我们按以下顺序检查', ja: 'この順番で確認します', 'zh-TW': '我們依以下順序檢查', es: 'Lo que revisamos, en orden' },
  step1: { ko: '메뉴 이름과 설명을 읽고 있어요', en: 'Reading dish names and descriptions', ar: 'نقرأ أسماء الأطباق وأوصافها', 'zh-CN': '正在读取菜名和说明', ja: 'メニュー名と説明を読んでいます', 'zh-TW': '正在讀取菜名和說明', es: 'Leyendo nombres y descripciones' },
  step2: { ko: '조리법과 재료 정보를 찾고 있어요', en: 'Finding recipes and ingredients', ar: 'نبحث عن طرق الطهي والمكونات', 'zh-CN': '正在查找做法和食材信息', ja: '調理法と材料の情報を探しています', 'zh-TW': '正在查找做法和食材資訊', es: 'Buscando recetas e ingredientes' },
  step3: { ko: '육수와 소스 속 숨은 재료도 확인하고 있어요', en: 'Checking hidden ingredients in broths and sauces', ar: 'نتحقق من المكونات الخفية في المرق والصلصات', 'zh-CN': '也在确认汤底和酱料里的隐藏食材', ja: 'だしやソースに隠れた材料も確認しています', 'zh-TW': '也在確認湯底和醬料裡的隱藏食材', es: 'Revisando ingredientes ocultos en caldos y salsas' },
  step4: { ko: '내 식단 기준과 비교하고 있어요', en: 'Comparing with your diet', ar: 'نقارن مع نظامك الغذائي', 'zh-CN': '正在与我的饮食条件比较', ja: '食事条件と比べています', 'zh-TW': '正在與我的飲食條件比較', es: 'Comparando con tu dieta' },
  details: { ko: '분석 과정 자세히 보기', en: 'How the analysis works', ar: 'كيف يعمل التحليل', 'zh-CN': '查看分析过程', ja: '分析の流れを詳しく見る', 'zh-TW': '查看分析過程', es: 'Cómo funciona el análisis' },
  howTitle: { ko: '어떻게 확인하나요?', en: 'How do we check?', ar: 'كيف نتحقق؟', 'zh-CN': '我们如何检查？', ja: 'どうやって確認するの？', 'zh-TW': '我們如何檢查？', es: '¿Cómo lo revisamos?' },
  howBody: { ko: '사진 속 글자를 읽고, 메뉴마다 흔히 들어가는 재료를 찾아요. 육수·소스처럼 겉으로 안 보이는 재료도 살펴보고, 내 식단과 겹치는지 비교해요. 가게 직원이 답한 기록이 있으면 함께 반영해요.', en: 'We read the text in your photo and look up the ingredients each dish usually has, including hidden ones like broths and sauces, then compare them with your diet. Staff answers recorded for the restaurant are included too.', ar: 'نقرأ النص في صورتك ونبحث عن المكونات المعتادة لكل طبق، بما فيها المخفية مثل المرق والصلصات، ثم نقارنها بنظامك الغذائي. ونضيف إجابات الموظفين المسجلة إن وجدت.', 'zh-CN': '我们会读取照片里的文字，查找每道菜常用的食材，也会查看汤底、酱料等看不见的食材，再与我的饮食比较。如有店员回答的记录，也会一并参考。', ja: '写真の文字を読み、メニューごとによく使われる材料を探します。だし・ソースのように見えない材料も確認し、食事条件と重なるか比べます。お店のスタッフが答えた記録があれば合わせて反映します。', 'zh-TW': '我們會讀取照片裡的文字，查找每道菜常用的食材，也會查看湯底、醬料等看不見的食材，再與我的飲食比較。如有店員回答的紀錄，也會一併參考。', es: 'Leemos el texto de la foto y buscamos los ingredientes habituales de cada plato, incluidos los ocultos como caldos y salsas, y los comparamos con tu dieta. Si el personal ha respondido antes, también lo tenemos en cuenta.' },
  noPercent: { ko: '단계마다 얼마나 진행됐는지는 알 수 없어서 퍼센트는 보여 드리지 않아요.', en: 'We can’t tell how far each step has gone, so we don’t show a percentage.', ar: 'لا يمكننا معرفة مدى تقدّم كل خطوة، لذلك لا نعرض نسبة مئوية.', 'zh-CN': '无法知道每个步骤进行到哪里，所以不显示百分比。', ja: '各段階の進み具合はわからないため、パーセントは表示しません。', 'zh-TW': '無法知道每個步驟進行到哪裡，所以不顯示百分比。', es: 'No sabemos cuánto avanza cada paso, así que no mostramos porcentajes.' },
  cancel: { ko: '분석 취소', en: 'Cancel analysis', ar: 'إلغاء التحليل', 'zh-CN': '取消分析', ja: '分析をキャンセル', 'zh-TW': '取消分析', es: 'Cancelar análisis' },
  cancelTitle: { ko: '분석을 취소할까요?', en: 'Cancel the analysis?', ar: 'هل تريد إلغاء التحليل؟', 'zh-CN': '要取消分析吗？', ja: '分析をキャンセルしますか？', 'zh-TW': '要取消分析嗎？', es: '¿Cancelar el análisis?' },
  cancelBody: { ko: '이 사진의 분석 화면에서 나가요.', en: 'You’ll leave this photo’s analysis.', ar: 'ستغادر تحليل هذه الصورة.', 'zh-CN': '将离开这张照片的分析画面。', ja: 'この写真の分析画面を終了します。', 'zh-TW': '將離開這張照片的分析畫面。', es: 'Saldrás del análisis de esta foto.' },
  keep: { ko: '계속 분석', en: 'Keep analyzing', ar: 'متابعة التحليل', 'zh-CN': '继续分析', ja: '分析を続ける', 'zh-TW': '繼續分析', es: 'Seguir analizando' },
  failed: { ko: '분석하지 못했어요', en: 'Couldn’t analyze the menu', ar: 'تعذر تحليل القائمة', 'zh-CN': '未能完成分析', ja: '分析できませんでした', 'zh-TW': '未能完成分析', es: 'No pudimos analizar el menú' },
  retakeTitle: { ko: '다시 찍어 주세요', en: 'Please retake the photo', ar: 'يرجى إعادة التصوير', 'zh-CN': '请重新拍摄', ja: 'もう一度撮ってください', 'zh-TW': '請重新拍攝', es: 'Vuelve a hacer la foto' },
  retakeBody: { ko: '이 사진으로는 메뉴를 확인하기 어려워요.', en: 'It’s hard to read the menu from this photo.', ar: 'يصعب قراءة القائمة من هذه الصورة.', 'zh-CN': '这张照片难以识别菜单。', ja: 'この写真ではメニューを確認しにくいです。', 'zh-TW': '這張照片難以辨識菜單。', es: 'Es difícil leer el menú en esta foto.' },
  tryThis: { ko: '이렇게 찍어 보세요', en: 'Try this', ar: 'جرّب ما يلي', 'zh-CN': '可以这样拍', ja: 'こう撮ってみてください', 'zh-TW': '可以這樣拍', es: 'Prueba así' },
  newPhoto: { ko: '새 사진으로 다시 시도', en: 'Try a new photo', ar: 'حاول بصورة جديدة', 'zh-CN': '换张新照片重试', ja: '新しい写真でもう一度', 'zh-TW': '換張新照片重試', es: 'Probar con otra foto' },
  retry: { ko: '다시 시도', en: 'Try again', ar: 'حاول مرة أخرى', 'zh-CN': '重试', ja: '再試行', 'zh-TW': '重試', es: 'Reintentar' },
  home: { ko: '홈으로', en: 'Go home', ar: 'إلى الرئيسية', 'zh-CN': '回到首页', ja: 'ホームへ', 'zh-TW': '回到首頁', es: 'Ir al inicio' },
  photoAlt: { ko: '분석 중인 메뉴판', en: 'Menu being analyzed', ar: 'القائمة قيد التحليل', 'zh-CN': '正在分析的菜单', ja: '分析中のメニュー', 'zh-TW': '正在分析的菜單', es: 'Menú en análisis' },
} satisfies Record<string, AllText>;

const STEPS: Array<{ icon: HsIconName; text: AllText }> = [
  { icon: 'file', text: A.step1 },
  { icon: 'search', text: A.step2 },
  { icon: 'bowl', text: A.step3 },
  { icon: 'shield', text: A.step4 },
];
const TIP_ICONS: HsIconName[] = ['scan', 'spark', 'hand'];

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

  const tr = (text: LocalizedText) => translateText(language, text);
  // 진행 중 서버 스캔은 취소 시 삭제.
  const cancel = () => {
    if (activeScanId.current) void deleteScan(activeScanId.current).catch(error => console.warn('Scan cancellation failed:', error));
    activeScanId.current = null;
    onCancel();
  };
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
            onComplete(scanId, (result.menus ?? []).map((menu, index) => mapMenuResult(menu, index, result.locale ?? language, appliedProfile)), result.record?.store ?? result.store ?? null, appliedProfile, { title: result.title, scannedAt: result.scannedAt, record: result.record ?? null });
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

  const cancelDialog = confirmCancel && (
    <HsDialog
      language={language}
      title={tx(language, A.cancelTitle)}
      description={tx(language, A.cancelBody)}
      cancelLabel={tx(language, A.keep)}
      confirmLabel={tx(language, A.cancel)}
      keepIsPrimary
      onCancel={() => setConfirmCancel(false)}
      onConfirm={cancel}
    />
  );

  // F3-07 분석 실패 · 재촬영 안내(needs_retake). 서버 이유 · 제안은 번역 없는 한국어라 한국어 사용자에게만.
  if (phase === 'retake' || phase === 'failed') {
    const retake = phase === 'retake';
    const serverTips = retake && language === 'ko';
    const reasons = serverTips ? retakeReasons : [];
    const tips = serverTips && retakeSuggestions.length > 0 ? retakeSuggestions : RETAKE_TIPS.map(tr);
    const newPhoto = retake || retryRequiresNewUpload;
    return (
      <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
        <main className="min-h-0 flex-1 overflow-y-auto">
          <header role="alert" className="rounded-b-[56px] bg-hs-coral-100 px-6 pt-10 pb-8 text-center">
            <span aria-hidden="true" className="mx-auto flex h-[84px] w-24 items-center justify-center rounded-t-[30px] rounded-b-[44px] bg-hs-surface-0 text-hs-coral-700">
              <HsIcon name={retake ? 'scan' : 'file'} size={34} />
            </span>
            <h1 className="mt-5 hs-title-lg">{tx(language, retake ? A.retakeTitle : A.failed)}</h1>
            <p className="mt-2 text-[14px] leading-[1.5] font-bold text-hs-coral-700">{retake ? tx(language, A.retakeBody) : errorMessage}</p>
            {reasons.length > 0 && (
              <ul lang="ko" className="mt-2 space-y-0.5 text-[13px] font-semibold text-hs-ink-700">
                {reasons.map(reason => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </header>
          <section className="px-5 pt-6 pb-6">
            <h2 className="mb-2.5 px-1 text-[13px] font-extrabold text-hs-ink-500">{tx(language, A.tryThis)}</h2>
            <ul lang={serverTips && retakeSuggestions.length > 0 ? 'ko' : undefined} className="space-y-1 rounded-hs-2xl border-[1.5px] border-hs-line-200 p-3">
              {tips.map((tip, index) => (
                <li key={tip} className="flex min-h-12 items-center gap-3 px-1 py-1.5">
                  <span aria-hidden="true" className="flex h-9 w-10 flex-none items-center justify-center rounded-t-[12px] rounded-b-[18px] bg-hs-coral-100 text-hs-coral-700">
                    <HsIcon name={TIP_ICONS[index] ?? 'alert'} size={18} />
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] leading-[1.45] font-extrabold">{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>
        <div className="flex flex-none flex-col items-center gap-1 px-5 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
          <HsButton variant="primary" size="cta" onClick={newPhoto ? onRetryWithNewImage : () => setAttempt((a) => a + 1)}>{tx(language, newPhoto ? A.newPhoto : A.retry)}</HsButton>
          <HsLinkButton className="px-4 text-hs-ink-500!" onClick={cancel}>{tx(language, A.home)}</HsLinkButton>
        </div>
      </div>
    );
  }

  // F3-05 분석 중 · F3-06 오래 걸림
  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <header className="rounded-b-[56px] bg-hs-mint-100 px-6 pt-7 pb-8 text-center">
          <div className="relative mx-auto flex aspect-[210/230] w-[210px] items-center justify-center overflow-hidden rounded-[32px] bg-hs-ink-900">
            {image && <img src={image.previewUrl} alt={tx(language, A.photoAlt)} className="max-h-full max-w-full object-contain" />}
            <div className="animate-scan-line pointer-events-none absolute inset-x-2 top-[12%] h-[3px] rounded-hs-pill bg-hs-safe-500 shadow-[0_0_14px_4px_rgba(24,160,88,0.45)] motion-reduce:hidden" aria-hidden="true" />
          </div>
          <h1 className="mt-6 inline-flex items-center gap-2 hs-title-lg">
            <span className="size-6 animate-spin rounded-hs-pill border-[3px] border-hs-safe-500/30 border-t-hs-safe-500 motion-reduce:animate-none" aria-hidden="true" />
            {tx(language, A.analyzing)}
          </h1>
          <p className="mt-2 text-[14px] leading-[1.5] font-semibold text-hs-ink-700">{tx(language, A.checking)}<span className="block">{tx(language, A.soon)}</span></p>
          <div role="status" aria-live="polite">
            {slow && (
              <p className="mt-4 flex items-start gap-2 rounded-hs-lg bg-hs-surface-0/70 px-4 py-3 text-start text-[13px] leading-[1.5] font-bold">
                <HsIcon name="clock" size={16} strokeWidth={2.4} className="mt-0.5 flex-none" />
                {tx(language, A.slow)}
              </p>
            )}
          </div>
        </header>
        <section className="px-5 pt-6 pb-6">
          <h2 className="mb-2.5 px-1 text-[13px] font-extrabold text-hs-ink-500">{tx(language, A.order)}</h2>
          <ol className="space-y-1 rounded-hs-2xl border-[1.5px] border-hs-line-200 p-3">
            {STEPS.map((step, index) => (
              <li key={step.icon} className="flex min-h-12 items-center gap-3 px-1 py-1.5">
                <span aria-hidden="true" className="flex h-9 w-10 flex-none items-center justify-center rounded-t-[12px] rounded-b-[18px] bg-hs-mint-100 text-hs-brand-700"><HsIcon name={step.icon} size={18} /></span>
                <span className="min-w-0 flex-1 text-[14px] leading-[1.45] font-extrabold">{tx(language, step.text)}</span>
                <span dir="ltr" className="flex-none text-[12px] font-extrabold text-hs-ink-500">{index + 1}</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setShowDetails((current) => !current)} aria-expanded={showDetails} aria-controls="analysis-details" className="mt-3 flex min-h-12 w-full items-center justify-between rounded-hs-lg bg-hs-surface-100 px-4 text-[14px] font-black">
            {tx(language, A.details)}
            <HsIcon name={showDetails ? 'chevronUp' : 'chevronDown'} size={18} strokeWidth={2.4} />
          </button>
          {showDetails && (
            <div id="analysis-details" className="mt-2 rounded-hs-lg bg-hs-surface-100 px-4 py-3.5 text-[13px] leading-[1.6] font-semibold text-hs-ink-700">
              <p className="mb-1.5 flex items-center gap-1.5 font-black text-hs-ink-900"><HsIcon name="alert" size={15} strokeWidth={2.4} className="text-hs-brand-700" />{tx(language, A.howTitle)}</p>
              <p>{tx(language, A.howBody)}</p>
              <p className="mt-2">{tx(language, A.noPercent)}</p>
            </div>
          )}
        </section>
      </main>
      <div className="flex flex-none justify-center px-5 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        <HsButton variant="outline" size="md" className="px-6" onClick={() => setConfirmCancel(true)}>{tx(language, A.cancel)}</HsButton>
      </div>
      {cancelDialog}
    </div>
  );
}
