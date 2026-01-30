# Sistema de Recuperação de Senha via OTP (One-Time Password)

## Visão Geral

O sistema permite que usuários redefinam suas senhas usando um código OTP (Código de Uso Único) enviado via WhatsApp. A implementação segue as melhores práticas de segurança com expiração configurável do código.

## Fluxo de Recuperação

### 1. **Solicitar OTP** (Cliente → Servidor)
- Usuário acessa `/recover`
- Preenche email e número de WhatsApp (com DDI, ex: 554499999999)
- Clica em "Enviar Código OTP"

**Endpoint**: `POST /api/auth/request-otp`
```json
{
  "email": "usuario@example.com",
  "phone": "554499999999"
}
```

**Resposta**: 
```json
{
  "success": true,
  "expiresIn": 300
}
```

### 2. **Verificar OTP** (Cliente → Servidor)
- Servidor envia código via Z-API WhatsApp
- Usuário recebe código no WhatsApp
- Usuário insere código de 6 dígitos na tela
- Clica em "Verificar"

**Endpoint**: `POST /api/auth/verify-otp`
```json
{
  "phone": "554499999999",
  "otp": "123456"
}
```

**Resposta**:
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

### 3. **Redefinir Senha** (Cliente → Servidor)
- Após OTP validado, usuário entrada nova senha
- Confirma nova senha
- Clica em "Redefinir Senha"

**Endpoint**: `POST /api/auth/reset-password-otp`
```json
{
  "email": "usuario@example.com",
  "phone": "554499999999",
  "newPassword": "newPassword123"
}
```

**Resposta**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Configuração de Ambiente

### Variáveis Obrigatórias

```env
# Z-API WhatsApp Integration
ZAPI_INSTANCE_ID=seu_instance_id
ZAPI_INSTANCE_TOKEN=seu_instance_token
ZAPI_SECURITY_TOKEN=seu_security_token
# OU
ZAPI_INSTANCE_SECRET=seu_secret

# OTP Configuration (Opcional - padrão: 300 segundos)
OTP_EXPIRES_IN=300
```

### Variáveis Usadas no .env

- `ZAPI_INSTANCE_ID`: ID da instância do Z-API
- `ZAPI_INSTANCE_TOKEN`: Token da instância
- `ZAPI_SECURITY_TOKEN` ou `ZAPI_INSTANCE_SECRET`: Token de segurança
- `OTP_EXPIRES_IN`: Tempo de expiração do OTP em segundos (padrão: 300 = 5 minutos)

## Banco de Dados

### Tabela: `otp_codes`

```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) NOT NULL,
  code VARCHAR(6) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);
```

**Campos:**
- `id`: UUID único do registro
- `phone`: Número de telefone em formato DDI+numero
- `code`: Código OTP de 6 dígitos gerado aleatoriamente
- `attempts`: Contador de tentativas de validação falhadas
- `expires_at`: Data/hora de expiração do código
- `created_at`: Quando o código foi gerado
- `used_at`: Quando o código foi validado com sucesso (NULL se não usado)

## Segurança

### Medidas Implementadas

1. **Expiração de Código**: Por padrão, 5 minutos (configurável via `OTP_EXPIRES_IN`)
2. **Limite de Tentativas**: 3 tentativas máximas antes de rejeitar
3. **Formato Validado**: Código deve ser exatamente 6 dígitos
4. **Código Único**: Uso único - marcado como `used_at` após sucesso
5. **Usuário Verificado**: Sistema valida se o email existe antes de enviar
6. **Limpeza Automática**: Códigos antigos (>1 hora) são deletados após reset

### Boas Práticas

- Sempre envie OTP via WhatsApp (canal seguro)
- Nunca exponha o código na URL
- Use HTTPS em produção
- Implemente rate limiting para `/request-otp`
- Considere implementar verificação de múltiplos OTPs por telefone

## Tratamento de Erros

| Erro | Código HTTP | Motivo |
|------|------------|--------|
| `Email and phone are required` | 400 | Campos obrigatórios ausentes |
| `Invalid OTP format` | 400 | OTP não é 6 dígitos ou contém não-números |
| `Invalid or expired OTP` | 401 | Código não existe, expirou ou foi usado |
| `OTP not verified for this phone` | 401 | Tentativa de reset sem OTP validado |
| `Password must be at least 6 characters` | 400 | Senha fraca |
| `User not found` | 404 | Usuário não existe |
| `Failed to send OTP via WhatsApp` | 500 | Erro na integração Z-API |

## Exemplos de Uso

### cURL - Solicitar OTP
```bash
curl -X POST http://localhost:5006/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "phone": "554499999999"
  }'
```

### cURL - Verificar OTP
```bash
curl -X POST http://localhost:5006/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "554499999999",
    "otp": "123456"
  }'
```

### cURL - Redefinir Senha
```bash
curl -X POST http://localhost:5006/api/auth/reset-password-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "phone": "554499999999",
    "newPassword": "newPassword123"
  }'
```

## Frontend - Componente Recover.tsx

O componente implementa o fluxo em 3 passos:

1. **Step: 'request'** → Entrada de email + telefone
2. **Step: 'verify-otp'** → Entrada do código com countdown
3. **Step: 'reset-password'** → Entrada da nova senha

Indicador visual mostra progresso através dos 3 passos com cores:
- Azul: Passo atual
- Verde: Passos concluídos
- Cinza: Passos não iniciados

## Migração Database

Execute a migração para criar a tabela:
```bash
npm run db:migrate
# ou se usar Drizzle
npx drizzle-kit migrate
```

A migração `0025_create_otp_codes.sql` será executada automaticamente no server startup.

## Troubleshooting

### OTP não é recebido via WhatsApp
- Verifique se `ZAPI_INSTANCE_ID`, `ZAPI_INSTANCE_TOKEN` e `ZAPI_SECURITY_TOKEN` estão configurados
- Confirme que o número tem acesso ativo no Z-API
- Verifique logs do servidor para erros Z-API

### Erro "OTP not verified"
- Código pode ter expirado (5 minutos por padrão)
- Verifique se o telefone foi digitado corretamente
- Tente solicitar um novo código

### Senha não é redefinida
- Confirme que o OTP foi verificado (deve estar com `used_at` não-nulo)
- Verifique se o email da conta está correto
- Senha deve ter no mínimo 6 caracteres
