# Introduction

Hello, and thank you for downloading! Belladonna is an Adobe Photoshop plugin designed to protect digital artworks from unauthorized AI model training. Working on both the layer blending modes and the alpha channel of your PNG, this plugin aims to protect your images by embedding encrypted layers and imperceptible watermarks in the file type. Despite not altering the appearance of your work, the encryption provides an extra layer of security against stable diffusion training.
How this works:

The Belladonna plugin utilizes low-level bit manipulation and blend mode encryption to implement "noise" into selected layers. In addition, encryption pretaining to your message and secret key are embedded into the PNG's metadata. This renders the image incomprehensible to neural networks that intepret imagery based off of encoded data.

## Compatibility

Since Photoshop 23.5.5

## Getting Started

1 - Clone the repository and navigate to the root folder.
2 - Install necessary dependencies.
3 - Load the plugin in Adobe Photoshop, ensuring that your version is up-to-date. 
4 - Run the plugin and select the layers to encrypt.


## Documentation

