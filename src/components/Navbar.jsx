import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const perfilRota = user.tipo === "professor" ? "/professor/perfil" : "/aluno/perfil";
  const estaNoPerfil = location.pathname === perfilRota;

  const handlePerfilClick = () => {
    if (estaNoPerfil) {
      navigate(-1);
    } else {
      navigate(perfilRota);
    }
  };

  return (
    <div style={navbar}>
      <img 
        src="/logo.png" 
        alt="Inatelligent" 
        style={{ height: "32px", objectFit: "contain" }} 
      />
      <button
        onClick={handlePerfilClick}
        style={{
          ...buttonPerfil,
          background: estaNoPerfil ? "#a03030" : "var(--cor-primaria)",
        }}
        title={estaNoPerfil ? "Voltar" : "Meu perfil"}
      >
        {user?.nome?.charAt(0).toUpperCase() || "?"}
      </button>
    </div>
  );
}

const navbar = {
  position: "fixed", top: 0, left: 0, right: 0,
  height: "56px", background: "var(--bg-card)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "0 24px", zIndex: 100
};
const logo = { fontWeight: "bold", fontSize: "18px", color: "#4CAF50" };
const buttonPerfil = {
  width: "38px", height: "38px", borderRadius: "50%",
  border: "none", color: "#fff",
  fontSize: "16px", fontWeight: "bold", cursor: "pointer"
};