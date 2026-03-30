import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, RotateCcw, Play, MapIcon, Maximize2, Minimize2, Trophy, Target, Volume2, VolumeX, Clock, Flag, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { calculateDistancePercent, calculateDistanceMeters, calculateScore, getScoreColor, getScoreBorderColor } from '../lib/utils';
import InteractiveMap from './InteractiveMap';

const CAMPAIGNS: { [key: string]: { name: string; color: string; subMaps: string[] } } = {
  'forgotten-castle': { name: 'Forgotten Castle', color: '#d4af37', subMaps: ['ruins', 'crypts', 'inferno'] },
  'goblin-caves': { name: 'Goblin Caves', color: '#22c55e', subMaps: ['goblin', 'firedeep'] },
  'frost-mountain': { name: 'Frost Mountain', color: '#3b82f6', subMaps: ['ice', 'ice-abyss'] },
  'blue-maelstrom': { name: 'Blue Maelstrom', color: '#06b6d4', subMaps: ['ship-graveyard'] },
};

const SUB_MAP_NAMES: { [key: string]: string } = {
  ruins: 'The Ruins',
  crypts: 'The Crypts',
  inferno: 'The Inferno',
  goblin: 'The Goblin Caves',
  firedeep: 'The Firedeep',
  ice: 'The Ice Cavern',
  'ice-abyss': 'The Ice Abyss',
  'ship-graveyard': 'The Ship Graveyard',
  mixed: 'Mixed',
};

const DIFFICULTIES: { [key: string]: { name: string; color: string; timeLimit: number | null; multiplier: number } } = {
  easy: { name: 'Easy', color: '#22c55e', timeLimit: null, multiplier: 1 },
  hard: { name: 'Hard', color: '#f59e0b', timeLimit: 30, multiplier: 1 },
  impossible: { name: 'Impossible', color: '#ef4444', timeLimit: 15, multiplier: 1 },
};

const TOTAL_ROUNDS = 5;
const MAX_SCORE_PER_ROUND = 5000;

