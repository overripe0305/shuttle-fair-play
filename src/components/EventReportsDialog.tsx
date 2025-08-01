import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DollarSign, CreditCard, Users, FileText } from 'lucide-react';

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

interface EventReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export function EventReportsDialog({ open, onOpenChange, eventId, eventTitle }: EventReportsDialogProps) {
  const [playerReports, setPlayerReports] = useState<PlayerReport[]>([]);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; playerId?: string; playerName?: string }>({ open: false });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [cashTotal, setCashTotal] = useState(0);
  const [onlineTotal, setOnlineTotal] = useState(0);

  useEffect(() => {
    if (open && eventId) {
      loadPlayerReports();
      loadPaymentTotals();
    }
  }, [open, eventId]);

  const loadPlayerReports = async () => {
    try {
      // Get event players with their stats
      const { data: eventPlayers, error: eventError } = await supabase
        .from('event_players')
        .select(`
          player_id,
          players (
            id,
            name,
            games_played,
            total_minutes_played,
            wins,
            losses,
            payment_status,
            payment_method,
            payment_date
          )
        `)
        .eq('event_id', eventId);

      if (eventError) throw eventError;

      const reports: PlayerReport[] = eventPlayers?.map(ep => ({
        id: ep.players.id,
        name: ep.players.name,
        gamesPlayed: ep.players.games_played || 0,
        totalMinutes: ep.players.total_minutes_played || 0,
        wins: ep.players.wins || 0,
        losses: ep.players.losses || 0,
        paymentStatus: (ep.players.payment_status || 'unpaid') as 'paid' | 'unpaid',
        paymentMethod: ep.players.payment_method as 'cash' | 'online' | undefined,
        paymentDate: ep.players.payment_date,
      })) || [];

      setPlayerReports(reports);
    } catch (error) {
      console.error('Error loading player reports:', error);
      toast({
        title: "Error",
        description: "Failed to load player reports",
        variant: "destructive"
      });
    }
  };

  const loadPaymentTotals = async () => {
    try {
      const { data: payments, error } = await supabase
        .from('event_payments')
        .select('amount, payment_method')
        .eq('event_id', eventId);

      if (error) throw error;

      const cash = payments?.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const online = payments?.filter(p => p.payment_method === 'online').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      setCashTotal(cash);
      setOnlineTotal(online);
    } catch (error) {
      console.error('Error loading payment totals:', error);
    }
  };

  const handleMarkPaid = async (playerId: string, paymentMethod: 'cash' | 'online') => {
    try {
      // Update player payment status
      const { error: playerError } = await supabase
        .from('players')
        .update({
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_date: new Date().toISOString()
        })
        .eq('id', playerId);

      if (playerError) throw playerError;

      // Add payment record (assuming a standard amount, you can make this configurable)
      const amount = 50.00; // Default amount, make configurable as needed
      const { error: paymentError } = await supabase
        .from('event_payments')
        .insert({
          event_id: eventId,
          player_id: playerId,
          amount: amount,
          payment_method: paymentMethod
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Payment recorded",
        description: `Player marked as paid via ${paymentMethod}`,
      });

      setPaymentDialog({ open: false });
      loadPlayerReports();
      loadPaymentTotals();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Event Reports - {eventTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${cashTotal.toFixed(2)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${onlineTotal.toFixed(2)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(cashTotal + onlineTotal).toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Player Reports Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player Name</TableHead>
                    <TableHead>Games Played</TableHead>
                    <TableHead>Total Minutes</TableHead>
                    <TableHead>Wins</TableHead>
                    <TableHead>Losses</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerReports.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.gamesPlayed}</TableCell>
                      <TableCell>{Math.floor(player.totalMinutes / 60)}h {player.totalMinutes % 60}m</TableCell>
                      <TableCell>{player.wins}</TableCell>
                      <TableCell>{player.losses}</TableCell>
                      <TableCell>
                        <Badge variant={player.paymentStatus === 'paid' ? 'default' : 'destructive'}>
                          {player.paymentStatus === 'paid' ? `Paid (${player.paymentMethod})` : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {player.paymentStatus === 'unpaid' && (
                          <Button 
                            size="sm" 
                            onClick={() => setPaymentDialog({ 
                              open: true, 
                              playerId: player.id, 
                              playerName: player.name 
                            })}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment for {paymentDialog.playerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={selectedPaymentMethod} onValueChange={(value: 'cash' | 'online') => setSelectedPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash Payment</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => paymentDialog.playerId && handleMarkPaid(paymentDialog.playerId, selectedPaymentMethod)}
                className="flex-1"
              >
                Confirm Payment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPaymentDialog({ open: false })}
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