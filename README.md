# Introduction

Hello, and thank you for downloading! Belladonna is an Adobe Photoshop plugin designed to protect digital artworks from unauthorized AI model training. Working on both the RGB layer and alpha channel of your PNG, this plugin aims to protect your images by embedding encrypted layers and imperceptible watermarks in the file type. This is done with the intent to prevent AI systems from easily scraping and learning from the content.

How this works:

The Belladonna plugin utilizes low-level bit manipulation and AES-256 encryption to inject imperceptible "noise" into selected layers. This renders the image unusable for machine learning without affecting the human viewer's experience.

## Compatibility

Since Photoshop 23.5.5

## Getting Started

1 - Clone the repository and navigate to the root folder.
2 - Install necessary dependencies.
3 - Load the plugin in Adobe Photoshop, ensuring that your version is up-to-date. 
4 - Run the plugin and select the layers to encrypt.


## Documentation

