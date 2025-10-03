export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { action, name, cardId, memberId, labelId } = req.body;

  try {
    if (action === "create_card") {
      const response = await fetch(
        `https://api.trello.com/1/cards?idList=${process.env.TRELLO_LIST_ID}&name=${encodeURIComponent(name)}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,
        { method: "POST" }
      );
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (action === "add_member") {
      const response = await fetch(
        `https://api.trello.com/1/cards/${cardId}/idMembers?value=${memberId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,
        { method: "POST" }
      );
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (action === "add_label") {
      const response = await fetch(
        `https://api.trello.com/1/cards/${cardId}/idLabels?value=${labelId}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,
        { method: "POST" }
      );
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (action === "update_card") {
      const response = await fetch(
        `https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}&name=${encodeURIComponent(name)}`,
        { method: "PUT" }
      );
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Ação inválida" });

  } catch (error) {
    return res.status(500).json({ error: "Erro na integração com Trello", details: error.message });
  }
}
