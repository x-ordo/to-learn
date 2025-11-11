import { fetch } from 'undici';

/**
 * 링크 정규화
 * -----------
 * 호스트 + 경로 기준으로 중복 링크를 제거하기 위한 키를 생성합니다.
 */
export const normalizeUrl = (input: string): string => {
  try {
    const url = new URL(input);
    const pathname = url.pathname?.replace(/\/+$/, '') || '';
    return `${url.hostname}${pathname}`.toLowerCase();
  } catch {
    return input.trim().toLowerCase();
  }
};

/**
 * URL 가용성 검사
 * ---------------
 * HEAD 요청으로 200/3xx를 우선 확인하고, 실패 시 GET으로 폴백합니다.
 * 5초 타임아웃으로 외부 API 지연이 전체 요청을 막지 않도록 제한합니다.
 */
export const validateLinkReachable = async (url: string): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });

    if (headResponse.ok) {
      return true;
    }
  } catch {
    // HEAD 요청 실패 시 GET으로 폴백
  } finally {
    clearTimeout(timer);
  }

  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    return response.ok;
  } catch {
    return false;
  }
};
