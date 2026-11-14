import { useState } from 'react';
import { Check, MapPin, Pencil, Trash2, X } from 'lucide-react';
import type { HistoryItem, Language } from '../App';
import { createTranslator, LANGUAGE_LOCALES } from '../locales';

interface ScanHistoryListProps {
  language: Language;
  history: HistoryItem[];
  onOpen: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
}

export function ScanHistoryList({ language, history, onOpen, onDelete, onRename }: ScanHistoryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');

  const t = createTranslator(language);

  const subtitle = (item: HistoryItem) => t(
    `메뉴 ${item.menuCount}개 분석`,
    `Analyzed ${item.menuCount} items`,
    `تم تحليل ${item.menuCount} عناصر`,
  );
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
            <div className="flex items-center gap-2">
              <button onClick={() => onOpen(item)} className="min-w-0 flex-1 text-start">
                <div className="text-sm font-bold text-soy-ink">{item.title}</div>
                {item.store && <div className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-brand-primary"><MapPin className="size-3 shrink-0" />{item.store.name}</div>}
                <div className="text-xs text-sesame-gray mt-1">{scanTime(item.date)} · {subtitle(item)}</div>
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
                onClick={() => onDelete(item.id)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sesame-gray hover:text-destructive hover:bg-red-50 transition-colors"
                aria-label={t('삭제', 'Delete', 'حذف')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
