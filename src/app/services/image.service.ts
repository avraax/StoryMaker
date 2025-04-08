import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  constructor() { }

  async fetchImages(prompt: string, maxImages: number): Promise<string[]> {
    switch (environment.imageProvider) {
      case 'dalle':
        return await this.fetchDalleImages(prompt, maxImages);
      case 'google':
        return await this.fetchGoogleImages(prompt, maxImages);
      case 'stability':
        return await this.fetchStabilityImages(prompt, maxImages);
      case 'flux':
        return await this.fetchFluxImages(prompt, maxImages);
      default:
        console.warn("⚠️ Unknown image provider. Falling back to Google.");
        return await this.fetchGoogleImages(prompt, maxImages);
    }
  }

  // ✅ DALL·E 2 with rate-limiting and retry
  private async fetchDalleImages(prompt: string, count: number): Promise<string[]> {
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const image = await this.fetchImageWithRetry(prompt);
        if (image) images.push(image);
      } catch (error) {
        console.error(`❌ Failed to fetch DALL·E image ${i + 1}:`, error);
      }

      // ⏳ Delay between DALL·E requests to avoid 429
      await this.delay(1000);
    }

    return images;
  }

  private async fetchImageWithRetry(prompt: string, retries: number = 3): Promise<string | null> {
    let delayTime = 1000;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.post(
          environment.openAIConfig.aiImageApiUrl,
          {
            model: "dall-e-2",
            prompt,
            n: 1,
            size: "512x512",
            response_format: "b64_json",
          },
          {
            headers: {
              Authorization: `Bearer ${environment.openAIConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const imageData = response.data?.data?.[0]?.b64_json;
        return imageData ? `data:image/png;base64,${imageData}` : null;
      } catch (error: any) {
        const status = error.response?.status;
        if (status === 429) {
          console.warn(`⚠️ Rate limit hit, retrying in ${delayTime}ms... (Attempt ${attempt + 1})`);
          await this.delay(delayTime);
          delayTime *= 2;
        } else {
          console.error("❌ Non-retryable error:", error.response?.data || error);
          break;
        }
      }
    }

    return null;
  }

  private async fetchGoogleImages(imageQuery: string, maxImages: number): Promise<string[]> {
    let images: string[] = [];
    let startIndex = 1;

    try {
      while (images.length < maxImages) {
        const batchSize = Math.min(10, maxImages - images.length);
        const googleImages = await this.fetchGoogleImageBatch(imageQuery, batchSize, startIndex);

        if (!googleImages || googleImages.length === 0) break;

        for (const imgUrl of googleImages) {
          if (images.length >= maxImages) break;
          const base64Image = await this.convertImageToBase64(imgUrl);
          if (base64Image) images.push(base64Image);
        }

        startIndex += batchSize;
        if (googleImages.length < batchSize) break;
      }
    } catch (error) {
      console.error("❌ Error fetching Google images:", error);
    }

    return images;
  }

  private async fetchGoogleImageBatch(imageQuery: string, batchSize: number, startIndex: number): Promise<string[]> {
    try {
      const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          q: imageQuery,
          searchType: "image",
          cx: environment.googleConfig.cseId,
          key: environment.googleConfig.apiKey,
          num: batchSize,
          start: startIndex,
          imgSize: "small",
          imgType: "photo",
          safe: "high",
        },
      });

      return response.data.items ? response.data.items.map((item: any) => item.link) : [];
    } catch (error) {
      console.error("❌ Error during Google image batch fetch:", error);
      return [];
    }
  }

  private async fetchStabilityImages(prompt: string, count: number): Promise<string[]> {
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const image = await this.fetchStabilityImage(prompt);
        if (image) images.push(image);
      } catch (error) {
        console.error(`❌ Stability image ${i + 1} failed:`, error);
      }

      await this.delay(1000); // Optional throttle
    }

    return images;
  }

  private async fetchStabilityImage(prompt: string): Promise<string | null> {
    try {
      const response = await axios.post(
        environment.stabilityConfig.apiUrl,
        {
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          steps: 30,
          width: 1024,
          height: 1024,
        },
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${environment.stabilityConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const base64 = response.data?.artifacts?.[0]?.base64;
      return base64 ? `data:image/png;base64,${base64}` : null;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 429) {
        console.warn("⚠️ Stability API rate-limited (429)");
      }
      throw error;
    }
  }

  private async fetchFluxImages(prompt: string, count: number): Promise<string[]> {
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const image = await this.fetchFluxImage(prompt);
        if (image) images.push(image);
      } catch (error) {
        console.error(`❌ FLUX.1 image ${i + 1} failed:`, error);
      }

      await this.delay(1000);
    }

    return images;
  }

  private async fetchFluxImage(prompt: string): Promise<string | null> {
    try {
      const response = await axios.post(
        environment.fluxConfig.apiUrl,
        {
          prompt,
          model: environment.fluxConfig.model,
          output_format: 'base64',
          output_quality: 80,
        },
        {
          headers: {
            Authorization: `Bearer ${environment.fluxConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const base64 = response.data?.image_base64;
      return base64 ? `data:image/png;base64,${base64}` : null;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 429) {
        console.warn("⚠️ FLUX.1 API rate-limited (429)");
      } else {
        console.error("❌ FLUX.1 fetch error:", error?.response?.data || error);
      }
      throw error;
    }
  }

  private async convertImageToBase64(imageUrl: string): Promise<string | null> {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`,
      `https://cors-anywhere.herokuapp.com/${imageUrl}`,
    ];

    for (let proxy of proxies) {
      try {
        const response = await fetch(proxy);
        if (response.ok) {
          const blob = await response.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn(`❌ Proxy failed: ${proxy}`, error);
      }
    }

    console.error("❌ All proxies failed.");
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
