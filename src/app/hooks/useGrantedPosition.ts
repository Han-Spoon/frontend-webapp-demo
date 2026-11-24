import { useEffect, useState } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * 위치 권한이 **이미 허용된** 경우에만 현재 위치를 준다(새로 권한을 묻지 않음).
 * 가게 상세 API에는 거리가 없어 이 위치로 거리를 계산하고, 없으면 거리 줄을 숨긴다.
 */
export function useGrantedPosition(): Coordinates | null {
  const [position, setPosition] = useState<Coordinates | null>(null);
  useEffect(() => {
    let active = true;
    const permissions = navigator.permissions;
    if (!permissions?.query || !navigator.geolocation) return;
    permissions.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!active || status.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(
          (current) => { if (active) setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude }); },
          () => { /* 위치를 못 받으면 거리 줄을 숨긴다. */ },
          { timeout: 8000, maximumAge: 300000 },
        );
      })
      .catch(() => { /* 권한 조회를 지원하지 않으면 숨긴다. */ });
    return () => { active = false; };
  }, []);
  return position;
}
