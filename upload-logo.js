const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function uploadLogo() {
  try {
    console.log('🔄 Fazendo upload do logo da Janice para o Cloudinary...');
    
    // URL da imagem que você enviou (vou usar uma URL temporária)
    // Você pode salvar a imagem localmente e usar o caminho local aqui
    const logoUrl = 'https://i.imgur.com/placeholder.png'; // Substitua pela URL real da imagem
    
    const result = await cloudinary.uploader.upload(logoUrl, {
      public_id: 'janice-logo_hkr10i',
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });
    
    console.log('✅ Upload concluído com sucesso!');
    console.log('📍 URL do logo:', result.secure_url);
    console.log('🎯 URLs otimizadas:');
    console.log('   Desktop (300x120):', `${result.secure_url.replace('/upload/', '/upload/w_300,h_120,c_fit/')}`);
    console.log('   Mobile (200x80):', `${result.secure_url.replace('/upload/', '/upload/w_200,h_80,c_fit/')}`);
    console.log('   Favicon (64x64):', `${result.secure_url.replace('/upload/', '/upload/w_64,h_64,c_fill/')}`);
    
    return result.secure_url;
    
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  uploadLogo()
    .then(url => {
      console.log('\n🎉 Logo da Janice carregado com sucesso!');
      console.log('📋 Próximo passo: Atualizar os arquivos HTML com a URL:', url);
    })
    .catch(error => {
      console.error('\n💥 Falha no upload:', error.message);
      process.exit(1);
    });
}

module.exports = { uploadLogo };
