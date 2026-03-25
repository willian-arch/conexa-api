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

    // 🔥 PERÍODO (30 dias)
    const hojeBusca = new Date();
    hojeBusca.setHours(0, 0, 0, 0);

    const dataInicial = hojeBusca.toISOString().split("T")[0];
    const dataFinalObj = new Date(hojeBusca);
    dataFinalObj.setDate(dataFinalObj.getDate() + 30);
    const dataFinal = dataFinalObj.toISOString().split("T")[0];

    const bookingDateTimeFrom = `${dataInicial}T00:00:00-03:00`;
    const bookingDateTimeTo = `${dataFinal}T23:59:59-03:00`;

    let reservas = [];

    // 🔥 PAGE 1
    const urlPage1 = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&size=100&page=1`;

    const response1 = await fetch(urlPage1, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const result1 = await response1.json();
    reservas = result1?.data || [];

   // 🔥 filtra cliente
let reservasCliente = reservas.filter(r =>
  String(r.customerId) === String(customerId)
);

// 🔥 já filtra futuras válidas da página 1
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

let reservasFuturas = reservasCliente.filter((r) => {
  if (!r.startTime) return false;
  if (!r.isActive) return false;
  if (r.status === "cancelled") return false;

  const dataReserva = new Date(r.startTime);
  dataReserva.setHours(0, 0, 0, 0);

  return dataReserva >= hoje;
});

// 🔥 PAGE 2 só se ainda não encontrou reserva futura válida
if (reservasFuturas.length === 0) {
  const urlPage2 = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&size=100&page=2`;

  const response2 = await fetch(urlPage2, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const result2 = await response2.json();
  reservas = reservas.concat(result2?.data || []);

  reservasCliente = reservas.filter(r =>
    String(r.customerId) === String(customerId)
  );

  reservasFuturas = reservasCliente.filter((r) => {
    if (!r.startTime) return false;
    if (!r.isActive) return false;
    if (r.status === "cancelled") return false;

    const dataReserva = new Date(r.startTime);
    dataReserva.setHours(0, 0, 0, 0);

    return dataReserva >= hoje;
  });
}

  
      if (!r.startTime) return false;
      if (!r.isActive) return false;
      if (r.status === "cancelled") return false;

      const dataReserva = new Date(r.startTime);
      dataReserva.setHours(0, 0, 0, 0);

      return dataReserva >= hoje;
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

    // 🔥 formatar data BR
    const [ano, mes, dia] = reserva.startTime.split("T")[0].split("-");
    const dataBr = `${dia}/${mes}/${ano}`;

    const hora = reserva.startTime.split("T")[1].slice(0, 5);
    const sala = reserva.place?.name || "Sala";

    return res.status(200).json({
      status: "ok",
      bookingId: reserva.bookingId,
      sala,
      data: dataBr,
      hora,
      mensagem: `Confirme o cancelamento desta reserva:\n\nSala: ${sala}\nData: ${dataBr}\nHorário: ${hora}`
    });

  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao selecionar reserva.",
      detalhe: error.message
    });
  }
}
