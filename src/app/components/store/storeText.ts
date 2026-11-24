import type { AllText, CountText } from '../hs/text';

/** 가게 상세(F2-08 · F2-05 · F2-09) · 지도 미리보기 시트(F2-04) 문구 */
export const STORE_TEXT = {
  screen: { ko: '가게 상세', en: 'Restaurant details', ar: 'تفاصيل المطعم', 'zh-CN': '店铺详情', ja: 'お店の詳細', 'zh-TW': '店家詳情', es: 'Detalles del restaurante' },
  photo: { ko: '가게 사진', en: 'Restaurant photo', ar: 'صورة المطعم', 'zh-CN': '店铺照片', ja: 'お店の写真', 'zh-TW': '店家照片', es: 'Foto del restaurante' },
  tabs: { ko: '가게 정보', en: 'Restaurant info', ar: 'معلومات المطعم', 'zh-CN': '店铺信息', ja: 'お店の情報', 'zh-TW': '店家資訊', es: 'Información del restaurante' },
  menuTab: { ko: '메뉴', en: 'Menu', ar: 'القائمة', 'zh-CN': '菜单', ja: 'メニュー', 'zh-TW': '菜單', es: 'Carta' },
  reviewTab: { ko: '후기', en: 'Reviews', ar: 'المراجعات', 'zh-CN': '评价', ja: 'レビュー', 'zh-TW': '評價', es: 'Reseñas' },
  menuNote: {
    ko: '내 식단에 맞는지는 메뉴판을 스캔하면 메뉴마다 알려 드려요.',
    en: 'Scan the menu to see, dish by dish, whether it fits your diet.',
    ar: 'امسح القائمة لنخبرك لكل طبق هل يناسب نظامك الغذائي.',
    'zh-CN': '扫描菜单后，会逐道告诉你是否适合你的饮食。',
    ja: '食事条件に合うかは、メニュー表をスキャンするとメニューごとにお知らせします。',
    'zh-TW': '掃描菜單後，會逐道告訴你是否適合你的飲食。',
    es: 'Escanea la carta y te diremos, plato por plato, si encaja con tu dieta.',
  },
  noMenuTitle: { ko: '아직 등록된 메뉴가 없어요', en: 'No menu registered yet', ar: 'لا توجد قائمة مسجلة بعد', 'zh-CN': '还没有登记的菜单', ja: 'まだ登録されたメニューはありません', 'zh-TW': '還沒有登錄的菜單', es: 'Aún no hay carta registrada' },
  noMenuBody: {
    ko: '메뉴판을 찍으면 메뉴 번역과\n내 식단 판정을 바로 볼 수 있어요.',
    en: 'Take a photo of the menu to see translations\nand checks for your diet right away.',
    ar: 'صوّر القائمة لترى الترجمة\nوتقييم نظامك الغذائي فورًا.',
    'zh-CN': '拍下菜单，就能马上看到\n菜品翻译和饮食判定。',
    ja: 'メニュー表を撮ると、翻訳と\n食事条件の判定をすぐに確認できます。',
    'zh-TW': '拍下菜單，就能馬上看到\n餐點翻譯與飲食判定。',
    es: 'Haz una foto de la carta para ver al instante\nla traducción y la valoración según tu dieta.',
  },
  loadFailed: { ko: '가게 정보를 불러오지 못했어요', en: "Couldn't load restaurant info", ar: 'تعذر تحميل معلومات المطعم', 'zh-CN': '无法加载店铺信息', ja: 'お店の情報を読み込めませんでした', 'zh-TW': '無法載入店家資訊', es: 'No se pudo cargar la información del restaurante' },
  loadFailedBody: { ko: '잠시 후 다시 시도해 주세요.', en: 'Please try again in a moment.', ar: 'يرجى المحاولة بعد قليل.', 'zh-CN': '请稍后重试。', ja: '少し待ってからもう一度お試しください。', 'zh-TW': '請稍後再試。', es: 'Inténtalo de nuevo en un momento.' },
  scanStore: { ko: '이 식당 메뉴 스캔', en: "Scan this restaurant's menu", ar: 'امسح قائمة هذا المطعم', 'zh-CN': '扫描这家店的菜单', ja: 'このお店のメニューをスキャン', 'zh-TW': '掃描這家店的菜單', es: 'Escanear la carta de este restaurante' },
  openDetail: { ko: '가게 상세', en: 'Details', ar: 'التفاصيل', 'zh-CN': '店铺详情', ja: '詳細', 'zh-TW': '店家詳情', es: 'Detalles' },
  featuredMenus: { ko: '대표 메뉴', en: 'Popular dishes', ar: 'أطباق مميزة', 'zh-CN': '代表菜品', ja: '代表メニュー', 'zh-TW': '代表餐點', es: 'Platos destacados' },
  menuTags: { ko: '메뉴', en: 'Dishes', ar: 'الأطباق', 'zh-CN': '菜品', ja: 'メニュー', 'zh-TW': '餐點', es: 'Platos' },
  save: { ko: '가게 저장', en: 'Save restaurant', ar: 'حفظ المطعم', 'zh-CN': '收藏店铺', ja: 'お店を保存', 'zh-TW': '收藏店家', es: 'Guardar restaurante' },
  unsave: { ko: '가게 저장 해제', en: 'Remove saved restaurant', ar: 'إزالة المطعم المحفوظ', 'zh-CN': '取消收藏店铺', ja: 'お店の保存を解除', 'zh-TW': '取消收藏店家', es: 'Quitar restaurante guardado' },
  savedToast: { ko: '가게를 저장했어요', en: 'Restaurant saved', ar: 'تم حفظ المطعم', 'zh-CN': '已收藏店铺', ja: 'お店を保存しました', 'zh-TW': '已收藏店家', es: 'Restaurante guardado' },

} satisfies Record<string, AllText>;

/** 탭 숫자('메뉴 8개'의 '8개') */
export const TAB_COUNT: CountText = {
  ko: (n) => `${n}개`, en: (n) => `${n}`, ar: (n) => `${n}`, 'zh-CN': (n) => `${n}`, ja: (n) => `${n}件`, 'zh-TW': (n) => `${n}`, es: (n) => `${n}`,
};
