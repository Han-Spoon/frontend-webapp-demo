import type { LocalizedText } from '../../locales';

/**
 * 전체 지도 지역 태그. 외국인 방문이 많은 서울 동네 묶음(행정구 아님).
 * 중심 좌표는 대표 역·거리 사이 대략값(추정). 누르면 이 좌표에서 후보 조회(반경은 API 기본값).
 */
export interface SeoulArea {
  id: string;
  label: LocalizedText;
  latitude: number;
  longitude: number;
}

export const SEOUL_AREAS: SeoulArea[] = [
  {
    // 명동 거리·명동성당·남대문시장
    id: 'myeongdong',
    label: { ko: '명동·남대문', en: 'Myeongdong', ar: 'ميونغدونغ', 'zh-CN': '明洞·南大门', ja: '明洞・南大門', 'zh-TW': '明洞·南大門', es: 'Myeongdong' },
    latitude: 37.5626,
    longitude: 126.9830,
  },
  {
    // 경복궁·광화문광장·인사동·익선동·북촌
    id: 'jongno',
    label: { ko: '종로·광화문', en: 'Jongno · Gwanghwamun', ar: 'جونغنو · غوانغهوامون', 'zh-CN': '钟路·光化门', ja: '鍾路・光化門', 'zh-TW': '鐘路·光化門', es: 'Jongno · Gwanghwamun' },
    latitude: 37.5735,
    longitude: 126.9830,
  },
  {
    // 을지로 골목·광장시장·DDP
    id: 'euljiro-dongdaemun',
    label: { ko: '을지로·동대문', en: 'Euljiro · Dongdaemun', ar: 'أولجيرو · دونغدايمون', 'zh-CN': '乙支路·东大门', ja: '乙支路・東大門', 'zh-TW': '乙支路·東大門', es: 'Euljiro · Dongdaemun' },
    latitude: 37.5670,
    longitude: 127.0010,
  },
  {
    // 홍대입구·연남동·연트럴파크
    id: 'hongdae',
    label: { ko: '홍대·연남', en: 'Hongdae · Yeonnam', ar: 'هونغداي · يوننام', 'zh-CN': '弘大·延南', ja: '弘大・延南', 'zh-TW': '弘大·延南', es: 'Hongdae · Yeonnam' },
    latitude: 37.5580,
    longitude: 126.9240,
  },
  {
    // 이태원역·경리단길·한남동
    id: 'itaewon',
    label: { ko: '이태원·한남', en: 'Itaewon · Hannam', ar: 'إيتايوون · هاننام', 'zh-CN': '梨泰院·汉南', ja: '梨泰院・漢南', 'zh-TW': '梨泰院·漢南', es: 'Itaewon · Hannam' },
    latitude: 37.5345,
    longitude: 126.9960,
  },
  {
    // 신용산·용리단길·삼각지·아이파크몰(시연 가게 밀집 지역)
    id: 'yongsan',
    label: { ko: '용산', en: 'Yongsan', ar: 'يونغسان', 'zh-CN': '龙山', ja: '龍山', 'zh-TW': '龍山', es: 'Yongsan' },
    latitude: 37.5305,
    longitude: 126.9665,
  },
  {
    // 성수동 카페·팝업 거리, 건대입구
    id: 'seongsu',
    label: { ko: '성수·건대', en: 'Seongsu · Konkuk Univ.', ar: 'سونغسو · كونداي', 'zh-CN': '圣水·建大', ja: '聖水・建大', 'zh-TW': '聖水·建大', es: 'Seongsu · Konkuk' },
    latitude: 37.5435,
    longitude: 127.0600,
  },
  {
    // 강남역·신논현
    id: 'gangnam',
    label: { ko: '강남역', en: 'Gangnam Station', ar: 'محطة غانغنام', 'zh-CN': '江南站', ja: '江南駅', 'zh-TW': '江南站', es: 'Estación Gangnam' },
    latitude: 37.4995,
    longitude: 127.0270,
  },
  {
    // 가로수길·압구정로데오(청담 쪽)
    id: 'sinsa-apgujeong',
    label: { ko: '신사·압구정', en: 'Sinsa · Apgujeong', ar: 'سينسا · أبغوجونغ', 'zh-CN': '新沙·狎鸥亭', ja: '新沙・狎鴎亭', 'zh-TW': '新沙·狎鷗亭', es: 'Sinsa · Apgujeong' },
    latitude: 37.5240,
    longitude: 127.0320,
  },
  {
    // 코엑스몰·별마당도서관·봉은사
    id: 'coex',
    label: { ko: '코엑스·삼성', en: 'COEX · Samseong', ar: 'كوإكس · سامسونغ', 'zh-CN': 'COEX·三成', ja: 'COEX・三成', 'zh-TW': 'COEX·三成', es: 'COEX · Samseong' },
    latitude: 37.5115,
    longitude: 127.0595,
  },
  {
    // 롯데월드·롯데월드몰·석촌호수
    id: 'jamsil',
    label: { ko: '잠실', en: 'Jamsil', ar: 'جامسيل', 'zh-CN': '蚕室', ja: '蚕室', 'zh-TW': '蠶室', es: 'Jamsil' },
    latitude: 37.5115,
    longitude: 127.1020,
  },
  {
    // 더현대 서울·IFC·여의도 한강공원
    id: 'yeouido',
    label: { ko: '여의도', en: 'Yeouido', ar: 'يويدو', 'zh-CN': '汝矣岛', ja: '汝矣島', 'zh-TW': '汝矣島', es: 'Yeouido' },
    latitude: 37.5255,
    longitude: 126.9270,
  },
];

/** 검색 위치가 지역 태그 중심과 같으면(약 10m 이내) 그 지역 */
export function areaAt(location: { latitude: number; longitude: number } | null) {
  if (!location) return null;
  return SEOUL_AREAS.find((area) =>
    Math.abs(area.latitude - location.latitude) < 0.0001 && Math.abs(area.longitude - location.longitude) < 0.0001,
  ) ?? null;
}
