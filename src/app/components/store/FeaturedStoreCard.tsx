import { storeDetailToCandidate, type StoreCandidate, type StoreDetail } from '../../../api/store';
import type { StoreSnapshot } from '../../demo/homeStores';
import type { Coordinates } from '../../hooks/useGrantedPosition';
import { useStoreDetail } from '../../hooks/useStoreDetail';
import type { Language } from '../../types';
import { districtOf, MenuTags, StoreCard, tx } from '../hs';
import { distanceBetween, storeCategory, storeName } from './storeFormat';
import { STORE_TEXT } from './storeText';

/**
 * 홈 가게 카드 · 칼럼 속 식당 카드(고정 storeId). 가게 상세 API를 불러와 메뉴 태그를 붙이고,
 * 불러오는 동안 · 실패하면 스냅숏 정보만(메뉴 태그 줄 숨김). 누르면 가게 상세.
 * 거리: 상세 API에 거리가 없어 위치 권한이 이미 있을 때만 계산, 없으면 숨김.
 */
export function FeaturedStoreCard({ language, store, demoMode, position, saved, onToggleSave, onOpen, className }: {
  language: Language;
  store: StoreSnapshot;
  demoMode: boolean;
  position: Coordinates | null;
  saved: boolean;
  onToggleSave: (candidate: StoreCandidate) => void;
  onOpen: () => void;
  className?: string;
}) {
  const state = useStoreDetail(store.storeId, demoMode);
  const info: StoreDetail = state.detail ?? { ...store, menus: null };
  const menus = state.detail?.menus ?? [];
  return (
    <StoreCard
      language={language}
      name={storeName(info)}
      reviewCount={info.reviewCount ?? 0}
      district={districtOf(info.roadAddress)}
      category={storeCategory(info, language)}
      distanceMeters={position ? distanceBetween(position, info) : null}
      saved={saved}
      onToggleSave={() => onToggleSave(storeDetailToCandidate(info))}
      onClick={onOpen}
      tags={menus.length > 0 ? <MenuTags language={language} names={menus.map((menu) => menu.name)} label={tx(language, STORE_TEXT.menuTags)} /> : null}
      className={className}
    />
  );
}
