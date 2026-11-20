import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getConsentStatus, getLegalDocuments, saveConsent } from '../../api/consent';
import { getAccessToken } from '../../api/auth';
import type { DocumentId, LegalDocumentBundle } from '../../api/consent';
import demoDocuments from '../demo/legalDocuments.json';
import type { Language } from '../App';
import { translateText } from '../locales';
import './consent.css';

const REQUIRED: DocumentId[] = ['service', 'privacy', 'sensitive'];
const ALL: DocumentId[] = [...REQUIRED, 'marketing'];
const titles: Record<DocumentId, Record<Language, string>> = {
  service: { ko: '서비스 이용약관', en: 'Terms of service', ar: 'شروط الخدمة', 'zh-CN': '服务条款', ja: '利用規約', 'zh-TW': '服務條款', es: 'Términos de servicio' },
  privacy: { ko: '개인정보 수집·이용', en: 'Personal data collection', ar: 'جمع البيانات الشخصية', 'zh-CN': '个人信息收集与使用', ja: '個人情報の収集・利用', 'zh-TW': '個人資料蒐集與使用', es: 'Recogida de datos personales' },
  sensitive: { ko: '민감정보 처리', en: 'Sensitive data processing', ar: 'معالجة البيانات الحساسة', 'zh-CN': '敏感信息处理', ja: '機微情報の取扱い', 'zh-TW': '敏感資料處理', es: 'Tratamiento de datos sensibles' },
  marketing: { ko: '마케팅 정보 수신', en: 'Marketing messages', ar: 'رسائل التسويق', 'zh-CN': '接收营销信息', ja: '広告情報の受信', 'zh-TW': '接收行銷資訊', es: 'Mensajes de marketing' },
};
type Decisions = Record<DocumentId, boolean>;
const emptyDecisions = (): Decisions => ({ service: false, privacy: false, sensitive: false, marketing: false });

const words = {
  page: { ko: '약관 동의', en: 'Terms & consent', ar: 'الشروط والموافقة', 'zh-CN': '条款同意', ja: '規約への同意', 'zh-TW': '條款同意', es: 'Términos y consentimiento' },
  title: { ko: '약관에 동의해 주세요', en: 'Please agree to the terms', ar: 'يرجى الموافقة على الشروط', 'zh-CN': '请同意条款', ja: '規約に同意してください', 'zh-TW': '請同意條款', es: 'Acepta los términos' },
  subtitle: { ko: '필수 약관은 읽은 뒤 동의할 수 있어요.', en: 'Read each required document before agreeing.', ar: 'اقرأ كل مستند مطلوب قبل الموافقة.', 'zh-CN': '阅读必需条款后方可同意。', ja: '必須規約を読んでから同意できます。', 'zh-TW': '閱讀必需條款後方可同意。', es: 'Lee los documentos obligatorios antes de aceptar.' },
  all: { ko: '전체 동의', en: 'Agree to all', ar: 'الموافقة على الكل', 'zh-CN': '同意全部', ja: 'すべて同意', 'zh-TW': '同意全部', es: 'Aceptar todo' },
  includingOptional: { ko: '선택 항목 포함', en: 'Includes optional consent', ar: 'يشمل الموافقة الاختيارية', 'zh-CN': '包含可选项目', ja: '任意項目を含む', 'zh-TW': '包含可選項目', es: 'Incluye el consentimiento opcional' },
  required: { ko: '필수', en: 'Required', ar: 'مطلوب', 'zh-CN': '必需', ja: '必須', 'zh-TW': '必需', es: 'Obligatorio' },
  optional: { ko: '선택', en: 'Optional', ar: 'اختياري', 'zh-CN': '可选', ja: '任意', 'zh-TW': '可選', es: 'Opcional' },
  start: { ko: '동의하고 시작하기', en: 'Agree and start', ar: 'الموافقة والبدء', 'zh-CN': '同意并开始', ja: '同意して始める', 'zh-TW': '同意並開始', es: 'Aceptar y empezar' },
  reading: { ko: '끝까지 읽으면 동의할 수 있어요', en: 'Read to the end to agree', ar: 'اقرأ حتى النهاية للموافقة', 'zh-CN': '阅读至末尾后可同意', ja: '最後まで読むと同意できます', 'zh-TW': '閱讀至末尾後可同意', es: 'Lee hasta el final para aceptar' },
  reject: { ko: '거부', en: 'Decline', ar: 'رفض', 'zh-CN': '拒绝', ja: '拒否', 'zh-TW': '拒絕', es: 'Rechazar' },
  agree: { ko: '동의', en: 'Agree', ar: 'موافق', 'zh-CN': '同意', ja: '同意', 'zh-TW': '同意', es: 'Aceptar' },
  effective: { ko: '시행일', en: 'Effective', ar: 'تاريخ السريان', 'zh-CN': '生效日期', ja: '施行日', 'zh-TW': '生效日期', es: 'Vigente desde' },
  source: { ko: '한국어 원문', en: 'Korean legal original · translation pending', ar: 'النص القانوني الكوري · الترجمة قيد الإعداد', 'zh-CN': '韩语法律原文 · 翻译待完成', ja: '韓国語の原文 · 翻訳準備中', 'zh-TW': '韓語法律原文 · 翻譯待完成', es: 'Original legal en coreano · traducción pendiente' },
  demo: { ko: '시연 모드 · 동의 결정은 서버에 저장되지 않아요.', en: 'Demo mode · consent choices are not sent to the server.', ar: 'وضع العرض · لا تُرسل اختيارات الموافقة إلى الخادم.', 'zh-CN': '演示模式 · 同意选择不会发送到服务器。', ja: 'デモモード · 同意の選択はサーバーに送信されません。', 'zh-TW': '示範模式 · 同意選擇不會傳送至伺服器。', es: 'Modo demo · las decisiones de consentimiento no se envían al servidor.' },
  error: { ko: '약관을 불러오거나 저장하지 못했습니다. 다시 시도해 주세요.', en: 'Could not load or save terms. Please retry.', ar: 'تعذر تحميل الشروط أو حفظها. أعد المحاولة.', 'zh-CN': '无法加载或保存条款，请重试。', ja: '規約の読み込みまたは保存に失敗しました。再試行してください。', 'zh-TW': '無法載入或儲存條款，請重試。', es: 'No se pudieron cargar o guardar los términos. Reinténtalo.' },
  retry: { ko: '다시 시도', en: 'Retry', ar: 'إعادة المحاولة', 'zh-CN': '重试', ja: '再試行', 'zh-TW': '重試', es: 'Reintentar' },
  view: { ko: '보기', en: 'View', ar: 'عرض', 'zh-CN': '查看', ja: '見る', 'zh-TW': '查看', es: 'Ver' },
};

