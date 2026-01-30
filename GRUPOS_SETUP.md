# Grupos e Permissões - Inicialização Automática

## ✅ Implementações Realizadas

### 1. **Migração de Banco de Dados** (`migrations/0024_create_permissions_and_groups.sql`)
- ✅ Tabela `groups` - Definição de grupos
- ✅ Tabela `permissions` - Catálogo de permissões (20+ padrões)
- ✅ Tabela `group_permissions` - Associação grupos ↔ permissões
- ✅ Tabela `user_groups` - Associação usuários ↔ grupos
- ✅ Tabela `user_permission_overrides` - Exceções individuais de usuários
- ✅ Indexes para otimização de performance

### 2. **Inicialização Automática de Grupos** (`server/utils/permissions.ts`)
- ✅ Função `ensureDefaultGroups()` que cria 3 grupos padrão:
  1. **Administrador** - Acesso total ao sistema (todas as permissões)
  2. **Gerente** - Acesso a recursos de gerenciamento (visualizar, criar, editar)
  3. **Usuario** - Acesso básico (apenas visualizar e criar)

### 3. **Runner de Migrações** (`server/utils/migrate.ts`)
- ✅ Executa migrações SQL automaticamente no startup
- ✅ Rastreia migrações já executadas em `drizzle_migrations`
- ✅ Previne duplicação de migrações

### 4. **Inicialização no Startup do Servidor** (`server/index.ts`)
- ✅ Função `initializeDatabase()` que:
  1. Executa todas as migrações pendentes
  2. Cria permissões padrão se não existirem
  3. Cria grupos padrão se não existirem
- ✅ Chamada ao startup do servidor (bloqueante - aguarda conclusão)
- ✅ Exit code 1 se inicialização falhar

### 5. **Melhorias no Frontend** (`client/pages/Settings.tsx`)
- ✅ Carregamento de permissões ao montar o componente (não apenas ao abrir tab)
- ✅ Fallback visual para modal com permissões em carregamento
- ✅ Message de carregamento enquanto permissões são fetched

## 📊 Estrutura de Grupos Criados

### Administrador
- Todas as 20+ permissões
- Acesso total ao sistema
- Pode gerenciar tudo (usuários, grupos, webhooks, etc)

### Gerente
- **Leads**: visualizar, criar, editar
- **Contatos**: visualizar, criar, editar
- **Agendamentos**: visualizar, criar, editar
- **Campanhas**: visualizar, criar, editar, executar
- **Configurações**: visualizar, gerenciar usuários

### Usuario
- **Leads**: visualizar, criar
- **Contatos**: visualizar, criar
- **Agendamentos**: visualizar, criar
- **Campanhas**: visualizar
- **Configurações**: visualizar

## 🚀 Como Funciona

### Primeira Execução
1. Servidor inicia
2. `initializeDatabase()` é chamada
3. Migrações são executadas (cria tabelas)
4. 20+ permissões padrão são inseridas
5. 3 grupos padrão são criados com permissões atribuídas
6. ✅ Sistema está pronto para uso

### Execuções Subsequentes
1. Servidor inicia
2. `initializeDatabase()` é chamada
3. Migrações já executadas são puladas
4. Permissões já existentes são puladas
5. Grupos já existentes são pulados
6. ✅ Sistema usa dados existentes

## 🧪 Testes Recomendados

### 1. Verificar Permissões Criadas
```bash
# Via psql
SELECT * FROM permissions ORDER BY category;
# Esperado: 20+ permissões em 5 categorias (Leads, Contatos, Agendamentos, Campanhas, Configurações)
```

### 2. Verificar Grupos Criados
```bash
# Via psql
SELECT * FROM groups;
# Esperado: 3 grupos (Administrador, Gerente, Usuario)
```

### 3. Verificar Permissões dos Grupos
```bash
# Via psql
SELECT g.name, p.name, p.category 
FROM groups g
JOIN group_permissions gp ON g.id = gp.group_id
JOIN permissions p ON gp.permission_id = p.id
ORDER BY g.name, p.category;
```

### 4. Testar Modal de Novo Grupo
1. Ir para Configurações > Grupos
2. Clicar "Novo Grupo"
3. Modal deve exibir todas as permissões categorizadas
4. Não deve ficar em branco
5. Pode selecionar/desselecionar permissões

## 📝 Logs Esperados ao Iniciar Servidor

```
🔄 Running database migrations...
  Running migration: 0024_create_permissions_and_groups.sql
✅ Database migrations completed successfully
Created default group: Administrador
Created default group: Gerente
Created default group: Usuario
✅ Database initialization completed
```

## 🔧 Troubleshooting

### Se a modal continuar em branco
1. Verificar console do browser (F12)
2. Verificar aba Network para erro em `/api/permissions/permissions`
3. Verificar logs do servidor para erro em migrações

### Se os grupos não são criados
1. Verificar se permissões foram criadas com sucesso
2. Verificar se há erro no log: `Error ensuring default groups`
3. Verificar banco de dados: `SELECT * FROM permissions;`

### Se as migrações não são aplicadas
1. Verificar se pasta `migrations/` existe
2. Verificar se arquivo 0024 existe
3. Verificar erro no log: `Error running database migrations`
4. Conectar ao banco manualmente e executar SQL

## 🎯 Próximas Melhorias

- [ ] UI para atribuir grupos a usuários
- [ ] Editar permissões dos grupos criados
- [ ] Copiar permissões de um grupo para outro
- [ ] Auditoria de mudanças de permissões
- [ ] Sistema de roles (Admin, Gerente, Usuario)
