import type { StoreCoordinates } from '../../hooks/useStoreCandidates';
import { AREA_CENTERS, type DiscoverAreaId } from '../../demo/restaurants';
import type { AllText } from '../hs/text';

/**
 * 지도 지역 선택 시트(F2-02)의 지역 18곳. 순서는 디자인 보드 그대로.
 * 중심 좌표는 시연 식당 지역 중심(AREA_CENTERS)을 같이 쓴다. 누르면 이 좌표에서 후보를 다시 찾는다.
 */
export interface MapArea {
  id: DiscoverAreaId;
  label: AllText;
  center: StoreCoordinates;
}

const LABELS: Array<[DiscoverAreaId, AllText]> = [
  ['yongsan-samgakji', { ko: '용산·삼각지', en: 'Yongsan · Samgakji', ar: 'يونغسان · سامغاكجي', 'zh-CN': '龙山·三角地', ja: '龍山・三角地', 'zh-TW': '龍山·三角地', es: 'Yongsan · Samgakji' }],
  ['seongsu', { ko: '성수', en: 'Seongsu', ar: 'سونغسو', 'zh-CN': '圣水', ja: '聖水', 'zh-TW': '聖水', es: 'Seongsu' }],
  ['myeongdong-euljiro', { ko: '명동·을지로', en: 'Myeongdong · Euljiro', ar: 'ميونغدونغ · أولجيرو', 'zh-CN': '明洞·乙支路', ja: '明洞・乙支路', 'zh-TW': '明洞·乙支路', es: 'Myeongdong · Euljiro' }],
  ['hongdae-sinchon', { ko: '홍대·신촌', en: 'Hongdae · Sinchon', ar: 'هونغداي · سينتشون', 'zh-CN': '弘大·新村', ja: '弘大・新村', 'zh-TW': '弘大·新村', es: 'Hongdae · Sinchon' }],
  ['gwanghwamun-jongno', { ko: '광화문·종로', en: 'Gwanghwamun · Jongno', ar: 'غوانغهوامون · جونغنو', 'zh-CN': '光化门·钟路', ja: '光化門・鍾路', 'zh-TW': '光化門·鐘路', es: 'Gwanghwamun · Jongno' }],
  ['itaewon-hannam', { ko: '이태원·한남', en: 'Itaewon · Hannam', ar: 'إيتايوون · هاننام', 'zh-CN': '梨泰院·汉南', ja: '梨泰院・漢南', 'zh-TW': '梨泰院·漢南', es: 'Itaewon · Hannam' }],
  ['gangnam-yeoksam', { ko: '강남·역삼', en: 'Gangnam · Yeoksam', ar: 'غانغنام · يوكسام', 'zh-CN': '江南·驿三', ja: '江南・駅三', 'zh-TW': '江南·驛三', es: 'Gangnam · Yeoksam' }],
  ['sinsa-nonhyeon', { ko: '신사·논현', en: 'Sinsa · Nonhyeon', ar: 'سينسا · نونهيون', 'zh-CN': '新沙·论岘', ja: '新沙・論峴', 'zh-TW': '新沙·論峴', es: 'Sinsa · Nonhyeon' }],
  ['apgujeong-rodeo', { ko: '압구정·로데오', en: 'Apgujeong · Rodeo', ar: 'أبغوجونغ · روديو', 'zh-CN': '狎鸥亭·罗德奥', ja: '狎鴎亭・ロデオ', 'zh-TW': '狎鷗亭·羅德奧', es: 'Apgujeong · Rodeo' }],
  ['jamsil-songpa', { ko: '잠실·송파', en: 'Jamsil · Songpa', ar: 'جامسيل · سونغبا', 'zh-CN': '蚕室·松坡', ja: '蚕室・松坡', 'zh-TW': '蠶室·松坡', es: 'Jamsil · Songpa' }],
  ['yeouido', { ko: '여의도', en: 'Yeouido', ar: 'يويدو', 'zh-CN': '汝矣岛', ja: '汝矣島', 'zh-TW': '汝矣島', es: 'Yeouido' }],
  ['yeonnam', { ko: '연남', en: 'Yeonnam', ar: 'يوننام', 'zh-CN': '延南', ja: '延南', 'zh-TW': '延南', es: 'Yeonnam' }],
  ['hapjeong-mangwon', { ko: '합정·망원', en: 'Hapjeong · Mangwon', ar: 'هابجونغ · مانغوون', 'zh-CN': '合井·望远', ja: '合井・望遠', 'zh-TW': '合井·望遠', es: 'Hapjeong · Mangwon' }],
  ['geumho-oksu', { ko: '금호·옥수', en: 'Geumho · Oksu', ar: 'غومهو · أوكسو', 'zh-CN': '金湖·玉水', ja: '金湖・玉水', 'zh-TW': '金湖·玉水', es: 'Geumho · Oksu' }],
  ['cheongdam', { ko: '청담', en: 'Cheongdam', ar: 'تشونغدام', 'zh-CN': '清潭', ja: '清潭', 'zh-TW': '清潭', es: 'Cheongdam' }],
  ['busan', { ko: '부산', en: 'Busan', ar: 'بوسان', 'zh-CN': '釜山', ja: '釜山', 'zh-TW': '釜山', es: 'Busan' }],
  ['jeju', { ko: '제주', en: 'Jeju', ar: 'جيجو', 'zh-CN': '济州', ja: '済州', 'zh-TW': '濟州', es: 'Jeju' }],
  ['daegu', { ko: '대구', en: 'Daegu', ar: 'دايغو', 'zh-CN': '大邱', ja: '大邱', 'zh-TW': '大邱', es: 'Daegu' }],
];

export const MAP_AREAS: MapArea[] = LABELS.map(([id, label]) => {
  const [latitude, longitude] = AREA_CENTERS[id];
  return { id, label, center: { latitude, longitude } };
});

export const DEFAULT_MAP_AREA = MAP_AREAS[0];

/** 이 거리 안이면 그 지역을 보고 있다고 본다 */
const AREA_MATCH_METERS = 1500;

function distanceMeters(a: StoreCoordinates, b: StoreCoordinates) {
  const dLat = (a.latitude - b.latitude) * 111_320;
  const dLng = (a.longitude - b.longitude) * 111_320 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** 좌표에서 가장 가까운 지역(1.5km 안). 없으면 null. */
export function mapAreaAt(location: StoreCoordinates | null | undefined): MapArea | null {
  if (!location) return null;
  let best: { area: MapArea; distance: number } | null = null;
  for (const area of MAP_AREAS) {
    const distance = distanceMeters(area.center, location);
    if (!best || distance < best.distance) best = { area, distance };
  }
  return best && best.distance <= AREA_MATCH_METERS ? best.area : null;
}

/** 한국어 '로/으로': 받침이 있으면(ㄹ 받침 제외) '으로' */
export function koreanTo(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const final = code % 28;
  return final === 0 || final === 8 ? `${word}로` : `${word}으로`;
}
