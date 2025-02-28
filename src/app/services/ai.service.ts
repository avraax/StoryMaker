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
    chapterCount: number = 3,
    maxStoryTokens: number = 500, // Max er 4096
    imagesPerChapter: number = 4
  ): Promise<{ title: string; texts: string[]; images: string[], imageQuery: string }[]> {

    const chapters: { title: string; texts: string[]; images: string[], imageQuery: string }[] = [];

    // Beregn estimeret antal ord baseret på tokens (1 token ≈ 0.75 ord)
    const maxWords = Math.floor(maxStoryTokens * 0.75);

    for (let i = 1; i <= chapterCount; i++) {
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
              content: `Du skriver faktuelle historier til folkeskoleelever i en dansk ${grade}. klasse. Teksten må gerne være letlæselig men stadig med ugangspunkt i klassetrin. Hvert kapitel må maksimalt fylde ${maxStoryTokens} tokens (~${maxWords} ord).
            
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

    return images;
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

  async fetchGoogleImage(searchQuery: string, count: number = 2): Promise<string[]> {
    try {
      const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          q: searchQuery,
          searchType: "image",
          cx: environment.googleConfig.cseId,
          key: environment.googleConfig.apiKey,
          num: 10,
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        console.warn("No images found from Google Custom Search.");
        return [];
      }

      let uniqueImages = new Set<string>();

      for (const item of response.data.items) {
        const imageUrl = item.link;

        if (!uniqueImages.has(imageUrl) && (await this.isImageAccessible(imageUrl))) {
          uniqueImages.add(imageUrl);
        }

        if (uniqueImages.size >= count) break;
      }

      return Array.from(uniqueImages);
    } catch (error: any) {
      console.error("Google Image Search error:", error.response?.data || error);
      return [];
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
}
