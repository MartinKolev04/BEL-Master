import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  type QuerySnapshot,
} from 'firebase/firestore';
import { FirestoreService } from '../firebase/FirestoreService';
import { OperationType } from '../../errors';
import type { QuizQuestion } from '../../types';
import type {
  FirestoreQuestion,
  FirestoreTest,
} from './firestoreShapes';
import { initialTestSeed } from '../../data/initialTestSeed';

const PASSAGE_SPLIT = /\n\n(?=ТЕКСТ [12])/;
const TARGET_QUESTION_COUNT = 15;

export class QuestionsRepository extends FirestoreService {
  private readonly collectionPath = 'tests';

  constructor() {
    super();
  }

  public async list(
    grade: string,
    category: string,
    isMultiplayer: boolean = false,
  ): Promise<QuizQuestion[]> {
    return this.run(OperationType.LIST, this.collectionPath, async () => {
      const gradeNum = parseInt(grade, 10);
      console.log(
        `getQuestions called for grade: ${grade} (num: ${gradeNum}), category: ${category}, isMultiplayer: ${isMultiplayer}`,
      );

      const testsRef = collection(this.db, this.collectionPath);
      const snapshot = await getDocs(query(testsRef, where('grade', '==', gradeNum)));
      console.log(`Firestore query returned ${snapshot.size} tests for grade ${gradeNum}`);

      const allQuestions = this.collectAllQuestions(snapshot);
      console.log(`Total questions collected from DB: ${allQuestions.length}`);

      if (category === 'full_test') {
        const fullTest = this.buildFullTest(snapshot);
        if (fullTest.length > 0) {
          console.log(`Full test generated with ${fullTest.length} questions from DB`);
          return fullTest.map(this.toQuizQuestion);
        }
      }

      if (category === 'reading') {
        const reading = this.buildRandomReading(snapshot);
        if (reading) {
          console.log(`Reading comprehension generated with ${reading.length} items`);
          return reading.map(this.toQuizQuestion);
        }
      }

      let filtered = this.filterByCategory(allQuestions, category);
      filtered = this.filterByType(filtered, isMultiplayer);
      filtered = this.applyMultiplayerFlagFilter(filtered, allQuestions, isMultiplayer);

      if (allQuestions.length === 0 || filtered.length === 0) {
        return [];
      }

      const selected = this.pickQuestions(filtered, category);
      return selected.map(this.toQuizQuestion);
    }).catch((error) => {
      console.error('CRITICAL ERROR in QuestionsRepository.list:', error);
      return [];
    });
  }

  public async seedInitialData(): Promise<void> {
    return this.run(OperationType.WRITE, this.collectionPath, async () => {
      console.log('seedInitialTestData: Starting seeding process...');
      for (const testData of initialTestSeed) {
        console.log(`Seeding test: ${testData.testId} for grade ${testData.grade}...`);
        await setDoc(doc(this.db, this.collectionPath, testData.testId), testData);
      }
      console.log('Initial test data seeded successfully');
    });
  }

  private collectAllQuestions(snapshot: QuerySnapshot): FirestoreQuestion[] {
    const all: FirestoreQuestion[] = [];
    snapshot.forEach((document) => {
      const testData = document.data() as FirestoreTest;
      console.log(
        `Processing test: ${testData.testId} (Grade: ${testData.grade}) with ${testData.sections.length} sections`,
      );
      testData.sections.forEach((section) => {
        if (section.standaloneQuestions) {
          console.log(
            `Section ${section.sectionId} has ${section.standaloneQuestions.length} standalone questions`,
          );
          all.push(...section.standaloneQuestions);
        }
        if (section.groups) {
          section.groups.forEach((group) => {
            console.log(
              `Group ${group.groupId} in section ${section.sectionId} has ${group.questions.length} questions`,
            );
            const passages = group.passage.split(PASSAGE_SPLIT);
            passages.forEach((p, pIdx) => {
              all.push({
                id: `${group.groupId}_p${pIdx}`,
                question: p.startsWith('ТЕКСТ') ? p.split('\n')[0] : `Текст ${pIdx + 1}`,
                context: p,
                type: 'passage',
                category: 'reading',
                isMultiplayer: false,
              });
            });
            const grouped = group.questions.map((q) => ({
              ...q,
              context: q.context || group.passage,
            }));
            all.push(...grouped);
          });
        }
      });
    });
    return all;
  }

  private buildFullTest(snapshot: QuerySnapshot): FirestoreQuestion[] {
    if (snapshot.empty) return [];
    const fullTest: FirestoreQuestion[] = [];
    const testData = snapshot.docs[0].data() as FirestoreTest;
    testData.sections.forEach((section) => {
      if (section.standaloneQuestions) {
        fullTest.push(...section.standaloneQuestions);
      }
      if (section.groups) {
        section.groups.forEach((group) => {
          const passages = group.passage.split(PASSAGE_SPLIT);
          passages.forEach((p, pIdx) => {
            fullTest.push({
              id: `${group.groupId}_p${pIdx}`,
              question: p.startsWith('ТЕКСТ') ? p.split('\n')[0] : `Текст ${pIdx + 1}`,
              context: p,
              type: 'passage',
              category: 'reading',
              isMultiplayer: false,
            });
          });
          fullTest.push(...group.questions);
        });
      }
    });
    return fullTest;
  }

