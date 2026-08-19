import { ChakraProvider } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ColorModeProvider } from "./components/ui/color-mode";
import { system } from "./theme";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Residencias from "./pages/Residencias";
import AdultosMayores from "./pages/AdultosMayores";
import Alertas from "./pages/Alertas";
import Derivaciones from "./pages/Derivaciones";
import Seguimientos from "./pages/Seguimientos";
import VisitasReportes from "./pages/VisitasReportes";
import Home from "./pages/Home";
import Usuarios from "./pages/Usuarios";

function Router() {
  return (
    <Switch>
      {/* 🌐 RUTA PÚBLICA: La pantalla de Login (Va suelta, sin barra lateral) */}
      <Route path="/login" component={Home} />

      {/* 🔒 RUTAS PROTEGIDAS: Todas las que van dentro de la estructura con menú lateral */}
      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      
      <Route path="/residencias">
        <DashboardLayout>
          <Residencias />
        </DashboardLayout>
      </Route>

      <Route path="/adultos-mayores">
        <DashboardLayout>
          <AdultosMayores />
        </DashboardLayout>
      </Route>

      <Route path="/alertas">
        <DashboardLayout>
          <Alertas />
        </DashboardLayout>
      </Route>

      <Route path="/derivaciones">
        <DashboardLayout>
          <Derivaciones />
        </DashboardLayout>
      </Route>

      <Route path="/seguimientos">
        <DashboardLayout>
          <Seguimientos />
        </DashboardLayout>
      </Route>

      <Route path="/visitas-reportes">
        <DashboardLayout>
          <VisitasReportes />
        </DashboardLayout>
      </Route>

<Route path="/usuarios">
  <DashboardLayout>
    <Usuarios />
  </DashboardLayout>
</Route>

      {/* 404: Si no coincide con ninguna de las anteriores */}
      <Route path="/404">
        <NotFound />
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ChakraProvider value={system}>
        <ColorModeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ColorModeProvider>
      </ChakraProvider>
    </ErrorBoundary>
  );
}

export default App;