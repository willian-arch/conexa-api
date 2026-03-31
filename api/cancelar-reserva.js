export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const bookingId = req.query.bookingId;

    if (!bookingId) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Parâmetro obrigatório: bookingId."
      });
    }

    const url = `https://${subdominio}.conexa.app/index.php/api/v2/room/booking/${bookingId}/cancel`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
  const result = await response.json();

  return res.status(200).json({
    status: "erro_cancelamento",
    mensagem: result?.message || "Não foi possível cancelar a reserva."
  });
}

return res.status(200).json({
  status: "ok",
  mensagem: "✅ Sua reserva foi cancelada com sucesso."
});
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao cancelar reserva.",
      detalhe: error.message
    });
  }
}
