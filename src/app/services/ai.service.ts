import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AIService {

  constructor() { }

  async generateStory(
    mainCategory: string,
    subCategory: string,
    topic: string,
    grade: number,
    chapterCount: number = 1,
    maxStoryTokens: number = 1000, // Max er 4096
    imagesPerChapter: number = 2
  ): Promise<{ title: string; texts: string[]; images: string[], imageQuery: string }[]> {
  
    const chapters: { title: string; texts: string[]; images: string[], imageQuery: string }[] = [];
  
    // Beregn estimeret antal ord baseret på tokens (1 token ≈ 0.75 ord)
    const maxWords = Math.floor(maxStoryTokens * 0.75);
  
    for (let i = 1; i <= chapterCount; i++) {
      // Kontekst fra tidligere kapitler
      const previousChaptersText = chapters.map((ch) => `${ch.title}\n\n${ch.texts}`).join("\n\n");
  
      // Definer instruktioner for begyndelse, midte og slutning
      let roleInstructions = "";
  
      if (i === 1) {
        roleInstructions = `
        **Dette er kapitel 1 af historien.**
        - Introducér emnet klart og engagerende.
        - Giv **baggrundsinformation og kontekst**.
        - Forklar vigtige nøglepunkter for at sætte rammen for historien.
        - **Afslut ikke historien her**, men gør læseren klar til de næste kapitler.
        `;
      } else if (i === chapterCount) {
        roleInstructions = `
        **Dette er det sidste kapitel i historien.**
        - **Opsummer vigtige pointer** fra de tidligere kapitler.
        - Sørg for en **klar konklusion**, hvor alt bindes sammen.
        - Giv **en stærk afslutning**, der efterlader læseren med en forståelse af emnet.
        `;
      } else {
        roleInstructions = `
        **Dette er et midterkapitel.**
        - Byg videre på **de tidligere kapitler**.
        - Tilføj flere detaljer, forklaringer og eksempler.
        - Introducér nye relevante fakta, men hold en logisk progression.
        - Sørg for en naturlig overgang til det næste kapitel.
        `;
      }
  
      const response = await axios.post(
        environment.openAIConfig.apiUrl,
        {
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: `Du skriver faktuelle historier til skoleelever i klasse ${grade}. Hvert kapitel må maksimalt fylde ${maxStoryTokens} tokens (~${maxWords} ord).
            
              🔹 **Output-krav**:
              1. Returnér en gyldig JSON-struktur, hvor værdierne for "title", "texts" (som array) og "imageQuery" har escape-sekvenser for invalide tegn som " (dobbelte anførselstegn), \\ (backslash) og eventuelle andre specielle tegn, der kan gøre JSON ugyldig.
              2. **Teksten i "texts"-feltet skal være et array af afsnit**, hvor hvert element i arrayet er en enkelt afsnitstreng.
              3. JSON-strukturen skal være:
                 {
                   "title": "Kapitel X: Titel på kapitel",
                   "texts": [
                     "Dette er første afsnit.",
                     "Dette er andet afsnit.",
                     "Dette er tredje afsnit."
                   ],
                   "imageQuery": "Søgeord til google customsearch billeder baseret på ${topic} og kapitel kontekst"
                 }
              4. Brug **ingen markdown, HTML eller specialtegn**.
              5. **Ingen ekstra linjer eller tekst udenfor JSON-objektet**.
              `
            },
            {
              role: 'user',
              content: `Generér **kapitel ${i}** af en faktuel historie om **${topic}** inden for **${subCategory}** i **${mainCategory}**.
              - Kapitlet skal **bygge videre** på tidligere kapitler og følge en sammenhængende struktur.
              - Returnér **kun** valid JSON som beskrevet.`
            }
          ],
          max_tokens: maxStoryTokens
        },
        {
          headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' }
        }
      );
  
      let jsonResponse = response.data.choices[0].message.content.trim();
  
      let newChapter;
      try {
        newChapter = JSON.parse(jsonResponse);
      } catch (error) {
        console.error("Fejl ved parsing af JSON:", error);
        console.error("Modtaget output:", jsonResponse);
        throw new Error("Fejl i AI-output, kunne ikke parse JSON.");
      }
  
      if (!newChapter.title || !newChapter.texts || !newChapter.imageQuery) {
        console.error("Fejl: AI-output mangler felter", newChapter);
        throw new Error("AI-returneret JSON mangler nødvendige felter.");
      }
  
      let images = await this.fetchImages([newChapter.imageQuery], imagesPerChapter);
      newChapter.images = images;
  
      chapters.push(newChapter);
  
      //Vent lidt for at undgå rate limits**
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  
    return chapters;
  }
  
  async generateQuiz(story: { texts: string[], images: string[] }[], grade: number): Promise<any> {
    const response = await axios.post(
      environment.openAIConfig.apiUrl,
      {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `Du laver quizzer for elever i klasse ${grade}.`
          },
          {
            role: 'user',
            content: `Lav en quiz med 3-5 flervalgsspørgsmål baseret på denne historie:\n\n${story.map(chapter => chapter.texts).join("\n\n")}
            - Returnér **kun** valid JSON som beskrevet.`
          }
        ],
        max_tokens: 500
      },
      {
        headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' },
      }
    );

    return JSON.parse(response.data.choices[0].message.content.trim());
  }

  /**
   * Fetches images from Unsplash, falls back to AI-generated images if none found.
   */
  async fetchImages(queries: string[], maxImages: number): Promise<string[]> {
    let images: string[] = [];

    // Try fetching real images from Unsplash
    for (const query of queries) {
      if (images.length >= maxImages) break;
      const wikiMediaImages = await this.fetchGoogleImage(query, maxImages);
      if (wikiMediaImages && wikiMediaImages.length > 0) {
        images.push(...wikiMediaImages);
      }
    }

    // Fallback to AI-generated images if needed
    while (images.length < maxImages) {
      const aiImage = await this.fetchAIImage();
      images.push(aiImage);
    }

    return images;
  }

  async fetchGoogleImage(searchQuery: string, count: number = 2): Promise<string[]> {
    try {
      const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          q: searchQuery,       // Søgeterm
          searchType: "image",  // Returnér kun billeder
          cx: environment.googleConfig.cseId,  // Google Custom Search Engine ID
          key: environment.googleConfig.apiKey,  // Google API Key
          num: 10,  // Hent flere billeder for at have nok at filtrere i
          rights: "cc_publicdomain",  // Kun offentlige billeder
        },
      });
  
      let uniqueImages = new Set<string>();  // Brug et Set til at undgå dubletter
  
      for (const item of response.data.items) {
        const imageUrl = item.link;
  
        if (!uniqueImages.has(imageUrl) && (await this.isImageAccessible(imageUrl))) {
          uniqueImages.add(imageUrl);
        }
  
        if (uniqueImages.size >= count) break;  // Stop når vi har nok billeder
      }
  
      return Array.from(uniqueImages);  // Returnér som array
  
    } catch (error) {
      console.error("Google Image Search error:", error);
      return [];  // Fallback hvis API-kald fejler
    }
  }
  
  async isImageAccessible(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;  // Hvis billedet ikke kan hentes, filtreres det fra
    }
  }
  
  /**
   * Fetches a fallback AI-generated image from a free service like lexica.art.
   */
  async fetchAIImage(): Promise<string> {
    try {
      const response = await axios.get(`https://lexica.art/api/v1/search`, {
        params: { q: "realistic photo", per_page: 1 },
      });

      if (response.data.images.length > 0) {
        return response.data.images[0].src;
      }
    } catch (error) {
      console.error("Error fetching AI-generated image:", error);
    }

    return "https://example.com/default-placeholder.jpg"; // Final fallback
  }
}
