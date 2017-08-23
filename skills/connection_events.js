module.exports = function(controller) {

    controller.on('hello', function(bot, message) {
        bot.reply(message, {
            text: '<h2>Bienvenido al bot de la Semana Santa de Córdoba</h2>' +
                '<b>Puede preguntar por:</b><br><br>' +
                'Hora y lugar de salida de una Hermandad: <b>"hora de salida del Rescatado"</b><br>' +
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
    });

    controller.on('welcome_back', function(bot, message) {
        bot.reply(message, {
            text: '<h2>Bienvenido al bot de la Semana Santa de Córdoba</h2>' +
                '<b>Puede preguntar por:</b><br><br>' +
                'Hora y lugar de salida de una Hermandad: <b>"hora de salida del Rescatado"</b><br>' +
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
    });

    controller.on('reconnect', function(bot, message) {
        // the connection between the client and server experienced a disconnect/reconnect
        bot.reply(message, 'Ha surgido un error, pero ya está solucionado, disculpe las molestias');

    });


}