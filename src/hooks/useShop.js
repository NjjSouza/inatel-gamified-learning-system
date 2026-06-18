import { db } from "../services/firebase";
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, getDoc, increment, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

/**
 * useShop - lógica de compra de benefícios + catálogo persistente por professor
 *
 * Coleções:
 *   shops          -> uma instância de loja por abertura (classId, status, createdAt, closedAt)
 *   shop_items     -> produtos da loja (shopId, classId, nome, descricao, preco, disponivel,
 *                     catalogItemId? — referência ao item de catálogo de origem, se houver)
 *   shop_purchases -> compras dos alunos (shopId, classId, itemId, userId, purchasedAt)
 *   shop_catalog   -> catálogo persistente por professor (professorId, nome, descricao, precoSugerido)
 *
 * Cada abertura de loja é uma instância nova: o aluno pode comprar na "Loja P1" e depois
 * comprar de novo na "Loja P2", pois são shopIds diferentes.
 * Itens instanciados a partir do catálogo guardam o catalogItemId para rastreabilidade,
 * mas preço/disponibilidade/existência são independentes por instância.
 */
export function useShop() {
  const { user } = useAuth();

  // LOJA
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

  /**
   * Exclui uma loja fechada e todos os seus itens (sem compras associadas).
   * Bloqueia se houver qualquer compra na loja para preservar histórico dos alunos.
   */
  const deleteShop = async (shopId) => {
    const shopSnap = await getDoc(doc(db, "shops", shopId));
    if (!shopSnap.exists()) throw new Error("Loja não encontrada.");
    if (shopSnap.data().status !== "closed")
      throw new Error("Só é possível excluir lojas fechadas.");

    const compras = await getDocs(
      query(collection(db, "shop_purchases"), where("shopId", "==", shopId))
    );
    if (!compras.empty)
      throw new Error(
        "Esta loja já teve compras. Exclua apenas lojas sem histórico de compras."
      );

    // Remove os itens da loja (soft-delete já existente não é suficiente; apaga de verdade)
    const itens = await getDocs(
      query(collection(db, "shop_items"), where("shopId", "==", shopId))
    );
    await Promise.all(itens.docs.map((d) => deleteDoc(d.ref)));

    // Remove a loja
    await deleteDoc(doc(db, "shops", shopId));
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

  // ITENS DA LOJA

  /** Adiciona um produto avulso à loja (sem vínculo com catálogo) */
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
      catalogItemId: null,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id };
  };

  /**
   * Instancia um item do catálogo dentro de uma loja.
   * Copia nome/descrição/preço do catálogo, mas o item de loja é independente.
   */
  const addItemFromCatalog = async (shopId, classId, catalogItem) => {
    const p = parseInt(catalogItem.precoSugerido, 10);
    if (isNaN(p) || p < 1) throw new Error("Preço do catálogo inválido");

    // Verifica se já foi instanciado nesta loja
    const jaExiste = await getDocs(query(
      collection(db, "shop_items"),
      where("shopId", "==", shopId),
      where("catalogItemId", "==", catalogItem.id),
    ));
    if (!jaExiste.empty) throw new Error("Este item já foi adicionado a esta loja.");

    const ref = await addDoc(collection(db, "shop_items"), {
      shopId,
      classId,
      nome: catalogItem.nome.trim(),
      descricao: catalogItem.descricao?.trim() ?? "",
      preco: p,
      disponivel: true,
      catalogItemId: catalogItem.id,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id };
  };

  /** Atualiza preço e/ou disponibilidade de um item de loja (não afeta catálogo) */
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

  /**
   * Remove um item da loja (soft-delete).
   * Bloqueia se já houver compras para evitar inconsistência.
   */
  const deleteItem = async (itemId) => {
    const compras = await getDocs(
      query(collection(db, "shop_purchases"), where("itemId", "==", itemId))
    );
    if (!compras.empty)
      throw new Error(
        "Este item já foi comprado por alunos. Desative-o em vez de excluir."
      );
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

  // CATÁLOGO
  /**
   * Cria um item no catálogo do professor.
   * Campos: nome, descricao, precoSugerido.
   */
  const addCatalogItem = async ({ nome, descricao, precoSugerido }) => {
    if (!user) throw new Error("Não autenticado");
    if (!nome?.trim()) throw new Error("Nome obrigatório");
    const p = parseInt(precoSugerido, 10);
    if (isNaN(p) || p < 1) throw new Error("Preço sugerido deve ser pelo menos 1");
    const ref = await addDoc(collection(db, "shop_catalog"), {
      professorId: user.uid,
      nome: nome.trim(),
      descricao: descricao?.trim() ?? "",
      precoSugerido: p,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id };
  };

  /** Atualiza nome, descrição ou preço sugerido de um item do catálogo */
  const updateCatalogItem = async (catalogItemId, data) => {
    const p = parseInt(data.precoSugerido, 10);
    if (isNaN(p) || p < 1) throw new Error("Preço sugerido deve ser pelo menos 1");
    await updateDoc(doc(db, "shop_catalog", catalogItemId), {
      nome: data.nome?.trim(),
      descricao: data.descricao?.trim() ?? "",
      precoSugerido: p,
    });
  };

  /**
   * Remove um item do catálogo.
   * Não afeta itens de loja já instanciados (apenas o catalogItemId deles fica órfão).
   */
  const deleteCatalogItem = async (catalogItemId) => {
    await deleteDoc(doc(db, "shop_catalog", catalogItemId));
  };

  /** Lista todos os itens do catálogo do professor logado */
  const getCatalogItems = async () => {
    if (!user) return [];
    const snap = await getDocs(
      query(collection(db, "shop_catalog"), where("professorId", "==", user.uid))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
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

    const shopSnap = await getDoc(doc(db, "shops", shopId));
    if (!shopSnap.exists() || shopSnap.data().status !== "open")
      throw new Error("A loja não está aberta no momento.");

    const classId = shopSnap.data().classId;

    const itemSnap = await getDoc(doc(db, "shop_items", item.id));
    if (!itemSnap.exists() || !itemSnap.data().disponivel)
      throw new Error("Este item não está disponível.");

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

    const balanceRef = doc(db, "coin_balance", `${user.uid}_${classId}`);
    const balanceSnap = await getDoc(balanceRef);
    const saldo = balanceSnap.exists() ? (balanceSnap.data().balance ?? 0) : 0;
    if (saldo < item.preco)
      throw new Error(
        `Saldo insuficiente. Você tem ${saldo} moeda${saldo !== 1 ? "s" : ""} e este item custa ${item.preco}.`
      );

    await updateDoc(balanceRef, {
      balance: increment(-item.preco),
      updatedAt: serverTimestamp(),
    });

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
    deleteShop,
    updateShopTitle,
    getShopsByClass,
    getOpenShop,
    // Itens da loja
    addItem,
    addItemFromCatalog,
    updateItem,
    toggleItemDisponivel,
    deleteItem,
    getItems,
    // Catálogo
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    getCatalogItems,
    // Compras
    purchaseItem,
    getPurchasedItemIds,
    getPurchasesByShop,
    getCoinBalance,
  };
}