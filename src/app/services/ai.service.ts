import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import { StoryChapter } from '../models/story-chapter';
import { ImageService } from './image.service';

@Injectable({
  providedIn: 'root',
})
export class AIService {
  totalChapters: number = 10;
  maxStoryTokens: number = 1000;
  imagesPerChapter: number = 4;

  constructor(private imageService: ImageService) { }

  async *generateStoryStream(
    mainCategory: string,
    subCategory: string,
    topic: string,
    grade: number
  ): AsyncGenerator<StoryChapter | { description: string; image: string }, void, unknown> {

    const maxWords = Math.floor(this.maxStoryTokens * 0.75);
    let storySoFar = "";
    const chapters: StoryChapter[] = [];

    for (let i = 1; i <= this.totalChapters; i++) {
      let roleInstructions = this.getRoleInstructions(i, this.totalChapters);

      const response = await axios.post(
        environment.openAIConfig.apiUrl,
        {
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: `
                Du skriver 100% faktuelle historier til folkeskoleelever i en dansk ${grade}. klasse.
                Historien skal være sammenhængende og bygge videre fra kapitel til kapitel.
                
                🔹 **Output-krav**:
                1. Returnér en gyldig JSON-struktur:
                   {
                     "title": "Kapitel X: Titel",
                     "texts": ["Afsnit 1", "Afsnit 2"],
                     "imageQuery": "Optimeret Google-billedsøgning"
                   }
                2. **For "imageQuery"**, generér en optimeret søgestreng til Google Custom Search API.
                3. **Ingen ekstra tekst udenfor JSON-objektet**.
              `
            },
            {
              role: 'user',
              content: `
                Generér **kapitel ${i}** af en faktuel historie om **${topic}**${mainCategory !== 'other' ? ` inden for **${subCategory}** i **${mainCategory}**` : ''}.
                Historien skal være sammenhængende og fortsætte fra tidligere kapitler.
                
                ${i > 1 ? `🔹 **Resumé af historien indtil nu:**\n\`\`\`json\n${JSON.stringify(storySoFar)}\n\`\`\`` : ''} 
                
                - ${roleInstructions}
                - Returnér **kun** valid JSON som beskrevet.
                - **Sørg for, at teksten er velstruktureret og korrekt escape'et.**
              `.trim()
            }
          ],
          max_tokens: this.maxStoryTokens
        },
        {
          headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' }
        }
      );

      let jsonResponse = response.data.choices[0].message.content.trim();
      let newChapter: StoryChapter;

      try {
        newChapter = JSON.parse(jsonResponse) as StoryChapter;
      } catch (error) {
        console.error("Fejl ved parsing af JSON:", error);
        console.error("Modtaget output:", jsonResponse);
        throw new Error("Fejl i AI-output, kunne ikke parse JSON.");
      }

      if (!newChapter.title || !newChapter.texts || !newChapter.imageQuery) {
        console.error("Fejl: AI-output mangler felter", newChapter);
        throw new Error("AI-returneret JSON mangler nødvendige felter.");
      }

      let images = await this.imageService.fetchImages(newChapter.imageQuery, this.imagesPerChapter);
      newChapter.images = images;

      storySoFar += `\nKapitel ${i}: ${newChapter.title}\n${newChapter.texts.join(" ")}\n`;

      chapters.push(newChapter); // Store chapters for later metadata generation
      yield newChapter; // Yield each chapter in the stream

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 🔹 Generate metadata after all chapters have been created
    const metadata = await this.generateStoryMetadata(topic, storySoFar, grade);
    const coverImages = await this.imageService.fetchImages(topic, 5);
    const coverImage = coverImages.find(img => img.startsWith("data:image")) || "";

    yield {
      description: metadata.description,
      image: coverImage
    };
  }


  async generateStoryMetadata(storyTitle: string, storySoFar: string, grade: number): Promise<{ description: string; }> {
    if (!storySoFar.trim()) {
      throw new Error("Historien er tom, kan ikke generere metadata.");
    }

    const response = await axios.post(
      environment.openAIConfig.apiUrl,
      {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `
              Genererer en meget kort og fængende bogbeskrivelse lavet til folkeskoleelever i en dansk ${grade}. klasse. og en billedbeskrivelse til en forsideillustration.
              Brug historieteksten til at opsummere temaet kort og præcist.
  
              🔹 **Output-krav**:
              1. Returnér udelukkende et JSON-objekt, intet andet tekst.
              2. Strukturen skal være:
                 {
                   "description": "Meget kort bogbeskrivelse"
                 }
              3. **Ingen ekstra forklaringer, kun JSON!**
            `
          },
          {
            role: 'user',
            content: `
              Generér metadata for en bog med titlen **${storyTitle}**.
  
              🔹 **Generér en kort bogbeskrivelse** på 1 sætning, som opsummerer historiens indhold.
              🔹 **Generér en billedbeskrivelse**, der kan bruges til en Google-billedsøgning til et billede til forsideillustration.
    
              Historieindhold:
              ${storySoFar.substring(0, 5000)}
  
              Husk: Returnér **kun** gyldig JSON, uden ekstra tekst.
            `.trim()
          }
        ],
        max_tokens: 300
      },
      {
        headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' }
      }
    );

    const jsonResponse = response.data.choices[0].message.content.trim();

    // 🔹 Validate JSON format before parsing
    if (!jsonResponse.startsWith("{") || !jsonResponse.endsWith("}")) {
      console.error("❌ AI response is not valid JSON:", jsonResponse);
      throw new Error("Fejl i AI-output: Modtaget data er ikke valid JSON.");
    }

    try {
      const metadata = JSON.parse(jsonResponse);
      if (!metadata.description) {
        throw new Error("Manglende felter i metadata.");
      }
      return metadata;
    } catch (error) {
      console.error("❌ Fejl ved parsing af AI-metadata:", error, "Modtaget output:", jsonResponse);
      throw new Error("Fejl i AI-output, kunne ikke parse JSON.");
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
