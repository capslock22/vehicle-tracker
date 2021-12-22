Vehicle Tracking
========

###Installation:
- Go to `server` folder and `npm install`
- Edit `server/server.js` with your MySQL-details.
- Create database as per `vehicletrack.sql`.
- Edit `device/app.js` with your socket.io-server.
- Edit `device/index.html` with your socket.io-server.
- Edit `viewer/viewer.html` with your socket.io-server.
- Edit `viewer/viewer.js` with your socket.io-server. Take a look at line 275 for editing custom tile server.

###Tracking:
-  Start server with `node server.js`.
-  Send someone for a walk with the device running.
-	Browse to `viewer.html` to view Vehicle's position#