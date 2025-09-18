import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import ClubDashboard from "./pages/ClubDashboard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EnhancedPlayerManagement from "./pages/EnhancedPlayerManagement";
import CreateEvent from "./pages/CreateEvent";
import EventDetails from "./pages/EventDetails";
import ViewAllEvents from "./pages/ViewAllEvents";
import PlayerProfile from "./pages/PlayerProfile";
import Billing from "./pages/Billing";
import Auth from "./pages/Auth";
import EventPreview from "./pages/EventPreview";
import PublicPlayerRanking from "./pages/PublicPlayerRanking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/club/:clubId/dashboard" element={<ProtectedRoute><ClubDashboard /></ProtectedRoute>} />
            <Route path="/club/:clubId/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
            <Route path="/club/:clubId/players" element={<ProtectedRoute><EnhancedPlayerManagement /></ProtectedRoute>} />
            <Route path="/club/:clubId/events" element={<ProtectedRoute><ViewAllEvents /></ProtectedRoute>} />
            <Route path="/club/:clubId/event/:eventId" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
            <Route path="/club/:clubId/event/:eventId/play" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/players" element={<ProtectedRoute><EnhancedPlayerManagement /></ProtectedRoute>} />
            <Route path="/player/:playerId" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
            <Route path="/club/:clubId/player/:playerId" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
            <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
            <Route path="/view-events" element={<ProtectedRoute><ViewAllEvents /></ProtectedRoute>} />
            <Route path="/event/:eventId" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
            <Route path="/event/:eventId/play" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/event/:eventId/preview" element={<EventPreview />} />
            <Route path="/event/:eventId/ranking" element={<PublicPlayerRanking />} />
            <Route path="/club/:clubId/ranking" element={<ProtectedRoute><PublicPlayerRanking /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
