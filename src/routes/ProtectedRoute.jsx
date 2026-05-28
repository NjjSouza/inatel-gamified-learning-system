import { useAuth } from "../contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, allowedTipos }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    const destino = location.pathname + location.search;
    if (destino !== "/") {
      sessionStorage.setItem("redirectAfterLogin", destino);
    }
    return <Navigate to="/" replace />;
  }

  // Se a rota exige um tipo específico e o usuário não bate
  if (allowedTipos && !allowedTipos.includes(user.tipo)) {
    // Redireciona para o dashboard correto do usuário
    const fallback = user.tipo === "professor" ? "/professor" : "/aluno";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export default ProtectedRoute;