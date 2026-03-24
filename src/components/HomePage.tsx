import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trophy, Map, ChevronRight } from 'lucide-react';
import { supabase, LeaderboardEntry } from '../lib/supabase';
import { getMapTypeName, getMapTypeColor } from '../lib/utils';

export default function HomePage() {
  const navigate = useNavigate();
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopScores();
  }, []);

  const loadTopScores = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopScores(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #d4af37 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-8">
          <Map className="w-20 h-20 text-gold mx-auto mb-4" />
          <h1 className="text-5xl md:text-6xl font-bold text-gold mb-4">
            Dark & Darker
          </h1>
          <h2 className="text-3xl md:text-4xl text-white mb-2">
            Map Guesser
          </h2>
          <p className="text-gray-400 text-lg">
            Test your knowledge of the dungeons
          </p>
        </div>

        {/* Game Info */}
        <div className="bg-black/30 border border-gold/30 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-gold text-2xl font-bold">5</div>
              <div className="text-gray-400 text-sm">Rounds</div>
            </div>
            <div>
              <div className="text-gold text-2xl font-bold">25,000</div>
              <div className="text-gray-400 text-sm">Max Score</div>
            </div>
            <div>
              <div className="text-gold text-2xl font-bold">3</div>
              <div className="text-gray-400 text-sm">Dungeons</div>
            </div>
          </div>
        </div>

        {/* Play Button */}
        <button
          onClick={() => navigate('/play')}
          className="w-full py-5 bg-red text-white text-2xl font-bold rounded-xl hover:bg-red/90 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 mb-8"
        >
          <Play className="w-8 h-8" />
          Play Now
        </button>

        {/* Leaderboard Section */}
        <div className="bg-black/30 border border-gold/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-gold" />
              <h2 className="text-xl font-bold text-white">Top 10 Players</h2>
            </div>
            <button
              onClick={() => navigate('/leaderboard')}
              className="text-gold hover:text-white transition-colors flex items-center gap-1 text-sm"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : topScores.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No scores yet. Be the first!
            </div>
          ) : (
            <div className="space-y-2">
              {topScores.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-gold/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-700 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{entry.player_name}</div>
                      <div className="text-xs text-gray-400">
                        {getMapTypeName(entry.map_type)} • {entry.rounds_completed} rounds
                      </div>
                    </div>
                  </div>
                  <div className="text-gold font-bold text-lg">
                    {entry.total_score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-gray-500 text-sm space-y-2 text-center">
          <p>📍 Click on the map to place your guess</p>
          <p>🎯 Closer = More Points (5,000 max per round)</p>
          <p>🏆 Complete 5 rounds for your final score</p>
        </div>
      </div>
    </div>
  );
}