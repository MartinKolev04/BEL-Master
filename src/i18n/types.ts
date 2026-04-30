export type Locale = 'bg' | 'en';

export interface TranslationDictionary {
  app: {
    name: string;
    tagline: string;
    loading: string;
    back: string;
    save: string;
    close: string;
    retry: string;
    cancel: string;
    or: string;
    error: string;
    errorBoundaryTitle: string;
    errorBoundaryDefault: string;
    restart: string;
  };
  auth: {
    emailPlaceholder: string;
    passwordPlaceholder: string;
    confirmPasswordPlaceholder: string;
    register: string;
    signIn: string;
    toggleToRegister: string;
    toggleToSignIn: string;
    passwordsMismatch: string;
    loadingButton: string;
    defaultDisplayName: string;
  };
  onboarding: {
    welcome: string;
    chooseGrade: string;
    grade7: string;
    grade7Desc: string;
    grade10: string;
    grade10Desc: string;
    grade12: string;
    grade12Desc: string;
  };
  home: {
    greeting: (firstName: string) => string;
    preparingFor: (grade: string) => string;
    grammarTitle: string;
    grammarDesc: string;
    readingTitle: string;
    readingDesc: string;
    literatureTitle: string;
    literatureDesc: string;
    writingTitle: string;
    writingDesc: string;
    fullTestTitle: string;
    fullTestDesc: string;
    libraryShortcut: string;
    multiplayerShortcut: string;
    levelLabel: string;
  };
  quiz: {
    loading: string;
    loadingError: string;
    loadingErrorDesc: string;
    resultsTitle: string;
    resultsSummary: (score: number, total: number) => string;
    xpEarned: string;
    accuracy: string;
    mistakesReview: string;
    yourAnswer: string;
    correctAnswer: string;
    noAnswer: string;
    nextQuestion: string;
    previousQuestion: string;
    finishQuiz: string;
    showGrid: string;
    questionNumber: (index: number) => string;
    passageHeader: (current: number, total: number) => string;
    passageContinue: string;
    submitAnswer: string;
    yourEssay: string;
  };
  leaderboard: {
    title: string;
    levelLabel: string;
  };
  scanner: {
    title: string;
    description: string;
    noImage: string;
    captureButton: string;
    analyzing: string;
    extractedText: string;
    detectedErrors: (count: number) => string;
    noErrors: string;
    rescan: string;
  };
  profile: {
    title: string;
    statTotalXp: string;
    statGrade: string;
    chooseGrade: string;
    adminPanel: string;
    refreshTests: string;
    refreshTestsSuccess: string;
    refreshTestsError: (msg: string) => string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    passwordChanged: string;
    passwordChangeError: string;
    achievements: string;
    achievementBeginner: string;
    achievementStreak7: string;
    achievementMaster: string;
  };
  multiplayer: {
    title: string;
    createLobby: string;
    joinLobby: string;
    enterCode: string;
    waitingForPlayers: string;
    ready: string;
    notReady: string;
    invalidCode: string;
    gameAlreadyStarted: string;
    questionGenerationError: string;
    timeLeftLabel: string;
    yourTurn: string;
    waitingForOpponent: string;
    youWon: string;
    youLost: string;
    draw: string;
    finalScore: string;
  };
  library: {
    title: string;
    backToList: string;
    aiAnalyzing: string;
    summary: string;
    analysis: string;
    characters: string;
    aboutAuthor: string;
  };
  navigation: {
    home: string;
    library: string;
    scanner: string;
    leaderboard: string;
    profile: string;
  };
}
