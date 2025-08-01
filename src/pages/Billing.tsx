import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEventManager } from '@/hooks/useEventManager';
import { useEnhancedPlayerManager } from '@/hooks/useEnhancedPlayerManager';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  CreditCard,
  Banknote,
  Plus,
  Trash2,
  Edit,
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

interface Expense {
  id: string;
  name: string;
  amount: number;
  eventId?: string;
  createdAt: Date;
}

const Billing = () => {
  const { events } = useEventManager();
  const { players } = useEnhancedPlayerManager();
  const [paidPlayers, setPaidPlayers] = useState<PlayerBilling[]>([]);
  const [unpaidPlayers, setUnpaidPlayers] = useState<PlayerBilling[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    amount: '',
    eventId: ''
  });
  const [totalRevenue, setTotalRevenue] = useState({ cash: 0, online: 0 });

  useEffect(() => {
    loadPayments();
    loadExpenses();
  }, []);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('event_payments')
        .select(`
          *,
          events(title, date),
          players(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      // For now, we'll use localStorage for expenses since there's no table yet
      const savedExpenses = localStorage.getItem('badminton_expenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const saveExpenses = (newExpenses: Expense[]) => {
    localStorage.setItem('badminton_expenses', JSON.stringify(newExpenses));
    setExpenses(newExpenses);
  };

  const handleAddExpense = () => {
    if (!expenseForm.name || !expenseForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      name: expenseForm.name,
      amount: parseFloat(expenseForm.amount),
      eventId: expenseForm.eventId || undefined,
      createdAt: new Date()
    };

    const updatedExpenses = [...expenses, newExpense];
    saveExpenses(updatedExpenses);
    
    setExpenseForm({ name: '', amount: '', eventId: '' });
    setIsAddExpenseDialogOpen(false);
    toast.success('Expense added successfully');
  };

  const handleEditExpense = () => {
    if (!editingExpense || !expenseForm.name || !expenseForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedExpenses = expenses.map(expense => 
      expense.id === editingExpense.id 
        ? { ...expense, name: expenseForm.name, amount: parseFloat(expenseForm.amount), eventId: expenseForm.eventId || undefined }
        : expense
    );
    
    saveExpenses(updatedExpenses);
    setEditingExpense(null);
    setExpenseForm({ name: '', amount: '', eventId: '' });
    toast.success('Expense updated successfully');
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
    saveExpenses(updatedExpenses);
    toast.success('Expense deleted successfully');
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      name: expense.name,
      amount: expense.amount.toString(),
      eventId: expense.eventId || ''
    });
  };

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

  // Filter payments based on selections
  const filteredPayments = payments.filter(payment => {
    const matchesEvent = selectedEventFilter === 'all' || payment.event_id === selectedEventFilter;
    const matchesStatus = selectedPaymentStatus === 'all' || payment.payment_method === selectedPaymentStatus;
    return matchesEvent && matchesStatus;
  });

  const totalCashPayments = filteredPayments
    .filter(payment => payment.payment_method === 'cash')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const totalOnlinePayments = filteredPayments
    .filter(payment => payment.payment_method === 'online')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const totalRevenueCurrent = totalCashPayments + totalOnlinePayments;

  // Calculate expenses for filtered events
  const filteredExpenses = selectedEventFilter === 'all' 
    ? expenses 
    : expenses.filter(expense => expense.eventId === selectedEventFilter);

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = totalRevenueCurrent - totalExpenses;

  useEffect(() => {
    loadBillingData();
  }, [events]);

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
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <Select value={selectedEventFilter} onValueChange={setSelectedEventFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="cash">Cash Only</SelectItem>
              <SelectItem value="online">Online Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">${totalCashPayments}</div>
              <div className="text-sm text-muted-foreground">Cash Payments</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">${totalOnlinePayments}</div>
              <div className="text-sm text-muted-foreground">Online Payments</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">${totalRevenueCurrent}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">${totalExpenses}</div>
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${netProfit}
              </div>
              <div className="text-sm text-muted-foreground">Net Profit</div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Management */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Expenses Management
              </CardTitle>
              
              <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Expense Name *</Label>
                      <Input
                        value={expenseForm.name}
                        onChange={(e) => setExpenseForm({...expenseForm, name: e.target.value})}
                        placeholder="e.g., Court rental, Equipment, Refreshments"
                      />
                    </div>
                    
                    <div>
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <Label>Event (Optional)</Label>
                      <Select value={expenseForm.eventId} onValueChange={(value) => setExpenseForm({...expenseForm, eventId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">General Expense</SelectItem>
                          {events.map(event => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.title} - {format(event.date, 'MMM dd, yyyy')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button onClick={handleAddExpense} className="w-full">
                      Add Expense
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{expense.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {expense.eventId && events.find(e => e.id === expense.eventId)?.title || 'General'}
                        {' • '}
                        {format(expense.createdAt, 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-600">${expense.amount}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditExpense(expense)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No expenses recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Expense Name *</Label>
              <Input
                value={expenseForm.name}
                onChange={(e) => setExpenseForm({...expenseForm, name: e.target.value})}
                placeholder="e.g., Court rental, Equipment, Refreshments"
              />
            </div>
            
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label>Event (Optional)</Label>
              <Select value={expenseForm.eventId} onValueChange={(value) => setExpenseForm({...expenseForm, eventId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General Expense</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {format(event.date, 'MMM dd, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingExpense(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleEditExpense} className="flex-1">
                Update Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;