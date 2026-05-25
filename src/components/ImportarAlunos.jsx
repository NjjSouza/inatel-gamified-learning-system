import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useClasses } from "../hooks/useClasses";

/**
 * Extrai alunos de uma planilha .xls/.xlsx no formato do Inatel.
 * Formato esperado:
 *   Linha 0: metadados (Turma, código, período, semestre...)
 *   Linha 1: cabeçalhos reais - "Matrícula" na col 4, "Nome" na col 6
 *   Linhas 2+: dados dos alunos
 *
 * A função também aceita planilhas "normais" onde a linha 0 já é cabeçalho
 * (busca a coluna com header "Matrícula" / "matricula" / "MATRICULA").
 */
function extrairAlunos(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 2) return [];

  // Encontra a linha-header (a que contém "Matrícula")
  let headerRowIdx = -1;
  let colMatricula = -1;
  let colNome = -1;

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i].map((c) => String(c).trim().toLowerCase());
    const mIdx = row.findIndex((c) =>
      c === "matrícula" || c === "matricula" || c === "mat."
    );
    if (mIdx !== -1) {
      headerRowIdx = i;
      colMatricula = mIdx;
      const nIdx = row.findIndex((c) =>
        c === "nome" || c === "nome completo" || c === "aluno"
      );
      colNome = nIdx !== -1 ? nIdx : mIdx + 2; // fallback: 2 cols à direita
      break;
    }
  }

  // Fallback: tenta posições fixas do formato do sistema acadêmico do Inatel
  if (headerRowIdx === -1) {
    headerRowIdx = 1;
    colMatricula = 4;
    colNome = 6;
  }

  const alunos = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const matricula = String(row[colMatricula] ?? "").trim();
    const nome = String(row[colNome] ?? "").trim();
    if (!matricula || matricula.toLowerCase() === "matrícula") continue;
    // Aceita matrículas de 3 a 4 dígitos
    if (!/^\d{3,4}$/.test(matricula)) continue;
    alunos.push({ matricula, nome });
  }
  return alunos;
}

