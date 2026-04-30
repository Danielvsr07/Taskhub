# ⚡ TaskHUB — Guia de Deploy

## Pré-requisitos
- [Node.js 18+](https://nodejs.org) instalado
- [Git](https://git-scm.com) instalado
- Conta gratuita no [GitHub](https://github.com)
- Conta gratuita no [Vercel](https://vercel.com)

---

## 🚀 Deploy em 5 passos

### 1. Instale as dependências
Abra o terminal na pasta `taskhub` e rode:
```bash
npm install
```

### 2. Teste localmente (opcional)
```bash
npm run dev
```
Acesse http://localhost:5173 para ver o sistema rodando.

### 3. Suba para o GitHub
```bash
git init
git add .
git commit -m "TaskHUB inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/taskhub.git
git push -u origin main
```
> Crie o repositório no GitHub em https://github.com/new antes de rodar esses comandos.
> Substitua `SEU_USUARIO` pelo seu usuário do GitHub.

### 4. Conecte ao Vercel
1. Acesse https://vercel.com e faça login com o GitHub
2. Clique em **"Add New Project"**
3. Importe o repositório `taskhub`
4. Clique em **"Deploy"** — o Vercel detecta o Vite automaticamente

### 5. Acesse o sistema
Após o deploy (cerca de 1 minuto), o Vercel fornece uma URL pública tipo:
```
https://taskhub-seuusuario.vercel.app
```

---

## 🗄️ Banco de Dados (Supabase — opcional)

O sistema funciona sem banco usando localStorage do navegador.
Para persistir dados na nuvem, siga as instruções na tela de setup do próprio TaskHUB.

---

## 👤 Credenciais padrão

| Tipo  | E-mail                              | Senha  |
|-------|-------------------------------------|--------|
| Admin | daniel.cunha@oficinabrasil.com.br   | 123123 |
| Demo  | joao@empresa.com                    | demo123|

---

## 🔄 Atualizações futuras
Para atualizar o sistema após mudanças:
```bash
git add .
git commit -m "Atualização"
git push
```
O Vercel faz o redeploy automaticamente.
