import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useShop } from "../hooks/useShop";
import Spinner from "../components/Spinner";

/**
 * ShopPageAluno - vitrine de benefícios de uma turma.
 * Recebe classId via props (embutida na CoursePageAluno / ClassPageAluno).
 */
export default function ShopPageAluno({ classId }) {
  const { user } = useAuth();
  const { getOpenShop, getItems, getPurchasedItemIds, purchaseItem, getCoinBalance } = useShop();

  const [loja, setLoja]               = useState(null);   // loja aberta ou null
  const [items, setItems]             = useState([]);
  const [comprados, setComprados]     = useState(new Set());
  const [saldo, setSaldo]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [comprando, setComprando]     = useState(null);   // itemId em andamento
  const [erroCompra, setErroCompra]   = useState({});     // { [itemId]: msg }
  const [sucessoCompra, setSucessoCompra] = useState({}); // { [itemId]: true }

  const fetchTudo = async () => {
    setLoading(true);
    try {
      const lojaAberta = await getOpenShop(classId);
      setLoja(lojaAberta);

      if (lojaAberta) {
        const [itens, jaComprados, saldoAtual] = await Promise.all([
          getItems(lojaAberta.id),
          getPurchasedItemIds(lojaAberta.id),
          getCoinBalance(classId),
        ]);
        setItems(itens.filter((i) => i.disponivel));
        setComprados(jaComprados);
        setSaldo(saldoAtual);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) fetchTudo();
  }, [classId]);

  const handleComprar = async (item) => {
    if (comprando) return;
    setErroCompra((prev) => ({ ...prev, [item.id]: null }));
    setSucessoCompra((prev) => ({ ...prev, [item.id]: false }));
    setComprando(item.id);
    try {
      await purchaseItem(loja.id, item);
      // Atualiza estado local imediatamente
      setComprados((prev) => new Set([...prev, item.id]));
      setSaldo((prev) => prev - item.preco);
      setSucessoCompra((prev) => ({ ...prev, [item.id]: true }));
    } catch (e) {
      setErroCompra((prev) => ({ ...prev, [item.id]: e.message }));
    } finally {
      setComprando(null);
    }
  };

  if (loading) return <Spinner />;

  // Loja fechada ou inexistente
  if (!loja) {
    return (
      <div style={wrapper}>
        <div style={cabecalho}>
          <h2 style={titulo}>Loja de Benefícios</h2>
        </div>
        <div style={lojaFechadaCard}>
          <span style={{ fontSize: "40px", display: "block", marginBottom: "12px" }}>🔒</span>
          <p style={{ fontWeight: "bold", color: "var(--texto)", fontSize: "15px", margin: "0 0 4px" }}>
            Loja fechada
          </p>
          <p style={{ fontSize: "13px", color: "var(--texto-suave)", margin: 0 }}>
            O professor abrirá a loja próximo às datas de prova.
          </p>
        </div>
      </div>
    );
  }

  const itensDisponiveis = items.filter((i) => !comprados.has(i.id));
  const itensComprados   = items.filter((i) => comprados.has(i.id));

  return (
    <div style={wrapper}>
      {/* Cabeçalho */}
      <div style={cabecalho}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h2 style={titulo}>{loja.titulo}</h2>
          <span style={badgeAberto}>● Aberta</span>
        </div>
        {/* Saldo */}
        <div style={saldoBox}>
          <span style={{ fontSize: "20px" }}>💰</span>
          <span style={saldoNum}>{saldo}</span>
          <span style={{ fontSize: "13px", color: "var(--texto-suave)" }}>
            moeda{saldo !== 1 ? "s" : ""} disponíveis
          </span>
        </div>
      </div>

      {/* Sem itens */}
      {items.length === 0 && (
        <p style={{ color: "var(--texto-suave)", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>
          Nenhum benefício disponível ainda.
        </p>
      )}

      {/* Grid de itens disponíveis */}
      {itensDisponiveis.length > 0 && (
        <div style={grid}>
          {itensDisponiveis.map((item) => {
            const semSaldo   = saldo < item.preco;
            const emAndamento = comprando === item.id;
            const erro       = erroCompra[item.id];

            return (
              <div key={item.id} style={itemCard(false, semSaldo)}>
                <div style={itemTop}>
                  <span style={itemNome}>{item.nome}</span>
                  <span style={precoBadge}>💰 {item.preco}</span>
                </div>
                {item.descricao && (
                  <p style={itemDesc}>{item.descricao}</p>
                )}

                {erro && (
                  <p style={erroTexto}>{erro}</p>
                )}

                <button
                  onClick={() => handleComprar(item)}
                  disabled={semSaldo || !!comprando}
                  style={{
                    ...btnComprar,
                    opacity: semSaldo || comprando ? 0.5 : 1,
                    cursor: semSaldo || comprando ? "default" : "pointer",
                    background: semSaldo ? "var(--bg-hover)" : "var(--cor-primaria)",
                    color: semSaldo ? "var(--texto-muito-suave)" : "#fff",
                  }}
                >
                  {emAndamento ? "Comprando..." : semSaldo ? "Saldo insuficiente" : "Comprar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Itens já comprados */}
      {itensComprados.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <p style={secaoLabel}>Já comprados nesta loja</p>
          <div style={grid}>
            {itensComprados.map((item) => (
              <div key={item.id} style={itemCard(true, false)}>
                <div style={itemTop}>
                  <span style={{ ...itemNome, color: "var(--cor-primaria)" }}>{item.nome}</span>
                  <span style={precoBadge}>💰 {item.preco}</span>
                </div>
                {item.descricao && <p style={itemDesc}>{item.descricao}</p>}
                <div style={compradoBadge}>
                  <span>✓ Benefício adquirido</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aviso de recompra */}
      <p style={aviso}>
        Cada benefício pode ser comprado uma vez por loja. O professor abrirá uma nova loja para a próxima prova.
      </p>
    </div>
  );
}

/* Estilos */
const wrapper = { width: "100%" };

const cabecalho = {
  display: "flex", justifyContent: "space-between",
  alignItems: "flex-start", flexWrap: "wrap",
  gap: "12px", marginBottom: "20px",
};

const titulo = {
  margin: 0, fontFamily: "'Fredoka One', sans-serif",
  fontSize: "20px", color: "var(--texto)",
};

const badgeAberto = {
  fontSize: "12px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria)",
  padding: "3px 10px", borderRadius: "10px",
};

const saldoBox = {
  display: "flex", alignItems: "center", gap: "6px",
  background: "#fff8e1", borderRadius: "12px",
  padding: "8px 16px", border: "1px solid #ffe0b2",
  flexShrink: 0,
};

const saldoNum = {
  fontSize: "22px", fontWeight: "bold",
  fontFamily: "'Fredoka One', sans-serif",
  color: "#e65100",
};

const lojaFechadaCard = {
  textAlign: "center", padding: "32px",
  background: "var(--bg-input)", borderRadius: "12px",
  border: "1px solid var(--borda)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "14px",
};

const itemCard = (comprado, semSaldo) => ({
  background: comprado ? "var(--cor-primaria-claro)" : "var(--bg-card)",
  border: `1px solid ${comprado ? "var(--cor-primaria-borda)" : "var(--borda)"}`,
  borderRadius: "12px", padding: "16px",
  display: "flex", flexDirection: "column", gap: "8px",
  opacity: semSaldo && !comprado ? 0.75 : 1,
  transition: "opacity 0.2s",
});

const itemTop = {
  display: "flex", justifyContent: "space-between",
  alignItems: "flex-start", gap: "8px",
};

const itemNome = {
  fontWeight: "700", fontSize: "15px",
  color: "var(--texto)", flex: 1, lineHeight: 1.3,
};

const precoBadge = {
  fontSize: "12px", fontWeight: "bold",
  background: "#fff8e1", color: "#e65100",
  padding: "3px 8px", borderRadius: "10px",
  border: "1px solid #ffe0b2", flexShrink: 0,
};

const itemDesc = {
  fontSize: "13px", color: "var(--texto-suave)",
  margin: 0, lineHeight: 1.4,
};

const erroTexto = {
  fontSize: "12px", color: "var(--cor-perigo)",
  margin: 0, lineHeight: 1.4,
};

const btnComprar = {
  width: "100%", padding: "9px",
  borderRadius: "8px", border: "none",
  fontWeight: "bold", fontSize: "14px",
  transition: "opacity 0.15s",
  marginTop: "4px",
};

const compradoBadge = {
  fontSize: "13px", fontWeight: "bold",
  color: "var(--cor-primaria-texto)",
  textAlign: "center", padding: "6px 0",
};

const secaoLabel = {
  fontSize: "12px", fontWeight: "700",
  color: "var(--texto-muito-suave)", textTransform: "uppercase",
  letterSpacing: "0.4px", marginBottom: "10px",
};

const aviso = {
  fontSize: "12px", color: "var(--texto-muito-suave)",
  textAlign: "center", marginTop: "20px", lineHeight: 1.5,
};