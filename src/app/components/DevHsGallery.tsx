import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Language } from '../types';
import { isLanguage } from '../locales';
import {
  AddChip, AnswerButtons, BottomBar, BottomNav, ChoiceChip, CurationCard, DietTag, EmptyState, ErrorState, EvidenceBadge,
  FilterChip, HsButton, HsDialog, HsHeart, HsIconButton, HsLinkButton, HsNote, HsSheet, HsTextIconButton, IngredientTag,
  InlineError, Logo, NoticeBox, OfflineBanner, OptionRow, PillTabs, PlainTag, ReviewCard, RiskBadge, RiskTile, ScanHistoryCard,
  SearchField, SkeletonCard, StaffCard, Stepper, StoreCard, TextField, ToastPill, TopArea, UnderlineTabs, VerdictBox, FLIP_RTL,
  RISK_ORDER, CategoryTag, RISK_LABEL, tx,
} from './hs';

/** 개발 전용: 새 공통 컴포넌트 미리보기(`/dev/hs-gallery?lang=ko&open=sheet|pager|dialog`) */
export function DevHsGallery({ fallbackLanguage }: { fallbackLanguage: Language }) {
  const [params] = useSearchParams();
  const requested = params.get('lang');
  const language = isLanguage(requested) ? requested : fallbackLanguage;
  const [open, setOpen] = useState(params.get('open'));
  const [chips, setChips] = useState(['shrimp']);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState<'profile' | 'records' | 'settings'>('records');
  const [sub, setSub] = useState<'scans' | 'saved' | 'reviews'>('scans');
  const [heart, setHeart] = useState(true);
  const [answer, setAnswer] = useState<'present' | 'absent' | 'unknown' | null>('absent');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('초록식탁 저녁');
  const [option, setOption] = useState('show');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const prev = [document.documentElement.lang, document.documentElement.dir];
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    return () => { [document.documentElement.lang, document.documentElement.dir] = prev; };
  }, [language]);

  const Section = ({ name, grey, children }: { name: string; grey?: boolean; children: ReactNode }) => (
    <section className={`px-5 py-4 ${grey ? 'bg-hs-surface-100' : ''}`}>
      <p className="mb-2 text-[11px] font-extrabold tracking-[0.02em] text-hs-ink-500">{name}</p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
  const Row = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-2">{children}</div>;

  return (
    <div className="flex h-dvh flex-col bg-hs-surface-0">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TopArea eyebrow="DESIGN SYSTEM" title="한스푼 공통 컴포넌트" description="개발 확인용 화면이에요." watermark />
        <Section name="Logo"><Logo height={36} /></Section>
        <Section name="Button">
          <HsButton size="cta">저장하고 시작하기</HsButton>
          <Row><HsButton variant="ink" icon="message">직원에게 내 식단 보여주기</HsButton></Row>
          <Row><HsButton variant="danger">삭제</HsButton><HsButton variant="soft">취소</HsButton><HsButton disabled>동의하고 시작하기</HsButton><HsLinkButton trailingIcon="forward" trailingClassName={FLIP_RTL}>판정 읽는 법</HsLinkButton></Row>
          <Row><HsButton variant="outline" size="md" icon="message">직원 소통 카드</HsButton><HsLinkButton trailingIcon="chevronDown">자세히 보기</HsLinkButton></Row>
        </Section>
        <Section name="IconButton · HeartButton" grey>
          <Row>
            <HsIconButton icon="back" label="이전" iconClassName={FLIP_RTL} />
            <HsIconButton icon="back" tone="soft" label="이전 카드" disabled iconClassName={FLIP_RTL} />
            <HsTextIconButton icon="photo">메뉴판 사진</HsTextIconButton>
            <HsTextIconButton icon="edit">기록 수정</HsTextIconButton>
            <HsHeart on={heart} onToggle={() => setHeart(!heart)} language={language} />
            <HsHeart on={false} onToggle={() => {}} language={language} />
          </Row>
        </Section>
        <Section name="RiskBadge · RiskTile · EvidenceBadge">
          <Row>{RISK_ORDER.map((risk) => <RiskBadge key={risk} risk={risk} language={language} size="lg" />)}</Row>
          <Row>{RISK_ORDER.map((risk) => <RiskBadge key={risk} risk={risk} language={language} />)}<EvidenceBadge basis="confirmed" language={language} /><EvidenceBadge basis="estimated" language={language} /></Row>
          <Row>{RISK_ORDER.map((risk) => <RiskTile key={risk} risk={risk} />)}</Row>
        </Section>
        <Section name="Chip · Tag">
          <Row>
            {['shrimp', 'milk', 'peanut'].map((code) => <ChoiceChip key={code} selected={chips.includes(code)} onClick={() => setChips(chips.includes(code) ? chips.filter((c) => c !== code) : [...chips, code])}>{({ shrimp: '새우', milk: '우유', peanut: '땅콩' } as Record<string, string>)[code]}</ChoiceChip>)}
            <AddChip>다른 메뉴 이름</AddChip>
          </Row>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
            <FilterChip selected={filter === 'all'} onClick={() => setFilter('all')} count={12}>전체</FilterChip>
            {RISK_ORDER.map((risk) => <FilterChip key={risk} risk={risk} selected={filter === risk} onClick={() => setFilter(risk)} count={risk === 'danger' || risk === 'unknown' ? 2 : 4}>{tx(language, RISK_LABEL[risk])}</FilterChip>)}
          </div>
          <Row><span className="text-[12px] font-extrabold text-hs-ink-500">관련 재료</span><IngredientTag risk="caution">우유</IngredientTag><IngredientTag risk="caution">버터</IngredientTag><IngredientTag risk="danger">새우</IngredientTag></Row>
          <Row><DietTag>새우 알레르기</DietTag><DietTag>우유 알레르기</DietTag><DietTag>매운 음식 비선호</DietTag><PlainTag>매운 메뉴</PlainTag></Row>
          <Row><CategoryTag category="culture">식문화</CategoryTag><CategoryTag category="food">한식 이야기</CategoryTag><CategoryTag category="restaurant">식당에서</CategoryTag><CategoryTag category="tips">알아두기</CategoryTag></Row>
        </Section>
        <Section name="InfoBox">
          <VerdictBox verdict="크림 소스에 우유가 들어갈 수 있어요." reason="유제품을 쓰는지 주문 전에 확인해 주세요." notes={['메뉴 이름만으로는 어떤 음식인지 알기 어려운 메뉴예요.']} />
          <NoticeBox><HsNote>환산 가격은 고정 환율로 계산한 참고 가격이에요.</HsNote><HsLinkButton trailingIcon="forward" trailingClassName={FLIP_RTL}>판정 읽는 법</HsLinkButton></NoticeBox>
        </Section>
        <Section name="StaffCard · AnswerButtons">
          <StaffCard language={language} korean="이 메뉴에 새우가 들어가나요?" translated="Does this dish contain shrimp?" />
          <AnswerButtons label="직원 답" value={answer} onChange={setAnswer} options={[{ value: 'present', label: '있어요' }, { value: 'absent', label: '없어요' }, { value: 'unknown', label: '확실하지 않아요' }]} />
        </Section>
        <Section name="OptionRow">
          <OptionRow icon="search" title="재료 확인" description="내 알레르기마다 한 장" trailing="2장" onClick={() => {}} />
          <OptionRow icon="chili" title="빼고 요청" description="재료를 빼 달라고 부탁해요" trailing="2장" onClick={() => {}} />
          <OptionRow icon="shield" title="식단 기준 전달하기" description="고른 재료마다 한 장씩 보여줘요" selected={option === 'show'} onClick={() => setOption('show')} />
        </Section>
        <Section name="Tabs · Stepper">
          <PillTabs label="마이페이지" value={tab} onChange={setTab} items={[{ value: 'profile', label: '프로필' }, { value: 'records', label: '내 기록' }, { value: 'settings', label: '설정' }]} />
          <UnderlineTabs label="내 기록" value={sub} onChange={setSub} items={[{ value: 'scans', label: '스캔 기록' }, { value: 'saved', label: '저장한 음식' }, { value: 'reviews', label: '내 후기' }]} />
          <div className="flex items-center gap-2"><HsIconButton icon="back" tone="soft" label="이전" iconClassName={FLIP_RTL} /><Stepper step={2} total={3} label="온보딩 진행" /></div>
        </Section>
        <Section name="SearchField · TextField">
          <SearchField language={language} label="식당 이름으로 검색" placeholder="식당 이름으로 검색" value={search} onChange={setSearch} />
          <TextField label="기록 이름" value={title} onChange={setTitle} maxLength={30} />
        </Section>
        <Section name="Cards" grey>
          <StoreCard language={language} name="초록식탁" reviewCount={3} district="성동구" category="한식" distanceMeters={350} saved={heart} onToggleSave={() => setHeart(!heart)} onClick={() => {}} />
          <ScanHistoryCard language={language} title="초록식탁 저녁" dateText="2026.11.24 18:32" storeName="초록식탁" menuCount={12} cautionCount={5} dangerCount={3} onOpen={() => {}} onMore={() => {}} />
          <ScanHistoryCard language={language} title="2026.11.22 13:05" dateText="2026.11.22 13:05" menuCount={9} cautionCount={4} dangerCount={0} onOpen={() => {}} onMore={() => {}} />
          <ReviewCard language={language} storeName="초록식탁" dateText="2026년 11월 24일" mine onEdit={() => {}} onDelete={() => {}} menus={[{ name: '비빔밥', answers: [{ label: '새우', answer: 'absent' }, { label: '우유', answer: 'unknown' }], comment: '직원에게 재료를 확인하고 주문했어요.' }]} />
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5"><CurationCard category="restaurant" categoryLabel="식당에서" title="소스는 따로 달라고 해도 괜찮아요" onClick={() => {}} /><CurationCard category="food" categoryLabel="한식 이야기" title="처음 만나는 한국 찌개 가이드" onClick={() => {}} /></div>
        </Section>
        <Section name="StateBlocks · Toast">
          <OfflineBanner language={language} force />
          <EmptyState title="스캔 기록이 없어요" description="메뉴판을 찍으면 판정 결과가 여기에 모여요." />
          <ErrorState language={language} title="저장한 음식을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요." onRetry={() => {}} />
          <InlineError>삭제에 실패했어요.</InlineError>
          <div className="rounded-2xl bg-hs-surface-100 p-3"><SkeletonCard language={language} /></div>
          <ToastPill item={{ message: '카드를 저장했어요.', tone: 'success', action: { label: '보기', onClick: () => {} } }} />
          <ToastPill item={{ message: '삭제에 실패했어요.', tone: 'error', action: { label: '다시 시도', onClick: () => {} } }} />
        </Section>
        <Section name="Overlays">
          <Row><HsButton variant="outline" size="md" onClick={() => setOpen('sheet')}>시트</HsButton><HsButton variant="outline" size="md" onClick={() => setOpen('pager')}>여러 장 시트</HsButton><HsButton variant="outline" size="md" onClick={() => setOpen('dialog')}>확인 창</HsButton></Row>
        </Section>
        <TopArea variant="result" toolbar={<div className="mb-3 flex justify-end gap-1.5"><HsTextIconButton icon="photo">메뉴판 사진</HsTextIconButton><HsTextIconButton icon="edit">기록 수정</HsTextIconButton></div>} title="나를 위한 메뉴 가이드" description="메뉴 12개를 내 식단 기준으로 살펴봤어요." />
        <div className="h-6" />
        <BottomBar><HsButton variant="outline" size="bar" icon="scan">다시 스캔</HsButton><HsButton variant="outline" size="bar" icon="message">식사 후기 남기기</HsButton></BottomBar>
      </div>
      <BottomNav language={language} />
      {open === 'sheet' && (
        <HsSheet language={language} onClose={() => setOpen(null)} title="덜 맵게 요청" subtitle="김치찌개" footer={<HsButton size="cta">카드 저장하기</HsButton>}>
          <StaffCard language={language} korean="덜 맵게 해 주실 수 있나요?" translated="Could you make it less spicy?" />
        </HsSheet>
      )}
      {open === 'pager' && (
        <HsSheet language={language} onClose={() => setOpen(null)} title="재료 확인" subtitle={<>버섯 크림 리조또 · <span className="text-hs-ink-900">{page + 1} / 2 · {page === 0 ? '새우' : '우유'}</span></>} pager={{ index: page, total: 2, onPrev: () => setPage(0), onNext: () => setPage(1) }}>
          <StaffCard language={language} size="md" korean={page === 0 ? '이 메뉴에 새우가 들어가나요?' : '이 메뉴에 우유가 들어가나요?'} translated={page === 0 ? 'Does this dish contain shrimp?' : 'Does this dish contain milk?'} />
          <div className="mt-3.5"><AnswerButtons label="직원 답" value={answer} onChange={setAnswer} options={[{ value: 'present', label: '있어요' }, { value: 'absent', label: '없어요' }, { value: 'unknown', label: '확실하지 않아요' }]} /></div>
        </HsSheet>
      )}
      {open === 'dialog' && (
        <HsDialog language={language} tone="danger" title="이 기록을 삭제할까요?" description="삭제하면 되돌릴 수 없어요. 이 기록으로 찜한 음식과 남긴 후기도 함께 지워져요." cancelLabel="취소" confirmLabel="삭제" onCancel={() => setOpen(null)} onConfirm={() => setOpen(null)} />
      )}
    </div>
  );
}
