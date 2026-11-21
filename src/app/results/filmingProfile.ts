import type { UserProfile } from '../App';

/** 촬영·시연 고정 시나리오 프로필. App이 바로 쓰므로 메뉴 fixture와 분리(결과 화면 코드 묶음에 남김). */
export const FILMING_PROFILE: UserProfile = {
  nationality: 'ES', languageCode: 'ko', isFirstTime: false,
  isVegan: true, veganType: 'vegan', hasReligion: false, religionType: null,
  hasAllergies: true, allergies: ['shrimp'], noSpicy: false, noAlcohol: false,
};