interface Props {
  language: Language;
  demoMode: boolean;
  onComplete: () => Promise<void> | void;
  onBack: () => void;
}

export function ConsentScreen({ language, demoMode, onComplete, onBack }: Props) {
  const location = useLocation();
  const reviewing = Boolean((location.state as { returnTo?: string } | null)?.returnTo);
  const t = (key: keyof typeof words) => translateText(language, words[key]);
  const [bundle, setBundle] = useState<LegalDocumentBundle | null>(null);
  const [decisions, setDecisions] = useState<Decisions>(emptyDecisions);
  const [active, setActive] = useState<DocumentId | null>(null);
  const [readEnd, setReadEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bulk, setBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const reader = useRef<HTMLDivElement>(null);

  const load = async () => {
    setError(false);
    try {
      if (demoMode) {
        setBundle(demoDocuments as LegalDocumentBundle);
        return;
      }
      const documents = await getLegalDocuments();
      setBundle(documents);
      if (!getAccessToken()) { setViewOnly(true); return; }
      const status = await getConsentStatus();
      if (documents.version === status.version) setDecisions({ ...emptyDecisions(), ...status.decisions });
    } catch {
      setError(true);
    }
  };

  useEffect(() => { void load(); }, [demoMode]);

  useEffect(() => {
    if (!active) return;
    setReadEnd(false);
    setProgress(0);
    const timer = window.setTimeout(() => {
      const element = reader.current;
      if (element && element.scrollHeight <= element.clientHeight + 2) {
        setReadEnd(true);
        setProgress(100);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  const onScroll = () => {
    const element = reader.current;
    if (!element) return;
    const max = element.scrollHeight - element.clientHeight;
    setProgress(max <= 0 ? 100 : Math.min(100, (element.scrollTop / max) * 100));
    if (max <= 0 || element.scrollTop >= max - 3) setReadEnd(true);
  };

  const agree = () => {
    if (!active || !readEnd) return;
    const updated = { ...decisions, [active]: true };
    setDecisions(updated);
    if (bulk) {
      const next = REQUIRED.find(id => !updated[id]);
      if (next) { setActive(next); return; }
      setDecisions({ ...updated, marketing: true });
      setBulk(false);
    }
    setActive(null);
  };

  const decline = () => {
    if (!active || !readEnd) return;
    setDecisions(prev => ({ ...prev, [active]: false }));
    setBulk(false);
    setActive(null);
  };

  const clickAll = () => {
    if (ALL.every(id => decisions[id])) { setDecisions(emptyDecisions()); return; }
    const first = REQUIRED.find(id => !decisions[id]);
    if (first) { setBulk(true); setActive(first); return; }
    setDecisions(prev => ({ ...prev, marketing: true }));
  };

  const submit = async () => {
    if (!bundle || !REQUIRED.every(id => decisions[id]) || busy) return;
    setBusy(true);
    setError(false);
    try {
      if (!demoMode) await saveConsent(bundle.version, decisions);
      await onComplete();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const document = bundle?.documents.find(item => item.id === active);

  return <div className="consent-screen">
    <header className="consent-header">
      <button className="consent-back" onClick={() => active ? (setActive(null), setBulk(false)) : onBack()} aria-label={translateText(language, { ko: '뒤로', en: 'Back', ar: 'رجوع', 'zh-CN': '返回', ja: '戻る', 'zh-TW': '返回', es: 'Atrás' })}><ArrowLeft size={20} className="rtl:rotate-180" /></button>
      <strong>{document ? titles[document.id][language] : t('page')}</strong><span aria-hidden="true" />
    </header>
    {error && !bundle ? <div className="consent-load-error" role="alert"><p>{t('error')}</p><button onClick={() => void load()}>{t('retry')}</button></div> : null}
    {bundle && !document && <>
      <main className="consent-overview">
        <h1>{viewOnly ? translateText(language, { ko: '약관 보기', en: 'View terms', ar: 'عرض الشروط', 'zh-CN': '查看条款', ja: '規約を見る', 'zh-TW': '查看條款', es: 'Ver los términos' }) : t('title')}</h1><p className="consent-subtitle">{viewOnly ? translateText(language, { ko: '각 문서를 열어 전문을 확인할 수 있어요.', en: 'Open each document to read the full text.', ar: 'افتح كل مستند لقراءة النص الكامل.', 'zh-CN': '打开各文档阅读完整内容。', ja: '各文書を開いて全文を確認できます。', 'zh-TW': '開啟各文件閱讀全文。', es: 'Abre cada documento para leer el texto completo.' }) : t('subtitle')}</p>
        {demoMode && <p className="consent-overview-source">{t('demo')}</p>}
        {language !== 'ko' && <p className="consent-overview-source">{t('source')}</p>}
        <div className="consent-list">
          {!viewOnly && <button className="consent-all" onClick={clickAll} aria-pressed={ALL.every(id => decisions[id])}>
            <span className={`consent-check ${ALL.every(id => decisions[id]) ? 'is-checked' : ''}`}>{ALL.every(id => decisions[id]) && <Check size={16} />}</span>
            <span><strong>{t('all')}</strong><small>{t('includingOptional')}</small></span>
          </button>}
          <div className="consent-divider" />
          {bundle.documents.map(item => <div key={item.id} className="consent-row">
            <button className="consent-row-main" onClick={() => viewOnly || item.required ? setActive(item.id) : setDecisions(prev => ({ ...prev, [item.id]: !prev[item.id] }))} aria-pressed={viewOnly ? undefined : decisions[item.id]}>
              {!viewOnly && <span className={`consent-check ${decisions[item.id] ? 'is-checked' : ''}`}>{decisions[item.id] && <Check size={16} />}</span>}
              <span className="consent-row-label"><b className={item.required ? 'is-required' : ''}>{item.required ? t('required') : t('optional')}</b><strong>{titles[item.id][language]}</strong></span>
            </button>
            {item.required || viewOnly ? <ChevronRight size={16} aria-hidden="true" /> : <button className="consent-optional-detail" onClick={() => setActive(item.id)} aria-label={`${titles[item.id][language]} ${t('view')}`}><ChevronRight size={16} /></button>}
          </div>)}
        </div>
      </main>
      <footer className="consent-footer"><button className="consent-primary" disabled={!viewOnly && (!REQUIRED.every(id => decisions[id]) || busy)} onClick={() => viewOnly ? onBack() : void submit()}>{viewOnly ? translateText(language, { ko: '돌아가기', en: 'Go back', ar: 'عودة', 'zh-CN': '返回', ja: '戻る', 'zh-TW': '返回', es: 'Volver' }) : busy ? '...' : reviewing ? translateText(language, { ko: '동의 설정 저장', en: 'Save consent settings', ar: 'حفظ إعدادات الموافقة', 'zh-CN': '保存同意设置', ja: '同意設定を保存', 'zh-TW': '儲存同意設定', es: 'Guardar preferencias' }) : t('start')}</button>{error && <p role="alert">{t('error')}</p>}</footer>
    </>}
    {bundle && document && <>
      <div className="consent-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <main className="consent-document" ref={reader} onScroll={onScroll}>
        <p className="consent-document-meta">{document.required ? t('required') : t('optional')} · {t('effective')} {bundle.effectiveDate}</p>
        {language !== 'ko' && <p className="consent-source-note">{t('source')}</p>}
        <div lang="ko" dir="ltr">{document.sections.map((section, index) => <section key={index}><h2>{section.heading}</h2><p>{section.body}</p></section>)}</div>
      </main>
      <footer className="consent-document-footer">{viewOnly ? <div><button onClick={() => setActive(null)}>{translateText(language, { ko: '목록으로', en: 'Back to list', ar: 'العودة إلى القائمة', 'zh-CN': '返回列表', ja: '一覧へ戻る', 'zh-TW': '返回列表', es: 'Volver a la lista' })}</button></div> : <><p>{readEnd ? '' : t('reading')}</p><div><button onClick={decline} disabled={!readEnd}>{t('reject')}</button><button onClick={agree} disabled={!readEnd}>{t('agree')}</button></div></>}</footer>
    </>}
  </div>;
}
