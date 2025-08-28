import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Ladders from "./pages/Ladders";
import Matches from "./pages/Matches";
import Join from "./pages/Join";
import SignIn from "./pages/SignIn";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Rules from "./pages/Rules";
import MarketPayment from "./pages/MarketPayment";
import JoinAdditionalLadder from "./pages/JoinAdditionalLadder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ladders" element={<Ladders />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/join" element={<Join />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/market-payment" element={<MarketPayment />} />
            <Route path="/join-additional" element={<ProtectedRoute><JoinAdditionalLadder /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
