import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, LoadingSpinner } from '../../components/ui';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Menu,
  Trophy,
  X,
  XCircle,
} from '../../components/icons';
import type { HomeQuizCategory } from '../../constants/categories';
import { useQuestions } from '../../hooks/useQuestions';
import { useTranslation } from '../../i18n';
import { ROUTES } from '../../navigation/routes';
import { quizResultsRepository } from '../../services/repositories/QuizResultsRepository';
import { userProfileRepository } from '../../services/repositories/UserProfileRepository';
import { useUserProfile } from '../../store/UserProfileContext';
import type { QuizQuestion } from '../../types';
import { cn } from '../../utils/cn';

type QuizCategoryParam = HomeQuizCategory;

const TEXTAREA_CLASSES =
  'w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white';

export function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; subGrade?: string }>();
  const { profile, setProfile } = useUserProfile();
  const { t } = useTranslation();

  const category = (params.category as QuizCategoryParam) ?? 'grammar';
  const subGrade = params.subGrade;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showGrid, setShowGrid] = useState(false);
  const [showPassageOverlay, setShowPassageOverlay] = useState(false);
  const [readingPhase, setReadingPhase] = useState(category === 'reading');
  const [currentPassageIdx, setCurrentPassageIdx] = useState(0);

  const { questions, loading } = useQuestions({
    grade: profile?.grade ?? null,
    category,
    enabled: Boolean(profile),
  });

  useEffect(() => {
    setReadingPhase(category === 'reading');
  }, [category]);

  void subGrade;

  if (!profile) return null;

  const isFullTest = category === 'full_test' || category === 'reading';
  const quizQuestions = questions.filter((q) => q.type !== 'passage');
  const currentQuizQuestion = quizQuestions[currentIndex];
  const passages = questions.filter((q) => q.type === 'passage');
  const isThesisQuestion =
    currentQuizQuestion &&
    (currentQuizQuestion.id.endsWith('q40') ||
      (category === 'full_test' && currentIndex === 39));
  const currentQuestion = currentQuizQuestion;

  const onClose = () => router.replace(ROUTES.HOME as never);

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    const nextQ = quizQuestions[index];
    const savedAnswer = answers[nextQ.id];
    if (nextQ.type === 'open_ended' || nextQ.type === 'essay' || nextQ.type === 'lis') {
      setUserAnswer(savedAnswer || '');
      setSelectedOption(null);
    } else {
      setSelectedOption(savedAnswer !== undefined ? savedAnswer : null);
      setUserAnswer('');
    }
    setIsAnswered(false);
  };

  const nextQuestion = () => {
    if (currentIndex < quizQuestions.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  };

  const handleAnswer = () => {
    if (isThesisQuestion) {
      nextQuestion();
      return;
    }

    const currentAnswer =
      currentQuizQuestion.type === 'open_ended' ||
      currentQuizQuestion.type === 'essay' ||
      currentQuizQuestion.type === 'lis'
        ? userAnswer
        : selectedOption;

    setAnswers((prev) => ({ ...prev, [currentQuizQuestion.id]: currentAnswer }));

    if (isFullTest) {
      if (currentIndex < quizQuestions.length - 1) goToQuestion(currentIndex + 1);
      return;
    }

    if (currentQuizQuestion.type === 'open_ended') {
      if (!userAnswer.trim()) return;
      setIsAnswered(true);
    } else if (currentQuizQuestion.type === 'essay' || currentQuizQuestion.type === 'lis') {
      setIsAnswered(true);
    } else {
      if (selectedOption === null) return;
      setIsAnswered(true);
    }
  };

  const finishQuiz = async () => {
    let finalScore = 0;
    quizQuestions.forEach((q) => {
      const ans = answers[q.id];
      if (q.type === 'open_ended') {
        if (ans?.trim().toLowerCase() === q.correctAnswerText?.toLowerCase()) finalScore++;
      } else if (q.type === 'essay' || q.type === 'lis') {
        finalScore++;
      } else if (ans === q.correctAnswer) {
        finalScore++;
      }
    });

    const xpEarned = finalScore * 20;
    const newXp = profile.xp + xpEarned;
    const newLevel = Math.floor(newXp / 1000) + 1;
    const lastActive = new Date().toISOString();

    try {
      await userProfileRepository.updateProgress(profile.uid, {
        xp: newXp,
        level: newLevel,
        lastActive,
      });
    } catch (error) {
      console.error('Failed to persist quiz progress:', error);
    }

    try {
      await quizResultsRepository.record({
        userId: profile.uid,
        category,
        score: finalScore,
        totalQuestions: quizQuestions.length,
        xpEarned,
        grade: profile.grade,
      });
    } catch (error) {
      console.error('Failed to record quiz result:', error);
    }

    setScore(finalScore);
    setProfile({ ...profile, xp: newXp, level: newLevel, lastActive });
    setFinished(true);
  };

  const renderQuestionHeader = () => {
    const numberPrefix = `${currentIndex + 1}. `;
    const fullText = currentQuizQuestion.question;

    if (fullText.includes(':') && currentQuizQuestion.type !== 'passage') {
      const parts = fullText.split(':');
      const instruction = parts[0].trim();
      const content = parts.slice(1).join(':').trim();

      return (
        <View className="mb-8">
          <Text className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight mb-4">
            {numberPrefix}
            {instruction}
          </Text>
          <View className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
            <Text className="text-xl font-bold leading-relaxed text-gray-800 dark:text-gray-100">
              {content}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <Text className="text-2xl font-bold mb-8 dark:text-white">
        {numberPrefix}
        {fullText}
      </Text>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-8 bg-white dark:bg-bg-dark">
        <LoadingSpinner label={t.quiz.loading} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8 bg-white dark:bg-bg-dark">
        <XCircle size={48} className="text-error mb-4" />
        <Text className="text-xl font-bold mb-2 dark:text-white">{t.quiz.loadingError}</Text>
        <Text className="text-gray-500 dark:text-gray-400 mb-8 text-center">
          {t.quiz.loadingErrorDesc}
        </Text>
        <Button onPress={onClose}>{t.app.back}</Button>
      </View>
    );
  }

  if (finished) {
    return <QuizResults score={score} questions={quizQuestions} answers={answers} onClose={onClose} />;
  }

  if (readingPhase) {
    const currentPassage = passages[currentPassageIdx];
    return (
      <View className="flex-1 bg-white dark:bg-bg-dark">
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          <View className="mb-6 flex-row justify-between items-center">
            <Pressable onPress={onClose} className="flex-row items-center gap-1">
              <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
              <Text className="text-gray-500 dark:text-gray-400 font-bold">{t.app.back}</Text>
            </Pressable>
            <Text className="text-sm font-bold text-gray-400 dark:text-gray-500">
              {t.quiz.passageHeader(currentPassageIdx + 1, passages.length)}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-3xl font-black text-primary border-b-4 border-primary/10 pb-4 mb-6">
              {currentPassage.question}
            </Text>
            <View className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 min-h-[400px]">
              <Text className="text-xl leading-relaxed text-gray-800 dark:text-gray-100 font-medium">
                {currentPassage.context}
              </Text>
            </View>
          </View>

          <View className="mt-8">
            <Button
              className="h-16"
              onPress={() => {
                if (currentPassageIdx < passages.length - 1) {
                  setCurrentPassageIdx((prev) => prev + 1);
                } else {
                  setReadingPhase(false);
                }
              }}
            >
              {currentPassageIdx < passages.length - 1 ? 'Към следващия текст' : 'Започни теста'}
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-bg-dark"
    >
      <View className="flex-1">
        <View className="p-6 pb-2">
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={onClose} className="flex-row items-center gap-1">
              <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
              <Text className="text-gray-500 dark:text-gray-400 font-bold">{t.app.back}</Text>
            </Pressable>
            <Text className="text-sm font-bold text-gray-400 dark:text-gray-500">
              Въпрос {currentIndex + 1} от {quizQuestions.length}
            </Text>
            {isFullTest ? (
              <Pressable onPress={() => setShowGrid(!showGrid)} className="p-1">
                <Menu size={24} className="text-primary" />
              </Pressable>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>

          {!isThesisQuestion && (
            <View className="bg-gray-200 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
              <View
                className="bg-primary h-full"
                style={{ width: `${(currentIndex / quizQuestions.length) * 100}%` }}
              />
            </View>
          )}
        </View>

        {isFullTest && showGrid && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            className="absolute top-20 left-6 right-6 bg-white dark:bg-gray-900 p-4 rounded-2xl border-2 border-primary/20 max-h-[60%]"
            style={{
              zIndex: 70,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-bold text-sm text-gray-500 dark:text-gray-400 uppercase">
                Навигация
              </Text>
              <Pressable onPress={() => setShowGrid(false)}>
                <X size={20} className="text-gray-400" />
              </Pressable>
            </View>
            <ScrollView>
              <View className="flex-row flex-wrap">
                {quizQuestions.map((q, i) => (
                  <View key={i} className="w-1/3 p-1">
                    <Pressable
                      onPress={() => {
                        goToQuestion(i);
                        setShowGrid(false);
                      }}
                      className={cn(
                        'h-10 rounded-xl items-center justify-center',
                        currentIndex === i ? 'border-2 border-primary' : '',
                        answers[q.id] !== undefined
                          ? 'bg-primary'
                          : 'bg-gray-100 dark:bg-gray-800',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-xs font-bold',
                          answers[q.id] !== undefined ? 'text-white' : 'text-gray-400',
                        )}
                      >
                        {i + 1}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          </MotiView>
        )}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {!finished &&
            (category === 'reading' || currentQuizQuestion.category === 'reading') &&
            !readingPhase && (
              <Pressable
                onPress={() => setShowPassageOverlay(true)}
                className="absolute bottom-24 right-6 w-14 h-14 bg-secondary rounded-full items-center justify-center"
                style={{
                  zIndex: 40,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 6,
                }}
              >
                <BookOpen size={28} className="text-white" />
              </Pressable>
            )}

          {isThesisQuestion ? (
            <View>
              <View className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-200 mb-6">
                <View className="flex-row items-center gap-2 mb-2">
                  <BookOpen size={20} className="text-amber-800" />
                  <Text className="font-black text-amber-800">ТЕЗА ЗА УПРАЖНЕНИЕ</Text>
                </View>
                <Text className="text-amber-700 text-sm leading-relaxed">
                  Това е 40-ти въпрос от теста. Това е задача за съставяне на теза, която служи само за упражнение.
                  Не се изисква въвеждане на отговор и задачата не се оценява в рамките на този тест.
                </Text>
              </View>

              <View className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-gray-100 dark:border-gray-700">
                <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-relaxed">
                  {currentQuizQuestion.question}
                </Text>
                {currentQuizQuestion.context ? (
                  <View className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <Text className="italic text-gray-600 dark:text-gray-300 text-sm">
                      {currentQuizQuestion.context}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <>
              {currentQuizQuestion.context &&
                currentQuizQuestion.context.trim() !== '' &&
                currentQuizQuestion.category !== 'reading' && (
                  <View
                    className={cn(
                      'p-5 rounded-2xl border-2 mb-6',
                      currentQuizQuestion.type === 'lis'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700',
                    )}
                  >
                    <Text
                      className={cn(
                        'leading-relaxed',
                        currentQuizQuestion.type === 'lis'
                          ? 'text-blue-900 dark:text-blue-100 font-medium text-lg'
                          : 'text-gray-600 dark:text-gray-400 text-sm italic',
                      )}
                    >
                      {currentQuizQuestion.context}
                    </Text>
                  </View>
                )}

              {renderQuestionHeader()}

              {currentQuizQuestion.type === 'matching' && currentQuizQuestion.matchingItems && (
                <View className="flex-row gap-8 mb-8">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-400 uppercase mb-2">Творби</Text>
                    {currentQuizQuestion.matchingItems.left.map((item, i) => (
                      <View
                        key={i}
                        className="p-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl mb-2"
                      >
                        <Text className="text-sm font-medium dark:text-white">{item}</Text>
                      </View>
                    ))}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-400 uppercase mb-2">Автори</Text>
                    {currentQuizQuestion.matchingItems.right.map((item, i) => (
                      <View
                        key={i}
                        className="p-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl mb-2"
                      >
                        <Text className="text-sm font-medium dark:text-white">{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View>
                {(currentQuizQuestion.type === 'multiple_choice' ||
                  currentQuizQuestion.type === 'multiple_choice_cloze' ||
                  !currentQuizQuestion.type) &&
                  currentQuizQuestion.options.map((option, i) => {
                    const disabled = isAnswered && !isFullTest;
                    const isCorrect = i === currentQuizQuestion.correctAnswer;
                    const wasSelected = selectedOption === i;

                    let containerCls = 'border-gray-100 dark:border-gray-800';
                    let badgeCls = 'bg-gray-100 dark:bg-gray-800';
                    let badgeTextCls = 'text-gray-400';

                    if (isFullTest) {
                      if (wasSelected) {
                        containerCls = 'border-primary bg-primary/5 dark:bg-primary/10';
                        badgeCls = 'bg-primary';
                        badgeTextCls = 'text-white';
                      }
                    } else if (isAnswered) {
                      if (isCorrect) {
                        containerCls = 'border-primary bg-primary/5 dark:bg-primary/10';
                        badgeCls = 'bg-primary';
                        badgeTextCls = 'text-white';
                      } else if (wasSelected) {
                        containerCls = 'border-error bg-error/5 dark:bg-error/10';
                        badgeCls = 'bg-error';
                        badgeTextCls = 'text-white';
                      } else {
                        containerCls = 'border-gray-100 dark:border-gray-800 opacity-50';
                      }
                    } else if (wasSelected) {
                      containerCls = 'border-primary bg-primary/5 dark:bg-primary/10';
                      badgeCls = 'bg-primary';
                      badgeTextCls = 'text-white';
                    }

                    return (
                      <Pressable
                        key={i}
                        disabled={disabled}
                        onPress={() => {
                          setSelectedOption(i);
                          if (isFullTest) {
                            setAnswers((prev) => ({ ...prev, [currentQuizQuestion.id]: i }));
                          }
                        }}
                        className={cn(
                          'p-4 rounded-2xl border-2 flex-row items-center gap-4 mb-3',
                          containerCls,
                        )}
                      >
                        <View
                          className={cn('w-8 h-8 rounded-xl items-center justify-center', badgeCls)}
                        >
                          <Text className={cn('font-bold', badgeTextCls)}>
                            {String.fromCharCode(65 + i)}
                          </Text>
                        </View>
                        <Text className="font-medium dark:text-white flex-1">{option}</Text>
                      </Pressable>
                    );
                  })}

                {currentQuizQuestion.type === 'open_ended' && (
                  <View>
                    <TextInput
                      value={userAnswer}
                      onChangeText={(value) => {
                        setUserAnswer(value);
                        if (isFullTest) {
                          setAnswers((prev) => ({ ...prev, [currentQuizQuestion.id]: value }));
                        }
                      }}
                      editable={!(isAnswered && !isFullTest)}
                      placeholder="Напишете вашия отговор тук..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                      className={TEXTAREA_CLASSES}
                      style={{ minHeight: 128 }}
                    />
                    {isAnswered && !isFullTest && (
                      <View className="mt-4 p-4 bg-primary/5 rounded-2xl border-2 border-primary/20">
                        <Text className="text-xs font-bold text-primary uppercase mb-1">
                          {t.quiz.correctAnswer}
                        </Text>
                        <Text className="font-medium dark:text-white">
                          {currentQuizQuestion.correctAnswerText}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {(currentQuizQuestion.type === 'essay' || currentQuizQuestion.type === 'lis') && (
                  <View>
                    <View className="p-6 bg-secondary/5 dark:bg-secondary/10 rounded-2xl border-2 border-secondary/20 dark:border-secondary/30 mb-4">
                      <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Това е писмена задача. Подгответе своя план или текст.
                        В реалния изпит ще разполагате с лист за отговори.
                      </Text>
                    </View>
                    <TextInput
                      value={userAnswer}
                      onChangeText={(value) => {
                        setUserAnswer(value);
                        if (isFullTest) {
                          setAnswers((prev) => ({ ...prev, [currentIndex]: value }));
                        }
                      }}
                      editable={!(isAnswered && !isFullTest)}
                      placeholder="Можете да нахвърляте идеите си тук..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                      className={TEXTAREA_CLASSES}
                      style={{ minHeight: 256 }}
                    />
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {isFullTest ? (
          <View className="p-6 bg-white dark:bg-gray-900 border-t-2 border-gray-100 dark:border-gray-800 flex-row gap-3">
            <View className="flex-1">
              <Button variant="outline" disabled={currentIndex === 0} onPress={prevQuestion}>
                {t.app.back}
              </Button>
            </View>
            {currentIndex === questions.length - 1 || (isFullTest && isThesisQuestion) ? (
              <View className="flex-1">
                <Button onPress={finishQuiz}>{isThesisQuestion ? 'Завърши' : 'Предай'}</Button>
              </View>
            ) : (
              <View className="flex-1">
                <Button onPress={nextQuestion}>Напред</Button>
              </View>
            )}
          </View>
        ) : (
          <>
            {!isThesisQuestion && isAnswered && currentQuestion && (
              <MotiView
                from={{ translateY: 100 }}
                animate={{ translateY: 0 }}
                className={cn(
                  'p-6 rounded-t-3xl border-t-4',
                  currentQuestion.type === 'essay' || currentQuestion.type === 'lis'
                    ? 'bg-blue-50 border-blue-500'
                    : currentQuestion.type === 'open_ended'
                    ? userAnswer.trim().toLowerCase() ===
                      currentQuestion.correctAnswerText?.toLowerCase()
                      ? 'bg-green-50 border-primary'
                      : 'bg-red-50 border-error'
                    : selectedOption === currentQuestion.correctAnswer
                    ? 'bg-green-50 border-primary'
                    : 'bg-red-50 border-error',
                )}
              >
                <View className="flex-row items-center gap-3 mb-2">
                  {currentQuestion.type === 'essay' || currentQuestion.type === 'lis' ? (
                    <>
                      <CheckCircle2 className="text-blue-500" />
                      <Text className="font-black text-blue-500 text-xl">Готово!</Text>
                    </>
                  ) : currentQuestion.type === 'open_ended' ? (
                    userAnswer.trim().toLowerCase() ===
                    currentQuestion.correctAnswerText?.toLowerCase() ? (
                      <>
                        <CheckCircle2 className="text-primary" />
                        <Text className="font-black text-primary text-xl">Страхотно!</Text>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-error" />
                        <Text className="font-black text-error text-xl">Грешка...</Text>
                      </>
                    )
                  ) : selectedOption === currentQuestion.correctAnswer ? (
                    <>
                      <CheckCircle2 className="text-primary" />
                      <Text className="font-black text-primary text-xl">Страхотно!</Text>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-error" />
                      <Text className="font-black text-error text-xl">Грешка...</Text>
                    </>
                  )}
                </View>
                <Text
                  className={cn(
                    'text-sm mb-6',
                    currentQuestion.type === 'essay' || currentQuestion.type === 'lis'
                      ? 'text-blue-700'
                      : currentQuestion.type === 'open_ended'
                      ? userAnswer.trim().toLowerCase() ===
                        currentQuestion.correctAnswerText?.toLowerCase()
                        ? 'text-green-700'
                        : 'text-red-700'
                      : selectedOption === currentQuestion.correctAnswer
                      ? 'text-green-700'
                      : 'text-red-700',
                  )}
                >
                  {currentQuestion.explanation ||
                    (currentQuestion.type === 'open_ended'
                      ? `Правилният отговор е: ${currentQuestion.correctAnswerText}`
                      : '')}
                </Text>
                <Button
                  variant={
                    currentQuestion.type === 'essay' || currentQuestion.type === 'lis'
                      ? 'primary'
                      : currentQuestion.type === 'open_ended'
                      ? userAnswer.trim().toLowerCase() ===
                        currentQuestion.correctAnswerText?.toLowerCase()
                        ? 'primary'
                        : 'error'
                      : selectedOption === currentQuestion.correctAnswer
                      ? 'primary'
                      : 'error'
                  }
                  onPress={nextQuestion}
                >
                  {currentIndex === questions.length - 1 ? 'Завърши' : 'Напред'}
                </Button>
              </MotiView>
            )}

            {!isThesisQuestion && !isAnswered && currentQuestion && (
              <View className="p-6">
                <Button
                  disabled={
                    currentQuestion.type === 'passage'
                      ? false
                      : currentQuestion.type === 'open_ended' ||
                        currentQuestion.type === 'essay' ||
                        currentQuestion.type === 'lis'
                      ? !userAnswer.trim()
                      : selectedOption === null
                  }
                  onPress={currentQuestion.type === 'passage' ? nextQuestion : handleAnswer}
                >
                  {currentQuestion.type === 'passage' ? 'Напред' : 'Провери'}
                </Button>
              </View>
            )}

            {isThesisQuestion && (
              <View className="p-6">
                <Button onPress={nextQuestion}>
                  {currentIndex === questions.length - 1 ? 'Завърши' : 'Напред'}
                </Button>
              </View>
            )}
          </>
        )}
      </View>

      <Modal
        visible={showPassageOverlay}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPassageOverlay(false)}
      >
        <View className="flex-1 bg-black/60 p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-black text-xl">Текстове за четене</Text>
            <Pressable
              onPress={() => setShowPassageOverlay(false)}
              className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
            >
              <X size={24} className="text-white" />
            </Pressable>
          </View>
          <ScrollView className="flex-1">
            {passages.map((p, i) => (
              <View key={i} className="bg-white p-6 rounded-3xl mb-6">
                <Text className="font-black text-primary mb-4 border-b border-gray-100 pb-2">
                  {p.question}
                </Text>
                <Text className="text-gray-700 leading-relaxed">{p.context}</Text>
              </View>
            ))}
          </ScrollView>
          <View className="mt-6">
            <Button onPress={() => setShowPassageOverlay(false)}>{t.app.close}</Button>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

interface QuizResultsProps {
  score: number;
  questions: QuizQuestion[];
  answers: Record<string, any>;
  onClose: () => void;
}

function QuizResults({ score, questions, answers, onClose }: QuizResultsProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-bg-dark"
      contentContainerStyle={{ padding: 24 }}
    >
      <MotiView
        from={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="items-center mb-8"
      >
        <View
          className="w-20 h-20 bg-accent rounded-full items-center justify-center mb-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Trophy size={40} className="text-white" />
        </View>
        <Text className="text-2xl font-black mb-1 dark:text-white">{t.quiz.resultsTitle}</Text>
        <Text className="text-gray-500 dark:text-gray-400">
          {t.quiz.resultsSummary(score, questions.length)}
        </Text>

        <View className="flex-row gap-4 w-full mt-6">
          <View className="flex-1 bg-primary/10 p-4 rounded-2xl">
            <Text className="text-xs text-primary font-bold uppercase">{t.quiz.xpEarned}</Text>
            <Text className="text-xl font-black text-primary">+{score * 20}</Text>
          </View>
          <View className="flex-1 bg-secondary/10 p-4 rounded-2xl">
            <Text className="text-xs text-secondary font-bold uppercase">{t.quiz.accuracy}</Text>
            <Text className="text-xl font-black text-secondary">
              {Math.round((score / questions.length) * 100)}%
            </Text>
          </View>
        </View>
      </MotiView>

      <View className="mb-8">
        <Text className="font-bold text-lg mb-4 dark:text-white">{t.quiz.mistakesReview}</Text>
        {questions.map((q, i) => {
          const userAns = answers[q.id];
          let isCorrect = false;
          if (q.type === 'open_ended') {
            isCorrect = userAns?.trim().toLowerCase() === q.correctAnswerText?.toLowerCase();
          } else if (q.type === 'essay' || q.type === 'lis') {
            isCorrect = true;
          } else {
            isCorrect = userAns === q.correctAnswer;
          }

          if (isCorrect) return null;

          return (
            <View
              key={i}
              className="p-4 rounded-2xl border-2 border-red-100 bg-red-50/30 dark:bg-red-900/10 dark:border-red-900/30 mb-3"
            >
              <Text className="text-sm font-bold mb-2 dark:text-white">
                {t.quiz.questionNumber(i + 1)}: {q.question}
              </Text>
              <View>
                <Text className="text-xs dark:text-gray-300">
                  <Text className="font-bold">{t.quiz.yourAnswer}</Text>{' '}
                  {q.type === 'multiple_choice'
                    ? q.options[userAns] || t.quiz.noAnswer
                    : userAns || t.quiz.noAnswer}
                </Text>
                <Text className="text-xs text-primary font-bold mt-1">
                  <Text className="text-gray-500 dark:text-gray-400 font-normal">
                    {t.quiz.correctAnswer}
                  </Text>{' '}
                  {q.type === 'multiple_choice' ? q.options[q.correctAnswer] : q.correctAnswerText}
                </Text>
                {q.explanation ? (
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
                    {q.explanation}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Button onPress={onClose}>{t.app.close}</Button>
    </ScrollView>
  );
}
