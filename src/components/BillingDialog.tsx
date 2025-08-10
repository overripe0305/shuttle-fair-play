import { useState, useEffect } from 'react';
import { useEventPlayerStats } from '@/hooks/useEventPlayerStats';
import { useEventManager } from '@/hooks/useEventManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DollarSign, CreditCard, Users, FileText, ArrowUpDown, Plus, Receipt, Search } from 'lucide-react';

interface PlayerReport {
  id: string;
  name: string;
  gamesPlayed: number;
  totalMinutes: number;
  wins: number;
  losses: number;
  paymentStatus: 'paid' | 'unpaid';
  paymentMethod?: 'cash' | 'online';
  paymentDate?: string;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  eventId?: string;
  createdAt: Date;
}

type SortField = 'name' | 'gamesPlayed' | 'wins' | 'losses' | 'paymentStatus';
type SortDirection = 'asc' | 'desc';

interface BillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export function BillingDialog({ open, onOpenChange, eventId, eventTitle }: BillingDialogProps) {
  const { getPlayerStats, eventPlayerStats } = useEventPlayerStats(eventId);
  const { events } = useEventManager();
  const [playerReports, setPlayerReports] = useState<PlayerReport[]>([]);
  const [sortedReports, setSortedReports] = useState<PlayerReport[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [markPaymentDialog, setMarkPaymentDialog] = useState({ open: false, playerId: '', playerName: '' });
  const [expenseDialog, setExpenseDialog] = useState({ open: false });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('unpaid');
  
  // Payment totals state
  const [cashTotal, setCashTotal] = useState(0);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Get current event and its queue fee
  const currentEvent = events.find(e => e.id === eventId);
  const queueFee = currentEvent?.queueFee || 0;

  // Load player reports when dialog opens
  useEffect(() => {
    if (open && eventId) {
      loadPlayerReports();
      loadPaymentTotals();
    }
  }, [open, eventId, eventPlayerStats]);

  const loadPlayerReports = async () => {
    try {
      // Get event players and their stats
      const { data: eventPlayers, error: eventPlayersError } = await supabase
        .from('event_players')
        .select('player_id')
        .eq('event_id', eventId);

      if (eventPlayersError) throw eventPlayersError;

      if (!eventPlayers || eventPlayers.length === 0) {
        setPlayerReports([]);
        return;
      }

      // Get player details
      const playerIds = eventPlayers.map(ep => ep.player_id);
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds);

      if (playersError) throw playersError;

      // Get player stats and build reports
      const reports: PlayerReport[] = await Promise.all(
        (players || []).map(async (player) => {
          const stats = await getPlayerStats(player.id);
          
          return {
            id: player.id,
            name: player.name,
            gamesPlayed: stats?.gamesPlayed || 0,
            totalMinutes: 0, // This field can be removed or calculated differently
            wins: stats?.wins || 0,
            losses: stats?.losses || 0,
            paymentStatus: player.payment_status as 'paid' | 'unpaid',
            paymentMethod: player.payment_method as 'cash' | 'online' | undefined,
            paymentDate: player.payment_date
          };
        })
      );

      setPlayerReports(reports);
    } catch (error) {
      console.error('Error loading player reports:', error);
    }
  };

  const loadPaymentTotals = async () => {
    try {
      const { data: payments, error } = await supabase
        .from('event_payments')
        .select('amount, payment_method')
        .eq('event_id', eventId);

      if (error) throw error;

      let cash = 0;
      let online = 0;

      payments?.forEach(payment => {
        const amount = Number(payment.amount) || queueFee;
        if (payment.payment_method === 'cash') {
          cash += amount;
        } else if (payment.payment_method === 'online') {
          online += amount;
        }
      });

      setCashTotal(cash);
      setOnlineTotal(online);
      setTotalRevenue(cash + online);
    } catch (error) {
      console.error('Error loading payment totals:', error);
    }
  };

