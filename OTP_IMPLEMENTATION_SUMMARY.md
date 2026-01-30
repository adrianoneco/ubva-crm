# Resumo: Sistema de Recuperação de Senha via OTP WhatsApp

## ✅ Implementação Concluída

### Frontend (Cliente)
- **Arquivo**: [client/pages/Recover.tsx](client/pages/Recover.tsx)
- **Mudanças Principais**:
  - ✅ Reescrita completa com 3 steps: `request` → `verify-otp` → `reset-password`
  - ✅ Integração com [AuthLayout.tsx](client/components/AuthLayout.tsx) para UI consistente
  - ✅ Indicador visual de progresso com cores (Azul→Verde)
  - ✅ Countdown timer de expiração do OTP
  - ✅ Validação de telefone com DDI (ex: 554499999999)
  - ✅ Validação de código OTP (exatamente 6 dígitos)
  - ✅ Validação de força de senha (mínimo 6 caracteres)
  - ✅ Limite de 3 tentativas de OTP inválido
  - ✅ Suporte completo a dark mode

### Backend (Servidor)
- **Arquivo**: [server/routes/auth.ts](server/routes/auth.ts)
- **Endpoints Criados**:

#### 1️⃣ `POST /api/auth/request-otp`
```typescript
// Solicita envio de OTP via WhatsApp
Request: { email: string, phone: string }
Response: { success: true, expiresIn: number }
```
- Valida existência do usuário
- Gera código OTP de 6 dígitos
- Armazena em banco com expiração configurável
- Envia via Z-API WhatsApp
- Retorna tempo de expiração em segundos

#### 2️⃣ `POST /api/auth/verify-otp`
```typescript
// Verifica autenticidade do código OTP
Request: { phone: string, otp: string }
Response: { success: true, message: string }
```
- Valida formato (exatamente 6 dígitos)
- Busca código não-expirado e não-usado
- Limita tentativas falhadas
- Marca OTP como usado após sucesso

#### 3️⃣ `POST /api/auth/reset-password-otp`
```typescript
// Reseta senha após OTP verificado
Request: { email: string, phone: string, newPassword: string }
Response: { success: true, message: string }
```
- Valida se OTP foi verificado
- Verifica existência do usuário
- Hash da senha com bcrypt
- Limpa OTPs antigos (>1 hora)

### Database
- **Arquivo**: [data/migrations/0025_create_otp_codes.sql](data/migrations/0025_create_otp_codes.sql)
- **Tabela**: `otp_codes`
  - `id`: UUID único
  - `phone`: Telefone com DDI
  - `code`: Código de 6 dígitos
  - `attempts`: Contador de tentativas
  - `expires_at`: Data/hora de expiração
  - `created_at`: Timestamp de criação
  - `used_at`: Timestamp de uso (NULL até usar)
  - Índices em `phone` e `expires_at`

- **Schema TypeScript**: [server/db/schema.ts](server/db/schema.ts)
  - Tabela `otpCodes` exportada para uso com Drizzle ORM

### Configuração
- **Arquivo**: [.env.example](.env.example)
- **Variáveis Novas**:
  ```env
  OTP_EXPIRES_IN=300          # Segundos (default: 5 min)
  ZAPI_INSTANCE_ID=...       # Já existente
  ZAPI_INSTANCE_TOKEN=...     # Já existente
  ZAPI_SECURITY_TOKEN=...     # Ou ZAPI_INSTANCE_SECRET
  ```

### Documentação
- **Arquivo**: [OTP_RECOVERY.md](OTP_RECOVERY.md)
  - Fluxo completo com diagrama textual
  - Exemplos cURL para cada endpoint
  - Tratamento de erros
  - Troubleshooting
  - Medidas de segurança

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React)                           │
│  Recover.tsx com 3 etapas usando AuthLayout                │
├─────────────────────────────────────────────────────────────┤
│  Step 1: request                                            │
│  1. Email + Telefone com DDI                               │
│  2. POST /api/auth/request-otp                             │
│  3. Recebe expiresIn para countdown                        │
├─────────────────────────────────────────────────────────────┤
│  Step 2: verify-otp                                        │
│  1. Recebe OTP via WhatsApp (Z-API)                        │
│  2. Digita código (6 dígitos, auto-focused)                │
│  3. POST /api/auth/verify-otp                             │
│  4. Validação + countdown em tempo real                   │
├─────────────────────────────────────────────────────────────┤
│  Step 3: reset-password                                    │
│  1. Nova senha + confirmação                              │
│  2. POST /api/auth/reset-password-otp                    │
│  3. Redirect para /login após sucesso                     │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│                  SERVER (Express.js)                         │
│  auth.ts com 3 endpoints OTP                               │
├─────────────────────────────────────────────────────────────┤
│  POST /request-otp                                         │
│  ✓ Valida usuário                                         │
│  ✓ Gera código (Math.random() 6 dígitos)                  │
│  ✓ Armazena em DB com TTL                                │
│  ✓ Envia via Z-API WhatsApp                              │
├─────────────────────────────────────────────────────────────┤
│  POST /verify-otp                                         │
│  ✓ Busca código não-expirado + não-usado                 │
│  ✓ Incrementa tentativas em falha                        │
│  ✓ Marca como usado (used_at = NOW())                   │
├─────────────────────────────────────────────────────────────┤
│  POST /reset-password-otp                                 │
│  ✓ Valida OTP foi verificado                            │
│  ✓ Hash nova senha (bcrypt)                            │
│  ✓ Update users.password                               │
│  ✓ Cleanup OTPs antigos                                │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                      │
│  otp_codes table com índices                               │
├─────────────────────────────────────────────────────────────┤
│  Migração: 0025_create_otp_codes.sql                      │
│  Schema: otpCodes table (Drizzle)                         │
│  Índices: phone, expires_at                              │
│  TTL: 5 minutos (configurável OTP_EXPIRES_IN)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Segurança Implementada

