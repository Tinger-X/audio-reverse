let mediaRecorder,
  audioContext,
  originalBlob,
  originalBuffer,
  reversedBuffer,
  audioRecording = false,
  audioSource = null,
  audioType = null;

const recordBtn = document.querySelector("#recordBtn"),
  recordTxt = document.querySelector("#recordText"),
  buttonGroup = document.querySelector("#buttonGroup"),
  playRawBtn = document.querySelector("#playRawBtn"),
  playRevBtn = document.querySelector("#playRevBtn"),
  downloadRawBtn = document.querySelector("#downloadRawBtn"),
  downloadRevBtn = document.querySelector("#downloadRevBtn"),
  audioUpload = document.querySelector("#audioUpload"),
  statusDiv = document.querySelector("#status"),
  clearBtn = document.querySelector("#clearBtn");

// 录音功能
recordBtn.addEventListener("click", async () => {
  if (audioRecording) {
    // 录音完成
    mediaRecorder.stop();
    recordBtn.classList.remove("active");
    recordTxt.textContent = "开始录音";
    statusDiv.textContent = "🪄 处理音频中...";
    audioRecording = false;
    return;
  }
  // 开始录音，先停止正在播放的音频
  clearPlay();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    let audioChunks = [];
    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      originalBlob = new Blob(audioChunks, { type: "audio/webm" });
      await processAudio(originalBlob);
    };

    mediaRecorder.start();
    audioRecording = true;
    recordTxt.textContent = "停止录音";
    recordBtn.classList.add("active");
    buttonGroup.classList.add("hide");
    clearBtn.classList.add("hide");
    statusDiv.textContent = "🎶 正在录音...";
  } catch (err) {
    statusDiv.textContent = "🚫 无法访问麦克风";
    console.log(err);
  }
});

// 处理音频数据（通用处理函数）
async function processAudio(blob) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
    reversedBuffer = reverseAudio(originalBuffer);

    buttonGroup.classList.remove("hide");
    clearBtn.classList.remove("hide");
    statusDiv.textContent = `💯 就绪：${originalBuffer.duration.toFixed(2)} 秒音频`;
  } catch (err) {
    statusDiv.textContent = "😵‍💫 音频处理失败";
    console.error(err);
  }
}

// 通用音频倒转函数
function reverseAudio(buffer) {
  const revBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel);
    const reversedData = revBuffer.getChannelData(channel);

    for (let i = 0; i < originalData.length; i++) {
      reversedData[i] = originalData[originalData.length - 1 - i];
    }
  }
  return revBuffer;
}

// 定义格式化封装函数
function formatTime(time) {
  const year = time.getFullYear()
  const month = time.getMonth() + 1 // 由于月份从0开始，因此需加1
  const day = time.getDate()
  const hour = time.getHours()
  const minute = time.getMinutes()
  const second = time.getSeconds()
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}_${pad(hour)}-${pad(minute)}-${pad(second)}`
}

function pad(timeEl, total = 2, str = "0") {
  return timeEl.toString().padStart(total, str)
}

// 下载功能
downloadRawBtn.addEventListener("click", () => {
  if (!originalBlob) return;
  saveAs(originalBlob, `raw-${formatTime(new Date())}.wav`);
});

downloadRevBtn.addEventListener("click", () => {
  if (!reversedBuffer) return;
  const wavBlob = audioBufferToWav(reversedBuffer);
  saveAs(wavBlob, `rev-${formatTime(new Date())}.wav`);
});

// 上传功能
audioUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    statusDiv.textContent = "🪄 处理上传文件中...";
    originalBlob = file;
    await processAudio(file);
  } catch (err) {
    statusDiv.textContent = "😵‍💫 文件处理失败";
    console.error(err);
  }
});

function playAudio(buffer, type, callBack) {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.onended = callBack;
  source.connect(audioContext.destination);
  source.start();
  audioSource = source;
  audioType = type;
}

function clearPlay() {
  if (audioSource === null) return;
  console.log("clearPlay", audioType);
  audioSource.onended = null;
  audioSource.stop();
  audioSource = null;
  audioType = null;
  playRawBtn.textContent = "▶️ 播放原始音频";
  playRevBtn.textContent = "▶️ 播放反转音频";
}

// 播放功能
playRawBtn.addEventListener("click", () => {
  if (!originalBuffer) return;

  if (audioSource) {
    // 有音频正在播放，先暂停并清除事件
    const type = audioType;
    clearPlay();

    if (type === "raw") {
      // 播放的是原始音频，更新UI后返回，不播放音频
      statusDiv.textContent = "⏸️ 原始音频已暂停";
      return;
    }
  }
  // 没有音频正在播放（或已暂停播放反转音频），更新UI并播放原始音频
  playRawBtn.textContent = "⏸️ 暂停音频播放";
  statusDiv.textContent = "🎧️ 原始音频播放中...";
  playAudio(originalBuffer, "raw", () => {
    clearPlay();
    statusDiv.textContent = "✅️ 原始音频播放完成";
  });
});
playRevBtn.addEventListener("click", () => {
  if (!reversedBuffer) return;

  if (audioSource) {
    // 有音频正在播放，先暂停并清除事件
    const type = audioType;
    clearPlay();

    if (type === "rev") {
      // 播放的是倒转音频，仅更新UI
      statusDiv.textContent = "⏸️ 倒转音频已暂停";
      return;
    }
  }
  // 没有音频正在播放（或已暂停播放原始音频），更新UI并播放倒转音频
  playRevBtn.textContent = "⏸️ 暂停音频播放";
  statusDiv.textContent = "🎧️ 倒转音频播放中...";
  playAudio(reversedBuffer, "rev", () => {
    clearPlay();
    statusDiv.textContent = "✅️ 倒转音频播放完成";
  });
});

// 清除音频功能
clearBtn.addEventListener("click", () => {
  originalBlob = null;
  originalBuffer = null;
  reversedBuffer = null;
  audioRecording = false;
  clearPlay();

  audioUpload.value = "";
  buttonGroup.classList.add("hide");
  clearBtn.classList.add("hide");
  statusDiv.textContent = "🚀 准备就绪";
});

// 工具函数：保存文件
function saveAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 工具函数：AudioBuffer转WAV
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const bufferSize = 44 + length * blockAlign;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // 写入WAV头部
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + length * blockAlign, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, length * blockAlign, true);

  // 写入PCM数据
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}