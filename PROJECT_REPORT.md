# FaceLens: Browser-Based Face Detection and Age/Gender Estimation

## Abstract

FaceLens is an educational browser application that detects faces in a user-selected image or live webcam stream and displays approximate age estimates and the gender labels produced by a pretrained model. It uses the Tiny Face Detector and AgeGenderNet from `@vladmandic/face-api`. Inference runs in the user's browser; the project does not provide an application server, train a model, or store selected images.

The application demonstrates a small end-to-end computer-vision workflow: acquire an image or camera frame, detect faces, run pretrained attribute estimators, and render the resulting boxes and estimates. The outputs are fallible model predictions, not verified facts. This report describes the implementation that exists in this repository and does not claim unmeasured predictive performance.

## 1. Introduction

Facial image analysis combines image processing and machine-learning inference. Face detection locates candidate face regions; an attribute model can then estimate selected properties from each region. FaceLens is a browser-based demonstration of that workflow, intended for learning and interface prototyping.

The demonstration is not an identity system and does not determine a person's gender identity. Age estimates and gender labels can be wrong, reflect limitations or bias in the pretrained model, and vary with pose, lighting, occlusion, image quality, and model domain.

### 1.1 Aim

Provide a simple browser interface for trying face detection and pretrained age and model gender-label estimation on a still image or webcam stream.

### 1.2 Objectives

- Load a browser-compatible face detector and age/gender model.
- Accept a local image or an explicitly enabled webcam stream.
- Display face boxes, approximate age estimates, model gender labels, and label scores.
- Handle model-loading failures, unreadable images, camera denial, and no-face results without crashing.
- Clearly communicate privacy behavior and model limitations.

### 1.3 Scope and non-goals

The implemented scope is browser inference using pretrained models. It does not include a training pipeline, a labeled dataset, model fine-tuning, classical ML baselines, a Python backend, a desktop interface, or a quantitative model evaluation. These are possible future project extensions, not current features.

## 2. System analysis

### 2.1 Functional requirements

1. The page reports when its models are loading, ready, or unavailable.
2. The user can select an image in a supported browser format.
3. The user can request camera access, analyze frames, and stop the camera.
4. The application detects zero or more faces and shows a result for each detected face.
5. The application displays an explicit no-face state and reports recoverable input, model, and camera errors.

### 2.2 Non-functional requirements

- Run as a static web application in a modern browser.
- Do not send image pixels or camera frames to an application server.
- Avoid persistent storage of the selected image.
- Keep estimates and limitations visible to the user.
- Fail visibly when third-party model resources cannot be loaded.

### 2.3 Runtime requirements

- A modern browser with JavaScript and Canvas support.
- An internet connection to retrieve the face-analysis script and pretrained model files from jsDelivr.
- A local HTTP server or HTTPS origin. Webcam use also requires browser permission and a secure context; `localhost` is suitable for development.
- Webcam hardware is optional; still-image analysis does not require a camera.

## 3. System design

### 3.1 Architecture

```text
Browser page
  ├── HTML interface (index.html)
  ├── Styles and responsive layout (styles.css)
  └── Application logic (app.js)
        ├── @vladmandic/face-api from jsDelivr
        ├── Tiny Face Detector model files from jsDelivr
        └── AgeGenderNet model files from jsDelivr
```

There is no project backend. The browser fetches the library and model assets from the configured CDN. Image pixels and camera frames are processed locally by the browser application.

### 3.2 Processing workflow

```text
Choose image OR grant camera permission
            ↓
Load image / receive video frame
            ↓
Tiny Face Detector finds face regions
            ↓
AgeGenderNet estimates age and model gender label per face
            ↓
Draw face boxes and show estimates and label scores
```

For live video, inference is repeated with a delay between frames to limit work. Stopping the camera stops the media tracks.

### 3.3 User interface

The page has an image/camera viewer, model status, upload and camera controls, a detection list, a face count, and an estimate/consent notice. The interface supports narrow screens and reports empty, loading, and error states.

