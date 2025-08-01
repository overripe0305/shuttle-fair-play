import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, DollarSign, CreditCard, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useEventManager } from '@/hooks/useEventManager';
import badmintonLogo from '@/assets/badminton-logo.png';

interface PlayerBilling {
  id: string;
  name: string;
  eventTitle: string;
  eventDate: Date;
  eventId: string;
  paymentStatus: 'paid' | 'unpaid';
  paymentMethod?: 'cash' | 'online';
  paymentDate?: Date;
  amount?: number;
}

const Billing = () => {
  const [paidPlayers, setPaidPlayers] = useState<PlayerBilling[]>([]);
  const [unpaidPlayers, setUnpaidPlayers] = useState<PlayerBilling[]>([]);
  const [totalRevenue, setTotalRevenue] = useState({ cash: 0, online: 0 });
  const { events } = useEventManager();

  useEffect(() => {
    loadBillingData();
  }, [events]);

  const loadBillingData = async () => {
    try {
      const allPlayerBilling: PlayerBilling[] = [];
      let cashTotal = 0;
      let onlineTotal = 0;

      // Get billing data for each event
      for (const event of events) {
        const { data: eventPlayers, error } = await supabase
          .from('event_players')
          .select(`
            player_id,
            players (
              id,
              name,
              payment_status,
              payment_method,
              payment_date
            )
          `)
          .eq('event_id', event.id);

        if (error) throw error;

        // Get payment amounts for this event
        const { data: payments } = await supabase
          .from('event_payments')
          .select('player_id, amount, payment_method')
          .eq('event_id', event.id);

        eventPlayers?.forEach(ep => {
          const payment = payments?.find(p => p.player_id === ep.players.id);
          const playerBilling: PlayerBilling = {
            id: ep.players.id,
            name: ep.players.name,
            eventTitle: event.title,
            eventDate: event.date,
            eventId: event.id,
            paymentStatus: (ep.players.payment_status || 'unpaid') as 'paid' | 'unpaid',
            paymentMethod: ep.players.payment_method as 'cash' | 'online' | undefined,
            paymentDate: ep.players.payment_date ? new Date(ep.players.payment_date) : undefined,
            amount: payment?.amount || 0,
          };

          allPlayerBilling.push(playerBilling);

          // Calculate totals
          if (playerBilling.paymentStatus === 'paid' && payment) {
            if (payment.payment_method === 'cash') {
              cashTotal += payment.amount;
            } else if (payment.payment_method === 'online') {
              onlineTotal += payment.amount;
            }
          }
        });
      }

      // Separate paid and unpaid players
      const paid = allPlayerBilling.filter(p => p.paymentStatus === 'paid');
      const unpaid = allPlayerBilling.filter(p => p.paymentStatus === 'unpaid');

      setPaidPlayers(paid);
      setUnpaidPlayers(unpaid);
      setTotalRevenue({ cash: cashTotal, online: onlineTotal });

    } catch (error) {
      console.error('Error loading billing data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <img src={badmintonLogo} alt="BadmintonPro" className="h-10 w-10" />
                <div>
                  <h1 className="text-2xl font-bold">Billing Management</h1>
                  <p className="text-sm text-muted-foreground">Track payments and revenue</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.cash.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.online.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalRevenue.cash + totalRevenue.online).toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unpaidPlayers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Player Billing Tables */}
        <Tabs defaultValue="unpaid" className="space-y-6">
          <TabsList>
            <TabsTrigger value="unpaid">Unpaid Players ({unpaidPlayers.length})</TabsTrigger>
            <TabsTrigger value="paid">Paid Players ({paidPlayers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="unpaid">
            <Card>
              <CardHeader>
                <CardTitle>Players with Outstanding Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {unpaidPlayers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>All players have paid!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player Name</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidPlayers.map((player) => (
                        <TableRow key={`${player.id}-${player.eventId}`}>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell>{player.eventTitle}</TableCell>
                          <TableCell>{format(player.eventDate, 'PPP')}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Unpaid</Badge>
                          </TableCell>
                          <TableCell>
                            <Link to={`/event/${player.eventId}/play`}>
                              <Button size="sm" variant="outline">
                                View Event
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paid">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {paidPlayers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player Name</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidPlayers.map((player) => (
                        <TableRow key={`${player.id}-${player.eventId}`}>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell>{player.eventTitle}</TableCell>
                          <TableCell>{format(player.eventDate, 'PPP')}</TableCell>
                          <TableCell>
                            {player.paymentDate ? format(player.paymentDate, 'PPP') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={player.paymentMethod === 'cash' ? 'secondary' : 'default'}>
                              {player.paymentMethod?.toUpperCase() || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>${(player.amount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Link to={`/event/${player.eventId}/play`}>
                              <Button size="sm" variant="outline">
                                View Event
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Billing;