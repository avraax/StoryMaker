import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLockService {
  private wakeLock: any = null;

  async enableWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Skærmen vil nu forblive tændt.');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake lock frigivet.');
        });
      } else {
        console.error('Wake Lock API understøttes ikke af denne browser.');
      }
    } catch (err: any) {
      console.error(`Wake lock fejlede: ${err.name}, ${err.message}`);
    }
  }

  async disableWakeLock() {
    if (this.wakeLock !== null) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log('Wake lock deaktiveret.');
    }
  }
}
