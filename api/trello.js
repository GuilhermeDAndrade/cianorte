export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { action, name, cardId, memberId, labelId } = req.body;

  try {
    // Debug para verificar env vars (não expõe valor inteiro)
    console.log("DEBUG KEY:", process.env.TRELLO_KEY?.slice(0, 8));
    console.log("DEBUG TOKEN:", process.env.TRELLO_TOKEN?.slice(0, 8));
    console.log("DEBUG LIST:", process.env.TRELLO_LIST_ID);

    if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN) {
      return res.status(500).json({ error: "Env vars não configuradas" });
    }

    if (action === "create_card") {
      if (!name) {
        return res.status(400).json({ error: "O campo 'name' é obrigatório" });
      }

      const url = `https://api.trello.com/1/cards?idList=${process.env.TRELLO_LIST_ID}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      console.log("DEBUG URL:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const text = await response.text();
      console.log("DEBUG Trello Response:", text);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Erro ao criar card", details: text });
      }

      return res.status(200).json(JSON.parse(text));
    }

    if (action === "add_member") {
      if (!cardId || !memberId) {
        return res.status(400).json({ error: "cardId e memberId são obrigatórios" });
      }

      const url = `https://api.trello.com/1/cards/${cardId}/idMembers?value=${memberId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (action === "add_label") {
      if (!cardId || !labelId) {
        return res.status(400).json({ error: "cardId e labelId são obrigatórios" });
      }

      const url = `https://api.trello.com/1/cards/${cardId}/idLabels?value=${labelId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (action === "update_card") {
      if (!cardId || !name) {
        return res.status(400).json({ error: "cardId e name são obrigatórios" });
      }

      const url = `https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Ação inválida" });
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({ error: "Erro na integração com Trello", details: error.message });
  }
}
