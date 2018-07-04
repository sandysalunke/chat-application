/*
 *  (C) 2018, All rights reserved. This software constitutes the trade secrets and confidential and proprietary information
 *  It is intended solely for use by Sandip Salunke. This code may not be copied or redistributed to third parties without 
 *  prior written authorization from Sandip Salunke
 */

var socket = io();
var allChatMessages = [];
var chatNotificationCount = [];
var myUser = {};
var myFriend = {};



// Document Ready function called automatically on page load
$(document).ready(function () {

  // Function call to initilize file uploader
  initializeFileUploader();

  // Function will be called when file is selected
  fileIsSelected();

  // Logic to set window height
  var windowHeight = $(window).height();
  $('.onlineUsersContainer').css('min-height', windowHeight).css('max-height', windowHeight);
  $('.chatContainer').css('min-height', windowHeight);

  // Function call to login user with custom name
  loginMe();

});

// Function to initialize file uploader
function initializeFileUploader() {
  $("#imgAttachment").click(function () {
    $("#fileAttachment").click();
  });
}

// Function to be called when file is selected in file uploader
function fileIsSelected() {
  $('#fileAttachment').on('change', function () {
    var file = this.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('max upload size is 5 MB');
    } else {
      var reader = new FileReader();
      reader.addEventListener("load", function () {
        ajaxFileUpload(file.name, reader.result.split(',')[1]);
      }, false);
      if (file) {
        reader.readAsDataURL(file);
      }
    }
  });
}

// Function to hadle ajax file upload
function ajaxFileUpload(fileName, fileData) {
  var message = {};
  var formData = new FormData();
  formData.append('fileName', fileName);
  formData.append("fileToUpload", fileData);

  $.ajax({
    url: "/file-upload",
    type: "POST",
    data: formData,
    contentType: false,
    processData: false,
    success: function (response) {
      if (response.filePath) {
        message.type = 'file';
        message.text = response.filePath;
        message.sender = myUser.id;
        message.receiver = myFriend.id;
        // Function call to send attached file to sender/seceiver in chatbox
        appendSendersChatboxMessage(message);
      } else {
        throw 'File upload failed';
      }
    },
    error: function (jqXHR, textStatus, errorMessage) {
      alert('Error in sending attachment: ' + errorMessage); // Optional
    }
  });
}

// Function to ask user to supply his/her name before entering a chatbox
function loginMe() {
  var person = prompt("Please enter your name:", "Sandip Salunke");
  if (/([^\s])/.test(person) && person != null && person != "") {
    //$('#user').val(person);
    socket.emit('newUser', person);
    document.title = person;
  } else {
    location.reload();
  }
}

// Function to be called when sent a message from chatbox
function submitfunction() {
  var message = {};
  text = $('#txtChatMessage').val();

  if (text != '') {
    message.type = 'text';
    message.text = text;
    message.sender = myUser.id;
    message.receiver = myFriend.id;
    // Function call to send attached file to sender/seceiver in chatbox
    appendSendersChatboxMessage(message);
  }

  $('#txtChatMessage').val('').focus();
}

// function to emit an even to notify friend that I am typing a message 
function notifyTyping() {
  socket.emit('notifyTyping', myUser, myFriend);
}

// Load all messages for the selected user
function loadChatBox(messages) {
  $('#form').show();
  $('#messages').html('').show();
  messages.forEach(function (message) {
    var cssClass = (message.sender == myUser.id) ? 'chatMessageRight' : 'chatMessageLeft';
    // Function call to append receiver's chat message to chatBox
    appendMessage(message, cssClass);
  });
  chatboxScrollBottom();
}

// Function to append chat application to senders/receivers chatBox
function appendMessage(message, cssClass) {
  var htmlMessage = '';
  var fileTypeRE = /\.(jpe?g|png|gif|bmp)$/i;

  var messageTimestamp = new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  var chatMessageTimestamp = '<label class="chatMessageTimestamp">' + messageTimestamp + '</label>';

  if (message.type === 'text') {
    htmlMessage = '<li class="' + cssClass + '">' + message.text + chatMessageTimestamp + '</li>';
  } else if (message.type === 'file') {
    if (fileTypeRE.test(message.text)) {
      htmlMessage = '<li class="' + cssClass + '"><img class="chatImage" src="' + message.text + '" alt="" />' + chatMessageTimestamp + '</li>';
    } else {
      htmlMessage = '<li class="' + cssClass + '"><a href="' + message.text + '"><img class="chatImage" src="assets/images/if_Download_1031520.png" alt="Download File" /></a>' + chatMessageTimestamp + '</li>';
    }
  }

  $('#messages').append(htmlMessage);
  chatboxScrollBottom();
}

