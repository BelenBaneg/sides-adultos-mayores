import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // 1. Consultamos de forma real al backend tRPC si hay una sesión activa en las cookies
  const { data: user, isLoading, error, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 2. Preparamos las mutaciones reales para conectar con tu backend
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate(); // Limpiamos la caché del usuario para que cargue el nuevo
      setLocation("/"); // Redirigimos al Panel de Control
    }
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/login"); // Expulsamos a la pantalla de acceso
    }
  });

  const isAuthenticated = !!user;

  // 3. Manejo de redirecciones automáticas basadas en la sesión real
  useEffect(() => {
    const shouldRedirect = options?.redirectOnUnauthenticated ?? true;
    
    if (!isLoading && !isAuthenticated && shouldRedirect) {
      const redirect = options?.redirectPath ?? "/login"; 
      setLocation(redirect);
    }
  }, [isLoading, isAuthenticated, options, setLocation]);

  return {
    user, // Devuelve el usuario real de MySQL (Belén Banegas)
    loading: isLoading,
    error: error || loginMutation.error,
    isAuthenticated,
    refresh: refetch,
    
    // Función de login que recibe el formulario de tu Home.tsx
    login: async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    
    // Función de logout que limpia las cookies HTTP de MySQL
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };
}