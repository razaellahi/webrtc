$.ajaxSetup({
  async: false
});

var configuration;

$.getJSON("./config.json", function (res) {
  configuration = res;
})

// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + roomHash;
// const configuration = {
//   iceServers: [{
//     url: 'turn:numb.viagenie.ca',
//     username: 'razaellahi531@gmail.com',
//     credential: '<password>'
//   }]
// };



// = {
//   iceServers: [{
//     url: 'turn:bn-turn1.xirsys.com:3478?transport=udp',
//     username: "h7AcWCHvJoq17jCsmZAVgGLXN5K1OTyrh6jz2KNbq4DYLUrO-Ykju95H4p0vG14gAAAAAF8i9AtyYXphZWxsYWhp",
//     credential: "06f5cc9c-d281-11ea-a559-0242ac140004"
//   }]
// };


// const configuration = {
//   iceServers: [{
//     username: "h7AcWCHvJoq17jCsmZAVgGLXN5K1OTyrh6jz2KNbq4DYLUrO-Ykju95H4p0vG14gAAAAAF8i9AtyYXphZWxsYWhp",
//     credential: "06f5cc9c-d281-11ea-a559-0242ac140004",
//     urls: [
//       "turn:bn-turn1.xirsys.com:80?transport=udp",
//       "turn:bn-turn1.xirsys.com:3478?transport=udp",
//       "turn:bn-turn1.xirsys.com:80?transport=tcp",
//       "turn:bn-turn1.xirsys.com:3478?transport=tcp",
//       "turns:bn-turn1.xirsys.com:443?transport=tcp",
//       "turns:bn-turn1.xirsys.com:5349?transport=tcp"
//     ]
//   }]
// };

let room;
let pc;

let streamObj = { localStream: null };

function onSuccess() { };
function onError(error) {
  console.error(error);
};

drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });
  // We're connected to the room and received an array of 'members'
  // connected to the room (including us). Signaling server is ready.
  room.on('members', members => {
    console.log('MEMBERS', members);
    // If we are the second user to connect to the room we will be creating the offer
    const isOfferer = members.length === 2;
    startWebRTC(isOfferer);
  });
});

// Send signaling data via Scaledrone
function sendMessage(message) {
  drone.publish({
    room: roomName,
    message
  });
}

function startWebRTC(isOfferer) {

  // fetch("config.json").then(function (res) {
  //   return res.json()
  // }).then(function (data) {
  //   configuration = data.iceServers;


  pc = new RTCPeerConnection(configuration);

  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  pc.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({ 'candidate': event.candidate });
    }
  };

  // If user is offerer let the 'negotiationneeded' event create the offer
  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescCreated).catch(onError);
    }
  }

  // When a remote stream arrives display it in the #remoteVideo element
  pc.ontrack = event => {
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
    // Display your local video in #localVideo element
    streamObj.localStream = stream;
    localVideo.srcObject = streamObj.localStream;
    // Add your stream to be sent to the conneting peer
    stream.getTracks().forEach(track => pc.addTrack(track, streamObj.localStream));
  }, onError);

  // Listen to signaling data from Scaledrone
  room.on('data', (message, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }

    if (message.sdp) {
      // This is called after receiving an offer or answer from another peer
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        // When receiving an offer lets answer it
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer().then(localDescCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      pc.addIceCandidate(
        new RTCIceCandidate(message.candidate), onSuccess, onError
      );
    }
  });

  //  });

}

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({ 'sdp': pc.localDescription }),
    onError
  );
}


function cameraOff() {
  streamObj.localStream.getVideoTracks()[0].enabled = false;

  var camOnTag = document.getElementById("camoff");
  camOnTag.style.display = "initial";

  var camOffTag = document.getElementById("camon");
  camOffTag.style.display = "none";

}

function cameraOn() {
  streamObj.localStream.getVideoTracks()[0].enabled = true;

  var camOnTag = document.getElementById("camoff");
  camOnTag.style.display = "none";

  var camOffTag = document.getElementById("camon");
  camOffTag.style.display = "initial";

}


function micOn() {
  streamObj.localStream.getAudioTracks()[0].enabled = true;

  var micOnTag = document.getElementById("micoff");
  micOnTag.style.display = "none";

  var micOffTag = document.getElementById("micon");
  micOffTag.style.display = "initial";

  var spkOffTag = document.getElementById("speakeroff");
  spkOffTag.style.display = "none";

  var spkOnTag = document.getElementById("speakeron");
  spkOnTag.style.display = "initial";
}

function micOff() {
  streamObj.localStream.getAudioTracks()[0].enabled = false;

  var micOnTag = document.getElementById("micoff");
  micOnTag.style.display = "initial";

  var micOffTag = document.getElementById("micon");
  micOffTag.style.display = "none";

  var spkOffTag = document.getElementById("speakeroff");
  spkOffTag.style.display = "initial";

  var spkOnTag = document.getElementById("speakeron");
  spkOnTag.style.display = "none";
}

function exit() {
  var win = window.open("about:blank", "_self");
  win.close();
}
