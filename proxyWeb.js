// APP:        PROXY META-CHAT WEB/AMQP
// AUTOR:      MAURICIO JUNQUEIRA
// DISCIPLINA: ADSI-2017-1
// INICIO:     25-MAIO-2017
// VERSAO      08-JUN-2017 v. 1
var express      = require('express');        // módulo express
var app          = express();                 // objeto express
var bodyParser   = require('body-parser');    // processa corpo de requests
var cookieParser = require('cookie-parser');  // processa cookies
var path         = require('path'); // módulo usado para lidar com caminhos de arquivos
var amqp         = require('amqplib/callback_api');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true } ));
app.use(cookieParser());
app.use(express.static('public'));

var ProxyID_gen = 0;    // Gerador de ID
var users       = {};   // Usuários
var amqp_cnx;
var amqp_chn;

// CONEXAO SERVIDOR AMQP
amqp.connect ('amqp://localhost',
        function (err, cnx)
        {
            // criação dos canais de comunicação
            cnx.createChannel (
                function (err, channel)
                {
                    amqp_cnx = cnx;
                    amqp_chn = channel;
                });

        });        

// SET MSG TO PROXY
function amqp_setMessage (msg)
{
    msg = new Buffer (JSON.stringify(msg));

    amqp_chn.assertQueue ("WebChannel", {durable: true});
    amqp_chn.sendToQueue ("WebChannel", msg);
    //console.log ("AMQP: Sent %s", msg);
}

// GET MSG FROM PROXY
function amqp_getMessage (callback) 
{
    amqp_chn.assertQueue ("ProxyIRC", {durable: true});
    amqp_chn.assertQueue ("ProxyTLG", {durable: true});

    amqp_chn.consume     ("ProxyIRC", 
        function (msg)
        {
            callback (JSON.parse(msg.content.toString()));
            console.log ("AMQP IRC: Get %s", msg.content.toString());
        }, {noAck:true});

    amqp_chn.consume     ("ProxyTLG", 
        function (msg)
        {
            callback (JSON.parse(msg.content.toString()));
            console.log ("AMQP TLG: Get %s", msg.content.toString());
        }, {noAck:true});
}

// URI    : /
// TIPO   : GET
// FUNCAO : ENVIA index.html ONEPAGE APPLICATION
// ENTRADA: NENHUMA
// SAIDA  : HTML => index.html
app.get('/', function (req, res)
{
    res.sendFile(path.join(__dirname, '/index.html'));
    console.log ('URI:/: ENVIANDO ONEPAGE APLICATION');
});

