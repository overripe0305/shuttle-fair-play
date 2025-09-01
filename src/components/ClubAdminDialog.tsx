import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClubManager } from '@/hooks/useClubManager';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Loader2 } from 'lucide-react';

interface ClubAdminDialogProps {
  clubId: string;
}

export const ClubAdminDialog = ({ clubId }: ClubAdminDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { addClubMember } = useClubManager();

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // First, check if a profile exists with this email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .limit(1);

      if (profileError) {
        throw new Error('Failed to check user profile');
      }

      if (!profiles || profiles.length === 0) {
        throw new Error('No user found with this email address. They need to create an account first.');
      }

      const userId = profiles[0].id;

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('club_members')
        .select('id, role')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .limit(1);

      if (memberError) {
        throw new Error('Failed to check existing membership');
      }

      if (existingMember && existingMember.length > 0) {
        const currentRole = existingMember[0].role;
        if (currentRole === 'admin' || currentRole === 'owner') {
          throw new Error('User is already an admin of this club');
        } else {
          // Update existing member to admin
          const { error: updateError } = await supabase
            .from('club_members')
            .update({ role: 'admin' })
            .eq('id', existingMember[0].id);

          if (updateError) {
            throw updateError;
          }
        }
      } else {
        // Add as new admin member
        await addClubMember(clubId, userId, 'admin');
      }

      setSuccess(`Successfully added ${email} as club admin!`);
      setEmail('');
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error adding admin:', error);
      setError(error.message || 'Failed to add admin');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEmail('');
      setError(null);
      setSuccess(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Club Administrator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter user's email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                The user must already have an account to be added as an admin.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Admin
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};