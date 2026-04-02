export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";
    const sala = 2265;

    const data = req.query.data || "";
    let dataFormatada = data;

    const hojeMsg = new Date();
    const diaHoje = String(hojeMsg.getDate()).padStart(2, "0");
    const mesHoje = String(hojeMsg.getMonth() + 1).padStart(2, "0");
    const anoHoje = hojeMsg.getFullYear();
    const dataExemplo = `${diaHoje}/${mesHoje}/${anoHoje}`;

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      return res.status(200).json({
        status: "data_invalida",
        horarios_livres: [],
        mensagem: `⚠️ Data inválida.\n\nDigite no formato DD/MM/AAAA.\nExemplo: ${dataExemplo}`
      });
    }

    const partes = data.split("/");
    const [dia, mes, ano] = partes;
    dataFormatada = `${ano}-${mes}-${dia}`;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataSelecionada = new Date(`${dataFormatada}T00:00:00`);

    if (dataSelecionada < hoje) {
      return res.status(200).json({
        status: "data_invalida",
        horarios_livres: [],
        mensagem: "⚠️ Não é possível consultar horários em datas passadas.\n\nPor favor, escolha uma data válida."
      });
    }

    const diaSemana = new Date(`${dataFormatada}T00:00:00`).getDay();

    if (diaSemana === 0) {
      return res.status(200).json({
        status: "fechado",
        horarios_livres: [],
        mensagem: "🚫 Não agendamos visitas aos domingos.\n\nPor favor, escolha outro dia."
      });
    }

    const bookingDateTimeFrom = `${dataFormatada}T00:00:00-03:00`;
    const bookingDateTimeTo = `${dataFormatada}T23:59:59-03:00`;

    let reservas = [];
    let offset = 0;
    const limit = 100;
    const maxPaginas = 3;
    let paginaAtual = 1;

    do {
      const urlPaginada = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?roomId[]=${sala}&bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&limit=${limit}&offset=${offset}`;

      const response = await fetch(urlPaginada, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na Conexa (horarios-visita): ${response.status}`);
      }

      const result = await response.json();
      const hasNext = result?.pagination?.hasNext === true;

      reservas = reservas.concat(result?.data || []);

      if (!hasNext) {
        break;
      }

      offset += limit;
      paginaAtual++;
    } while (paginaAtual <= maxPaginas);

    const reservasFiltradas = reservas.filter((reserva) => {
      const dataReserva = reserva.startTime?.split("T")[0];
      const ativa = reserva.isActive === true;
      const naoCancelada = reserva.status !== "cancelled";

      return dataReserva === dataFormatada && ativa && naoCancelada;
    });

    const horariosLivres = [];

    for (let hora = 9; hora <= 15; hora++) {
      for (let minuto of [0, 30]) {
        const inicioSlot = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

        if (inicioSlot > "15:30") continue;

        let ocupado = false;

        for (const reserva of reservasFiltradas) {
          const inicioReserva = reserva.startTime.split("T")[1].slice(0, 5);
          const fimReserva = reserva.finalTime.split("T")[1].slice(0, 5);

          if (inicioSlot >= inicioReserva && inicioSlot < fimReserva) {
            ocupado = true;
            break;
          }
        }

        const agoraRecife = new Date(
          new Date().toLocaleString("en-US", { timeZone: "America/Recife" })
        );

        const hojeBr = `${String(agoraRecife.getDate()).padStart(2, "0")}/${String(agoraRecife.getMonth() + 1).padStart(2, "0")}/${agoraRecife.getFullYear()}`;

        let horarioPassado = false;

        if (data === hojeBr) {
          const horarioAtual = `${String(agoraRecife.getHours()).padStart(2, "0")}:${String(agoraRecife.getMinutes()).padStart(2, "0")}`;
          horarioPassado = inicioSlot <= horarioAtual;
        }

        if (!ocupado && !horarioPassado) {
          horariosLivres.push(inicioSlot);
        }
      }
    }

    if (horariosLivres.length === 0) {
      return res.status(200).json({
        status: "sem_horarios",
        horarios_livres: [],
        mensagem: "😕 Não há horários disponíveis para visita nessa data.\n\nPor favor, escolha outro dia."
      });
    }

    return res.status(200).json({
      status: "ok",
      horarios_livres: horariosLivres,
      mensagem: horariosLivres.join("\n")
    });
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao buscar horários de visita.",
      detalhe: error.message
    });
  }
}
