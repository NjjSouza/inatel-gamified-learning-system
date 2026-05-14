import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuizzes } from "../hooks/useQuizzes";
import TwemojiImg from "../components/TwemojiImg";
import BackButton from "../components/BackButton";

export default function EditQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { addQuestion, getQuestions, updateQuestion, deleteQuestion } = useQuizzes();

  const [tipo, setTipo] = useState("multipla"); // "multipla" ou "aberta"
  const [pergunta, setPergunta] = useState("");
  const [alternativas, setAlternativas] = useState(["", ""]);
  const [correta, setCorreta] = useState(0);
  const [xpValor, setXpValor] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  const fetchQuestions = async () => {
    const data = await getQuestions(quizId);
    setQuestions(data);
  };

  useEffect(() => {
    fetchQuestions();
  }, [quizId]);

  const handleAddAlternativa = () => {
    if (alternativas.length >= 5) return;
    setAlternativas([...alternativas, ""]);
  };

  const handleRemoveAlternativa = (index) => {
    if (alternativas.length <= 2) return alert("Mínimo de 2 alternativas");
    const novas = alternativas.filter((_, i) => i !== index);
    if (correta >= novas.length) setCorreta(novas.length - 1);
    else if (correta > index) setCorreta(correta - 1);
    setAlternativas(novas);
  };

  const handleAdd = async () => {
    if (!pergunta.trim()) return alert("Digite a pergunta");
    if (tipo === "multipla" && alternativas.some(a => a.trim() === "")) {
      return alert("Preencha todas as alternativas ou remova as vazias");
    }
    const xp = parseInt(xpValor, 10);
    if (isNaN(xp) || xp < 1) return alert("O valor de XP deve ser pelo menos 1");

    const base = { pergunta, tipo: tipo, xp };
    const payload = tipo === "multipla"
      ? { ...base, alternativas, respostaCorreta: correta }
      : base;

    try {
      await addQuestion(quizId, payload);
      await fetchQuestions();
      setPergunta("");
      setAlternativas(["", ""]);
      setCorreta(0);
      setXpValor(10);
      setTipo("multipla");
      alert("Pergunta adicionada!");
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditData({
      pergunta: q.pergunta,
      tipo: q.tipo || "multipla",
      alternativas: q.alternativas ? [...q.alternativas] : ["", ""],
      respostaCorreta: q.respostaCorreta ?? 0,
      xp: q.xp ?? 10,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleEditAddAlternativa = () => {
    if (editData.alternativas.length >= 5) return;
    setEditData(prev => ({ ...prev, alternativas: [...prev.alternativas, ""] }));
  };

  const handleEditRemoveAlternativa = (index) => {
    if (editData.alternativas.length <= 2) return alert("Mínimo de 2 alternativas");
    const novas = editData.alternativas.filter((_, i) => i !== index);
    const novaCorreta = editData.respostaCorreta >= novas.length
      ? novas.length - 1
      : editData.respostaCorreta > index
        ? editData.respostaCorreta - 1
        : editData.respostaCorreta;
    setEditData({ ...editData, alternativas: novas, respostaCorreta: novaCorreta });
  };

  const handleSaveEdit = async (questionId) => {
    if (!editData.pergunta.trim()) return alert("Digite a pergunta");
    if (editData.tipo === "multipla" && editData.alternativas.some(a => a.trim() === "")) {
      return alert("Preencha todas as alternativas ou remova as vazias");
    }
    const xp = parseInt(editData.xp, 10);
    if (isNaN(xp) || xp < 1) return alert("O valor de XP deve ser pelo menos 1");

    const payload = editData.tipo === "multipla"
      ? { ...editData, xp }
      : { pergunta: editData.pergunta, tipo: editData.tipo, xp };

    try {
      await updateQuestion(quizId, questionId, payload);
      await fetchQuestions();
      cancelEdit();
    } catch (erro) {
      alert("Erro ao salvar: " + erro.message);
    }
  };

  const handleDelete = async (questionId) => {
    if (!confirm("Tem certeza que deseja excluir esta pergunta?")) return;
    try {
      await deleteQuestion(quizId, questionId);
      await fetchQuestions();
    } catch (erro) {
      alert("Erro ao excluir: " + erro.message);
    }
  };

  return (
    <div style={container}>
      <BackButton />
      <h1>Editar Quiz</h1>

      {/* Formulário de nova pergunta */}
      <div style={card}>
        <h2>Adicionar Pergunta</h2>

        {/* Tipo de questão */}
        <div style={tipoRow}>
          <button
            onClick={() => setTipo("multipla")}
            style={{ ...tipoBtn, ...(tipo === "multipla" ? tipoBtnAtivo : {}) }}
          >
            Múltipla escolha
          </button>
          <button
            onClick={() => setTipo("aberta")}
            style={{ ...tipoBtn, ...(tipo === "aberta" ? tipoBtnAtivo : {}) }}
          >
            Questão aberta
          </button>
        </div>

        <input
          type="text"
          placeholder="Pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          style={inputStyle}
        />

        {tipo === "multipla" && (
          <>
            <p style={sectionLabel}>Alternativas</p>
            {alternativas.map((alt, index) => (
              <div key={index} style={altRow}>
                <input
                  type="radio"
                  name="correta"
                  checked={correta === index}
                  onChange={() => setCorreta(index)}
                  title="Marcar como correta"
                />
                <input
                  type="text"
                  placeholder={`Alternativa ${index + 1}`}
                  value={alt}
                  onChange={(e) => {
                    const novas = [...alternativas];
                    novas[index] = e.target.value;
                    setAlternativas(novas);
                  }}
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                {alternativas.length > 2 && (
                  <button
                    onClick={() => handleRemoveAlternativa(index)}
                    style={buttonRemove}
                    title="Remover alternativa"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
            {alternativas.length < 5 && (
              <button onClick={handleAddAlternativa} style={buttonSecondary}>
                + Adicionar alternativa
              </button>
            )}
          </>
        )}

        {tipo === "aberta" && (
          <p style={abertoHint}>
            <strong>O aluno digitará uma resposta em texto livre. A correção é feita manualmente pelo professor após a sessão.</strong>
          </p>
        )}

        {/* XP da questão */}
        <div style={xpRow}>
          <label style={xpLabel}>XP desta questão:</label>
          <input
            type="number"
            min="1"
            value={xpValor}
            onChange={(e) => setXpValor(e.target.value)}
            style={xpInput}
          />
          <span style={xpSufixo}>pts</span>
        </div>

        <button onClick={handleAdd} style={{ ...buttonPrimary, marginTop: "20px" }}>
          Adicionar Pergunta
        </button>
      </div>

      {/* Lista de perguntas */}
      <h2 style={{ marginTop: "30px" }}>
        Perguntas cadastradas ({questions.length})
      </h2>

      {questions.length === 0 ? (
        <p>Nenhuma pergunta ainda</p>
      ) : (
        <ul style={{ padding: 0 }}>
          {questions.map((q, i) => (
            <li key={q.id} style={questionCard}>

              {editingId === q.id ? (
                <div>
                  {/* Tipo no edit */}
                  <div style={tipoRow}>
                    <button
                      onClick={() => setEditData(p => ({ ...p, tipo: "multipla", alternativas: p.alternativas?.length ? p.alternativas : ["",""] }))}
                      style={{ ...tipoBtn, ...(editData.tipo === "multipla" ? tipoBtnAtivo : {}) }}
                    >
                      Múltipla escolha
                    </button>
                    <button
                      onClick={() => setEditData(p => ({ ...p, tipo: "aberta" }))}
                      style={{ ...tipoBtn, ...(editData.tipo === "aberta" ? tipoBtnAtivo : {}) }}
                    >
                      Questão aberta
                    </button>
                  </div>

                  <input
                    type="text"
                    value={editData.pergunta}
                    onChange={(e) => setEditData({ ...editData, pergunta: e.target.value })}
                    style={inputStyle}
                  />

                  {editData.tipo === "multipla" && (
                    <>
                      <p style={sectionLabel}>Alternativas</p>
                      {editData.alternativas.map((alt, idx) => (
                        <div key={idx} style={altRow}>
                          <input
                            type="radio"
                            name={`correta-edit-${q.id}`}
                            checked={editData.respostaCorreta === idx}
                            onChange={() => setEditData({ ...editData, respostaCorreta: idx })}
                            title="Marcar como correta"
                          />
                          <input
                            type="text"
                            value={alt}
                            onChange={(e) => {
                              const novas = [...editData.alternativas];
                              novas[idx] = e.target.value;
                              setEditData({ ...editData, alternativas: novas });
                            }}
                            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                          />
                          {editData.alternativas.length > 2 && (
                            <button onClick={() => handleEditRemoveAlternativa(idx)} style={buttonRemove}>−</button>
                          )}
                        </div>
                      ))}
                      {editData.alternativas.length < 5 && (
                        <button onClick={handleEditAddAlternativa} style={buttonSecondary}>
                          + Adicionar alternativa
                        </button>
                      )}
                    </>
                  )}

                  {editData.tipo === "aberta" && (
                    <p style={abertoHint}>
                      O aluno digitará uma resposta em texto livre. A correção é feita manualmente pelo professor após a sessão.
                    </p>
                  )}

                  {/* XP no edit */}
                  <div style={xpRow}>
                    <label style={xpLabel}>XP desta questão:</label>
                    <input
                      type="number"
                      min="1"
                      value={editData.xp}
                      onChange={(e) => setEditData({ ...editData, xp: e.target.value })}
                      style={xpInput}
                    />
                    <span style={xpSufixo}>pts</span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "15px" }}>
                    <button onClick={() => handleSaveEdit(q.id)} style={buttonPrimary}>Salvar</button>
                    <button onClick={cancelEdit} style={buttonVoltar}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <strong>{i + 1}. {q.pergunta}</strong>
                        {q.tipo === "aberta" && (
                          <span style={badgeAberta}>Aberta</span>
                        )}
                      </div>
                      <span style={xpBadge}> <TwemojiImg codepoint="26a1" size={14} alt="xp" /> {q.xp ?? 10} XP</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginLeft: "10px", flexShrink: 0 }}>
                      <button onClick={() => startEdit(q)} style={buttonEdit}>Editar</button>
                      <button onClick={() => handleDelete(q.id)} style={buttonRemove}>Excluir</button>
                    </div>
                  </div>

                  {(q.tipo !== "aberta") && q.alternativas && (
                    <ol style={{ marginTop: "8px", paddingLeft: "16px", listStyleType: "lower-alpha" }}>
                      {q.alternativas.map((alt, idx) => (
                        <li key={idx} style={{
                          color: idx === q.respostaCorreta ? "#32ae36" : "inherit",
                          fontWeight: idx === q.respostaCorreta ? "bold" : "normal"
                        }}>
                          {alt}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const container = { padding: "20px", maxWidth: "800px", margin: "0 auto", textAlign: "center" };
const card = {
  background: "var(--bg-card)", borderRadius: "10px", padding: "25px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", marginTop: "20px"
};
const inputStyle = {
  width: "100%", padding: "10px", marginBottom: "12px",
  borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box"
};
const sectionLabel = { fontWeight: "bold", textAlign: "left", marginBottom: "8px" };
const altRow = { display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" };

const tipoRow = {
  display: "flex", gap: "8px", marginBottom: "16px", justifyContent: "center"
};
const tipoBtn = {
  padding: "8px 16px", borderRadius: "20px", border: "2px solid var(--borda)",
  background: "var(--bg)", color: "var(--texto)", cursor: "pointer",
  fontWeight: "600", fontSize: "13px", transition: "all 0.15s"
};
const tipoBtnAtivo = {
  background: "var(--cor-primaria)", borderColor: "var(--cor-primaria)",
  color: "#fff"
};

const xpRow = {
  display: "flex", alignItems: "center", gap: "10px",
  marginTop: "16px", justifyContent: "center",
  padding: "12px", borderRadius: "8px",
  background: "var(--bg)", border: "1px solid var(--borda)"
};
const xpLabel = { fontSize: "14px", fontWeight: "600", color: "var(--texto-suave)" };
const xpInput = {
  width: "70px", padding: "6px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)", fontSize: "15px",
  fontWeight: "bold", textAlign: "center", boxSizing: "border-box"
};
const xpSufixo = { fontSize: "13px", color: "var(--texto-muito-suave)" };

const xpBadge = {
  display: "inline-block", marginTop: "4px",
  fontSize: "12px", fontWeight: "bold",
  color: "#32ae36", background: "#e8f5e9",
  padding: "2px 8px", borderRadius: "10px"
};
const badgeAberta = {
  fontSize: "11px", padding: "2px 8px", borderRadius: "10px",
  background: "#fff3e0", color: "#e65100", fontWeight: "bold"
};
const abertoHint = {
  textAlign: "left", fontSize: "13px", color: "var(--texto-suave)",
  background: "#fff3e0", border: "1px solid #ffe0b2",
  borderRadius: "8px", padding: "10px 14px", margin: "10px 0"
};

const buttonPrimary = {
  padding: "10px 20px", borderRadius: "8px", border: "none",
  background: "#32ae36", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonSecondary = {
  padding: "8px 14px", borderRadius: "8px",
  border: "1px dashed #aaa", background: "#fafafa",
  cursor: "pointer", marginTop: "4px"
};
const buttonRemove = {
  padding: "6px 10px", borderRadius: "6px", border: "none",
  background: "var(--cor-primaria)", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonEdit = {
  padding: "6px 10px", borderRadius: "6px", border: "none",
  background: "#32ae36", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonVoltar = {
  padding: "10px 20px", borderRadius: "8px",
  border: "1px solid #ccc", background: "var(--bg-card)", cursor: "pointer"
};
const questionCard = {
  background: "var(--bg-card)", listStyle: "none", marginBottom: "15px", padding: "15px",
  border: "1px solid #ccc", borderRadius: "10px", textAlign: "left"
};