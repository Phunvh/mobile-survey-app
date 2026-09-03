import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export class NativeService {
  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // 1. Chụp ảnh hiện trường bằng Camera Native của Capacitor hoặc Web fallback
  public static async capturePhoto(): Promise<string | null> {
    try {
      if (this.isNative()) {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera
        });
        return image.dataUrl || null;
      } else {
        // Fallback for browser if camera API is supported
        const image = await Camera.getPhoto({
          quality: 75,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt
        });
        return image.dataUrl || null;
      }
    } catch (err: any) {
      console.warn('[NativeService] Camera cancelled or failed:', err?.message || err);
      return null;
    }
  }

  // 2. Lấy tọa độ GPS khuôn viên bằng Geolocation Plugin của Capacitor hoặc Web fallback
  public static async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
  } | null> {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      });

      return {
        latitude: Number(coordinates.coords.latitude.toFixed(6)),
        longitude: Number(coordinates.coords.longitude.toFixed(6)),
        accuracy: Math.round(coordinates.coords.accuracy),
        altitude: coordinates.coords.altitude
      };
    } catch (err: any) {
      console.warn('[NativeService] Geolocation error:', err?.message || err);
      // Fallback HTML5
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: Number(pos.coords.latitude.toFixed(6)),
              longitude: Number(pos.coords.longitude.toFixed(6)),
              accuracy: Math.round(pos.coords.accuracy)
            });
          },
          () => resolve(null),
          { timeout: 8000 }
        );
      });
    }
  }

  // 3. Giám sát trạng thái mạng qua Network Plugin của Capacitor
  public static async checkNetworkStatus(): Promise<boolean> {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
  }

  public static onNetworkChange(callback: (connected: boolean) => void): () => void {
    let removeListener: (() => void) | null = null;

    Network.addListener('networkStatusChange', (status) => {
      callback(status.connected);
    }).then(handle => {
      removeListener = () => handle.remove();
    }).catch(() => {
      // Fallback to browser event
      const onlineHandler = () => callback(true);
      const offlineHandler = () => callback(false);
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      removeListener = () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    });

    return () => {
      if (removeListener) removeListener();
    };
  }
}
