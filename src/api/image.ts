// 메뉴명 참고 이미지 조회(선택 기능). VITE_MENU_IMAGE_BASE_URL이 없으면 조회 안 함.
const MENU_IMAGE_BASE_URL = import.meta.env.VITE_MENU_IMAGE_BASE_URL ?? '';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

function joinImageUrl(fileName: string, ext: string) {
  const baseUrl = MENU_IMAGE_BASE_URL.replace(/\/$/, '');

  return `${baseUrl}/${encodeURIComponent(fileName)}.${ext}`;
}

function normalizeFileName(fileName: string) {
  return fileName.trim().normalize('NFD');
}

function isHangulSyllable(char: string) {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

function getHangulSubstrings(value: string) {
  if (!Array.from(value).every(isHangulSyllable)) return [];

  const candidates: string[] = [];
  const chars = Array.from(value);

  // 긴 부분문자열부터(정확도 높은 순)
  for (let length = chars.length - 1; length >= 2; length -= 1) {
    for (let start = 0; start <= chars.length - length; start += 1) {
      candidates.push(chars.slice(start, start + length).join(''));
    }
  }

  return candidates;
}

/** 정확도 순 후보 2단계. tier1: 정확한 이름·괄호 제거·공백 제거·토큰. tier2: 한글 부분 문자열(tier1 실패 시에만). */
function getCandidateTiers(fileName: string): string[][] {
  const withoutParentheses = fileName.replace(/\s*[([].*?[)\]]\s*/g, ' ').trim();
  const withoutSpaces = withoutParentheses.replace(/\s+/g, '');
  const tokens = withoutParentheses.split(/\s+/).filter(Boolean);

  const dedupe = (arr: string[]) =>
    Array.from(new Set(arr.map(normalizeFileName))).filter((c) => c.length > 0);

  const tier1 = dedupe([fileName, withoutParentheses, withoutSpaces, ...tokens]);
  const tier1Set = new Set(tier1);
  // tier1 실패 시에만 시도하므로 부분 문자열 전부 유지.
  const tier2 = dedupe(getHangulSubstrings(withoutSpaces)).filter((c) => !tier1Set.has(c));

  return [tier1, tier2];
}

/** 여러 URL 동시 로드, 가장 먼저 성공한 URL(전부 실패 시 null) */
function firstLoadableUrl(urls: string[]): Promise<string | null> {
  if (urls.length === 0) return Promise.resolve(null);

  return new Promise((resolve) => {
    let remaining = urls.length;
    let settled = false;

    urls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        if (!settled) {
          settled = true;
          resolve(url);
        }
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining === 0 && !settled) resolve(null);
      };
      img.src = url;
    });
  });
}

// 같은 메뉴명 재조회 방지(진행 중 Promise·결과 캐시).
const lookupCache = new Map<string, Promise<string | null>>();

async function resolveMenuImage(key: string): Promise<string | null> {
  for (const tier of getCandidateTiers(key)) {
    const urls = tier.flatMap((name) => IMAGE_EXTENSIONS.map((ext) => joinImageUrl(name, ext)));
    const found = await firstLoadableUrl(urls);
    if (found) return found;
  }
  return null;
}

/** 메뉴명 → 참고 이미지 URL(미설정 시 항상 null). 후보×확장자를 단계별 병렬 시도, 메뉴명당 1회 조회. */
export function findMenuImageByName(fileNameWithoutExt: string): Promise<string | null> {
  const key = fileNameWithoutExt.trim();
  if (!MENU_IMAGE_BASE_URL || !key) return Promise.resolve(null);

  const cached = lookupCache.get(key);
  if (cached) return cached;

  const promise = resolveMenuImage(key);
  lookupCache.set(key, promise);
  return promise;
}
