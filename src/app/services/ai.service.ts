import axios from 'axios';
import { StoryChapter } from '../models/story-chapter';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ImageService } from './image.service';
import { LixService } from './lix.service';
import { Story } from '../models/story';

@Injectable({
    providedIn: 'root',
})
export class AIService {

    constructor(private imageService: ImageService, private lixService: LixService) { }

    estimateTokens(wordsPerChapter: number, lixLevel: number): number {
        const promptTokens = 503;
        const maxAllowedTokens = 4096;
        const jsonStructureTokens = 150;

        const baseTokenAllocation = 1000;  // Increased base to ensure enough tokens for low LIX levels.

        const estimatedTokens = Math.ceil(wordsPerChapter * 4);
        const availableTokensForCompletion = maxAllowedTokens - promptTokens - jsonStructureTokens;

        if (estimatedTokens > availableTokensForCompletion) {
            console.warn(`Forventede tokens (${estimatedTokens}) overstiger de tilgængelige tokens (${availableTokensForCompletion}).`);
        }

        return Math.min(estimatedTokens + baseTokenAllocation, availableTokensForCompletion);
    }

    async *generateStoryStream(
        topic: string,
        lix: number,
        numberOfChapters: number,
        imagesPerChapter: number,
        wordsPerChapter: number
    ): AsyncGenerator<StoryChapter | Story, void, unknown> {

        const maxTokens = this.estimateTokens(wordsPerChapter, lix);

        let conversationHistory: any[] = [];
        let previousChapterSummary = "";

        const selectedLix = this.lixService.getLixModelByLevel(lix);
        const lixLevelAIInstruction = selectedLix?.aiInstruction || "Skriv en enkel historie.";

        const systemPrompt = `
            Du er en historiegenerator, som skal generere en sammenhængende historie opdelt i ${numberOfChapters} kapitler på dansk.
            Historien skal følge en logisk tidslinje, begynde med en introduktion og slutte med en konklusion.
            Der skal fortælles mere detaljeret hvis der er skelsættende begivenheder eller perioder som er vigtigt for emnet.
            Historien skal være indlevende og spændende, passende til lidt under LIX-niveau ${lix}.
            **${lixLevelAIInstruction}**
            **LIX-niveauet skal være under ${lix}.**
            Returnér outputtet som en fuldstændig JSON-struktur.
            Sørg for, at kapitlerne hænger sammen og dækker hele emnet.
        `;

        conversationHistory.push({ role: "system", content: systemPrompt });

        for (let chapterIndex = 1; chapterIndex <= numberOfChapters; chapterIndex++) {
            const userPrompt = `
              Generér kapitel ${chapterIndex}/${numberOfChapters} baseret på følgende input:
  
              Emne: ${topic}
              Resume af tidligere kapitler: ${previousChapterSummary}
  
              **Udnyt maks. tokens: ${maxTokens}.**
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
                    max_tokens: 4096
                }, {
                    headers: {
                        'Authorization': `Bearer ${environment.openAIConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                const chapterContent = response.data.choices[0].message.content;

                let parsedChapter: StoryChapter;
                try {
                    parsedChapter = JSON.parse(chapterContent);
                } catch (parseError) {
                    console.error("Fejl ved parsing af AI-svar, forsøger at få længere tekst...");
                    continue;
                }

                let images = await this.imageService.fetchImages(`${parsedChapter.imageQuery}`, imagesPerChapter);
                parsedChapter.images = images;

                previousChapterSummary = `${parsedChapter.title}: ${parsedChapter.texts.slice(0, 2).join(" ")}`;

                conversationHistory.push({ role: "assistant", content: chapterContent });

                yield parsedChapter;

            } catch (error) {
                console.error(`Fejl ved generering af kapitel ${chapterIndex}:`, error);
                break;
            }
        }

        const title = await this.generateStoryTitle(conversationHistory);
        const coverImages = await this.imageService.fetchImages(`${topic} profile picture`, 5);
        const coverImage = coverImages.find(img => img.startsWith("data:image")) || "";

        var story: Story = {
            id: '',
            title: title,
            aiPrompt: topic,
            description: '',
            chapters: [],
            updatedAt: new Date(),
            image: coverImage,
            sharedWith: []
        }

        yield story;
    }

    private async generateStoryTitle(conversationHistory: any[]): Promise<string> {
        const prompt = `
            Du skal lave en kort title af en længere historie baseret på følgende samtalehistorik:

            ${conversationHistory
                .filter(msg => msg.role === "assistant")
                .map((msg, index) => `Kapitel ${index + 1}: ${msg.content}`)
                .join("\n")}

            Opsummer hele historien i én titel på max 10 ord, som kan vises på forsiden af en bog.
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
            return summary;

        } catch (error) {
            console.error('Fejl ved generering af opsummering:', error);
            return "Fejl i generering af opsummering.";
        }
    }

    async testLixLevels() {
        console.log('Starter test med opdateret wordCountMap validering');

        // Automatically retrieve LIX levels from wordCountMap keys
        const lixLevels = Object.keys(this.lixService.lixLevels).map(level => parseInt(level)).sort((a, b) => a - b);
        const results: any[] = [];

        for (const lix of lixLevels) {
            console.log(`Testing LIX Level: ${lix}`);

            // Retrieve expected word count from wordCountMap
            const expectedWordCount = this.lixService.getLixModelByLevel(lix)?.wordsPerChapter || 150;
            const lowerBound = Math.floor(expectedWordCount * 0.8);
            const upperBound = Math.ceil(expectedWordCount * 1.2);

            const result = this.generateStoryStream(
                "Messi",
                lix,
                1,           // One chapter for testing
                1,           // One image per chapter (you can adjust if needed)
                expectedWordCount
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

            // Check if the word count is within the acceptable range
            const withinDeviation = words >= lowerBound && words <= upperBound;

            console.log(`LIX Level: ${lix}, Calculated LIX: ${calculatedLix}, Word Count: ${words}, Expected Words: ${expectedWordCount}, Acceptable Deviation: ${withinDeviation}`);

            results.push({
                lix,
                calculatedLix,
                words,
                expectedWords: expectedWordCount,
                acceptableDeviation: withinDeviation ? "Yes" : "No",
                wordCountRange: `[${lowerBound} - ${upperBound}]`,
                storyText: storyText.slice(0, 200) + (storyText.length > 200 ? "..." : "")
            });
        }

        // Display the results as a table
        console.table(results);
    }

}
