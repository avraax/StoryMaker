import { Injectable } from '@angular/core';
import { LixModel } from '../models/lix.model';

@Injectable({
  providedIn: 'root',
})
export class LixService {

  public lixLevels: LixModel[] = [
    {
      level: 5,
      wordsPerChapter: 100,
      approximateGrade: "0",
      description: "LIX 2-5 (0. klasse)",
      aiInstruction: "Skriv en meget enkel historie med meget korte sætninger og grundlæggende ord. Undgå komplekse ord eller lange sætninger.",
      chapters: 2,
      imagesPerChapter: 2
    },
    {
      level: 10,
      wordsPerChapter: 150,
      approximateGrade: "1",
      description: "LIX 5-10 (1. klasse)",
      aiInstruction: "Skriv en enkel historie med korte sætninger og enkelt sprog. Undgå svære ord og fokuser på klarhed.",
      chapters: 3,
      imagesPerChapter: 4
    },
    {
      level: 15,
      wordsPerChapter: 200,
      approximateGrade: "2",
      description: "LIX 10-15 (2. klasse)",
      aiInstruction: "Skriv en let forståelig historie med korte sætninger og enkelte komplekse ord.",
      chapters: 3,
      imagesPerChapter: 6
    },
    {
      level: 20,
      wordsPerChapter: 300,
      approximateGrade: "3",
      description: "LIX 15-20 (3. klasse)",
      aiInstruction: "Skriv en historie med klare og korte sætninger. Brug enkelte længere sætninger og få komplekse ord.",
      chapters: 4,
      imagesPerChapter: 8
    },
    {
      level: 25,
      wordsPerChapter: 400,
      approximateGrade: "4",
      description: "LIX 20-25 (4. klasse)",
      aiInstruction: "Skriv en historie med varieret sætningslængde og nogle komplekse ord.",
      chapters: 5,
      imagesPerChapter: 10
    },
    {
      level: 30,
      wordsPerChapter: 500,
      approximateGrade: "5",
      description: "LIX 25-30 (5. klasse)",
      aiInstruction: "Skriv en moderat kompleks historie med varieret sprog og strukturer.",
      chapters: 6,
      imagesPerChapter: 12
    },
    {
      level: 35,
      wordsPerChapter: 700,
      approximateGrade: "6",
      description: "LIX 30-35 (6. klasse)",
      aiInstruction: "Skriv en detaljeret historie med længere sætninger og rigere ordforråd.",
      chapters: 7,
      imagesPerChapter: 14
    },
    {
      level: 40,
      wordsPerChapter: 800,
      approximateGrade: "7",
      description: "LIX 35-40 (7. klasse)",
      aiInstruction: "Skriv en kompleks historie med varieret sætningsstruktur, detaljerede beskrivelser og beriget ordforråd.",
      chapters: 8,
      imagesPerChapter: 16
    },
    {
      level: 45,
      wordsPerChapter: 1000,
      approximateGrade: "8.-9",
      description: "LIX 40-45 (8.-9. klasse)",
      aiInstruction: "Skriv en avanceret historie med komplekse sætninger, nuanceret ordforråd og detaljerede beskrivelser.",
      chapters: 10,
      imagesPerChapter: 18
    },
    {
      level: 50,
      wordsPerChapter: 1200,
      approximateGrade: "Gymnasium/Voksen",
      description: "LIX 45+ (Gymnasium/voksen)",
      aiInstruction: "Skriv en sofistikeret og meget detaljeret historie med komplekse strukturer og avanceret ordforråd.",
      chapters: 12,
      imagesPerChapter: 20
    }
  ];

  constructor() { }

  getLixModelByLevel(level: number): LixModel | undefined {
    const lixModel = this.lixLevels.find(lix => lix.level === level);
    return lixModel;
  }
}
