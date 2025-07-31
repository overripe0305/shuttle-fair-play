import { useState } from 'react';
import { usePlayerManager } from '@/hooks/usePlayerManager';
import { PlayerCard } from '@/components/PlayerCard';
import { GameCard } from '@/components/GameCard';
import { TeamSelection } from '@/components/TeamSelection';
import { AddPlayerDialog } from '@/components/AddPlayerDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from "react-router-dom";
import { 
  Users, 
  Trophy, 
  RotateCcw, 
  Search,
  Filter
} from 'lucide-react';
import badmintonLogo from '@/assets/badminton-logo.png';
import { MajorLevel } from '@/types/player';

const Index = () => {
  const {
    players,
    games,
    selectFairMatch,
    startGame,
    markGameDone,
    resetAllPlayers,
    addPlayer,
    activeGames
  } = usePlayerManager();

  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<MajorLevel | 'All'>('All');

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'All' || player.level.major === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const availablePlayers = players.filter(p => p.eligible && p.status === 'Available');
  const inProgressPlayers = players.filter(p => p.status === 'In progress');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={badmintonLogo} alt="BadmintonPro" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">BadmintonPro</h1>
                <p className="text-sm text-muted-foreground">Smart Club Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-status-available rounded-full"></div>
                  <span>{availablePlayers.length} Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-status-in-progress rounded-full"></div>
                  <span>{inProgressPlayers.length} Playing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>{activeGames.length} Active Games</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link to="/players">
  <Button variant="default">
    Manage Players
  </Button>
</Link>

                <AddPlayerDialog onAddPlayer={addPlayer} />
                <Button variant="outline" onClick={resetAllPlayers}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Players */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Player Pool ({filteredPlayers.length})
                </CardTitle>
                
                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search players..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={levelFilter === 'All' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLevelFilter('All')}
                    >
                      All
                    </Button>
                    {(['Newbie', 'Beginner', 'Intermediate', 'Advance'] as MajorLevel[]).map(level => (
                      <Button
                        key={level}
                        variant={levelFilter === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLevelFilter(level)}
                        className={levelFilter === level ? 'text-white' : ''}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredPlayers.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
                
                {filteredPlayers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No players found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Team Selection */}
          <div className="lg:col-span-1">
            <TeamSelection 
              onSelectMatch={selectFairMatch}
              onStartGame={startGame}
            />
          </div>

          {/* Right Panel - Active Games */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Active Games ({activeGames.length})
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {activeGames.map((game) => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    onMarkDone={markGameDone}
                  />
                ))}
                
                {activeGames.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active games
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{players.length}</div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{games.length}</div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{availablePlayers.length}</div>
              <div className="text-sm text-muted-foreground">Available Now</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{activeGames.length}</div>
              <div className="text-sm text-muted-foreground">Games in Progress</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
