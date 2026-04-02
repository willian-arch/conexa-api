export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";
    const roomId = 2265;

    const documento = (req.query.cpf || "").replace(/\D/g, "");
    const name = req.query.name || "";
    const email = req.query.email || "";
    const data = req.query.data || "";
    const startTime = req.query.startTime || "";

    let dataFormatada = data;

    if (data.includes("/")) {
      const partes = data.split("/");

      if (partes.length === 3) {
        const [dia, mes, ano] = partes;
        dataFormatada = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
      }
    }

    if (!documento || !data || !startTime) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetros obrigatórios: cpf, data e startTime."
      });
    }

    const horarioPermitido = /^([0-1]\d|2[0-3]):[0-5]\d$/.test(startTime);

    if (!horarioPermitido) {
      return res.status(200).json({
        status: "horario_invalido",
        mensagem: "⚠️ Horário inválido.\n\nDigite um horário no formato HH:MM."
      });
    }

    const horariosPermitidos = [
      "09:00", "09:30",
      "10:00", "10:30",
      "11:00", "11:30",
      "12:00", "12:30",
      "13:00", "13:30",
      "14:00", "14:30",
      "15:00", "15:30"
    ];

    if (!horariosPermitidos.includes(startTime)) {
      return res.status(200).json({
        status: "horario_fora_do_expediente",
        mensagem: "⚠️ As visitas podem ser agendadas de segunda a sábado, das 09:00 às 15:30.\n\nPor favor, escolha um horário válido."
      });
    }

    const dataVisita = new Date(`${dataFormatada}T00:00:00`);
    const diaSemana = dataVisita.getDay();

    if (diaSemana === 0) {
      return res.status(200).json({
        status: "fechado",
        mensagem: "🚫 Não agendamos visitas aos domingos.\n\nPor favor, escolha outro dia."
      });
    }

    const agora = new Date();
    const dataHoraReserva = new Date(`${dataFormatada}T${startTime}:00-03:00`);

    if (isNaN(dataHoraReserva.getTime())) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Data ou horário inválidos."
      });
    }

    if (dataHoraReserva < agora) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Não é possível agendar visita em horário passado."
      });
    }

    const parametro = documento.length === 14 ? "cnpj" : "cpf";

    // buscar customer
    const urlCustomer = `https://${subdominio}.conexa.app/index.php/api/v2/customers?${parametro}=${documento}&limit=1&offset=0`;

    const responseCustomer = await fetch(urlCustomer, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!responseCustomer.ok) {
      throw new Error(`Erro na Conexa (buscar customer visita): ${responseCustomer.status}`);
    }

    const resultCustomer = await responseCustomer.json();
    const customer = resultCustomer?.data?.[0] || null;
    let customerId = customer?.customerId || null;

    // criar customer se não existir
    if (!customerId) {
      if (!name || !email) {
        return res.status(400).json({
          status: "erro",
          mensagem: "Cliente não encontrado. Envie também nome e email."
        });
      }

      const urlCreateCustomer = `https://${subdominio}.conexa.app/index.php/api/v2/customer`;

      const bodyCustomer = documento.length === 14
        ? {
            companyId: 3,
            name,
            tradeName: name,
            legalPerson: {
              cnpj: documento
            },
            emailsMessage: [email]
          }
        : {
            companyId: 3,
            name,
            tradeName: name,
            naturalPerson: {
              cpf: documento
            },
            emailsMessage: [email]
          };

      const responseNewCustomer = await fetch(urlCreateCustomer, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyCustomer)
      });

      const resultNewCustomer = await responseNewCustomer.json();

      if (!responseNewCustomer.ok) {
        return res.status(500).json(resultNewCustomer);
      }

      customerId = resultNewCustomer?.id || null;

      if (!customerId) {
        return res.status(500).json(resultNewCustomer);
      }
    }

    // buscar person
    const urlPerson = `https://${subdominio}.conexa.app/index.php/api/v2/persons?${parametro}=${documento}&limit=1&offset=0`;

    const responsePerson = await fetch(urlPerson, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!responsePerson.ok) {
      throw new Error(`Erro na Conexa (buscar person visita): ${responsePerson.status}`);
    }

    const resultPerson = await responsePerson.json();
    const person = resultPerson?.data?.[0] || null;
    let personId = person?.personId || null;

    // criar person se não existir
    if (!personId) {
      if (!name || !email) {
        return res.status(400).json({
          status: "erro",
          mensagem: "Pessoa não encontrada. Envie também nome e email."
        });
      }

      const urlCreatePerson = `https://${subdominio}.conexa.app/index.php/api/v2/person`;

      const bodyPerson = documento.length === 14
        ? {
            customerId: Number(customerId),
            name,
            cnpj: documento,
            emails: [email]
          }
        : {
            customerId: Number(customerId),
            name,
            cpf: documento,
            emails: [email]
          };

      const responseNewPerson = await fetch(urlCreatePerson, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyPerson)
      });

      const resultNewPerson = await responseNewPerson.json();

      if (!responseNewPerson.ok) {
        return res.status(500).json(resultNewPerson);
      }

      personId = resultNewPerson?.id || null;

      if (!personId) {
        return res.status(500).json(resultNewPerson);
      }
    }

    // calcular finalTime (+30 min)
    const [hour, minute] = startTime.split(":").map(Number);
    const inicio = new Date();
    inicio.setHours(hour, minute, 0, 0);

    const fim = new Date(inicio.getTime() + 30 * 60 * 1000);
    const finalHour = String(fim.getHours()).padStart(2, "0");
    const finalMinute = String(fim.getMinutes()).padStart(2, "0");
    const finalTime = `${finalHour}:${finalMinute}`;

    // criar reserva
    const urlReserva = `https://${subdominio}.conexa.app/index.php/api/v2/room/booking`;

    const bodyReserva = {
      customerId: Number(customerId),
      personId: Number(personId),
      roomId: Number(roomId),
      date: dataFormatada,
      startTime,
      finalTime,
      notes: "Agendamento de visita via WhatsApp",
      sendCustomerEmail: false,
      sendRequesterEmail: false
    };

    const responseReserva = await fetch(urlReserva, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyReserva)
    });

    const resultReserva = await responseReserva.json();

    if (!responseReserva.ok) {
      if (
        resultReserva?.errors &&
        Array.isArray(resultReserva.errors) &&
        resultReserva.errors.some((e) => e.code === "E_UNAVAILABLE_ROOM_ALREADY_BOOKED")
      ) {
        return res.status(200).json({
          status: "horario_indisponivel",
          mensagem: "⚠️ Esse horário de visita não está mais disponível.\n\nPor favor, escolha outro horário."
        });
      }

      return res.status(500).json(resultReserva);
    }

    if (resultReserva?.id) {
      return res.status(200).json({
        status: "ok",
        mensagem: "✅ Sua visita foi agendada com sucesso.",
        bookingId: resultReserva.id
      });
    }

    return res.status(500).json(resultReserva);
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao agendar visita.",
      detalhe: error.message
    });
  }
}
