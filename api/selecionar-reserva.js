export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const customerId = req.query.customerId;
    const indice = parseInt(req.query.indice, 10);

    if (!customerId || !indice) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetros obrigatórios: customerId e indice."
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

    const reserva = reservasFuturas[indice - 1];

    if (!reserva) {
      return res.status(200).json({
        status: "indice_invalido",
        mensagem: "⚠️ Opção inválida.\n\nDigite o número de uma reserva da lista."
      });
    }

    const data = reserva.startTime.split("T")[0];
    const hora = reserva.startTime.split("T")[1].slice(0, 5);
    const sala = reserva.place?.name || "Sala";

    return res.status(200).json({
      status: "ok",
      bookingId: reserva.bookingId,
      sala,
      data,
      hora,
      mensagem: `Confirme o cancelamento desta reserva:\n\nSala: ${sala}\nData: ${data}\nHorário: ${hora}`
    });
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao selecionar reserva.",
      detalhe: error.message
    });
  }
}
