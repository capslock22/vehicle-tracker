$(document).ready(function () {

    var updateInterval = 5*1000,
        replaySpeed = 100,
        tailLength = (60/(updateInterval/1000)),
        map,
        vehicleCount = 0,
        vehicles = [],
        socketServer = 'localhost:8080';

    function vehicle(json,id) {
        var data = [],
            path = new google.maps.MVCArray(),
            poly,
            polySymbol,
            colors = ["#FF0000", "#FF69B4", "#00FF7F", "#FF00FF", "#FFA500", "#00FF00",
                      "#FA8072", "#00FFFF", "#ADFF2F", "#00FF7F"],
            vehicleColor = colors[Math.floor(Math.random()*colors.length)],
            popInterval,
            isPlaying = false,
            lastUpdate = Date.now(),
            lastPoint,
            r = {};

        r.id = json.vehicles[id].vehicleid;

        $('[data-id="'+id+'"] .vehiclecolor').val(vehicleColor);

        if(!data.length){ populate(); }

        function populate(){
            var lats = json.vehicles[id].lat.split(",");
            var lons = json.vehicles[id].lon.split(",");
            var speeds = json.vehicles[id].speed.split(",");

            for (var i = lons.length - 1; i >= 0; i--) {
                var p = new google.maps.LatLng(lats[i], lons[i]);
                p.speed = speeds[i];
                data.push(p);
            }
            map.setCenter(data[data.length-1]);
            makePath(tailLength*2,true);
        }

        function makePath(length,poly){
            path.clear();
            console.log('makin path, length: '+length);

            // prevents trying to access out of range points
            if(data.length < length){
                length = data.length-1;
            }

            for (var i=0; i<length; i++){
                if(length-i < length-1){
                    path.push(interpolate(data[data.length-length+i],data[data.length-length+i-1]));
                }
                path.push(data[data.length-length+i]);
            }
            if(poly){
                makePoly();
            }
        }

        function makePoly(){
            polySymbol = {
                path: google.maps.SymbolPath.CIRCLE,
                strokeColor: "black",
                fillColor: vehicleColor,
                fillOpacity: 1,
                strokeWeight: 2,
                scale: 6
            };

            poly = new google.maps.Polyline({
                path: path,
                strokeColor: vehicleColor,
                strokeOpacity: 1,
                strokeWeight: 5,
                clickable: false,
                map: map,
                icons: [{icon: polySymbol, offset: '100%'}]
            });
        }

        function displayPace(pace) {
            $('[data-id="'+id+'"] .pace').html(getPace(pace));
        }

        function pop() {
            if(path.getLength() > 2){
                path.removeAt(0);
            }
        }

        function conditionalPop() {
            // this is exectued every 2.5 sec. It looks at the time elapsed between now and the last data reciept.
            // If that time is higher than the updateInterval, the vehicle has stopped sending or hasn't moved,
            // see r.update. OR, if the tail length is longer than allowed, it's popped.

            var now = Date.now();
            var diff = now-lastUpdate;
            if (diff > updateInterval || path.getLength() > tailLength*2){
                if(!isPlaying){
                    pop();
                }
            }
            else{
                console.log('nopop');
            }
        }

        popInterval = setInterval(conditionalPop, (updateInterval/2));

        r.pop = function() {
            pop();
        };

        r.update = function(json) {
            var newLat = json.lat;
            var newLon = json.lon;
            var newSpeed = json.speed;
            var p = new google.maps.LatLng(newLat, newLon);

            if(lastPoint !== p.toString()) {
                // movement found, add new point to data[] and MVCArray
                displayPace(newSpeed);
                p.speed = newSpeed;
                data.push(p);
                if(!isPlaying) {
                    path.push(interpolate(p, data[data.length-2 ]));
                    setTimeout(function() {
                        if(!isPlaying){
                            path.push(p);
                        }
                    }, (updateInterval)/2);
                }
                lastUpdate = Date.now();
                // console.log("movement detected");
            }else{
                data.push(p);
                // console.log('no movement');
            }
            lastPoint = p.toString();
        };

        r.replay = function() {
            if(!isPlaying) {
                var currLen = parseInt((path.getLength()/2)+1);
                path.clear();
                path.push(data[0]);
                path.push(interpolate(data[1], data[0]));
                var i = 1;
                isPlaying = true;
                replayPoint();
            }
            
            function replayPoint() {
                if(i === data.length-1) {
                    path.push(data[i]);
                    displayPace(data[i].speed);
                    console.log('breaking');
                    makePath(currLen,false);
                    isPlaying = false;
                }
                else {
                    path.push(data[i]);
                    setTimeout(function() { path.push(interpolate(data[i], data[i-1])); }, replaySpeed/2);
                    displayPace(data[i].speed);
                    i++;
                    setTimeout(function() { requestAnimationFrame(replayPoint); }, replaySpeed);
                }
            }
        };

        r.setColor = function(color){
            poly.setOptions({strokeColor:color});
            polySymbol.fillColor = color;
            vehicleColor = color;
        };
        
        return r;
    }

    function makeVehicles(json){
        console.log('makevehicles');
        if(json.vehicles.length === 0){
            alert('No vehicles recieved');
            toggleTimer();
        }

        for (var i=0; i<json.vehicles.length; i++) {
            lastspeed = json.vehicles[i].speed.split(",");
            $('#vehiclelist').append('<tr data-id='+i+'><td><input title="Change color" type="color" class="vehiclecolor" value="#FFFFF"/><span title="Replay" class="replay">↻</span>'+json.vehicles[i].vehicleid+'</td><td class="pace">'+getPace(lastspeed[0])+'</td></tr>');
            vehicles.push(vehicle(json,i));
            vehicleCount = i;
        }
    }

    function updateVehicles(data){
        function currentRunner(data){
            for (var i = vehicles.length - 1; i >= 0; i--) {
                if(vehicles[i].id === data.id) {
                    return i;
                }
            }
        }

        vehicles[currentRunner(data)].update(data);

    }

    function setSpeed(speed){
        replaySpeed = speed;
        $("[for=replayspeed]").html('Replay time: '+replaySpeed);
    }

    function interpolate(fresh,old) {
        var intLat = (old.lat()+fresh.lat())/2;
        var intLon = (old.lng()+fresh.lng())/2;
        return new google.maps.LatLng(intLat, intLon);
    }

    function getPace(pace) {
        if (pace === 0 || isNaN(pace)) {
            return "N/A";
        } 
        else {
            var onemin = pace * 60;
            var x = 1000 / onemin;
            var time = 60 * x;
            var minutes = Math.floor(time / 60);
            var seconds = ((Math.round(time - minutes * 60)).toString());
            if (seconds.length === 1) { seconds = "0" + seconds; }
            return minutes + ":" + seconds;
        }
    }

    // Socket.io stuff

    var socket = io.connect(socketServer);

    socket.emit('client');

    socket.on('sendfromserver', function (data) {
        updateVehicles(data);
    });

    socket.on('allData', function (json) {
        makeVehicles(JSON.parse(json));
    });

    // Map stuff
    var mapOptions = {
        center: new google.maps.LatLng(63.845224,20.073608),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        panControl: false
    };
    
    var osm = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true,
        maxZoom: 18,
        name: "OSM",
        alt: "OpenStreetMap"
    });

    var OLmaps = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://localhost:8080/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true,
        maxZoom: 16,
        name: "OL maps",
        alt: "OL maps"
    });

    function toggleMap() {
        if(map.overlayMapTypes.getAt(0)){
            map.overlayMapTypes.removeAt(0);
        }
        else{
            map.overlayMapTypes.insertAt(0, OLmaps);
        }
    }

    map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

    map.mapTypes.set('osm', osm);
    map.setOptions({
    mapTypeControlOptions: {
        mapTypeIds:
            ['osm',
            google.maps.MapTypeId.ROADMAP,
            // google.maps.MapTypeId.TERRAIN,
            google.maps.MapTypeId.SATELLITE],
            // google.maps.MapTypeId.HYBRID],
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
        }
    });

    // Event handlers
    $("[for=replayspeed]").text('Replay time: '+replaySpeed);
    $('#replayspeed').on('change', function(){ setSpeed($(this).val()); });
    $('#togglemap').on('change', toggleMap);
    $('#vehiclelist').on('change', '.vehiclecolor', function(event){
        var id = $(this).closest('tr').attr('data-id');
        var newColor = $('[data-id="'+id+'"] .vehiclecolor').val();
        vehicles[id].setColor(newColor);
    });
    $('#vehiclelist').on('click', '.replay', function(event){
        var id = $(this).closest('tr').attr('data-id');
        vehicles[id].replay();
    });

    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                       || window[vendors[x]+'CancelRequestAnimationFrame'];
        }
     
        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
     
        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());
});