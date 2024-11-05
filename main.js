var { entrypoints } = require("uxp");
var { app, core } = require("photoshop");
var { executeAsModal } = core;
var blendModes = ['normal', 'multiply', 'screen', 'overlay', 'softLight', 'hardLight'];

entrypoints.setup({
    commands: {
       
    },
    panels: {
        vanilla: {
            show(node) {
               
            }
        }
    }
});

function checkAndAddListeners() {
    var elements = [
        { selector: '#btnEncrypt', event: 'click', handler: encryptSelectedLayers },
        { selector: '#retrieve-message', event: 'click', handler: retrieveMessage },
        { selector: '#btnPopulate', event: 'click', handler: populateLayers },
        { selector: '#importLayersButton', event: 'click', handler: importSelectedLayers },
        { selector: '#save-encrypted-image', event: 'click', handler: saveEncryptedImage }
    ];

    elements.forEach(({ selector, event, handler }) => {
        var element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`Event listener added to ${selector}`);
        } else {
            console.warn(`Warning: Element ${selector} not found. Retrying...`);
        }
    });
}

// Retry logic if elements are dynamically loaded later
function initializeListeners() {
    var retryInterval = 100;
    var maxAttempts = 10;
    let attempts = 0;

    var intervalId = setInterval(() => {
        checkAndAddListeners();

        // If all elements are found and listeners added, or max attempts reached, stop retrying
        attempts++;
        if (attempts >= maxAttempts || document.querySelector('#btnEncrypt')) {
            clearInterval(intervalId);
            console.log('Event listener initialization complete.');
        }
    }, retryInterval);
}

// Ensure DOM is fully loaded before attempting to add listeners
document.addEventListener('DOMContentLoaded', initializeListeners);

async function showAlert(message) {
    await app.showAlert(message);
}

function xorEncrypt(message, key) {
    return message.split('')
        .map((char, index) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(index % key.length)))
        .join('');
}

// binary conversions
function stringToBinary(str) {
    return Array.from(str)
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');
}

