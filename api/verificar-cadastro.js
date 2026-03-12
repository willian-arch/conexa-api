export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const cpf = (req.query.cpf || "").replace(/\D/g, "");

    if (!cpf) {
      return res.status(400).json({
        status: "erro",
        mensagem: "CPF/CNPJ não informado."
      });
    }

    const url = `https://${subdominio}.conexa.app/index.php/api/v2/customers?cpf=${cpf}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    const customer = data?.data?.[0] || null;
    const customerId = customer?.customerId || null;

    if (customerId) {
      return res.status(200).json({
        status: "cliente_encontrado",
        mensagem: "Cadastro localizado com sucesso.",
        customerId,
        nome: customer?.name || ""
      });
    }

    return res.status(200).json({
      status: "nao_encontrado",
      mensagem: "Cliente não possui cadastro."
    });
  } catch (error) {
    return res.status(500).json({
      status: "erro",
      mensagem: "Erro ao verificar cadastro.",
      detalhe: error.message
    });
  }
}
