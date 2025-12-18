type Telefones = {
  [key: string]: string | string[];
};

export function extrairTelefones(input: string): Telefones {
  const result: Telefones = {};

  // separa por tipos conhecidos
  const partes = input.split(/\s\/\s/);

  for (const parte of partes) {
    const [tipoRaw, ...rest] = parte.split(":");
    if (!rest.length) continue;

    const tipo = tipoRaw.toLocaleLowerCase().trim();
    const conteudo = rest.join(":").trim();

    // extrai todos os números (considerando dígitos)
    const matches = conteudo.match(/\d+/g);
    if (!matches) continue;

    // junta números em blocos por formato nacional
    const nums: string[] = [];

    let buffer = "";
    for (const token of matches) {
      buffer += token;

      // heurística: números de telefone aqui são >= 8 dígitos
      if (buffer.length >= 8) {
        nums.push(buffer);
        buffer = "";
      }
    }
    if (buffer.length > 0) nums.push(buffer);

    if (!nums.length) continue;

    // Se já existir valor para tipo e não for lista
    if (result[tipo]) {
      const atual = result[tipo];
      if (typeof atual === "string") {
        result[tipo] = [atual, ...nums];
      } else {
        result[tipo] = [...atual, ...nums];
      }
    } else {
      // define como array se tiver mais de 1 número
      result[tipo] = nums.length > 1 ? nums : nums[0];
    }
  }

  return result;
}

// Formatar número de telefone brasileiro: (54) 3522-4853 ou (54) 99822-2298
export function formatarTelefoneBrasileiro(numero: string): string {
  // Remove tudo exceto dígitos
  const digitos = numero.replace(/\D/g, '');
  
  // Se tem 10 dígitos: (XX) XXXX-XXXX
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  
  // Se tem 11 dígitos: (XX) XXXXX-XXXX
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  
  // Se tem 8 ou 9 dígitos (sem DDD)
  if (digitos.length === 8) {
    return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
  }
  
  if (digitos.length === 9) {
    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  }
  
  // Retorna como está se não encaixar nos padrões
  return numero;
}

// Formatar telefones para exibição no preview
export function formatarTelefonesParaPreview(telefones: Telefones): string {
  const partes: string[] = [];
  
  for (const [tipo, valor] of Object.entries(telefones)) {
    if (Array.isArray(valor)) {
      const formatados = valor.map(v => formatarTelefoneBrasileiro(v));
      partes.push(`${tipo}: ${formatados.join(', ')}`);
    } else {
      partes.push(`${tipo}: ${formatarTelefoneBrasileiro(valor)}`);
    }
  }
  
  return partes.join(' | ');
}

// Adicionar código do país (55) aos números antes de salvar
export function adicionarCodigoPais(telefones: Telefones): Telefones {
  const result: Telefones = {};
  
  for (const [tipo, valor] of Object.entries(telefones)) {
    if (Array.isArray(valor)) {
      result[tipo] = valor.map(v => {
        const digitos = v.replace(/\D/g, '');
        return digitos.startsWith('55') ? digitos : `55${digitos}`;
      });
    } else {
      const digitos = valor.replace(/\D/g, '');
      result[tipo] = digitos.startsWith('55') ? digitos : `55${digitos}`;
    }
  }
  
  return result;
}

// Converter telefones para JSON string para salvar no banco
export function telefonesParaJSON(telefones: Telefones): string {
  const comCodigoPais = adicionarCodigoPais(telefones);
  return JSON.stringify(comCodigoPais);
}