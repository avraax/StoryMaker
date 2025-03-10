import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageService {

  constructor() {}

  async fetchImages(imageQuery: string, maxImages: number): Promise<string[]> {
    let images: string[] = [];

    const googleImages = await this.fetchGoogleImage(imageQuery, maxImages);
    if (googleImages && googleImages.length > 0) {
      for (const imgUrl of googleImages) {
        const base64Image = await this.convertImageToBase64(imgUrl);
        if (base64Image) {
          images.push(base64Image);
        }
      }
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

  async fetchGoogleImage(imageQuery: string, maxImages: number): Promise<string[]> {
    try {
      const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          q: `${imageQuery}`,
          searchType: "image",
          cx: environment.googleConfig.cseId,
          key: environment.googleConfig.apiKey,
          num: maxImages,
          imgSize: "large",
          imgType: "photo",
          fileType: "jpg,png",
          safe: "high",
          lr: "lang_en",
        },
      });
  
      return response.data.items.map((item: any) => item.link);
    } catch (error) {
      console.error("Error fetching images:", error);
      return [];
    }
  }

  async isImageAccessible(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;  // If the image cannot be loaded, filter it out
    }
  }
}