// Function to append a chat message to the senders chatBox
function appendSendersChatboxMessage(message) {
  // Function call to append senders chat message to chatBox
  appendMessage(message, 'chatMessageRight');

  if (allChatMessages[myFriend.id] != undefined) {
    allChatMessages[myFriend.id].push(message);
  } else {
    allChatMessages[myFriend.id] = new Array(message);
  }
  socket.emit('chatMessage', message);
}

// Append a single chant message to the receivers chatbox
function appendReceiversChatMessage(message) {
  if (message.receiver == myUser.id && message.sender == myFriend.id) {
    var cssClass = (message.sender == myUser.id) ? 'chatMessageRight' : 'chatMessageLeft';

    // Function call to append receivers chat message to chatBox
    appendMessage(message, cssClass);

    // Function call to play notification sound
    playNewMessageAudio();
  } else {
    playNewMessageNotificationAudio();
    updateChatNotificationCount(message.sender);
  }

  if (allChatMessages[message.sender] != undefined) {
    allChatMessages[message.sender].push(message);
  } else {
    allChatMessages[message.sender] = new Array(message);
  }
}

// Function to play a audio when new message arrives on selected chatbox
function playNewMessageAudio() {
  (new Audio('https://notificationsounds.com/soundfiles/8b16ebc056e613024c057be590b542eb/file-sounds-1113-unconvinced.mp3')).play();
}

// Function to play a audio when new message arrives on selected chatbox
function playNewMessageNotificationAudio() {
  (new Audio('https://notificationsounds.com/soundfiles/dd458505749b2941217ddd59394240e8/file-sounds-1111-to-the-point.mp3')).play();
}

// Function to update chat notifocation count
function updateChatNotificationCount(userId) {
  var count = (chatNotificationCount[userId] == undefined) ? 1 : chatNotificationCount[userId] + 1;
  chatNotificationCount[userId] = count;
  $('#' + userId + ' label.chatNotificationCount').html(count);
  $('#' + userId + ' label.chatNotificationCount').show();
}

// Function to clear chat notifocation count to 0
function clearChatNotificationCount(userId) {
  chatNotificationCount[userId] = 0;
  $('#' + userId + ' label.chatNotificationCount').hide();
}

// Function to be called when a friend is selected from the list of online users
function selectUerChatBox(element, userId, userName) {
  myFriend.id = userId;
  myFriend.name = userName;

  $('#form').show();
  $('#messages').show();
  $('#onlineUsers li').removeClass('active');
  $(element).addClass('active');
  $('#notifyTyping').text('');
  $('#txtChatMessage').val('').focus();

  // Reset chat message count to 0
  clearChatNotificationCount(userId);

  // load all chat message for selected user 
  if (allChatMessages[userId] != undefined) {
    loadChatBox(allChatMessages[userId]);
  } else {
    $('#messages').html('');
  }
}

function chatboxScrollBottom() {
  $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') });
}

// ############# Event listeners and emitters ###############
// Listen to newUser even to set client with the current user information
socket.on('newUser', function (newUser) {
  myUser = newUser;
  $('#myName').html(myUser.name);
});

// Listen to notifyTyping event to notify that the friend id typying a message
socket.on('notifyTyping', function (sender, recipient) {
  if (myFriend.id == sender.id) {
    $('#notifyTyping').text(sender.name + ' is typing ...');
  }
  setTimeout(function () { $('#notifyTyping').text(''); }, 5000);
});

// Listen to onlineUsers event to update the list of online users
socket.on('onlineUsers', function (onlineUsers) {
  var usersList = '';

  onlineUsers.forEach(function (user) {
    if (user.id != myUser.id) {

      if (onlineUsers.length == 2) {
        myFriend.id = user.id;
        myFriend.name = user.name;
        $('#form').show();
        $('#messages').show();
      }

      var activeClass = (user.id == myFriend.id) ? 'active' : '';
      usersList += '<li id="' + user.id + '" class="' + activeClass + '" onclick="selectUerChatBox(this, \'' + user.id + '\', \'' + user.name + '\')"><a href="javascript:void(0)">' + user.name + '</a><label class="chatNotificationCount"></label></li>';
    }
  });
  $('#onlineUsers').html(usersList);
});

// Listen to chantMessage event to receive a message sent by my friend 
socket.on('chatMessage', function (message) {
  // Function call to append a single chant message to the receivers chatbox
  appendReceiversChatMessage(message);
});

// Listen to userIsDisconnected event to remove its chat history from chatbox
socket.on('userIsDisconnected', function (userId) {
  delete allChatMessages[userId];
  if (userId == myFriend.id) {
    $('#form').hide();
    $('#messages').html('').hide();
  }
});