  const handleMarkPaid = async (playerId: string, method: 'cash' | 'online') => {
    try {
      // Update player payment status
      const { error: playerError } = await supabase
        .from('players')
        .update({ 
          payment_status: 'paid',
          payment_method: method,
          payment_date: new Date().toISOString()
        })
        .eq('id', playerId);

      if (playerError) throw playerError;

      // Record payment in event_payments table
      const { error: paymentError } = await supabase
        .from('event_payments')
        .insert({
          event_id: eventId,
          player_id: playerId,
          amount: queueFee,
          payment_method: method,
          payment_date: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Payment recorded",
        description: `Player marked as paid via ${method}`,
      });

      // Refresh data
      loadPlayerReports();
      loadPaymentTotals();
      setMarkPaymentDialog({ open: false, playerId: '', playerName: '' });
    } catch (error) {
      console.error('Error marking payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleRevertToUnpaid = async (playerId: string) => {
    try {
      // Update player payment status
      const { error: playerError } = await supabase
        .from('players')
        .update({ 
          payment_status: 'unpaid',
          payment_method: null,
          payment_date: null
        })
        .eq('id', playerId);

      if (playerError) throw playerError;

      // Remove payment record
      const { error: paymentError } = await supabase
        .from('event_payments')
        .delete()
        .eq('event_id', eventId)
        .eq('player_id', playerId);

      if (paymentError) throw paymentError;

      toast({
        title: "Payment reverted",
        description: "Player marked as unpaid",
      });

      // Refresh data
      loadPlayerReports();
      loadPaymentTotals();
    } catch (error) {
      console.error('Error reverting payment:', error);
      toast({
        title: "Error",
        description: "Failed to revert payment",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseName.trim() || !expenseAmount.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all expense fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, just save to localStorage as in the original billing implementation
      const newExpense: Expense = {
        id: Date.now().toString(),
        name: expenseName.trim(),
        amount: parseFloat(expenseAmount),
        eventId: eventId,
        createdAt: new Date()
      };

      const existingExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      existingExpenses.push(newExpense);
      localStorage.setItem('expenses', JSON.stringify(existingExpenses));

      toast({
        title: "Expense added",
        description: `₱${newExpense.amount.toFixed(2)} expense recorded`,
      });

      setExpenseDialog({ open: false });
      setExpenseName('');
      setExpenseAmount('');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    }
  };

  // Sort and filter reports
  useEffect(() => {
    let filtered = [...playerReports];
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'gamesPlayed':
          comparison = a.gamesPlayed - b.gamesPlayed;
          break;
        case 'wins':
          comparison = a.wins - b.wins;
          break;
        case 'losses':
          comparison = a.losses - b.losses;
          break;
        case 'paymentStatus':
          comparison = a.paymentStatus.localeCompare(b.paymentStatus);
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setSortedReports(filtered);
  }, [playerReports, sortField, sortDirection, searchTerm]);

  const SortableHeader = ({ field, children, currentField, direction, onSort }: {
    field: SortField;
    children: React.ReactNode;
    currentField: SortField;
    direction: SortDirection;
    onSort: (field: SortField) => void;
  }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {currentField === field && (
          <ArrowUpDown className={`h-3 w-3 ${direction === 'desc' ? 'rotate-180' : ''}`} />
        )}
      </div>
    </TableHead>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Billing - {eventTitle}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{cashTotal.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {sortedReports.filter(p => p.paymentStatus === 'paid' && p.paymentMethod === 'cash').length} payments
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{onlineTotal.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {sortedReports.filter(p => p.paymentStatus === 'paid' && p.paymentMethod === 'online').length} payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {sortedReports.filter(p => p.paymentStatus === 'paid').length} of {sortedReports.length} paid
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sortedReports.filter(p => p.paymentStatus === 'unpaid').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Players remaining</p>
                </CardContent>
              </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Tabs for Paid/Unpaid */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unpaid">
                  Unpaid ({sortedReports.filter(p => p.paymentStatus === 'unpaid').length})
                </TabsTrigger>
                <TabsTrigger value="paid">
                  Paid ({sortedReports.filter(p => p.paymentStatus === 'paid').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="unpaid">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Player Name
                      </SortableHeader>
                      <SortableHeader field="gamesPlayed" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Games
                      </SortableHeader>
                      <SortableHeader field="wins" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Wins
                      </SortableHeader>
                      <SortableHeader field="losses" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Losses
                      </SortableHeader>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReports
                      .filter(p => p.paymentStatus === 'unpaid')
                      .map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>{player.gamesPlayed}</TableCell>
                        <TableCell>{player.wins}</TableCell>
                        <TableCell>{player.losses}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => setMarkPaymentDialog({ 
                              open: true, 
                              playerId: player.id, 
                              playerName: player.name 
                            })}
                          >
                            Mark as Paid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="paid">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Player Name
                      </SortableHeader>
                      <SortableHeader field="gamesPlayed" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Games
                      </SortableHeader>
                      <SortableHeader field="wins" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Wins
                      </SortableHeader>
                      <SortableHeader field="losses" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Losses
                      </SortableHeader>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReports
                      .filter(p => p.paymentStatus === 'paid')
                      .map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>{player.gamesPlayed}</TableCell>
                        <TableCell>{player.wins}</TableCell>
                        <TableCell>{player.losses}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {player.paymentMethod || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevertToUnpaid(player.id)}
                          >
                            Revert to Unpaid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Payment Dialog */}
      <Dialog 
        open={markPaymentDialog.open} 
        onOpenChange={(open) => setMarkPaymentDialog({ open, playerId: '', playerName: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment - {markPaymentDialog.playerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: 'cash' | 'online') => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Amount: ₱{queueFee.toFixed(2)}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleMarkPaid(markPaymentDialog.playerId, paymentMethod)}
                className="flex-1"
              >
                Confirm Payment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setMarkPaymentDialog({ open: false, playerId: '', playerName: '' })}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}