// api/trello.js
import fetch from "node-fetch";

let boardCache = {}; // cache opcional em memória

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { action, name, cardId, memberId, labelId, boardId } = req.body;

  // Debug inicial
  console.log("DEBUG KEY:", process.env.TRELLO_KEY?.slice(0, 8));
  console.log("DEBUG TOKEN:", process.env.TRELLO_TOKEN?.slice(0, 8));
  console.log("DEBUG LIST:", process.env.TRELLO_LIST_ID);

  if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN) {
    return res.status(500).json({ error: "Env vars não configuradas" });
  }

  try {
    // ----------------- CREATE CARD -----------------
    if (action === "create_card") {
      if (!name) return res.status(400).json({ error: "O campo 'name' é obrigatório" });

      const url = `https://api.trello.com/1/cards?idList=${process.env.TRELLO_LIST_ID}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name }),
      });

      const text = await response.text();
      if (!response.ok) return res.status(response.status).json({ error: "Erro ao criar card", details: text });
      return res.status(200).json(JSON.parse(text));
    }

    // ----------------- UPDATE CARD -----------------
    if (action === "update_card") {
      if (!cardId || !name) return res.status(400).json({ error: "cardId e name são obrigatórios" });

      const url = `https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      return res.status(200).json(data);
    }

    // ----------------- ADD MEMBER -----------------
    if (action === "add_member") {
      if (!cardId || !memberId) return res.status(400).json({ error: "cardId e memberId são obrigatórios" });

      const url = `https://api.trello.com/1/cards/${cardId}/idMembers?value=${memberId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ----------------- ADD LABEL -----------------
    if (action === "add_label") {
      if (!cardId || !labelId) return res.status(400).json({ error: "cardId e labelId são obrigatórios" });

      const url = `https://api.trello.com/1/cards/${cardId}/idLabels?value=${labelId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ----------------- GET BOARD -----------------
    if (action === "get_board") {
      const id = boardId || process.env.TRELLO_BOARD_ID;
      if (!id) return res.status(400).json({ error: "boardId obrigatório" });

      // Retorna do cache se disponível
      if (boardCache[id]) {
        console.log("DEBUG: Retornando do cache");
        return res.status(200).json(boardCache[id]);
      }

      const url = `https://api.trello.com/1/boards/${id}?lists=all&cards=all&members=all&labels=all&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url);
      const boardData = await response.json();

      if (!response.ok) return res.status(response.status).json({ error: "Erro ao buscar quadro", details: boardData });

      // Parse para GPT
      const parsed = {
        boardName: boardData.name,
        lists: boardData.lists.map(list => ({
          name: list.name,
          cards: boardData.cards
            .filter(card => card.idList === list.id)
            .map(card => ({
              name: card.name,
              desc: card.desc,
              members: card.idMembers.map(id => boardData.members.find(m => m.id === id)?.fullName || id),
              labels: card.idLabels.map(id => boardData.labels.find(l => l.id === id)?.name || id)
            }))
        }))
      };

      // Salva no cache
      boardCache[id] = parsed;

      return res.status(200).json(parsed);
    }

    return res.status(400).json({ error: "Ação inválida" });

  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({ error: "Erro na integração com Trello", details: error.message });
  }
}
