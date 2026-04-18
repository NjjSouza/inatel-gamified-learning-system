import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuizzes } from "../hooks/useQuizzes";

export default function CreateQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createQuiz, addQuestion } = useQuizzes();

  const [nome, setNome] = useState("");
  const [quizId, setQuizId] = useState(null);
  const [enunciado, setEnunciado] = useState("");
  const [alternativas, setAlternativas] = useState(["", ""]);
  const [correta, setCorreta] = useState(0);

  useEffect(() => {
    if (user?.tipo !== "professor") navigate("/");
  }, [user]);

  const handleCreateQuiz = async () => {
    if (!nome) return alert("Digite o nome");
    const quiz = await createQuiz(nome);
    setQuizId(quiz.id);
  };

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

  const handleAddQuestion = async () => {
    if (!enunciado) return alert("Digite o enunciado");
    if (alternativas.some(a => a.trim() === "")) {
      return alert("Preencha todas as alternativas ou remova as vazias");
    }

    await addQuestion(quizId, {
      pergunta: enunciado,
      alternativas,
      respostaCorreta: correta,
    });

    alert("Pergunta adicionada!");
    setEnunciado("");
    setAlternativas(["", ""]);
    setCorreta(0);
  };

  return (
    <div style={container}>
      <h1>Criar Quiz</h1>

      {!quizId ? (
        <div style={card}>
          <input
            placeholder="Nome do quiz"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateQuiz} style={buttonPrimary}>
            Criar
          </button>
        </div>
      ) : (
        <div style={card}>
          <h2>Adicionar Pergunta</h2>

          <input
            placeholder="Enunciado da pergunta"
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            style={inputStyle}
          />

          <p style={sectionLabel}>Alternativas</p>

          {alternativas.map((alt, index) => (
            <div key={index} style={altRow}>
              <input
                type="radio"
                checked={correta === index}
                onChange={() => setCorreta(index)}
                title="Marcar como correta"
              />
              <input
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

          <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" }}>
            <button onClick={handleAddQuestion} style={buttonPrimary}>
              Adicionar pergunta
            </button>
            <button onClick={() => navigate(-1)} style={buttonVoltar}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const container = { padding: "20px", maxWidth: "700px", margin: "0 auto", textAlign: "center" };
const card = {
  background: "#fff", borderRadius: "10px", padding: "25px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", marginTop: "20px"
};
const inputStyle = {
  width: "100%", padding: "10px", marginBottom: "12px",
  borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box"
};
const sectionLabel = { fontWeight: "bold", textAlign: "left", marginBottom: "8px" };
const altRow = {
  display: "flex", alignItems: "center",
  gap: "8px", marginBottom: "10px"
};
const buttonPrimary = {
  padding: "10px 20px", borderRadius: "8px", border: "none",
  background: "#4CAF50", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonSecondary = {
  padding: "8px 14px", borderRadius: "8px",
  border: "1px dashed #aaa", background: "#fafafa",
  cursor: "pointer", marginTop: "4px"
};
const buttonRemove = {
  padding: "6px 10px", borderRadius: "6px", border: "none",
  background: "#f44336", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonVoltar = {
  padding: "10px 20px", borderRadius: "8px",
  border: "1px solid #ccc", background: "#fff", cursor: "pointer"
};