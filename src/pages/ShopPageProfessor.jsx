import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useShop } from "../hooks/useShop";
import Spinner from "../components/Spinner";
import TwemojiImg from "../components/TwemojiImg";
import CoinLottie from "../components/CoinLottie";
import EmptyState from "../components/EmptyState";

/**
 * ShopPageProfessor - gerenciamento da loja de benefícios de uma turma.
 * Recebe classId via props (embutida na ClassPageProfessor).
 */
export default function ShopPageProfessor({ classId, courseId }) {
  const {
    openShop, closeShop, reopenShop, updateShopTitle,
    getShopsByClass, addItem, updateItem, toggleItemDisponivel, deleteItem,
    getItems, getPurchasesByShop,
  } = useShop();

  const [lojas, setLojas]       = useState([]);
  const [lojaAtiva, setLojaAtiva] = useState(null); // loja selecionada para editar
  const [items, setItems]       = useState([]);
  const [compras, setCompras]   = useState([]);
  const [nomesAlunos, setNomesAlunos] = useState({});
  const [loading, setLoading]   = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("itens"); // "itens" / "compras"

  // Formulário novo item
  const [novoNome, setNovoNome]         = useState("");
  const [novaDesc, setNovaDesc]         = useState("");
  const [novoPreco, setNovoPreco]       = useState(50);
  const [adicionando, setAdicionando]   = useState(false);

  // Formulário nova loja
  const [novoTitulo, setNovoTitulo] = useState("");
  const [abrindoLoja, setAbrindoLoja] = useState(false);

  // Edição de item
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome]     = useState("");
  const [editDesc, setEditDesc]     = useState("");
  const [editPreco, setEditPreco]   = useState(10);

  const fetchLojas = async () => {
    const data = await getShopsByClass(classId);
    setLojas(data);
    // Seleciona a mais recente por padrão
    if (!lojaAtiva && data.length > 0) setLojaAtiva(data[0]);
    // Atualiza a loja ativa se já existia
    if (lojaAtiva) {
      const atualizada = data.find((l) => l.id === lojaAtiva.id);
      if (atualizada) setLojaAtiva(atualizada);
    }
  };

  const fetchItems = async (shopId) => {
    const data = await getItems(shopId);
    setItems(data);
  };

  const fetchCompras = async (shopId) => {
    const data = await getPurchasesByShop(shopId);
    setCompras(data);
    // Busca nomes dos alunos
    const ids = [...new Set(data.map((c) => c.userId).filter(Boolean))];
    const nomes = {};
    await Promise.all(
      ids.map(async (uid) => {
        const snap = await getDoc(doc(db, "usuarios", uid));
        nomes[uid] = snap.exists() ? snap.data().nome || snap.data().email : uid;
      })
    );
    setNomesAlunos(nomes);
  };

  useEffect(() => {
    const init = async () => {
      await fetchLojas();
      setLoading(false);
    };
    init();
  }, [classId]);

  useEffect(() => {
    if (!lojaAtiva) return;
    fetchItems(lojaAtiva.id);
    fetchCompras(lojaAtiva.id);
  }, [lojaAtiva?.id]);

  const handleAbrirLoja = async () => {
    if (abrindoLoja) return;
    setAbrindoLoja(true);
    try {
      const { id } = await openShop(classId, novoTitulo || "Nova Loja");
      setNovoTitulo("");
      const novasLojas = await getShopsByClass(classId);
      setLojas(novasLojas);
      const nova = novasLojas.find((l) => l.id === id);
      if (nova) setLojaAtiva(nova);
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      setAbrindoLoja(false);
    }
  };

  const handleFecharLoja = async () => {
    if (!lojaAtiva) return;
    if (!window.confirm("Fechar a loja? Os alunos não poderão mais comprar nesta instância.")) return;
    await closeShop(lojaAtiva.id);
    await fetchLojas();
  };

  const handleReabrirLoja = async () => {
    if (!lojaAtiva) return;
    await reopenShop(lojaAtiva.id);
    await fetchLojas();
  };

  const handleAddItem = async () => {
    if (adicionando) return;
    setAdicionando(true);
    try {
      await addItem(lojaAtiva.id, classId, {
        nome: novoNome, descricao: novaDesc, preco: novoPreco,
      });
      setNovoNome(""); setNovaDesc(""); setNovoPreco(50);
      await fetchItems(lojaAtiva.id);
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      setAdicionando(false);
    }
  };

  const handleSaveEdit = async (itemId) => {
    try {
      await updateItem(itemId, { nome: editNome, descricao: editDesc, preco: editPreco, disponivel: true });
      setEditandoId(null);
      await fetchItems(lojaAtiva.id);
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  const handleToggle = async (item) => {
    await toggleItemDisponivel(item.id, !item.disponivel);
    await fetchItems(lojaAtiva.id);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Remover este item?")) return;
    try {
      await deleteItem(itemId);
      await fetchItems(lojaAtiva.id);
    } catch (e) {
      alert(e.message);
    }
  };

  const startEdit = (item) => {
    setEditandoId(item.id);
    setEditNome(item.nome);
    setEditDesc(item.descricao || "");
    setEditPreco(item.preco);
  };

  if (loading) return <Spinner />;

  const lojaAberta = lojaAtiva?.status === "open";

  return (
    <div style={wrapper}>
      {/* Cabeçalho */}
      <div style={cabecalho}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={{ margin: 0, fontFamily: "'Fredoka One', sans-serif", fontSize: "20px", color: "var(--texto)" }}>
            Loja de Benefícios
          </h2>
        </div>
        <span style={{ fontSize: "13px", color: "var(--texto-muito-suave)" }}>
          Cada abertura é uma instância independente - alunos podem comprar novamente a cada prova.
        </span>
      </div>

      {/* Seletor de lojas */}
      <div style={seletorWrap}>
        <div style={seletorScroll}>
          {lojas.map((l) => (
            <button
              key={l.id}
              onClick={() => setLojaAtiva(l)}
              style={{
                ...chipLoja,
                background: lojaAtiva?.id === l.id
                  ? (l.status === "open" ? "var(--cor-primaria)" : "var(--texto-suave)")
                  : "var(--bg-input)",
                color: lojaAtiva?.id === l.id ? "#fff" : "var(--texto)",
                borderColor: lojaAtiva?.id === l.id ? "transparent" : "var(--borda)",
              }}
            >
              {l.status === "open" ? "● " : "○ "}
              {l.titulo}
            </button>
          ))}

          {/* Criar nova loja */}
          <div style={novaLojaRow}>
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Ex: Loja Prova 1"
              style={{ ...inputSm, width: "160px" }}
              onKeyDown={(e) => e.key === "Enter" && handleAbrirLoja()}
            />
            <button
              onClick={handleAbrirLoja}
              disabled={abrindoLoja}
              style={btnNova}
            >
              + Abrir loja
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo da loja selecionada */}
      {!lojaAtiva ? (
        <EmptyState
          icon="bag"
          variante="primaria"
          titulo="Abra sua primeira loja"
          mensagem="Use o campo acima para nomear e abrir uma loja para esta turma."
        />
      ) : (
        <>
          {/* Status + ações da loja */}
          <div style={lojaStatusRow}>
            <div>
              <span style={lojaAberta ? badgeAberto : badgeFechado}>
                {lojaAberta ? "● Aberta" : "○ Fechada"}
              </span>
              <span style={{ fontSize: "13px", color: "var(--texto-muito-suave)", marginLeft: "10px" }}>
                {lojaAtiva.createdAt?.toDate
                  ? lojaAtiva.createdAt.toDate().toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })
                  : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {lojaAberta ? (
                <button onClick={handleFecharLoja} style={btnFechar}>Fechar loja</button>
              ) : (
                <button onClick={handleReabrirLoja} style={btnReabrir}>Reabrir loja</button>
              )}
            </div>
          </div>

          {/* Abas */}
          <div style={tabsRow}>
            <button
              onClick={() => setAbaAtiva("itens")}
              style={{ ...tabBtn, ...(abaAtiva === "itens" ? tabBtnAtivo : {}) }}
            >
              Produtos ({items.length})
            </button>
            <button
              onClick={() => setAbaAtiva("compras")}
              style={{ ...tabBtn, ...(abaAtiva === "compras" ? tabBtnAtivo : {}) }}
            >
              Compras ({compras.length})
            </button>
          </div>

          {/* ABA: ITENS */}
          {abaAtiva === "itens" && (
            <div>
              {/* Formulário novo item */}
              {lojaAberta && (
                <div style={formCard}>
                  <p style={formTitulo}>Adicionar produto</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Nome do benefício"
                      style={input}
                    />
                    <input
                      value={novaDesc}
                      onChange={(e) => setNovaDesc(e.target.value)}
                      placeholder="Descrição (opcional)"
                      style={input}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={labelPreco}>Preço:</label>
                      <input
                        type="number" min="1"
                        value={novoPreco}
                        onChange={(e) => setNovoPreco(e.target.value)}
                        style={{ ...input, width: "90px", marginBottom: 0 }}
                      />
                      <span style={{ fontSize: "13px", color: "var(--texto-muito-suave)" }}>moedas</span>
                      <button
                        onClick={handleAddItem}
                        disabled={adicionando || !novoNome.trim()}
                        style={{
                          ...btnPrimary,
                          marginLeft: "auto",
                          opacity: !novoNome.trim() ? 0.5 : 1,
                        }}
                      >
                        {adicionando ? "Adicionando..." : "Adicionar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de itens */}
              {items.length === 0 ? (
                <EmptyState
                  icon="bag"
                  variante={lojaAberta ? "primaria" : "neutro"}
                  compacto
                  titulo="Nenhum produto cadastrado"
                  mensagem={lojaAberta ? "Adicione o primeiro produto usando o formulário acima." : undefined}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {items.map((item) => (
                    <div key={item.id} style={itemCard(item.disponivel)}>
                      {editandoId === item.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input value={editNome} onChange={(e) => setEditNome(e.target.value)} style={input} placeholder="Nome" />
                          <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={input} placeholder="Descrição" />
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <label style={labelPreco}>Preço:</label>
                            <input type="number" min="1" value={editPreco} onChange={(e) => setEditPreco(e.target.value)} style={{ ...input, width: "80px", marginBottom: 0 }} />
                            <span style={{ fontSize: "13px", color: "var(--texto-muito-suave)" }}>moedas</span>
                            <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                              <button onClick={() => handleSaveEdit(item.id)} style={btnPrimary}>Salvar</button>
                              <button onClick={() => setEditandoId(null)} style={btnSec}>Cancelar</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: "700", fontSize: "15px", color: item.disponivel ? "var(--texto)" : "var(--texto-muito-suave)" }}>
                                {item.nome}
                              </span>
                              <span style={moedasBadge}><CoinLottie size={16} /> {item.preco}</span>
                              {!item.disponivel && <span style={badgeIndisponivel}>indisponível</span>}
                            </div>
                            {item.descricao && (
                              <p style={{ fontSize: "13px", color: "var(--texto-suave)", margin: "4px 0 0" }}>
                                {item.descricao}
                              </p>
                            )}
                          </div>
                          {lojaAberta && (
                            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                              <button onClick={() => handleToggle(item)} style={btnToggle(item.disponivel)} title={item.disponivel ? "Desativar" : "Ativar"}>
                                {item.disponivel ? "Desativar" : "Ativar"}
                              </button>
                              <button onClick={() => startEdit(item)} style={btnEditar}>Editar</button>
                              <button onClick={() => handleDelete(item.id)} style={btnDeletar} title="Remover">✕</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA: COMPRAS */}
          {abaAtiva === "compras" && (
            <div>
              {compras.length === 0 ? (
                <EmptyState
                  icon="inbox"
                  variante="neutro"
                  compacto
                  titulo="Nenhuma compra realizada ainda. Avise os alunos sobre a abertura!"
                />
              ) : (
                <table style={tabela}>
                  <thead>
                    <tr>
                      <th style={th}>Aluno</th>
                      <th style={th}>Item</th>
                      <th style={th}>Preço</th>
                      <th style={th}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...compras]
                      .sort((a, b) => {
                        const ta = a.purchasedAt?.toMillis?.() ?? 0;
                        const tb = b.purchasedAt?.toMillis?.() ?? 0;
                        return tb - ta;
                      })
                      .map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid var(--borda)" }}>
                          <td style={td}>{nomesAlunos[c.userId] || "-"}</td>
                          <td style={{ ...td, textAlign: "left" }}>{c.itemNome}</td>
                          <td style={td}>
                            <span style={moedasBadge}><CoinLottie size={16} /> {c.itemPreco}</span>
                          </td>
                          <td style={{ ...td, fontSize: "12px", color: "var(--texto-muito-suave)" }}>
                            {c.purchasedAt?.toDate
                              ? c.purchasedAt.toDate().toLocaleString("pt-BR", {
                                  day: "2-digit", month: "2-digit",
                                  hour: "2-digit", minute: "2-digit",
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Estilos */
const wrapper = { width: "100%" };

const cabecalho = {
  display: "flex", flexDirection: "column", gap: "4px",
  marginBottom: "16px",
};

const seletorWrap = { marginBottom: "16px" };
const seletorScroll = {
  display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center",
};

const chipLoja = {
  padding: "6px 14px", borderRadius: "20px", border: "1px solid",
  fontSize: "13px", fontWeight: "600", cursor: "pointer",
  transition: "all 0.15s", whiteSpace: "nowrap",
};

const novaLojaRow = {
  display: "flex", alignItems: "center", gap: "6px",
};

const inputSm = {
  padding: "6px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontSize: "13px",
};

const btnNova = {
  padding: "6px 12px", borderRadius: "6px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
  whiteSpace: "nowrap",
};

const vazio = { padding: "24px", textAlign: "center" };

const lojaStatusRow = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "16px",
  padding: "12px 16px", borderRadius: "10px",
  background: "var(--bg-input)", border: "1px solid var(--borda)",
  flexWrap: "wrap", gap: "8px",
};

const badgeAberto = {
  fontSize: "13px", fontWeight: "bold",
  color: "var(--cor-primaria)", background: "var(--cor-primaria-claro)",
  padding: "3px 10px", borderRadius: "10px",
};

const badgeFechado = {
  fontSize: "13px", fontWeight: "bold",
  color: "var(--texto-muito-suave)", background: "var(--bg-hover)",
  padding: "3px 10px", borderRadius: "10px",
  border: "1px solid var(--borda)",
};

const badgeIndisponivel = {
  fontSize: "11px", padding: "2px 7px", borderRadius: "8px",
  background: "var(--bg-hover)", color: "var(--texto-muito-suave)",
  border: "1px solid var(--borda)", fontWeight: "600",
};

const tabsRow = {
  display: "flex", gap: "4px", marginBottom: "16px",
  borderBottom: "2px solid var(--borda)",
};

const tabBtn = {
  padding: "8px 16px", border: "none", background: "none",
  fontSize: "14px", fontWeight: "600", color: "var(--texto-suave)",
  cursor: "pointer", borderBottom: "2px solid transparent",
  marginBottom: "-2px", transition: "color 0.15s",
};

const tabBtnAtivo = {
  color: "var(--cor-primaria)",
  borderBottom: "2px solid var(--cor-primaria)",
};

const formCard = {
  background: "var(--bg-input)", borderRadius: "10px",
  padding: "16px", marginBottom: "16px",
  border: "1px solid var(--borda)",
};

const formTitulo = {
  fontSize: "13px", fontWeight: "700",
  color: "var(--texto-muito-suave)", textTransform: "uppercase",
  letterSpacing: "0.4px", margin: "0 0 12px",
};

const input = {
  width: "100%", padding: "8px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)",
  background: "var(--bg-card)", color: "var(--texto)",
  fontSize: "14px", boxSizing: "border-box",
};

const labelPreco = {
  fontSize: "13px", fontWeight: "600", color: "var(--texto-suave)",
  whiteSpace: "nowrap",
};

const itemCard = (disponivel) => ({
  padding: "14px 16px", borderRadius: "10px",
  border: `1px solid ${disponivel ? "var(--borda)" : "var(--borda)"}`,
  background: disponivel ? "var(--bg-card)" : "var(--bg-hover)",
  opacity: disponivel ? 1 : 0.7,
  transition: "opacity 0.2s",
});

const moedasBadge = {
  fontSize: "12px", fontWeight: "bold",
  background: "#fff8e1", color: "#e65100",
  padding: "2px 8px", borderRadius: "10px",
  border: "1px solid #ffe0b2",
  display: "inline-flex", alignItems: "center", gap: "4px",
};

const tabela = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const th = {
  padding: "8px 10px", fontSize: "11px", fontWeight: "700",
  color: "var(--texto-muito-suave)", textTransform: "uppercase",
  letterSpacing: "0.4px", borderBottom: "2px solid var(--borda)",
  textAlign: "center",
};
const td = { padding: "10px", color: "var(--texto)", textAlign: "center" };

const btnPrimary = {
  padding: "7px 14px", borderRadius: "7px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};

const btnSec = {
  padding: "7px 12px", borderRadius: "7px",
  border: "1px solid var(--borda)",
  background: "var(--bg-card)", color: "var(--texto)",
  fontSize: "13px", cursor: "pointer",
};

const btnFechar = {
  padding: "6px 14px", borderRadius: "7px", border: "none",
  background: "var(--cor-perigo)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};

const btnReabrir = {
  padding: "6px 14px", borderRadius: "7px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};

const btnToggle = (ativo) => ({
  padding: "5px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)",
  background: ativo ? "var(--bg-hover)" : "var(--cor-primaria-claro)",
  color: ativo ? "var(--texto-suave)" : "var(--cor-primaria-texto)",
  fontSize: "12px", fontWeight: "600", cursor: "pointer",
});

const btnEditar = {
  padding: "5px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)",
  background: "var(--bg-card)", color: "var(--texto)",
  fontSize: "12px", cursor: "pointer",
};

const btnDeletar = {
  padding: "5px 8px", borderRadius: "6px", border: "none",
  background: "var(--cor-perigo-claro)", color: "var(--cor-perigo)",
  fontSize: "13px", cursor: "pointer", fontWeight: "bold",
};