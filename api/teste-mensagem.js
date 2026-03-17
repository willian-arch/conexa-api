export default function handler(req, res) {
  return res.status(200).json({
    status: "ok",
    mensagem: "09:00, 10:00, 11:00"
  });
}
