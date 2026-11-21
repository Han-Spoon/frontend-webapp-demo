// 라이선스 있는 분위기 사진(목록 가게의 실제 사진 아님). 출처·교체 기준: docs/restaurant-recommendations.md.
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;

export const RESTAURANT_PHOTOS = {
  dining: image('photo-1515768678138-4ba95ba6ec96'),
  korean: image('photo-1769558688746-7ac36d8ce999'),
  bibimbap: image('photo-1741295017668-c8132acd6fc0'),
  sushi: image('photo-1560689011-2ceb5b1bfcb7'),
};

export function restaurantReferencePhoto(category: string | null | undefined) {
  // 명시된 음식 분류만 매칭(가게 이름은 메뉴 근거 아님).
  if (/비빔밥|bibimbap/i.test(category ?? '')) return RESTAURANT_PHOTOS.bibimbap;
  if (/초밥|스시|sushi/i.test(category ?? '')) return RESTAURANT_PHOTOS.sushi;
  if (/한식|korean/i.test(category ?? '')) return RESTAURANT_PHOTOS.korean;
  return RESTAURANT_PHOTOS.dining;
}

// 반복·미확인 분류용 중립 식당 사진. 추천 목록 최대 수만큼 6장.
export const DINING_PHOTO_POOL = [
  RESTAURANT_PHOTOS.dining,
  image('photo-1777502286448-35389817f504'),
  image('photo-1765021097487-6da56c1ce412'),
  image('photo-1765021093883-b9ee22cc9840'),
  image('photo-1773122150546-94699cfc8f23'),
  image('photo-1763142045723-230b56924c6a'),
];

export function restaurantRecommendationPhotos(categories: Array<string | null | undefined>) {
  const used = new Set<string>();
  return categories.map(category => {
    const preferred = restaurantReferencePhoto(category);
    const selected = !used.has(preferred) ? preferred : DINING_PHOTO_POOL.find(url => !used.has(url)) ?? preferred;
    used.add(selected);
    return selected;
  });
}
