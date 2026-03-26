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

  const hoje = new Date();

  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();

  const dataExemplo = `${dia}/${mes}/${ano}`;

  return res.status(200).json({
    status: "data_invalida",
    horarios_livres: [],
    mensagem: `⚠️ Data inválida.\n\nDigite no formato DD/MM/AAAA.\nExemplo: ${dataExemplo}`
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

    const url = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?roomId[]=${sala}&bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&size=100&page=1`;

    let reservas = [];
let page = 1;
const maxPages = 3;

do {
  const urlPaginada = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?roomId[]=${sala}&bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&size=100&page=${page}`;

  const response = await fetch(urlPaginada, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const result = await response.json();

  reservas = reservas.concat(result?.data || []);
  page++;
} while (page <= maxPages);
    const reservasFiltradas = reservas.filter((reserva) => {
      
  const dataReserva = reserva.startTime?.split("T")[0];

  const ativa = reserva.isActive === true;
  const naoCancelada = reserva.status !== "cancelled";

  return dataReserva === dataFormatada && ativa && naoCancelada;
});

    const diaSemanaConsulta = new Date(`${dataFormatada}T00:00:00`).getDay();

const recorrenciasMap = new Map();

for (const reserva of reservas) {
  if (!reserva.idRecurringBooking) continue;
  if (reserva.isActive !== true) continue;
  if (reserva.status === "cancelled") continue;

  const dataReserva = reserva.startTime?.split("T")[0];
  if (!dataReserva) continue;

  const dataReservaObj = new Date(`${dataReserva}T00:00:00`);
  const diaSemanaReserva = dataReservaObj.getDay();

  if (diaSemanaReserva !== diaSemanaConsulta) continue;

  const idRec = reserva.idRecurringBooking;
  const existente = recorrenciasMap.get(idRec);

  if (!existente || new Date(reserva.startTime) > new Date(existente.startTime)) {
    recorrenciasMap.set(idRec, reserva);
  }
}

const reservasRecorrentesMesmoDia = Array.from(recorrenciasMap.values()).map((reserva) => ({
  inicio: reserva.startTime.split("T")[1].slice(0, 5),
  fim: reserva.finalTime.split("T")[1].slice(0, 5),
  recorrencia: reserva.idRecurringBooking
}));


    const horariosLivres = [];


    const diaSemana = new Date(`${dataFormatada}T00:00:00`).getDay();

// 0 = domingo
if (diaSemana === 0) {
  return res.status(200).json({
    status: "fechado",
    horarios_livres: [],
    mensagem: "🚫 Não há atendimento aos domingos.\n\nPor favor, escolha outro dia."
  });
}
    
    for (let hora = 8; hora <= 21; hora++) {
      const inicioSlot = `${String(hora).padStart(2, "0")}:00`;

      let ocupado = false;

      for (const reserva of reservasFiltradas) {
  const inicioReserva = reserva.startTime.split("T")[1].slice(0, 5);
  const fimReserva = reserva.finalTime.split("T")[1].slice(0, 5);

  if (inicioSlot >= inicioReserva && inicioSlot < fimReserva) {
    ocupado = true;
    break;
  }
}

// recorrências temporariamente desativadas

      const agoraRecife = new Date(
  new Date().toLocaleString("en-US", { timeZone: "America/Recife" })
);

const hoje = `${String(agoraRecife.getDate()).padStart(2, "0")}/${String(agoraRecife.getMonth() + 1).padStart(2, "0")}/${agoraRecife.getFullYear()}`;

let horarioPassado = false;

if (data === hoje) {
  const [horaAtual, minutoAtual] = [
    String(agoraRecife.getHours()).padStart(2, "0"),
    String(agoraRecife.getMinutes()).padStart(2, "0")
  ];

  const horarioAtual = `${horaAtual}:${minutoAtual}`;
  horarioPassado = inicioSlot <= horarioAtual;
}

if (!ocupado && !horarioPassado) {
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
