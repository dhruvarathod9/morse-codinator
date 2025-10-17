<!Morse Code 2 html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CodeChat Web</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
    input, button { padding: 10px; margin: 10px; font-size: 16px; }
    #output, #received { margin-top: 20px; font-size: 18px; }
    video { display: none; } /* camera hidden */
  </style>
</head>
<body>
  <h1>CodeChat Web</h1>
  
  <input type="text" id="textInput" placeholder="Type a message">
  <button onclick="convertToMorse()">Convert</button>
  <button onclick="playMorse()">Send (Beeps + Vibes + Torch)</button>
  <button onclick="startReceiving()">Receive (Camera)</button>
  
  <div id="output"></div>
  <div id="received"></div>
  
  <video id="video" autoplay playsinline></video>
  <canvas id="canvas" width="200" height="150" style="display:none"></canvas>
  
  <script>
    const morseMap = {
      "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".",
      "F": "..-.", "G": "--.", "H": "....", "I": "..", "J": ".---",
      "K": "-.-", "L": ".-..", "M": "--", "N": "-.", "O": "---",
      "P": ".--.", "Q": "--.-", "R": ".-.", "S": "...", "T": "-",
      "U": "..-", "V": "...-", "W": ".--", "X": "-..-", "Y": "-.--",
      "Z": "--..", " ": "/"
    };
    const reverseMap = Object.fromEntries(Object.entries(morseMap).map(([k,v]) => [v,k]));

    let morseOutput = "";
    let track, torchOn = false;

    function convertToMorse() {
      const text = document.getElementById("textInput").value.toUpperCase();
      morseOutput = text.split("").map(ch => morseMap[ch] || "").join(" ");
      document.getElementById("output").innerText = "Morse: " + morseOutput;
    }

    async function playMorse() {
      if (!morseOutput) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      if (!track) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }});
        track = stream.getVideoTracks()[0];
      }

      for (const symbol of morseOutput) {
        if (symbol === ".") {
          beep(ctx, 200); vibrate(100); await torchBlink(200);
        } else if (symbol === "-") {
          beep(ctx, 600); vibrate(300); await torchBlink(600);
        } else {
          await sleep(200);
        }
        await sleep(100);
      }
      await setTorch(false);
    }

    function beep(ctx, duration) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.start(); osc.stop(ctx.currentTime + duration / 1000);
    }
    function vibrate(ms) { if ("vibrate" in navigator) navigator.vibrate(ms); }
    async function torchBlink(duration) { await setTorch(true); await sleep(duration); await setTorch(false); }
    async function setTorch(state) {
      if (!track) return;
      try { await track.applyConstraints({ advanced: [{ torch: state }] }); torchOn = state; }
      catch(e) { console.warn("Torch not supported:", e); }
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ----------- Receive Mode -------------
    async function startReceiving() {
      const video = document.getElementById("video");
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }});
      video.srcObject = stream;

      let lightOn = false, startTime = 0, morseBuffer = "", decoded = "";

      setInterval(() => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let sum = 0;
        for (let i=0; i<frame.length; i+=4) sum += frame[i] + frame[i+1] + frame[i+2];
        const brightness = sum / (frame.length/4);
        
        const threshold = 100; // tweak if too sensitive
        const now = Date.now();

        if (brightness > threshold && !lightOn) {
          lightOn = true; startTime = now;
        } else if (brightness <= threshold && lightOn) {
          const duration = now - startTime;
          lightOn = false;
          morseBuffer += duration < 400 ? "." : "-";
        } else if (brightness <= threshold && !lightOn && now - startTime > 800 && morseBuffer) {
          decoded += reverseMap[morseBuffer] || "?";
          morseBuffer = "";
          document.getElementById("received").innerText = "Received: " + decoded;
        }
      }, 100);
    }
  </script>
</body>
</html>
