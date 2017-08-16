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

function encontrarHerm(nombre) {
    let esta = false;
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            esta = true;
        }
    }
    return esta;
}

function buscarDiaProc(nombre) {
    let dia = "";
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            dia = info_hermandades[i].dia;
        }
    }
    return dia;
}

function encontrarHoraSalida(nombre) {
    let hora = '';
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            hora = info_hermandades[i].salida;
        }
    }
    return hora;
}

function buscaProcesiones(dia) {
    var proc = [];
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].dia == dia) {
            proc.push(info_hermandades[i].nombreOrigin);
        }
    }
    return proc;
}

function buscarRecorrido(nombre) {
    var itinerario = [];
    for (let i = 0; i < info_hermandades.length; i++) {
        if (info_hermandades[i].nombre == nombre) {
            itinerario = info_hermandades[i].itinerario;
        }
    }
    return itinerario;
}

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
    .action('input.welcome', function(message, resp, bot) {
        let responseText = resp.result.fulfillment.speech;
        bot.reply(message, responseText);
    })
    .action('input.unknown', function(message, resp, bot) {
        let responseText = resp.result.fulfillment.speech;
        bot.reply(message, responseText);
    })
    .action('horario', function(message, resp, bot) {
        let herm = resp.result.contexts[0].parameters.hermandad;
        if ((herm != "") || (herm != "undefined")) {
            let respuesta = "Primero tienes que decirme la hermandad por la que preguntas, por ejemplo: " + "<b>pregunto por el horario del Rescatado</b>";
            bot.reply(message, respuesta);
        } else {
            bot.reply(message, "¿Está preguntando por la hora de salida de la hermandad " + herm + "?");
        }
    })
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
                proc = "Las Hermandades que procesionan el " + dia_preg + ": " + proc;
                bot.reply(message, proc);
                bot.reply(message, {
                    text: '¿Deseas saber algo más?' + '¿O quieres volver atrás?',
                    attachments: {
                        quick_replies: [{
                            text: 'Hora de salida',
                            payload: 'Horarios'
                        }, {
                            text: 'Recorridos',
                            payload: 'Recorridos'
                        }, {
                            text: 'Procesiones',
                            payload: 'Procesiones'
                        }, {
                            text: 'Salir',
                            payload: 'Deseo salir'
                        }]
                    }
                }, function() {});
            }
        } else {
            bot.reply(message, "Tienes que decirme el día por el que preguntas, por ejemplo: " + "<b>domingo de ramos</b>");
        }
    })
    .action('recorrido', function(message, resp, bot) {
        let herm = resp.result.contexts[0].parameters.hermandad;
        if ((herm != "") || (herm != "undefined")) {
            let respuesta = "Primero tienes que decirme la hermandad por la que preguntas, por ejemplo: " + "<b>pregunto por el recorrido de la merced</b>";
            bot.reply(message, respuesta);
        } else {
            bot.reply(message, "¿Está preguntando por el recorrido de la hermandad " + herm + "?");
        }
    })
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