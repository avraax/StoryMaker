import axios from 'axios';
import { StoryChapter } from '../models/story-chapter';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ImageService } from './image.service';


@Injectable({
  providedIn: 'root',
})
export class AIService {

    constructor(private imageService: ImageService) { }
    
    estimateTokens(wordsPerChapter: number, lixLevel: number): number {
        const promptTokens = 503; // Dynamisk beregnet fra din faktiske prompt.
        const maxAllowedTokens = 4096;
    
        // Reduceret token-reservation for JSON-struktur
        const jsonStructureTokens = 150;
    
        // Justering af kompleksitet baseret på LIX-niveau (gradient)
        const complexityAdjustment = lixLevel <= 25 ? 0.90 : lixLevel <= 35 ? 0.80 : 0.75;
    
        // Estimeret antal tokens baseret på ønsket antal ord pr. kapitel
        const estimatedTokens = Math.ceil(wordsPerChapter / complexityAdjustment);
    
        // Tokens til rådighed for completion (selve genereringen af tekst)
        const availableTokensForCompletion = maxAllowedTokens - promptTokens - jsonStructureTokens;
    
        // Advarsel, hvis vi forsøger at bruge flere tokens end hvad der er tilgængeligt
        if (estimatedTokens > availableTokensForCompletion) {
            console.warn(`Forventede tokens (${estimatedTokens}) overstiger de tilgængelige tokens (${availableTokensForCompletion}). Reducér længden af prompten eller øg max_tokens.`);
        }
    
        // Return det mindste af de beregnede tokens og de tilgængelige tokens
        return Math.min(estimatedTokens, availableTokensForCompletion);
    }    
    
