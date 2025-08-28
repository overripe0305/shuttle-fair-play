import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Club, ClubMember, UserProfile } from '@/types/club';
import { useAuth } from '@/hooks/useAuth';

export const useClubManager = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load user profile
  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setError(error.message);
    }
  };

  // Load user's clubs
  const loadClubs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get clubs where user is owner or member
      const { data: ownedClubs, error: ownedError } = await supabase
        .from('clubs')
        .select('*')
        .eq('owner_id', user.id);
      
      if (ownedError) throw ownedError;
      
      const { data: memberClubs, error: memberError } = await supabase
        .from('club_members')
        .select(`
          club_id,
          clubs (*)
        `)
        .eq('user_id', user.id);
      
      if (memberError) throw memberError;
      
      const memberClubData = memberClubs?.map(m => m.clubs).filter(Boolean) || [];
      const allClubs = [...(ownedClubs || []), ...memberClubData] as Club[];
      
      // Remove duplicates
      const uniqueClubs = allClubs.filter((club, index, self) => 
        index === self.findIndex(c => c.id === club.id)
      );
      
      setClubs(uniqueClubs);
    } catch (error: any) {
      console.error('Error loading clubs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new club
  const createClub = async (name: string, description?: string) => {
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('clubs')
      .insert({
        name,
        description,
        owner_id: user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    setClubs(prev => [...prev, data]);
    return data;
  };

  // Update club
  const updateClub = async (clubId: string, updates: { name?: string; description?: string }) => {
    const { data, error } = await supabase
      .from('clubs')
      .update(updates)
      .eq('id', clubId)
      .select()
      .single();
    
    if (error) throw error;
    
    setClubs(prev => prev.map(club => 
      club.id === clubId ? data : club
    ));
    
    return data;
  };

  // Delete club
  const deleteClub = async (clubId: string) => {
    const { error } = await supabase
      .from('clubs')
      .delete()
      .eq('id', clubId);
    
    if (error) throw error;
    
    setClubs(prev => prev.filter(club => club.id !== clubId));
  };

  // Add member to club
  const addClubMember = async (clubId: string, userId: string, role: 'admin' | 'member' = 'member') => {
    const { data, error } = await supabase
      .from('club_members')
      .insert({
        club_id: clubId,
        user_id: userId,
        role
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  // Remove member from club
  const removeClubMember = async (clubId: string, userId: string) => {
    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId);
    
    if (error) throw error;
  };

  // Update user profile
  const updateProfile = async (updates: { full_name?: string }) => {
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    setUserProfile(data);
    return data;
  };

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadClubs();
    }
  }, [user]);

  return {
    clubs,
    userProfile,
    loading,
    error,
    createClub,
    updateClub,
    deleteClub,
    addClubMember,
    removeClubMember,
    updateProfile,
    refresh: loadClubs
  };
};