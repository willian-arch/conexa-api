export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const customerId = req.query.customerId;
    const indice = parseInt(req.query.indice, 10);

    if (!customerId || isNaN(indice)) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetros obrigatórios: customerId e indice."
      });
    }

    // período de busca: próximos 21 dias
    const hojeBusca = new Date();
    hojeBusca.setHours(0, 0, 0, 0);

    const dataInicial = hojeBusca.toISOString().split("T")[0];
    const dataFinalObj = new Date(hojeBusca);
    dataFinalObj.setDate(dataFinalObj.getDate() + 21);
    const dataFinal = dataFinalObj.toISOString().split("T")[0];

    const bookingDateTimeFrom = `${dataInicial}T00:00:00-03:00`;
    const bookingDateTimeTo = `${dataFinal}T23:59:59-03:00`;

    let reservas = [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const filtrarReservasFuturasValidas = (lista) => {
  const reservasCliente = lista.filter(
    (r) => String(r.customerId) === String(customerId)
  );

  return reservasCliente
    .filter((r) => {
      if (!r.startTime) return false;
      if (!r.isActive) return false;
      if (r.status === "cancelled") return false;

      const dataReserva = new Date(r.startTime);
      dataReserva.setHours(0, 0, 0, 0);

      return dataReserva >= hoje;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
};
      
    // PAGE 1
    const urlPage1 = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&limit=100&offset=0`;
    const response1 = await fetch(urlPage1, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response1.ok) {
      throw new Error(`Erro na página 1: ${response1.status}`);
    }

    const result1 = await response1.json();
    const hasNextPage1 = result1?.pagination?.hasNext === true;
    reservas = result1?.data || [];

    let reservasFuturas = filtrarReservasFuturasValidas(reservas);

    // PAGE 2 só se ainda não encontrou reservas válidas
    if (reservasFuturas.length === 0 && hasNextPage1) {
      const urlPage2 = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&limit=100&offset=100`;

      const response2 = await fetch(urlPage2, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response2.ok) {
        throw new Error(`Erro na página 2: ${response2.status}`);
      }

      const result2 = await response2.json();
      reservas = reservas.concat(result2?.data || []);
      reservasFuturas = filtrarReservasFuturasValidas(reservas);
    }

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
