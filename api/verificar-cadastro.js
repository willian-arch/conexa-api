export default async function handler(req, res) {
  try {
    const token = "1677b69f512ce335777d2e34185ff9231970e30bb709a01876c0c18acd47650b";
    const subdominio = "coworkingvidanova";

    const documento = (req.query.cpf || "").replace(/\D/g, "");

    function validarCPF(cpf) {
      if (!cpf || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

      let soma = 0;
      for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
      let resto = (soma * 10) % 11;
      if (resto === 10) resto = 0;
      if (resto !== parseInt(cpf[9])) return false;

      soma = 0;
      for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
      resto = (soma * 10) % 11;
      if (resto === 10) resto = 0;

      return resto === parseInt(cpf[10]);
    }

    function validarCNPJ(cnpj) {
      if (!cnpj || cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

      const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

      let soma = 0;
      for (let i = 0; i < 12; i++) soma += parseInt(cnpj[i]) * pesos1[i];
      let resto = soma % 11;
      let dig1 = resto < 2 ? 0 : 11 - resto;
      if (dig1 !== parseInt(cnpj[12])) return false;

      soma = 0;
      for (let i = 0; i < 13; i++) soma += parseInt(cnpj[i]) * pesos2[i];
      resto = soma % 11;
      let dig2 = resto < 2 ? 0 : 11 - resto;

      return dig2 === parseInt(cnpj[13]);
    }

    if (!documento) {
      return res.status(200).json({
        status: "documento_invalido",
        mensagem: "⚠️ CPF ou CNPJ não informado.\n\nDigite um documento válido para continuar."
      });
    }

    const documentoValido =
      (documento.length === 11 && validarCPF(documento)) ||
      (documento.length === 14 && validarCNPJ(documento));

    if (!documentoValido) {
      return res.status(200).json({
        status: "documento_invalido",
        mensagem: "⚠️ CPF ou CNPJ inválido.\n\nDigite um documento válido para continuar."
      });
    }

    const parametro = documento.length === 14 ? "cnpj" : "cpf";
    const url = `https://${subdominio}.conexa.app/index.php/api/v2/customers?${parametro}=${documento}`;

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
    personId: customer?.personId || null,
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
