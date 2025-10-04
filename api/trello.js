// cianorte/api/trello.js
import fetch from "node-fetch";

let boardCache = {}; // cache opcional em memória

export default async function handler(req, res) {
  // ----------------- Headers CORS -----------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Responde pré-requisições OPTIONS
  if (req.method === "OPTIONS") return res.status(200).end();

  // ----------------- Verificação do método POST -----------------
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  const { action, name, cardId, memberId, labelId, boardId, listId, desc } =
    req.body;

  if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN)
    return res.status(500).json({ error: "Env vars não configuradas" });

  try {
    // ----------------- CREATE CARD -----------------
    if (action === "create_card") {
      if (!name || !listId)
        return res
          .status(400)
          .json({ error: "'name' e 'listId' são obrigatórios" });

      const url = `https://api.trello.com/1/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const body = new URLSearchParams({
        idList: listId,
        name,
        desc: desc || "",
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = await response.json();
      if (!response.ok)
        return res
          .status(response.status)
          .json({ error: "Erro ao criar card", details: data });

      return res.status(200).json({ success: true, card: data });
    }

    // ----------------- UPDATE CARD -----------------
    if (action === "update_card") {
      if (!cardId)
        return res
          .status(400)
          .json({ error: "'cardId' é obrigatório para atualização" });

      const body = {};
      if (name) body.name = name;
      if (desc) body.desc = desc;

      const url = `https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok)
        return res
          .status(response.status)
          .json({ error: "Erro ao atualizar card", details: data });

      return res.status(200).json({ success: true, card: data });
    }

    // ----------------- ADD MEMBER -----------------
    if (action === "add_member") {
      if (!cardId || !memberId)
        return res
          .status(400)
          .json({ error: "cardId e memberId são obrigatórios" });

      const url = `https://api.trello.com/1/cards/${cardId}/idMembers?value=${memberId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();

      if (!response.ok)
        return res
          .status(response.status)
          .json({ error: "Erro ao adicionar membro", details: data });

      return res.status(200).json({ success: true, member: memberId });
    }

    // ----------------- ADD LABEL -----------------
    if (action === "add_label") {
      if (!cardId || !labelId)
        return res
          .status(400)
          .json({ error: "cardId e labelId são obrigatórios" });

      const url = `https://api.trello.com/1/cards/${cardId}/idLabels?value=${labelId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();

      if (!response.ok)
        return res
          .status(response.status)
          .json({ error: "Erro ao adicionar label", details: data });

      return res.status(200).json({ success: true, label: labelId });
    }

    // ----------------- GET BOARD (não alterado) -----------------
    if (action === "get_board") {
      if (!boardId)
        return res.status(400).json({ error: "'boardId' é obrigatório" });

      if (boardCache[boardId]) {
        return res.status(200).json(boardCache[boardId]);
      }

      const url = `https://api.trello.com/1/boards/${boardId}?lists=all&cards=open&members=all&labels=all&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url);
      const boardData = await response.json();

      if (!response.ok)
        return res
          .status(response.status)
          .json({ error: "Erro ao buscar board", details: boardData });

      const parsed = {
        boardName: boardData.name,
        lists: boardData.lists.map((list) => ({
          id: list.id,
          name: list.name,
          cards: boardData.cards
            .filter((card) => card.idList === list.id)
            .map((card) => ({
              id: card.id,
              name: card.name,
              due: card.due,
              createdAt: card.createdAt,
              dueComplete: card.dueComplete,
              desc: card.desc,
              members: card.idMembers.map(
                (id) =>
                  boardData.members.find((m) => m.id === id)?.fullName || id
              ),
              labels: card.idLabels.map(
                (id) => boardData.labels.find((l) => l.id === id)?.name || id
              ),
              url: card.shortUrl || card.url,
            })),
        })),
      };

      boardCache[boardId] = parsed;

      return res.status(200).json(parsed);
    }

    // ----------------- AÇÃO INVÁLIDA -----------------
    return res.status(400).json({ error: "Ação inválida" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro na integração com Trello", details: error.message });
  }
}
