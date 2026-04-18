import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuizzes } from "../hooks/useQuizzes";

export default function EditQuiz() {
  const { quizId } = useParams();
  const { addQuestion, getQuestions } = useQuizzes();

  const [pergunta, setPergunta] = useState("");
  const [alternativas, setAlternativas] = useState(["", ""]);
  const [correta, setCorreta] = useState(0);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const data = await getQuestions(quizId);
      setQuestions(data);
    };
    fetch();
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
    if (!pergunta) return alert("Digite a pergunta");
    if (alternativas.some(a => a.trim() === "")) {
      return alert("Preencha todas as alternativas ou remova as vazias");
    }

    try {
      await addQuestion(quizId, {
        pergunta,
        alternativas,
        respostaCorreta: correta,
      });

      const updated = await getQuestions(quizId);
      setQuestions(updated);

      setPergunta("");
      setAlternativas(["", ""]);
      setCorreta(0);

      alert("Pergunta adicionada!");
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  return (
    <div style={container}>
      <h1>Editar Quiz</h1>

      <div style={card}>
        <input
          type="text"
          placeholder="Pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          style={inputStyle}
        />

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

        <button onClick={handleAdd} style={{ ...buttonPrimary, marginTop: "20px" }}>
          Adicionar Pergunta
        </button>
      </div>

      <h2 style={{ marginTop: "30px" }}>Perguntas cadastradas</h2>

      {questions.length === 0 ? (
        <p>Nenhuma pergunta ainda</p>
      ) : (
        <ul style={{ padding: 0 }}>
          {questions.map((q) => (
            <li key={q.id} style={questionCard}>
              <strong>{q.pergunta}</strong>
              <ul style={{ marginTop: "8px" }}>
                {q.alternativas.map((alt, i) => (
                  <li key={i}>
                    {alt} {i === q.respostaCorreta && <strong>(Correta)</strong>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const container = { padding: "20px", maxWidth: "800px", margin: "0 auto", textAlign: "center" };
const card = {
  background: "#fff", borderRadius: "10px", padding: "25px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", marginTop: "20px"
};
const inputStyle = {
  width: "100%", padding: "10px", marginBottom: "12px",
  borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box"
};
const sectionLabel = { fontWeight: "bold", textAlign: "left", marginBottom: "8px" };
const altRow = { display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" };
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
const questionCard = {
  listStyle: "none", marginBottom: "15px", padding: "15px",
  border: "1px solid #ccc", borderRadius: "10px", textAlign: "left"
};