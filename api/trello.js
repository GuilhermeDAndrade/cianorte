// cianorte/api/trello.js
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

let boardCache = {}; // cache opcional em memória

// Carrega JSON de forma segura
const jsonPath = path.join(process.cwd(), "api/trello_boards_id.json");
let boards = {};
try {
  boards = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log("DEBUG: Boards carregados:", boards);
} catch (e) {
  console.error("DEBUG ERROR: Não foi possível carregar trello_boards_id.json", e);
}

// ----------------- Função para resolver boardName -> ID -----------------
function resolveBoardId(boardName, boardsMapping) {
  return boardsMapping[boardName] || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { action, name, cardId, memberId, labelId, boardName } = req.body;

  console.log("DEBUG KEY:", process.env.TRELLO_KEY?.slice(0, 8));
  console.log("DEBUG TOKEN:", process.env.TRELLO_TOKEN?.slice(0, 8));

  if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN) {
    return res.status(500).json({ error: "Env vars não configuradas" });
  }

  try {
    const getListId = (boardName) => {
      const idList = boards[boardName];
      if (!idList) console.warn(`DEBUG: Board "${boardName}" não encontrado no JSON`);
      return idList;
    };

    // ----------------- CREATE CARD -----------------
    if (action === "create_card") {
      if (!name) return res.status(400).json({ error: "O campo 'name' é obrigatório" });

      const listId = getListId(boardName || "Faturamento");
      if (!listId) return res.status(400).json({ error: `Board "${boardName}" não encontrado` });

      console.log(`DEBUG: Criando card "${name}" no board "${boardName}" (idList=${listId})`);

      const url = `https://api.trello.com/1/cards?idList=${listId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name }),
      });

      const text = await response.text();
      if (!response.ok) {
        console.error("DEBUG: Erro ao criar card:", text);
        return res.status(response.status).json({ error: "Erro ao criar card", details: text });
      }

      console.log("DEBUG: Card criado com sucesso");
      return res.status(200).json(JSON.parse(text));
    }

    // ----------------- UPDATE CARD -----------------
    if (action === "update_card") {
      if (!cardId || !name) return res.status(400).json({ error: "cardId e name são obrigatórios" });

      console.log(`DEBUG: Atualizando card ${cardId} para nome "${name}"`);
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

      console.log(`DEBUG: Adicionando membro ${memberId} ao card ${cardId}`);
      const url = `https://api.trello.com/1/cards/${cardId}/idMembers?value=${memberId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ----------------- ADD LABEL -----------------
    if (action === "add_label") {
      if (!cardId || !labelId) return res.status(400).json({ error: "cardId e labelId são obrigatórios" });

      console.log(`DEBUG: Adicionando label ${labelId} ao card ${cardId}`);
      const url = `https://api.trello.com/1/cards/${cardId}/idLabels?value=${labelId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ----------------- GET BOARD -----------------
    if (action === "get_board") {
      const id = resolveBoardId(boardName, boards);
      if (!id) return res.status(400).json({ error: `Board "${boardName}" não encontrado` });

      if (boardCache[id]) {
        console.log("DEBUG: Retornando board do cache");
        return res.status(200).json(boardCache[id]);
      }

      console.log(`DEBUG: Buscando dados do board (id=${id})`);
      const url = `https://api.trello.com/1/boards/${id}?lists=all&cards=open&members=all&labels=all&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url);
      const boardData = await response.json();

      if (!response.ok) {
        console.error("DEBUG: Erro ao buscar board:", boardData);
        return res.status(response.status).json({ error: "Erro ao buscar board", details: boardData });
      }

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
              labels: card.idLabels.map(id => boardData.labels.find(l => l.id === id)?.name || id),
              url: card.shortUrl || card.url
            }))
        }))
      };

      boardCache[id] = parsed;
      return res.status(200).json(parsed);
    }

    return res.status(400).json({ error: "Ação inválida" });

  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({ error: "Erro na integração com Trello", details: error.message });
  }
}
