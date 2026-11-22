import { useState } from 'react';
import { Check, MapPin, Pencil, Trash2, X } from 'lucide-react';
import type { HistoryItem, Language } from '../types';
import { createTranslator, LANGUAGE_LOCALES, translateText, type LocalizedText } from '../locales';
import { ConfirmDialog } from './common/ConfirmDialog';

interface ScanHistoryListProps {
  language: Language;
  history: HistoryItem[];
  /** 실패 시 reject(목록이 그 기록 아래에 알림) */
  onOpen: (item: HistoryItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
}

type ItemError = { id: string; kind: 'open' | 'delete' };

/** 기록 카드 위험·주의 수. 기기 기록은 메뉴로 계산, 서버 기록은 서버 값. 없으면 null(0으로 그리지 않음). */
function riskCounts(item: HistoryItem): { danger: number | null; caution: number | null } {
  if (item.menus.length > 0) {
    return {
      danger: item.menus.filter(menu => menu.riskLevel === 'danger').length,
      caution: item.menus.filter(menu => menu.riskLevel === 'caution').length,
    };
  }
  const valid = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);
  return { danger: valid(item.dangerCount), caution: valid(item.cautionCount) };
}

export function ScanHistoryList({ language, history, onOpen, onDelete, onRename }: ScanHistoryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [itemError, setItemError] = useState<ItemError | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<HistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const t = createTranslator(language);
  const tx = (text: LocalizedText) => translateText(language, text);

  const menuCountLabel = (count: number) => tx({
    ko: `메뉴 ${count}개`, en: `${count} items`, ar: `${count} أطباق`,
    'zh-CN': `${count} 道菜`, ja: `メニュー${count}件`, 'zh-TW': `${count} 道餐點`, es: `${count} platos`,
  });
  const dangerLabel = (count: number) => tx({
    ko: `위험 ${count}`, en: `Danger ${count}`, ar: `خطر ${count}`,
    'zh-CN': `危险 ${count}`, ja: `危険 ${count}`, 'zh-TW': `危險 ${count}`, es: `Peligro ${count}`,
  });
  const cautionLabel = (count: number) => tx({
    ko: `주의 ${count}`, en: `Caution ${count}`, ar: `تنبيه ${count}`,
    'zh-CN': `注意 ${count}`, ja: `注意 ${count}`, 'zh-TW': `注意 ${count}`, es: `Precaución ${count}`,
  });
  const errorMessage = (kind: ItemError['kind']) => kind === 'open'
    ? tx({
      ko: '기록을 열지 못했어요. 다시 시도해 주세요.', en: 'Could not open this record. Please try again.', ar: 'تعذر فتح هذا السجل. حاول مرة أخرى.',
      'zh-CN': '无法打开这条记录，请重试。', ja: 'この記録を開けませんでした。もう一度お試しください。', 'zh-TW': '無法開啟這筆記錄，請再試一次。', es: 'No se pudo abrir este registro. Inténtalo de nuevo.',
    })
    : tx({
      ko: '기록을 삭제하지 못했어요. 다시 시도해 주세요.', en: 'Could not delete this record. Please try again.', ar: 'تعذر حذف هذا السجل. حاول مرة أخرى.',
      'zh-CN': '无法删除这条记录，请重试。', ja: 'この記録を削除できませんでした。もう一度お試しください。', 'zh-TW': '無法刪除這筆記錄，請再試一次。', es: 'No se pudo eliminar este registro. Inténtalo de nuevo.',
    });

  const open = async (item: HistoryItem) => {
    if (openingId) return;
    setOpeningId(item.id);
    setItemError(null);
    try {
      await onOpen(item);
    } catch {
      setItemError({ id: item.id, kind: 'open' });
    } finally {
      setOpeningId(null);
    }
  };

  const confirmDelete = async () => {
    const target = confirmingDelete;
    if (!target || deletingId) return;
    setDeletingId(target.id);
    setItemError(null);
    try {
      await onDelete(target.id);
    } catch {
      setItemError({ id: target.id, kind: 'delete' });
    } finally {
      setDeletingId(null);
      setConfirmingDelete(null);
    }
  };

  const scanTime = (date: string) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(parsed);
  };

  return (
    <div className="space-y-2">
      {history.map((item) => (
        <div key={item.id} className="p-4 bg-rice-white border border-border-warm rounded-2xl shadow-[0_6px_20px_rgba(54,70,60,0.05)]">
          {editingId === item.id ? (
            <form onSubmit={async event => {
              event.preventDefault();
              const next = editingTitle.trim();
              if (!next || renaming) return;
              setRenaming(true);
              setRenameError('');
              try {
                await onRename(item.id, next);
                setEditingId(null);
              } catch {
                setRenameError(t('제목을 저장하지 못했어요. 다시 시도해 주세요.', 'Could not save the title. Please try again.', 'تعذر حفظ العنوان. حاول مرة أخرى.'));
              } finally { setRenaming(false); }
            }}>
            <div className="flex items-center gap-2">
              <input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                maxLength={255}
                aria-label={t('기록 제목', 'Record title', 'عنوان السجل')}
                className="flex-1 h-10 px-3 rounded-xl border border-border-warm bg-white text-sm focus:outline-none focus:border-brand-green-500"
              />
              <button
                type="submit"
                disabled={!editingTitle.trim() || renaming}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-green-700 hover:bg-brand-green-50"
                aria-label={t('저장', 'Save', 'حفظ')}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                disabled={renaming}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sesame-gray hover:bg-muted"
                aria-label={t('취소', 'Cancel', 'إلغاء')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renameError && <p role="alert" className="mt-2 text-xs text-status-danger-text">{renameError}</p>}
            </form>
          ) : (
            <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void open(item)}
                disabled={openingId !== null}
                aria-busy={openingId === item.id}
                className="min-w-0 flex-1 text-start disabled:cursor-wait aria-busy:opacity-60"
              >
                <div className="text-sm font-bold text-soy-ink">{item.title}</div>
                {item.store && <div className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-brand-primary"><MapPin className="size-3 shrink-0" />{item.store.name}</div>}
                <div className="text-xs text-sesame-gray mt-1">{scanTime(item.date)}</div>
                <HistoryCounts
                  item={item}
                  menuLabel={menuCountLabel}
                  dangerLabel={dangerLabel}
                  cautionLabel={cautionLabel}
                />
              </button>
              <button
                onClick={() => {
                  setEditingId(item.id);
                  setEditingTitle(item.title);
                  setRenameError('');
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sesame-gray hover:text-brand-green-700 hover:bg-brand-green-50 transition-colors"
                aria-label={t('이름 수정', 'Rename', 'إعادة تسمية')}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setItemError(null); setConfirmingDelete(item); }}
                disabled={deletingId === item.id}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sesame-gray hover:text-destructive hover:bg-red-50 transition-colors disabled:opacity-40"
                aria-label={t('삭제', 'Delete', 'حذف')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {itemError?.id === item.id && (
              <p role="alert" className="mt-2 text-xs font-semibold text-status-danger-text">{errorMessage(itemError.kind)}</p>
            )}
            </>
          )}
        </div>
      ))}

      {confirmingDelete && (
        <ConfirmDialog
          language={language}
          tone="danger"
          title={tx({
            ko: '이 기록을 삭제할까요?', en: 'Delete this record?', ar: 'هل تريد حذف هذا السجل؟',
            'zh-CN': '要删除这条记录吗？', ja: 'この記録を削除しますか？', 'zh-TW': '要刪除這筆記錄嗎？', es: '¿Eliminar este registro?',
          })}
          description={<>
            <span className="block font-semibold text-text-primary" dir="auto">{confirmingDelete.title}</span>
            {tx({
              ko: '삭제하면 되돌릴 수 없어요.', en: 'This cannot be undone.', ar: 'لا يمكن التراجع عن هذا الإجراء.',
              'zh-CN': '删除后无法恢复。', ja: '削除すると元に戻せません。', 'zh-TW': '刪除後無法復原。', es: 'No se puede deshacer.',
            })}
          </>}
          cancelLabel={t('취소', 'Cancel', 'إلغاء')}
          confirmLabel={t('삭제', 'Delete', 'حذف')}
          busy={deletingId !== null}
          onCancel={() => setConfirmingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

function HistoryCounts({
  item,
  menuLabel,
  dangerLabel,
  cautionLabel,
}: {
  item: HistoryItem;
  menuLabel: (count: number) => string;
  dangerLabel: (count: number) => string;
  cautionLabel: (count: number) => string;
}) {
  const { danger, caution } = riskCounts(item);
  const menuCount = item.menus.length > 0 ? item.menus.length : item.menuCount;
  const chip = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold leading-4';
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {menuCount > 0 && <span className={`${chip} border-border-warm bg-surface-subtle text-text-secondary`}>{menuLabel(menuCount)}</span>}
      {danger !== null && danger > 0 && <span className={`${chip} border-status-danger-border bg-status-danger-surface text-status-danger-text`}>{dangerLabel(danger)}</span>}
      {caution !== null && caution > 0 && <span className={`${chip} border-status-caution-border bg-status-caution-surface text-status-caution-text`}>{cautionLabel(caution)}</span>}
    </div>
  );
}
