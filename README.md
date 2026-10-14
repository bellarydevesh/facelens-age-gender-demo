# FaceLens

FaceLens is an educational browser demo for face detection and approximate age and model gender-label estimation from a still image or webcam stream. It uses the pretrained Tiny Face Detector and AgeGenderNet models provided by [`@vladmandic/face-api`](https://github.com/vladmandic/face-api).

## Run locally

The project has no build step or local package dependencies. It loads the face analysis library and model files from jsDelivr, so an internet connection is required.

From this folder, start a local HTTP server:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>. If `py` is not available, use `python -m http.server 8000`.

Camera access requires localhost or HTTPS and browser permission. Select **Upload image** for still-image analysis or **Use camera** for live analysis. Stop the camera to release the device.

## What is implemented

- Face detection plus approximate age and model gender-class estimates for each detected face.
- Local image selection and live webcam analysis.
- Detection boxes, face count, model label scores, and visible error/status states.
- In-browser processing: selected image pixels and webcam frames are not sent to an application server. The browser does download the third-party library and model files from jsDelivr.
- No image storage, dataset training, account, or backend.

## Model and report alignment

The supplied report describes a broader Python project with OpenCV, dataset preparation, CNN training, classical ML comparisons (SVM, Random Forest, Logistic Regression, KNN), and quantitative evaluation. Those components are **not implemented in this browser prototype**. The current app integrates pretrained browser models; it does not train or compare models.

To make the report accurate for this deliverable:

1. Describe the actual implementation as a browser-based prototype using `@vladmandic/face-api`, Tiny Face Detector, and AgeGenderNet. Do not state that OpenCV, TensorFlow/Keras, scikit-learn, or Python are used by this app.
2. Treat webcam input and still-image input as implemented features. Do not claim a dataset, training pipeline, test-set accuracy, confusion matrix, or model comparison unless these are separately implemented and measured.
3. Replace example results with real observations from controlled testing. The project does not claim an accuracy score.
4. Explain that AgeGenderNet returns approximate age estimates and a limited model gender label. The label is not a determination of gender identity; predictions can be inaccurate and affected by data bias, pose, lighting, occlusion, and image quality.
5. Keep this as an educational demonstration. Do not use the output for identity, eligibility, surveillance, or other consequential decisions. Obtain appropriate consent before analyzing a person's image or using a camera.

## Checks

Validate JavaScript syntax with:

```powershell
node --check app.js
```

Then smoke-test model loading, image input, no-face handling, multiple faces, and camera start/stop in a browser. Model accuracy requires a properly licensed, representative, labeled test dataset and a defined evaluation method; it must not be inferred from a few sample images.

## Project files

- `index.html` — application markup and third-party script loading.
- `styles.css` — responsive interface.
- `app.js` — model loading, image/camera lifecycle, inference, and rendering.
