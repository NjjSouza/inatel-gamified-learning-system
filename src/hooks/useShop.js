import { db } from "../services/firebase";
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, getDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

/**
 * useShop - lógica de compra de benefícios
 *
 * Coleções:
 *   shops          -> uma instância de loja por abertura (classId, status, createdAt, closedAt)
 *   shop_items     -> produtos da loja (shopId, classId, nome, descricao, preco, disponivel)
 *   shop_purchases -> compras dos alunos (shopId, classId, itemId, userId, purchasedAt)
 *
 * Cada abertura de loja é uma instância nova: o aluno pode comprar na "Loja P1" e depois
 * comprar de novo na "Loja P2", pois são shopIds diferentes.
 */
export function useShop() {
  const { user } = useAuth();

  // PROFESSOR
  /** Abre uma nova loja para a turma (cada chamada = nova instância) */
  const openShop = async (classId, titulo = "") => {
    if (!user) throw new Error("Não autenticado");
    const ref = await addDoc(collection(db, "shops"), {
      classId,
      professorId: user.uid,
      titulo: titulo.trim() || "Loja",
      status: "open",
      createdAt: serverTimestamp(),
      closedAt: null,
    });
    return { id: ref.id };
  };

  /** Fecha a loja ativa (impede novas compras, mas preserva histórico) */
  const closeShop = async (shopId) => {
    await updateDoc(doc(db, "shops", shopId), {
      status: "closed",
      closedAt: serverTimestamp(),
    });
  };

  /** Reabre uma loja que foi fechada (para correções de última hora) */
  const reopenShop = async (shopId) => {
    await updateDoc(doc(db, "shops", shopId), {
      status: "open",
      closedAt: null,
    });
  };

  /** Atualiza o título da loja */
  const updateShopTitle = async (shopId, titulo) => {
    await updateDoc(doc(db, "shops", shopId), { titulo: titulo.trim() });
  };

  /** Lista todas as lojas de uma turma (mais recente primeiro) */
  const getShopsByClass = async (classId) => {
    const snap = await getDocs(
      query(collection(db, "shops"), where("classId", "==", classId))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
  };

  /** Retorna a loja aberta de uma turma (ou null se não houver) */
  const getOpenShop = async (classId) => {
    const snap = await getDocs(
      query(
        collection(db, "shops"),
        where("classId", "==", classId),
        where("status", "==", "open")
      )
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  };

  // ITENS 
  /** Adiciona um produto à loja */
  const addItem = async (shopId, classId, { nome, descricao, preco }) => {
    if (!nome?.trim()) throw new Error("Nome obrigatório");
    const p = parseInt(preco, 10);
    if (isNaN(p) || p < 1) throw new Error("Preço deve ser pelo menos 1 moeda");
    const ref = await addDoc(collection(db, "shop_items"), {
      shopId,
      classId,
      nome: nome.trim(),
      descricao: descricao?.trim() ?? "",
      preco: p,
      disponivel: true,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id };
  };

  /** Atualiza campos de um produto */
  const updateItem = async (itemId, data) => {
    const p = parseInt(data.preco, 10);
    if (isNaN(p) || p < 1) throw new Error("Preço deve ser pelo menos 1 moeda");
    await updateDoc(doc(db, "shop_items", itemId), {
      nome: data.nome?.trim(),
      descricao: data.descricao?.trim() ?? "",
      preco: p,
      disponivel: data.disponivel ?? true,
    });
  };

  /** Alterna disponibilidade de um item sem editar os outros campos */
  const toggleItemDisponivel = async (itemId, disponivel) => {
    await updateDoc(doc(db, "shop_items", itemId), { disponivel });
  };

  /** Remove um produto (só antes de qualquer compra para evitar inconsistência) */
  const deleteItem = async (itemId) => {
    // Verifica se já houve compras antes de apagar
    const compras = await getDocs(
      query(collection(db, "shop_purchases"), where("itemId", "==", itemId))
    );
    if (!compras.empty)
      throw new Error(
        "Este item já foi comprado por alunos. Desative-o em vez de excluir."
      );
    await updateDoc(doc(db, "shop_items", itemId), { disponivel: false });
    // Soft delete: mantém o documento mas marca como excluído
    await updateDoc(doc(db, "shop_items", itemId), { deletado: true, disponivel: false });
  };

  /** Lista produtos de uma loja (exclui deletados) */
  const getItems = async (shopId) => {
    const snap = await getDocs(
      query(collection(db, "shop_items"), where("shopId", "==", shopId))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((i) => !i.deletado)
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
  };

  // COMPRAS
  /**
   * Compra de um item:
   *  1. Validação de saldo
   *  2. Validação que a loja está aberta e o item disponível
   *  3. Impede recompra na mesma instância de loja
   *  4. Debita coin_balance
   *  5. Cria shop_purchases
   */
  const purchaseItem = async (shopId, item) => {
    if (!user) throw new Error("Não autenticado");

    // 1. Busca loja
    const shopSnap = await getDoc(doc(db, "shops", shopId));
    if (!shopSnap.exists() || shopSnap.data().status !== "open")
      throw new Error("A loja não está aberta no momento.");

    const classId = shopSnap.data().classId;

    // 2. Valida item
    const itemSnap = await getDoc(doc(db, "shop_items", item.id));
    if (!itemSnap.exists() || !itemSnap.data().disponivel)
      throw new Error("Este item não está disponível.");

    // 3. Verifica recompra (mesmo shopId + userId + itemId)
    const jaComprou = await getDocs(
      query(
        collection(db, "shop_purchases"),
        where("shopId", "==", shopId),
        where("userId", "==", user.uid),
        where("itemId", "==", item.id)
      )
    );
    if (!jaComprou.empty)
      throw new Error("Você já comprou este benefício nesta loja.");

    // 4. Verifica saldo
    const balanceRef = doc(db, "coin_balance", `${user.uid}_${classId}`);
    const balanceSnap = await getDoc(balanceRef);
    const saldo = balanceSnap.exists() ? (balanceSnap.data().balance ?? 0) : 0;
    if (saldo < item.preco)
      throw new Error(
        `Saldo insuficiente. Você tem ${saldo} moeda${saldo !== 1 ? "s" : ""} e este item custa ${item.preco}.`
      );

    // 5. Debita saldo
    await updateDoc(balanceRef, {
      balance: increment(-item.preco),
      updatedAt: serverTimestamp(),
    });

    // 6. Registra compra
    await addDoc(collection(db, "shop_purchases"), {
      shopId,
      classId,
      itemId: item.id,
      itemNome: item.nome,
      itemPreco: item.preco,
      userId: user.uid,
      purchasedAt: serverTimestamp(),
    });
  };

  /** Retorna os IDs dos itens já comprados pelo usuário nesta loja */
  const getPurchasedItemIds = async (shopId) => {
    if (!user) return new Set();
    const snap = await getDocs(
      query(
        collection(db, "shop_purchases"),
        where("shopId", "==", shopId),
        where("userId", "==", user.uid)
      )
    );
    return new Set(snap.docs.map((d) => d.data().itemId));
  };

  /** Lista todas as compras de uma loja (para o professor visualizar) */
  const getPurchasesByShop = async (shopId) => {
    const snap = await getDocs(
      query(collection(db, "shop_purchases"), where("shopId", "==", shopId))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  /** Saldo de moedas do usuário atual em uma turma */
  const getCoinBalance = async (classId) => {
    if (!user) return 0;
    const snap = await getDoc(
      doc(db, "coin_balance", `${user.uid}_${classId}`)
    );
    return snap.exists() ? (snap.data().balance ?? 0) : 0;
  };

  return {
    // Loja
    openShop,
    closeShop,
    reopenShop,
    updateShopTitle,
    getShopsByClass,
    getOpenShop,
    // Itens
    addItem,
    updateItem,
    toggleItemDisponivel,
    deleteItem,
    getItems,
    // Compras
    purchaseItem,
    getPurchasedItemIds,
    getPurchasesByShop,
    getCoinBalance,
  };
}