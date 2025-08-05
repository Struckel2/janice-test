const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Usuario = require('../models/Usuario');

// Configuração da estratégia Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.BASE_URL + "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Tentativa de login Google:', profile.emails[0].value);
    
    // Verificar se o usuário já existe
    let usuario = await Usuario.findOne({ googleId: profile.id });
    
    if (usuario) {
      // Usuário existe, atualizar último login
      console.log('✅ Usuário existente encontrado:', usuario.email);
      await usuario.updateUltimoLogin();
      return done(null, usuario);
    }
    
    // Verificar se já existe um usuário com o mesmo email (mas sem googleId)
    usuario = await Usuario.findOne({ email: profile.emails[0].value });
    
    if (usuario) {
      // Atualizar usuário existente com googleId
      console.log('🔄 Atualizando usuário existente com Google ID');
      usuario.googleId = profile.id;
      usuario.foto = profile.photos[0]?.value || null;
      await usuario.updateUltimoLogin();
      await usuario.save();
      return done(null, usuario);
    }
    
    // Criar novo usuário
    console.log('🆕 Criando novo usuário:', profile.emails[0].value);
    const novoUsuario = new Usuario({
      googleId: profile.id,
      email: profile.emails[0].value,
      nome: profile.displayName,
      foto: profile.photos[0]?.value || null
    });
    
    await novoUsuario.save();
    console.log('✅ Novo usuário criado:', novoUsuario.email, 'Role:', novoUsuario.role);
    
    return done(null, novoUsuario);
    
  } catch (error) {
    console.error('❌ Erro na autenticação Google:', error);
    return done(error, null);
  }
}));

// Serialização do usuário para a sessão
passport.serializeUser((usuario, done) => {
  console.log('📝 Serializando usuário:', usuario.email);
  done(null, usuario._id);
});

// Deserialização do usuário da sessão
passport.deserializeUser(async (id, done) => {
  try {
    const usuario = await Usuario.findById(id);
    console.log('📖 Deserializando usuário:', usuario?.email || 'não encontrado');
    done(null, usuario);
  } catch (error) {
    console.error('❌ Erro na deserialização:', error);
    done(error, null);
  }
});

module.exports = passport;
