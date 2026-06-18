import {
  EMPTY_STATE_ICONS,
  IconInbox,
} from "./EmptyStateIcons";

export default function EmptyState({
  variante = "neutro",
  icon = "inbox",
  titulo,
  mensagem,
  acao,
  compacto = false,
}) {
  const cores = VARIANTES[variante] ?? VARIANTES.neutro;

  const Icon =
    typeof icon === "string"
      ? (EMPTY_STATE_ICONS[icon] || IconInbox)
      : (icon || IconInbox);

  return (
    <div
      style={{
        ...wrapper,
        ...(compacto ? wrapperCompacto : {}),
        borderColor: cores.borda,
        background: cores.fundo,
      }}
    >
      <div style={{ ...iconCirculo, color: cores.texto }}>
        <Icon style={{ width: 24, height: 24 }} />
      </div>

      {titulo && (
        <p style={{ ...tituloStyle, color: cores.texto }}>
          {titulo}
        </p>
      )}

      {mensagem && (
        <p style={mensagemStyle}>
          {mensagem}
        </p>
      )}

      {acao && (
        <button
          onClick={acao.onClick}
          style={{
            ...botaoStyle,
            background: cores.cta,
          }}
        >
          {acao.label}
        </button>
      )}
    </div>
  );
}

/* VARIANTES */

const VARIANTES = {
  neutro: {
    borda: "var(--borda)",
    fundo: "var(--bg-input)",
    texto: "var(--texto-suave)",
    cta: "var(--texto-suave)",
  },

  primaria: {
    borda: "var(--cor-primaria-borda)",
    fundo: "var(--cor-primaria-claro)",
    texto: "var(--cor-primaria-texto)",
    cta: "var(--cor-primaria)",
  },

  inatel: {
    borda: "var(--cor-inatel-borda)",
    fundo: "var(--cor-inatel-claro)",
    texto: "var(--cor-inatel-texto)",
    cta: "var(--cor-inatel)",
  },

  aviso: {
    borda: "var(--cor-aviso-borda)",
    fundo: "var(--cor-aviso-claro)",
    texto: "var(--cor-aviso-texto)",
    cta: "var(--cor-aviso)",
  },

  perigo: {
    borda: "var(--cor-perigo-borda)",
    fundo: "var(--cor-perigo-claro)",
    texto: "var(--cor-perigo-texto)",
    cta: "var(--cor-perigo)",
  },
};

/* ESTILOS */

const wrapper = {
  textAlign: "center",
  padding: "28px 20px",
  borderRadius: "12px",
  border: "1.5px dashed",
  transition: "background 0.2s, border-color 0.2s",
};

const wrapperCompacto = {
  padding: "18px 14px",
};

const iconCirculo = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "var(--bg-card)",
  border: "1px solid var(--borda)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 12px",
};

const tituloStyle = {
  fontWeight: 700,
  fontSize: "15px",
  margin: "0 0 4px",
  fontFamily: "'Fredoka One', sans-serif",
};

const mensagemStyle = {
  fontSize: "13px",
  color: "var(--texto-suave)",
  margin: 0,
  lineHeight: 1.5,
};

const botaoStyle = {
  marginTop: "14px",
  padding: "8px 16px",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "inherit",
};