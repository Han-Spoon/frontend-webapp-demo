import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getConsentStatus, getLegalDocuments, saveConsent, type ConsentDecisions, type ConsentId, type LegalDocuments } from '../../api/consent';
import { ApiError } from '../../api/user';
import type { Language } from '../App';
import { createTranslator } from '../locales';

const initialDecisions: ConsentDecisions = { service: false, privacy: false, sensitive: false, marketing: false };

export function ConsentScreen({ language }: { language: Language }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const destination = next === 'onboarding' ? '/onboarding' : next === 'home' ? '/home' : '/mypage';
  const t = createTranslator(language);
  const [bundle, setBundle] = useState<LegalDocuments | null>(null);
  const [decisions, setDecisions] = useState<ConsentDecisions>(initialDecisions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openDocument, setOpenDocument] = useState<ConsentId | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getLegalDocuments(), getConsentStatus()]).then(([documents, status]) => {
      if (!active) return;
      setBundle(documents);
      setDecisions({ ...initialDecisions, ...status.decisions });
    }).catch(requestError => { if (active) setError(requestError instanceof Error ? requestError.message : String(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const submit = async () => {
    if (!bundle || !decisions.service || !decisions.privacy || !decisions.sensitive) return;
    setSaving(true);
    setError('');
    try {
      const status = await saveConsent(bundle.version, decisions);
      if (!status.hasRequiredConsents) throw new Error(t('필수 약관 동의가 저장되지 않았어요.', 'Required consent was not saved.', 'لم يتم حفظ الموافقات المطلوبة.'));
      navigate(destination, { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 400) {
        try { setBundle(await getLegalDocuments()); } catch { /* Keep the current document visible. */ }
      }
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally { setSaving(false); }
  };

  return <div className="flex h-dvh flex-col bg-surface-base text-text-primary">
    <header className="flex h-16 shrink-0 items-center border-b border-border-warm bg-surface-raised px-5">
      {next !== 'home' && next !== 'onboarding' && <button type="button" onClick={() => navigate(-1)} className="me-3 flex size-10 items-center justify-center" aria-label={t('이전', 'Back', 'رجوع')}><ArrowLeft className="size-5 rtl:rotate-180" /></button>}
      <h1 className="text-base font-extrabold">{t('약관 및 동의 설정', 'Terms and consent', 'الشروط والموافقة')}</h1>
    </header>
    <main className="flex-1 overflow-y-auto px-5 py-6">
      <p className="mb-4 text-sm text-text-secondary">{t('서비스 이용에 필요한 약관을 확인하고 선택해 주세요.', 'Review and select your consent choices.', 'راجع شروط الخدمة وحدد موافقاتك.')}</p>
      {loading && <Loader2 className="mx-auto size-6 animate-spin text-brand-primary" />}
      {error && <p role="alert" className="mb-4 rounded-xl bg-status-danger-surface p-3 text-sm text-status-danger-text">{error}</p>}
      {bundle && <>
        <p className="mb-3 text-xs text-text-tertiary">{t('시행일', 'Effective', 'يسري من')} {bundle.effectiveDate}</p>
        <div className="space-y-3">{bundle.documents.map(document => <section key={document.id} className="rounded-2xl border border-border-warm bg-surface-raised p-4">
          <div className="flex items-center gap-3">
            <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={decisions[document.id]} onChange={event => setDecisions(current => ({ ...current, [document.id]: event.target.checked }))} className="size-5 accent-brand-primary" />{document.title} <span className="text-xs text-text-tertiary">{document.required ? t('필수', 'Required', 'مطلوب') : t('선택', 'Optional', 'اختياري')}</span></label>
            <button type="button" onClick={() => setOpenDocument(current => current === document.id ? null : document.id)} className="min-h-11 text-xs font-bold text-brand-primary">{t('내용 보기', 'View', 'عرض')}</button>
          </div>
          {openDocument === document.id && <div className="mt-3 max-h-72 space-y-3 overflow-y-auto border-t border-border-warm pt-3 text-sm leading-6 text-text-secondary">{document.sections.map((section, index) => <div key={index}><h2 className="font-bold text-text-primary">{section.heading}</h2><p className="whitespace-pre-wrap">{section.body}</p></div>)}</div>}
        </section>)}</div>
      </>}
    </main>
    <footer className="border-t border-border-warm bg-surface-raised px-5 py-3"><button type="button" onClick={() => void submit()} disabled={!bundle || saving || !decisions.service || !decisions.privacy || !decisions.sensitive} className="min-h-12 w-full rounded-xl bg-brand-primary text-sm font-extrabold text-white disabled:opacity-40">{saving ? t('저장 중…', 'Saving…', 'جار الحفظ…') : t('동의하고 계속하기', 'Agree and continue', 'الموافقة والمتابعة')}</button></footer>
  </div>;
}
