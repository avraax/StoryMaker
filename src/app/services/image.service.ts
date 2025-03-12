import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageService {

  constructor() { } async fetchImages(imageQuery: string, maxImages: number): Promise<string[]> {
    let images: string[] = [];
    let startIndex = 1; // Google API bruger 1-baseret indeks

    try {
      while (images.length < maxImages) {
        // Hent billeder fra Google (max 10 per gang)
        const batchSize = Math.min(10, maxImages - images.length);
        const googleImages = await this.fetchGoogleImage(imageQuery, batchSize, startIndex);

        if (!googleImages || googleImages.length === 0) {
          break; // Stop hvis ingen flere billeder findes
        }

        for (const imgUrl of googleImages) {
          if (images.length >= maxImages) break; // Stop hvis vi har nok billeder

          const base64Image = await this.convertImageToBase64(imgUrl);
          if (base64Image) {
            images.push(base64Image);
          }
        }

        // Opdater startIndex for næste batch
        startIndex += batchSize;

        // Hvis vi fik færre billeder end batchSize, betyder det, at der ikke er flere at hente
        if (googleImages.length < batchSize) {
          break;
        }
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }

    return images;
  }

  async convertImageToBase64(imageUrl: string): Promise<string | null> {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`,
      `https://cors-anywhere.herokuapp.com/${imageUrl}`
    ];

    for (let proxy of proxies) {
      try {
        console.log(`Trying proxy: ${proxy}`);
        const response = await fetch(proxy);

        if (response.ok) {
          const blob = await response.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } else {
          console.warn(`⚠️ Proxy failed: ${proxy}, Status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`❌ Proxy request failed: ${proxy}`, error);
      }
    }

    console.error("❌ All proxies failed.");
    return null;
  }

  async fetchGoogleImage(imageQuery: string, batchSize: number, startIndex: number): Promise<string[]> {
    try {
      const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          q: imageQuery,
          searchType: "image",
          cx: environment.googleConfig.cseId,
          key: environment.googleConfig.apiKey,
          num: batchSize,
          start: startIndex,
          imgSize: "large",
          imgType: "photo",
          safe: "high",
        },
      });

      return response.data.items ? response.data.items.map((item: any) => item.link) : [];
    } catch (error) {
      console.error("Error fetching images:", error);
      return [];
    }
  }
}
