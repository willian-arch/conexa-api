export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const sala = req.query.sala || "";
    const data = req.query.data || "";
    let dataFormatada = data;

if (data.includes("/")) {
  const partes = data.split("/");

  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    dataFormatada = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
}

    if (!sala || !data) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetros obrigatórios: sala e data."
      });
    }

const bookingDateTimeFrom = `${dataFormatada}T00:00:00-03:00`;
const bookingDateTimeTo = `${dataFormatada}T23:59:59-03:00`;

    const url = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?roomId[]=${sala}&bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();
    const reservas = result?.data || [];

    const horariosLivres = [];

    for (let hora = 0; hora < 24; hora++) {
      const inicioSlot = `${String(hora).padStart(2, "0")}:00`;

      let ocupado = false;

      for (const reserva of reservas) {
        const inicioReserva = new Date(reserva.startTime)
          .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
        const fimReserva = new Date(reserva.finalTime)
          .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

        if (inicioSlot >= inicioReserva && inicioSlot < fimReserva) {
          ocupado = true;
          break;
        }
      }

      if (!ocupado) {
        horariosLivres.push(inicioSlot);
      }
    }

    return res.status(200).json({
      status: "ok",
      horarios_livres: horariosLivres,
      mensagem: horariosLivres.join(", ")
    });
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao buscar horários.",
      detalhe: error.message
    });
  }
}
