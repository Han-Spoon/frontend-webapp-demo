import type { UserProfile } from '../types';

/** 촬영·시연 고정 프로필. App이 바로 써서 메뉴 fixture와 분리. */
export const FILMING_PROFILE: UserProfile = {
  nationality: 'ES', languageCode: 'ko', isFirstTime: false,
  isVegan: true, veganType: 'vegan', hasReligion: false, religionType: null,
  hasAllergies: true, allergies: ['shrimp'], noSpicy: false, noAlcohol: false,
};
