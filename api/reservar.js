export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const cpf = (req.query.cpf || "").replace(/\D/g, "");
    const name = req.query.name || "";
    const email = req.query.email || "";
    const roomId = req.query.roomId || "";
    const data = req.query.data || "";
    const startTime = req.query.startTime || "";

    if (!cpf || !roomId || !data || !startTime) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetros obrigatórios: cpf, roomId, data e startTime."
      });
    }

    // bloquear horário no passado
    const agora = new Date();
    const dataHoraReserva = new Date(`${data}T${startTime}:00-03:00`);

    if (isNaN(dataHoraReserva.getTime())) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Data ou horário inválidos."
      });
    }

    if (dataHoraReserva < agora) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Não é possível reservar um horário no passado."
      });
    }

    // buscar customer
    const urlCustomer = `https://${subdominio}.conexa.app/index.php/api/v2/customers?cpf=${cpf}`;

    const responseCustomer = await fetch(urlCustomer, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

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

      const bodyCustomer = {
        companyId: 3,
        name,
        tradeName: name,
        naturalPerson: {
          cpf
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
      customerId = resultNewCustomer?.id || null;

      if (!customerId) {
        return res.status(500).json(resultNewCustomer);
      }
    }

    // buscar person
    const urlPerson = `https://${subdominio}.conexa.app/index.php/api/v2/persons?cpf=${cpf}`;

    const responsePerson = await fetch(urlPerson, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

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

      const bodyPerson = {
        customerId: Number(customerId),
        name,
        cpf,
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
      personId = resultNewPerson?.id || null;

      if (!personId) {
        return res.status(500).json(resultNewPerson);
      }
    }

    // calcular finalTime (+1h)
    const [hour, minute] = startTime.split(":").map(Number);
    const inicio = new Date();
    inicio.setHours(hour, minute, 0, 0);

    const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
    const finalHour = String(fim.getHours()).padStart(2, "0");
    const finalMinute = String(fim.getMinutes()).padStart(2, "0");
    const finalTime = `${finalHour}:${finalMinute}`;

    if (finalTime <= startTime) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Escolha um horário anterior a 23:00 para reservas de 1 hora."
      });
    }

    // criar reserva
    const urlReserva = `https://${subdominio}.conexa.app/index.php/api/v2/room/booking`;

    const bodyReserva = {
      customerId: Number(customerId),
      personId: Number(personId),
      roomId: Number(roomId),
      date: data,
      startTime,
      finalTime,
      notes: "Reserva via WhatsApp",
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

    if (resultReserva?.id) {
      return res.status(200).json({
        status: "ok",
        mensagem: "Reserva concluída com sucesso.",
        bookingId: resultReserva.id
      });
    }

    return res.status(500).json(resultReserva);
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao criar reserva.",
      detalhe: error.message
    });
  }
}
