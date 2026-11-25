# Alba Labs

Sistema web para solicitar e organizar reservas de laboratórios acadêmicos.

## Andamento do projeto

O MVP está em desenvolvimento e publicado no Azure App Service, conectado ao Azure Database for MySQL. A entrega está prevista para **25/11/2026**.

### Funcionalidades implementadas

- Login por e-mail e senha, com senhas armazenadas em hash.
- Páginas internas protegidas por sessão.
- Perfis de professor, técnico, coordenador e administrador, com permissões diferentes.
- Criação de solicitações por todos os perfis, com seleção de professor responsável, curso, turma, matéria, período, data e quantidade de laboratórios.
- Verificação de disponibilidade e prevenção de conflito de reserva para o mesmo laboratório, data e período.
- Calendário com detalhes das aulas e quantidade de laboratórios agrupada.
- Gestão de aulas, incluindo aprovação e cancelamento de solicitações.
- Cancelamento com motivo obrigatório e registro do usuário e horário.
- Gestão de usuários conforme o perfil, alteração da própria senha e redefinição de senha por coordenador.
- Anexos associados às solicitações.
- Interface responsiva para telas menores.

### Pendências para a entrega

- Fazer uma rodada manual de ponta a ponta com contas dos diferentes perfis.
- Conferir criação, edição, aprovação e cancelamento de solicitações, incluindo o histórico do motivo.
- Conferir login, alteração de senha e redefinição com senha provisória.
- Revisar a visualização em celular e os dados no Azure.
- Fazer backup do banco antes da apresentação.

## Tecnologias

- PHP e PDO para a API e as páginas protegidas.
- MySQL para usuários, solicitações, laboratórios, reservas e histórico de cancelamentos.
- JavaScript (módulos ES) e CSS para a interface.
- Azure App Service e Azure Database for MySQL em produção.

## Executar localmente

Requisitos: PHP com `pdo_mysql` e um servidor MySQL.

1. Inicie o MySQL local.
2. Crie o banco e as tabelas usando [`database/schema.sql`](database/schema.sql). Se o banco já existir, não execute novamente sem verificar os dados que serão criados.
3. Configure a conexão local por variáveis de ambiente, se necessário:

   - `DB_HOST` (padrão local: `127.0.0.1`)
   - `DB_PORT` (padrão: `3306`)
   - `DB_NAME` (padrão: `albalabs_db`)
   - `DB_USER` (padrão local: `root`)
   - `DB_PASSWORD` (padrão local: vazio)

4. Na pasta do projeto, inicie o servidor PHP:

   ```powershell
   php -S localhost:8000 -t public_html
   ```

5. Abra `http://localhost:8000/login.html`.

No Azure, as mesmas variáveis são configuradas em **App Service → Configurações → Variáveis de ambiente**. Os valores secretos, especialmente `DB_PASSWORD`, não devem ser colocados neste README ou no código-fonte.

## Estrutura principal

```text
database/
  schema.sql                  Esquema inicial do banco
public_html/
  api/                        Endpoints PHP e autenticação
  css/                        Estilos
  js/
    controllers/              Fluxos da aplicação
    models/                   Acesso e regras de dados no cliente
    views/                    Interface do calendário e reservas
  index.php                   Calendário protegido por sessão
  aulas.php                   Gestão de aulas protegida por sessão
  gerenciar.php               Gestão de usuários e senha
  login.html                  Tela de login
```

## Observações

- O banco guarda hashes de senha; não é possível recuperar a senha original a partir deles.
- Para senha esquecida, um coordenador pode gerar uma senha provisória pelo gerenciamento de usuários.
- A publicação no Azure atualiza os arquivos da aplicação; alterações de estrutura do banco devem ser planejadas e aplicadas separadamente.