// URI    : /addUser
// TIPO   : PUT
// FUNCAO : RECEBE DADOS PARA A CRIAÇÃO DE UM RESOURCE - CADASTRO DE UM NOVO CLIENTE 
// ENTRADA: UserID, UserPW, UserCH
// SAIDA  : JSON => RESULT
app.put('/addUser', function (req, res)
{ 
    var msg = {};

    console.log ('URI:/addUser: DADOS DE CONEXAO DO CLIENTE');
    res.append  ('Content-type', 'application/json');

    // VERIFICA DADOS DE ESTADO (REST) INCOMPLETOS E INFORMA
    if (!req.body.UserID || !req.body.UserPW || !req.body.UserCH || !req.body.UserSV)
    {
        msg = { "RESULT":"INFORMAÇÕES INCOMPLETAS" };

        var msgJSON = JSON.stringify(msg);
        res.send (msgJSON);
        res.end;

        console.log (req.body);
        console.log (msgJSON);
        console.log ('INFORMAÇÕES INCOMPLETAS');
        return;
    }

    // SE DADOS DE ESTADO COMPLETOS GERA ID DO USUARIO
    // INICIALIZA AREA DE CACHE PARA O USUARIO
    // ENVIA MSG PARA CONEXAO DE IRC E TELEGRAM
    ProxyID_gen++;
    res.cookie  ('ProxyID', ProxyID_gen);
    console.log ("URI:/addUser: MSG CACHED TO USER: %d", ProxyID_gen);

    // CRIA CACHE DE MSG
    users[ProxyID_gen] =
    { cache: [ {
            "TIMESTAMP": Date.now(),
            "RESULT":"USUARIO " + req.body.UserID + " CADASTRADO COM ProxyID:" + ProxyID_gen,
            "MURALIRC":"... aguardando configuração",
            "MURALTLG":"... aguardando configuração"
            }]
    };

    if (req.body.Canal == "IRC") { 
        console.log ("URI:/addUser: SOLICITA CONEXAO SERVICO IRC");

        msg = {
            "SERVICO" : "IRC",
            "COMANDO" : "NEWUSR",
            "USERID"  : ProxyID_gen,
            "SERVIDOR": req.body.UserSV, 
            "NICK"    : req.body.UserID,
            "PASSWD"  : req.body.UserPW,
            "CANAL"   : req.body.UserCH };
        amqp_setMessage (msg);
    }

    if (req.body.Canal == "TLG") {
        console.log ("URI:/addUser: SOLICITA CONEXAO SERVICO TLG");

        msg = {
            "SERVICO" : "TLG",
            "COMANDO" : "NEWUSR",
            "USERID"  : ProxyID_gen,
            "SERVIDOR": req.body.UserSV, 
            "NICK"    : req.body.UserID,
            "PASSWD"  : req.body.UserPW,
            "CANAL"   : req.body.UserCH };
        amqp_setMessage (msg);
    }    

    // CONFIGURA CANAL DE RECEPÇÃO DAS MENSAGENS
    amqp_getMessage (
        function (msg)
        {
            console.log("amqp_getMessage:");
            var proxyID = msg.USERID;
            //verifica existencia de user
            if (proxyID in users)
            {
                users[proxyID].cache.push (msg);
                console.log("MSG CACHE USER " + proxyID);
            }
            else
                console.log("MSG CACHE USER " + proxyID + " NAO ENCONTRADO");
        });

    msg = { "RESULT":"CONEXÃO SOLICITADA AOS SERVIDORES" };
    var msgJSON = JSON.stringify(msg);
    res.send   (msgJSON);
    res.end;
});

// URI    : /getMessage
// TIPO   : GET
// FUNCAO : RECEBE DADOS DO CACHE PARA ATUALIZAÇÃO DOS MURAIS
// ENTRADA: UserID, UserPW, UserCH
// SAIDA  : JSON => RESULT
app.get('/getMessage', function (req, res)
{
    var id  = req.cookies.ProxyID;
    var msg;
    
    //verifica existencia de user
    if (! (id in users)) {
        msg = {};
        msg.RESULT = "USUARIO NAO CADASTRADO! REINICIE APLICACAO";

        var msgJSON = JSON.stringify(msg);
        res.send (msgJSON);
        res.end;
        return;
    }

    msg = users[id].cache.shift();

    if (msg)
        msg.RESULT = "DADOS CACHE ENVIADOS";
    else {
        msg        = {};
    }

    res.append('Content-type', 'application/json');
    
    var msgJSON = JSON.stringify(msg);
    res.send (msgJSON);
    res.end;
   
});

// URI    : /setMessage
// TIPO   : POST
// FUNCAO : ENVIA MENSAGEM PARA UM CANAL IRC OU TELEGRAM
// ENTRADA: Message, Canal
// SAIDA  : JSON => RESULT
app.post('/setMessage', function (req, res)
{
    res.append('Content-type', 'application/json');
    var msg = {}; 

    msg.TIMESTAMP = Date.now();
  
    if (req.body.Canal == "IRC") {
        msg  = { "RESULT"  :"MENSAGEM ENVIADA CANAL IRC",
                 "MURALIRC": req.body.Message }; 
    };

    if (req.body.CANAL == "TLG") {
        msg  = { "RESULT":"MENSAGEM ENVIADA CANAL TELEGRAM" }; 
    };

    var msgJSON = JSON.stringify(msg);
    res.send (msgJSON);
    res.end;

    // ENVIA MSG
    msg = {
        "SERVICO": req.body.Canal,
        "COMANDO": "SETMSG",
        "USERID" : req.cookies.ProxyID,
        "NICK"   : req.body.UserID,
        "PASSWD" : req.body.UserPW,
        "CANAL"  : req.body.UserCH,
        "MSG"    : req.body.Message };

    amqp_setMessage (msg);

    console.log(msg);
    console.log ('MENSAGEM PARA AMQP IRC/TELEGRAM');
});


app.listen(3000, function () {              
  console.log('Proxy Web listening on Channel 3000');   
});
