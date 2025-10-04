// cianorte/api/trello.js
import fetch from "node-fetch";

let boardCache = {}; // cache opcional em memória

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { action, name, cardId, memberId, labelId, boardId, listId } = req.body;

  if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN) {
    return res.status(500).json({ error: "Env vars não configuradas" });
  }

  try {
    // ----------------- CREATE CARD -----------------
    if (action === "create_card") {
      if (!name || !listId) return res.status(400).json({ error: "'name' e 'listId' são obrigatórios" });

      const url = `https://api.trello.com/1/cards?idList=${listId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name }),
      });

      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: "Erro ao criar card", details: data });

      return res.status(200).json(data);
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
      if (!boardId) return res.status(400).json({ error: "'boardId' é obrigatório" });

      // Retorna do cache se já estiver armazenado
      if (boardCache[boardId]) {
        return res.status(200).json(boardCache[boardId]);
      }

      // Chamada direta à API oficial do Trello
      const url = `https://api.trello.com/1/boards/${boardId}?lists=all&cards=open&members=all&labels=all&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url);
      const boardData = await response.json();

      if (!response.ok) return res.status(response.status).json({ error: "Erro ao buscar board", details: boardData });

      // Parse simplificado para listas e cards, incluindo id de listas e cards
      const parsed = {
        boardName: boardData.name,
        lists: boardData.lists.map(list => ({
          id: list.id, // listId
          name: list.name,
          cards: boardData.cards
            .filter(card => card.idList === list.id)
            .map(card => ({
              id: card.id, // cardId
              name: card.name,
              due: card.due,
              createdAt: card.createdAt
              dueComplete: card.dueComplete,
              desc: card.desc,
              members: card.idMembers.map(id => boardData.members.find(m => m.id === id)?.fullName || id),
              labels: card.idLabels.map(id => boardData.labels.find(l => l.id === id)?.name || id),
              url: card.shortUrl || card.url
            }))
        }))
      };

      // Armazena em cache
      boardCache[boardId] = parsed;

      return res.status(200).json(parsed);
    }

    return res.status(400).json({ error: "Ação inválida" });
  } catch (error) {
    return res.status(500).json({ error: "Erro na integração com Trello", details: error.message });
  }
}
