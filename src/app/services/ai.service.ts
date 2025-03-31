import axios from 'axios';
import { StoryChapter } from '../models/story-chapter';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ImageService } from './image.service';


@Injectable({
  providedIn: 'root',
})
export class AIService {

    private maxTokensPerRequest: number = 4096;

    constructor(private imageService: ImageService) { }
    
    async *generateStoryStream(
      mainCategory: string,
      subCategory: string,
      topic: string,
      lix: number,
      numberOfChapters: number,
      imagesPerChapter: number
  ): AsyncGenerator<StoryChapter | { description: string; image: string }, void, unknown> {
  
      let conversationHistory: any[] = [];
      let previousChapterSummary = "";
  
      // Initialiserer med `system` prompten - kun én gang!
      const systemPrompt = `
          Du er en historiegenerator, som skal generere en sammenhængende, faktuel historie opdelt i flere kapitler.
          Alt tekst skal være på dansk.
          Historien skal være 100% baseret på verificerbare fakta og skrives med et gennemsnitligt LIX-tal på ${lix}.
          Historien skal opdeles i ${numberOfChapters} kapitler og følge en logisk tidslinje.
          Hvert kapitel skal have en klar titel, en række afsnit (tekster) og en billedsøgning relateret til indholdet.
          Hvert kapitel skal være på mellem 500 og 1000 ord. Brug flere afsnit til at organisere teksten.
          Historien skal begynde med en introduktion og slutte med en konklusion.
          Sørg for, at kapitlerne hænger sammen og dækker hele emnet.
      `;
  
      // Tilføjer `system` prompten til samtalehistorikken
      conversationHistory.push({ role: "system", content: systemPrompt });
  
      for (let chapterIndex = 1; chapterIndex <= numberOfChapters; chapterIndex++) {
          const userPrompt = `
              Generér kapitel ${chapterIndex} ud af ${numberOfChapters} baseret på følgende input:
  
              Kategori: ${mainCategory}
              Underkategori: ${subCategory}
              Emne: ${topic}
  
              Resume af tidligere kapitler (hvis nogen): ${previousChapterSummary}
  
              Sørg for, at kapitlet følger den etablerede tidslinje og bidrager til historiens sammenhæng.
  
              Udnyt det maksimale antal tokens **(${this.maxTokensPerRequest})** til at generere så meget tekst som muligt.
              
              Output skal være i følgende JSON-format:
  
              {
                  "title": "Kapitel ${chapterIndex}: Titel",
                  "texts": ["Afsnit 1", "Afsnit 2", "Afsnit 3", ...],
                  "imageQuery": "Kort og præcis søgestreng på engelsk, baseret på indholdet per kapitel"
              }
          `;
  
          conversationHistory.push({ role: "user", content: userPrompt });
  
          try {
              const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                  model: "gpt-4-turbo",
                  messages: conversationHistory,
                  temperature: 0.7,
                  max_tokens: this.maxTokensPerRequest
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
}






// import { Injectable } from '@angular/core';
// import axios from 'axios';
// import { environment } from '../../environments/environment';
// import { StoryChapter } from '../models/story-chapter';
// import { ImageService } from './image.service';

// @Injectable({
//   providedIn: 'root',
// })
// export class AIService {
//   totalChapters: number = 10;
//   maxTokensPerRequest: number = 4096; // Maksimale tokens pr. kald = 4096
//   imagesPerChapter: number = 10;

//   constructor(private imageService: ImageService) {}

//   async *generateStoryStream(
//     mainCategory: string,
//     subCategory: string,
//     topic: string,
//     lix: number
//   ): AsyncGenerator<StoryChapter | { description: string; image: string }, void, unknown> {
  
//     let lixDescription = this.getLixDescription(lix);
//     let storySoFar = "";
//     let nextChapterHint = ""; // Hint til næste kapitel

//     for (let i = 1; i <= this.totalChapters; i++) {
//       let roleInstructions = this.getRoleInstructions(i, this.totalChapters);

//       console.log(`🔹 Genererer kapitel ${i} med maksimale tokens: ${this.maxTokensPerRequest}`);

//       const response = await axios.post(
//         environment.openAIConfig.apiUrl,
//         {
//           model: 'gpt-4-turbo',
//           messages: [
//             {
//               role: 'system',
//               content: `
//                 Du skriver letlæselige 100% faktuelle historier på dansk med en LIX-score på ${lix}.
//                 ${lixDescription}
//                 Historien skal være sammenhængende og bygge videre fra kapitel til kapitel og være letlæselig i forhold til lix-scoren.
                
//                 🔹 **Output-krav**:
//                 1. Returnér en gyldig JSON-struktur:
//                    {
//                      "title": "Kapitel X: Titel",
//                      "texts": ["Afsnit 1", "Afsnit 2"],
//                     "imageQuery": "Optimized Google Image Search Query in English"
//                   }
//                 2. **For "imageQuery"**:
//                   - Lav en **kort og præcis søgestreng** på **engelsk**.
//                   - Basér den på **de vigtigste nøgleord fra kapitlets indhold**.
//                   - **Undgå lange sætninger** – brug 1-3 relevante søgeord adskilt af mellemrum.
//                   - Hvis kapitlet beskriver en person, begivenhed eller sted, inkludér det.
//                   - **Eksempler**:
//                     - "Albert Einstein physics theory"
//                     - "Vikings longships battle"
//                     - "Ancient Rome Colosseum gladiators"
//                   - **Undgå** at bruge generiske ord som "image" eller "picture".
//                 3. **Ingen ekstra tekst udenfor JSON-objektet**.
//                 4. Udnyt det maksimale antal tokens **(${this.maxTokensPerRequest})** til at generere så meget tekst som muligt.
//               `
//             },
//             {
//               role: 'user',
//               content: `
//                 Generér **kapitel ${i}** af en faktuel historie om **${topic}**${mainCategory !== 'other' ? ` inden for **${subCategory}** i **${mainCategory}**` : ''}.
//                 Historien skal være sammenhængende og fortsætte fra tidligere kapitler.
            
//                 ${i > 1 ? `🔹 **Resumé af historien indtil nu:**\n\`\`\`json\n${JSON.stringify(storySoFar)}\n\`\`\`` : ''} 
                
//                 - ${roleInstructions}
//                 - **Sørg for at afslutte alle løse tråde i kapitlet eller introducere dem igen i senere kapitler.**
//                 - **Hvis en stor begivenhed nævnes, skal den udfolde sig i de følgende kapitler.**
//                 - **Overhold denne anvisning til næste kapitel: ${nextChapterHint}**
//                 - **Brug maksimale tokens for at generere så meget indhold som muligt.**
//                 - Returnér **kun** valid JSON som beskrevet.
//               `.trim()
//             }
//           ],
//           max_tokens: this.maxTokensPerRequest
//         },
//         {
//           headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' }
//         }
//       );

//       let jsonResponse = response.data.choices[0].message.content.trim();
//       let newChapter: StoryChapter;

//       try {
//         newChapter = JSON.parse(jsonResponse) as StoryChapter;
//       } catch (error) {
//         console.error("Fejl ved parsing af JSON:", error);
//         console.error("Modtaget output:", jsonResponse);
//         throw new Error("Fejl i AI-output, kunne ikke parse JSON.");
//       }

//       if (!newChapter.title || !newChapter.texts || !newChapter.imageQuery) {
//         console.error("Fejl: AI-output mangler felter", newChapter);
//         throw new Error("AI-returneret JSON mangler nødvendige felter.");
//       }

//       let images = await this.imageService.fetchImages(`${newChapter.imageQuery}`, this.imagesPerChapter);
//       newChapter.images = images;

//       storySoFar += `\nKapitel ${i}: ${newChapter.title}\n${newChapter.texts.join(" ")}\n`;

//       // 🔹 Generér hint til næste kapitel
//       nextChapterHint = await this.getNextChapterHint(storySoFar);

//       yield newChapter; // Yield each chapter in the stream

//       await new Promise((resolve) => setTimeout(resolve, 1000));
//     }

//     // 🔹 Generate metadata after all chapters have been created
//     const metadata = await this.generateStoryMetadata(topic, storySoFar, lix);
//     const coverImages = await this.imageService.fetchImages(`${topic} profile picture`, 5);
//     const coverImage = coverImages.find(img => img.startsWith("data:image")) || "";

//     yield {
//       description: metadata.description,
//       image: coverImage
//     };
//   }

//   private getLixDescription(lix: number): string {
//     if (lix <= 5) {
//       return "Brug korte sætninger, enkle ord og mange punktummer.";
//     } else if (lix <= 15) {
//       return "Brug korte sætninger, men introducér enkelte længere ord.";
//     } else if (lix <= 25) {
//       return "Brug mellemlange sætninger og flere faglige ord.";
//     } else if (lix <= 35) {
//       return "Brug længere sætninger, sammensatte ord og komplekse begreber.";
//     } else {
//       return "Brug komplekse sætninger, akademiske begreber og avanceret terminologi.";
//     }
//   }

//   // 🔹 Funktion til at generere næste kapitelhint
//   private async getNextChapterHint(storySoFar: string): Promise<string> {
//     try {
//       const response = await axios.post(
//         environment.openAIConfig.apiUrl,
//         {
//           model: 'gpt-4-turbo',
//           messages: [
//             {
//               role: 'system',
//               content: `
//                 Ud fra den eksisterende historie, lav en kort beskrivelse (maks 2 sætninger) af, hvad næste kapitel bør handle om, for at sikre en sammenhængende fortælling.
//                 Returnér kun en kort beskrivelse.
//               `
//             },
//             {
//               role: 'user',
//               content: `
//                 Historie indtil nu:
//                 ${storySoFar.substring(0, 5000)}

//                 Hvad bør næste kapitel dække?
//               `.trim()
//             }
//           ],
//           max_tokens: 100
//         },
//         {
//           headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' }
//         }
//       );

//       return response.data.choices[0].message.content.trim();
//     } catch (error) {
//       console.error("Fejl ved generering af nextChapterHint:", error);
//       return "";
//     }
//   }

//   async generateStoryMetadata(storyTitle: string, storySoFar: string, lix: number): Promise<{ description: string; }> {
//     if (!storySoFar.trim()) {
//       throw new Error("Historien er tom, kan ikke generere metadata.");
//     }
  
//     let lixDescription = this.getLixDescription(lix);
  
//     const response = await axios.post(
//       environment.openAIConfig.apiUrl,
//       {
//         model: 'gpt-4-turbo',
//         messages: [
//           {
//             role: 'system',
//             content: `
//               Du er en assistent, der skal generere en **meget kort og præcis bogbeskrivelse** på dansk.
//               - Den skal have en **LIX-score på ${lix}**.
//               - ${lixDescription}
//               - **Returnér kun JSON**.
//               - **Formatkrav**:
//                 {
//                   "description": "En kort bogbeskrivelse"
//                 }
//               - **Ingen billeder, ingen ekstra forklaringer.**
//             `
//           },
//           {
//             role: 'user',
//             content: `
//               Generér en **kort bogbeskrivelse** for en bog med titlen **"${storyTitle}"**.
  
//               🔹 **Beskrivelse skal være på maks 20 ord.**
//               🔹 Brug kun **valid JSON**.
//               🔹 **Undgå "book_description" eller "image_description" – returnér kun et JSON-objekt med "description".**
              
//               Historieindhold:
//               ${storySoFar.substring(0, 5000)}
  
//               Husk: Returnér **kun** JSON-objektet uden ekstra forklaringer.
//             `.trim()
//           }
//         ],
//         max_tokens: 150
//       },
//       {
//         headers: { Authorization: `Bearer ${environment.openAIConfig.apiKey}`, 'Content-Type': 'application/json' }
//       }
//     );
  
//     const jsonResponse = response.data.choices[0].message.content.trim();
  
//     // 🔹 Validate JSON format before parsing
//     if (!jsonResponse.startsWith("{") || !jsonResponse.endsWith("}")) {
//       console.error("❌ AI response is not valid JSON:", jsonResponse);
//       throw new Error("Fejl i AI-output: Modtaget data er ikke valid JSON.");
//     }
  
//     try {
//       const metadata = JSON.parse(jsonResponse);
      
//       if (!metadata.description) {
//         throw new Error("❌ AI mangler 'description' feltet i metadata.");
//       }
  
//       return metadata;
//     } catch (error) {
//       console.error("❌ Fejl ved parsing af AI-metadata:", error, "Modtaget output:", jsonResponse);
//       throw new Error("Fejl i AI-output, kunne ikke parse JSON.");
//     }
//   }
  
//   private getRoleInstructions(i: number, chapterCount: number): string {
//     if (i === 1) {
//       return `
//         **Kapitel 1: Begyndelsen af historien**
//         - Introducér emnet på en engagerende måde, og skab en rød tråd.
//         - Giv nødvendig baggrundsinformation for at sætte scenen.
//         - Start tidslinjen, hvis relevant, ved at beskrive den første begivenhed i en naturlig fortællestil.
//         - Lad læseren forstå historiens forløb uden at det bliver en ren opremsning.
//         - Afslut kapitlet med en tydelig overgang til næste begivenhed eller periode.
//       `;
//     } else if (i === chapterCount) {
//       return `
//         **Kapitel ${i}: Afslutningen af historien**
//         - Byg videre på de tidligere kapitler og knyt de vigtigste tråde sammen.
//         - Beskriv de seneste begivenheder på tidslinjen og deres konsekvenser.
//         - Giv en afrunding, der sætter historien i perspektiv.
//         - Sørg for en stærk afslutning, hvor tidslinjen føles fuldendt.
//       `;
//     } else {
//       return `
//         **Kapitel ${i}: Videre i fortællingen**
//         - Tag udgangspunkt i den foregående begivenhed og før tidslinjen videre.
//         - Uddyb med detaljer, eksempler og sammenhænge, så progressionen føles naturlig.
//         - Introducér nye nøglepunkter i fortællingen, som skubber handlingen fremad.
//         - Hvis historien spænder over en længere periode, gør overgangen mellem tidspunkter flydende.
//         - Skab en naturlig overgang til næste kapitel, så læseren fastholdes i fortællingen.
//       `;
//     }
//   }  
// }
