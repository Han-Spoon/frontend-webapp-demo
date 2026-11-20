import type { MapStore } from '../components/discovery/StoreMap';

/**
 * 개발용 지도 미리보기(/dev/map-preview) 전용 가상 데이터.
 * 용산 시연 가게 밀집을 흉내 낸 것으로, 좌표는 실제 가게 위치가 아니다(추정치).
 * 같은 좌표 3묶음은 시연 데이터에서 측정한 겹침을 재현한다.
 */
const SAME_SPOT: Array<[string, number, number]> = [
  // 1층 2곳
  ['우대하루 용산', 37.52985, 126.96455],
  ['상리 남도밥상', 37.529855, 126.964555],
  // 전자랜드 6층 2곳
  ['궁추어탕', 37.53305, 126.96205],
  ['박가부대 용산전자랜드점', 37.53306, 126.96206],
  // 아이파크몰 4·7층 3곳
  ['장독대김치찜김치찌개 용산점', 37.52925, 126.96475],
  ['꿈꾸는 메밀', 37.529255, 126.964745],
  ['아울 아이파크몰 용산점', 37.52926, 126.96476],
];

const NAMES = [
  '용산 칼국수', '한강 국밥', '삼각지 곱창', '원효 냉면', '신용산 떡볶이', '전자상가 순대국', '용리단길 파스타', '효창 김밥',
  '숙대 우동', '남영 돈까스', '이촌 초밥', '한강로 백반', '용문 비빔밥', '청파 쌀국수', '문배 수제버거', '서계 닭갈비',
  '갈월 감자탕', '도원 짬뽕', '신계 샤브샤브', '용산역 덮밥', '후암 브런치', '원효로 보쌈', '삼각지 만두', '한남 커리',
  '이태원 타코', '용산 생선구이', '전자랜드 김치찌개', '아이파크 라멘', '용산 오므라이스', '한강 마라탕',
];

// 아이파크몰·전자상가 사이 약 300m 범위에 고르게 흩뿌린 고정 좌표(재현 가능하도록 의사난수 고정).
function scatter(index: number): [number, number] {
  const a = Math.sin(index * 12.9898) * 43758.5453;
  const b = Math.sin(index * 78.233) * 12345.6789;
  const lat = 37.5296 + (a - Math.floor(a)) * 0.0032;
  const lng = 126.9618 + (b - Math.floor(b)) * 0.0036;
  return [lat, lng];
}

export const MAP_PREVIEW_STORES: MapStore[] = [
  ...SAME_SPOT.map(([name, lat, lng], index) => ({ id: `same-${index}`, name, lat, lng })),
  ...NAMES.map((name, index) => {
    const [lat, lng] = scatter(index + 1);
    return { id: `scatter-${index}`, name, lat, lng };
  }),
];
