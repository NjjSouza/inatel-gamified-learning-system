import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

export default function Navbar({ onMenuToggle, menuOpen }) {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const isMobile   = useIsMobile();

  if (!user) return null;

  const isProfessor  = user.tipo === "professor";
  const perfilRota   = isProfessor ? "/professor/perfil" : "/aluno/perfil";
  const homeRota     = isProfessor ? "/professor" : "/aluno";
  const estaNoPerfil = location.pathname === perfilRota;
  const estaNaHome   = location.pathname === homeRota;

  const showHamburger = isProfessor && isMobile;
  const showVoltar    = !estaNaHome;              

  const handlePerfilClick = () => navigate(estaNoPerfil ? -1 : perfilRota);
  const handleLogoClick   = () => navigate(homeRota);
  const handleVoltar      = () => navigate(-1);

  return (
    <div style={navbar}>
      {/* Lado esquerdo: hambúrguer + logo + voltar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {showHamburger && (
          <button
            onClick={onMenuToggle}
            style={hamburgerBtn}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            title={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            <HamburgerIcon open={menuOpen} />
          </button>
        )}

        <img
          src="/logo.png"
          alt="Inatelligent"
          onClick={handleLogoClick}
          style={{ height: "32px", objectFit: "contain", cursor: "pointer" }}
          title="Ir para o início"
        />

        {showVoltar && (
          <button onClick={handleVoltar} style={buttonVoltar} title="Voltar">
            <ArrowIcon />
            {!isMobile && <span>Voltar</span>}
          </button>
        )}
      </div>

      {/* Lado direito: perfil */}
      <button
        onClick={handlePerfilClick}
        style={{
          ...buttonPerfil,
          background: estaNoPerfil ? "var(--cor-primaria-hover)" : "var(--cor-primaria)",
        }}
        title={estaNoPerfil ? "Voltar" : "Meu perfil"}
      >
        {user?.nome?.charAt(0).toUpperCase() || "?"}
      </button>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {open ? (
        <>
          <line x1="18" y1="6"  x2="6"  y2="18" />
          <line x1="6"  y1="6"  x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7"  x2="21" y2="7"  />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  );
}

const navbar = {
  position: "fixed", top: 0, left: 0, right: 0,
  height: "56px",
  background: "var(--bg-card)",
  borderBottom: "1px solid var(--borda)",
  boxShadow: "var(--sombra-card)",
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "0 24px", zIndex: 100,
};

const hamburgerBtn = {
  background: "none", border: "none",
  color: "var(--texto)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "6px", borderRadius: "8px",
};

const buttonVoltar = {
  display: "inline-flex", alignItems: "center", gap: "4px",
  background: "none", border: "none",
  color: "var(--texto-suave)",      
  fontSize: "15px",                   
  fontWeight: "400",                 
  fontFamily: "'Fredoka One', sans-serif", 
  cursor: "pointer",
  padding: "6px 8px", borderRadius: "8px",
  letterSpacing: "0.3px",            
  transition: "color 0.15s",
};

const buttonPerfil = {
  width: "38px", height: "38px", borderRadius: "50%",
  border: "none", color: "#fff",
  fontSize: "16px", fontWeight: "bold", cursor: "pointer",
  transition: "background 0.2s", flexShrink: 0,
};