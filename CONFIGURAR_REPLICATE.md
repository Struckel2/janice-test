# 🚀 Configuração Urgente - Replicate API no Railway

## ⚠️ **Status Atual**
- ✅ Bug corrigido e deploy feito
- ⚠️ Smart-whisper ainda pode falhar (CPU limitado)
- 🎯 **Próximo passo**: Configurar Replicate para resolver definitivamente

## 🔧 **Configuração no Railway (2 minutos)**

### **1. Acessar Railway Dashboard**
1. Ir para: https://railway.app/dashboard
2. Selecionar projeto **Janice**
3. Clicar na aba **Variables**

### **2. Adicionar Variável**
```
Nome: REPLICATE_API_TOKEN
Valor: r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### **3. Deploy Automático**
- Railway fará redeploy automaticamente
- Aguardar ~2-3 minutos

## 🧪 **Teste Imediato**

### **Após configurar, testar:**
1. Fazer upload de um arquivo de áudio
2. Verificar logs Railway para:
   ```
   "Usando Replicate para transcrição..."
   "Transcrição concluída via Replicate"
   ```

## 📊 **Resultados Esperados**

### **Antes (smart-whisper):**
- ⏱️ 45-90 minutos para 90min de áudio
- ❌ Falhas frequentes ("Invalid argument")
- 🐌 CPU-only no Railway

### **Depois (Replicate):**
- ⚡ 3-9 minutos para 90min de áudio
- ✅ GPU acelerado, estável
- 💰 ~$1.08 por reunião de 90min

## 🔍 **Monitoramento**

### **Logs de Sucesso:**
```
=== INICIANDO TRANSCRIÇÃO {id} ===
Usando Replicate para transcrição...
Transcrição concluída via Replicate
Tempo de processamento: {X}s
```

### **Se ainda usar fallback:**
```
REPLICATE_API_TOKEN não configurado, usando smart-whisper como fallback
```

## 🎯 **Impacto Imediato**

### **Performance:**
- **15-30x mais rápido** que smart-whisper
- **Sem falhas** de "Invalid argument"
- **Word timestamps** incluídos

### **Experiência do Usuário:**
- Upload → Resultado em **minutos** (não horas)
- **Arquivos grandes** processados sem problemas
- **Qualidade superior** para português

---

**⚡ Ação Necessária**: Configurar `REPLICATE_API_TOKEN` no Railway agora!
