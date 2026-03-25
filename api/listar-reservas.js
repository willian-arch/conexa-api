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

    let reservas = [];
let page = 1;
let totalPages = 1;
const maxPages = 10;

do {
  const url = `https://${subdominio}.conexa.app/index.php/api/v2/room/bookings?size=100&page=${page}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const result = await response.json();

  reservas = reservas.concat(result?.data || []);
  totalPages = result?.pagination?.totalPages || 1;
  page++;
} while (page <= totalPages && page <= maxPages);



    return res.status(200).json({
  status: "debug_total",
  total: reservas.length,
  totalPages,
  paginasBuscadas: Math.min(totalPages, maxPages)
});


    

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    const reservas = result?.data || [];

    

    // pegar só futuras
    const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

const reservasFuturas = reservas.filter((r) => {
  if (!r.startTime) return false;
  if (!r.isActive) return false;
  if (r.status === "cancelled") return false;

  const dataReserva = new Date(r.startTime);
  dataReserva.setHours(0, 0, 0, 0);

  return dataReserva >= hoje;
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
