import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// rota que o ChatGPT vai chamar
app.post("/create-card", async (req, res) => {
  const { title, description } = req.body;

  try {
    const url = `https://api.trello.com/1/cards?idList=${process.env.TRELLO_LIST_ID}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
    
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

// porta que o Vercel usa
app.listen(3000, () => console.log("Server rodando na Vercel"));
