export interface FirestoreQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: number;
  correctAnswerText?: string;
  explanation?: string;
  category: string;
  type: 'multiple_choice' | 'open_ended' | 'matching' | 'essay' | 'lis' | 'multiple_choice_cloze' | 'passage';
  isMultiplayer: boolean;
  context?: string;
  matchingItems?: {
    left: string[];
    right: string[];
  };
}

export interface FirestoreTestSection {
  sectionId: string;
  title: string;
  standaloneQuestions?: FirestoreQuestion[];
  groups?: {
    groupId: string;
    passage: string;
    questions: FirestoreQuestion[];
  }[];
}

export interface FirestoreTest {
  testId: string;
  grade: number;
  sections: FirestoreTestSection[];
}
