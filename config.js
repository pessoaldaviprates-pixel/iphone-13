/* =====================================================================
   CONFIGURAÇÃO DO NEON NEBULA
   Este é o único arquivo que você precisa editar para ligar o modo online.
   ===================================================================== */

window.NN_CONFIG = {

  // Cole aqui o endereço do seu Realtime Database do Firebase, entre as
  // aspas, para ligar o ranking online e os presentes à distância.
  // Exemplo: "https://neon-nebula-default-rtdb.firebaseio.com"
  // Deixando vazio, o jogo funciona 100% offline (nenhuma conexão é feita).
  // O passo a passo para criar o banco está no arquivo NUVEM.md.
  // ATENÇÃO: este endereço foi montado a partir do ID do seu projeto
  // ("realtime-datase"). Confirme no Firebase: menu Criar → Realtime Database,
  // o endereço certo aparece no topo da aba "Dados". Se for diferente do que
  // está aqui (por causa da região escolhida), é só corrigir esta linha.
  NUVEM_URL: "https://realtime-datase-default-rtdb.firebaseio.com"

};
