/*
 *  (C) 2018, All rights reserved. This software constitutes the trade secrets and confidential and proprietary information
 *  It is intended solely for use by Sandip Salunke. This code may not be copied or redistributed to third parties without 
 *  prior written authorization from Sandip Salunke
 */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var bodyParser = require('body-parser');
var multer = require('multer');
var fs = require('fs');
const exec = require('child_process').exec;
var upload = multer({ dest: 'assets/uploads/', limits: { fieldSize: 5 * 1024 * 1024 } });


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

var onlineUsers = [];

// Initialize appication with route / (that means root of the application)
app.get('/', function (req, res) {
  var express = require('express');
  app.use(express.static(path.join(__dirname)));
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Register events on socket connection
io.on('connection', function (socket) {

  // Listen to chantMessage event sent by client and emit a chatMessage to the client
  socket.on('chatMessage', function (message) {
    io.to(message.receiver).emit('chatMessage', message);
  });

  // Listen to notifyTyping event sent by client and emit a notifyTyping to the client
  socket.on('notifyTyping', function (sender, receiver) {
    io.to(receiver.id).emit('notifyTyping', sender, receiver);
  });

  // Listen to newUser event sent by client and emit a newUser to the client with new list of online users
  socket.on('newUser', function (user) {
    var newUser = { id: socket.id, name: user };
    onlineUsers.push(newUser);
    io.to(socket.id).emit('newUser', newUser);
    io.emit('onlineUsers', onlineUsers);
  });

  // Listen to disconnect event sent by client and emit userIsDisconnected and onlineUsers (with new list of online users) to the client 
  socket.on('disconnect', function () {
    onlineUsers.forEach(function (user, index) {
      if (user.id === socket.id) {
        onlineUsers.splice(index, 1);
        io.emit('userIsDisconnected', socket.id);
        io.emit('onlineUsers', onlineUsers);
      }
    });
  });
});

// file uoloader rout to recieve a base64 file and stor in specified location  
app.post('/file-upload', upload.single('avatar'), function (req, res, next) {
  var fileBase64Data = req.body.fileToUpload;
  var fileName = req.body.fileName;
  var filePath = 'assets/uploads/' + new Date().getTime() + fileName;

  fs.writeFile(filePath, fileBase64Data, 'base64', function (error) {
    if (error) {
      res.sendStatus(500);
    }
    res.send({ filePath: filePath });
  });
})

// Listen application request on port OPENSHIFT_NODEJS_PORT OR 8080
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'
 
http.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", port " + server_port )
  setInterval(function () {
    exec("rm -rf assets/uploads/* \;");
  }, 600000);
});