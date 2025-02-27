import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AIService {

  constructor() {
  }

  async generateStory(
    mainCategory: string,
    subCategory: string,
    topic: string,
    grade: number
  ): Promise<{ title: string; text: string; images: string[] }[]> {

    const chapters: { title: string; text: string; images: string[] }[] = [];

    for (let i = 1; i <= 10; i++) {
      // Tilføjer kontekst fra tidligere kapitler
      const previousChaptersText = chapters.map((ch, index) => `${ch.title}\n\n${ch.text}`).join("\n\n");

      const response = await axios.post(
        environment.openAIConfig.apiUrl,
        {
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: `Du skriver faktuelle historier til skoleelever i klasse ${grade}. Hvert kapitel må maksimalt fylde 4000 tokens (~3000 ord).
      
              🔹 **Output-krav**:
              1. Returnér **kun valid JSON** uden ekstra tekst, forklaringer eller tegn.
              2. JSON-strukturen skal være:
                 {
                   "title": "Kapitel X: Titel på kapitel",
                   "text": "Den brødtekst som er i kapitlet.",
                   "images": ["image_url_1", "image_url_2"]
                 }
              3. Brug **ingen markdown, HTML eller specialtegn**.
              4. **Ingen ekstra linjer eller tekst udenfor JSON-objektet**.

              **Tidligere kapitler:**
              ${previousChaptersText}

              **Eksempel på korrekt output:**
              \`\`\`json
              {
                "title": "Kapitel 1: Historien begynder...",
                "text": "Dette er starten på en faktuel historie...",
                "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
              }
              \`\`\`
              `
            },
            {
              role: 'user',
              content: `Generér **kapitel ${i}** af en faktuel historie om **${topic}** inden for **${subCategory}** i **${mainCategory}**.
              - Kapitlet skal **bygge videre** på tidligere kapitler og følge en sammenhængende struktur.
              - Returnér **kun** valid JSON som beskrevet.`
            }
          ],
          max_tokens: 4000
        },
        {
          headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' }
        }
      );

      // Henter OpenAI output og fjerner uønsket indhold
      const json = response.data.choices[0].message.content.trim();

      // Forsøger at parse JSON
      let newChapter;
      try {
        newChapter = JSON.parse(json);
      } catch (error) {
        console.error("Fejl ved parsing af JSON:", error);
        throw new Error("Fejl i AI-output, kunne ikke parse JSON.");
      }

      // Sikrer, at JSON har de rigtige felter
      if (!newChapter.title || !newChapter.text || !newChapter.images) {
        throw new Error("AI-returneret JSON mangler nødvendige felter.");
      }

      // Tilføj kapitel til listen
      chapters.push(newChapter);

      // Vent lidt mellem API-kald for at undgå rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return chapters;
  }

  async generateQuiz(story: { text: string, images: string[] }[], grade: number): Promise<any> {
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
            content: `Lav en quiz med 3-5 flervalgsspørgsmål baseret på denne historie:\n\n${story.map(chapter => chapter.text).join("\n\n")}`
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
}