    async *generateStoryStream(
      mainCategory: string,
      subCategory: string,
      topic: string,
      lix: number,
      numberOfChapters: number,
      imagesPerChapter: number,
      wordsPerChapter: number
  ): AsyncGenerator<StoryChapter | { description: string; image: string }, void, unknown> {
  
      const maxTokens = this.estimateTokens(wordsPerChapter, lix);
    
      let conversationHistory: any[] = [];
      let previousChapterSummary = "";
  
      // Initialiserer med `system` prompten - kun én gang!
      const systemPrompt = `
        Du er en historiegenerator, som skal generere en sammenhængende historie opdelt i ${numberOfChapters} kapitler på dansk.
        Historien skal følge en logisk tidslinje, begynde med en introduktion og slutte med en konklusion.
        LIX-niveauet skal være under ${lix}.
        Brug korte og enkle sætninger, hvis LIX er under 25. Brug længere og mere komplekse sætninger, hvis LIX er over 35.
        For LIX mellem 25 og 35, skriv varieret med både korte og lidt længere sætninger.
        Hvert kapitel skal være på mellem 500 og 1000 ord og opdelt i flere afsnit med klare titler.
        Returnér outputtet som en fuldstændig JSON-struktur.
        Sørg for, at kapitlerne hænger sammen og dækker hele emnet.
    `;


  
      // Tilføjer `system` prompten til samtalehistorikken
      conversationHistory.push({ role: "system", content: systemPrompt });
  
      for (let chapterIndex = 1; chapterIndex <= numberOfChapters; chapterIndex++) {
        const userPrompt = `
            Generér kapitel ${chapterIndex}/${numberOfChapters} baseret på følgende input:

            ${mainCategory ? `Kategori: ${mainCategory}` : ''}
            ${subCategory && mainCategory ? `Underkategori: ${subCategory}` : ''}
            Emne: ${topic}
            Resume af tidligere kapitler: ${previousChapterSummary}

            Udnyt maks. tokens: ${maxTokens}.
            Returnér resultatet som gyldigt JSON:
            {
                "title": "Kapitel ${chapterIndex}: Titel",
                "texts": ["Afsnit 1", "Afsnit 2", "Afsnit 3", ...],
                "imageQuery": "Relateret billedsøgning baseret på kapitlet"
            }
        `;
      
  
          conversationHistory.push({ role: "user", content: userPrompt });
  
          try {
              const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                  model: "gpt-4-turbo",
                  messages: conversationHistory,
                  temperature: 0.7,
                  max_tokens: Math.floor(maxTokens * 2.50)
              }, {
                  headers: {
                      'Authorization': `Bearer ${environment.openAIConfig.apiKey}`,
                      'Content-Type': 'application/json'
                  }
              });
  
              const chapterContent = response.data.choices[0].message.content;
  
              // Forsøg på at parse det genererede kapitel
              let parsedChapter: StoryChapter;
              try {
                  parsedChapter = JSON.parse(chapterContent);
              } catch (parseError) {
                  console.error("Fejl ved parsing af AI-svar, forsøger at få længere tekst...");
                  continue;
              }
  
              // Henter billeder fra din imageService
              let images = await this.imageService.fetchImages(`${parsedChapter.imageQuery}`, imagesPerChapter);
              parsedChapter.images = images;

              // Opdaterer resume til næste kapitel prompt
              previousChapterSummary = `${parsedChapter.title}: ${parsedChapter.texts.slice(0, 2).join(" ")}`;
  
              // Tilføjer AI's svar til samtalehistorikken
              conversationHistory.push({ role: "assistant", content: chapterContent });
  
              console.log(`Kapitel ${chapterIndex} genereret.`);
  
              // Yielder kapitlet til frontend (eller hvor det skal bruges)
              yield parsedChapter;
  
          } catch (error) {
              console.error(`Fejl ved generering af kapitel ${chapterIndex}:`, error);
              break;
          }
      }
  
      const summary = await this.generateStorySummary(conversationHistory);
  
      const coverImages = await this.imageService.fetchImages(`${topic} profile picture`, 5);
      const coverImage = coverImages.find(img => img.startsWith("data:image")) || "";

      yield { description: summary, image: coverImage };
  }
  
    private async generateStorySummary(conversationHistory: any[]): Promise<string> {
        const prompt = `
            Du skal lave en kort opsummering af en længere historie baseret på følgende samtalehistorik:

            ${conversationHistory
                .filter(msg => msg.role === "assistant")
                .map((msg, index) => `Kapitel ${index + 1}: ${msg.content}`)
                .join("\n")}

            Opsummer hele historien i én sætning på max 20 ord, som kan vises på forsiden af en bog.
        `;

        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${environment.openAIConfig.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const summary = response.data.choices[0].message.content.trim();
            console.log(`Opsummering genereret: ${summary}`);
            return summary;

        } catch (error) {
            console.error('Fejl ved generering af opsummering:', error);
            return "Fejl i generering af opsummering.";
        }
    }

    async testLixLevels() {
        console.log('starter test')
        const lixLevels = [5, 10, 20, 25, 35, 45, 55];
        const results: any[] = [];
    
        for (const lix of lixLevels) {
            console.log(`Testing LIX Level: ${lix}`);
    
            // Generate a simple story for each LIX level
            const result = this.generateStoryStream(
                "sport",
                "Spillere",
                "Messi",
                lix,
                1,           // One chapter for testing
                1,           // Three images per chapter
                500          // 500 words per chapter
            );
    
            let storyText = "";
            for await (const data of result) {
    
                // Type guard to ensure 'texts' exists before trying to access it
                if ('texts' in data && Array.isArray(data.texts)) {
                    storyText += data.texts.join(" ");
                }
            }
    
            // Calculate word count and LIX level
            const words = storyText.split(/\s+/).length;
            const sentences = storyText.split(/[.!?]+/).length - 1;
            const longWords = storyText.split(/\s+/).filter(word => word.length > 6).length;
            const calculatedLix = Math.round(words / sentences + (longWords * 100) / words);
    
            console.log(`LIX Level: ${lix}, Calculated LIX: ${calculatedLix}, Word Count: ${words}`);
    
            results.push({
                lix,
                calculatedLix,
                words,
                storyText,
            });
        }
    
        // Log the summary of results
        console.table(results);
    }
    
}