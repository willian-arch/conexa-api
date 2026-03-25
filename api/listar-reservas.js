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
const maxPages = 2;

for (let page = 1; page <= maxPages; page++) {
  const url = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?bookingDateTimeFrom=${encodeURIComponent(bookingDateTimeFrom)}&bookingDateTimeTo=${encodeURIComponent(bookingDateTimeTo)}&size=100&page=${page}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const result = await response.json();
  reservas = reservas.concat(result?.data || []);
}
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const reservasFuturas = reservas.filter((r) => {
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
      const data = r.startTime.split("T")[0];
      const hora = r.startTime.split("T")[1].slice(0, 5);
      const sala = r.place?.name || "Sala";

      return `${i + 1} - ${sala} | ${data} às ${hora}`;
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
