import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RotateCcw, Play, MapIcon, Maximize2, Minimize2, Trophy, Target, Volume2, VolumeX } from 'lucide-react';
import { supabase, Level, MapType } from '../lib/supabase';
import { calculateDistancePercent, calculateDistanceMeters, calculateScore, getMapTypeName, getMapTypeColor, getScoreColor, getScoreBorderColor } from '../lib/utils';
import InteractiveMap from './InteractiveMap';

const MAP_TYPES: { value: MapType | 'all'; label: string; description: string; color: string }[] = [
  { value: 'ruins', label: 'Ancient Ruins', description: 'Explore forgotten temples', color: '#d4af37' },
  { value: 'goblin', label: 'Goblin Caves', description: 'Navigate dark caverns', color: '#22c55e' },
  { value: 'ice', label: 'Ice Caverns', description: 'Brave the frozen depths', color: '#3b82f6' },
  { value: 'all', label: 'Mixed Maps', description: 'All locations combined', color: '#a855f7' },
];

const TOTAL_ROUNDS = 5;
const MAX_SCORE_PER_ROUND = 5000;

// Local sound files (in public/sounds/)
const SOUNDS = {
  bgMusic: '/sounds/bg-music.mp3',
  green: '/sounds/green.mp3',
  timmy: '/sounds/timmy.mp3',
};

