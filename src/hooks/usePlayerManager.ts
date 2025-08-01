import { useState, useCallback } from 'react';
import { 
  Player, 
  Game, 
  PlayerLevel, 
  GamePair, 
  GameMatch, 
  PairType,
  getBracketFromMajorSub 
} from '@/types/player';
import { toast } from '@/hooks/use-toast';


export function usePlayerManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameCounter, setGameCounter] = useState(1);

  const createPair = (player1: Player, player2: Player): GamePair => {
    const levelDiff = Math.abs(player1.level.bracket - player2.level.bracket);
    const pairType: PairType = levelDiff <= 1 ? 'Balanced' : 'Mixed';
    const averageLevel = (player1.level.bracket + player2.level.bracket) / 2;
    
    return {
      players: [player1, player2],
      averageLevel,
      pairType
    };
  };

  const canPairMatch = (pair1: GamePair, pair2: GamePair): boolean => {
    const avgDiff = Math.abs(pair1.averageLevel - pair2.averageLevel);
    
    // Average level difference must be <= 0.5
    if (avgDiff > 0.5) return false;
    
    // Check pairing type priority rules
    if (pair1.pairType === 'Balanced' && pair2.pairType === 'Balanced') return true;
    if (pair1.pairType === 'Mixed' && pair2.pairType === 'Mixed') return true;
    
    // Balanced vs Mixed - mixed should have higher or equal average for balance
    if (pair1.pairType === 'Balanced' && pair2.pairType === 'Mixed') {
      return pair2.averageLevel >= pair1.averageLevel;
    }
    if (pair1.pairType === 'Mixed' && pair2.pairType === 'Balanced') {
      return pair1.averageLevel >= pair2.averageLevel;
    }
    
    return true;
  };

  const selectFairMatch = useCallback((eventPlayers?: any[]): GameMatch | null => {
    // Use provided players or fall back to local players state
    const playersToUse = eventPlayers || players;
    
    console.log('selectFairMatch - Total players:', playersToUse.length);
    console.log('Players:', playersToUse.map(p => ({ name: p.name, status: p.status, eligible: p.eligible })));
    
    // Filter eligible and available players
    const availablePlayers = playersToUse.filter(
      p => p.eligible && p.status === 'Available'
    );

    console.log('Available players:', availablePlayers.length);

    if (availablePlayers.length < 4) {
      toast({
        title: "Not enough players",
        description: `Need at least 4 available players to form a match. Found ${availablePlayers.length}.`,
        variant: "destructive"
      });
      return null;
    }

    // Sort by adjusted games played (games + penalty/bonus), then by name
    const sortedPlayers = [...availablePlayers].sort((a, b) => {
      const aAdjusted = a.gamesPlayed + a.gamePenaltyBonus;
      const bAdjusted = b.gamesPlayed + b.gamePenaltyBonus;
      if (aAdjusted !== bAdjusted) {
        return aAdjusted - bAdjusted;
      }
      return a.name.localeCompare(b.name);
    });

    // Try to find valid pairs and matches
    for (let i = 0; i < sortedPlayers.length - 3; i++) {
      for (let j = i + 1; j < sortedPlayers.length - 2; j++) {
        const pair1 = createPair(sortedPlayers[i], sortedPlayers[j]);
        
        // Skip if mixed pair has too large level difference (>3)
        if (pair1.pairType === 'Mixed' && 
            Math.abs(pair1.players[0].level.bracket - pair1.players[1].level.bracket) > 3) {
          continue;
        }
        
        for (let k = j + 1; k < sortedPlayers.length - 1; k++) {
          for (let l = k + 1; l < sortedPlayers.length; l++) {
            const pair2 = createPair(sortedPlayers[k], sortedPlayers[l]);
            
            // Skip if mixed pair has too large level difference (>3)
            if (pair2.pairType === 'Mixed' && 
                Math.abs(pair2.players[0].level.bracket - pair2.players[1].level.bracket) > 3) {
              continue;
            }
            
            if (canPairMatch(pair1, pair2)) {
              return { pair1, pair2 };
            }
          }
        }
      }
    }

    toast({
      title: "Cannot form fair match",
      description: "Unable to form a balanced match with current players.",
      variant: "destructive"
    });
    return null;
  }, [players]);

  const startGame = useCallback((match: GameMatch) => {
    const allPlayers = [...match.pair1.players, ...match.pair2.players];
    
    // Create new game
    const newGame: Game = {
      id: Date.now().toString(),
      match,
      gameNumber: gameCounter,
      timestamp: new Date(),
      completed: false
    };

    // Update player statuses and match history
    setPlayers(prev => prev.map(player => {
      if (allPlayers.some(sp => sp.id === player.id)) {
        return { 
          ...player, 
          status: 'In progress' as const,
          matchHistory: [...player.matchHistory, newGame.id]
        };
      }
      return player;
    }));

    // Add game to list
    setGames(prev => [newGame, ...prev]);
    setGameCounter(prev => prev + 1);

    const playerNames = allPlayers.map(p => p.name).join(', ');
    toast({
      title: "Game started!",
      description: `Game #${gameCounter} with ${playerNames}`,
    });
  }, [gameCounter]);

  const markGameDone = useCallback(async (gameId: string, winner?: 'team1' | 'team2') => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const allPlayers = [...game.match.pair1.players, ...game.match.pair2.players];

    try {
      // Import supabase here to update the database
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Update each player's games_played and status in the database
      for (const player of allPlayers) {
        await supabase
          .from('players')
          .update({
            games_played: player.gamesPlayed + 1,
            status: 'available'
          })
          .eq('id', player.id);
      }

      // Update game status
      setGames(prev => prev.map(g => 
        g.id === gameId ? { ...g, completed: true } : g
      ));

      // Update players: increment games played and set to Available
      setPlayers(prev => prev.map(player => {
        if (allPlayers.some(gp => gp.id === player.id)) {
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
    } catch (error) {
      console.error('Error updating game completion:', error);
      toast({
        title: "Error",
        description: "Failed to update game completion in database.",
        variant: "destructive"
      });
    }
  }, [games]);

  const resetAllPlayers = useCallback(() => {
    setPlayers(prev => prev.map(player => ({
      ...player,
      status: 'Available' as const
    })));
    setGames([]);
    setGameCounter(1);
    
    toast({
      title: "All reset",
      description: "All players and games have been reset.",
    });
  }, []);

  const addPlayer = useCallback((name: string, level: PlayerLevel) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      eligible: true,
      gamesPlayed: 0,
      gamePenaltyBonus: 0,
      status: 'Available',
      matchHistory: [],
      level
    };

    setPlayers(prev => [...prev, newPlayer]);
    
    toast({
      title: "Player added",
      description: `${name} added to the roster.`,
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

  const replacePlayerInTeam = useCallback((oldPlayerId: string, newPlayerId: string) => {
    // This is handled in the TeamSelection component directly
    // The match state is updated there
  }, []);

  const replacePlayerInGame = useCallback(async (gameId: string, oldPlayerId: string, newPlayerId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Find the new player
      const newPlayer = players.find(p => p.id === newPlayerId);
      if (!newPlayer) return;

      // Update the game with the new player
      setGames(prev => prev.map(game => {
        if (game.id === gameId) {
          const updatedGame = { ...game };
          
          // Replace in pair1
          const pair1Index = updatedGame.match.pair1.players.findIndex(p => p.id === oldPlayerId);
          if (pair1Index !== -1) {
            updatedGame.match.pair1.players[pair1Index] = newPlayer;
          } else {
            // Replace in pair2
            const pair2Index = updatedGame.match.pair2.players.findIndex(p => p.id === oldPlayerId);
            if (pair2Index !== -1) {
              updatedGame.match.pair2.players[pair2Index] = newPlayer;
            }
          }
          
          return updatedGame;
        }
        return game;
      }));

      // Update player statuses
      setPlayers(prev => prev.map(player => {
        if (player.id === oldPlayerId) {
          return { ...player, status: 'Available' as const };
        }
        if (player.id === newPlayerId) {
          return { ...player, status: 'In progress' as const };
        }
        return player;
      }));

      // Update in database
      await supabase
        .from('players')
        .update({ status: 'available' })
        .eq('id', oldPlayerId);
        
      await supabase
        .from('players')
        .update({ status: 'in_progress' })
        .eq('id', newPlayerId);

      toast({
        title: "Player substituted",
        description: `${newPlayer.name} has replaced the previous player in the game.`,
      });
    } catch (error) {
      console.error('Error replacing player:', error);
      toast({
        title: "Error",
        description: "Failed to replace player.",
        variant: "destructive"
      });
    }
  }, [players]);

  return {
    players,
    games,
    selectFairMatch,
    startGame,
    markGameDone,
    resetAllPlayers,
    addPlayer,
    updatePlayer,
    deletePlayer,
    replacePlayerInTeam,
    replacePlayerInGame,
    activeGames: games.filter(g => !g.completed)
  };
}