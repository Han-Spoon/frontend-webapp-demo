import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, OctagonX, type LucideIcon } from 'lucide-react';
import { normalizeRiskLevel, type RiskLevel } from '../../../api/riskLevel';

export type ResultTranslator = (ko: string, en: string, ar: string) => string;

/** 판정 표시의 단일 정의. 색·아이콘·단어를 함께 묶음. */
const RISK_DISPLAY: Record<RiskLevel, {
  icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
  label: (t: ResultTranslator) => string;
  guidance: (t: ResultTranslator) => string;
}> = {
  safe: {
    icon: CheckCircle2,
    badgeClass: 'border-status-safe-border bg-status-safe-surface text-status-safe-text',
    iconClass: 'text-status-safe',
    label: (t) => t('안전', 'Safe', 'آمن'),
    guidance: (t) => t(
      '확보한 정보에서 식단 충돌을 찾지 못했어요. 실제 재료와 조리 환경은 확인해 주세요.',
      'No dietary conflict was found in the available information. Verify actual ingredients and preparation.',
      'لم يظهر تعارض غذائي في المعلومات المتاحة. تحقق من المكونات الفعلية وطريقة التحضير.',
    ),
  },
  caution: {
    icon: AlertTriangle,
    badgeClass: 'border-status-caution-border bg-status-caution-surface text-status-caution-text',
    iconClass: 'text-status-caution',
    label: (t) => t('주의', 'Caution', 'تنبيه'),
    guidance: (t) => t(
      '재료나 조리법을 한 번 더 확인해 주세요',
      'Please check the ingredients or cooking method once more.',
      'يرجى التحقق من المكونات أو طريقة التحضير مرة أخرى.',
    ),
  },
  danger: {
    icon: OctagonX,
    badgeClass: 'border-status-danger-border bg-status-danger-surface text-status-danger-text',
    iconClass: 'text-status-danger',
    label: (t) => t('위험', 'Danger', 'خطر'),
    guidance: (t) => t(
      '식이 기준과 맞지 않아 피하는 게 좋아요',
      'This does not fit your dietary needs, so it is best to avoid it.',
      'هذا لا يناسب احتياجاتك الغذائية، لذا يُفضّل تجنبه.',
    ),
  },
  unknown: {
    icon: CircleHelp,
    badgeClass: 'border-status-unknown-border bg-status-unknown-surface text-status-unknown-text',
    iconClass: 'text-status-unknown',
    label: (t) => t('확인 필요', 'Needs checking', 'يحتاج إلى تحقق'),
    guidance: (t) => t(
      '이 메뉴는 판정하지 못했어요. 먹기 전에 직원에게 재료를 물어보세요.',
      'We could not assess this dish. Ask staff about the ingredients before eating.',
      'لم نتمكن من تقييم هذا الطبق. اسأل الموظف عن المكونات قبل تناوله.',
    ),
  },
};

/** 저장소 등에서 온 모르는 값도 unknown으로 그림. */
const displayFor = (level: unknown) => RISK_DISPLAY[normalizeRiskLevel(level)];

export function RiskBadge({ level, t }: { level: RiskLevel; t: ResultTranslator }) {
  const display = displayFor(level);
  const Icon = display.icon;

  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${display.badgeClass}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {display.label(t)}
    </span>
  );
}

export function riskLabel(level: RiskLevel, t: ResultTranslator) {
  return displayFor(level).label(t);
}

export function StatusGuidance({ level, t }: { level: RiskLevel; t: ResultTranslator }) {
  const display = displayFor(level);
  const Icon = display.icon;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border-warm bg-surface-raised px-3 py-2.5">
      <Icon className={`mt-0.5 size-4 shrink-0 ${display.iconClass}`} aria-hidden="true" />
      <p className="text-sm leading-5 text-text-secondary"><strong className="me-1.5 text-text-primary">{display.label(t)}</strong>{display.guidance(t)}</p>
    </div>
  );
}

export function EvidenceSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border-warm py-4 first:border-t-0 first:pt-0">
      <h4 className="mb-2.5 flex items-center gap-2 text-sm font-extrabold text-text-primary">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}
