import { useNavigate } from "react-router-dom";

export default function BackButton({ label = "Voltar", to = null }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <button onClick={handleClick} style={btn}>
      <Arrow />
      {label}
    </button>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

const btn = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "none",
  border: "none",
  color: "var(--texto-suave)",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  padding: "4px 0",
  marginBottom: "16px",
  fontFamily: "inherit",
  transition: "color 0.15s",
};