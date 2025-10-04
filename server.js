import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ------------------------------
// Criar card
// ------------------------------
app.post("/create-card", async (req, res) => {
  const { title, description, listId } = req.body;

  try {
    const url = `https://api.trello.com/1/cards?idList=${listId || process.env.TRELLO_LIST_ID}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title || "Nova tarefa",
        desc: description || "Criado pelo ChatGPT"
      })
    });

    const data = await response.json();
    res.json({ success: true, card: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------------
// Listar boards do usuário
// ------------------------------
app.get("/list-boards", async (req, res) => {
  try {
    const url = `https://api.trello.com/1/members/me/boards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
    const response = await fetch(url);
    const boards = await response.json();
    res.json({ success: true, boards });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------------
// Listar cards de um board
// ------------------------------
app.get("/list-cards/:boardId", async (req, res) => {
  const { boardId } = req.params;
  try {
    const url = `https://api.trello.com/1/boards/${boardId}/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
    const response = await fetch(url);
    const cards = await response.json();
    res.json({ success: true, cards });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------------
// Porta usada pelo Vercel
// ------------------------------
app.listen(3000, () => console.log("Server rodando na Vercel"));
