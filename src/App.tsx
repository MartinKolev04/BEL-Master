import React, { useState, useEffect } from 'react';
import { 
  Home as HomeIcon, 
  BookOpen, 
  Trophy, 
  Camera, 
  User as UserIcon,
  Zap,
  Flame,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Settings,
  LogOut,
  Star,
  Award,
  Users,
  Clock,
  Search,
  PenTool,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { UserProfile, QuizQuestion, Grade, QuizResult, LeaderboardEntry } from './types';
import { checkSpellingWithGemini, getLibraryDetails } from './lib/gemini';
import { getQuestions, seedInitialTestData } from './lib/questions';
import { cn } from './lib/utils';

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'accent' | 'error' | 'outline' }) => {
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white',
    secondary: 'bg-secondary hover:bg-secondary/90 text-white',
    accent: 'bg-accent hover:bg-accent/90 text-white',
    error: 'bg-error hover:bg-error/90 text-white',
    outline: 'bg-transparent border-2 border-gray-200 dark:border-gray-700 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
  };

  return (
    <button 
      className={cn(
        'duo-button w-full disabled:opacity-50 disabled:cursor-not-allowed', 
        variants[variant], 
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, onClick, active }: { children: React.ReactNode, className?: string, onClick?: () => void, active?: boolean }) => (
  <div 
    onClick={onClick}
    className={cn(
      'duo-card cursor-pointer dark:bg-gray-900 dark:border-gray-800',
      active && 'duo-card-active',
      className
    )}
  >
    {children}
  </div>
);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Main App ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-screen">
          <h2 className="text-2xl font-bold text-error mb-4">Упс! Нещо се обърка.</h2>
          <p className="text-gray-500 mb-8">{this.state.error?.message || "Възникна неочаквана грешка."}</p>
          <Button onClick={() => window.location.reload()}>Рестартирай приложението</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'quiz' | 'leaderboard' | 'ocr' | 'profile' | 'library' | 'auth' | 'onboarding' | 'multiplayer'>('auth');
  const [quizCategory, setQuizCategory] = useState<'grammar' | 'literature' | 'spelling' | 'reading' | 'writing' | 'full_test' | null>(null);
  const [subGrade, setSubGrade] = useState<string | undefined>(undefined);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };
    mediaQuery.addEventListener('change', handleChange);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Seed data if the user is the admin
        if (firebaseUser.email === 'marthard2004@gmail.com') {
          console.log('Admin detected, calling seedInitialTestData...');
          seedInitialTestData();
        }
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setUser(userData);
            if (!userData.grade) {
              setView('onboarding');
            } else {
              setView('home');
            }
          } else {
            // New user setup (handled in registration, but fallback here)
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Потребител',
              email: firebaseUser.email || '',
              xp: 0,
              level: 1,
              grade: null,
              streak: 0,
              lastActive: new Date().toISOString(),
              achievements: []
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
            setView('onboarding');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setView('auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-bounce text-primary font-bold text-2xl">БЕЛ Мастер...</div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-white dark:bg-bg-dark">
      <AnimatePresence mode="wait">
        {view === 'auth' && <AuthView />}
        {view === 'onboarding' && user && (
          <OnboardingView 
            user={user} 
            onComplete={(updated) => {
              setUser(updated);
              setView('home');
            }} 
          />
        )}
        {view === 'home' && user && (
          <HomeView 
            user={user} 
            onStartQuiz={(cat, sub) => {
              setQuizCategory(cat);
              setSubGrade(sub);
              setView('quiz');
            }} 
            onOpenLibrary={() => setView('library')}
            onOpenMultiplayer={() => setView('multiplayer')}
          />
        )}
        {view === 'quiz' && user && quizCategory && (
          <QuizView 
            user={user} 
            category={quizCategory} 
            subGrade={subGrade}
            onClose={() => setView('home')} 
            onUpdateUser={(updated) => setUser(updated)}
          />
        )}
        {view === 'multiplayer' && user && (
          <MultiplayerView 
            user={user} 
            onClose={() => setView('home')} 
          />
        )}
        {view === 'leaderboard' && <LeaderboardView onClose={() => setView('home')} />}
        {view === 'ocr' && <OCRView onClose={() => setView('home')} />}
        {view === 'profile' && user && <ProfileView user={user} onLogout={handleLogout} onClose={() => setView('home')} onUpdateUser={(updated) => setUser(updated)} />}
        {view === 'library' && user && <LibraryView user={user} onClose={() => setView('home')} />}
      </AnimatePresence>

      {view !== 'auth' && view !== 'onboarding' && view !== 'quiz' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 px-6 py-3 flex justify-between items-center z-50 max-w-[480px] mx-auto">
          <NavButton active={view === 'home'} icon={<HomeIcon />} onClick={() => setView('home')} />
          <NavButton active={view === 'library'} icon={<BookOpen />} onClick={() => setView('library')} />
          <NavButton active={view === 'ocr'} icon={<Camera />} onClick={() => setView('ocr')} />
          <NavButton active={view === 'leaderboard'} icon={<Trophy />} onClick={() => setView('leaderboard')} />
          <NavButton active={view === 'profile'} icon={<UserIcon />} onClick={() => setView('profile')} />
        </nav>
      )}
    </div>
  );
}

const NavButton = ({ active, icon, onClick }: { active: boolean, icon: React.ReactElement, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "p-2 rounded-xl transition-all",
      active ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
    )}
  >
    {React.cloneElement(icon, { size: 28 } as any)}
  </button>
);

// --- Views ---

function AuthView() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isRegister && password !== confirmPassword) {
      setError("Паролите не съвпадат!");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Initial user doc creation
        const newUser: UserProfile = {
          uid: cred.user.uid,
          displayName: email.split('@')[0] || 'Потребител',
          email: email,
          xp: 0,
          level: 1,
          grade: null,
          streak: 0,
          lastActive: new Date().toISOString(),
          achievements: []
        };
        await setDoc(doc(db, 'users', cred.user.uid), newUser);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mb-6 shadow-lg rotate-3">
        <BookOpen size={48} className="text-white" />
      </div>
      <h1 className="text-4xl font-black text-primary mb-2 tracking-tight">БЕЛ Мастер</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">Научи български език по забавен начин!</p>
      
      <form onSubmit={handleEmailAuth} className="w-full space-y-3 mb-6">
        <input 
          type="email" 
          placeholder="Имейл" 
          className="w-full p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white focus:border-primary outline-none transition-all"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Парола" 
          className="w-full p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white focus:border-primary outline-none transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {isRegister && (
          <input 
            type="password" 
            placeholder="Повтори парола" 
            className="w-full p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white focus:border-primary outline-none transition-all"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}
        {error && <p className="text-error text-sm font-bold">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Зареждане..." : (isRegister ? "Регистрация" : "Вход")}
        </Button>
      </form>

      <div className="flex items-center gap-4 w-full mb-6">
        <div className="h-[2px] bg-gray-100 dark:bg-gray-800 flex-1" />
        <span className="text-gray-400 dark:text-gray-500 text-sm font-bold">ИЛИ</span>
        <div className="h-[2px] bg-gray-100 dark:bg-gray-800 flex-1" />
      </div>

      <Button variant="outline" onClick={handleGoogleLogin} className="mb-6">
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-2" />
        Влез с Google
      </Button>

      <button 
        onClick={() => setIsRegister(!isRegister)}
        className="text-primary font-bold hover:underline"
      >
        {isRegister ? "Вече имаш профил? Влез" : "Нямаш профил? Регистрирай се"}
      </button>
    </motion.div>
  );
}