export default function ImportarAlunos({ classId, onImportado }) {
  const { enrollByMatricula, getEnrollments } = useClasses();
  const inputRef = useRef(null);

  const [etapa, setEtapa] = useState("idle"); // idle | preview | importando | resultado
  const [alunos, setAlunos] = useState([]);   // lista extraída da planilha
  const [selecionados, setSelecionados] = useState(new Set());
  const [erroArquivo, setErroArquivo] = useState("");
  const [resultado, setResultado] = useState({ ok: [], erros: [] });

  // Leitura do arquivo
  const handleArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setErroArquivo("");

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const extraidos = extrairAlunos(wb);

      if (extraidos.length === 0) {
        setErroArquivo(
          "Nenhuma matrícula encontrada. Verifique se a planilha segue o formato esperado."
        );
        return;
      }

      // Verifica duplicatas já matriculadas
      const enrollments = await getEnrollments(classId);
      const matriculasExistentes = new Set(enrollments.map((e) => e.matricula));

      const alunosComStatus = extraidos.map((a) => ({
        ...a,
        jaMatriculado: matriculasExistentes.has(a.matricula),
      }));

      setAlunos(alunosComStatus);
      // Pré-seleciona apenas os novos
      setSelecionados(
        new Set(
          alunosComStatus
            .filter((a) => !a.jaMatriculado)
            .map((a) => a.matricula)
        )
      );
      setEtapa("preview");
    } catch (err) {
      setErroArquivo("Erro ao ler o arquivo. Certifique-se de que é um .xls ou .xlsx válido.");
    }
  };

  // Toggle seleção 
  const toggleAluno = (matricula) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(matricula) ? next.delete(matricula) : next.add(matricula);
      return next;
    });
  };

  const toggleTodos = () => {
    const novos = alunos.filter((a) => !a.jaMatriculado).map((a) => a.matricula);
    setSelecionados((prev) =>
      prev.size === novos.length ? new Set() : new Set(novos)
    );
  };

  // Importação 
  const handleImportar = async () => {
    const paraImportar = alunos.filter(
      (a) => selecionados.has(a.matricula) && !a.jaMatriculado
    );
    if (paraImportar.length === 0) return;

    setEtapa("importando");
    const ok = [], erros = [];

    for (const aluno of paraImportar) {
      try {
        await enrollByMatricula(classId, aluno.matricula, aluno.nome);
        ok.push(aluno);
      } catch (err) {
        erros.push({ ...aluno, motivo: err.message });
      }
    }

    setResultado({ ok, erros });
    setEtapa("resultado");
    if (ok.length > 0) onImportado?.();
  };

  const resetar = () => {
    setEtapa("idle");
    setAlunos([]);
    setSelecionados(new Set());
    setErroArquivo("");
    setResultado({ ok: [], erros: [] });
  };

  // RENDER
  const novos = alunos.filter((a) => !a.jaMatriculado);
  const jaMatriculados = alunos.filter((a) => a.jaMatriculado);
  const todosSelecionados = selecionados.size === novos.length && novos.length > 0;

  return (
    <div style={wrapper}>
      {/* IDLE */}
      {etapa === "idle" && (
        <div style={dropZone} onClick={() => inputRef.current?.click()}>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            style={{ display: "none" }}
            onChange={handleArquivo}
          />
          <p style={dropTitle}>Importar alunos por planilha</p>
          <p style={dropSub}>Clique para selecionar um arquivo .xls ou .xlsx</p>
          {erroArquivo && <p style={erroTexto}>{erroArquivo}</p>}
        </div>
      )}

      {/* PREVIEW */}
      {etapa === "preview" && (
        <div>
          <div style={previewHeader}>
            <div>
              <p style={previewTitulo}>
                {alunos.length} aluno{alunos.length !== 1 ? "s" : ""} encontrado
                {alunos.length !== 1 ? "s" : ""} na planilha
              </p>
              <p style={previewSub}>
                {novos.length} novo{novos.length !== 1 ? "s" : ""}
                {jaMatriculados.length > 0
                  ? ` · ${jaMatriculados.length} já matriculado${jaMatriculados.length !== 1 ? "s" : ""} (ignorados)`
                  : ""}
              </p>
            </div>
            <button onClick={resetar} style={btnCancelar}>Cancelar</button>
          </div>

          {/* Tabela de preview */}
          <div style={tabelaWrap}>
            <table style={tabela}>
              <thead>
                <tr>
                  <th style={thCheck}>
                    {novos.length > 0 && (
                      <input
                        type="checkbox"
                        checked={todosSelecionados}
                        onChange={toggleTodos}
                        title={todosSelecionados ? "Desmarcar todos" : "Selecionar todos"}
                      />
                    )}
                  </th>
                  <th style={th}>Matrícula</th>
                  <th style={th}>Nome</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  const sel = selecionados.has(aluno.matricula);
                  return (
                    <tr
                      key={aluno.matricula}
                      style={{
                        ...tr,
                        opacity: aluno.jaMatriculado ? 0.5 : 1,
                        background: sel ? "var(--cor-primaria-claro)" : "transparent",
                      }}
                      onClick={() => !aluno.jaMatriculado && toggleAluno(aluno.matricula)}
                    >
                      <td style={tdCheck}>
                        {aluno.jaMatriculado ? (
                          <span style={{ fontSize: "14px" }}></span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleAluno(aluno.matricula)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </td>
                      <td style={td}>
                        <code style={matriculaBadge}>{aluno.matricula}</code>
                      </td>
                      <td style={{ ...td, textAlign: "left" }}>
                        {aluno.nome || <span style={{ color: "var(--texto-muito-suave)", fontStyle: "italic" }}>Sem nome</span>}
                      </td>
                      <td style={td}>
                        {aluno.jaMatriculado ? (
                          <span style={badgeJaMatriculado}>Já matriculado</span>
                        ) : sel ? (
                          <span style={badgeNovo}>A importar</span>
                        ) : (
                          <span style={badgeIgnorado}>Ignorar</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé */}
          <div style={previewFooter}>
            <span style={{ fontSize: "13px", color: "var(--texto-suave)" }}>
              {selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""} para importar
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={resetar} style={btnSecundario}>Cancelar</button>
              <button
                onClick={handleImportar}
                disabled={selecionados.size === 0}
                style={{
                  ...btnPrimario,
                  opacity: selecionados.size === 0 ? 0.5 : 1,
                  cursor: selecionados.size === 0 ? "default" : "pointer",
                }}
              >
                Importar {selecionados.size > 0 ? selecionados.size : ""} aluno{selecionados.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTANDO */}
      {etapa === "importando" && (
        <div style={centrado}>
          <div style={spinner} />
          <p style={{ color: "var(--texto-suave)", marginTop: "12px", fontSize: "14px" }}>
            Matriculando alunos...
          </p>
        </div>
      )}

      {/* RESULTADO */}
      {etapa === "resultado" && (
        <div>
          {resultado.ok.length > 0 && (
            <div style={bannerSucesso}>
              <strong>{resultado.ok.length} aluno{resultado.ok.length !== 1 ? "s" : ""} matriculado{resultado.ok.length !== 1 ? "s" : ""} com sucesso!</strong>
              <ul style={listaResultado}>
                {resultado.ok.map((a) => (
                  <li key={a.matricula} style={{ marginBottom: "2px" }}>
                    {a.nome || "-"} <code style={matriculaInline}>{a.matricula}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.erros.length > 0 && (
            <div style={bannerErro}>
              <strong>⚠ {resultado.erros.length} falha{resultado.erros.length !== 1 ? "s" : ""}:</strong>
              <ul style={listaResultado}>
                {resultado.erros.map((a) => (
                  <li key={a.matricula} style={{ marginBottom: "2px" }}>
                    {a.nome || "-"} <code style={matriculaInline}>{a.matricula}</code> - {a.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={resetar} style={{ ...btnSecundario, marginTop: "12px" }}>
            Importar outra planilha
          </button>
        </div>
      )}
    </div>
  );
}

// Estilos

const wrapper = { width: "100%" };

const dropZone = {
  border: "2px dashed var(--borda)",
  borderRadius: "10px",
  padding: "28px 20px",
  textAlign: "center",
  cursor: "pointer",
  background: "var(--bg-input)",
  transition: "border-color 0.2s, background 0.2s",
};
const dropIcon  = { fontSize: "28px", display: "block", marginBottom: "8px" };
const dropTitle = { fontSize: "15px", fontWeight: "700", color: "var(--texto)", margin: "0 0 4px" };
const dropSub   = { fontSize: "13px", color: "var(--texto-muito-suave)", margin: 0 };
const erroTexto = { color: "var(--cor-perigo)", fontSize: "13px", marginTop: "10px" };

const previewHeader = {
  display: "flex", justifyContent: "space-between",
  alignItems: "flex-start", marginBottom: "12px",
};
const previewTitulo = { fontSize: "14px", fontWeight: "700", color: "var(--texto)", margin: "0 0 2px" };
const previewSub    = { fontSize: "12px", color: "var(--texto-muito-suave)", margin: 0 };

const tabelaWrap = {
  overflowX: "auto",
  border: "1px solid var(--borda)",
  borderRadius: "8px",
  maxHeight: "300px",
  overflowY: "auto",
};
const tabela = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const th     = {
  padding: "8px 10px", fontSize: "11px", fontWeight: "700",
  color: "var(--texto-muito-suave)", textTransform: "uppercase",
  letterSpacing: "0.4px", borderBottom: "2px solid var(--borda)",
  background: "var(--bg-card)", position: "sticky", top: 0, textAlign: "center",
};
const thCheck = { ...th, width: "36px" };
const tr = {
  borderBottom: "1px solid var(--borda)",
  cursor: "pointer",
  transition: "background 0.12s",
};
const td      = { padding: "9px 10px", color: "var(--texto)", textAlign: "center" };
const tdCheck = { ...td, width: "36px" };

const matriculaBadge = {
  fontSize: "12px", fontWeight: "bold",
  background: "var(--bg-input)", color: "var(--texto)",
  padding: "2px 6px", borderRadius: "4px",
  border: "1px solid var(--borda)", fontFamily: "monospace",
};
const matriculaInline = {
  fontSize: "12px", background: "transparent",
  color: "var(--texto-suave)", fontFamily: "monospace",
};

const badgeNovo = {
  fontSize: "11px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  padding: "2px 8px", borderRadius: "8px",
};
const badgeJaMatriculado = {
  fontSize: "11px", fontWeight: "bold",
  background: "var(--bg-hover)", color: "var(--texto-muito-suave)",
  padding: "2px 8px", borderRadius: "8px",
  border: "1px solid var(--borda)",
};
const badgeIgnorado = {
  fontSize: "11px", color: "var(--texto-muito-suave)",
  padding: "2px 8px", borderRadius: "8px",
};

const previewFooter = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginTop: "14px",
  paddingTop: "12px", borderTop: "1px solid var(--borda)",
};

const btnPrimario = {
  padding: "9px 18px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
  fontFamily: "inherit",
};
const btnSecundario = {
  padding: "8px 14px", borderRadius: "8px",
  border: "1px solid var(--borda)",
  background: "var(--bg-card)", color: "var(--texto)",
  fontWeight: "600", fontSize: "13px", cursor: "pointer",
  fontFamily: "inherit",
};
const btnCancelar = {
  padding: "6px 12px", borderRadius: "6px", border: "none",
  background: "transparent", color: "var(--texto-suave)",
  fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
};

const centrado = {
  display: "flex", flexDirection: "column",
  alignItems: "center", padding: "30px 0",
};
const spinner = {
  width: "32px", height: "32px", borderRadius: "50%",
  border: "3px solid var(--borda)",
  borderTop: "3px solid var(--cor-primaria)",
  animation: "spin 0.8s linear infinite",
};

const bannerSucesso = {
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  borderRadius: "8px", padding: "12px 16px",
  border: "1px solid var(--cor-primaria-borda)", marginBottom: "8px",
  fontSize: "13px", textAlign: "left",
};
const bannerErro = {
  background: "var(--cor-perigo-claro)", color: "var(--cor-perigo-texto)",
  borderRadius: "8px", padding: "12px 16px",
  border: "1px solid var(--cor-perigo-borda)", marginBottom: "8px",
  fontSize: "13px", textAlign: "left",
};
const listaResultado = {
  margin: "6px 0 0 16px", padding: 0,
  listStyle: "disc", lineHeight: 1.7,
};