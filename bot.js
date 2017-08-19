/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
var env = require('node-env-file');
env(__dirname + '/vars.env');

if (!process.env.PORT) {
    console.log('Error: Specify studio_token and PORT in environment');
    usage_tip();
    process.exit(1);
}

var Botkit = require('botkit');
var debug = require('debug')('botkit:main');

// Api.ai for BotKit
const apiaibotkit = require('api-ai-botkit');
const apiaiToken = process.env.token;
const apiai = apiaibotkit(apiaiToken);
// -----------------------------------

// ----------- Mongoose ----------- //
var mongoose = require('./node_modules/mongoose');
const mongo_uri = 'mongodb://localhost/SemanaSanta';
mongoose.connect(mongo_uri, function(error) {
    if (error) {
        throw error;
    } else {
        let conx = 'Conectado a MongoDB -> ' + mongo_uri;
        console.log(conx);
    }
});

const herm_Schema = new mongoose.Schema({
    nombre: String,
    nombreOrigin: String,
    dia: String,
    salida: String,
    itinerario: Array
});

const db_herm = mongoose.model('hermandades', herm_Schema);

var info_hermandades;

// Muestra todo el contenido de la base de datos
db_herm.find({}, function(err, hermandades) {
    if (err) {
        throw err;
    } else {
        // console.log(hermandades);
        info_hermandades = hermandades; // Nos exportamos toda la base de datos
    }
});

// Score mínimo para estar seguros de que el mensaje es fiable
const SCORE_OK = 0.9;

// Busca si la hermandad está en la BDD
//      nombre: Hermandad a buscar
function encontrarHerm(nombre) {
    let esta = false;
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            esta = true;
        }
    }
    return esta;
}

// Devuelve el día que sale una determinada hermandad
//      nombre: Nombre de la Hermandad que queremos saber su día
function buscarDiaProc(nombre) {
    let dia = "";
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            dia = info_hermandades[i].dia;
        }
    }
    return dia;
}

// Devuelve la hora a la que sale una determinada hermandad
//      nombre: Nombre de la Hermandad que queremos saber su hora
function encontrarHoraSalida(nombre) {
    let hora = '';
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            hora = info_hermandades[i].salida;
        }
    }
    return hora;
}

// Devuelve las procesiones de un determinado día
//      dia: Dia que queremos saber que hermandades procesionan
function buscaProcesiones(dia) {
    var proc = [];
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].dia == dia) {
            proc.push(info_hermandades[i].nombreOrigin);
        }
    }
    return proc;
}

// Devuelve el recorrido de una determinada hermandad
//      nombre: Nombre de la Hermandad que queremos saber su recorrido
function buscarRecorrido(nombre) {
    var itinerario = [];
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            itinerario = info_hermandades[i].itinerario;
        }
    }
    return itinerario;
}

// Devuelve el nombre formateado de una determinada hermandad
//      nombre: Nombre de la Hermandad que queremos formatear
function parseNombre(nombre) {
    let nom = '';
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            nom = info_hermandades[i].nombreOrigin;
        }
    }
    return nom;
}

// -----------------------------------

var bot_options = {
    studio_token: process.env.studio_token,
    studio_command_uri: process.env.studio_command_uri,
};

// Use a mongo database if specified, otherwise store in a JSON file local to the app.
// Mongo is automatically configured when deploying to Heroku
if (process.env.MONGO_URI) {
    var mongoStorage = require('botkit-storage-mongo')({ mongoUri: process.env.MONGO_URI });
    bot_options.storage = mongoStorage;
} else {
    bot_options.json_file_store = __dirname + '/.data/db/'; // store user data in a simple JSON format
}

// Create the Botkit controller, which controls all instances of the bot.
var controller = Botkit.socketbot(bot_options);

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require(__dirname + '/components/express_webserver.js')(controller);

// Open the web socket server
controller.openSocketServer(controller.httpserver);

// Start the bot brain in motion!!
controller.startTicking();

controller.hears('.*', ['message_received'], function(bot, message) {
    apiai.process(message, bot);
});

