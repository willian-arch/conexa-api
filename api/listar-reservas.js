export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const customerId = req.query.customerId;

    if (!customerId) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetro obrigatório: customerId"
      });
    }

    const url = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?customerId=${customerId}&size=50&page=1`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    const reservas = result?.data || [];

    // pegar só futuras
    const agora = new Date();

    const reservasFuturas = reservas.filter((r) => {
      if (!r.startTime) return false;
      if (!r.isActive) return false;
      if (r.status === "cancelled") return false;

      return new Date(r.startTime) >= agora;
    });

    if (reservasFuturas.length === 0) {
      return res.status(200).json({
        status: "sem_reservas",
        mensagem: "Você não possui reservas futuras."
      });
    }

    const lista = reservasFuturas.map((r, i) => {
      const data = r.startTime.split("T")[0];
      const hora = r.startTime.split("T")[1].slice(0, 5);
      const sala = r.place?.name || "Sala";

      return `${i + 1} - ${sala} | ${data} às ${hora}`;
    });

    return res.status(200).json({
      status: "ok",
      reservas: reservasFuturas,
      mensagem: lista.join("\n")
    });

  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao buscar reservas.",
      detalhe: error.message
    });
  }
}
