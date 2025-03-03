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
    maxStoryTokens: number = 1000,
    imagesPerChapter: number = 4
  ): Promise<{ title: string; texts: string[]; images: string[], imageQuery: string }[]> {

    const chapters: { title: string; texts: string[]; images: string[], imageQuery: string }[] = [];
    const maxWords = Math.floor(maxStoryTokens * 0.75);

    let storySoFar = ""; // Keeps track of previous chapters

    for (let i = 1; i <= chapterCount; i++) {
      let roleInstructions = this.getRoleInstructions(i, chapterCount);

      const response = await axios.post(
        environment.openAIConfig.apiUrl,
        {
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: `
              Du skriver faktuelle historier til folkeskoleelever i en dansk ${grade}. klasse.
              Historien skal være sammenhængende og bygge videre fra kapitel til kapitel.
            
              🔹 **Output-krav**:
              1. Returnér en gyldig JSON-struktur:
                 {
                   "title": "Kapitel X: Titel",
                   "texts": ["Afsnit 1", "Afsnit 2"],
                   "imageQuery": "Optimeret Google-billedsøgning"
                 }
              2. **For "imageQuery"**, generér en optimeret søgestreng til Google Custom Search API:
                 - **Brug præcise nøgleord** (f.eks. "vulkanudbrud", "middelalderborg", "solsystemet").
                 - **Brug \`intitle:\` hvis relevant** (f.eks. "intitle:vulkanudbrud").
                 - **Undgå brede søgeord** som "historie", "info", "tema".
                 - **Ingen markdown, HTML eller specialtegn**.
              3. **Ingen ekstra tekst udenfor JSON-objektet**.
              `
            }
            ,
            {
              role: 'user',
              content: `
                Generér **kapitel ${i}** af en faktuel historie om **${topic}**${mainCategory !== 'other' ? ` inden for **${subCategory}** i **${mainCategory}**` : ''}.
                
                Historien skal være sammenhængende og fortsætte fra tidligere kapitler.
                
                ${i > 1 ? `🔹 **Resumé af historien indtil nu:** ${storySoFar}` : ''}
                
                - ${roleInstructions}
                - Returnér **kun** valid JSON som beskrevet.
              `.trim()
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

      let images = await this.fetchImages(newChapter.imageQuery, imagesPerChapter);
      newChapter.images = images;

      chapters.push(newChapter);

      storySoFar += `\nKapitel ${i}: ${newChapter.title}\n${newChapter.texts.join(" ")}\n`;

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return chapters;
  }

  async fetchImages(imageQuery: string, maxImages: number): Promise<string[]> {
    let images: string[] = [];

    const googleImages = await this.fetchGoogleImage(imageQuery, maxImages);
    if (googleImages && googleImages.length > 0) {
      images.push(...googleImages);
    }

    return images;
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

  private getRoleInstructions(i: number, chapterCount: number): string {
    if (i === 1) {
      return `
        **Dette er kapitel 1 af historien.**
        - Introducér emnet klart og engagerende.
        - Giv baggrundsinformation og kontekst.
        - Forklar vigtige nøglepunkter for at sætte rammen for historien.
        - Afslut ikke historien her, men forbered læseren på de næste kapitler.
      `;
    } else if (i === chapterCount) {
      return `
        **Dette er det sidste kapitel i historien.**
        - Byg videre på tidligere kapitler.
        - Opsummer vigtige pointer fra tidligere kapitler.
        - Sørg for en stærk afslutning, der binder det hele sammen.
      `;
    } else {
      return `
        **Dette er et midterkapitel.**
        - Byg videre på tidligere kapitler.
        - Tilføj flere detaljer, forklaringer og eksempler.
        - Introducér nye relevante fakta, men hold en logisk progression.
        - Sørg for en naturlig overgang til det næste kapitel.
      `;
    }
  }
}
