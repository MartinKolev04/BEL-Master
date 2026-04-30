import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card } from '../../components/ui';
import { Clock, Trophy, Users, XCircle } from '../../components/icons';
import { useTranslation } from '../../i18n';
import { ROUTES } from '../../navigation/routes';
import { authService } from '../../services/firebase/AuthService';
import { lobbyRepository } from '../../services/repositories/LobbyRepository';
import { questionsRepository } from '../../services/repositories/QuestionsRepository';
import { useUserProfile } from '../../store/UserProfileContext';
import { fallbackPlayerColor, playerPalette } from '../../theme/colors';
import { cn } from '../../utils/cn';

export function MultiplayerScreen() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const { t } = useTranslation();
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40);

  if (!profile) return null;
  const user = profile;

  const onClose = () => router.replace(ROUTES.HOME as never);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.status, lobby?.roundStatus, lobby?.questionStartedAt, lobbyId]);

  useEffect(() => {
    if (lobby?.status === 'waiting' && user.uid === lobby.hostId) {
      const players = Object.values(lobby.players);
      if (players.length >= 2 && players.every((p: any) => p.ready)) {
        if (!loading && !lobby.starting) {
          startBattle();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.players, lobby?.status, lobby?.hostId, user.uid, loading]);

  useEffect(() => {
    if (!lobbyId) return;
    const unsubscribe = lobbyRepository.observe(
      lobbyId,
      (data) => {
        if (data) setLobby(data);
        else {
          setLobbyId(null);
          setLobby(null);
        }
      },
      (error) => console.error('Lobby observation error:', error),
    );
    return () => unsubscribe();
  }, [lobbyId]);

  useEffect(() => {
    if (lobby?.roundStatus === 'question') {
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }, [lobby?.currentQuestionIndex, lobby?.roundStatus]);

  const handleTimeout = async () => {
    if (!lobbyId || !lobby || lobby.roundStatus !== 'question') return;
    try {
      const currentIdx = lobby.currentQuestionIndex || 0;
      const questionsCount = lobby.questions?.length || 0;
      const isLastQuestion = currentIdx >= questionsCount - 1;
      if (isLastQuestion) {
        await lobbyRepository.update(lobbyId, { status: 'finished' });
      } else {
        await lobbyRepository.update(lobbyId, {
          currentQuestionIndex: currentIdx + 1,
          questionStartedAt: Date.now(),
          winnerId: null,
          roundStatus: 'question',
        });
      }
    } catch (error) {
      console.error('Timeout error:', error);
    }
  };

  const createLobby = async () => {
    setLoading(true);
    try {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase();
      await lobbyRepository.create(id, {
        id,
        hostId: user.uid,
        status: 'waiting',
        roundStatus: 'question',
        winnerId: null,
        starting: false,
        players: {
          [user.uid]: {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Анонимен',
            score: 0,
            ready: false,
            photoURL: authService.currentUser?.photoURL || '',
            color: playerPalette[0],
          },
        },
        grid: Array(9).fill(null),
        questions: [],
        currentQuestionIndex: 0,
      });
      setLobbyId(id);
    } catch (error) {
      console.error('Lobby create error:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async () => {
    if (!joinCode) return;
    setLoading(true);
    try {
      const code = joinCode.toUpperCase();
      const existing = await lobbyRepository.fetch(code);
      if (!existing) {
        Alert.alert(t.multiplayer.invalidCode);
        return;
      }
      if (existing.status !== 'waiting') {
        Alert.alert(t.multiplayer.gameAlreadyStarted);
        return;
      }
      const playerCount = Object.keys(existing.players).length;
      await lobbyRepository.update(code, {
        [`players.${user.uid}`]: {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Анонимен',
          score: 0,
          ready: false,
          photoURL: authService.currentUser?.photoURL || '',
          color: playerPalette[playerCount] || fallbackPlayerColor,
        },
      });
      setLobbyId(code);
    } catch (error) {
      console.error('Lobby join error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = async () => {
    if (!lobbyId || !lobby) return;
    try {
      await lobbyRepository.update(lobbyId, {
        [`players.${user.uid}.ready`]: !lobby.players[user.uid].ready,
      });
    } catch (error) {
      console.error('Toggle ready error:', error);
    }
  };

  const startBattle = async () => {
    if (!lobbyId || !lobby || loading) return;
    setLoading(true);
    try {
      await lobbyRepository.update(lobbyId, { starting: true });

      const questions = await questionsRepository.list(user.grade || '7', 'grammar', true);

      if (!questions || questions.length === 0) {
        if (user.grade !== '7') {
          const fallback = await questionsRepository.list('7', 'grammar', true);
          if (fallback && fallback.length > 0) {
            await finalizeStartBattle(fallback);
            return;
          }
        }
        Alert.alert(t.multiplayer.questionGenerationError);
        await lobbyRepository.update(lobbyId, { starting: false });
        return;
      }

      await finalizeStartBattle(questions);
    } catch (error) {
      console.error('[Multiplayer] Start battle error:', error);
      Alert.alert(
        `Грешка при стартиране на играта: ${
          error instanceof Error ? error.message : 'Неизвестна грешка'
        }`,
      );
      try {
        await lobbyRepository.update(lobbyId, { starting: false });
      } catch (recoveryError) {
        console.error('Recovery update failed:', recoveryError);
      }
    } finally {
      setLoading(false);
    }
  };

  const finalizeStartBattle = async (incoming: any[]) => {
    if (!lobby || !lobbyId) return;
    const playerIds = Object.keys(lobby.players);
    const newGrid = [...(lobby.grid || Array(9).fill(null))];

    if (playerIds.length >= 2) {
      newGrid[0] = playerIds[0];
      newGrid[8] = playerIds[1];
    }
    if (playerIds.length >= 3) newGrid[2] = playerIds[2];
    if (playerIds.length >= 4) newGrid[6] = playerIds[3];

    try {
      await lobbyRepository.update(lobbyId, {
        status: 'playing',
        roundStatus: 'question',
        questions: incoming.map((q) => {
          const cleanQ: any = {
            id: q.id || Math.random().toString(36).substring(2, 9),
            question: q.question || '',
            options: q.options || [],
            correctAnswer: q.correctAnswer ?? -1,
            explanation: q.explanation || '',
            category: q.category || 'grammar',
            type: q.type || 'multiple_choice',
          };
          if (q.correctAnswerText !== undefined) cleanQ.correctAnswerText = q.correctAnswerText;
          if (q.context !== undefined) cleanQ.context = q.context;
          if (q.matchingItems !== undefined) cleanQ.matchingItems = q.matchingItems;
          return cleanQ;
        }),
        currentQuestionIndex: 0,
        grid: newGrid,
        questionStartedAt: Date.now(),
        starting: false,
      });
    } catch (error) {
      console.error('[Multiplayer] Finalize start battle error:', error);
      try {
        await lobbyRepository.update(lobbyId, { starting: false });
      } catch (recoveryError) {
        console.error('Recovery update failed:', recoveryError);
      }
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (!lobbyId || !lobby || isAnswered || lobby.roundStatus !== 'question') return;

    const playerSquares = lobby.grid.filter((cell: string | null) => cell === user.uid).length;
    if (playerSquares === 0) {
      Alert.alert('Ти си елиминиран и не можеш да отговаряш!');
      return;
    }

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const currentQ = lobby.questions[lobby.currentQuestionIndex];
    const isCorrect = optionIndex === currentQ.correctAnswer;

    if (isCorrect) {
      try {
        await lobbyRepository.claimRoundIfQuestionActive(lobbyId, user.uid, 10);
      } catch (error) {
        console.error('Claim round error:', error);
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
      { r: row, c: col + 1 },
    ];
    return neighbors.some((n) => {
      if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
        const neighborIndex = n.r * size + n.c;
        return lobby.grid[neighborIndex] === user.uid;
      }
      return false;
    });
  };

  const claimSquare = async (index: number) => {
    if (
      !lobbyId ||
      !lobby ||
      lobby.roundStatus !== 'picking' ||
      lobby.winnerId !== user.uid ||
      lobby.grid[index] === user.uid ||
      claiming
    )
      return;

    if (!isAdjacentToOwn(index)) {
      Alert.alert('Можеш да завладяваш само съседни на твоите квадратчета!');
      return;
    }

    setClaiming(true);
    try {
      const newGrid = [...lobby.grid];
      newGrid[index] = user.uid;

      const alivePlayers = Object.keys(lobby.players).filter((pid) =>
        newGrid.some((cell) => cell === pid),
      );
      const isLastQuestion = lobby.currentQuestionIndex >= lobby.questions.length - 1;
      const isOnePlayerLeft = alivePlayers.length <= 1;
      const isGridFull = newGrid.every((cell) => cell !== null);

      if (isLastQuestion || isOnePlayerLeft || isGridFull) {
        await lobbyRepository.update(lobbyId, { grid: newGrid, status: 'finished' });
      } else {
        await lobbyRepository.update(lobbyId, {
          grid: newGrid,
          roundStatus: 'question',
          currentQuestionIndex: lobby.currentQuestionIndex + 1,
          winnerId: null,
          questionStartedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Claim square error:', error);
    } finally {
      setClaiming(false);
    }
  };

  if (!lobbyId) {
    return (
      <ScrollView className="flex-1 bg-white dark:bg-bg-dark" contentContainerStyle={{ flexGrow: 1 }}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 p-6 items-center justify-center"
        >
          <View className="w-20 h-20 bg-accent/10 rounded-full items-center justify-center mb-6">
            <Users size={40} className="text-accent" />
          </View>
          <Text className="text-3xl font-black mb-2 dark:text-white text-center">Мултиплейър Битка</Text>
          <Text className="text-gray-500 dark:text-gray-400 mb-8 text-center">
            Предизвикай приятел или се включи в съществуваща игра!
          </Text>

          <View className="w-full">
            <Button onPress={createLobby} disabled={loading}>
              {loading ? 'Създаване...' : 'Създай нова битка'}
            </Button>

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-800" />
              <Text className="px-2 text-xs uppercase text-gray-400">{t.app.or}</Text>
              <View className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-800" />
            </View>

            <TextInput
              placeholder={t.multiplayer.enterCode}
              placeholderTextColor="#9CA3AF"
              value={joinCode}
              onChangeText={(value) => setJoinCode(value.toUpperCase())}
              autoCapitalize="characters"
              className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 text-center font-bold tracking-widest dark:text-white mb-2"
            />
            <Button variant="outline" onPress={joinLobby} disabled={loading || !joinCode}>
              Присъедини се
            </Button>

            <Pressable onPress={onClose} className="w-full py-3 mt-4">
              <Text className="text-gray-400 dark:text-gray-500 font-bold text-center">{t.app.back}</Text>
            </Pressable>
          </View>
        </MotiView>
      </ScrollView>
    );
  }

  if (lobby?.status === 'waiting') {
    return (
      <ScrollView className="flex-1 bg-white dark:bg-bg-dark" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6">
          <View className="flex-1 items-center justify-center">
            <View className="bg-accent/10 p-4 rounded-2xl mb-4 items-center">
              <Text className="text-sm font-bold text-accent uppercase tracking-widest">
                Код за битка
              </Text>
              <Text className="text-4xl font-black text-accent">{lobbyId}</Text>
            </View>
            <Text className="text-gray-500 dark:text-gray-400 mb-8 text-center">
              Изчакваме играчите да се подготвят...
            </Text>

            <View className="w-full mb-8">
              {Object.values(lobby.players).map((player: any) => (
                <View
                  key={player.uid}
                  className="flex-row items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700 mb-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-accent rounded-full items-center justify-center">
                      <Text className="text-white font-bold">{player.name[0]}</Text>
                    </View>
                    <Text className="font-bold dark:text-white">{player.name}</Text>
                  </View>
                  {player.ready ? (
                    <View className="bg-green-50 px-3 py-1 rounded-full">
                      <Text className="text-xs font-bold text-green-500">ГОТОВ</Text>
                    </View>
                  ) : (
                    <View className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                      <Text className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        ЧАКА
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View>
            <View className="mb-3">
              <Button
                variant={lobby.players[user.uid]?.ready ? 'outline' : 'accent'}
                onPress={toggleReady}
              >
                {lobby.players[user.uid]?.ready ? 'Не съм готов' : 'Готов съм!'}
              </Button>
            </View>

            {user.uid === lobby.hostId && (
              <View className="mb-3">
                <Button
                  onPress={startBattle}
                  disabled={
                    !Object.values(lobby.players).every((p: any) => p.ready) ||
                    Object.values(lobby.players).length < 2
                  }
                >
                  Започни битката
                </Button>
              </View>
            )}

            <Pressable onPress={() => setLobbyId(null)} className="w-full py-3">
              <Text className="text-gray-400 dark:text-gray-500 font-bold text-center">Напусни</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (lobby?.status === 'playing' && lobby.questions.length > 0) {
    const currentQ = lobby.questions[lobby.currentQuestionIndex];
    const isWinner = lobby.winnerId === user.uid;
    const winnerName = lobby.winnerId ? lobby.players[lobby.winnerId]?.name : '';
    const isEliminated =
      lobby.grid.filter((cell: string | null) => cell === user.uid).length === 0;

    return (
      <ScrollView className="flex-1 bg-white dark:bg-bg-dark" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-4">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row -space-x-2">
              {Object.values(lobby.players).map((player: any) => {
                const squares = lobby.grid.filter((c: string | null) => c === player.uid).length;
                const eliminated = squares === 0;
                return (
                  <View
                    key={player.uid}
                    className={cn(
                      'w-10 h-10 rounded-full border-2 border-white items-center justify-center',
                      eliminated && 'opacity-30',
                    )}
                    style={{ backgroundColor: player.color }}
                  >
                    <Text className="font-bold text-xs text-white">{player.name[0]}</Text>
                  </View>
                );
              })}
            </View>
            <View className="bg-accent/10 px-4 py-1 rounded-full flex-row items-center gap-2">
              <Clock size={14} className="text-accent" />
              <Text className="text-accent font-bold text-sm">{timeLeft}s</Text>
            </View>
          </View>

          <View className="mb-6">
            <View
              className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 self-center"
              style={{ width: 300, height: 300 }}
            >
              <View className="flex-row flex-wrap" style={{ width: '100%', height: '100%' }}>
                {lobby.grid.map((cell: string | null, idx: number) => {
                  const canClaim =
                    lobby.roundStatus === 'picking' &&
                    isWinner &&
                    lobby.grid[idx] !== user.uid &&
                    isAdjacentToOwn(idx);
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => claimSquare(idx)}
                      style={{
                        width: '33.333%',
                        height: '33.333%',
                        padding: 4,
                      }}
                    >
                      <View
                        className={cn(
                          'flex-1 rounded-md',
                          canClaim
                            ? 'bg-accent/20 border-2 border-accent/40 animate-pulse'
                            : 'bg-white dark:bg-gray-900',
                        )}
                        style={cell ? { backgroundColor: lobby.players[cell]?.color } : {}}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {lobby.roundStatus === 'picking' && (
              <View className="mt-3 items-center">
                {isWinner ? (
                  <Text className="text-accent font-black animate-bounce">
                    Твой ред е! Избери съседно квадратче!
                  </Text>
                ) : (
                  <Text className="text-gray-500 dark:text-gray-400 font-bold">
                    {winnerName} избира квадратче...
                  </Text>
                )}
              </View>
            )}
          </View>

          {lobby.roundStatus === 'question' && (
            <View className="flex-1">
              {isEliminated ? (
                <View className="flex-1 items-center justify-center p-6">
                  <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                    <XCircle size={32} className="text-red-500" />
                  </View>
                  <Text className="text-xl font-black text-gray-400 dark:text-gray-500">
                    Ти си елиминиран
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    Изчакай края на битката...
                  </Text>
                </View>
              ) : (
                <>
                  <View className="mb-4">
                    <View
                      className={cn(
                        'w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden',
                      )}
                    >
                      <View
                        style={{ width: `${(timeLeft / 40) * 100}%`, height: '100%' }}
                        className={cn(timeLeft < 10 ? 'bg-red-500' : 'bg-accent')}
                      />
                    </View>
                  </View>
                  <Text className="text-xl font-black mb-6 text-center leading-tight dark:text-white">
                    {currentQ.question}
                  </Text>
                  <View>
                    {currentQ.options.map((option: string, index: number) => {
                      let optionClass = 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900';
                      if (isAnswered) {
                        if (index === currentQ.correctAnswer)
                          optionClass = 'bg-primary border-primary';
                        else if (index === selectedOption)
                          optionClass = 'bg-error border-error';
                      } else if (selectedOption === index) {
                        optionClass = 'bg-accent border-accent';
                      }
                      const filled =
                        (isAnswered && (index === currentQ.correctAnswer || index === selectedOption)) ||
                        (!isAnswered && selectedOption === index);
                      return (
                        <Card
                          key={index}
                          onPress={() => handleAnswer(index)}
                          className={cn('p-3 mb-2', optionClass)}
                        >
                          <Text className={cn('text-base font-bold', filled ? 'text-white' : 'dark:text-white')}>
                            {option}
                          </Text>
                        </Card>
                      );
                    })}
                  </View>
                  {isAnswered && (
                    <MotiView
                      from={{ opacity: 0, translateY: 10 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-gray-100 dark:border-gray-700"
                    >
                      <Text className="text-xs text-gray-600 dark:text-gray-300 italic">
                        {currentQ.explanation}
                      </Text>
                    </MotiView>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  if (lobby?.status === 'finished') {
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
      <ScrollView className="flex-1 bg-white dark:bg-bg-dark" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 items-center justify-center">
          <View
            className="w-24 h-24 bg-yellow-400 rounded-full items-center justify-center mb-6"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Trophy size={48} className="text-white" />
          </View>
          <Text className="text-3xl font-black mb-2 dark:text-white">Край на битката!</Text>
          <Text className="text-gray-500 dark:text-gray-400 mb-8">Завладени територии</Text>

          <View className="w-full mb-8">
            {sortedPlayers.map((player: any, index: number) => (
              <View
                key={player.uid}
                className={cn(
                  'flex-row items-center justify-between p-4 rounded-2xl border-2 mb-3',
                  index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700',
                )}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="font-black text-lg text-gray-400 dark:text-gray-500 w-6">
                    {index + 1}.
                  </Text>
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: player.color }}
                  >
                    <Text className="text-white font-bold">{player.name[0]}</Text>
                  </View>
                  <Text className="font-bold dark:text-white">{player.name}</Text>
                </View>
                <Text className="font-black text-accent">
                  {squareCounts[player.uid] || 0} квадрата
                </Text>
              </View>
            ))}
          </View>

          <Button onPress={onClose}>Към началния екран</Button>
        </View>
      </ScrollView>
    );
  }

  return null;
}