const SOUNDS = {
  bgMusic: '/sounds/bg-music.mp3',
  green: '/sounds/green.mp3',
  timmy: '/sounds/timmy.mp3',
  timer: '/sounds/timer.mp3',
};

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gameState, setGameState] = useState<'select' | 'playing' | 'finished'>('select');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('easy');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedSubMap, setSelectedSubMap] = useState<string>('mixed');
  const [level, setLevel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGuess, setUserGuess] = useState<{ x: number; y: number } | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const [currentRound, setCurrentRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [usedLevelIds, setUsedLevelIds] = useState<string[]>([]);
  
  const [playerName, setPlayerName] = useState('');
  const [savingScore, setSavingScore] = useState(false);
  
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(10);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const greenSoundRef = useRef<HTMLAudioElement | null>(null);
  const timmySoundRef = useRef<HTMLAudioElement | null>(null);
  const timerSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'coordinates' | 'screenshot' | 'other'>('coordinates');
  const [reportComment, setReportComment] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (location.state?.campaign && location.state?.subMap) {
      setSelectedCampaign(location.state.campaign);
      setSelectedSubMap(location.state.subMap);
    }
  }, [location.state]);

  useEffect(() => {
    bgMusicRef.current = new Audio(SOUNDS.bgMusic);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = (volume / 100) * 0.15;
    
    greenSoundRef.current = new Audio(SOUNDS.green);
    greenSoundRef.current.volume = Math.min(1, (volume / 100) * 1.3);
    
    timmySoundRef.current = new Audio(SOUNDS.timmy);
    timmySoundRef.current.volume = Math.min(1, (volume / 100) * 1.3);

    timerSoundRef.current = new Audio(SOUNDS.timer);
    timerSoundRef.current.loop = true;
    timerSoundRef.current.volume = Math.min(1, (volume / 100) * 1.5);

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const vol = volume / 100;
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = vol * 0.15;
    }
    if (greenSoundRef.current) {
      greenSoundRef.current.volume = Math.min(1, vol * 1.3);
    }
    if (timmySoundRef.current) {
      timmySoundRef.current.volume = Math.min(1, vol * 1.3);
    }
    if (timerSoundRef.current) {
      timerSoundRef.current.volume = Math.min(1, vol * 1.5);
    }
  }, [volume]);

  useEffect(() => {
    if (bgMusicRef.current) {
      if (isMuted) {
        bgMusicRef.current.pause();
      } else if (gameState === 'playing') {
        bgMusicRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, gameState]);

  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, timerRunning]);

  useEffect(() => {
    if (timerSoundRef.current) {
      if (timeLeft <= 5 && timeLeft > 0 && timerRunning && !isMuted) {
        timerSoundRef.current.play().catch(() => {});
      } else {
        timerSoundRef.current.pause();
        timerSoundRef.current.currentTime = 0;
      }
    }
  }, [timeLeft, timerRunning, isMuted]);

  const playSound = (type: 'green' | 'timmy') => {
    if (isMuted) return;
    
    if (type === 'green' && greenSoundRef.current) {
      greenSoundRef.current.currentTime = 0;
      greenSoundRef.current.play().catch(() => {});
    } else if (type === 'timmy' && timmySoundRef.current) {
      timmySoundRef.current.currentTime = 0;
      timmySoundRef.current.play().catch(() => {});
    }
  };

  const handleStartGame = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    setCurrentRound(1);
    setTotalScore(0);
    setRoundScores([]);
    setUsedLevelIds([]);
    setGameState('playing');
    loadRandomLevel(difficulty);
  };

  const startTimer = (seconds: number) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setTimeLeft(seconds);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (timerSoundRef.current) {
      timerSoundRef.current.pause();
      timerSoundRef.current.currentTime = 0;
    }
  };

  const handleTimeUp = () => {
    stopTimer();
    setHasSubmitted(true);
    setShowResults(true);
    setScore(0);
    setDistanceMeters(9999);
    setRoundScores((prev) => [...prev, 0]);
    playSound('timmy');
  };

  const loadRandomLevel = async (difficulty?: string) => {
    setLoading(true);
    setUserGuess(null);
    setHasSubmitted(false);
    setScore(null);
    setDistanceMeters(null);
    setMapExpanded(false);
    setShowResults(false);
    stopTimer();

    const diffToUse = difficulty || selectedDifficulty;

    try {
      const levelsRef = collection(db, 'levels');
      let q;

      if (selectedCampaign !== 'all' && selectedSubMap !== 'mixed') {
        q = query(levelsRef, where('campaign', '==', selectedCampaign), where('sub_map', '==', selectedSubMap));
      } else if (selectedCampaign !== 'all' && selectedSubMap === 'mixed') {
        q = query(levelsRef, where('campaign', '==', selectedCampaign));
      } else {
        q = levelsRef;
      }

      const querySnapshot = await getDocs(q);
      const allLevels = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (allLevels.length === 0) {
        console.log('No levels found for this selection');
        setLevel(null);
        setLoading(false);
        return;
      }

      const availableLevels = allLevels.filter((level: any) => !usedLevelIds.includes(level.id));

      if (availableLevels.length === 0) {
        const randomIndex = Math.floor(Math.random() * allLevels.length);
        setLevel(allLevels[randomIndex]);
      } else {
        const randomIndex = Math.floor(Math.random() * availableLevels.length);
        const newLevel = availableLevels[randomIndex];
        setLevel(newLevel);
        setUsedLevelIds([...usedLevelIds, newLevel.id]);
      }

      const diff = DIFFICULTIES[diffToUse];
      
      if (diff.timeLimit) {
        setTimeout(() => {
          startTimer(diff.timeLimit!);
        }, 500);
      }
    } catch (error) {
      console.error('Error loading level:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (x: number, y: number) => {
    if (hasSubmitted) return;
    setUserGuess({ x, y });
  };

  const handleSubmit = () => {
    if (!userGuess || !level || hasSubmitted) return;

    stopTimer();

    const distPercent = calculateDistancePercent(
      userGuess.x,
      userGuess.y,
      level.target_x,
      level.target_y
    );

    const distMeters = calculateDistanceMeters(distPercent, level.map_scale_meters);
    const baseScore = calculateScore(distMeters, level.map_scale_meters);
    
    const diff = DIFFICULTIES[selectedDifficulty];
    const calculatedScore = Math.round(baseScore * diff.multiplier);

    setDistanceMeters(Math.round(distMeters * 10) / 10);
    setScore(calculatedScore);
    setHasSubmitted(true);
    setShowResults(true);
    setMapExpanded(true);

    if (calculatedScore >= 4000) {
      playSound('green');
    } else {
      playSound('timmy');
    }

    const newTotal = totalScore + calculatedScore;
    setTotalScore(newTotal);
    setRoundScores([...roundScores, calculatedScore]);
  };

  const handleReportSubmit = async () => {
    if (!level) return;
    
    setSubmittingReport(true);
    try {
      await addDoc(collection(db, 'reports'), {
        level_id: level.id,
        level_name: level.map_name,
        campaign: level.campaign,
        sub_map: level.sub_map,
        difficulty: level.difficulty,
        screenshot_url: level.screenshot_url,
        map_image_url: level.map_image_url,
        target_x: level.target_x,
        target_y: level.target_y,
        report_type: reportType,
        comment: reportComment,
        player_guess_x: userGuess?.x,
        player_guess_y: userGuess?.y,
        distance_meters: distanceMeters,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      alert('Thank you! Report submitted for review.');
      setShowReportModal(false);
      setReportComment('');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleNextRound = () => {
    if (currentRound >= TOTAL_ROUNDS) {
      setGameState('finished');
    } else {
      setCurrentRound(currentRound + 1);
      loadRandomLevel();
    }
  };

  const handlePlayAgain = () => {
    navigate('/campaign');
  };

  const handleBackToMenu = () => {
    navigate('/');
  };

  const handleSaveScore = async () => {
    if (!playerName.trim()) return;
    setSavingScore(true);
    try {
      await addDoc(collection(db, 'leaderboard'), {
        player_name: playerName.trim(),
        total_score: totalScore,
        campaign: selectedCampaign,
        sub_map: selectedSubMap,
        difficulty: selectedDifficulty,
        map_type: selectedSubMap === 'mixed' ? 'mixed' : selectedSubMap,
        rounds_completed: TOTAL_ROUNDS,
        created_at: new Date().toISOString(),
      });
      alert('Score saved to leaderboard!');
      setPlayerName('');
    } catch (error) {
      console.error('Error saving score:', error);
      alert('Failed to save score');
    } finally {
      setSavingScore(false);
    }
  };

  const getDisplayTitle = () => {
    if (selectedCampaign === 'all') {
      return 'Mixed Maps';
    }
    if (selectedSubMap === 'mixed') {
      return `${CAMPAIGNS[selectedCampaign]?.name} (Mixed)`;
    }
    return SUB_MAP_NAMES[selectedSubMap] || selectedSubMap;
  };

  const getDisplayColor = () => {
    if (selectedCampaign === 'all') {
      return '#a855f7';
    }
    return CAMPAIGNS[selectedCampaign]?.color || '#d4af37';
  };

  const currentDifficulty = DIFFICULTIES[selectedDifficulty];
  const maxPossibleScore = TOTAL_ROUNDS * MAX_SCORE_PER_ROUND * currentDifficulty.multiplier;
  const hasTimer = currentDifficulty.timeLimit !== null;
  const isUrgent = timeLeft <= 5 && timeLeft > 0 && hasTimer;

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  if (gameState === 'select') {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <button onClick={handleBackToMenu} className="mb-6 p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Home className="w-8 h-8 text-gold mx-auto" />
            </button>
            <h1 className="text-4xl md:text-5xl font-bold text-gold mb-4">Select Difficulty</h1>
            <p className="text-gray-400 text-lg">{getDisplayTitle()}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Object.entries(DIFFICULTIES).map(([key, diff]) => (
              <button
                key={key}
                onClick={() => handleStartGame(key)}
                className="group relative p-8 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ borderColor: diff.color + '60', backgroundColor: diff.color + '15' }}
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: diff.color + '30' }}>
                    {key === 'easy' ? (
                      <Play className="w-10 h-10" style={{ color: diff.color }} />
                    ) : (
                      <Clock className="w-10 h-10" style={{ color: diff.color }} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{diff.name}</h3>
                    <p className="text-gray-400 text-sm whitespace-pre-line">
                      {key === 'easy' && 'No time limit\nRelaxed gameplay'}
                      {key === 'hard' && '30 seconds per round\nSame scoring as Easy'}
                      {key === 'impossible' && '15 seconds per round\nSame scoring as Easy'}
                    </p>
                    {diff.timeLimit && (
                      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: diff.color + '20' }}>
                        <Clock className="w-4 h-4" style={{ color: diff.color }} />
                        <span className="text-white font-semibold">{diff.timeLimit}s</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading && gameState === 'playing') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-gold text-xl animate-pulse">Loading Level...</div>
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-black/50 border-2 border-gold rounded-2xl p-8 text-center space-y-6">
          <Trophy className="w-24 h-24 text-gold mx-auto" />
          <div>
            <h1 className="text-4xl font-bold text-gold mb-2">Game Complete!</h1>
            <p className="text-gray-400">Here's how you performed</p>
          </div>
          <div className="bg-black/50 rounded-xl p-6">
            <div className="text-6xl font-bold text-white mb-2">{totalScore.toLocaleString()}</div>
            <div className="text-gray-400">out of {maxPossibleScore.toLocaleString()} points</div>
            <div className="mt-4 w-full bg-gray-700 rounded-full h-4">
              <div className="bg-gold h-4 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalScore / maxPossibleScore) * 100)}%` }} />
            </div>
            <div className="text-gold mt-2 font-semibold">{Math.min(100, ((totalScore / maxPossibleScore) * 100)).toFixed(1)}% Accuracy</div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Round Breakdown</h3>
            <div className="grid grid-cols-5 gap-2">
              {roundScores.map((roundScore, index) => (
                <div 
                  key={index} 
                  className="rounded-lg p-3 border-2 bg-black/80"
                  style={{ borderColor: getScoreBorderColor(roundScore) }}
                >
                  <div className="text-xs text-gray-400 mb-1">Round {index + 1}</div>
                  <div 
                    className="font-bold text-lg"
                    style={{ color: getScoreColor(roundScore) }}
                  >
                    {roundScore}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gold/30 pt-6">
            <h3 className="text-lg font-bold text-white mb-4">Save Your Score</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="flex-1 px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold"
              />
              <button
                onClick={handleSaveScore}
                disabled={savingScore || !playerName.trim()}
                className="px-6 py-3 bg-gold text-dark font-bold rounded-lg hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingScore ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Name will be shown on the public leaderboard</p>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handlePlayAgain} className="flex-1 py-3 bg-red text-white font-bold rounded-lg hover:bg-red/90 transition-all flex items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
            <button onClick={() => navigate('/leaderboard')} className="flex-1 py-3 bg-transparent border-2 border-gold text-gold font-bold rounded-lg hover:bg-gold hover:text-dark transition-all flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              Leaderboard
            </button>
            <button onClick={handleBackToMenu} className="flex-1 py-3 bg-transparent border-2 border-gold text-gold font-bold rounded-lg hover:bg-gold hover:text-dark transition-all flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!level) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl text-white">No levels available</h2>
          <p className="text-gray-400">Please add some levels in the admin panel first.</p>
          <div className="flex gap-4">
            <button onClick={handleBackToMenu} className="px-6 py-3 bg-gold text-dark font-bold rounded-lg hover:bg-gold/90 transition-all">Back to Home</button>
            <button onClick={() => navigate('/admin')} className="px-6 py-3 bg-red text-white font-bold rounded-lg hover:bg-red/90 transition-all">Go to Admin Panel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white relative">
      {isUrgent && (
        <div className="fixed inset-0 z-[5] pointer-events-none animate-pulse" style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.3)'
        }} />
      )}

      {!hasSubmitted && (
        <div className="fixed inset-0 z-0">
          <img src={level.screenshot_url} alt="Game Location" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={handleBackToMenu} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Home className="w-6 h-6 text-gold" />
          </button>
          <div className="flex items-center gap-4">
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-black/50 backdrop-blur-sm" style={{ color: getDisplayColor() }}>
              {getDisplayTitle()}
            </span>
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-black/50 backdrop-blur-sm" style={{ color: currentDifficulty.color }}>
              {currentDifficulty.name}
            </span>
            <span className="text-gold font-semibold bg-black/50 px-4 py-1.5 rounded-full text-sm">
              Round {currentRound} / {TOTAL_ROUNDS}
            </span>
            <span className="text-white font-semibold bg-black/50 px-4 py-1.5 rounded-full text-sm">
              Score: {totalScore.toLocaleString()}
            </span>
            {hasTimer && (
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${
                timeLeft <= 5 ? 'bg-red-500/30 animate-pulse' : 'bg-black/50'
              }`}>
                <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-400' : 'text-gold'}`} />
                <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-lg">
              <Volume2 className="w-4 h-4 text-gold" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gold"
                title="Volume"
              />
              <span className="text-xs text-gold w-8">{volume}%</span>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-gold" />
              ) : (
                <Volume2 className="w-6 h-6 text-gold" />
              )}
            </button>
          </div>
        </div>
      </div>

      {userGuess && !hasSubmitted && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/90 text-white px-6 py-3 rounded-full font-semibold shadow-lg animate-pulse">
          ✓ Guess Placed - Click Submit
        </div>
      )}

      {showResults && score !== null && (
        <div className="fixed top-20 left-4 z-50 bg-gray-900/95 border-2 border-gold rounded-2xl p-10 backdrop-blur-sm shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gold">
              <Target className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Round {currentRound} Results</h2>
            </div>
            <div className="text-6xl font-bold" style={{ color: score > 0 ? currentDifficulty.color : '#ef4444' }}>
              {score} Points
            </div>
            <div className="text-gray-300 text-lg">
              <div>Distance: <span className="text-white font-semibold text-xl">{distanceMeters === 9999 ? 'Time Expired' : (distanceMeters || 0) + ' meters'}</span></div>
              <div>Total Score: <span className="text-white font-semibold text-xl">{totalScore.toLocaleString()} / {maxPossibleScore.toLocaleString()}</span></div>
            </div>
            {distanceMeters !== 9999 && distanceMeters !== null && distanceMeters <= 2 && <p className="text-green-400 font-bold text-2xl animate-pulse">🏆 PERFECT!</p>}
            {distanceMeters !== 9999 && distanceMeters !== null && distanceMeters <= 5 && distanceMeters > 2 && <p className="text-green-300 font-bold text-2xl animate-pulse">🔥 Excellent!</p>}
            {distanceMeters !== 9999 && distanceMeters !== null && distanceMeters <= 10 && distanceMeters > 5 && <p className="text-yellow-400 font-bold text-2xl animate-pulse">👍 Good!</p>}
            {distanceMeters === 9999 && <p className="text-red-400 font-bold text-2xl animate-pulse">⏰ Time's Up!</p>}
            
            {/* Next Round Button - Primary Action (Big & Red) */}
            <button onClick={handleNextRound} className="w-full py-5 bg-red text-white text-xl font-bold rounded-lg hover:bg-red/90 transition-all flex items-center justify-center gap-3 shadow-lg">
              {currentRound >= TOTAL_ROUNDS ? 'See Final Results' : 'Next Round'}
              <Play className="w-6 h-6" />
            </button>
            
            {/* Report Button - Subtle Secondary Action (Small & Gray/Red) */}
            <div className="pt-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full py-2 text-gray-500 hover:text-red-400 transition-all flex items-center justify-center gap-1.5 text-xs"
              >
                <Flag className="w-3.5 h-3.5" />
                Report Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 border-2 border-gold rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gold">Report Issue</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Issue Type</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setReportType('coordinates')}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      reportType === 'coordinates'
                        ? 'border-gold bg-gold/20 text-white'
                        : 'border-gray-600 bg-black/50 text-gray-400'
                    }`}
                  >
                    📍 Wrong Coordinates
                    <p className="text-xs text-gray-500 mt-1">Target pin is in the wrong location</p>
                  </button>
                  <button
                    onClick={() => setReportType('screenshot')}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      reportType === 'screenshot'
                        ? 'border-gold bg-gold/20 text-white'
                        : 'border-gray-600 bg-black/50 text-gray-400'
                    }`}
                  >
                    🖼️ Bad Screenshot
                    <p className="text-xs text-gray-500 mt-1">UI visible, wrong image, or quality issue</p>
                  </button>
                  <button
                    onClick={() => setReportType('other')}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      reportType === 'other'
                        ? 'border-gold bg-gold/20 text-white'
                        : 'border-gray-600 bg-black/50 text-gray-400'
                    }`}
                  >
                    📝 Other
                    <p className="text-xs text-gray-500 mt-1">Something else is wrong</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white mb-2">Comment (Optional)</label>
                <textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  disabled={submittingReport}
                  className="flex-1 py-3 bg-gold text-dark font-bold rounded-lg hover:bg-gold/90 transition-all disabled:opacity-50"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`fixed z-40 transition-all duration-700 ease-out ${
          hasSubmitted 
            ? 'inset-0 w-full h-full' 
            : mapExpanded 
              ? 'bottom-8 right-8 w-[600px] h-[600px]'
              : 'bottom-8 right-8 w-[300px] h-[300px]'
        }`}
        onMouseEnter={() => !hasSubmitted && setMapExpanded(true)}
        onMouseLeave={() => !hasSubmitted && setMapExpanded(false)}
      >
        <div className={`w-full h-full rounded-xl border-2 border-gold/50 overflow-hidden shadow-2xl ${
          hasSubmitted ? 'bg-gray-600' : 'bg-gray-900/95'
        }`}>
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gray-800/90">
            <div className="flex items-center gap-2 text-gold text-sm">
              <MapIcon className="w-4 h-4" />
              <span className="font-semibold">
                {hasSubmitted ? '📍 Result View' : 'Map'}
              </span>
            </div>
            {!hasSubmitted && (
              <button
                onClick={() => setMapExpanded(!mapExpanded)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                {mapExpanded ? <Minimize2 className="w-4 h-4 text-gold" /> : <Maximize2 className="w-4 h-4 text-gold" />}
              </button>
            )}
          </div>
          <div className="w-full h-full pt-10">
            <InteractiveMap
              imageUrl={level.map_image_url}
              onMapClick={handleMapClick}
              userPin={userGuess ? { x: userGuess.x, y: userGuess.y, color: '#3b82f6' } : null}
              targetPin={hasSubmitted ? { x: level.target_x, y: level.target_y, color: '#ef4444' } : null}
              disabled={hasSubmitted}
              showDistance={hasSubmitted}
              mapScaleMeters={level.map_scale_meters}
              autoZoomOnSubmit={hasSubmitted}
            />
          </div>
          {!hasSubmitted && userGuess && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
              <button onClick={handleSubmit} className="w-full py-3 bg-red text-white font-bold rounded-lg hover:bg-red/90 transition-all shadow-lg">
                Submit Guess
              </button>
            </div>
          )}
          {hasSubmitted && (
            <div className="absolute bottom-4 left-4 z-10 bg-green-900/90 px-4 py-2 rounded-lg border border-green-500">
              <p className="text-green-400 font-semibold text-sm">
                ✓ Guess Submitted - {distanceMeters === 9999 ? 'Time Expired' : (distanceMeters || 0) + 'm from target'}
              </p>
            </div>
          )}
        </div>
      </div>

      {!userGuess && !hasSubmitted && (
        <div className="fixed bottom-8 left-8 z-40 text-white/60 text-sm">
          <p>Click on the map to place your guess</p>
          {hasTimer && <p className="text-yellow-400 mt-1">⏱️ Timer is running!</p>}
        </div>
      )}
    </div>
  );
}