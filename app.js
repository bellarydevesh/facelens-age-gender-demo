(() => {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  const DETECTION_INTERVAL_MS = 650;

  const elements = {
    status: document.getElementById('model-status'),
    statusText: document.getElementById('status-text'),
    upload: document.getElementById('image-upload'),
    cameraButton: document.getElementById('camera-button'),
    stopCameraButton: document.getElementById('stop-camera-button'),
    emptyState: document.getElementById('empty-state'),
    stage: document.getElementById('media-stage'),
    image: document.getElementById('source-image'),
    video: document.getElementById('camera-video'),
    canvas: document.getElementById('overlay'),
    shade: document.getElementById('analysis-shade'),
    analysisMessage: document.getElementById('analysis-message'),
    results: document.getElementById('results-list'),
    count: document.getElementById('face-count'),
    toast: document.getElementById('toast')
  };

  let modelsLoaded = false;
  let cameraStream = null;
  let imageUrl = null;
  let analysisRun = 0;
  let cameraFrame = 0;
  let lastDetections = [];
  let toastTimer = 0;
  let resizeObserver = null;

  function setStatus(message, state = '') {
    elements.statusText.textContent = message;
    elements.status.classList.remove('ready', 'error');
    if (state) elements.status.classList.add(state);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 5000);
  }

  function setBusy(busy, message = 'Analyzing faces…') {
    elements.shade.hidden = !busy;
    elements.analysisMessage.textContent = message;
  }

  function emptyResults(message = 'Results will appear here once a face is detected.') {
    elements.count.textContent = '0';
    elements.results.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'results-empty';
    const symbol = document.createElement('span');
    symbol.className = 'results-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = '◎';
    const text = document.createElement('p');
    text.textContent = message;
    empty.append(symbol, text);
    elements.results.append(empty);
  }

  function clearCanvas() {
    const context = elements.canvas.getContext('2d');
    context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  }

  function showStage(media) {
    elements.emptyState.hidden = true;
    elements.stage.hidden = false;
    elements.image.hidden = media !== 'image';
    elements.video.hidden = media !== 'video';
    elements.stage.dataset.media = media;
  }

  function activeMedia() {
    return elements.stage.dataset.media === 'video' ? elements.video : elements.image;
  }

  function setupCanvas() {
    const media = activeMedia();
    const rect = media.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (!width || !height) return false;
    elements.canvas.width = width;
    elements.canvas.height = height;
    redrawDetections();
    return true;
  }

  function redrawDetections() {
    const media = activeMedia();
    const context = elements.canvas.getContext('2d');
    context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    if (!lastDetections.length || !elements.canvas.width || !elements.canvas.height) return;

    const naturalSize = elements.stage.dataset.media === 'video'
      ? { width: media.videoWidth, height: media.videoHeight }
      : { width: media.naturalWidth, height: media.naturalHeight };
    if (!naturalSize.width || !naturalSize.height) return;

    const resized = faceapi.resizeResults(lastDetections, {
      width: elements.canvas.width,
      height: elements.canvas.height
    });

    context.lineWidth = Math.max(2, elements.canvas.width / 450);
    context.font = '600 13px "DM Sans", sans-serif';
    resized.forEach((result) => {
      const { x, y, width, height } = result.detection.box;
      const label = `${result.gender} · ${Math.round(result.age)} yrs`;
      const labelWidth = context.measureText(label).width + 16;
      const labelY = Math.max(0, y - 28);
      context.strokeStyle = '#9db5ff';
      context.fillStyle = 'rgba(11, 16, 32, .88)';
      context.beginPath();
      context.roundRect(x, y, width, height, 7);
      context.stroke();
      context.fillRect(x, labelY, labelWidth, 23);
      context.fillStyle = '#f3f5fb';
      context.fillText(label, x + 8, labelY + 16);
    });
  }

  function renderResults(detections) {
    lastDetections = detections;
    elements.count.textContent = String(detections.length);
    elements.results.replaceChildren();
    if (!detections.length) {
      emptyResults('No faces found. Try a clear, front-facing photo with good lighting.');
      return;
    }

    detections.forEach((result, index) => {
      const card = document.createElement('article');
      card.className = 'result-card';

      const person = document.createElement('div');
      person.className = 'result-person';
      const number = document.createElement('span');
      number.className = 'face-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const label = document.createElement('div');
      label.className = 'result-label';
      const gender = document.createElement('strong');
      gender.textContent = `Model label: ${result.gender}`;
      const confidence = document.createElement('span');
      confidence.textContent = `Label score: ${Math.round(result.genderProbability * 100)}%`;
      label.append(gender, confidence);
      person.append(number, label);

      const age = document.createElement('div');
      age.className = 'result-age';
      age.textContent = String(Math.round(result.age));
      const ageCaption = document.createElement('span');
      ageCaption.textContent = 'estimated years';
      age.append(ageCaption);

      card.append(person, age);
      elements.results.append(card);
    });
    redrawDetections();
  }

  async function loadModels() {
    try {
      if (!window.faceapi) throw new Error('The face analysis library did not load. Check your internet connection and reload.');
      setStatus('Loading face detector…');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setStatus('Loading age and gender model…');
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
      modelsLoaded = true;
      elements.cameraButton.disabled = false;
      setStatus('Models ready', 'ready');
    } catch (error) {
      console.error('Could not load face analysis models:', error);
      setStatus('Model loading failed', 'error');
      showToast(error instanceof Error ? error.message : 'Could not load the browser models.');
    }
  }

  async function analyzeImage() {
    const run = ++analysisRun;
    setBusy(true);
    emptyResults('Analyzing the selected image…');
    lastDetections = [];
    clearCanvas();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setupCanvas();
    try {
      const detections = await faceapi.detectAllFaces(
        elements.image,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.45 })
      ).withAgeAndGender();
      if (run !== analysisRun) return;
      setBusy(false);
      renderResults(detections);
    } catch (error) {
      if (run !== analysisRun) return;
      console.error('Image analysis failed:', error);
      setBusy(false);
      showToast('Analysis failed. Try another image or reload the page.');
      emptyResults('Analysis could not be completed.');
    }
  }

  function releaseImageUrl() {
    if (!imageUrl) return;
    URL.revokeObjectURL(imageUrl);
    imageUrl = null;
  }

  async function onImageSelected(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Choose a supported image file.');
      return;
    }
    if (!modelsLoaded) {
      showToast('Wait for the models to finish loading before selecting an image.');
      return;
    }

    stopCamera();
    ++analysisRun;
    lastDetections = [];
    clearCanvas();
    setBusy(true, 'Preparing image…');
    emptyResults('Preparing the selected image…');
    showStage('image');
    releaseImageUrl();
    imageUrl = URL.createObjectURL(file);

    elements.image.onload = () => {
      setBusy(false);
      setupCanvas();
      analyzeImage();
    };
    elements.image.onerror = () => {
      setBusy(false);
      showToast('This image could not be opened. Choose a different file.');
      emptyResults('The selected image could not be opened.');
      releaseImageUrl();
    };
    elements.image.src = imageUrl;
  }

  async function detectCameraFrame(run) {
    if (run !== cameraFrame || !cameraStream || elements.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    try {
      const detections = await faceapi.detectAllFaces(
        elements.video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      ).withAgeAndGender();
      if (run !== cameraFrame || !cameraStream) return;
      setBusy(false);
      renderResults(detections);
    } catch (error) {
      if (run !== cameraFrame) return;
      console.error('Camera analysis failed:', error);
      showToast('Camera analysis failed. Stop the camera and try again.');
      stopCamera();
      return;
    }
    window.setTimeout(() => {
      if (run === cameraFrame) requestAnimationFrame(() => detectCameraFrame(run));
    }, DETECTION_INTERVAL_MS);
  }

  async function startCamera() {
    if (!modelsLoaded || cameraStream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera access is unavailable. Open the app from localhost or a secure HTTPS page.');
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      showStage('video');
      elements.video.srcObject = cameraStream;
      await elements.video.play();
      elements.cameraButton.hidden = true;
      elements.stopCameraButton.hidden = false;
      setBusy(true, 'Starting camera…');
      emptyResults('Looking for faces…');
      lastDetections = [];
      setupCanvas();
      const run = ++cameraFrame;
      requestAnimationFrame(() => detectCameraFrame(run));
    } catch (error) {
      console.error('Could not start camera:', error);
      stopCamera();
      showToast(error instanceof Error && error.name === 'NotAllowedError'
        ? 'Camera access was denied. Allow camera permission in your browser to continue.'
        : 'Could not start the camera. Check that a camera is connected and available.');
      elements.emptyState.hidden = false;
      elements.stage.hidden = true;
      setBusy(false);
    }
  }

  function stopCamera() {
    ++cameraFrame;
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    elements.video.pause();
    elements.video.srcObject = null;
    elements.cameraButton.hidden = false;
    elements.stopCameraButton.hidden = true;
    if (elements.stage.dataset.media === 'video') {
      elements.stage.hidden = true;
      elements.emptyState.hidden = false;
      setBusy(false);
      clearCanvas();
      lastDetections = [];
      emptyResults();
    }
  }

  elements.upload.addEventListener('change', onImageSelected);
  elements.cameraButton.addEventListener('click', startCamera);
  elements.stopCameraButton.addEventListener('click', stopCamera);
  window.addEventListener('pagehide', () => {
    stopCamera();
    releaseImageUrl();
  });
  window.addEventListener('resize', () => {
    if (!elements.stage.hidden) setupCanvas();
  });

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      if (!elements.stage.hidden) setupCanvas();
    });
    resizeObserver.observe(elements.stage);
  }

  emptyResults();
  loadModels();
})();
