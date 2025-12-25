import { ADJECTIVES, NOUNS } from '@/common/constants/nickname-words';

/** 형용사와 명사를 조합하여 무작위 닉네임을 생성합니다. */
export const generateRandomNickname = (): string => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective}${noun}`;
};
