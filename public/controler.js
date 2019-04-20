// APP:        CONTROLER JAVASCRIPT 
// AUTOR:      MAURICIO JUNQUEIRA
// DISCIPLINA: ADSU=I-2017-1
// INICIO:     25-MAI-2017
// VERSAO:     08-JUN-2017 v. 1.0
// NOTAS:      CARREGADO A PARTIR DE INDEX.HTML
//             LOGICA DA ONEPAGE APPLICATION

var TempoTimeout = 3; // tempo para polling em segundos
var Aguarde      = 0; // semaforo envio ajax
var temCache     = 0; // sinaliza cache enviado
var iMotion      = 0; // sinaliza funcionamento polling

// VARIAVEIS DE ESTADO
// INFORMACOES REST PARA CADA UM DOS SERVICOS
var UserID_TLG = "";
var UserPW_TLG = "";
var UserCH_TLG = "";
var UserSV_TLG = "";
var UserID_IRC = "";
var UserPW_IRC = "";
var UserCH_IRC = "";
var UserSV_IRC = "";

var conectadoIRC = 0; // identifica se o servidor já foi configurado irc/tlg
var conectadoTLG = 0;
var timerVar   = 0; // informacao do timer

// FUNÇÃO   getFormValue
//          CAPTURA OS VALOR DE FORMULARIO edtValor
//          PREENCHE AS VARIÁVEIS DE ESTADO
// ENTRADA: NENHUM
// SAIDA    SUCESSO: ARMAZENA COLETA
//          FALHA:   NAO ALTERA VARIÁVEIS DE ESTADO
function getFormValue()
{
    if ($('#Valor').val() == "") return; // BOTAO PRESSIONADO MAS NENHUM VALOR
    
    // IDENTIFICA CANAL SENDO UTILIZADO
    if ($('#Canal' ).val() == "IRC") 
    {
        // VERIFICA SE FOI FORNECIDO UM NICK
        if (UserID_IRC == "") {
            UserID_IRC = $('#Valor').val();
            $('#Valor').val("");
        }
        // VERIFICA SE FOI FORNECIDO UMA SENHA
        else
        if (UserPW_IRC == "") {
            UserPW_IRC = $('#Valor').val();
            $('#Valor').val("");
        }
        // VERIFICA SE FOI FORNECIDO UMA SERVIDOR
        else
        if (UserSV_IRC == "") {
            UserSV_IRC = $('#Valor').val();
            $('#Valor').val("");
        }
        // VERIFICA SE FOI FORNECIDO UMA SALA/CANAL
        else
        if (UserCH_IRC == "") {
            UserCH_IRC = $('#Valor').val();
            $('#Valor').val("");
        }
    }
    else
    {
        // VERIFICA SE FOI FORNECIDO UM NICK
        if (UserID_TLG == "") {
            UserID_TLG = $('#Valor').val();
            $('#Valor').val("");
        }
        // VERIFICA SE FOI FORNECIDO UMA SENHA
        else
        if (UserPW_TLG == "") {
            UserPW_TLG = $('#Valor').val();
            $('#Valor').val("");
        }
        // VERIFICA SE FOI FORNECIDO UMA SERVIDOR
        else
        if (UserSV_TLG == "") {
            UserSV_TLG = $('#Valor').val();
            $('#Valor').val("");
        }
        // VERIFICA SE FOI FORNECIDO UMA SALA/CANAL
        else
        if (UserCH_TLG == "") {
            UserCH_TLG = $('#Valor').val();
            $('#Valor').val("");
        }
    }

    // CONFIGURA O ESTADO QUE INFORMA
    // O TIPO DE DADO DE ESTADO ESTA SENDO COLETADO
    setBtnComando();
    
}


