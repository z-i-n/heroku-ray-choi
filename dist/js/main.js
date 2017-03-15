/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* global TimelineDataSeries, TimelineGraphView */

'use strict';
var isAnswer = false;
var audio1 = document.querySelector('audio#audio1');
var audio2 = document.querySelector('audio#audio2');
var callButton = document.querySelector('button#callButton');
var hangupButton = document.querySelector('button#hangupButton');
var codecSelector = document.querySelector('select#codec');
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.onclick = hangup;

var pc;
var localStream;

var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var lastResult;

var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 0,
  voiceActivityDetection: false
};

function gotStream(stream) {
  hangupButton.disabled = false;
  audio1.srcObject = stream;
  console.log('Received local stream');
  localStream = stream;
  var audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    console.log('Using Audio device: ' + audioTracks[0].label);
  }
  pc.addStream(localStream);
  console.log('Adding Local Stream to peer connection');

  if (!isAnswer) {
    pc.createOffer(
      offerOptions
    ).then(
      gotLocalDescription,
      onCreateSessionDescriptionError
    );
  } else {
    pc.createAnswer().then(
      gotLocalDescription,
      onCreateSessionDescriptionError
    );
  }

  bitrateSeries = new TimelineDataSeries();
  bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
  bitrateGraph.updateEndDate();

  packetSeries = new TimelineDataSeries();
  packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
  packetGraph.updateEndDate();
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function call(desc) {
  isAnswer = !!desc;
  callButton.disabled = true;
  codecSelector.disabled = true;
  console.log('Starting call');
  var servers = {
      'iceServers': [
        {url:'stun:stun01.sipphone.com'},
        {url:'stun:stun.ekiga.net'},
        {url:'stun:stun.fwdnet.net'},
        {url:'stun:stun.ideasip.com'},
        {url:'stun:stun.iptel.org'},
        {url:'stun:stun.rixtelecom.se'},
        {url:'stun:stun.schlund.de'},
        {url:'stun:stun.l.google.com:19302'},
        {url:'stun:stun1.l.google.com:19302'},
        {url:'stun:stun2.l.google.com:19302'},
        {url:'stun:stun3.l.google.com:19302'},
        {url:'stun:stun4.l.google.com:19302'},
        {url:'stun:stunserver.org'},
        {url:'stun:stun.softjoys.com'},
        {url:'stun:stun.voiparound.com'},
        {url:'stun:stun.voipbuster.com'},
        {url:'stun:stun.voipstunt.com'},
        {url:'stun:stun.voxgratia.org'},
        {url:'stun:stun.xten.com'},
        {
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
      ]
  };
  var pcConstraints = {
    'optional': []
  };

  pc = new RTCPeerConnection(servers, pcConstraints);
  console.log('Created local peer connection object pc');
  pc.onicecandidate = onIceCandidate;
  pc.onaddstream = gotRemoteStream;

  if (isAnswer) {
    desc.sdp.sdp = forceChosenAudioCodec(desc.sdp.sdp);
    pc.setRemoteDescription(desc.sdp).then(
      function() {
      },
      onSetSessionDescriptionError
    );
  }

  // pc2 = new RTCPeerConnection(servers, pcConstraints);
  // console.log('Created remote peer connection object pc2');
  // pc2.onicecandidate = function(e) {
  //   onIceCandidate(pc2, e);
  // };

  //pc2.onaddstream = gotRemoteStream;

  console.log('Requesting local stream');

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotLocalDescription(desc) {
  console.log('Offer from pc \n' + desc.sdp);
  pc.setLocalDescription(desc).then(
    function() {
      //desc.sdp = forceChosenAudioCodec(desc.sdp);
      // pc2.setRemoteDescription(desc).then(
      //   function() {
      //     pc2.createAnswer().then(
      //       gotDescription2,
      //       onCreateSessionDescriptionError
      //     );
      //   },
      //   onSetSessionDescriptionError
      // );
      //sockets 으로 전송
      socket.emit(isAnswer ? 'answer': 'offer', JSON.stringify({ "sdp": desc }));
    },
    onSetSessionDescriptionError
  );
}

function gotRemoteDescription(desc) {
  console.log('Answer from pc \n' + desc.sdp);
  desc.sdp.sdp = forceChosenAudioCodec(desc.sdp.sdp);
  pc.setRemoteDescription(desc.sdp).then(
    function() {
      // desc.sdp = forceChosenAudioCodec(desc.sdp);
      // pc1.setRemoteDescription(desc).then(
      //   function() {
      //   },
      //   onSetSessionDescriptionError
      // );
    },
    onSetSessionDescriptionError
  );
}

function hangup() {
  console.log('Ending call');
  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
  pc.close();
  pc = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  codecSelector.disabled = false;
}

function gotRemoteStream(e) {
  audio2.srcObject = e.stream;
  console.log('Received remote stream');
}

function onIceCandidate(event) {
  socket.emit("candidate", event.candidate);

  console.log(' ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));
}

function addIcecandidate(iceCandidate) {
  pc.addIceCandidate(iceCandidate)
  .then(
    function() {
      onAddIceCandidateSuccess(pc);
    },
    function(err) {
      onAddIceCandidateError(pc, err);
    }
  );
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log('Failed to add ICE Candidate: ' + error.toString());
}

function onSetSessionDescriptionError(error) {
  console.log('Failed to set session description: ' + error.toString());
}

function forceChosenAudioCodec(sdp) {
  return maybePreferCodec(sdp, 'audio', 'send', codecSelector.value);
}

// Copied from AppRTC's sdputils.js:

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function maybePreferCodec(sdp, type, dir, codec) {
  var str = type + ' ' + dir + ' codec';
  if (codec === '') {
    console.log('No preference on ' + str + '.');
    return sdp;
  }

  console.log('Prefer ' + str + ': ' + codec);

  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = findLine(sdpLines, 'm=', type);
  if (mLineIndex === null) {
    return sdp;
  }

  // If the codec is available, set it as the default in m line.
  var codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
  console.log('codecIndex', codecIndex);
  if (codecIndex) {
    var payload = getCodecPayloadType(sdpLines[codecIndex]);
    if (payload) {
      sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines, prefix, substr) {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
  var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
  for (var i = startLine; i < realEndLine; ++i) {
    if (sdpLines[i].indexOf(prefix) === 0) {
      if (!substr ||
          sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadType(sdpLine) {
  var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
  var result = sdpLine.match(pattern);
  return (result && result.length === 2) ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');

  // Just copy the first three parameters; codec order starts on fourth.
  var newLine = elements.slice(0, 3);

  // Put target payload first and copy in the rest.
  newLine.push(payload);
  for (var i = 3; i < elements.length; i++) {
    if (elements[i] !== payload) {
      newLine.push(elements[i]);
    }
  }
  return newLine.join(' ');
}

// query getStats every second
window.setInterval(function() {
  if (!window.pc) {
    return;
  }
  window.pc.getStats(null).then(function(res) {
    res.forEach(function(report) {
      var bytes;
      var packets;
      var now = report.timestamp;
      if ((report.type === 'outboundrtp') ||
          (report.type === 'outbound-rtp') ||
          (report.type === 'ssrc' && report.bytesSent)) {
        bytes = report.bytesSent;
        packets = report.packetsSent;
        if (lastResult && lastResult.get(report.id)) {
          // calculate bitrate
          var bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) /
              (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateSeries.addPoint(now, bitrate);
          bitrateGraph.setDataSeries([bitrateSeries]);
          bitrateGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetSeries.addPoint(now, packets -
              lastResult.get(report.id).packetsSent);
          packetGraph.setDataSeries([packetSeries]);
          packetGraph.updateEndDate();
        }
      }
    });
    lastResult = res;
  });
}, 1000);
