import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EnhancedPlayerManagement from "./pages/EnhancedPlayerManagement";
import CreateEvent from "./pages/CreateEvent";
import EventDetails from "./pages/EventDetails";
import ViewAllEvents from "./pages/ViewAllEvents";
import PlayerProfile from "./pages/PlayerProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<Index />} />
          <Route path="/players" element={<EnhancedPlayerManagement />} />
          <Route path="/player/:playerId" element={<PlayerProfile />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/view-events" element={<ViewAllEvents />} />
          <Route path="/event/:eventId" element={<EventDetails />} />
          <Route path="/event/:eventId/play" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