| Medida | Implementação | Detalhes |
|--------|---------------|----------|
| **Código Aleatório** | `Math.random()` 6 dígitos | 1 em 1 milhão de chance |
| **TTL/Expiração** | Configurável via env | Padrão: 300 segundos (5 min) |
| **Uso Único** | Campo `used_at` | Impossível reusar mesmo código |
| **Limite de Tentativas** | 3 tentativas máximas | Auto-rejection após limite |
| **Verificação de Usuário** | Busca por email | Impede OTP para emails inexistentes |
| **Força de Senha** | Mínimo 6 caracteres | Configurável no backend |
| **Cleanup Automático** | 1 hora após criação | Evita acúmulo no banco |
| **WhatsApp Seguro** | Z-API encriptado | Canal oficial WhatsApp |
| **Rate Limiting** | Recomendado no reverse proxy | Não implementado no backend |

---

## 📋 Fluxo de Segurança

```
1. Usuario solicita OTP
   ↓
2. Gera código único + armazena com TTL
   ↓
3. Envia via WhatsApp (usuário recebe)
   ↓
4. Usuario insere código
   ↓
5. Valida:
   - Existe na DB?
   - Não expirou?
   - Não foi usado?
   - Menos de 3 tentativas?
   ↓
6. Se válido: marca como USADO
   ↓
7. Permite reset de senha
   ↓
8. Limpa OTPs antigos
```

---

## 🧪 Testes Manuais

### 1. Solicitar OTP
```bash
curl -X POST http://localhost:5006/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "phone": "554499999999"
  }'
```

### 2. Verificar OTP (aguarde WhatsApp)
```bash
curl -X POST http://localhost:5006/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "554499999999",
    "otp": "XXXXX"  # Insira código recebido
  }'
```

### 3. Redefinir Senha
```bash
curl -X POST http://localhost:5006/api/auth/reset-password-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "phone": "554499999999",
    "newPassword": "newPassword123"
  }'
```

---

## 📊 Compatibilidade

- ✅ TypeScript (compilação limpa, sem erros)
- ✅ Drizzle ORM (select, insert, update, delete)
- ✅ PostgreSQL 12+ (INTERVAL, UUID, timezone)
- ✅ Express.js 4+
- ✅ React 18+
- ✅ Mobile responsivo (0.7x zoom para PWA)
- ✅ Dark mode completo

---

## 🚀 Deploy Checklist

- [ ] Configurar `OTP_EXPIRES_IN` no .env de produção
- [ ] Validar credenciais Z-API (ZAPI_INSTANCE_ID, TOKEN, SECRET)
- [ ] Rodar migração 0025: `npm run migrate`
- [ ] Testar envio de OTP via WhatsApp
- [ ] Implementar rate limiting em `/request-otp`
- [ ] Adicionar logging para auditoria
- [ ] Testar em HTTPS (obrigatório para PWA)
- [ ] Backup automático da tabela otp_codes

---

## 📝 Próximos Passos (Opcional)

1. **Rate Limiting**: Limitar a 1 OTP por telefone a cada X segundos
2. **Logging de Auditoria**: Registrar todas as tentativas de OTP
3. **Email de Notificação**: Alertar usuário sobre reset de senha
4. **Admin Dashboard**: Visualizar estadísticas de OTP
5. **TOTP/2FA**: Adicionar autenticação de 2 fatores
6. **Backup Codes**: Códigos de backup para recuperação sem telefone

---

## 📞 Suporte Z-API

**Endpoint WhatsApp OTP**:
```
POST https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/send-button-otp

Headers:
- client-token: {SECURITY_TOKEN}
- content-type: application/json

Body:
{
  "phone": "554499999999",
  "message": "Seu código de verificação UBVA CRM é: 123456",
  "code": "123456"
}
```

---

## 🎨 UI/UX Melhorias

- ✅ Indicador de progresso (3 steps)
- ✅ Countdown timer com cores
- ✅ Validação em tempo real
- ✅ Feedback de erro em vermelho
- ✅ Feedback de sucesso em verde
- ✅ Loading spinner durante requisições
- ✅ Responsivo em todos os tamanhos
- ✅ Acessibilidade (labels, placeholders)
- ✅ Dark mode com contraste adequado

---

## 📞 Contato para Dúvidas

Para informações sobre implementação de OTP, consulte:
- [OTP_RECOVERY.md](OTP_RECOVERY.md) - Documentação técnica completa
- [client/pages/Recover.tsx](client/pages/Recover.tsx) - Implementação frontend
- [server/routes/auth.ts](server/routes/auth.ts) - Implementação backend
