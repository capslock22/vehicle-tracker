const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);
const mysql = require('mysql');
const connection = mysql.createConnection({
    host    : 'localhost',
    user    : 'root',
    password: '',
    database: 'gpstracks'
});

connection.connect();

io.sockets.on('connection', function (socket){
    var socketRef = socket;

    socket.on('client', function (){
        // Client connected - send all tracking data
        console.log('Client is connected')
        socketRef.join("clients");
        var out = "";
        connection.query("SELECT runnerid,GROUP_CONCAT(lat ORDER BY pointid DESC SEPARATOR ',') AS lat,GROUP_CONCAT(lon ORDER BY pointid DESC SEPARATOR ',') AS lon,GROUP_CONCAT(speed ORDER BY pointid DESC SEPARATOR ',') AS speed FROM tracks GROUP BY runnerid ORDER BY runnerid",
        function(err, rows, fields) {
            if (err) throw err;
            var outObj = {};
            outObj.runners = [];
            for (var i = 0; i < rows.length; i++) {
                outObj.runners.push(rows[i]);
            }
            out = JSON.stringify(outObj);
            socketRef.emit('allData', out);
            console.log('sent init data');
        });
    });

    socket.on('sendevent', function (data){
        // Data recieved from runner

        // emit data to clients
        io.sockets.in('clients').emit('sendfromserver', data);

        // save to database
        connection.query('INSERT INTO tracks SET runnerid = '+connection.escape(data.id)+', lat = '+connection.escape(data.lat)+', lon = '+connection.escape(data.lon)+', speed = '+connection.escape(data.speed)+', time = '+connection.escape(data.time)+'',
        function(err, rows, fields) {
            if (err) throw err;
        });
    });

    socket.on('runnerConnect', function (data){
        console.log(data);
    });
})

process.on('SIGINT', function(){
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)");
    connection.end();
    process.exit();
});
server.listen(8080, () => {
    console.log('listeing on *:8080');
});