import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useShop } from "../hooks/useShop";
import Spinner from "../components/Spinner";
import CoinLottie from "../components/CoinLottie";
import EmptyState from "../components/EmptyState";

/**
 * ShopPageProfessor - gerenciamento da loja de benefícios de uma turma.
 *
 * Abas:
 *   "itens"    - produtos ativos na loja selecionada
 *   "compras"  - histórico de compras da loja selecionada
 *   "catalogo" - catálogo persistente do professor (independe de qual loja está selecionada)
 *
 * Fluxo de catálogo -> loja:
 *   O professor cria/edita itens no catálogo (aba "Catálogo").
 *   Na aba "Itens", um painel colapsável "Adicionar do catálogo" exibe os itens disponíveis
 *   com um botão "+ Adicionar" que os instancia na loja atual com preço/descrição pré-preenchidos.
 *   Após instanciado, o item pode ter preço e disponibilidade ajustados por instância, e pode
 *   ser removido da loja sem afetar o catálogo.
 */
export default function ShopPageProfessor({ classId, courseId }) {
  const {
    openShop, closeShop, reopenShop, deleteShop,
    getShopsByClass, addItem, addItemFromCatalog, updateItem,
    toggleItemDisponivel, deleteItem, getItems, getPurchasesByShop,
    addCatalogItem, updateCatalogItem, deleteCatalogItem, getCatalogItems,
  } = useShop();

  // Estado geral 
  const [lojas, setLojas]           = useState([]);
  const [lojaAtiva, setLojaAtiva]   = useState(null);
  const [items, setItems]           = useState([]);
  const [compras, setCompras]       = useState([]);
  const [nomesAlunos, setNomesAlunos] = useState({});
  const [loading, setLoading]       = useState(true);
  const [abaAtiva, setAbaAtiva]     = useState("itens");

  // Catálogo
  const [catalogItems, setCatalogItems]     = useState([]);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false); // painel dentro da aba itens
  // IDs já instanciados na loja ativa (para desabilitar botão de adicionar)
  const [instanciadosNaLoja, setInstanciadosNaLoja] = useState(new Set());

  // Formulário novo item de catálogo
  const [catNome, setCatNome]             = useState("");
  const [catDesc, setCatDesc]             = useState("");
  const [catPreco, setCatPreco]           = useState(50);
  const [salvandoCat, setSalvandoCat]     = useState(false);

  // Edição de item do catálogo
  const [editCatId, setEditCatId]         = useState(null);
  const [editCatNome, setEditCatNome]     = useState("");
  const [editCatDesc, setEditCatDesc]     = useState("");
  const [editCatPreco, setEditCatPreco]   = useState(10);

  // Itens da loja 
  const [novoNome, setNovoNome]           = useState("");
  const [novaDesc, setNovaDesc]           = useState("");
  const [novoPreco, setNovoPreco]         = useState(50);
  const [adicionando, setAdicionando]     = useState(false);

  const [novoTitulo, setNovoTitulo]       = useState("");
  const [abrindoLoja, setAbrindoLoja]     = useState(false);

  const [editandoId, setEditandoId]       = useState(null);
  const [editNome, setEditNome]           = useState("");
  const [editDesc, setEditDesc]           = useState("");
  const [editPreco, setEditPreco]         = useState(10);

  // Carregamento inicial 
  const fetchLojas = async () => {
    const data = await getShopsByClass(classId);
    setLojas(data);
    if (!lojaAtiva && data.length > 0) setLojaAtiva(data[0]);
    if (lojaAtiva) {
      const atualizada = data.find((l) => l.id === lojaAtiva.id);
      if (atualizada) setLojaAtiva(atualizada);
    }
  };

  const fetchItems = async (shopId) => {
    const data = await getItems(shopId);
    setItems(data);
    // Atualiza quais catalogItemIds já estão instanciados nesta loja
    const ids = new Set(data.map((i) => i.catalogItemId).filter(Boolean));
    setInstanciadosNaLoja(ids);
  };

  const fetchCompras = async (shopId) => {
    const data = await getPurchasesByShop(shopId);
    setCompras(data);
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

  const fetchCatalog = async () => {
    const data = await getCatalogItems();
    setCatalogItems(data);
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchLojas(), fetchCatalog()]);
      setLoading(false);
    };
    init();
  }, [classId]);

  useEffect(() => {
    if (!lojaAtiva) return;
    fetchItems(lojaAtiva.id);
    fetchCompras(lojaAtiva.id);
  }, [lojaAtiva?.id]);

  // Handlers: loja 
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

  const handleDeleteShop = async () => {
    if (!lojaAtiva) return;
    if (!window.confirm(
      `Excluir permanentemente a loja "${lojaAtiva.titulo}"?\n\nEsta ação não pode ser desfeita. Só é permitida em lojas fechadas sem histórico de compras.`
    )) return;
    try {
      await deleteShop(lojaAtiva.id);
      // Seleciona a próxima loja disponível, ou limpa
      const novasLojas = await getShopsByClass(classId);
      setLojas(novasLojas);
      setLojaAtiva(novasLojas[0] ?? null);
    } catch (e) {
      alert("Não foi possível excluir: " + e.message);
    }
  };

  // Handlers: itens avulsos
  const handleAddItem = async () => {
    if (adicionando) return;
    setAdicionando(true);
    try {
      await addItem(lojaAtiva.id, classId, { nome: novoNome, descricao: novaDesc, preco: novoPreco });
      setNovoNome(""); setNovaDesc(""); setNovoPreco(50);
      await fetchItems(lojaAtiva.id);
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      setAdicionando(false);
    }
  };

  const handleAddFromCatalog = async (catItem) => {
    try {
      await addItemFromCatalog(lojaAtiva.id, classId, catItem);
      await fetchItems(lojaAtiva.id);
    } catch (e) {
      alert("Erro: " + e.message);
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
    if (!window.confirm("Remover este item da loja?")) return;
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

  // Handlers: catálogo
  const handleAddCatalogItem = async () => {
    if (salvandoCat) return;
    setSalvandoCat(true);
    try {
      await addCatalogItem({ nome: catNome, descricao: catDesc, precoSugerido: catPreco });
      setCatNome(""); setCatDesc(""); setCatPreco(50);
      await fetchCatalog();
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      setSalvandoCat(false);
    }
  };

  const handleSaveCatalogEdit = async (id) => {
    try {
      await updateCatalogItem(id, { nome: editCatNome, descricao: editCatDesc, precoSugerido: editCatPreco });
      setEditCatId(null);
      await fetchCatalog();
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  const handleDeleteCatalogItem = async (id) => {
    if (!window.confirm("Remover este item do catálogo? Itens já adicionados a lojas não serão afetados.")) return;
    try {
      await deleteCatalogItem(id);
      await fetchCatalog();
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  const startCatalogEdit = (item) => {
    setEditCatId(item.id);
    setEditCatNome(item.nome);
    setEditCatDesc(item.descricao || "");
    setEditCatPreco(item.precoSugerido);
  };

  if (loading) return <Spinner />;

  const lojaAberta = lojaAtiva?.status === "open";

  return (
    <div style={wrapper}>

      {/* Cabeçalho */}
      <div style={cabecalho}>
        <h2 style={tituloPrincipal}>Loja de Benefícios</h2>
        <span style={subtitulo}>
          Cada abertura é uma instância independente — alunos podem comprar novamente a cada prova.
        </span>
      </div>

      {/* Seletor de lojas + criar nova */}
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

          <div style={novaLojaRow}>
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Ex: Loja Prova 1"
              style={{ ...inputSm, width: "160px" }}
              onKeyDown={(e) => e.key === "Enter" && handleAbrirLoja()}
            />
            <button onClick={handleAbrirLoja} disabled={abrindoLoja} style={btnNova}>
              + Abrir loja
            </button>
          </div>
        </div>
      </div>

      {/* Sem loja selecionada */}
      {!lojaAtiva ? (
        <EmptyState
          icon="bag"
          variante="primaria"
          titulo="Abra sua primeira loja"
          mensagem="Use o campo acima para nomear e abrir uma loja para esta turma."
        />
      ) : (
        <>
          {/* Status da loja */}
          <div style={lojaStatusRow}>
            <div>
              <span style={lojaAberta ? badgeAberto : badgeFechado}>
                {lojaAberta ? "● Aberta" : "○ Fechada"}
              </span>
              <span style={dataLoja}>
                {lojaAtiva.createdAt?.toDate
                  ? lojaAtiva.createdAt.toDate().toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })
                  : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {lojaAberta
                ? <button onClick={handleFecharLoja} style={btnFechar}>Fechar loja</button>
                : <>
                    <button onClick={handleReabrirLoja} style={btnReabrir}>Reabrir loja</button>
                    <button onClick={handleDeleteShop} style={btnExcluirLoja} title="Excluir loja permanentemente">
                      Excluir loja
                    </button>
                  </>
              }
            </div>
          </div>

          {/* Abas */}
          <div style={tabsRow}>
            {[
              { key: "itens",    label: `Produtos (${items.length})` },
              { key: "compras",  label: `Compras (${compras.length})` },
              { key: "catalogo", label: `Catálogo (${catalogItems.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAbaAtiva(key)}
                style={{ ...tabBtn, ...(abaAtiva === key ? tabBtnAtivo : {}) }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ABA: ITENS */}
          {abaAtiva === "itens" && (
            <div>
              {/* Painel: adicionar do catálogo */}
              {lojaAberta && catalogItems.length > 0 && (
                <div style={catalogPanel}>
                  <button
                    onClick={() => setMostrarCatalogo((v) => !v)}
                    style={catalogToggleBtn}
                  >
                    <span>{mostrarCatalogo ? "▲" : "▼"}</span>
                    <span>Adicionar do catálogo ({catalogItems.length} itens)</span>
                  </button>

                  {mostrarCatalogo && (
                    <div style={catalogGrid}>
                      {catalogItems.map((cat) => {
                        const jaAdicionado = instanciadosNaLoja.has(cat.id);
                        return (
                          <div key={cat.id} style={catalogCard(jaAdicionado)}>
                            <div style={catalogCardTop}>
                              <span style={catalogNome}>{cat.nome}</span>
                              <span style={precoBadgeCatalog}>
                                <CoinLottie size={14} /> {cat.precoSugerido}
                              </span>
                            </div>
                            {cat.descricao && (
                              <p style={catalogDesc}>{cat.descricao}</p>
                            )}
                            <button
                              onClick={() => handleAddFromCatalog(cat)}
                              disabled={jaAdicionado}
                              style={{
                                ...btnAddCatalog,
                                opacity: jaAdicionado ? 0.45 : 1,
                                cursor: jaAdicionado ? "default" : "pointer",
                              }}
                            >
                              {jaAdicionado ? "Já adicionado" : "+ Adicionar à loja"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Formulário de item avulso */}
              {lojaAberta && (
                <div style={formCard}>
                  <p style={formTitulo}>Adicionar produto avulso</p>
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
                    <div style={precoRow}>
                      <label style={labelPreco}>Preço:</label>
                      <input
                        type="number" min="1"
                        value={novoPreco}
                        onChange={(e) => setNovoPreco(e.target.value)}
                        style={{ ...input, width: "90px", marginBottom: 0 }}
                      />
                      <span style={sufixo}>moedas</span>
                      <button
                        onClick={handleAddItem}
                        disabled={adicionando || !novoNome.trim()}
                        style={{ ...btnPrimary, marginLeft: "auto", opacity: !novoNome.trim() ? 0.5 : 1 }}
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
                  titulo="Nenhum produto na loja ainda"
                  mensagem={lojaAberta ? "Adicione itens do catálogo ou crie um avulso acima." : undefined}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {items.map((item) => (
                    <div key={item.id} style={itemCard(item.disponivel)}>
                      {editandoId === item.id ? (
                        /* Formulário de edição inline */
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input value={editNome} onChange={(e) => setEditNome(e.target.value)} style={input} placeholder="Nome" />
                          <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={input} placeholder="Descrição" />
                          <div style={precoRow}>
                            <label style={labelPreco}>Preço:</label>
                            <input
                              type="number" min="1"
                              value={editPreco}
                              onChange={(e) => setEditPreco(e.target.value)}
                              style={{ ...input, width: "80px", marginBottom: 0 }}
                            />
                            <span style={sufixo}>moedas</span>
                            <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                              <button onClick={() => handleSaveEdit(item.id)} style={btnPrimary}>Salvar</button>
                              <button onClick={() => setEditandoId(null)} style={btnSec}>Cancelar</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Exibição normal */
                        <div style={itemRow}>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={itemTopRow}>
                              <span style={{
                                ...itemNome,
                                color: item.disponivel ? "var(--texto)" : "var(--texto-muito-suave)",
                              }}>
                                {item.nome}
                              </span>
                              <span style={moedasBadge}>
                                <CoinLottie size={16} /> {item.preco}
                              </span>
                              {item.catalogItemId && (
                                <span style={badgeCatalogo} title="Adicionado do catálogo">
                                  catálogo
                                </span>
                              )}
                              {!item.disponivel && (
                                <span style={badgeIndisponivel}>indisponível</span>
                              )}
                            </div>
                            {item.descricao && (
                              <p style={itemDesc}>{item.descricao}</p>
                            )}
                          </div>
                          {lojaAberta && (
                            <div style={itemAcoes}>
                              <button onClick={() => handleToggle(item)} style={btnToggle(item.disponivel)}>
                                {item.disponivel ? "Desativar" : "Ativar"}
                              </button>
                              <button onClick={() => startEdit(item)} style={btnEditar}>Editar</button>
                              <button onClick={() => handleDelete(item.id)} style={btnDeletar} title="Remover da loja">✕</button>
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
            compras.length === 0 ? (
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
                    .sort((a, b) => (b.purchasedAt?.toMillis?.() ?? 0) - (a.purchasedAt?.toMillis?.() ?? 0))
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
            )
          )}

          {/* ABA: CATÁLOGO */}
          {abaAtiva === "catalogo" && (
            <div>
              <p style={catalogoInfo}>
                Itens do catálogo são reutilizáveis em qualquer loja. Ao adicionar à loja, você pode
                ajustar preço e disponibilidade por instância sem alterar o catálogo.
              </p>

              {/* Formulário novo item de catálogo */}
              <div style={formCard}>
                <p style={formTitulo}>Novo item no catálogo</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    value={catNome}
                    onChange={(e) => setCatNome(e.target.value)}
                    placeholder="Nome do benefício"
                    style={input}
                  />
                  <input
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Descrição (opcional)"
                    style={input}
                  />
                  <div style={precoRow}>
                    <label style={labelPreco}>Preço sugerido:</label>
                    <input
                      type="number" min="1"
                      value={catPreco}
                      onChange={(e) => setCatPreco(e.target.value)}
                      style={{ ...input, width: "80px", marginBottom: 0 }}
                    />
                    <span style={sufixo}>moedas</span>
                    <button
                      onClick={handleAddCatalogItem}
                      disabled={salvandoCat || !catNome.trim()}
                      style={{ ...btnPrimary, marginLeft: "auto", opacity: !catNome.trim() ? 0.5 : 1 }}
                    >
                      {salvandoCat ? "Salvando..." : "Adicionar ao catálogo"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista do catálogo */}
              {catalogItems.length === 0 ? (
                <EmptyState
                  icon="bag"
                  variante="primaria"
                  compacto
                  titulo="Catálogo vazio"
                  mensagem="Crie itens aqui e reutilize-os em todas as lojas sem precisar redigitar."
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {catalogItems.map((cat) => (
                    <div key={cat.id} style={itemCard(true)}>
                      {editCatId === cat.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input value={editCatNome} onChange={(e) => setEditCatNome(e.target.value)} style={input} placeholder="Nome" />
                          <input value={editCatDesc} onChange={(e) => setEditCatDesc(e.target.value)} style={input} placeholder="Descrição" />
                          <div style={precoRow}>
                            <label style={labelPreco}>Preço sugerido:</label>
                            <input
                              type="number" min="1"
                              value={editCatPreco}
                              onChange={(e) => setEditCatPreco(e.target.value)}
                              style={{ ...input, width: "80px", marginBottom: 0 }}
                            />
                            <span style={sufixo}>moedas</span>
                            <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                              <button onClick={() => handleSaveCatalogEdit(cat.id)} style={btnPrimary}>Salvar</button>
                              <button onClick={() => setEditCatId(null)} style={btnSec}>Cancelar</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={itemRow}>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={itemTopRow}>
                              <span style={itemNome}>{cat.nome}</span>
                              <span style={moedasBadge}><CoinLottie size={16} /> {cat.precoSugerido}</span>
                            </div>
                            {cat.descricao && <p style={itemDesc}>{cat.descricao}</p>}
                          </div>
                          <div style={itemAcoes}>
                            <button onClick={() => startCatalogEdit(cat)} style={btnEditar}>Editar</button>
                            <button onClick={() => handleDeleteCatalogItem(cat.id)} style={btnDeletar} title="Remover do catálogo">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Estilos */
const wrapper          = { width: "100%" };
const tituloPrincipal  = { margin: 0, fontFamily: "'Fredoka One', sans-serif", fontSize: "20px", color: "var(--texto)" };
const subtitulo        = { fontSize: "13px", color: "var(--texto-muito-suave)" };
const cabecalho        = { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" };

const seletorWrap      = { marginBottom: "16px" };
const seletorScroll    = { display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" };

const chipLoja         = {
  padding: "6px 14px", borderRadius: "20px", border: "1px solid",
  fontSize: "13px", fontWeight: "600", cursor: "pointer",
  transition: "all 0.15s", whiteSpace: "nowrap",
};

const novaLojaRow      = { display: "flex", alignItems: "center", gap: "6px" };
const inputSm          = {
  padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)", fontSize: "13px",
};
const btnNova          = {
  padding: "6px 12px", borderRadius: "6px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap",
};

const lojaStatusRow    = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: "16px", padding: "12px 16px", borderRadius: "10px",
  background: "var(--bg-input)", border: "1px solid var(--borda)",
  flexWrap: "wrap", gap: "8px",
};
const dataLoja         = { fontSize: "13px", color: "var(--texto-muito-suave)", marginLeft: "10px" };

const badgeAberto      = {
  fontSize: "13px", fontWeight: "bold", color: "var(--cor-primaria)",
  background: "var(--cor-primaria-claro)", padding: "3px 10px", borderRadius: "10px",
};
const badgeFechado     = {
  fontSize: "13px", fontWeight: "bold", color: "var(--texto-muito-suave)",
  background: "var(--bg-hover)", padding: "3px 10px", borderRadius: "10px",
  border: "1px solid var(--borda)",
};

const tabsRow          = {
  display: "flex", gap: "4px", marginBottom: "16px",
  borderBottom: "2px solid var(--borda)",
};
const tabBtn           = {
  padding: "8px 16px", border: "none", background: "none",
  fontSize: "14px", fontWeight: "600", color: "var(--texto-suave)",
  cursor: "pointer", borderBottom: "2px solid transparent",
  marginBottom: "-2px", transition: "color 0.15s",
};
const tabBtnAtivo      = { color: "var(--cor-primaria)", borderBottom: "2px solid var(--cor-primaria)" };

/* Painel catálogo dentro da aba Itens */
const catalogPanel     = {
  marginBottom: "16px", border: "1px solid var(--borda)",
  borderRadius: "10px", overflow: "hidden",
};
const catalogToggleBtn = {
  width: "100%", display: "flex", alignItems: "center", gap: "8px",
  padding: "10px 14px", background: "var(--bg-input)",
  border: "none", cursor: "pointer", fontSize: "14px",
  fontWeight: "600", color: "var(--texto)", fontFamily: "inherit",
};
const catalogGrid      = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "10px", padding: "12px",
  borderTop: "1px solid var(--borda)", background: "var(--bg-card)",
};
const catalogCard      = (jaAdicionado) => ({
  background: jaAdicionado ? "var(--bg-hover)" : "var(--bg-input)",
  border: "1px solid var(--borda)", borderRadius: "8px",
  padding: "12px", display: "flex", flexDirection: "column", gap: "6px",
  opacity: jaAdicionado ? 0.7 : 1,
});
const catalogCardTop   = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" };
const catalogNome      = { fontWeight: "700", fontSize: "14px", color: "var(--texto)", flex: 1 };
const catalogDesc      = { fontSize: "12px", color: "var(--texto-suave)", margin: 0 };
const precoBadgeCatalog = {
  fontSize: "11px", fontWeight: "bold", background: "#fff8e1", color: "#e65100",
  padding: "2px 6px", borderRadius: "8px", border: "1px solid #ffe0b2",
  display: "inline-flex", alignItems: "center", gap: "3px", flexShrink: 0,
};
const btnAddCatalog    = {
  padding: "6px 10px", borderRadius: "6px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "12px", marginTop: "4px",
};

const catalogoInfo     = {
  fontSize: "13px", color: "var(--texto-suave)", marginBottom: "14px",
  lineHeight: 1.5, background: "var(--bg-input)", borderRadius: "8px",
  padding: "10px 14px", border: "1px solid var(--borda)",
};

/* Formulário genérico */
const formCard         = {
  background: "var(--bg-input)", borderRadius: "10px",
  padding: "16px", marginBottom: "16px", border: "1px solid var(--borda)",
};
const formTitulo       = {
  fontSize: "13px", fontWeight: "700", color: "var(--texto-muito-suave)",
  textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 12px",
};
const input            = {
  width: "100%", padding: "8px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)", background: "var(--bg-card)",
  color: "var(--texto)", fontSize: "14px", boxSizing: "border-box",
};
const precoRow         = { display: "flex", alignItems: "center", gap: "8px" };
const labelPreco       = { fontSize: "13px", fontWeight: "600", color: "var(--texto-suave)", whiteSpace: "nowrap" };
const sufixo           = { fontSize: "13px", color: "var(--texto-muito-suave)" };

/* Itens */
const itemCard         = (disponivel) => ({
  padding: "14px 16px", borderRadius: "10px",
  border: "1px solid var(--borda)",
  background: disponivel ? "var(--bg-card)" : "var(--bg-hover)",
  opacity: disponivel ? 1 : 0.7,
  transition: "opacity 0.2s",
});
const itemRow          = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" };
const itemTopRow       = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
const itemNome         = { fontWeight: "700", fontSize: "15px", color: "var(--texto)" };
const itemDesc         = { fontSize: "13px", color: "var(--texto-suave)", margin: "4px 0 0" };
const itemAcoes        = { display: "flex", gap: "6px", flexShrink: 0, alignItems: "flex-start" };

const moedasBadge      = {
  fontSize: "12px", fontWeight: "bold", background: "#fff8e1", color: "#e65100",
  padding: "2px 8px", borderRadius: "10px", border: "1px solid #ffe0b2",
  display: "inline-flex", alignItems: "center", gap: "4px",
};
const badgeCatalogo    = {
  fontSize: "11px", padding: "2px 7px", borderRadius: "8px",
  background: "var(--cor-inatel-claro)", color: "var(--cor-inatel-texto)",
  border: "1px solid var(--cor-inatel-borda)", fontWeight: "600",
};
const badgeIndisponivel = {
  fontSize: "11px", padding: "2px 7px", borderRadius: "8px",
  background: "var(--bg-hover)", color: "var(--texto-muito-suave)",
  border: "1px solid var(--borda)", fontWeight: "600",
};

/* Botões */
const btnPrimary       = {
  padding: "7px 14px", borderRadius: "7px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};
const btnSec           = {
  padding: "7px 12px", borderRadius: "7px", border: "1px solid var(--borda)",
  background: "var(--bg-card)", color: "var(--texto)", fontSize: "13px", cursor: "pointer",
};
const btnFechar        = {
  padding: "6px 14px", borderRadius: "7px", border: "none",
  background: "var(--cor-perigo)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};
const btnReabrir       = {
  padding: "6px 14px", borderRadius: "7px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};
const btnExcluirLoja   = {
  padding: "6px 14px", borderRadius: "7px",
  border: "1px solid var(--cor-perigo-borda)",
  background: "var(--cor-perigo-claro)", color: "var(--cor-perigo)",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};
const btnToggle        = (ativo) => ({
  padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--borda)",
  background: ativo ? "var(--bg-hover)" : "var(--cor-primaria-claro)",
  color: ativo ? "var(--texto-suave)" : "var(--cor-primaria-texto)",
  fontSize: "12px", fontWeight: "600", cursor: "pointer",
});
const btnEditar        = {
  padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--borda)",
  background: "var(--bg-card)", color: "var(--texto)", fontSize: "12px", cursor: "pointer",
};
const btnDeletar       = {
  padding: "5px 8px", borderRadius: "6px", border: "none",
  background: "var(--cor-perigo-claro)", color: "var(--cor-perigo)",
  fontSize: "13px", cursor: "pointer", fontWeight: "bold",
};

/* Tabela de compras */
const tabela           = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const th               = {
  padding: "8px 10px", fontSize: "11px", fontWeight: "700",
  color: "var(--texto-muito-suave)", textTransform: "uppercase",
  letterSpacing: "0.4px", borderBottom: "2px solid var(--borda)", textAlign: "center",
};
const td               = { padding: "10px", color: "var(--texto)", textAlign: "center" };