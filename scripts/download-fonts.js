const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Função para baixar e salvar a fonte
async function downloadFont(url, filename) {
  try {
    console.log(`Baixando fonte de ${url}...`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });
    
    const fontPath = path.join(__dirname, '..', 'public', 'fonts', filename);
    
    fs.writeFileSync(fontPath, Buffer.from(response.data));
    console.log(`Fonte salva em ${fontPath}`);
  } catch (error) {
    console.error('Erro ao baixar fonte:', error.message);
  }
}

// Criar pasta de fontes se não existir
const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log(`Diretório criado: ${fontsDir}`);
}

// Baixar a fonte Noto Sans (suporta emojis e caracteres especiais)
const fontUrls = [
  {
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSans/NotoSans-Regular.ttf',
    filename: 'NotoSans-Regular.ttf'
  },
  {
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSans/NotoSans-Bold.ttf',
    filename: 'NotoSans-Bold.ttf'
  },
  {
    url: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/fonts/NotoColorEmoji.ttf',
    filename: 'NotoColorEmoji.ttf'
  }
];

// Baixar todas as fontes
Promise.all(
  fontUrls.map(font => downloadFont(font.url, font.filename))
)
  .then(() => console.log('Todas as fontes foram baixadas com sucesso!'))
  .catch(error => console.error('Erro ao baixar fontes:', error));
