export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const customerId = req.query.customerId;

    if (!customerId) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetro obrigatório: customerId"
      });
    }

    
   const hojeBusca = new Date();
hojeBusca.setHours(0, 0, 0, 0);

const dataInicial = hojeBusca.toISOString().split("T")[0];
const dataFinalObj = new Date(hojeBusca);
dataFinalObj.setDate(dataFinalObj.getDate() + 20);
const dataFinal = dataFinalObj.toISOString().split("T")[0];

const bookingDateTimeFrom = `${dataInicial}T00:00:00-03:00`;
const bookingDateTimeTo = `${dataFinal}T23:59:59-03:00`;

let reservas = [];

// 🔥 PAGE 1 (rápido)
const urlPage1 = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&limit=100&offset=0`;

const response1 = await fetch(urlPage1, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  }
});

const result1 = await response1.json();
const hasNextPage1 = result1?.pagination?.hasNext === true;
reservas = result1?.data || [];

// 🔥 filtra já aqui
let reservasCliente = reservas.filter(r =>
  String(r.customerId) === String(customerId)
);

// 🔥 só busca página 2 se precisar
if (reservasCliente.length === 0 && hasNextPage1) {
  const urlPage2 = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&limit=100&offset=100`;

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
}
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const reservasFuturas = reservasCliente.filter((r) => {
  if (!r.startTime) return false;
  if (!r.isActive) return false;
  if (r.status === "cancelled") return false;

  const dataReserva = new Date(r.startTime);
  dataReserva.setHours(0, 0, 0, 0);

  return dataReserva >= hoje && String(r.customerId) === String(customerId);
});

    
    if (reservasFuturas.length === 0) {
      return res.status(200).json({
        status: "sem_reservas",
        mensagem: "Você não possui reservas futuras."
      });
    }

    const lista = reservasFuturas.map((r, i) => {
      const dataBr = (() => {
  const [ano, mes, dia] = r.startTime.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
})();
      const hora = r.startTime.split("T")[1].slice(0, 5);
      const sala = r.place?.name || "Sala";

      return `#${i + 1} | ${sala}\n📅 ${dataBr}\n⏰ ${hora}`;
    });

    return res.status(200).json({
      status: "ok",
      reservas: reservasFuturas,
      mensagem: lista.join("\n")
    });

  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao buscar reservas.",
      detalhe: error.message
    });
  }
}