// FUNÇÃO   setBtnComando
//          CONFIGURA FORMULARIO PARA COLETA DAS INFORMAÇÕES DE ESTADO
//          INFORMA AO USUARIO O TIPO DE INFORMAÇÃO ESPERADA NO FORMULARIO
//          APRESENTA CAPTION PARA O INPUT E TROCA TEXTO DO BUTTON
function setBtnComando()
{
    // SELECIONA O SERVICO EM UTILIZACAO
    if ($('#Canal' ).val() == "IRC") 
    {
        // VERIFICA SE FOI FORNECIDO UM USERID
        if (UserID_IRC == "") {
            $('#Comando').html("Set USERID");
            $('#typeInfo').html("Entre com o Usuário IRC..");
        }
        // VERIFICA SE FOI FORNECIDO UMA SENHA
        else if (UserPW_IRC == "") {
            $('#UserIDInfo').html(UserID_IRC);
            $('#Comando'   ).html("Set PASSWORD");
            $('#typeInfo'  ).html("Digite a Senha de Acesso..");
        }
        // VERIFICA SE FOI FORNECIDO UM SERVIDOR
        else if (UserSV_IRC == "") {
            $('#Comando').html("Set IRC SERVER");
            $('#typeInfo').html("Digite o endereço Servidor IRC");
        }
        // VERIFICA SE FOI FORNECIDO UMA SALA
        else if (UserCH_IRC == "") {
            var info = UserID_IRC + '@' + UserSV_IRC;
            $('#UserIDInfo').html(info);
            $('#Comando').html("Set CHANNEL");
            $('#typeInfo').html("Escolha o Canal Desejado");
        }
        else { 
            // CONFIGURA PARA O ENVIO DE MENSAGEM
            // ALTERA CLICK DO BUTTON PARA O ENVIO DE MENSAGEM
            var info = UserID_IRC + '@' + UserSV_IRC + '/' + UserCH_IRC;
            $('#UserIDInfo').html(info);
            $('#Comando'   ).html("Send Message");
            $('#typeInfo'  ).html("Mensagem Canal IRC");
            $('#Comando'   ).off('click').on('click',URI_setMessage);

            // CASO AINDA NAO TENHA SIDO INICIALIZADO
            // ENVIA SOLICITACAO PARA ADICIONAR O USUARIO
            // SINALIZA USUARIO PARA AGUARDAR CONEXAO
            // INICIA PROCESSO DE POLING DE INFORMAÇÕES PARA ATUALIZAÇÃO DO MURAL
            if (! conectadoIRC) {
                $('#Response').html("CONECTANDO SERVIDOR IRC " + UserSV_IRC);
                URI_addUser();
                conectadoIRC = 1;
            }    
        }
    }// IRC
    else
    {
        // VERIFICA SE FOI FORNECIDO UM USERID
        if (UserID_TLG == "") {
            $('#Comando').html("Set USERID");
            $('#typeInfo').html("Entre com o Usuário Telegram..");
        }
        // VERIFICA SE FOI FORNECIDO UMA SENHA
        else if (UserPW_TLG == "") {
            $('#UserIDInfo').html(UserID_TLG);
            $('#Comando'   ).html("Set PASSWORD");
            $('#typeInfo'  ).html("Digite a Senha de Acesso..");
        }
        // VERIFICA SE FOI FORNECIDO UM SERVIDOR
        else if (UserSV_TLG == "") {
            $('#Comando').html("Set TLG SERVER");
            $('#typeInfo').html("Digite o endereço Servidor TLG");
        }
        // VERIFICA SE FOI FORNECIDO UMA SALA
        else if (UserCH_TLG == "") {
            var info = UserID_TLG + '@' + UserSV_TLG;
            $('#UserIDInfo').html(info);
            $('#Comando').html("Set CHANNEL");
            $('#typeInfo').html("Escolha o Canal Desejado");
        }
        else { 
            // CONFIGURA PARA O ENVIO DE MENSAGEM
            // ALTERA CLICK DO BUTTON PARA O ENVIO DE MENSAGEM
            var info = UserID_TLG + '@' + UserSV_TLG + '/' + UserCH_TLG;
            $('#UserIDInfo').html(info);
            $('#Comando'   ).html("Send Message");
            $('#typeInfo'  ).html("Mensagem Canal TLG");
            $('#Comando'   ).off('click').on('click',URI_setMessage);

            // CASO AINDA NAO TENHA SIDO INICIALIZADO
            // ENVIA SOLICITACAO PARA ADICIONAR O USUARIO
            // SINALIZA USUARIO PARA AGUARDAR CONEXAO
            // INICIA PROCESSO DE POLING DE INFORMAÇÕES PARA ATUALIZAÇÃO DO MURAL
            if (! conectadoTLG) {
                $('#Response').html("CONECTANDO SERVIDOR TLG " + UserSV_TLG);
                URI_addUser();
                conectadoTLG = 1;
            }    
        }
    }// TLG
}