  private buildRandomReading(snapshot: QuerySnapshot): FirestoreQuestion[] | null {
    const groups: { passage: string; questions: FirestoreQuestion[]; testId: string }[] = [];
    snapshot.forEach((document) => {
      const testData = document.data() as FirestoreTest;
      testData.sections.forEach((section) => {
        if (section.groups) {
          section.groups.forEach((group) => {
            if (group.questions.some((q) => q.category === 'reading')) {
              groups.push({
                passage: group.passage,
                questions: group.questions,
                testId: testData.testId,
              });
            }
          });
        }
      });
    });

    if (groups.length === 0) return null;

    const random = groups[Math.floor(Math.random() * groups.length)];
    const out: FirestoreQuestion[] = [];
    const passages = random.passage.split(PASSAGE_SPLIT);
    passages.forEach((p, pIdx) => {
      out.push({
        id: `reading_p${pIdx}_${random.testId}`,
        question: p.startsWith('ТЕКСТ') ? p.split('\n')[0] : `Текст ${pIdx + 1}`,
        context: p,
        type: 'passage',
        category: 'reading',
        isMultiplayer: false,
      });
    });
    out.push(...random.questions);
    return out;
  }

  private filterByCategory(
    questions: FirestoreQuestion[],
    category: string,
  ): FirestoreQuestion[] {
    if (category === 'all' || category === 'full_test') return questions;

    let result = questions;
    if (category !== 'writing') {
      result = result.filter((q) => q.type !== 'essay' && !q.id.endsWith('q40'));
    }

    if (category === 'grammar' || category === 'spelling') {
      return result.filter(
        (q) =>
          q.category === 'grammar' ||
          q.category === 'spelling' ||
          q.category === 'punctuation' ||
          q.category === 'vocabulary',
      );
    }
    if (category === 'reading') {
      return result.filter((q) => q.category === 'reading');
    }
    if (category === 'writing') {
      return result.filter((q) => q.category === 'writing');
    }
    return result.filter((q) => q.category === category);
  }

  private filterByType(
    questions: FirestoreQuestion[],
    isMultiplayer: boolean,
  ): FirestoreQuestion[] {
    if (!isMultiplayer) {
      return questions.filter(
        (q) =>
          q.type === 'multiple_choice' ||
          q.type === 'multiple_choice_cloze' ||
          q.type === 'matching' ||
          q.type === 'open_ended' ||
          q.type === 'essay' ||
          q.type === 'lis' ||
          q.type === 'passage' ||
          (q.options && q.options.length > 0),
      );
    }
    return questions.filter(
      (q) =>
        (q.type === 'multiple_choice' || q.type === 'multiple_choice_cloze') &&
        q.options &&
        q.options.length > 0,
    );
  }

  private applyMultiplayerFlagFilter(
    filtered: FirestoreQuestion[],
    all: FirestoreQuestion[],
    isMultiplayer: boolean,
  ): FirestoreQuestion[] {
    if (!isMultiplayer) return filtered;

    let result = filtered.filter((q) => q.isMultiplayer);
    if (result.length === 0 && all.length > 0) {
      console.log('[QuestionsRepository] Falling back to regular MC questions for multiplayer.');
      result = all.filter(
        (q) =>
          (q.type === 'multiple_choice' || q.type === 'multiple_choice_cloze') &&
          q.options &&
          q.options.length > 0,
      );
    }
    return result;
  }

  private pickQuestions(
    filtered: FirestoreQuestion[],
    category: string,
  ): FirestoreQuestion[] {
    if (category === 'grammar' || category === 'spelling') {
      const lis = filtered.filter((q) => q.type === 'lis').sort(() => 0.5 - Math.random());
      const others = filtered.filter((q) => q.type !== 'lis').sort(() => 0.5 - Math.random());
      const out: FirestoreQuestion[] = [];
      if (lis.length > 0) out.push(lis[0]);
      out.push(...others.slice(0, TARGET_QUESTION_COUNT - out.length));
      return out.sort(() => 0.5 - Math.random());
    }
    return filtered.sort(() => 0.5 - Math.random()).slice(0, TARGET_QUESTION_COUNT);
  }

  private toQuizQuestion = (q: FirestoreQuestion): QuizQuestion => {
    const res: QuizQuestion = {
      id: q.id,
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer ?? -1,
      explanation: q.explanation || '',
      category: q.category as QuizQuestion['category'],
      type: q.type as QuizQuestion['type'],
    };
    if (q.correctAnswerText !== undefined) res.correctAnswerText = q.correctAnswerText;
    if (q.context !== undefined) res.context = q.context;
    if (q.matchingItems !== undefined) res.matchingItems = q.matchingItems;
    return res;
  };
}

export const questionsRepository = new QuestionsRepository();
