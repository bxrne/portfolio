---
title: "APT_SAHI"
description: "Framework agnostic sliced/tiled inference + interactive ui + error analysis plots adjusted for roc_tracking_cnn"
date: "Mar 18 2022"
demoURL:  "https://github.com/provizio/apt_sahi"
repoURL: "https://github.com/provizio/apt_sahi"
---

I adapted the sliding tiled inference framework for small object detection to support the ONNX runtime for the model type we were using for Radar based vision for Autonomous vehicles at Provizio. This allowed the image to be divided up and inference performed in parallel while also performing inference on overall image for better recognition of far-away objects.