// FUNÇÃO   sendREST
//          FUNCAO DE ENVIO DA SOLICITACAO PARA O WEBPROXY
//          DADOS DE ESTADO (REST) SERÃO ENVIADOS AUTOMATICAMENTE
// ENTRADA: ftype TIPO DA SOLICITAÇÃO REST EX. post, put, delete etc
//          furl  NOME DA API REST A SER ACESSADA
//          fdata DADOS A SEREM ENVIADOS
// SAIDA    SUCESSO: ALTERA ESTADO DA PÁGINA EM FUNÇÃO DO JSON ENVIADO
//          FALHA:   ENVIA ALERTA COM A MENSAGEM DE ERRO
function sendREST(ftype,furl,fdata)
{
    // SELECIONA O CANAL
    // ACRESCENTA DADOS DE ESTADO
    fdata.Canal  = $('#Canal' ).val();
    if (fdata.Canal == "IRC") 
    {
        fdata.UserID = UserID_IRC;
        fdata.UserPW = UserPW_IRC;
        fdata.UserCH = UserCH_IRC;
        fdata.UserSV = UserSV_IRC;
    }
    else
    {
        fdata.UserID = UserID_TLG;
        fdata.UserPW = UserPW_TLG;
        fdata.UserCH = UserCH_TLG;
        fdata.UserSV = UserSV_TLG;
    }


    var msgJSON = JSON.stringify(fdata);
    Aguarde = 10;
	$.ajax({
		type: ftype,
		url: furl,
		data: msgJSON,
		success: 
		function(data,status) {
			if (status == "success") {
                texto    = data["RESULT"];
                MuralIRC = data["MURALIRC"];
                MuralTLG = data["MURALTLG"];
                if (texto) { 
                    $('#Response').html(texto);
                    temCache = 1;
                }
                else temCache = 0;

                if (MuralIRC) $('#MuralIRC').prepend('\n' + MuralIRC  );
                if (MuralTLG) $('#MuralTLG').prepend('\n' + MuralTLG  ); 
			}
			else {
				alert("erro:"+status);
                $('#Response').html(status);
			}
            Aguarde = 0;
		},
		contentType: "application/json",
		dataType: "json"
		});


}

// FUNÇÃO   URI_addUser
//          CRIA UM NOVO RECURSO PARA O USUARIO A PARTIR DOS DADOS DE ESTADO
// ENTRADA: NENHUM
// SAIDA    SUCESSO: ALTERA ESTADO DA PÁGINA EM FUNÇÃO DO JSON ENVIADO
//          FALHA:   ENVIA ALERTA COM A MENSAGEM DE ERRO
function URI_addUser()
{
    var msg = {};
    sendREST ('put','addUser',msg);
}

// FUNÇÃO   URI_setMessage
//          ENVIA UMA MSG PARA O CANAL
// ENTRADA: NENHUM
// SAIDA    SUCESSO: ALTERA ESTADO DA PÁGINA EM FUNÇÃO DO JSON ENVIADO
//          FALHA:   ENVIA ALERTA COM A MENSAGEM DE ERRO
function URI_setMessage()
{
    if ($('#Valor').val() == "") return;

    var msg = {"Message":$('#Valor').val()};
    sendREST ('post','setMessage', msg);
    $('#Valor').val("");
}


// FUNÇÃO   URI_getMessage
//          RECEBE MENSAGENS DOS CANAIS
// ENTRADA: NENHUM
// SAIDA    SUCESSO: ALTERA ESTADO DA PÁGINA EM FUNÇÃO DO JSON ENVIADO
//          FALHA:   ENVIA ALERTA COM A MENSAGEM DE ERRO
function URI_getMessage()
{
var motion = ['-','\\','|','/'];

    if (++iMotion > 3) iMotion = 0;

    $('#Motion').html('IRC '+ motion[iMotion]+' TLG');

    // VERIFICA SEMAFORO E DISPONIBILIDADE DOS SERVIÇOS
    if (Aguarde-- > 0 || (!conectadoIRC && !conectadoTLG))
        return;
        
    var msg = {};
    sendREST ('get','getMessage', msg);

    // IDENTIFICA QUANDO O proxyWeb FOI REINICIADO
    var estado = $('#Response').html();
    if ((estado.indexOf("REINICIE APLICACAO") > -1)) clearInterval(timerVar);
}

// FUNCAO EXECUTADA NA CARGA DA APLICACAO
$(document).ready( 
    function()
    {
        // CONFIGURA O CLICK DO BOTAO ID #btnCommando
        $('#Comando').click (function() {getFormValue()});

        // CONFIGURA INFO DE COLETA DE VALORES
        setBtnComando();

        // INICIA POLLING DE MENSAGENS
        timerVar = setInterval (URI_getMessage, TempoTimeout * 1000);
    });
