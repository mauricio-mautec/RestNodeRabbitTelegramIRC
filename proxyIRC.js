var irc  = require('irc');
var amqp = require('amqplib/callback_api');


var users = {}; // Usuários IRC
var amqp_conn;
var amqp_ch;
var irc_client;


// FUNCOES AUXILIARES PARA ENVIO E RECEBIMENTO AMQP
// ENVIA MENSAGEM PARA O CANAL ProxyIRC
function amqp_setMessage (id, msg)
{
	msg = new Buffer(JSON.stringify(msg));

	amqp_ch.assertQueue("ProxyIRC", {durable: true});
	amqp_ch.sendToQueue("ProxyIRC", msg);
	console.log("proxyIRC Sent %s", msg);
}

// proxyIRC É CONSUMIDOR CANAL WebChannel E PRODUTOR CANAL ProxyIRC
// RECEBE MENSAGENS DO CANAL WebChannel
function amqp_getMessage()
{
	amqp_ch.assertQueue ("WebChannel", {durable: true});
    amqp_ch.consume     ("WebChannel",
        function(msg)
        {
          console.log("WebChannel: Received %s", msg.content.toString());
          processaMensagem(JSON.parse(msg.content.toString()));
        }, {noAck: true});

    console.log("proxyIRC: Waiting for messages from WebChannel");
}

// FUNCAO : ANALISA JSON ENVIADO PELO CANAL WebChannel
// ENTRADA: MENSAGEM JSON
//   SAIDA: ENVIO DADOS PARA SERVIDOR IRC E MENSAGENS PARA O CANAL ProxyIRC
function processaMensagem (dadosCliente)
{
    var servico  = dadosCliente.SERVICO;
    var comando  = dadosCliente.COMANDO;
    var userid   = dadosCliente.USERID;
    var nick     = dadosCliente.NICK;
    var passwd   = dadosCliente.PASSWD;
    var canal    = dadosCliente.CANAL;
    var msgWeb   = dadosCliente.MSG;
    var servidor = dadosCliente.SERVIDOR; //"irc.freenode.net";
   

    //1. AVALIA SE A MENSAGEM FOI DIRECIONADA AO PROXYIRC
    if (servico != "IRC") {
        console.log ("SERVICO DIRECIONADO A OUTRO PROXY: " + servico);
        return;
    }

    //2. AVALIA COMANDO ENVIADO

    // NEWUSR
    // CONFIGURAR CLIENTE IRC PARA RECEBER:
    //   MENSAGENS DO CANAL, ERRO E MOTD
    if (comando == "NEWUSR") 
    { 
        console.log ("proxyIRC: NEWUSR SERVIDOR:"+ servidor + " NICK:" + nick + " CANAL:" + canal);

        irc_client    = new irc.Client (servidor, nick, {channels: [canal]});

        irc_client.addListener ('message'+canal,
           function (from, message) {
              var TD = new Date();
              var dInfo = TD.getDate() + ' ' + getHours() + ':' + getMinutes() +
                          ' [' + from + '] => ' + JSON.stringify(message);
              msg = {
                  "USERID"   : userid,
                  "TIMESTAMP": Date.now(),
                  "RESULT"   : "MENSAGEM SERVIDOR IRC",
                  "MURALIRC" : dInfo };

              amqp_setMessage (userid, msg);
              console.log(from + ' => '+ canal +': ' + message);
           });

        irc_client.addListener ('error',
           function (message) {
              console.log('ERRO CANAL IRC: ', JSON.stringify(message));
              msg = {
                "USERID"   : userid,
                "TIMESTAMP": Date.now(),
                "MURALIRC" : "ERRO SERVIDOR IRC: " + JSON.stringify(message) };
              amqp_setMessage (userid, msg);
           });

        irc_client.addListener ('motd',
           function (message) {
              var res = message.replace ("\\n", '\n');

              msg = {
                "USERID"   : userid,
                "TIMESTAMP": Date.now(),
                "RESULT"   : "MENSAGEM SERVIDOR IRC",
                "MURALIRC" : JSON.stringify(res) };
              amqp_setMessage (userid, msg);
           });

        users[userid] = irc_client;

        msg = {
            "USERID"   : userid,
            "TIMESTAMP": Date.now(),
            "RESULT"   : "ACESSO SERVIDOR IRC CONFIGURADO COM SUCESSO!",
            "MURALIRC" : "INICIO TRANSMISSAO SALA [" + canal + "]" };
       amqp_setMessage (userid, msg);
    }
   
    // SETMSG
    // ENVIA MENSAGEM PARA O CANAL IRC
    if (comando == "SETMSG")
    {
        irc_client = users[userid];
		irc_client.say (canal,msgWeb);
        msg = {
            "USERID"   : userid,
            "TIMESTAMP": Date.now(),
            "RESULT"   : "MENSAGEM IRC [" + msgWeb + "] ENVIADA COM SUCESSO!"};
       amqp_setMessage (userid, msg);
	}

    // QUIT
    // FINALIZA CLIENTE IRC E REMOVE USUARIO
    if (comando == "QUIT")
    {
        irc_client = users[userid];
        irc_client.send ("quit");
        irc_client.disconnect();

        msg = {
            "USERID"   : userid,
            "TIMESTAMP": Date.now(),
            "RESULT"   : "MENSAGEM IRC CLIENTE FINALIZADO" };
       amqp_setMessage (userid, msg);
       delete users[userid];
       delete irc_client;
    }
}


// CONEXÃO COM O SERVIDOR AMQP
amqp.connect(
    'amqp://localhost', 
    function(err, conn) {
	    conn.createChannel(
            function(err, ch) {
		        amqp_conn = conn;
		        amqp_ch = ch;
		        amqp_getMessage(); // CONFIGURA CANAL DE RECEPÇÃO DAS MENSAGENS
	        });
    });

