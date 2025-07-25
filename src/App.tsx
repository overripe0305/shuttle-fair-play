import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Index from "./pages/Index"; // this is your main queue app
import PlayerManagement from "./pages/PlayerManagement";
import NotFound from "./pages/NotFound";
// ...inside <Routes>
<Route path="/players" element={<PlayerManagement />} />

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
  <Route path="/players" element={<PlayerManagement />} />
  <Route path="*" element={<NotFound />} />
</Routes>


      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
