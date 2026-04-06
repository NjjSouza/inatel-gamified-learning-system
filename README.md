# ✿ inatel-gamified-learning-system

---

## ✿ Lista de comandos aprendidos e utilizados

### ➤ Git

**Acessar a pasta do projeto**
```bash
cd C:\Users\aluno\Downloads\inatel-gamified-learning-system
```

**Configuração de nome e e-mail (global)**
```bash
git config --global user.name " "
git config --global user.email " "
git config --global --list
```

**Remover configurações**
```bash
git config --global --unset user.name
git config --global --unset user.email
```

**Configuração por repositório (mais seguro)**
```bash
git config user.name " "
git config user.email " "
```

**Fluxo de commit**
```bash
git init
git add .
git commit -m "mensagem"
# ou
git commit
```

O segundo permite editar melhor a mensagem, pois abre um editor de texto.

**Sair do editor**
```
fn + w
```

**Configurar VS Code como editor de commits**
```bash
git config --global core.editor "code --wait"
```

**Garantir que dados sensíveis não sejam versionados**
```bash
git ls-files build/
git ls-files .env
```

---

### ➤ Npm / Vite / React

**Permissão para rodar scripts**
```bash
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Y para confirmar.

**Criação do projeto**
```bash
npm create vite@latest
```
Selecionar:
- Nome do projeto
- React
- JavaScript

**Instalação de dependências**
```bash
npm install
```

**Executar o projeto**
```bash
npm run dev
```

**Instalações adicionais**
```bash
npm install firebase
npm install react-router-dom
```

---

### ➤ Debug

Quando algo não funciona ou não aparece na tela:

**Abrir inspecionar**
```
Fn + F12
```

A aba Console ajuda a identificar erros.

---

## ✿ Conexões

### ➤ Firebase

- Criar conta em: https://console.firebase.google.com
- Criar projeto
- Dentro de src, criar pasta services
- Criar arquivo:

```bash
src/services/firebase.js
```

- Inserir o código fornecido pelo próprio Firebase

Verificação de sucesso: Firebase aparece no package.json

---

### ➤ Firestore

- Acessar o console do Firebase
- Ir em Build -> Banco de dados do Firestore
- Seguir os passos de configuração

Modo teste utilizado (válido por 30 dias)

---

## ✿ Segurança

Foi recebido um alerta de vazamento de API enviado pelo Google, pela disposição das informações em um repositório público. Para resolver, foi aprendido uma prática crucial de segurança: o uso de um arquivo .env para guardar essas informações, e a menção desse arquivo no gitignore (assim, não sendo mais levado em consideração ao subir alterações para repositórios remotos). A chave API foi então alterada, sem mais riscos.

---

## ✿ Histórico de Evolução (Commits)

---

### ➤ Commit 1: Setup inicial e fluxo básico de autenticação

**Alterações principais:**
- Criação da estrutura inicial do projeto
- Configuração do ambiente React
- Integração inicial com Firebase

**Funcionalidades implementadas:**
- Fluxo inicial de autenticação
- Base para login de usuários

**Impacto no sistema:**
- Base do projeto estabelecida
- Permite evolução da autenticação

---

### ➤ Commit 2: Autenticação global e rotas protegidas

**Alterações principais:**
- Criação das pastas: pages, services, contexts, routes
- Reorganização:
  - Login.jsx -> pages
  - firebase.js -> services

**Organização:**
- Separação entre UI e lógica (MVVM)
- Centralização do Firebase

**Funcionalidades:**
- AuthContext para autenticação global
- Login e cadastro
- Hook useAuth

**Navegação:**
- react-router-dom
- Dashboards:
  - Aluno
  - Professor
- ProtectedRoute
- Redirecionamento automático

**Impacto:**
- Autenticação global
- Rotas protegidas
- Base para múltiplos usuários

---

### ➤ Commit 3: Cursos e melhoria do fluxo de autenticação

**Alterações:**
- Variáveis de ambiente do Firebase
- Ajustes no AuthContext

**Funcionalidades:**
- Logout
- Criação e listagem de cursos
- Integração com Firestore

**Validação:**
- Testes de autenticação e navegação

**Impacto:**
- Persistência de dados
- Introdução de cursos
- Fluxo mais robusto

---

### ➤ Commit 4: Autenticação, dashboards e fluxo de disciplinas

**Organização:**
- Estrutura:
  - pages
  - hooks
  - contexts
  - services

**Funcionalidades:**
- Autenticação completa
- Tipos de usuário:
  - aluno
  - professor
- Campo nome no cadastro

**Interface:**
- Dashboards
- Boas-vindas
- Logout
- Redirecionamento

**Disciplinas:**
- Criação
- Listagem
- Navegação dinâmica

**Nova página:**
- CoursePage

**Integração:**
- Firestore (dados de disciplina e professor)

**Melhorias:**
- IDs -> nomes legíveis
- Correção de bugs

**Impacto:**
- Sistema completo de cursos
- Código mais organizado
- Base para quizzes

---

### ➤ Commit 5: Sessões em tempo real

**Funcionalidades:**
- Sessões com múltiplos participantes
- Atualização em tempo real

**Impacto:**
- Interatividade
- Base para quizzes multiplayer

---

### ➤ Commit 6: Fluxo completo de quizzes e perguntas

**Funcionalidades:**
- Sistema de quizzes
- Perguntas e respostas
- Execução completa

**Impacto:**
- Base pedagógica implementada

---

### ➤ Commit 7: Fluxo de quizzes e sessões por disciplina

**Funcionalidades:**
- Associação de quizzes às disciplinas
- Organização por contexto

**Impacto:**
- Estrutura educacional realista
- Melhor organização

---

### ➤ Commit 8: Separação de fluxo de usuários e melhorias gerais

**Funcionalidades:**
- Refinamento aluno/professor
- Melhorias de usabilidade

**Impacto:**
- Sistema mais consistente
- Melhor experiência de uso

---
