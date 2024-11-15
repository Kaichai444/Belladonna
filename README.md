# Introduction

Hello, and thank you for downloading! Belladonna is an Adobe Photoshop plugin designed to protect digital artworks from unauthorized AI model training. Working on both the layer blending modes and the alpha channel of your PNG, this plugin aims to protect your images by embedding encrypted layers and imperceptible watermarks in the file type. Despite not altering the appearance of your work, the encryption provides an extra layer of security against stable diffusion training.
How this works:

The Belladonna plugin utilizes low-level XOR and blend mode encryption to implement noise into selected layers. In addition, encryption pretaining to your message and secret key are embedded into the PNG's metadata. This helps to ensure that if the image ever were to be scraped, the unique message and secret key can be decrypted to verify authorship or provide traceability. The process does not visually alter your work but introduces subtle, imperceptible distortions within the data structure, making it difficult for unauthorized AI models to parse and utilize the image for training purposes. Here's a breakdown of how Belladonna achieves this:

1. Layer Encryption
  Belladonna applies XOR encryption at the pixel level to selected layers, mixing these with noise patterns derived from the secret key. This creates an additional level of obfuscation for sensitive elements of your artwork. The encrypted layers are blended seamlessly into the original composition to preserve its appearance.

2. Alpha Channel Obfuscation
  The plugin embeds encrypted noise into the alpha channel, which influences the transparency information in a way that is imperceptible to the human eye but disrupts typical AI preprocessing pipelines.

3. Metadata Watermarking
  Each exported PNG file includes a steganographically embedded unique message and secret key in its metadata. This metadata acts as a cryptographic fingerprint, allowing creators to verify ownership or detect unauthorized use. The steganographic technique ensures that these identifiers are hidden within the file's structure without altering its external properties.

4. Compatibility and Usability
   Belladonna integrates seamlessly with the latest version of Adobe Photoshop, enabling artists to protect their files without altering their workflow. Exporting protected PNG files is as simple as selecting the Belladonna export option, ensuring that the additional encryption processes are intuitive and non-intrusive.

5. Anti-Scraping Design
  Files exported with Belladonna are engineered to resist AI scraping and training processes. The encryption disrupts key features AI models rely on for pattern recognition, while the embedded watermarks offer a forensic tool to identify the file's origin if it is misused.



## Compatibility

Since Photoshop 23.5.5

## Getting Started

1 - Download the .ccx file from Github.

2 - Bring the file over to /Library/Application Support/Adobe/UXP/Plugins/External. If the "External" folder does not exist, create it manually within "Plugins".

3 - Load the plugin in Adobe Photoshop, ensuring that your version is up-to-date.

4 - Run the plugin by going to the "Plugins" menu within Photoshop.

5 - Encrypt your files, add some distortion, and save to your machine.


## Documentation

