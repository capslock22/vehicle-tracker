var io = require('socket.io')(8080);
var mysql = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'gpstracks'
});

connection.connect();

io.sockets.on('connection', function (socket) {

    var socketRef = socket;

    socket.on('client', function (){
        // Client connected - send all tracking data
        socketRef.join("clients");
        var out = "";
        connection.query("SELECT vehicleid,GROUP_CONCAT(lat ORDER BY pointid DESC SEPARATOR ',') AS lat,GROUP_CONCAT(lon ORDER BY pointid DESC SEPARATOR ',') AS lon,GROUP_CONCAT(speed ORDER BY pointid DESC SEPARATOR ',') AS speed FROM tracks GROUP BY vehicleid ORDER BY vehicleid",
        function(err, rows, fields) {
            if (err) throw err;
            var outObj = {};
            outObj.vehicles = [];
            for (var i = 0; i < rows.length; i++) {
                outObj.vehicles.push(rows[i]);
            }
            out = JSON.stringify(outObj);
            socketRef.emit('allData', out);
            console.log('sent init data');
        });
    });

    socket.on('sendevent', function (data){
        // Data recieved from vehicle

        // emit data to clients
        io.sockets.in('clients').emit('sendfromserver', data);

        // save to database
        connection.query('INSERT INTO tracks SET vehicleid = '+connection.escape(data.id)+', lat = '+connection.escape(data.lat)+', lon = '+connection.escape(data.lon)+', speed = '+connection.escape(data.speed)+', time = '+connection.escape(data.time)+'',
        function(err, rows, fields) {
            if (err) throw err;
        });
    });

    socket.on('vehicleConnect', function (data){
        console.log(data);
    });
});

process.on('SIGINT', function() {
    console.log( "\nshutting down from SIGINT (Ctrl-C)");
    connection.end();
    process.exit();
})
