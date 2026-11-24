import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { RestaurantPicker } from './discovery/RestaurantPicker';
import { FOOD_CATEGORY_LABELS, foodCategoryOf } from './discovery/foodCategories';
import { RESTAURANTS } from '../demo/restaurants';
import { useDemoValue } from '../demo/storage';
import { localizeMenuText } from '../results/resultViewModel';
import type { HistoryItem, Language, PendingMenuImage } from '../types';
import { uploadImage } from '../../api/upload';
import type { StoreCandidate } from '../../api/store';
import { translateText } from '../locales';
import { formatScanDate } from '../utils/scanDate';
import {
  BottomNav,
  FLIP_RTL,
  HS_TEXT,
  HsButton,
  HsIcon,
  HsIconButton,
  HsLinkButton,
  HsNote,
  InlineError,
  OfflineBanner,
  ScanHistoryCard,
  districtOf,
  tx,
  type AllText,
} from './hs';

interface ScanScreenProps {
  demoMode?: boolean;
  language: Language;
  onScan: (image: PendingMenuImage) => void;
  onHistory: (item: HistoryItem) => Promise<void>;
  onMyPage: () => void;
  history: HistoryItem[];
  /** 예전 목록의 이름 수정 · 삭제. 새 화면의 최근 목록은 열기만(수정 · 삭제는 스캔 기록 화면). */
  onDeleteHistory?: (id: string) => Promise<void>;
  onRenameHistory?: (id: string, title: string) => Promise<void>;
  selectedStore: StoreCandidate | null;
  onSelectStore: (store: StoreCandidate | null) => void;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const S = {
  screen: { ko: '메뉴판 스캔', en: 'Menu scan', ar: 'مسح القائمة', 'zh-CN': '扫描菜单', ja: 'メニュースキャン', 'zh-TW': '掃描菜單', es: 'Escanear menú' },
  myPage: { ko: '마이페이지', en: 'My page', ar: 'صفحتي', 'zh-CN': '我的页面', ja: 'マイページ', 'zh-TW': '我的頁面', es: 'Mi página' },
  title: { ko: '오늘의 메뉴를\n주문 전에 살펴보세요', en: 'Check today’s menu\nbefore you order', ar: 'تعرّف على قائمة اليوم\nقبل أن تطلب', 'zh-CN': '点餐前\n先看看今天的菜单', ja: '注文の前に\n今日のメニューを確認しましょう', 'zh-TW': '點餐前\n先看看今天的菜單', es: 'Revisa el menú de hoy\nantes de pedir' },
  pickStore: { ko: '식당 선택(선택) · 안 골라도 돼요', en: 'Pick a restaurant (optional)', ar: 'اختر مطعمًا (اختياري)', 'zh-CN': '选择餐厅（可选）· 不选也可以', ja: 'お店を選ぶ（任意）· 選ばなくてもOK', 'zh-TW': '選擇餐廳（可選）· 不選也可以', es: 'Elegir restaurante (opcional)' },
  change: { ko: '변경', en: 'Change', ar: 'تغيير', 'zh-CN': '更改', ja: '変更', 'zh-TW': '變更', es: 'Cambiar' },
  cameraOpens: { ko: '카메라가 바로 열려요', en: 'Your camera opens right away', ar: 'ستفتح الكاميرا مباشرة', 'zh-CN': '相机会马上打开', ja: 'カメラがすぐに開きます', 'zh-TW': '相機會馬上打開', es: 'La cámara se abre al instante' },
  frontTip: { ko: '메뉴판 전체가 보이도록 정면에서 찍으면 더 정확해요.', en: 'Shoot the whole menu straight on for better results.', ar: 'لنتائج أدق، التقط القائمة كاملة من الأمام.', 'zh-CN': '正对菜单、拍下整张菜单会更准确。', ja: 'メニュー全体が見えるよう正面から撮ると、より正確です。', 'zh-TW': '正對菜單、拍下整張菜單會更準確。', es: 'Fotografía el menú completo y de frente para más precisión.' },
  takePhoto: { ko: '메뉴판 촬영하기', en: 'Take a menu photo', ar: 'التقط صورة للقائمة', 'zh-CN': '拍摄菜单', ja: 'メニューを撮影', 'zh-TW': '拍攝菜單', es: 'Fotografiar el menú' },
  opening: { ko: '카메라 여는 중', en: 'Opening camera', ar: 'جار فتح الكاميرا', 'zh-CN': '正在打开相机', ja: 'カメラを起動中', 'zh-TW': '正在開啟相機', es: 'Abriendo cámara' },
  choosePhoto: { ko: '사진에서 선택하기', en: 'Choose from photos', ar: 'اختر من الصور', 'zh-CN': '从相册选择', ja: '写真から選ぶ', 'zh-TW': '從相簿選擇', es: 'Elegir de la galería' },
  fileRule: { ko: 'JPG, PNG, WEBP 사진만 가능 · 최대 10MB · GIF/영상/문서는 불가', en: 'JPG, PNG, WEBP photos only · Max 10MB · No GIFs, videos, or documents', ar: 'صور JPG وPNG وWEBP فقط · الحد الأقصى 10MB · لا GIF أو فيديو أو مستندات', 'zh-CN': '仅支持 JPG、PNG、WEBP 照片 · 最大 10MB · 不支持 GIF/视频/文档', ja: 'JPG・PNG・WEBPの写真のみ · 最大10MB · GIF/動画/文書は不可', 'zh-TW': '僅支援 JPG、PNG、WEBP 照片 · 最大 10MB · 不支援 GIF/影片/文件', es: 'Solo fotos JPG, PNG o WEBP · Máx. 10 MB · Sin GIF, vídeos ni documentos' },
  handwritten: { ko: '손글씨 메뉴판은 인식이 어려울 수 있어요', en: 'Handwritten menus may be hard to read', ar: 'قد يصعب التعرف على القوائم المكتوبة بخط اليد', 'zh-CN': '手写菜单可能较难识别', ja: '手書きのメニューは読み取りにくい場合があります', 'zh-TW': '手寫菜單可能較難辨識', es: 'Los menús escritos a mano pueden ser difíciles de leer' },
  recent: { ko: '최근에 살펴본 메뉴', en: 'Recently viewed menus', ar: 'القوائم التي شاهدتها مؤخرًا', 'zh-CN': '最近查看的菜单', ja: '最近見たメニュー', 'zh-TW': '最近查看的菜單', es: 'Menús vistos recientemente' },
  seeAll: { ko: '전체 보기', en: 'See all', ar: 'عرض الكل', 'zh-CN': '查看全部', ja: 'すべて見る', 'zh-TW': '查看全部', es: 'Ver todo' },
  openFailed: { ko: '기록을 열지 못했어요. 다시 시도해 주세요.', en: 'Couldn’t open this record. Please try again.', ar: 'تعذر فتح هذا السجل. حاول مرة أخرى.', 'zh-CN': '无法打开记录，请重试。', ja: '記録を開けませんでした。もう一度お試しください。', 'zh-TW': '無法開啟紀錄，請重試。', es: 'No pudimos abrir el registro. Inténtalo de nuevo.' },
  frameGuide: { ko: '메뉴판 전체가 네모 안에 들어오게 찍어 주세요', en: 'Fit the whole menu inside the frame', ar: 'اجعل القائمة كاملة داخل الإطار', 'zh-CN': '请让整张菜单都在框内', ja: 'メニュー全体が枠に入るように撮ってください', 'zh-TW': '請讓整張菜單都在框內', es: 'Encuadra el menú completo' },
  shutter: { ko: '촬영하기', en: 'Take photo', ar: 'التقاط', 'zh-CN': '拍照', ja: '撮影', 'zh-TW': '拍照', es: 'Hacer foto' },
  closeCamera: { ko: '카메라 닫기', en: 'Close camera', ar: 'إغلاق الكاميرا', 'zh-CN': '关闭相机', ja: 'カメラを閉じる', 'zh-TW': '關閉相機', es: 'Cerrar cámara' },
  reviewTitle: { ko: '사진 확인', en: 'Check the photo', ar: 'تحقق من الصورة', 'zh-CN': '确认照片', ja: '写真の確認', 'zh-TW': '確認照片', es: 'Revisa la foto' },
  fitted: { ko: '사진 전체가 보이도록 맞춰 보여줘요', en: 'The whole photo is shown without cropping', ar: 'تُعرض الصورة كاملة دون قص', 'zh-CN': '照片会完整显示，不会裁切', ja: '写真全体が見えるように表示しています', 'zh-TW': '照片會完整顯示，不會裁切', es: 'Mostramos la foto completa, sin recortes' },
  blurTip: { ko: '글자가 잘 보이나요? 흐리거나 잘리면 다시 찍는 게 더 정확해요.', en: 'Can you read the text? If it’s blurry or cut off, retaking gives better results.', ar: 'هل النص واضح؟ إذا كان ضبابيًا أو مقطوعًا، فإعادة التصوير تعطي نتائج أدق.', 'zh-CN': '文字清楚吗？如果模糊或被裁切，重新拍摄会更准确。', ja: '文字ははっきり見えますか？ぼやけたり切れたりしていたら、撮り直すとより正確です。', 'zh-TW': '文字清楚嗎？如果模糊或被裁切，重新拍攝會更準確。', es: '¿Se lee bien? Si está borrosa o cortada, repetirla da mejores resultados.' },
  retake: { ko: '다시 촬영', en: 'Retake', ar: 'إعادة التصوير', 'zh-CN': '重新拍摄', ja: '撮り直す', 'zh-TW': '重新拍攝', es: 'Repetir' },
  reselect: { ko: '다른 사진', en: 'Another photo', ar: 'صورة أخرى', 'zh-CN': '换一张', ja: '別の写真', 'zh-TW': '換一張', es: 'Otra foto' },
  analyze: { ko: '분석 시작', en: 'Start analysis', ar: 'بدء التحليل', 'zh-CN': '开始分析', ja: '分析を始める', 'zh-TW': '開始分析', es: 'Analizar' },
  uploading: { ko: '사진 올리는 중', en: 'Uploading photo', ar: 'جار رفع الصورة', 'zh-CN': '正在上传照片', ja: '写真をアップロード中', 'zh-TW': '正在上傳照片', es: 'Subiendo foto' },
  preview: { ko: '선택한 메뉴판 미리보기', en: 'Selected menu preview', ar: 'معاينة القائمة المختارة', 'zh-CN': '所选菜单预览', ja: '選んだメニューのプレビュー', 'zh-TW': '所選菜單預覽', es: 'Vista previa del menú' },
  cameraUnsupported: { ko: '이 브라우저에서는 카메라를 바로 열 수 없어요. 기기 카메라로 찍거나 사진을 선택해 주세요.', en: 'This browser can’t open the camera here. Use your device camera or choose a photo.', ar: 'لا يمكن لهذا المتصفح فتح الكاميرا هنا. استخدم كاميرا جهازك أو اختر صورة.', 'zh-CN': '此浏览器无法直接打开相机。请用设备相机拍摄或选择照片。', ja: 'このブラウザではカメラを直接開けません。端末のカメラで撮るか写真を選んでください。', 'zh-TW': '此瀏覽器無法直接開啟相機。請用裝置相機拍攝或選擇照片。', es: 'Este navegador no puede abrir la cámara aquí. Usa la cámara del dispositivo o elige una foto.' },
  cameraDenied: { ko: '카메라 권한이 거부되어 촬영할 수 없어요. 브라우저 설정에서 카메라를 허용하거나, 기기 카메라로 찍거나 사진을 선택해 주세요.', en: 'Camera permission was denied. Allow it in your browser settings, use your device camera, or choose a photo.', ar: 'تم رفض إذن الكاميرا. اسمح به من إعدادات المتصفح، أو استخدم كاميرا جهازك، أو اختر صورة.', 'zh-CN': '相机权限被拒绝，无法拍摄。请在浏览器设置中允许相机，或用设备相机拍摄、选择照片。', ja: 'カメラの許可が拒否されたため撮影できません。ブラウザ設定で許可するか、端末のカメラで撮るか写真を選んでください。', 'zh-TW': '相機權限被拒絕，無法拍攝。請在瀏覽器設定中允許相機，或用裝置相機拍攝、選擇照片。', es: 'Se denegó el permiso de la cámara. Permítelo en el navegador, usa la cámara del dispositivo o elige una foto.' },
  deviceCamera: { ko: '기기 카메라로 찍기', en: 'Use device camera', ar: 'استخدم كاميرا الجهاز', 'zh-CN': '用设备相机拍摄', ja: '端末のカメラで撮る', 'zh-TW': '用裝置相機拍攝', es: 'Usar cámara del dispositivo' },
  notReady: { ko: '카메라 화면을 아직 준비 중이에요. 잠시 후 다시 찍어 주세요.', en: 'The camera is still getting ready. Try again in a moment.', ar: 'لا تزال الكاميرا قيد التجهيز. حاول مرة أخرى بعد قليل.', 'zh-CN': '相机还在准备中，请稍后再拍。', ja: 'カメラを準備中です。少ししてからもう一度撮ってください。', 'zh-TW': '相機還在準備中，請稍後再拍。', es: 'La cámara aún se está preparando. Inténtalo en un momento.' },
  captureFailed: { ko: '사진을 만들 수 없어요. 사진 선택으로 다시 시도해 주세요.', en: 'Couldn’t capture a photo. Try choosing a photo instead.', ar: 'تعذر التقاط الصورة. جرّب اختيار صورة بدلًا من ذلك.', 'zh-CN': '无法生成照片，请改为选择照片。', ja: '写真を作成できませんでした。写真を選んでもう一度お試しください。', 'zh-TW': '無法產生照片，請改為選擇照片。', es: 'No pudimos hacer la foto. Prueba a elegir una de la galería.' },
  wrongType: { ko: '사진 파일만 올릴 수 있어요. JPG, PNG, WEBP만 되고 GIF, 영상, 문서는 안 돼요.', en: 'Only photos can be uploaded: JPG, PNG, or WEBP. GIFs, videos, and documents aren’t supported.', ar: 'يمكن رفع الصور فقط: JPG أو PNG أو WEBP. لا يُدعم GIF أو الفيديو أو المستندات.', 'zh-CN': '只能上传照片：JPG、PNG、WEBP。不支持 GIF、视频和文档。', ja: 'アップロードできるのは写真のみ（JPG・PNG・WEBP）です。GIF・動画・文書は使えません。', 'zh-TW': '只能上傳照片：JPG、PNG、WEBP。不支援 GIF、影片和文件。', es: 'Solo puedes subir fotos JPG, PNG o WEBP. No se admiten GIF, vídeos ni documentos.' },
  tooLarge: { ko: '사진은 10MB 이하만 올릴 수 있어요.', en: 'Photos must be 10MB or smaller.', ar: 'يجب ألا يتجاوز حجم الصورة 10MB.', 'zh-CN': '照片不能超过 10MB。', ja: '写真は10MB以下にしてください。', 'zh-TW': '照片不能超過 10MB。', es: 'La foto debe pesar 10 MB o menos.' },
  uploadFailed: { ko: '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.', en: 'Couldn’t upload the photo. Please try again shortly.', ar: 'تعذر رفع الصورة. حاول مرة أخرى بعد قليل.', 'zh-CN': '照片上传失败，请稍后重试。', ja: '写真をアップロードできませんでした。しばらくしてからもう一度お試しください。', 'zh-TW': '照片上傳失敗，請稍後重試。', es: 'No pudimos subir la foto. Inténtalo de nuevo en un momento.' },
  offlineUpload: { ko: '인터넷 연결이 끊겼어요. 연결을 확인한 뒤 다시 시도해 주세요.', en: 'You’re offline. Check your connection and try again.', ar: 'أنت غير متصل. تحقق من اتصالك وحاول مجددًا.', 'zh-CN': '网络已断开。请检查连接后重试。', ja: 'インターネットに接続されていません。接続を確認してもう一度お試しください。', 'zh-TW': '網路已中斷。請檢查連線後重試。', es: 'Sin conexión. Revisa tu conexión e inténtalo de nuevo.' },
} satisfies Record<string, AllText>;

type Phase = 'start' | 'camera' | 'preview';

function Corners({ className, tone }: { className: string; tone: string }) {
  const base = `absolute size-9 ${tone}`;
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${className}`}>
      <span className={`${base} start-0 top-0 rounded-ss-[10px] border-s-[3px] border-t-[3px]`} />
      <span className={`${base} end-0 top-0 rounded-se-[10px] border-e-[3px] border-t-[3px]`} />
      <span className={`${base} start-0 bottom-0 rounded-es-[10px] border-s-[3px] border-b-[3px]`} />
      <span className={`${base} end-0 bottom-0 rounded-ee-[10px] border-e-[3px] border-b-[3px]`} />
    </div>
  );
}

/** 흐름 3 촬영 탭(F3-01) → 카메라(F3-03) → 사진 확인(F3-04). 식당 선택 시트(F3-02)는 선택. */
export function ScanScreen({ language, onScan, onHistory, onMyPage, history, selectedStore, onSelectStore, demoMode = false }: ScanScreenProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('start');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedImage, setSelectedImage] = useState<PendingMenuImage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<'unsupported' | 'denied' | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useDemoValue<string | null>('selected-restaurant', null);
  const [restaurantPicker, setRestaurantPicker] = useState(false);
  const restaurant = RESTAURANTS.find(r => r.id === restaurantId);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // 연결한 식당(시연: 고정 식당 / 운영: 가게 후보)
  const store = demoMode
    ? restaurant ? { name: localizeMenuText(restaurant.name, language), meta: [restaurant.address.split(/\s+/).find(part => /[구군]$/.test(part)), localizeMenuText(restaurant.category, language)].filter(Boolean).join(' · ') } : null
    : selectedStore ? {
        name: selectedStore.branchName ? `${selectedStore.name} ${selectedStore.branchName}` : selectedStore.name,
        meta: [districtOf(selectedStore.roadAddress), (() => { const c = foodCategoryOf(selectedStore); return c !== 'other' ? translateText(language, FOOD_CATEGORY_LABELS[c]) : null; })()].filter(Boolean).join(' · '),
      } : null;

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
  };

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const showPreview = (file: File, source: PendingMenuImage['source']) => {
    stopCamera();
    clearObjectUrl();
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setSelectedImage({ file, previewUrl, source });
    setErrorMessage(null);
    setPhase('preview');
  };

  const startCamera = async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraNotice('unsupported');
      return;
    }
    try {
      setIsStartingCamera(true);
      setCameraNotice(null);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setPhase('camera');
    } catch {
      setCameraNotice('denied');
      setPhase('start');
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, source: PendingMenuImage['source']) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) { setErrorMessage(tx(language, S.wrongType)); return; }
    if (file.size > MAX_FILE_SIZE) { setErrorMessage(tx(language, S.tooLarge)); return; }
    showPreview(file, source);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setErrorMessage(tx(language, S.notReady)); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) { setErrorMessage(tx(language, S.captureFailed)); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { setErrorMessage(tx(language, S.captureFailed)); return; }
      showPreview(new File([blob], `board-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'camera');
    }, 'image/jpeg', 0.9);
  };

  const closeCamera = () => { stopCamera(); setErrorMessage(null); setPhase('start'); };
  const backToStart = () => { clearObjectUrl(); setSelectedImage(null); setErrorMessage(null); setPhase('start'); };
  const retake = () => {
    if (selectedImage?.source === 'upload') fileInputRef.current?.click();
    else void startCamera();
  };

  const handleAnalyze = async () => {
    if (!selectedImage || isUploading) return;
    try {
      setIsUploading(true);
      setErrorMessage(null);
      if (!demoMode && !selectedImage.file) throw new Error('Selected image file is missing');
      const uploaded = !demoMode && selectedImage.file ? await uploadImage(selectedImage.file) : null;
      const imageForAnalysis: PendingMenuImage = uploaded
        ? { ...selectedImage, store: selectedStore, storage: { provider: 's3', key: uploaded.key } }
        : { ...selectedImage, store: selectedStore };
      stopCamera();
      // 분석 화면이 사진 주소를 이어서 쓰므로 여기서는 해제하지 않는다.
      if (objectUrlRef.current === selectedImage.previewUrl) objectUrlRef.current = null;
      onScan(imageForAnalysis);
    } catch {
      setErrorMessage(tx(language, navigator.onLine ? S.uploadFailed : S.offlineUpload));
    } finally {
      setIsUploading(false);
    }
  };

  const openHistory = async (item: HistoryItem) => {
    setHistoryError(null);
    try { await onHistory(item); } catch { setHistoryError(tx(language, S.openFailed)); }
  };

  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream, phase]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    clearObjectUrl();
  }, []);

  const fileInputs = (
    <>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleFileChange(event, 'upload')} />
      {/* getUserMedia를 못 쓰거나 거부됐을 때 기기 카메라 앱으로 찍기 */}
      <input ref={captureInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => handleFileChange(event, 'camera')} />
    </>
  );

  const picker = restaurantPicker && (
    <RestaurantPicker
      language={language}
      demoMode={demoMode}
      selectedId={restaurantId}
      selectedStore={selectedStore}
      onClose={() => setRestaurantPicker(false)}
      onSelectDemo={(picked) => { setRestaurantId(picked?.id ?? null); setRestaurantPicker(false); }}
      onSelectStore={(picked) => { onSelectStore(picked); setRestaurantPicker(false); }}
    />
  );

  /* ───── F3-03 카메라 ───── */
  if (phase === 'camera') {
    return (
      <div className="relative flex h-dvh flex-col bg-[#101413] text-hs-surface-0">
        {fileInputs}
        <div className="flex items-center gap-2 px-5 pt-[18px]">
          <HsIconButton icon="x" tone="ghost" label={tx(language, S.closeCamera)} onClick={closeCamera} className="bg-white/10! text-hs-surface-0!" />
          <div className="flex min-w-0 flex-1 justify-center">
            {store && (
              <span className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-hs-pill bg-white/10 px-3.5 text-[13px] font-extrabold">
                <HsIcon name="pin" size={14} strokeWidth={2.4} className="flex-none" />
                <span className="truncate">{store.name}</span>
              </span>
            )}
          </div>
          <span className="size-11 flex-none" aria-hidden="true" />
        </div>
        <div className="relative mx-5 mt-5 min-h-0 flex-1 overflow-hidden rounded-hs-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
          <Corners className="inset-6" tone="border-hs-orange-500" />
        </div>
        <p className="mt-4 px-6 text-center text-[15px] font-extrabold">{tx(language, S.frameGuide)}</p>
        {errorMessage && <p role="alert" className="mt-2 px-6 text-center text-[13px] font-bold text-hs-coral-100">{errorMessage}</p>}
        <div className="relative flex h-[132px] flex-none items-center justify-center pb-[env(safe-area-inset-bottom)]">
          <button type="button" onClick={() => fileInputRef.current?.click()} aria-label={tx(language, S.choosePhoto)} className="absolute start-[54px] flex size-[52px] items-center justify-center rounded-hs-md bg-white/15">
            <HsIcon name="photo" size={22} />
          </button>
          <button type="button" onClick={capturePhoto} aria-label={tx(language, S.shutter)} className="flex size-[84px] items-center justify-center rounded-hs-pill border-4 border-white/80 bg-transparent">
            <span className="size-[68px] rounded-hs-pill border-[3px] border-[#101413] bg-hs-brand-700" />
          </button>
        </div>
        {picker}
      </div>
    );
  }

  /* ───── F3-04 사진 확인 ───── */
  if (phase === 'preview' && selectedImage) {
    return (
      <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
        {fileInputs}
        <OfflineBanner language={language} />
        <div className="flex flex-none items-center gap-2 px-5 pt-[18px]">
          <HsIconButton icon="back" tone="soft" label={tx(language, HS_TEXT.back)} iconClassName={FLIP_RTL} onClick={backToStart} disabled={isUploading} />
          <h1 className="hs-title-sm">{tx(language, S.reviewTitle)}</h1>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-4">
          <div className="relative flex aspect-[350/420] max-h-[56dvh] w-full items-center justify-center overflow-hidden rounded-[32px] bg-[#2A302D]">
            <img src={selectedImage.previewUrl} alt={tx(language, S.preview)} className="max-h-full max-w-full object-contain" />
            {isUploading && (
              <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-[14px] font-extrabold text-white">
                <span className="size-8 animate-spin rounded-hs-pill border-[3px] border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />
                {tx(language, S.uploading)}
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-[13px] font-bold text-hs-ink-500">{tx(language, S.fitted)}</p>
          {store ? (
            <div className="mt-4 flex items-center gap-3 rounded-hs-lg border-[1.5px] border-hs-brand-700 bg-hs-mint-100 py-2 ps-4 pe-2">
              <HsIcon name="pin" size={18} className="flex-none text-hs-brand-700" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-black">{store.name}</span>
                {store.meta && <span className="block truncate text-[12px] font-semibold text-hs-ink-500">{store.meta}</span>}
              </span>
              <HsLinkButton tone="brand" className="px-2" disabled={isUploading} onClick={() => setRestaurantPicker(true)}>{tx(language, S.change)}</HsLinkButton>
            </div>
          ) : (
            <StoreRow language={language} onClick={() => setRestaurantPicker(true)} disabled={isUploading} className="mt-4" />
          )}
          <HsNote className="mt-3 rounded-hs-md bg-hs-surface-100 px-3.5 py-3 text-hs-ink-700!">{tx(language, S.blurTip)}</HsNote>
          {errorMessage && <InlineError className="mt-3">{errorMessage}</InlineError>}
        </main>
        <div className="flex flex-none gap-2 px-5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))]">
          <HsButton variant="outline" size="cta" className="w-auto! flex-1" disabled={isUploading} onClick={retake}>{tx(language, selectedImage.source === 'upload' ? S.reselect : S.retake)}</HsButton>
          <HsButton variant="primary" size="cta" className="w-auto! flex-[1.8]" busy={isUploading} onClick={() => void handleAnalyze()}>{tx(language, isUploading ? S.uploading : S.analyze)}</HsButton>
        </div>
        {picker}
      </div>
    );
  }

  /* ───── F3-01 촬영 탭 ───── */
  const cameraMessage = cameraNotice === 'denied' ? S.cameraDenied : cameraNotice === 'unsupported' ? S.cameraUnsupported : null;
  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0 text-hs-ink-900">
      {fileInputs}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <header className="rounded-b-[56px] bg-hs-mint-100 px-5 pt-[18px] pb-7">
          <div className="flex items-center justify-between">
            <p className="text-[17px] font-black">{tx(language, S.screen)}</p>
            <HsIconButton icon="person" tone="white" label={tx(language, S.myPage)} onClick={onMyPage} />
          </div>
          <h1 className="mt-5 px-1 hs-title-xl whitespace-pre-line">{tx(language, S.title)}</h1>
          {store ? (
            <button type="button" onClick={() => setRestaurantPicker(true)} className="mt-5 flex min-h-[52px] w-full items-center gap-2.5 rounded-hs-lg border-[1.5px] border-hs-brand-700 bg-hs-surface-0 ps-4 pe-3 text-start">
              <HsIcon name="pin" size={17} className="flex-none text-hs-brand-700" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-black">{store.name}</span>
                {store.meta && <span className="block truncate text-[12px] font-semibold text-hs-ink-500">{store.meta}</span>}
              </span>
              <span className="flex-none text-[13px] font-extrabold text-hs-brand-700">{tx(language, S.change)}</span>
            </button>
          ) : (
            <StoreRow language={language} onClick={() => setRestaurantPicker(true)} className="mt-5" />
          )}
        </header>

        <section className="px-5 pt-5">
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={isStartingCamera}
            className="relative flex aspect-[350/240] w-full flex-col items-center justify-center rounded-[32px] bg-hs-ink-900 px-6 text-center text-hs-surface-0 disabled:opacity-80"
          >
            <Corners className="inset-4" tone="border-hs-surface-0" />
            <span className="flex size-16 items-center justify-center rounded-hs-pill bg-white/15"><HsIcon name="scan" size={26} /></span>
            <span className="mt-4 text-[15px] font-black">{tx(language, isStartingCamera ? S.opening : S.cameraOpens)}</span>
            <span className="mt-1.5 text-[12px] font-semibold text-white/80">{tx(language, S.frontTip)}</span>
          </button>
          <HsButton variant="primary" size="cta" icon="scan" className="mt-3.5" busy={isStartingCamera} onClick={() => void startCamera()}>{tx(language, S.takePhoto)}</HsButton>
          <HsButton variant="outline" size="lg" block icon="photo" className="mt-2" onClick={() => fileInputRef.current?.click()}>{tx(language, S.choosePhoto)}</HsButton>
          {cameraMessage && (
            <div role="alert" className="mt-3 rounded-hs-lg bg-hs-caution-100 px-4 py-3">
              <p className="flex items-start gap-1.5 text-[13px] leading-[1.5] font-bold text-hs-caution-700">
                <HsIcon name="alert" size={15} strokeWidth={2.4} className="mt-0.5 flex-none" />
                {tx(language, cameraMessage)}
              </p>
              <HsButton variant="outline" size="sm" icon="scan" className="mt-2.5" onClick={() => captureInputRef.current?.click()}>{tx(language, S.deviceCamera)}</HsButton>
            </div>
          )}
          {errorMessage && <InlineError className="mt-3">{errorMessage}</InlineError>}
          <p className="mt-3.5 text-center text-[12px] leading-[1.5] font-bold text-hs-ink-500">
            {tx(language, S.fileRule)}
            <span className="block">{tx(language, S.handwritten)}</span>
          </p>
        </section>

        {history.length > 0 && (
          <section className="mt-7 bg-hs-surface-100 px-5 pt-6 pb-8" aria-labelledby="recent-scans">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-scans" className="flex items-center gap-1.5 text-[17px] font-black"><HsIcon name="clock" size={18} />{tx(language, S.recent)}</h2>
              <HsLinkButton tone="brand" onClick={() => navigate('/history')}>{tx(language, S.seeAll)}</HsLinkButton>
            </div>
            {historyError && <InlineError className="mb-2">{historyError}</InlineError>}
            <div className="space-y-2.5">
              {history.slice(0, 3).map((item) => {
                const dateText = formatScanDate(item.date);
                return (
                  <ScanHistoryCard
                    key={item.id}
                    language={language}
                    title={item.title || dateText}
                    dateText={dateText}
                    storeName={item.store?.name ?? undefined}
                    menuCount={item.menuCount}
                    cautionCount={item.cautionCount ?? undefined}
                    dangerCount={item.dangerCount ?? undefined}
                    onOpen={() => void openHistory(item)}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
      <BottomNav language={language} />
      {picker}
    </div>
  );
}

/** 식당 선택 행(점선). 고르지 않아도 된다. */
function StoreRow({ language, onClick, disabled = false, className = '' }: { language: Language; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`flex min-h-[52px] w-full items-center gap-2.5 rounded-hs-lg border-[1.5px] border-dashed border-hs-line-dash bg-hs-surface-0 ps-4 pe-3 text-start disabled:opacity-60 ${className}`}>
      <HsIcon name="pin" size={17} className="flex-none text-hs-ink-700" />
      <span className="min-w-0 flex-1 text-[14px] font-extrabold">{tx(language, S.pickStore)}</span>
      <HsIcon name="forward" size={17} strokeWidth={2.4} className={`flex-none text-hs-ink-500 ${FLIP_RTL}`} />
    </button>
  );
}