export default function GamePage() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [selectedMapType, setSelectedMapType] = useState<MapType | 'all'>('all');
  const [level, setLevel] = useState<Level | null>(null);
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
  const [usedLevelIds, setUsedLevelIds] = useState<number[]>([]);
  
  const [playerName, setPlayerName] = useState('');
  const [savingScore, setSavingScore] = useState(false);
  
  // Sound state
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(10); // 50% default volume
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const greenSoundRef = useRef<HTMLAudioElement | null>(null);
  const timmySoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sounds
  useEffect(() => {
    // Background music - 50% LOWER (15% of master volume instead of 30%)
    bgMusicRef.current = new Audio(SOUNDS.bgMusic);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = (volume / 100) * 0.15; // 15% volume (50% lower)
    
    // Green/Perfect sound (4000+ points) - 30% LOUDER
    greenSoundRef.current = new Audio(SOUNDS.green);
    greenSoundRef.current.volume = Math.min(1, (volume / 100) * 1.3); // 130% volume (capped at 100%)
    
    // Timmy sound (under 4000 points) - 30% LOUDER
    timmySoundRef.current = new Audio(SOUNDS.timmy);
    timmySoundRef.current.volume = Math.min(1, (volume / 100) * 1.3); // 130% volume (capped at 100%)

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    const vol = volume / 100;
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = vol * 0.15; // 50% lower
    }
    if (greenSoundRef.current) {
      greenSoundRef.current.volume = Math.min(1, vol * 1.3); // 30% louder
    }
    if (timmySoundRef.current) {
      timmySoundRef.current.volume = Math.min(1, vol * 1.3); // 30% louder
    }
  }, [volume]);

  // Start/stop background music
  useEffect(() => {
    if (bgMusicRef.current) {
      if (isMuted) {
        bgMusicRef.current.pause();
      } else if (gameState === 'playing') {
        bgMusicRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, gameState]);

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

  const loadRandomLevel = async () => {
    setLoading(true);
    setUserGuess(null);
    setHasSubmitted(false);
    setScore(null);
    setDistanceMeters(null);
    setMapExpanded(false);
    setShowResults(false);

    try {
      let query = supabase.from('levels').select('*');
      
      if (selectedMapType !== 'all') {
        query = query.eq('map_type', selectedMapType);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No levels found');
        setLevel(null);
        return;
      }

      const availableLevels = data.filter((level: Level) => !usedLevelIds.includes(level.id));

      if (availableLevels.length === 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        setLevel(data[randomIndex]);
      } else {
        const randomIndex = Math.floor(Math.random() * availableLevels.length);
        const newLevel = availableLevels[randomIndex];
        setLevel(newLevel);
        setUsedLevelIds([...usedLevelIds, newLevel.id]);
      }

      setGameState('playing');
    } catch (error) {
      console.error('Error loading level:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = (mapType: MapType | 'all') => {
    setSelectedMapType(mapType);
    setCurrentRound(1);
    setTotalScore(0);
    setRoundScores([]);
    setUsedLevelIds([]);
    loadRandomLevel();
  };

  const handleMapClick = (x: number, y: number) => {
    if (hasSubmitted) return;
    setUserGuess({ x, y });
  };

  const handleSubmit = () => {
    if (!userGuess || !level || hasSubmitted) return;

    const distPercent = calculateDistancePercent(
      userGuess.x,
      userGuess.y,
      level.target_x,
      level.target_y
    );

    const distMeters = calculateDistanceMeters(distPercent, level.map_scale_meters);
    const calculatedScore = calculateScore(distMeters, level.map_scale_meters);

    setDistanceMeters(Math.round(distMeters * 10) / 10);
    setScore(calculatedScore);
    setHasSubmitted(true);
    setShowResults(true);
    setMapExpanded(true);

    // Play sound based on score
    if (calculatedScore >= 4000) {
      playSound('green'); // Green for good scores
    } else {
      playSound('timmy'); // Timmy for everything else
    }

    const newTotal = totalScore + calculatedScore;
    setTotalScore(newTotal);
    setRoundScores([...roundScores, calculatedScore]);
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
    setGameState('menu');
    setCurrentRound(1);
    setTotalScore(0);
    setRoundScores([]);
    setUsedLevelIds([]);
    setPlayerName('');
  };

  const handleBackToMenu = () => {
    setGameState('menu');
    setCurrentRound(1);
    setTotalScore(0);
    setRoundScores([]);
    setUsedLevelIds([]);
    setLevel(null);
    setUserGuess(null);
    setHasSubmitted(false);
    setScore(null);
    setDistanceMeters(null);
    setMapExpanded(false);
    setShowResults(false);
    setPlayerName('');
  };

  const handleSaveScore = async () => {
    if (!playerName.trim()) return;
    setSavingScore(true);
    try {
      const { error } = await supabase.from('leaderboard').insert({
        player_name: playerName.trim(),
        total_score: totalScore,
        map_type: selectedMapType,
        rounds_completed: TOTAL_ROUNDS,
      });
      if (error) throw error;
      alert('Score saved to leaderboard!');
      setPlayerName('');
    } catch (error) {
      console.error('Error saving score:', error);
      alert('Failed to save score');
    } finally {
      setSavingScore(false);
    }
  };

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

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <button onClick={() => navigate('/')} className="mb-6 p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Home className="w-8 h-8 text-gold mx-auto" />
            </button>
            <h1 className="text-4xl md:text-5xl font-bold text-gold mb-4">Choose Your Adventure</h1>
            <p className="text-gray-400 text-lg">Select a dungeon type to explore</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {MAP_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleStartGame(type.value as MapType | 'all')}
                className="group relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ borderColor: type.color + '40', backgroundColor: type.color + '10' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: type.color + '30' }}>
                    <Play className="w-8 h-8" style={{ color: type.color }} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{type.label}</h3>
                    <p className="text-gray-400 text-sm">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => handleStartGame('all')} className="px-8 py-4 bg-red text-white text-lg font-bold rounded-lg hover:bg-red/90 transition-all transform hover:scale-105 shadow-lg">
              <Play className="w-5 h-5 inline mr-2" />
              Quick Start - Mixed Maps
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const maxPossibleScore = TOTAL_ROUNDS * MAX_SCORE_PER_ROUND;
    const percentage = (totalScore / maxPossibleScore) * 100;

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
              <div className="bg-gold h-4 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
            </div>
            <div className="text-gold mt-2 font-semibold">{percentage.toFixed(1)}% Accuracy</div>
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
            <button onClick={() => navigate('/')} className="flex-1 py-3 bg-transparent border-2 border-gold text-gold font-bold rounded-lg hover:bg-gold hover:text-dark transition-all flex items-center justify-center gap-2">
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
            <button onClick={handleBackToMenu} className="px-6 py-3 bg-gold text-dark font-bold rounded-lg hover:bg-gold/90 transition-all">Back to Menu</button>
            <button onClick={() => navigate('/admin')} className="px-6 py-3 bg-red text-white font-bold rounded-lg hover:bg-red/90 transition-all">Go to Admin Panel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white relative">
      {!hasSubmitted && (
        <div className="fixed inset-0 z-0">
          <img src={level.screenshot_url} alt="Game Location" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Header with Mute Button + Volume Slider */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={handleBackToMenu} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Home className="w-6 h-6 text-gold" />
          </button>
          <div className="flex items-center gap-4">
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-black/50 backdrop-blur-sm" style={{ color: getMapTypeColor(level.map_type) }}>
              {getMapTypeName(level.map_type)}
            </span>
            <span className="text-gold font-semibold bg-black/50 px-4 py-1.5 rounded-full text-sm">
              Round {currentRound} / {TOTAL_ROUNDS}
            </span>
            <span className="text-white font-semibold bg-black/50 px-4 py-1.5 rounded-full text-sm">
              Score: {totalScore.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Volume Slider */}
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
            {/* Mute Button */}
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

      {showResults && score !== null && distanceMeters !== null && (
        <div className="fixed top-20 left-4 z-50 bg-gray-900/95 border-2 border-gold rounded-2xl p-10 backdrop-blur-sm shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gold">
              <Target className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Round {currentRound} Results</h2>
            </div>
            <div className="text-6xl font-bold text-gold">{score} Points</div>
            <div className="text-gray-300 text-lg">
              <div>Distance: <span className="text-white font-semibold text-xl">{distanceMeters} meters</span> off</div>
              <div>Total Score: <span className="text-white font-semibold text-xl">{totalScore.toLocaleString()} / {TOTAL_ROUNDS * MAX_SCORE_PER_ROUND}</span></div>
            </div>
            {distanceMeters <= 2 && <p className="text-green-400 font-bold text-2xl animate-pulse">🏆 PERFECT!</p>}
            {distanceMeters <= 5 && distanceMeters > 2 && <p className="text-green-300 font-bold text-2xl animate-pulse">🔥 Excellent!</p>}
            {distanceMeters <= 10 && distanceMeters > 5 && <p className="text-yellow-400 font-bold text-2xl animate-pulse">👍 Good!</p>}
            <button onClick={handleNextRound} className="w-full py-5 bg-red text-white text-xl font-bold rounded-lg hover:bg-red/90 transition-all flex items-center justify-center gap-3">
              {currentRound >= TOTAL_ROUNDS ? 'See Final Results' : 'Next Round'}
              <Play className="w-6 h-6" />
            </button>
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
                ✓ Guess Submitted - {distanceMeters}m from target
              </p>
            </div>
          )}
        </div>
      </div>

      {!userGuess && !hasSubmitted && (
        <div className="fixed bottom-8 left-8 z-40 text-white/60 text-sm">
          <p>Click on the map to place your guess</p>
        </div>
      )}
    </div>
  );
}