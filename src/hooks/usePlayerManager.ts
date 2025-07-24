import { useState, useCallback } from 'react';
import { Player, Game, PlayerLevel } from '@/types/player';
import { toast } from '@/hooks/use-toast';

// Sample players for demo
const samplePlayers: Player[] = [
  { id: '1', name: 'Alice Chen', eligible: true, gamesPlayed: 2, status: 'Available', level: 'A' },
  { id: '2', name: 'Bob Smith', eligible: true, gamesPlayed: 1, status: 'Available', level: 'B' },
  { id: '3', name: 'Charlie Wong', eligible: true, gamesPlayed: 3, status: 'Available', level: 'C' },
  { id: '4', name: 'Diana Lee', eligible: true, gamesPlayed: 0, status: 'Available', level: 'D' },
  { id: '5', name: 'Eva Martinez', eligible: true, gamesPlayed: 2, status: 'Available', level: 'A' },
  { id: '6', name: 'Frank Johnson', eligible: true, gamesPlayed: 1, status: 'Available', level: 'B' },
  { id: '7', name: 'Grace Liu', eligible: true, gamesPlayed: 0, status: 'Available', level: 'C' },
  { id: '8', name: 'Henry Davis', eligible: true, gamesPlayed: 4, status: 'Available', level: 'D' },
  { id: '9', name: 'Iris Kim', eligible: true, gamesPlayed: 1, status: 'Available', level: 'B' },
  { id: '10', name: 'Jack Thompson', eligible: true, gamesPlayed: 2, status: 'Available', level: 'C' },
];

export function usePlayerManager() {
  const [players, setPlayers] = useState<Player[]>(samplePlayers);
  const [games, setGames] = useState<Game[]>([]);
  const [gameCounter, setGameCounter] = useState(1);

  const selectFairTeam = useCallback((): Player[] => {
    // Filter eligible and available players
    const availablePlayers = players.filter(
      p => p.eligible && p.status === 'Available'
    );

    if (availablePlayers.length < 4) {
      toast({
        title: "Not enough players",
        description: "Need at least 4 available players to form a team.",
        variant: "destructive"
      });
      return [];
    }

    // Sort by games played (ascending), then by name (alphabetical)
    const sortedPlayers = [...availablePlayers].sort((a, b) => {
      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed;
      }
      return a.name.localeCompare(b.name);
    });

    // Apply team selection rules
    const selectedPlayers: Player[] = [];
    const levelCounts: Record<PlayerLevel, number> = { A: 0, B: 0, C: 0, D: 0 };
    const hasLevelA = sortedPlayers.some(p => p.level === 'A');
    const hasLevelD = sortedPlayers.some(p => p.level === 'D');

    for (const player of sortedPlayers) {
      if (selectedPlayers.length >= 4) break;

      // Check level count limit (max 2 per level)
      if (levelCounts[player.level] >= 2) continue;

      // Check A-D mixing rule
      if (player.level === 'A' && selectedPlayers.some(p => p.level === 'D')) continue;
      if (player.level === 'D' && selectedPlayers.some(p => p.level === 'A')) continue;

      selectedPlayers.push(player);
      levelCounts[player.level]++;
    }

    if (selectedPlayers.length < 4) {
      toast({
        title: "Cannot form fair team",
        description: "Unable to form a team of 4 players with current constraints.",
        variant: "destructive"
      });
      return [];
    }

    return selectedPlayers;
  }, [players]);

  const startGame = useCallback((selectedPlayers: Player[]) => {
    if (selectedPlayers.length !== 4) return;

    // Create new game
    const newGame: Game = {
      id: Date.now().toString(),
      players: selectedPlayers,
      gameNumber: gameCounter,
      timestamp: new Date(),
      completed: false
    };

    // Update player statuses
    setPlayers(prev => prev.map(player => {
      if (selectedPlayers.some(sp => sp.id === player.id)) {
        return { ...player, status: 'In progress' as const };
      }
      return player;
    }));

    // Add game to list
    setGames(prev => [newGame, ...prev]);
    setGameCounter(prev => prev + 1);

    toast({
      title: "Game started!",
      description: `Game #${gameCounter} with ${selectedPlayers.map(p => p.name).join(', ')}`,
    });
  }, [gameCounter]);

  const markGameDone = useCallback((gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Update game status
    setGames(prev => prev.map(g => 
      g.id === gameId ? { ...g, completed: true } : g
    ));

    // Update players: increment games played and set to Available
    setPlayers(prev => prev.map(player => {
      if (game.players.some(gp => gp.id === player.id)) {
        return {
          ...player,
          status: 'Available' as const,
          gamesPlayed: player.gamesPlayed + 1
        };
      }
      return player;
    }));

    toast({
      title: "Game completed!",
      description: `Game #${game.gameNumber} marked as done.`,
    });
  }, [games]);

  const resetAllPlayers = useCallback(() => {
    setPlayers(prev => prev.map(player => ({
      ...player,
      status: 'Available' as const
    })));
    
    toast({
      title: "Players reset",
      description: "All players are now available.",
    });
  }, []);

  const addPlayer = useCallback((name: string, level: PlayerLevel) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      eligible: true,
      gamesPlayed: 0,
      status: 'Available',
      level
    };

    setPlayers(prev => [...prev, newPlayer]);
    
    toast({
      title: "Player added",
      description: `${name} (Level ${level}) added to the roster.`,
    });
  }, []);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, ...updates } : player
    ));
  }, []);

  const deletePlayer = useCallback((playerId: string) => {
    setPlayers(prev => prev.filter(player => player.id !== playerId));
    
    toast({
      title: "Player removed",
      description: "Player has been removed from the roster.",
    });
  }, []);

  return {
    players,
    games,
    selectFairTeam,
    startGame,
    markGameDone,
    resetAllPlayers,
    addPlayer,
    updatePlayer,
    deletePlayer,
    activeGames: games.filter(g => !g.completed)
  };
}