## 4. Implementation

### 4.1 Modules

- `index.html`: semantic page structure and third-party script/style references.
- `styles.css`: layout, responsive behavior, visual states, and accessible focus styling.
- `app.js`: model initialization, input validation, image and camera lifecycle, inference, result rendering, and error messaging.
- `README.md`: local setup and concise usage instructions.

### 4.2 Models and predictions

Face detection uses `TinyFaceDetector` with configured input sizes and score thresholds. `AgeGenderNet` supplies an approximate numerical age estimate and one of its model gender classes with a class score. The UI rounds age to a whole number and displays the gender-label score as a percentage.

The displayed score is the model output associated with its gender class. It is not a guarantee of correctness or a calibrated probability. No age confidence interval is computed.

### 4.3 Input handling and privacy

Selected images are opened from a local object URL and analyzed in the browser. The application does not upload or persist their pixel data. The user can explicitly start a webcam stream; its tracks are stopped when the user selects another image, stops the camera, or leaves the page.

The browser does make network requests to download the third-party library and model files. This project has no server endpoint that receives the selected image or webcam frames. Users should analyze images only with appropriate consent.

## 5. Testing and observed results

### 5.1 Verification performed

- Opened the application through a local HTTP server and confirmed that the interface rendered.
- Confirmed that the face-analysis library and required models loaded in the test browser with network access.
- Uploaded a generated, non-face test image; the application completed inference and displayed “No faces found” with a face count of zero.
- Confirmed JavaScript execution through the browser runtime. A standalone `node --check` command was unavailable in the development environment because Node.js was not installed.

### 5.2 Not measured or verified

No labeled evaluation dataset or ground-truth protocol is included. Therefore, accuracy, precision, recall, F1-score, confusion matrices, demographic performance, and inference benchmarks are not available and must not be claimed. Positive face predictions, multiple-face cases, and webcam permission/start/stop behavior require additional browser testing with suitable test inputs and hardware.

The smoke test verifies a basic execution path only; it does not establish model accuracy, fairness, or suitability for real-world decisions.

## 6. Limitations, responsible use, and future work

### 6.1 Limitations

- Model quality and class definitions are inherited from the selected pretrained models and their training data.
- Estimates can be affected by image quality, pose, lighting, occlusion, face size, dataset coverage, and demographic bias.
- The gender output is a limited model class and does not represent gender identity.
- The application needs internet access for its CDN-hosted code and model files.
- Performance depends on the browser and device.
- The current project has no training, dataset-management, or quantitative evaluation subsystem.

### 6.2 Responsible use

This application is an educational demonstration only. Do not use its estimates for identity verification, surveillance, eligibility, access control, employment, health care, or other consequential decisions. Obtain appropriate consent before analyzing a person's image or camera feed.

### 6.3 Future work

Potential extensions include adding automated tests for input and UI states, testing camera behavior across supported browsers, packaging models for offline use, and building a separately scoped training/evaluation pipeline. Any model-performance claims would require a licensed and representative dataset, held-out evaluation, documented label definitions, and class-wise analysis.

## 7. Corrections to the supplied draft report

The supplied draft describes functionality that is not present in this repository. For an accurate report:

- Replace claims about Python, OpenCV, TensorFlow/Keras, scikit-learn, and Jupyter implementation with the browser stack documented above.
- Do not describe CNN training, dataset collection/cleaning, augmentation, model comparison, or test-set metrics as completed work.
- Treat webcam analysis as an implemented feature, but state that camera hardware and permission behavior still need environment-specific verification.
- Do not include invented accuracy values, confusion matrices, or sample predictions. Record measured results only after a documented evaluation.
- Describe the output as approximate age and limited model gender-class estimates, not definitive demographic facts.

## References

1. `@vladmandic/face-api`, browser face detection and age/gender analysis library: <https://github.com/vladmandic/face-api>.
2. CDN script and model base used by this application: <https://cdn.jsdelivr.net/npm/@vladmandic/face-api/>.
