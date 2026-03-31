import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import SuratList from "@/pages/surat-list";
import SuratCreate from "@/pages/surat-create";
import SuratDetail from "@/pages/surat-detail";

const queryClient = new QueryClient();

// A simple protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Redirect to="/login" replace />;
  }
  
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/surat">
        {() => <ProtectedRoute component={SuratList} />}
      </Route>
      <Route path="/surat/baru">
        {() => <ProtectedRoute component={SuratCreate} />}
      </Route>
      <Route path="/surat/:id">
        {() => <ProtectedRoute component={SuratDetail} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
