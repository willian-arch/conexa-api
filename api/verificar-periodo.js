export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const roomId = req.query.roomId || "";
    const data = req.query.data || "";
    const startTime = req.query.startTime || "";
    const duracao = parseInt(req.query.duracao || "1", 10);

    let dataFormatada = data;

    if (data.includes("/")) {
      const partes = data.split("/");
      if (partes.length === 3) {
        const [dia, mes, ano] = partes;
        dataFormatada = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
      }
    }

    if (!roomId || !data || !startTime) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetros obrigatórios: roomId, data e startTime."
      });
    }

    if (![1, 2, 3, 4].includes(duracao)) {
      return res.status(200).json({
        status: "duracao_invalida",
        mensagem: "⚠️ Duração inválida. Escolha 1, 2, 3 ou 4 horas."
      });
    }

    const horarioPermitido = /^([0-1]\d|2[0-3]):[0-5]\d$/.test(startTime);

    if (!horarioPermitido) {
      return res.status(200).json({
        status: "horario_invalido",
        mensagem: "⚠️ Horário inválido."
      });
    }

    const [hour, minute] = startTime.split(":").map(Number);
    const inicio = new Date();
    inicio.setHours(hour, minute, 0, 0);

    const fim = new Date(inicio.getTime() + duracao * 60 * 60 * 1000);
    const finalTime = `${String(fim.getHours()).padStart(2, "0")}:${String(fim.getMinutes()).padStart(2, "0")}`;

    if (startTime < "08:00" || finalTime > "22:00") {
      return res.status(200).json({
        status: "horario_fora_do_expediente",
        mensagem: "⚠️ Esse período fica fora do horário permitido."
      });
    }

    const bookingDateTimeFrom = `${dataFormatada}T00:00:00-03:00`;
    const bookingDateTimeTo = `${dataFormatada}T23:59:59-03:00`;

    const url = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?roomId[]=${roomId}&bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&limit=100&offset=0`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na Conexa (verificar período): ${response.status}`);
    }

    const result = await response.json();
    const reservasDoDia = result?.data || [];

    const conflito = reservasDoDia.some((reserva) => {
      if (!reserva.startTime || !reserva.finalTime) return false;
      if (reserva.isActive !== true) return false;
      if (reserva.status === "cancelled") return false;

      const inicioReserva = reserva.startTime.split("T")[1].slice(0, 5);
      const fimReserva = reserva.finalTime.split("T")[1].slice(0, 5);

      return startTime < fimReserva && finalTime > inicioReserva;
    });

    if (conflito) {
      return res.status(200).json({
        status: "periodo_indisponivel",
        mensagem: `⚠️ Não há disponibilidade para ${duracao} horas consecutivas a partir de ${startTime}.`
      });
    }

    return res.status(200).json({
      status: "ok",
      mensagem: `✅ Período disponível: ${startTime} às ${finalTime}.`,
      finalTime
    });
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao verificar período.",
      detalhe: error.message
    });
  }
}
