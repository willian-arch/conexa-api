export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const sala = req.query.sala || "";
    const data = req.query.data || "";
    let dataFormatada = data;

if (data.includes("/")) {
  const partes = data.split("/");

  if (partes.length !== 3) {
    return res.status(200).json({
      status: "data_invalida",
      horarios_livres: [],
      mensagem: "⚠️ Data inválida.\n\nDigite no formato DD/MM/AAAA.\nExemplo: 20/03/2026"
    });
  }

  const [dia, mes, ano] = partes;

  if (
    dia.length !== 2 ||
    mes.length !== 2 ||
    ano.length !== 4
  ) {
    return res.status(200).json({
      status: "data_invalida",
      horarios_livres: [],
      mensagem: "⚠️ Data inválida.\n\nDigite no formato DD/MM/AAAA.\nExemplo: 20/03/2026"
    });
  }

  dataFormatada = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}


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
    const reservasFiltradas = reservas.filter((reserva) => {
  const dataReserva = reserva.startTime?.split("T")[0];

  const ativa = reserva.isActive === true;
  const naoCancelada = reserva.status !== "cancelled";

  return dataReserva === dataFormatada && ativa && naoCancelada;
});

    const horariosLivres = [];

    for (let hora = 0; hora < 24; hora++) {
      const inicioSlot = `${String(hora).padStart(2, "0")}:00`;

      let ocupado = false;

      for (const reserva of reservasFiltradas) {
        const inicioReserva = new Date(reserva.startTime)
          .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
        const fimReserva = new Date(reserva.finalTime)
          .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

        if (inicioSlot >= inicioReserva && inicioSlot < fimReserva) {
          ocupado = true;
          break;
        }
      }

      const agora = new Date();
const hoje = `${String(agora.getDate()).padStart(2, "0")}/${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;

let horarioPassado = false;

if (data === hoje) {
  const [horaAtual, minutoAtual] = [
    String(agora.getHours()).padStart(2, "0"),
    String(agora.getMinutes()).padStart(2, "0")
  ];

  const horarioAtual = `${horaAtual}:${minutoAtual}`;
  horarioPassado = inicioSlot <= horarioAtual;
}

if (!ocupado && !horarioPassado && inicioSlot !== "23:00") {
  horariosLivres.push(inicioSlot);
}
    }

    if (horariosLivres.length === 0) {
  return res.status(200).json({
    status: "sem_horarios",
    horarios_livres: [],
    mensagem: "😕 Não há horários disponíveis para essa data.\n\nPor favor, escolha outra data ou sala."
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
      mensagem: "Erro ao buscar horários.",
      detalhe: error.message
    });
  }
}
