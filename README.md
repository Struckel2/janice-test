# Janice - Assistente de Análise Empresarial

Janice é uma aplicação web para análise de empresas brasileiras através do CNPJ. Ela utiliza inteligência artificial (Claude e Gemini) para coletar, analisar e consolidar informações sobre empresas, seus sócios, mercado, concorrentes e estratégias de crescimento, auxiliando profissionais de marketing na elaboração de estratégias comerciais.

## Funcionalidades

- 🔍 **Análise de CNPJ**: Pesquisa completa sobre empresas brasileiras a partir do CNPJ
- 📊 **Análise de Mercado**: Identificação de setor, concorrentes e tendências
- 💡 **Recomendações Estratégicas**: Sugestões para crescimento e posicionamento
- 📁 **Gerenciamento de Clientes**: Cadastro e gestão de empresas analisadas
- 📄 **Relatórios em PDF**: Exportação de análises em formato PDF
- 📱 **Interface Responsiva**: Funciona em dispositivos móveis e desktop

## Tecnologias Utilizadas

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Banco de Dados**: MongoDB
- **Inteligência Artificial**: Claude (Anthropic) e Gemini (Google)
- **Geração de PDF**: pdf-lib

## Requisitos

- Node.js (v14 ou superior)
- MongoDB (local ou Atlas)
- Chaves de API:
  - Claude API (Anthropic)
  - Gemini API (Google)

## Instalação

1. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/janice.git
   cd janice
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Renomeie o arquivo `.env.example` para `.env`
   - Preencha as variáveis de ambiente com suas credenciais

## Configuração

Edite o arquivo `.env` com suas configurações:

```
# Porta do servidor
PORT=3000

# Configuração do MongoDB
MONGODB_URI=sua-string-de-conexao-mongodb

# Configuração do Claude API (Anthropic)
CLAUDE_API_KEY=sua-chave-api-claude
CLAUDE_API_URL=https://api.anthropic.com/v1/messages

# Configuração do Gemini API (Google)
GEMINI_API_KEY=sua-chave-api-gemini
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
```

## Execução

1. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```

2. Acesse a aplicação:
   ```
   http://localhost:3000
   ```

## Fluxo de Funcionamento

1. O usuário insere um CNPJ na interface
2. O sistema valida o CNPJ e inicia o processo de análise
3. Claude cria um prompt para pesquisa web
4. Gemini realiza a pesquisa web usando o prompt
5. Claude consolida os resultados e cria um relatório completo
6. Um PDF é gerado com a análise
7. Os resultados são exibidos na interface do usuário

## Estrutura de Arquivos

```
janice/
├── public/             # Arquivos estáticos
│   ├── css/            # Estilos CSS
│   ├── js/             # JavaScript do frontend
│   ├── reports/        # PDFs gerados
│   └── index.html      # Página principal
├── server/
│   ├── config/         # Configurações do servidor
│   ├── models/         # Modelos do MongoDB
│   ├── routes/         # Rotas da API
│   ├── services/       # Serviços (Claude, Gemini, etc.)
│   ├── utils/          # Funções utilitárias
│   └── index.js        # Ponto de entrada do servidor
├── .env                # Variáveis de ambiente
├── package.json        # Dependências e scripts
└── README.md           # Documentação
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT.