function OnboardingView({ user, onComplete }: { user: UserProfile, onComplete: (u: UserProfile) => void }) {
  const grades: { id: Grade, label: string, desc: string }[] = [
    { id: '7', label: '7. клас', desc: 'Подготовка за НВО' },
    { id: '10', label: '10. клас', desc: 'Подготовка за НВО' },
    { id: '12', label: '12. клас', desc: 'Подготовка за Матура' }
  ];

  const handleSelect = async (grade: Grade) => {
    const updated = { ...user, grade };
    await updateDoc(doc(db, 'users', user.uid), { grade });
    onComplete(updated);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} 
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col p-8"
    >
      <h2 className="text-3xl font-black mb-2 mt-8 dark:text-white">Добре дошъл! 👋</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-12">Избери за кой изпит се подготвяш:</p>

      <div className="space-y-4 flex-1">
        {grades.map((g) => (
          <Card key={g.id} onClick={() => handleSelect(g.id)} className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary font-black">
              {g.id}
            </div>
            <div>
              <h3 className="font-bold text-lg dark:text-white">{g.label}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">{g.desc}</p>
            </div>
            <ChevronRight className="ml-auto text-gray-300 dark:text-gray-600" />
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function HomeView({ user, onStartQuiz, onOpenLibrary, onOpenMultiplayer }: { user: UserProfile, onStartQuiz: (cat: 'grammar' | 'literature' | 'spelling' | 'reading' | 'writing' | 'full_test', sub?: string) => void, onOpenLibrary: () => void, onOpenMultiplayer: () => void }) {
  const handleCategoryClick = (cat: 'grammar' | 'literature' | 'spelling' | 'reading' | 'writing' | 'full_test') => {
    onStartQuiz(cat);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex-1 p-6 pb-24"
    >
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-accent p-2 rounded-lg text-white">
            <Flame size={20} />
          </div>
          <span className="font-bold text-accent">{user.streak}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg text-white">
            <Zap size={20} />
          </div>
          <span className="font-bold text-primary">{user.xp} XP</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-secondary p-2 rounded-lg text-white">
            <Award size={20} />
          </div>
          <span className="font-bold text-secondary">Ниво {user.level}</span>
        </div>
      </header>

      <div className="mb-8">
        <h2 className="text-2xl font-black mb-2 dark:text-white">Здравей, {(user.displayName || 'Потребител').split(' ')[0]}! 👋</h2>
        <p className="text-gray-500 dark:text-gray-400">Подготовка за {user.grade} клас</p>
      </div>

      <div className="space-y-4">
        <Card onClick={() => handleCategoryClick('grammar')} className="flex items-center gap-4 p-6">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <Zap size={32} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg dark:text-white">Граматика и правопис</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Овладей правилата на езика</p>
          </div>
          <ChevronRight className="text-gray-300 dark:text-gray-600" />
        </Card>

        <Card onClick={() => handleCategoryClick('reading')} className="flex items-center gap-4 p-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Search size={32} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg dark:text-white">Четене с разбиране</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Анализирай текстове и диаграми</p>
          </div>
          <ChevronRight className="text-gray-300 dark:text-gray-600" />
        </Card>

        <Card onClick={() => handleCategoryClick('literature')} className="flex items-center gap-4 p-6">
          <div className="w-16 h-16 bg-secondary/10 dark:bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary">
            <BookOpen size={32} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg dark:text-white">Литература</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Анализи и герои</p>
          </div>
          <ChevronRight className="text-gray-300 dark:text-gray-600" />
        </Card>

        <Card onClick={() => handleCategoryClick('full_test')} className="flex items-center gap-4 p-6 border-2 border-primary/20 dark:border-primary/40 bg-primary/5 dark:bg-primary/10">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <Zap size={32} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg dark:text-white">Пълен тест</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Симулация на реална матура</p>
          </div>
          <ChevronRight className="text-gray-300 dark:text-gray-600" />
        </Card>

        <Card onClick={onOpenLibrary} className="flex items-center gap-4 p-6 border-2 border-secondary/20 dark:border-secondary/40 bg-secondary/5 dark:bg-secondary/10">
          <div className="w-16 h-16 bg-secondary/10 dark:bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary">
            <BookOpen size={32} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg dark:text-white">Библиотека</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Всички произведения за {user.grade} клас</p>
          </div>
          <ChevronRight className="text-gray-300 dark:text-gray-600" />
        </Card>

        <Card onClick={onOpenMultiplayer} className="flex items-center gap-4 p-6 border-2 border-accent/20 dark:border-accent/40 bg-accent/5 dark:bg-accent/10">
          <div className="w-16 h-16 bg-accent/10 dark:bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
            <Users size={32} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg dark:text-white">Мултиплейър Битка</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Играй срещу други ученици в реално време</p>
          </div>
          <ChevronRight className="text-gray-300 dark:text-gray-600" />
        </Card>
      </div>
    </motion.div>
  );
}

function QuizView({ user, category, subGrade, onClose, onUpdateUser }: { user: UserProfile, category: 'grammar' | 'literature' | 'spelling' | 'reading' | 'writing' | 'full_test', subGrade?: string, onClose: () => void, onUpdateUser: (u: UserProfile) => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showGrid, setShowGrid] = useState(false);
  const [showPassageOverlay, setShowPassageOverlay] = useState(false);
  const [readingPhase, setReadingPhase] = useState(category === 'reading');
  const [currentPassageIdx, setCurrentPassageIdx] = useState(0);

  const isFullTest = category === 'full_test' || category === 'reading';
  const quizQuestions = questions.filter(q => q.type !== 'passage');
  const currentQuizQuestion = quizQuestions[currentIndex];
  const isThesisQuestion = currentQuizQuestion && (currentQuizQuestion.id.endsWith('q40') || (category === 'full_test' && currentIndex === 39));
  const passages = questions.filter(q => q.type === 'passage');

  useEffect(() => {
    const loadQuestions = async () => {
      console.log(`QuizView: Loading questions for category: ${category}, grade: ${user.grade}`);
      const data = await getQuestions(user.grade || '7', category);
      console.log(`QuizView: Received ${data.length} questions`);
      setQuestions(data);
      setLoading(false);
    };
    loadQuestions();
  }, [category, user.grade, subGrade]);

  const handleAnswer = () => {
    if (isThesisQuestion) {
      nextQuestion();
      return;
    }
    
    const currentAnswer = currentQuizQuestion.type === 'open_ended' || currentQuizQuestion.type === 'essay' || currentQuizQuestion.type === 'lis' 
      ? userAnswer 
      : selectedOption;
    
    setAnswers(prev => ({ ...prev, [currentQuizQuestion.id]: currentAnswer }));

    if (isFullTest) {
      if (currentIndex < quizQuestions.length - 1) {
        goToQuestion(currentIndex + 1);
      }
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
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  const finishQuiz = async () => {
    let finalScore = 0;
    quizQuestions.forEach((q) => {
      const ans = answers[q.id];
      if (q.type === 'open_ended') {
        if (ans?.trim().toLowerCase() === q.correctAnswerText?.toLowerCase()) finalScore++;
      } else if (q.type === 'essay' || q.type === 'lis') {
        finalScore++; // Practice points
      } else {
        if (ans === q.correctAnswer) finalScore++;
      }
    });

    const xpEarned = finalScore * 20;
    const newXp = user.xp + xpEarned;
    const newLevel = Math.floor(newXp / 1000) + 1;
    
    const updatedUser = {
      ...user,
      xp: newXp,
      level: newLevel,
      lastActive: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        xp: newXp,
        level: newLevel,
        lastActive: updatedUser.lastActive
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }

    try {
      await addDoc(collection(db, 'quizzes'), {
        userId: user.uid,
        category,
        score: finalScore,
        totalQuestions: quizQuestions.length,
        xpEarned,
        timestamp: serverTimestamp(),
        grade: user.grade
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'quizzes');
    }

    setScore(finalScore);
    onUpdateUser(updatedUser);
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
        <div className="space-y-4 mb-8">
          <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">
            {numberPrefix}{instruction}
          </p>
          <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xl font-bold leading-relaxed text-gray-800 dark:text-gray-100">
              {content}
            </p>
          </div>
        </div>
      );
    }

    return (
      <h2 className="text-2xl font-bold mb-8 dark:text-white">
        {numberPrefix}{fullText}
      </h2>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500">Зареждане на въпроси...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <XCircle size={48} className="text-error mb-4" />
        <h2 className="text-xl font-bold mb-2">Грешка при зареждане</h2>
        <p className="text-gray-500 mb-8">Не успяхме да генерираме въпроси. Моля, опитайте отново.</p>
        <Button onClick={onClose}>Назад</Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mb-4 shadow-lg text-white">
            <Trophy size={40} />
          </div>
          <h2 className="text-2xl font-black mb-1">Резултати</h2>
          <p className="text-gray-500">Завърши теста с резултат {score}/{quizQuestions.length}</p>
          
          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <p className="text-xs text-primary font-bold uppercase">Спечелени XP</p>
              <p className="text-xl font-black text-primary">+{score * 20}</p>
            </div>
            <div className="bg-secondary/10 p-4 rounded-2xl">
              <p className="text-xs text-secondary font-bold uppercase">Точност</p>
              <p className="text-xl font-black text-secondary">{Math.round((score/quizQuestions.length) * 100)}%</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4 mb-8">
          <h3 className="font-bold text-lg">Преглед на грешките:</h3>
          {quizQuestions.map((q, i) => {
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
              <div key={i} className="p-4 rounded-2xl border-2 border-red-100 bg-red-50/30 dark:bg-red-900/10 dark:border-red-900/30">
                <p className="text-sm font-bold mb-2 dark:text-white">Въпрос {i + 1}: {q.question}</p>
                <div className="text-xs space-y-1">
                  <p className="dark:text-gray-300"><span className="font-bold">Твоят отговор:</span> {q.type === 'multiple_choice' ? (q.options[userAns] || 'Няма') : (userAns || 'Няма')}</p>
                  <p className="text-primary font-bold">
                    <span className="text-gray-500 dark:text-gray-400 font-normal">Правилен отговор:</span> {q.type === 'multiple_choice' ? q.options[q.correctAnswer] : q.correctAnswerText}
                  </p>
                  {q.explanation && <p className="text-gray-400 dark:text-gray-500 mt-2 italic">{q.explanation}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={onClose} className="w-full">Затвори</Button>
      </div>
    );
  }

  if (readingPhase) {
    const currentPassage = passages[currentPassageIdx];
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <header className="mb-6 flex justify-between items-center">
          <button onClick={onClose} className="flex items-center gap-1 text-gray-500 font-bold">
            <ArrowLeft size={20} /> Назад
          </button>
          <span className="text-sm font-bold text-gray-400">Текст {currentPassageIdx + 1} от {passages.length}</span>
        </header>
        
        <div className="flex-1 space-y-6">
          <h2 className="text-3xl font-black text-primary border-b-4 border-primary/10 pb-4">
            {currentPassage.question}
          </h2>
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 shadow-sm min-h-[400px]">
            <p className="text-xl leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap font-medium">
              {currentPassage.context}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Button 
            className="w-full h-16 text-lg font-black rounded-2xl shadow-lg"
            onClick={() => {
              if (currentPassageIdx < passages.length - 1) {
                setCurrentPassageIdx(prev => prev + 1);
              } else {
                setReadingPhase(false);
              }
            }}
          >
            {currentPassageIdx < passages.length - 1 ? 'Към следващия текст' : 'Започни теста'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 relative">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft size={20} /> Назад
          </button>
          <span className="text-sm font-bold text-gray-400 dark:text-gray-500">Въпрос {currentIndex + 1} от {quizQuestions.length}</span>
          {isFullTest ? (
            <button onClick={() => setShowGrid(!showGrid)} className="text-primary p-1">
              <Menu size={24} />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>
        
      {isFullTest && showGrid && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-16 left-6 right-6 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-xl border-2 border-primary/20 z-[70] max-h-[60vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-gray-500 uppercase">Навигация</h3>
            <button onClick={() => setShowGrid(false)} className="text-gray-400"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {quizQuestions.map((q, i) => {
              return (
                <button
                  key={i}
                  onClick={() => {
                    goToQuestion(i);
                    setShowGrid(false);
                  }}
                  className={cn(
                    "h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-all",
                    currentIndex === i ? "ring-2 ring-primary ring-offset-1" : "",
                    answers[q.id] !== undefined ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Floating Book Icon for Reading Comprehension */}
      {!finished && (category === 'reading' || currentQuizQuestion.category === 'reading') && !readingPhase && (
        <button
          onClick={() => setShowPassageOverlay(true)}
          className="fixed bottom-28 right-6 w-14 h-14 bg-secondary text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-transform"
        >
          <BookOpen size={28} />
        </button>
      )}

      {/* Passage Overlay */}
      <AnimatePresence>
        {showPassageOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-black text-xl">Текстове за четене</h3>
              <button 
                onClick={() => setShowPassageOverlay(false)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6">
              {passages.map((p, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl">
                  <h4 className="font-black text-primary mb-4 border-b pb-2">{p.question}</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{p.context}</p>
                </div>
              ))}
            </div>
            <Button className="mt-6" onClick={() => setShowPassageOverlay(false)}>Затвори</Button>
          </motion.div>
        )}
      </AnimatePresence>

        {!isThesisQuestion && (
          <div className="bg-gray-200 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all" 
              style={{ width: `${((currentIndex) / quizQuestions.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {isThesisQuestion ? (
          <div className="space-y-6">
            <div className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-200">
              <h4 className="font-black text-amber-800 mb-2 flex items-center gap-2">
                <BookOpen size={20} />
                ТЕЗА ЗА УПРАЖНЕНИЕ
              </h4>
              <p className="text-amber-700 text-sm leading-relaxed">
                Това е 40-ти въпрос от теста. Това е задача за съставяне на теза, която служи само за упражнение. 
                Не се изисква въвеждане на отговор и задачата не се оценява в рамките на този тест.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-3xl border-2 border-gray-100">
              <p className="text-lg font-bold text-gray-800 leading-relaxed">
                {currentQuizQuestion.question}
              </p>
              {currentQuizQuestion.context && (
                <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100 italic text-gray-600 text-sm">
                  {currentQuizQuestion.context}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {currentQuizQuestion.context && currentQuizQuestion.context.trim() !== '' && currentQuizQuestion.category !== 'reading' && (
              <div className={cn(
                "p-5 rounded-2xl border-2 mb-6 whitespace-pre-wrap leading-relaxed",
                currentQuizQuestion.type === 'lis' 
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-100 font-medium text-lg"
                  : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm italic"
              )}>
                {currentQuizQuestion.context}
              </div>
            )}

            {renderQuestionHeader()}

            {currentQuizQuestion.type === 'matching' && currentQuizQuestion.matchingItems && (
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Творби</p>
                  {currentQuizQuestion.matchingItems.left.map((item, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium dark:text-white">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Автори</p>
                  {currentQuizQuestion.matchingItems.right.map((item, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium dark:text-white">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(currentQuizQuestion.type === 'multiple_choice' || currentQuizQuestion.type === 'multiple_choice_cloze' || !currentQuizQuestion.type) && currentQuizQuestion.options.map((option, i) => (
                <button
                  key={i}
                  disabled={isAnswered && !isFullTest}
                  onClick={() => {
                    setSelectedOption(i);
                    if (isFullTest) {
                      setAnswers(prev => ({ ...prev, [currentQuizQuestion.id]: i }));
                    }
                  }}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4",
                    isFullTest ? (
                      selectedOption === i ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-gray-100 dark:border-gray-800 hover:border-primary/50 dark:text-gray-300"
                    ) : (
                      isAnswered ? (
                        i === currentQuizQuestion.correctAnswer ? "border-primary bg-primary/5 dark:bg-primary/10" : 
                        selectedOption === i ? "border-error bg-error/5 dark:bg-error/10" : "border-gray-100 dark:border-gray-800 opacity-50 dark:text-gray-400"
                      ) : (
                        selectedOption === i ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-gray-100 dark:border-gray-800 hover:border-primary/50 dark:text-gray-300"
                      )
                    )
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-bold",
                    isFullTest ? (
                      selectedOption === i ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                    ) : (
                      isAnswered ? (
                        i === currentQuizQuestion.correctAnswer ? "bg-primary text-white" :
                        selectedOption === i ? "bg-error text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      ) : (
                        selectedOption === i ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      )
                    )
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-medium dark:text-white">{option}</span>
                </button>
              ))}

              {currentQuizQuestion.type === 'open_ended' && (
                <div className="space-y-4">
                  <textarea
                    value={userAnswer}
                    onChange={(e) => {
                      setUserAnswer(e.target.value);
                      if (isFullTest) {
                        setAnswers(prev => ({ ...prev, [currentQuizQuestion.id]: e.target.value }));
                      }
                    }}
                    disabled={isAnswered && !isFullTest}
                    placeholder="Напишете вашия отговор тук..."
                    className="w-full h-32 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white focus:border-primary focus:outline-none resize-none"
                  />
                  {isAnswered && !isFullTest && (
                    <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/20">
                      <p className="text-xs font-bold text-primary uppercase mb-1">Правилен отговор:</p>
                      <p className="font-medium dark:text-white">{currentQuizQuestion.correctAnswerText}</p>
                    </div>
                  )}
                </div>
              )}

              {(currentQuizQuestion.type === 'essay' || currentQuizQuestion.type === 'lis') && (
                <div className="space-y-4">
                  <div className="p-6 bg-secondary/5 dark:bg-secondary/10 rounded-2xl border-2 border-secondary/20 dark:border-secondary/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Това е писмена задача. Подгответе своя план или текст. 
                      В реалния изпит ще разполагате с лист за отговори.
                    </p>
                  </div>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => {
                      setUserAnswer(e.target.value);
                      if (isFullTest) {
                        setAnswers(prev => ({ ...prev, [currentIndex]: e.target.value }));
                      }
                    }}
                    disabled={isAnswered && !isFullTest}
                    placeholder="Можете да нахвърляте идеите си тук..."
                    className="w-full h-64 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white focus:border-secondary focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isFullTest ? (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white dark:bg-gray-900 border-t-2 border-gray-100 dark:border-gray-800 max-w-[480px] mx-auto z-50 flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
          <Button 
            variant="outline" 
            className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            disabled={currentIndex === 0}
            onClick={prevQuestion}
          >
            Назад
          </Button>
          {currentIndex === questions.length - 1 || (isFullTest && isThesisQuestion) ? (
            <Button 
              variant="primary" 
              className="flex-1"
              onClick={finishQuiz}
            >
              {isThesisQuestion ? 'Завърши' : 'Предай'}
            </Button>
          ) : (
            <Button 
              variant="primary" 
              className="flex-1"
              onClick={nextQuestion}
            >
              Напред
            </Button>
          )}
        </div>
      ) : (
        <>
          <AnimatePresence>
            {!isThesisQuestion && isAnswered && (
              <motion.div 
                initial={{ y: 100 }} 
                animate={{ y: 0 }} 
                className={cn(
                  "fixed bottom-0 left-0 right-0 p-6 rounded-t-3xl border-t-4 max-w-[480px] mx-auto z-[60]",
                  (currentQuestion.type === 'essay' || currentQuestion.type === 'lis') ? "bg-blue-50 border-blue-500" :
                  (currentQuestion.type === 'open_ended' ? 
                    (userAnswer.trim().toLowerCase() === currentQuestion.correctAnswerText?.toLowerCase() ? "bg-green-50 border-primary" : "bg-red-50 border-error") :
                    (selectedOption === currentQuestion.correctAnswer ? "bg-green-50 border-primary" : "bg-red-50 border-error")
                  )
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  {(currentQuestion.type === 'essay' || currentQuestion.type === 'lis') ? (
                    <><CheckCircle2 className="text-blue-500" /> <span className="font-black text-blue-500 text-xl">Готово!</span></>
                  ) : currentQuestion.type === 'open_ended' ? (
                    userAnswer.trim().toLowerCase() === currentQuestion.correctAnswerText?.toLowerCase() ? (
                      <><CheckCircle2 className="text-primary" /> <span className="font-black text-primary text-xl">Страхотно!</span></>
                    ) : (
                      <><XCircle className="text-error" /> <span className="font-black text-error text-xl">Грешка...</span></>
                    )
                  ) : (
                    selectedOption === currentQuestion.correctAnswer ? (
                      <><CheckCircle2 className="text-primary" /> <span className="font-black text-primary text-xl">Страхотно!</span></>
                    ) : (
                      <><XCircle className="text-error" /> <span className="font-black text-error text-xl">Грешка...</span></>
                    )
                  )}
                </div>
                <p className={cn("text-sm mb-6", 
                  (currentQuestion.type === 'essay' || currentQuestion.type === 'lis') ? "text-blue-700" :
                  (currentQuestion.type === 'open_ended' ? 
                    (userAnswer.trim().toLowerCase() === currentQuestion.correctAnswerText?.toLowerCase() ? "text-green-700" : "text-red-700") :
                    (selectedOption === currentQuestion.correctAnswer ? "text-green-700" : "text-red-700")
                  )
                )}>
                  {currentQuestion.explanation || (currentQuestion.type === 'open_ended' ? `Правилният отговор е: ${currentQuestion.correctAnswerText}` : '')}
                </p>
                <Button 
                  variant={(currentQuestion.type === 'essay' || currentQuestion.type === 'lis') ? 'primary' : 
                    (currentQuestion.type === 'open_ended' ? 
                      (userAnswer.trim().toLowerCase() === currentQuestion.correctAnswerText?.toLowerCase() ? 'primary' : 'error') :
                      (selectedOption === currentQuestion.correctAnswer ? 'primary' : 'error')
                    )
                  } 
                  className="w-full"
                  onClick={nextQuestion}
                >
                  {currentIndex === questions.length - 1 ? 'Завърши' : 'Напред'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {!isThesisQuestion && !isAnswered && (
            <div className="mt-6">
              <Button 
                disabled={
                  currentQuestion.type === 'passage' ? false :
                  (currentQuestion.type === 'open_ended' || currentQuestion.type === 'essay' || currentQuestion.type === 'lis') ? !userAnswer.trim() : selectedOption === null
                } 
                onClick={currentQuestion.type === 'passage' ? nextQuestion : handleAnswer}
              >
                {currentQuestion.type === 'passage' ? 'Напред' : 'Провери'}
              </Button>
            </div>
          )}

          {isThesisQuestion && (
            <div className="mt-6">
              <Button 
                onClick={nextQuestion}
              >
                {currentIndex === questions.length - 1 ? 'Завърши' : 'Напред'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeaderboardView({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as LeaderboardEntry[];
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex-1 p-6 pb-24"
    >
      <div className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft size={20} /> Назад
        </button>
        <h2 className="text-3xl font-black flex items-center gap-3">
          <Trophy className="text-accent" size={32} />
          Класация
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={entry.uid} className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border-2",
              idx === 0 ? "border-accent bg-accent/5 dark:bg-accent/10" : "border-gray-100 dark:border-gray-800 dark:bg-gray-900"
            )}>
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-black",
                idx === 0 ? "bg-accent text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              )}>
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-bold dark:text-white">{entry.displayName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Ниво {entry.level}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-primary">{entry.xp}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">XP</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function OCRView({ onClose }: { onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ extractedText: string, errors: any[] } | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (data: string) => {
    setAnalyzing(true);
    const res = await checkSpellingWithGemini(data);
    setResult(res);
    setAnalyzing(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex-1 p-6 pb-24"
    >
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft size={20} /> Назад
        </button>
        <h2 className="text-3xl font-black flex items-center gap-3">
          <Camera className="text-primary" size={32} />
          Скенер
        </h2>
      </div>
      <p className="text-gray-500 mb-8">Снимай текст и провери за правописни грешки.</p>

      {!image ? (
        <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-100 rounded-3xl p-12 text-center">
          <Camera size={64} className="text-gray-200 mb-4" />
          <p className="text-gray-400 mb-8">Няма избрана снимка</p>
          <label className="duo-button bg-primary text-white cursor-pointer">
            Снимай / Избери
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <img src={image} className="w-full rounded-2xl border-2 border-gray-100" />
          
          {analyzing ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Анализиране на текста...</p>
            </div>
          ) : result && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
                <h4 className="font-bold text-sm text-gray-400 dark:text-gray-500 uppercase mb-2">Извлечен текст</h4>
                <p className="text-sm dark:text-gray-200">{result.extractedText}</p>
              </div>

              <h4 className="font-bold dark:text-white">Открити грешки ({result.errors.length})</h4>
              {result.errors.length === 0 ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-2xl border-2 border-green-100 dark:border-green-800 flex items-center gap-3">
                  <CheckCircle2 />
                  Не са открити грешки!
                </div>
              ) : (
                <div className="space-y-3">
                  {result.errors.map((err, i) => (
                    <div key={i} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border-2 border-red-100 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="line-through text-red-400 dark:text-red-500">{err.original}</span>
                        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                        <span className="font-bold text-green-600 dark:text-green-400">{err.correction}</span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300">{err.reason}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <Button variant="outline" onClick={() => { setImage(null); setResult(null); }}>
                Ново сканиране
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ProfileView({ user, onLogout, onClose, onUpdateUser }: { user: UserProfile, onLogout: () => void, onClose: () => void, onUpdateUser: (u: UserProfile) => void }) {
  const [editingGrade, setEditingGrade] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const updateGrade = async (grade: Grade) => {
    await updateDoc(doc(db, 'users', user.uid), { grade });
    onUpdateUser({ ...user, grade });
    setEditingGrade(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setPwSuccess(true);
      setNewPassword('');
      setCurrentPassword('');
    } catch (error: any) {
      setPwError("Грешна текуща парола или слаба нова парола.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex-1 p-6 pb-24"
    >
      <div className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft size={20} /> Назад
        </button>
        <h2 className="text-3xl font-black">Профил</h2>
        <button onClick={onLogout} className="text-error p-2 hover:bg-error/10 rounded-xl">
          <LogOut size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border-4 border-white dark:border-gray-900 shadow-md overflow-hidden">
          {auth.currentUser?.photoURL ? (
            <img src={auth.currentUser.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={48} className="text-gray-300 dark:text-gray-600" />
          )}
        </div>
        <h3 className="text-xl font-bold text-black dark:text-white">{user.displayName || 'Потребител'}</h3>
        <p className="text-gray-400 dark:text-gray-500 text-sm">{user.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase">Общо XP</p>
          <p className="text-xl font-black text-primary">{user.xp}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase">Клас</p>
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-secondary">{user.grade || '?'}-ти</p>
            <button onClick={() => setEditingGrade(!editingGrade)} className="text-gray-300 hover:text-gray-500">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {editingGrade && (
        <div className="mb-8 p-6 bg-secondary/5 rounded-3xl border-2 border-secondary/20">
          <h4 className="font-bold mb-4">Избери своя клас:</h4>
          <div className="flex gap-3">
            {(['7', '10', '12'] as Grade[]).map(g => (
              <button 
                key={g}
                onClick={() => updateGrade(g)}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold border-2 transition-all",
                  user.grade === g ? "bg-secondary border-secondary text-white" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {user.email === 'marthard2004@gmail.com' && (
        <div className="mb-8 p-4 bg-primary/10 rounded-2xl border-2 border-primary/20">
          <h4 className="font-bold mb-2 text-primary">Админ панел</h4>
          <Button onClick={async () => {
            try {
              await seedInitialTestData();
              alert("Тестовете са обновени успешно!");
            } catch (e) {
              alert("Грешка при обновяване: " + (e as Error).message);
            }
          }}>Обнови тестовете в базата</Button>
        </div>
      )}

      <div className="mb-8">
        <Button 
          variant="secondary" 
          onClick={() => setShowPasswordChange(!showPasswordChange)} 
          className="font-bold shadow-sm"
        >
          Промяна на парола
        </Button>
        {showPasswordChange && (
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
            <input 
              type="password" 
              placeholder="Текуща парола" 
              className="w-full p-3 rounded-xl border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:border-primary text-black dark:text-white"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Нова парола" 
              className="w-full p-3 rounded-xl border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:border-primary text-black dark:text-white"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            {pwError && <p className="text-error text-xs font-bold">{pwError}</p>}
            {pwSuccess && <p className="text-primary text-xs font-bold">Паролата е променена!</p>}
            <Button type="submit">Запази</Button>
          </form>
        )}
      </div>

      <h4 className="font-bold mb-4">Постижения</h4>
      <div className="grid grid-cols-3 gap-4">
        {[
          { id: '1', name: 'Начинаещ', icon: <Star />, color: 'text-yellow-400' },
          { id: '2', name: '7 дни серия', icon: <Flame />, color: 'text-orange-500' },
          { id: '3', name: 'Майстор', icon: <Award />, color: 'text-primary' }
        ].map(ach => (
          <div key={ach.id} className="flex flex-col items-center gap-2 grayscale opacity-50">
            <div className={cn("w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border-2 border-gray-100", ach.color)}>
              {ach.icon}
            </div>
            <span className="text-[10px] font-bold text-center">{ach.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MultiplayerView({ user, onClose }: { user: UserProfile, onClose: () => void }) {
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40);

  useEffect(() => {
    let timer: any;
    if (lobby?.status === 'playing' && lobby?.roundStatus === 'question') {
      timer = setInterval(() => {
        const now = Date.now();
        const startedAt = lobby.questionStartedAt || now;
        const elapsed = Math.floor((now - startedAt) / 1000);
        const remaining = Math.max(0, 40 - elapsed);
        setTimeLeft(remaining);

        if (remaining === 0 && user.uid === lobby.hostId && lobby.roundStatus === 'question') {
          handleTimeout();
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lobby?.status, lobby?.roundStatus, lobby?.questionStartedAt, lobbyId]);

  // Auto-start battle when all players are ready (for host)
  useEffect(() => {
    if (lobby?.status === 'waiting' && user.uid === lobby.hostId) {
      const players = Object.values(lobby.players);
      if (players.length >= 2 && players.every((p: any) => p.ready)) {
        // Debounce or check if already starting to avoid multiple calls
        if (!loading && !lobby.starting) {
          startBattle();
        }
      }
    }
  }, [lobby?.players, lobby?.status, lobby?.hostId, user.uid, loading]);

  const handleTimeout = async () => {
    if (!lobbyId || !lobby || lobby.roundStatus !== 'question') return;
    try {
      const currentIdx = lobby.currentQuestionIndex || 0;
      const questionsCount = lobby.questions?.length || 0;
      const isLastQuestion = currentIdx >= questionsCount - 1;
      
      if (isLastQuestion) {
        await updateDoc(doc(db, 'lobbies', lobbyId), {
          status: 'finished'
        });
      } else {
        await updateDoc(doc(db, 'lobbies', lobbyId), {
          currentQuestionIndex: currentIdx + 1,
          questionStartedAt: Date.now(),
          winnerId: null,
          roundStatus: 'question'
        });
      }
    } catch (error) {
      console.error("Timeout error:", error);
    }
  };

  useEffect(() => {
    if (!lobbyId) return;

    const unsubscribe = onSnapshot(doc(db, 'lobbies', lobbyId), (snapshot) => {
      if (snapshot.exists()) {
        setLobby(snapshot.data());
      } else {
        setLobbyId(null);
        setLobby(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `lobbies/${lobbyId}`);
    });

    return () => unsubscribe();
  }, [lobbyId]);

  const createLobby = async () => {
    setLoading(true);
    try {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newLobby = {
        id,
        hostId: user.uid,
        status: 'waiting',
        roundStatus: 'question', // 'question' | 'picking'
        winnerId: null,
        starting: false,
        players: {
          [user.uid]: {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Анонимен',
            score: 0,
            ready: false,
            photoURL: auth.currentUser?.photoURL || '',
            color: '#FF4B4B' // Red
          }
        },
        grid: Array(9).fill(null), // 3x3 grid
        questions: [],
        currentQuestionIndex: 0,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'lobbies', id), newLobby);
      setLobbyId(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lobbies');
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async () => {
    if (!joinCode) return;
    setLoading(true);
    try {
      const lobbyDoc = await getDoc(doc(db, 'lobbies', joinCode.toUpperCase()));
      if (lobbyDoc.exists()) {
        const data = lobbyDoc.data();
        if (data.status !== 'waiting') {
          alert("Играта вече е започнала!");
          return;
        }
        const playerColors = ['#FF4B4B', '#1CB0F6', '#FFC800', '#78D700'];
        const playerCount = Object.keys(data.players).length;
        
        await updateDoc(doc(db, 'lobbies', joinCode.toUpperCase()), {
          [`players.${user.uid}`]: {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Анонимен',
            score: 0,
            ready: false,
            photoURL: auth.currentUser?.photoURL || '',
            color: playerColors[playerCount] || '#CE82FF'
          }
        });
        setLobbyId(joinCode.toUpperCase());
      } else {
        alert("Невалиден код!");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lobbies/${joinCode}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = async () => {
    if (!lobbyId || !lobby) return;
    try {
      await updateDoc(doc(db, 'lobbies', lobbyId), {
        [`players.${user.uid}.ready`]: !lobby.players[user.uid].ready
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lobbies/${lobbyId}`);
    }
  };

  const startBattle = async () => {
    if (!lobbyId || !lobby || loading) return;
    setLoading(true);
    try {
      console.log(`[Multiplayer] Starting battle for lobby ${lobbyId}, grade: ${user.grade || '7'}`);
      
      // Mark as starting in DB to prevent other triggers
      await updateDoc(doc(db, 'lobbies', lobbyId), { starting: true });
      
      const questions = await getQuestions(user.grade || '7', 'grammar', true);
      console.log(`[Multiplayer] Fetched ${questions?.length || 0} questions`);
      
      if (!questions || questions.length === 0) {
        console.error("[Multiplayer] No questions found for multiplayer battle.");
        // Try a fallback to grade 7 if current grade failed
        if (user.grade !== '7') {
          console.log("[Multiplayer] Retrying with grade 7 fallback...");
          const fallbackQuestions = await getQuestions('7', 'grammar', true);
          if (fallbackQuestions && fallbackQuestions.length > 0) {
            await finalizeStartBattle(fallbackQuestions);
            return;
          }
        }
        alert("Грешка при генериране на въпроси. Моля, опитайте пак след малко!");
        await updateDoc(doc(db, 'lobbies', lobbyId), { starting: false });
        return;
      }

      await finalizeStartBattle(questions);
    } catch (error) {
      console.error("[Multiplayer] Start battle error:", error);
      alert(`Грешка при стартиране на играта: ${error instanceof Error ? error.message : 'Неизвестна грешка'}`);
      await updateDoc(doc(db, 'lobbies', lobbyId), { starting: false });
      handleFirestoreError(error, OperationType.UPDATE, `lobbies/${lobbyId}`);
    } finally {
      setLoading(false);
    }
  };

  const finalizeStartBattle = async (questions: any[]) => {
    if (!lobby || !lobbyId) return;
    const playerIds = Object.keys(lobby.players);
    const newGrid = [...(lobby.grid || Array(9).fill(null))];
    
    // Set start positions for 3x3 grid
    if (playerIds.length >= 2) {
      newGrid[0] = playerIds[0]; // Top left
      newGrid[8] = playerIds[1]; // Bottom right
    }
    if (playerIds.length >= 3) newGrid[2] = playerIds[2]; // Top right
    if (playerIds.length >= 4) newGrid[6] = playerIds[3]; // Bottom left

    try {
      await updateDoc(doc(db, 'lobbies', lobbyId), {
        status: 'playing',
        roundStatus: 'question',
        questions: questions.map(q => {
          // Ensure no undefined values in question objects for Firestore
          const cleanQ: any = {
            id: q.id || Math.random().toString(36).substring(2, 9),
            question: q.question || '',
            options: q.options || [],
            correctAnswer: q.correctAnswer ?? -1,
            explanation: q.explanation || '',
            category: q.category || 'grammar',
            type: q.type || 'multiple_choice'
          };
          if (q.correctAnswerText !== undefined) cleanQ.correctAnswerText = q.correctAnswerText;
          if (q.context !== undefined) cleanQ.context = q.context;
          if (q.matchingItems !== undefined) cleanQ.matchingItems = q.matchingItems;
          return cleanQ;
        }),
        currentQuestionIndex: 0,
        grid: newGrid,
        questionStartedAt: Date.now(),
        starting: false
      });
    } catch (error) {
      console.error("[Multiplayer] Finalize start battle error:", error);
      await updateDoc(doc(db, 'lobbies', lobbyId), { starting: false });
      handleFirestoreError(error, OperationType.UPDATE, `lobbies/${lobbyId}`);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (!lobbyId || !lobby || isAnswered || lobby.roundStatus !== 'question') return;
    
    // Check if player is eliminated
    const playerSquares = lobby.grid.filter((cell: string | null) => cell === user.uid).length;
    if (playerSquares === 0) {
      alert("Ти си елиминиран и не можеш да отговаряш!");
      return;
    }

    setSelectedOption(optionIndex);
    setIsAnswered(true);
    
    const currentQ = lobby.questions[lobby.currentQuestionIndex];
    const isCorrect = optionIndex === currentQ.correctAnswer;
    
    if (isCorrect) {
      try {
        await runTransaction(db, async (transaction) => {
          const lobbyRef = doc(db, 'lobbies', lobbyId);
          const lobbyDoc = await transaction.get(lobbyRef);
          if (!lobbyDoc.exists()) return;
          
          const currentData = lobbyDoc.data();
          if (currentData.roundStatus === 'question') {
            transaction.update(lobbyRef, {
              winnerId: user.uid,
              roundStatus: 'picking',
              [`players.${user.uid}.score`]: (currentData.players[user.uid].score || 0) + 10
            });
          }
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `lobbies/${lobbyId}`);
      }
    }
  };

  const isAdjacentToOwn = (index: number) => {
    if (!lobby) return false;
    const size = 3;
    const row = Math.floor(index / size);
    const col = index % size;
    
    const neighbors = [
      { r: row - 1, c: col },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row, c: col + 1 }
    ];
    
    return neighbors.some(n => {
      if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
        const neighborIndex = n.r * size + n.c;
        return lobby.grid[neighborIndex] === user.uid;
      }
      return false;
    });
  };

  const claimSquare = async (index: number) => {
    if (!lobbyId || !lobby || lobby.roundStatus !== 'picking' || lobby.winnerId !== user.uid || lobby.grid[index] === user.uid || claiming) return;
    
    // Check adjacency
    if (!isAdjacentToOwn(index)) {
      alert("Можеш да завладяваш само съседни на твоите квадратчета!");
      return;
    }

    setClaiming(true);
    try {
      const newGrid = [...lobby.grid];
      newGrid[index] = user.uid;
      
      // Check for remaining players with squares
      const alivePlayers = Object.keys(lobby.players).filter(pid => 
        newGrid.some(cell => cell === pid)
      );

      const isLastQuestion = lobby.currentQuestionIndex >= lobby.questions.length - 1;
      const isOnePlayerLeft = alivePlayers.length <= 1;
      const isGridFull = newGrid.every(cell => cell !== null);

      if (isLastQuestion || isOnePlayerLeft || isGridFull) {
        await updateDoc(doc(db, 'lobbies', lobbyId), {
          grid: newGrid,
          status: 'finished'
        });
      } else {
        await updateDoc(doc(db, 'lobbies', lobbyId), {
          grid: newGrid,
          roundStatus: 'question',
          currentQuestionIndex: lobby.currentQuestionIndex + 1,
          winnerId: null,
          questionStartedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lobbies/${lobbyId}`);
    } finally {
      setClaiming(false);
    }
  };

  // Reset local answer state when question changes or new round starts
  useEffect(() => {
    if (lobby?.roundStatus === 'question') {
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }, [lobby?.currentQuestionIndex, lobby?.roundStatus]);

  if (!lobbyId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6">
          <Users size={40} />
        </div>
        <h2 className="text-3xl font-black mb-2">Мултиплейър Битка</h2>
        <p className="text-gray-500 mb-8">Предизвикай приятел или се включи в съществуваща игра!</p>
        
        <div className="w-full space-y-4">
          <Button onClick={createLobby} disabled={loading}>
            {loading ? 'Създаване...' : 'Създай нова битка'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">ИЛИ</span></div>
          </div>
          
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Въведи код за достъп" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-accent outline-none text-center font-bold tracking-widest"
            />
            <Button variant="outline" onClick={joinLobby} disabled={loading || !joinCode}>
              Присъедини се
            </Button>
          </div>
          
          <button onClick={onClose} className="w-full py-3 text-gray-400 font-bold">Назад</button>
        </div>
      </motion.div>
    );
  }

  if (lobby?.status === 'waiting') {
    return (
      <div className="flex-1 p-6 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="bg-accent/10 p-4 rounded-2xl mb-4">
            <span className="text-sm font-bold text-accent uppercase tracking-widest">Код за битка</span>
            <h3 className="text-4xl font-black text-accent">{lobbyId}</h3>
          </div>
          <p className="text-gray-500 mb-8">Изчакваме играчите да се подготвят...</p>
          
          <div className="w-full space-y-3 mb-8">
            {Object.values(lobby.players).map((player: any) => (
              <div key={player.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center font-bold">
                    {player.name[0]}
                  </div>
                  <span className="font-bold">{player.name}</span>
                </div>
                {player.ready ? (
                  <span className="text-xs font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full">ГОТОВ</span>
                ) : (
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">ЧАКА</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <Button 
            variant={lobby.players[user.uid]?.ready ? 'outline' : 'accent'} 
            onClick={toggleReady}
          >
            {lobby.players[user.uid]?.ready ? 'Не съм готов' : 'Готов съм!'}
          </Button>
          
          {user.uid === lobby.hostId && (
            <Button 
              onClick={startBattle} 
              disabled={!Object.values(lobby.players).every((p: any) => p.ready) || Object.values(lobby.players).length < 2}
            >
              Започни битката
            </Button>
          )}
          
          <button onClick={() => setLobbyId(null)} className="w-full py-3 text-gray-400 font-bold">Напусни</button>
        </div>
      </div>
    );
  }

  if (lobby?.status === 'playing' && lobby.questions.length > 0) {
    const currentQ = lobby.questions[lobby.currentQuestionIndex];
    const isWinner = lobby.winnerId === user.uid;
    const winnerName = lobby.winnerId ? lobby.players[lobby.winnerId]?.name : '';
    const isEliminated = lobby.grid.filter((cell: string | null) => cell === user.uid).length === 0;

    return (
      <div className="flex-1 p-4 flex flex-col max-h-screen overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div className="flex -space-x-2">
            {Object.values(lobby.players).map((player: any) => {
              const squares = lobby.grid.filter((c: string | null) => c === player.uid).length;
              const eliminated = squares === 0;
              return (
                <div 
                  key={player.uid} 
                  className={cn(
                    "w-10 h-10 rounded-full border-2 border-white flex items-center justify-center font-bold text-xs relative group transition-opacity",
                    eliminated && "opacity-30 grayscale"
                  )}
                  style={{ backgroundColor: player.color }}
                >
                  {player.name[0]}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {player.name}: {squares} кв. {eliminated ? '(Елиминиран)' : ''}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-accent/10 px-4 py-1 rounded-full text-accent font-bold text-sm flex items-center gap-2">
            <Clock size={14} />
            {timeLeft}s
          </div>
        </div>

        {/* Game Map (Grid) */}
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-2 aspect-square w-full max-w-[300px] mx-auto bg-gray-100 p-2 rounded-xl border-2 border-gray-200">
            {lobby.grid.map((cell: string | null, idx: number) => {
              const canClaim = lobby.roundStatus === 'picking' && isWinner && lobby.grid[idx] !== user.uid && isAdjacentToOwn(idx);
              return (
                <motion.div
                  key={idx}
                  whileHover={canClaim ? { scale: 1.1 } : {}}
                  onClick={() => claimSquare(idx)}
                  className={cn(
                    "aspect-square rounded-md transition-all duration-300",
                    canClaim ? "bg-accent/20 cursor-pointer animate-pulse border-2 border-accent/40" : "bg-white",
                    cell && "shadow-inner"
                  )}
                  style={cell ? { backgroundColor: lobby.players[cell]?.color } : {}}
                />
              );
            })}
          </div>
          {lobby.roundStatus === 'picking' && (
            <div className="text-center mt-3">
              {isWinner ? (
                <p className="text-accent font-black animate-bounce">Твой ред е! Избери съседно квадратче!</p>
              ) : (
                <p className="text-gray-500 font-bold">{winnerName} избира квадратче...</p>
              )}
            </div>
          )}
        </div>

        {lobby.roundStatus === 'question' && (
          <div className="flex-1 flex flex-col overflow-y-auto pb-4">
            {isEliminated ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <XCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-400">Ти си елиминиран</h3>
                <p className="text-sm text-gray-500">Изчакай края на битката...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className={cn(
                    "w-full h-2 bg-gray-100 rounded-full overflow-hidden",
                    timeLeft < 10 ? "bg-red-50" : ""
                  )}>
                    <motion.div 
                      initial={false}
                      animate={{ width: `${(timeLeft / 40) * 100}%` }}
                      className={cn(
                        "h-full transition-colors duration-500",
                        timeLeft < 10 ? "bg-red-500" : "bg-accent"
                      )}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-black mb-6 text-center leading-tight">{currentQ.question}</h3>
                <div className="space-y-2">
                  {currentQ.options.map((option: string, index: number) => {
                    let variant: 'outline' | 'primary' | 'error' | 'accent' = 'outline';
                    if (isAnswered) {
                      if (index === currentQ.correctAnswer) variant = 'primary';
                      else if (index === selectedOption) variant = 'error';
                    } else if (selectedOption === index) {
                      variant = 'accent';
                    }

                    return (
                      <Card 
                        key={index} 
                        onClick={() => handleAnswer(index)}
                        className={cn(
                          "p-3 text-base font-bold transition-all",
                          variant === 'primary' && "bg-primary text-white border-primary",
                          variant === 'error' && "bg-error text-white border-error",
                          variant === 'accent' && "bg-accent text-white border-accent",
                          variant === 'outline' && "hover:border-accent",
                          isAnswered && "cursor-default"
                        )}
                      >
                        {option}
                      </Card>
                    );
                  })}
                </div>
                {isAnswered && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-gray-50 rounded-xl border-2 border-gray-100">
                    <p className="text-xs text-gray-600 italic">{currentQ.explanation}</p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (lobby?.status === 'finished') {
    // Calculate squares owned
    const squareCounts: Record<string, number> = {};
    lobby.grid.forEach((cell: string | null) => {
      if (cell) squareCounts[cell] = (squareCounts[cell] || 0) + 1;
    });

    const sortedPlayers = Object.values(lobby.players).sort((a: any, b: any) => {
      const aSquares = squareCounts[a.uid] || 0;
      const bSquares = squareCounts[b.uid] || 0;
      return bSquares - aSquares;
    });

    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-white mb-6 shadow-lg">
          <Trophy size={48} />
        </div>
        <h2 className="text-3xl font-black mb-2">Край на битката!</h2>
        <p className="text-gray-500 mb-8">Завладени територии</p>
        
        <div className="w-full space-y-3 mb-8">
          {sortedPlayers.map((player: any, index: number) => (
            <div key={player.uid} className={cn(
              "flex items-center justify-between p-4 rounded-2xl border-2",
              index === 0 ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-100"
            )}>
              <div className="flex items-center gap-3">
                <span className="font-black text-lg text-gray-400 w-6">{index + 1}.</span>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: player.color }}
                >
                  {player.name[0]}
                </div>
                <span className="font-bold">{player.name}</span>
              </div>
              <span className="font-black text-accent">{squareCounts[player.uid] || 0} квадрата</span>
            </div>
          ))}
        </div>
        
        <Button onClick={onClose}>Към началния екран</Button>
      </div>
    );
  }

  return null;
}

function LibraryView({ user, onClose }: { user: UserProfile, onClose: () => void }) {
  const [selectedWork, setSelectedWork] = useState<{ title: string, author: string } | null>(null);
  const [details, setDetails] = useState<{ summary: string, analysis: string, characters: string, authorInfo: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const worksByGrade: Record<Grade, { title: string, author: string, period: string, gradeLabel?: string }[]> = {
    '7': [
      { title: "На прощаване в 1868 г.", author: "Христо Ботев", period: "Възраждане" },
      { title: "Немили-недраги", author: "Иван Вазов", period: "Възраждане" },
      { title: "Една българка", author: "Иван Вазов", period: "Възраждане" },
      { title: "Опълченците на Шипка", author: "Иван Вазов", period: "Възраждане" },
      { title: "Българският език", author: "Иван Вазов", period: "Възраждане" },
      { title: "До Чикаго и назад", author: "Алеко Константинов", period: "Критически реализъм" },
      { title: "Бай Ганьо", author: "Алеко Константинов", period: "Критически реализъм" },
      { title: "Неразделни", author: "Пенчо Славейков", period: "Модернизъм" },
      { title: "Заточеници", author: "Пейо Яворов", period: "Символизъм" },
      { title: "По жътва", author: "Елин Пелин", period: "Реализъм" },
      { title: "По жицата", author: "Йордан Йовков", period: "Реализъм" }
    ],
    '10': [
      { title: "Азбучна молитва", author: "Константин Преславски", period: "Средновековие" },
      { title: "За буквите", author: "Черноризец Храбър", period: "Средновековие" },
      { title: "История славянобългарска", author: "Паисий Хилендарски", period: "Възраждане" },
      { title: "Изворът на Белоногата", author: "Петко Р. Славейков", period: "Възраждане" },
      { title: "Левски", author: "Иван Вазов", period: "Възраждане" },
      { title: "Под игото", author: "Иван Вазов", period: "Възраждане" },
      { title: "Бай Ганьо се върна от Европа", author: "Алеко Константинов", period: "Критически реализъм" },
      { title: "Cis moll", author: "Пенчо Славейков", period: "Модернизъм" },
      { title: "Арменци", author: "Пейо Яворов", period: "Символизъм" },
      { title: "Две хубави очи", author: "Пейо Яворов", period: "Символизъм" },
      { title: "В часа на синята мъгла", author: "Пейо Яворов", period: "Символизъм" },
      { title: "Да се завърнеш в бащината къща", author: "Димчо Дебелянов", period: "Символизъм" },
      { title: "Гераците", author: "Елин Пелин", period: "Реализъм" },
      { title: "Септември", author: "Гео Милев", period: "Експресионизъм" },
      { title: "Зимни вечери", author: "Христо Смирненски", period: "Постсимволизъм" },
      { title: "Повест", author: "Атанас Далчев", period: "Предметен реализъм" },
      { title: "Индже", author: "Йордан Йовков", period: "Реализъм" },
      { title: "Албена", author: "Йордан Йовков", period: "Реализъм" },
      { title: "Тютюн", author: "Димитър Димов", period: "Модернизъм" },
      { title: "Дърво без корен", author: "Николай Хайтов", period: "Съвременна литература" },
      { title: "Нежната спирала", author: "Йордан Радичков", period: "Съвременна литература" }
    ],
    '12': [
      // 11 клас
      { title: "Железният светилник", author: "Димитър Талев", period: "След Освобождението", gradeLabel: "11 клас" },
      { title: "Бай Ганьо журналист", author: "Алеко Константинов", period: "Критически реализъм", gradeLabel: "11 клас" },
      { title: "Балкански синдром", author: "Станислав Стратиев", period: "Съвременна драма", gradeLabel: "11 клас" },
      { title: "Паисий", author: "Иван Вазов", period: "Възраждане", gradeLabel: "11 клас" },
      { title: "История", author: "Никола Вапцаров", period: "Социален реализъм", gradeLabel: "11 клас" },
      { title: "Ноев ковчег", author: "Йордан Радичков", period: "Съвременна литература", gradeLabel: "11 клас" },
      { title: "Борба", author: "Христо Ботев", period: "Възраждане", gradeLabel: "11 клас" },
      { title: "Андрешко", author: "Елин Пелин", period: "Реализъм", gradeLabel: "11 клас" },
      { title: "Приказка за стълбата", author: "Христо Смирненски", period: "Постсимволизъм", gradeLabel: "11 клас" },
      { title: "Крадецът на праскови", author: "Емилиян Станев", period: "Съвременна литература", gradeLabel: "11 клас" },
      { title: "При Рилския манастир", author: "Иван Вазов", period: "Възраждане", gradeLabel: "11 клас" },
      { title: "Спи езерото", author: "Пенчо Славейков", period: "Модернизъм", gradeLabel: "11 клас" },
      { title: "Градушка", author: "Пейо Яворов", period: "Символизъм", gradeLabel: "11 клас" },
      // 12 клас
      { title: "Аз искам да те помня все така...", author: "Димчо Дебелянов", period: "Символизъм", gradeLabel: "12 клас" },
      { title: "Колко си хубава", author: "Христо Фотев", period: "Съвременна лирика", gradeLabel: "12 клас" },
      { title: "Посвещение", author: "Петя Дубарова", period: "Съвременна лирика", gradeLabel: "12 клас" },
      { title: "Спасова могила", author: "Елин Пелин", period: "Реализъм", gradeLabel: "12 клас" },
      { title: "Ветрената мелница", author: "Елин Пелин", period: "Реализъм", gradeLabel: "12 клас" },
      { title: "Молитва", author: "Атанас Далчев", period: "Предметен реализъм", gradeLabel: "12 клас" },
      { title: "Вяра", author: "Никола Вапцаров", period: "Социален реализъм", gradeLabel: "12 клас" },
      { title: "Песента на колелетата", author: "Йордан Йовков", period: "Реализъм", gradeLabel: "12 клас" },
      { title: "Балада за Георг Хених", author: "Виктор Пасков", period: "Съвременна литература", gradeLabel: "12 клас" },
      { title: "Потомка", author: "Елисавета Багряна", period: "Модернизъм", gradeLabel: "12 клас" },
      { title: "Две души", author: "Пейо Яворов", period: "Символизъм", gradeLabel: "12 клас" },
      { title: "Честен кръст", author: "Борис Христов", period: "Съвременна лирика", gradeLabel: "12 клас" }
    ]
  };

  const currentWorks = worksByGrade[user.grade || '7'];

  const handleWorkClick = async (work: { title: string, author: string }) => {
    setSelectedWork(work);
    setLoading(true);
    const res = await getLibraryDetails(work.title, work.author);
    setDetails(res);
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex-1 p-6 pb-24"
    >
      <div className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft size={20} /> Назад
        </button>
        <h2 className="text-3xl font-black flex items-center gap-3">
          <BookOpen className="text-secondary" size={32} />
          Библиотека
        </h2>
      </div>

      <AnimatePresence>
        {selectedWork ? (
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="space-y-6"
          >
            <button onClick={() => setSelectedWork(null)} className="flex items-center gap-2 text-secondary font-bold">
              <ArrowLeft size={20} /> Назад към списъка
            </button>
            
            <div className="p-6 bg-secondary/5 rounded-3xl border-2 border-secondary/20">
              <h3 className="text-2xl font-black text-secondary mb-1">{selectedWork.title}</h3>
              <p className="text-lg font-bold text-gray-600">{selectedWork.author}</p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto mb-4"></div>
                <p className="text-gray-400">Анализиране чрез AI...</p>
              </div>
            ) : details && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-lg font-black flex items-center gap-2 text-secondary">
                    <BookOpen size={20} />
                    Резюме
                  </h4>
                  <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 text-sm leading-relaxed text-gray-700">
                    {details.summary}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg font-black flex items-center gap-2 text-secondary">
                    <Zap size={20} />
                    Анализ и теми
                  </h4>
                  <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 text-sm leading-relaxed text-gray-700">
                    {details.analysis}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg font-black flex items-center gap-2 text-secondary">
                    <Users size={20} />
                    Герои
                  </h4>
                  <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 text-sm leading-relaxed text-gray-700">
                    {details.characters}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg font-black flex items-center gap-2 text-secondary">
                    <UserIcon size={20} />
                    За автора
                  </h4>
                  <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 text-sm leading-relaxed text-gray-700">
                    {details.authorInfo}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {currentWorks.map((work, i) => (
              <Card key={i} className="p-6" onClick={() => handleWorkClick(work)}>
                <h3 className="text-xl font-bold text-secondary mb-1">{work.title}</h3>
                <p className="font-medium text-gray-700">{work.author}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 bg-gray-100 rounded-full font-bold text-gray-400 uppercase">
                    {work.period}
                  </span>
                  {work.gradeLabel && (
                    <span className="text-[10px] px-2 py-1 bg-secondary/10 rounded-full font-bold text-secondary uppercase">
                      {work.gradeLabel}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