function stringToHex(str) {
    return Array.from(str).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

function hexToString(hex) {
    return hex.match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
}

async function encryptMessage(message, secretKey) {
    console.log('Encrypting message:', message, 'with key:', secretKey);

    // XOR encryption
    var encrypted = xorEncrypt(message, secretKey);
    var hexEncryptedMessage = stringToHex(encrypted);

    console.log('Encrypted Message (Hex):', hexEncryptedMessage);
    if (!message || !secretKey) {
        console.error("Error: message or secretKey is undefined.");
        return;
    }
    
    return hexEncryptedMessage;

}

async function decryptMessage(encryptedMessage, secretKey) {
    console.log('Decrypting message:', encryptedMessage, 'with key:', secretKey);

    var encryptedBinary = hexToString(encryptedMessage);
    var decrypted = xorEncrypt(encryptedBinary, secretKey);

    console.log('Decrypted Message:', decrypted);
    return decrypted;
}

async function getAllLayers() {
    var layers = [];
    var activeDocument = app.activeDocument;

    if (!activeDocument) {
        return layers;
    }

    
    async function traverseLayers(layersArray, parentPath = '') {
        for (let i = 0; i < layersArray.length; i++) {
            var layer = layersArray[i];
            var layerPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
            layers.push({ id: layer.id, name: layerPath });

            if (layer.isGroup) {
                await traverseLayers(layer.layers, layerPath);
            }
        }
    }

    await traverseLayers(activeDocument.layers);
    return layers;
}

document.addEventListener('DOMContentLoaded', populateLayers);

async function populateLayers() {
    try {
        //copy executeAsModal variable
        var layers = await executeAsModal(getAllLayers, { commandName: 'Get Layers' });
        console.log("Layers fetched:", layers);
        
        var layersContainer = document.getElementById('layers');
        layersContainer.innerHTML = ''; 
        if (layers.length === 0) {
            layersContainer.textContent = 'No layers available';
            return;
        }

        layers.forEach(layer => {
            var label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginBottom = '8px';

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = layer.id;
            checkbox.id = `layer-${layer.id}`;

            var span = document.createElement('span');
            span.textContent = layer.name;
            span.style.marginLeft = '8px';

            label.appendChild(checkbox);
            label.appendChild(span);
            layersContainer.appendChild(label);
        });
    } catch (error) {
        console.error("Error populating layers:", error);
        await showAlert("Failed to load layers. Please ensure a document is open.");
    }
}


async function embedMessageInMetadata(doc, encryptedMessage) {
    try {
        // Check if the document is active
        if (!doc) {
            console.error("No active document found. Cannot embed message.");
            await showAlert("Open a document before attempting to embed a message.");
            return;
        }

        // Attempt to initialize metadata if it doesn't exist
        if (!doc.info) {
            console.warn("doc.info is undefined; attempting to initialize.");
            doc.info = {}; // Initialize info if it doesn't exist
        }

        if (!doc.info.metadata) {
            console.warn("Metadata property is undefined; creating it.");
            doc.info.metadata = {}; // Initialize metadata if it doesn't exist
        }

        // Store the encrypted message
        doc.info.metadata.customData = encryptedMessage;
        console.log("Encrypted message stored in metadata:", encryptedMessage);

    } catch (error) {
        console.error("Error embedding message in metadata:", error);
        await showAlert("Failed to embed the message in metadata.");
    }
}


// Function to store the encrypted message in document metadata
async function storeEncryptedMessageInMetadata(doc, encryptedMessage, key) {
    var binaryMessage = stringToBinary(encryptedMessage) + '00000000';
    var encryptedMessage = xorEncrypt(message, key); // Encrypt the message
    doc.info.metadata = encryptedMessage; // Store encrypted message in metadata
    console.log("Encrypted message stored in metadata:", encryptedMessage);
}

// Function to retrieve and decrypt the message from document metadata
async function retrieveEncryptedMessageFromMetadata(doc, key) {
    var encryptedMessage = doc.info.metadata; // Retrieve encrypted message from metadata
    var decryptedMessage = xorEncrypt(encryptedMessage, key); // Decrypt using XOR method
    console.log("Decrypted message retrieved from metadata:", decryptedMessage);
    return decryptedMessage;
}

async function importSelectedLayers() {
    var selectedLayerIds = Array.from(document.querySelectorAll('#layers input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.value));


    if (selectedLayerIds.length === 0) {
        await showAlert("No layers selected! Please select layers to encrypt.");
        return;
    }

    var encryptionKey = document.getElementById('encryption-key').value;
    var secretMessage = document.getElementById('secret-message').value;

    if (!encryptionKey || !secretMessage) {
        await showAlert("Please enter both an encryption key and a secret message.");
        return;
    }

    await encryptSelectedLayers(selectedLayerIds, encryptionKey, secretMessage);
}

//pause

async function retrieveMessage() {
    // Retrieves the secret key
    var secretKey = document.querySelector('#secret-key').value;
    if (!secretKey) {
        await showAlert("Please enter the secret key.");
        return;
    }

    // Checks if there's an active document
    var activeDocument = app.activeDocument;

    if (activeDocument) {
        // Retrieves the encrypted message from the document's metadata
        var encryptedMessage = activeDocument.info.metadata;
        
        if (!encryptedMessage) {
            await showAlert("No hidden message found in metadata.");
            return;
        }

        // Decrypts the message using the provided secret key
        var decryptedMessage = await decryptMessage(encryptedMessage, secretKey);

        // Displays the decrypted message if successful
        if (decryptedMessage) {
            await showAlert(`Decoded Message: ${decryptedMessage}`);
        } else {
            await showAlert("Failed to decrypt the message. Please check the secret key.");
        }
    } else {
        await showAlert("No active document to retrieve the message from.");
    }
}

async function encryptSelectedLayers() {
    var selectedLayerIds = Array.from(document.querySelectorAll('#layers input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (selectedLayerIds.length === 0) {
        await showAlert('Please select at least one layer to encrypt.');
        return;
    }

    // Check and assign variables
    var encryptionKey = document.getElementById('encryption-key').value;
    var secretMessage = document.getElementById('secret-message').value;

    if (!encryptionKey || !secretMessage) {
        await showAlert('Please enter both an encryption key and a secret message.');
        return;
    }

    try {
        // Encrypt message and store result
        var encryptedMessage = await encryptMessage(secretMessage, encryptionKey);
        if (!encryptedMessage) throw new Error("Encryption failed due to undefined encryptedMessage.");

        await executeAsModal(async () => {
            var activeDocument = app.activeDocument;
            await embedMessageInMetadata(activeDocument, encryptedMessage);
        }, { commandName: 'Store Encrypted Message in Metadata' });

        await showAlert('Message has been encrypted and stored in document metadata successfully.');
    } catch (error) {
        console.error("Error during encryption:", error);
        await showAlert("Failed to encrypt and store message.");
    }

    await storeEncryptedMessageInMetadata(doc, encryptedMessage, key);
}


async function encodeMessageInBlendModes(layers, message, key) {
    var encryptedMessage = xorEncrypt(message, key);
    var hexMessage = stringToHex(encryptedMessage);

    if (hexMessage.length > layers.length) {
        // If not enough layers, notify the user and truncate the message
        await showAlert(`Message too long for the selected layers. Truncating to fit ${layers.length} layers.`);
        hexMessage = hexMessage.substring(0, layers.length);
    }

    for (let i = 0; i < hexMessage.length; i++) {
        let hexDigit = parseInt(hexMessage[i], 16);
        let blendModeIndex = hexDigit % blendModes.length;

        if (layers[i]) {
            await executeAsModal(async () => {
                layers[i].blendMode = blendModes[blendModeIndex];
                console.log(`Set blend mode of layer ${layers[i].name} to ${blendModes[blendModeIndex]} for hex digit ${hexDigit}`);
            });
        } else {
            console.warn("Not enough layers to encode message.");
            break;
        }
    }
    await showAlert("Message encoded in layer blending modes.");
}

document.getElementById('save-encrypted-image').addEventListener('click', saveEncryptedImage);
async function saveEncryptedImage() {
    console.log('log status');
    var activeDocument = app.activeDocument;

    if (activeDocument) {
        
        var saveOptions = new core.SavePNGOptions();

        
        var saveLocation = await core.getFileForSaving({
            types: ["png"],
            initialFilename: "encrypted-image.png"
        });

        if (!saveLocation) {
            // User canceled the save dialog womp womp
            return;
        }

        try {
            
            await activeDocument.saveAs(saveLocation, saveOptions);

            await showAlert('Image with encrypted message has been saved successfully.');
        } catch (error) {
            console.error("Error saving image:", error);
            await showAlert("Failed to save the image.");
        }
    } else {
        await showAlert('No active document to save.');
    }
}

// Convert string to binary for embedding
function stringToBinary(str) {
    return Array.from(str).map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
}

// Export the document as PNG
//Value must be read. WIP.
var uxp = require('uxp');
var storage = uxp.storage;

async function exportAsPNGWithBlendModeEncoding(doc, message, key) {
    debugger;
    try {
        console.log("Starting exportAsPNGWithBlendModeEncoding...");
        console.log("Document name:", doc.name);

        // Retrieve layers and encode message
        var layers = await getAllLayers();
        console.log("Layers retrieved:", layers);
        await encodeMessageInBlendModes(layers, message, key);
        console.log("Message encoding complete.");

        // Select save location
        var saveFile = await storage.localFileSystem.getFileForSaving("exported_image_with_encryption.png");
        if (!saveFile) {
            console.warn("Save operation was canceled.");
            await showAlert("Save operation was canceled.");
            return;
        }

        // Use executeAsModal to save PNG without SaveOptions
        await require("photoshop").core.executeAsModal(async () => {
            await doc.saveAs.png(saveFile); // Save as PNG using default options
        });

        console.log("Exported as PNG to:", saveFile.nativePath);
        await showAlert("Image with encrypted message saved successfully.");

    } catch (error) {
        console.error("Error during PNG export with blend mode encoding:", error);
        await showAlert("Error exporting PNG: " + error.message);
    }
}

document.getElementById('save-encrypted-image').addEventListener('click', async () => {
    var activeDocument = app.activeDocument;
    var encryptionKey = document.getElementById('encryption-key').value;
    var secretMessage = document.getElementById('secret-message').value;

    if (activeDocument && encryptionKey && secretMessage) {
        await exportAsPNGWithBlendModeEncoding(activeDocument, secretMessage, encryptionKey);
    } else {
        await showAlert("Please ensure a document is open and both encryption key and secret message are provided.");
    }
});