controller.on('reaction_added', function(bot, message) {
    console.log(message);
});

apiai.all(function(message, resp, bot) {
    console.log(message);
    console.log(resp);
    console.log("Accion: " + resp.result.action);
    console.log("---------CONTEXTOS---------");
    if (resp.result.contexts) {
        for (var i = 0; i < resp.result.contexts.length; i++) {
            console.log(resp.result.contexts[i]);
        }
    }
});

apiai
// Intent de bienvenida
    .action('input.welcome', function(message, resp, bot) {
        let responseText = resp.result.fulfillment.speech;
        bot.reply(message, responseText);
    })
    // Intent para capturas mensajes erróneos o que no sabemos procesar
    .action('input.unknown', function(message, resp, bot) {
        let responseText = resp.result.fulfillment.speech;
        let context = '';
        if (!resp.result.contexts[0]) {
            context = "Inicio";
        } else {
            context = resp.result.contexts[0].name;
        }
        let msg = '';
        switch (context) {
            case 'Inicio':
                bot.reply(message, {
                    text: '<h2>' + responseText + '</h2>' +
                        '<b>No le hemos entendido, puede preguntar por:</b><br><br>' +
                        'Hora de salida de una Hermandad: <b>"hora de salida del Rescatado"</b><br>' +
                        'Itinerario: <b>"recorrido de la Hermandad del Huerto"</b><br>' +
                        '¿Qué procesión ver hoy?: <b>"Hermandades del lunes santo"</b><br>' +
                        'También puede preguntarnos por una hermandad: <b>"Hermandad de la Vera-Cruz"</b><br>' +
                        'O dejar que te guiemos pulsando en cualquiera de los botones: <br>',
                    attachments: {
                        quick_replies: [{
                            text: 'Horas de salida',
                            payload: 'Horarios'
                        }, {
                            text: 'Recorridos',
                            payload: 'Recorridos'
                        }, {
                            text: 'Procesiones',
                            payload: 'Procesiones'
                        }]
                    }
                }, function() {});
                break;
            case 'horario':
                msg = '<h2>' + responseText + '</h2>' +
                    '<b>Preguntas por la hora de salida de una hermandad, pero no te he entendido</b><br><br>' +
                    'Prueba, por ejemplo, con: <b>"hora de salida de la Hermandad del Huerto"</b><br>' +
                    'Para salir escriba <b>"Deseo Salir"</b><br>';
                bot.reply(message, msg);
                break;
            case 'recorrido':
                msg = '<h2>' + responseText + '</h2>' +
                    '<b>Preguntas por el recorrido de una hermandad, pero no te he entendido</b><br><br>' +
                    'Prueba, por ejemplo, con: <b>"pregunto por el recorrido de la Merced"</b><br>' +
                    'Para salir y volver al principio escriba <b>"Deseo Salir"</b><br>';
                bot.reply(message, msg);
                break;
            case 'hermandad':
                msg = '<h2>' + responseText + '</h2>' +
                    '<b>Preguntas por una hermandad, pero no te he entendido</b><br><br>' +
                    'Prueba, por ejemplo, con: <b>"Hermandad del Rescatado"</b><br>' +
                    'Para salir  y volver al principio escriba <b>"Deseo Salir"</b><br>';
                bot.reply(message, msg);
                break;
            case 'info_dias':
                msg = '<h2>' + responseText + '</h2>' +
                    '<b>Estás preguntando por las procesiones de un determinado día, pero no te he entendido</b><br><br>' +
                    'Prueba, por ejemplo, con: <b>"Miercoles Santo"</b><br>' +
                    'Para salir  y volver al principio escriba <b>"Deseo Salir"</b><br>';
                bot.reply(message, msg);
                break;
        }

    })
    // Intent de horarios. Captura si preguntas por la hora de salida 
    .action('horario', function(message, resp, bot) {
        let herm = resp.result.contexts[0].parameters.hermandad;
        if ((herm != "") || (herm != "undefined")) {
            let respuesta = "Primero tienes que decirme la hermandad por la que preguntas, por ejemplo: " + "<b>pregunto por el horario del Rescatado</b>";
            bot.reply(message, respuesta);
        } else {
            bot.reply(message, "¿Está preguntando por la hora de salida de la hermandad " + herm + "?");
        }
    })
    // Intent de hermandad. Captura si preguntas por una hermandad, te muestra las opciones que existen
    // para una hermandad, como saber hora de salida y su recorrido
    .action('hermandad', function(message, resp, bot) {
        let nombre = resp.result.parameters.hermandad;
        if (encontrarHerm(nombre)) {
            let respuesta = "Preguntas por la hermandad " + parseNombre(nombre);
            bot.reply(message, {
                text: '¿Que deseas saber de la hermandad ' + parseNombre(nombre) + '?',
                attachments: {
                    quick_replies: [{
                        text: 'Hora de salida de ' + parseNombre(nombre),
                        payload: 'Quiero saber la hora de salida de ' + parseNombre(nombre)
                    }, {
                        text: 'Recorrido de ' + parseNombre(nombre),
                        payload: 'Quiero saber el recorrido de ' + parseNombre(nombre)
                    }]
                }
            }, function() {});
        } else {
            bot.reply(message, "No existe");
        }
    })
    // Intent para responder con la hora de salida. 
    .action('herm_hora', function(message, resp, bot) {
        let responseText = resp.result.fulfillment.speech;
        let nombre = resp.result.parameters.hermandad;
        if (encontrarHerm(nombre)) {
            let hora = encontrarHoraSalida(nombre);
            let cont = "La hermandad " + parseNombre(nombre) + ' sale el ' + buscarDiaProc(nombre) + ' a las ' + hora;
            bot.reply(message, cont);
            bot.reply(message, {
                text: '¿Qué desea saber ahora?',
                attachments: {
                    quick_replies: [{
                        text: 'Quiero saber el recorrido de la hermandad ' + parseNombre(nombre),
                        payload: 'Quiero saber el recorrido de la hermandad ' + parseNombre(nombre)
                    }, {
                        text: 'Quiero saber la hora de salida de otra hermandad',
                        payload: 'Hora de salida de otra hermandad'
                    }, {
                        text: 'Atrás',
                        payload: 'Atrás'
                    }]
                }
            }, function() {});
        } else {
            bot.reply(message, "No existe");
        }

    })
    // Intent para mostrar las hermandades que procesionan un determinado día 
    .action('info_dias', function(message, resp, bot) {
        let dia_preg = resp.result.parameters.dias;
        if (dia_preg != "") {
            let v_proc = [];
            v_proc = buscaProcesiones(dia_preg);
            if (v_proc == null) {
                bot.reply(message, "No hay procesiones");
            } else {
                let proc = "";
                for (let i = 0; i < v_proc.length; i++) {
                    proc = proc.concat(v_proc[i]);
                    if (i != (v_proc.length - 1))
                        proc = proc.concat(", ");
                }
                var vec = [];
                for (let i = 0; i < v_proc.length; i++) { // Generación de botones dinámicamente
                    let object = { text: '', payload: '' };
                    object.text = v_proc[i];
                    object.payload = "Quiero información sobre " + v_proc[i];
                    vec.push(object);
                }
                let textQuickReplies = '';
                if (vec.length != 0) {
                    proc = "Las Hermandades que procesionan el " + dia_preg + " son las siguientes: ";
                    bot.reply(message, proc);
                    textQuickReplies = 'Pinche sobre sus botones para obtener más información si lo desea, o pulse "Salir" para volver al inicio';
                } else {
                    proc = "No hay Hermandades que procesionen el " + dia_preg;
                    bot.reply(message, proc);
                    textQuickReplies = 'Para salir y volver al inicio pulse el botor "Salir"';
                }
                vec.push({ text: 'Salir', payload: 'Deseo salir' });
                bot.reply(message, {
                    text: textQuickReplies,
                    attachments: {
                        quick_replies: vec
                    }
                }, function() {});
            }
        } else {
            bot.reply(message, "Tienes que decirme el día por el que preguntas, por ejemplo: " + "<b>domingo de ramos</b>");
        }
    })
    // Intent para contestar cuando preguntas por el recorrido de una hermandad. 
    .action('recorrido', function(message, resp, bot) {
        let herm = resp.result.contexts[0].parameters.hermandad;
        if ((herm != "") || (herm != "undefined")) {
            let respuesta = "Primero tienes que decirme la hermandad por la que preguntas, por ejemplo: " + "<b>pregunto por el recorrido de la merced</b>";
            bot.reply(message, respuesta);
        } else {
            bot.reply(message, "¿Está preguntando por el recorrido de la hermandad " + herm + "?");
        }
    })
    // Intent para responder con el recorrido de una hermandad. 
    .action('herm_recorrido', function(message, resp, bot) {
        let responseText = resp.result.fulfillment.speech;
        let nombre = resp.result.parameters.hermandad;
        if (encontrarHerm(nombre)) {
            let respuesta = "Preguntas por el recorrido de la hermandad " + parseNombre(nombre);
            bot.reply(message, respuesta);
            let itinerario = [];
            itinerario = buscarRecorrido(nombre);
            let recorrido = "";
            for (let i = 0; i < itinerario.length; i++) {
                recorrido = recorrido.concat(itinerario[i]);
                if (i != (itinerario.length - 1))
                    recorrido = recorrido.concat(", ");
            }
            let cont = "La hermandad " + parseNombre(nombre) + ' tiene el siguiente recorrido: ' + recorrido;
            bot.reply(message, cont);
            bot.reply(message, {
                text: '¿Qué desea saber ahora?',
                attachments: {
                    quick_replies: [{
                        text: 'Quiero saber la hora de salida de la hermandad ' + parseNombre(nombre),
                        payload: 'Quiero saber la hora de salida de la hermandad ' + parseNombre(nombre)
                    }, {
                        text: 'Quiero saber el recorrido de otra hermandad',
                        payload: 'Recorrido de otra hermandad'
                    }, {
                        text: 'Atrás',
                        payload: 'Atrás'
                    }]
                }
            }, function() {});
        } else {
            bot.reply(message, "No existe");
        }
    })
    // Intent para finalizar para cuando se pulsa "Salir" en cualquiera de los botones que hay. 
    .action('i_final', function(message, resp, bot) {
        let responseText = resp.result.fulfillment.speech;
        bot.reply(message, responseText);
        bot.reply(message, {
            text: '<h2>Bienvenido al bot de la Semana Santa de Córdoba</h2>' +
                '<b>Puede preguntar por:</b><br><br>' +
                'Hora de salida de una Hermandad: <b>"hora de salida del Rescatado"</b><br>' +
                'Itinerario: <b>"recorrido de la Hermandad del Huerto"</b><br>' +
                '¿Qué procesión ver hoy?: <b>"Hermandades del lunes santo"</b><br>' +
                'También puede preguntarnos por una hermandad: <b>"Hermandad de la Vera-Cruz"</b><br>' +
                'O dejar que te guiemos pulsando en cualquiera de los botones: <br>',
            attachments: {
                quick_replies: [{
                    text: 'Horas de salida',
                    payload: 'Horarios'
                }, {
                    text: 'Recorridos',
                    payload: 'Recorridos'
                }, {
                    text: 'Procesiones',
                    payload: 'Procesiones'
                }]
            }
        }, function() {});
    })

var normalizedPath = require("path").join(__dirname, "skills");
require("fs").readdirSync(normalizedPath).forEach(function(file) {
    require("./skills/" + file)(controller);
});

console.log('I AM ONLINE! COME TALK TO ME: http://localhost:' + process.env.PORT)

function usage_tip() {
    console.log('~~~~~~~~~~');
    console.log('BOT para informar acerca de la Semana Santa de Córdoba');
    console.log('Desarrollado por Jesús Rodrigo');
    console.log('Execute your bot application like this:');
    console.log('PORT=<PORT> studio_token=<MY BOTKIT STUDIO TOKEN> node bot.js');
    console.log('Get a Botkit Studio token here: https://studio.botkit.ai/')
    console.log('~~~~~~~~~~');
}