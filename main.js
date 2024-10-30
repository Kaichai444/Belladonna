var { entrypoints } = require("uxp");
var { app, core } = require("photoshop");
var { executeAsModal } = core;

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
    const elements = [
        { selector: '#btnEncrypt', event: 'click', handler: encryptSelectedLayers },
        { selector: '#retrieve-message', event: 'click', handler: retrieveMessage },
        { selector: '#btnPopulate', event: 'click', handler: populateLayers },
        { selector: '#importLayersButton', event: 'click', handler: importSelectedLayers },
        { selector: '#save-encrypted-image', event: 'click', handler: saveEncryptedImage }
    ];

    elements.forEach(({ selector, event, handler }) => {
        const element = document.querySelector(selector);
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
    const retryInterval = 100;
    const maxAttempts = 10;
    let attempts = 0;

    const intervalId = setInterval(() => {
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

function binaryToString(binary) {
    var binaryArr = binary.match(/.{1,8}/g);
    return binaryArr ? binaryArr.map(byte => String.fromCharCode(parseInt(byte, 2))).join('') : '';
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
    const encrypted = xorEncrypt(message, secretKey);
    const hexEncryptedMessage = stringToHex(encrypted);

    console.log('Encrypted Message (Hex):', hexEncryptedMessage);
    return hexEncryptedMessage;
}

async function decryptMessage(encryptedMessage, secretKey) {
    console.log('Decrypting message:', encryptedMessage, 'with key:', secretKey);

    const encryptedBinary = hexToString(encryptedMessage);
    const decrypted = xorEncrypt(encryptedBinary, secretKey);

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

function derivePoisonLevel(key) {
    
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    var poisonLevel = Math.abs(hash) % 100 + 1; 
    return poisonLevel;
}

async function getLayerPixelData(layer) {
    try {
        var pixelData = await layer.getPixelData();
        return pixelData; // Return the pixel data for further processing
    } catch (error) {
        console.error(`Failed to retrieve pixel data for layer ${layer.name}:`, error);
        throw error; // Propagate the error for handling upstream
    }
}


async function embedMessageInLayer(layer, encryptedMessage) {
    var binaryMessage = stringToBinary(encryptedMessage) + '00000000'; 
    var pixels = layer.pixelData;

    for (let i = 0, j = 0; i < pixels.length && j < binaryMessage.length; i += 4) {
        let red = pixels[i];
        let alpha = pixels[i + 3];
        let newRed = (red & 0xFE) | parseInt(binaryMessage[j]);
        let newAlpha = (alpha & 0xFE) | parseInt(binaryMessage[j]);
        pixels[i] = newRed;
        pixels[i + 3] = newAlpha;
        j++;
    }

    await layer.setPixelData(pixels);
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


setInterval(function() {
    var currentActiveLayer = app.activeDocument.activeLayer;
    var previousActiveLayer = app.activeDocument.previousActiveLayer;

    if (currentActiveLayer !== previousActiveLayer) {
        console.log("Active layer changed to: " + currentActiveLayer.name);

        previousActiveLayer = currentActiveLayer;
    }

    console.log('log status');

}, 100);

async function retrieveMessage() {
    var secretKey = document.querySelector('#secret-key').value;
    if (!secretKey) {
        await showAlert("Please enter the secret key.");
        return;
    }

    var activeDocument = app.activeDocument;

    if (activeDocument) {
        var layer = activeDocument.activeLayers[0];
        var pixels = await layer.pixelData;
        let binaryMessage = '';

        for (let i = 0; i < pixels.length; i += 4) {
            let red = pixels[i];
            binaryMessage += (red & 1);
        }

        var nullTerminatorIndex = binaryMessage.indexOf('00000000');
        if (nullTerminatorIndex === -1) {
            await showAlert("No hidden message found.");
            return;
        }

        var encryptedMessageBinary = binaryMessage.substring(0, nullTerminatorIndex);
        var encryptedMessage = binaryToString(encryptedMessageBinary);

        var decryptedMessage = await decryptMessage(encryptedMessage, secretKey);

        if (decryptedMessage) {
            await showAlert(`Decoded Message: ${decryptedMessage}`);
        }
    } else {
        await showAlert("No active document to retrieve the message from.");
    }
}

async function encryptSelectedLayers() {

    console.log('Encrypt Layer button clicked.');

    var selectedLayerIds = Array.from(document.querySelectorAll('#layers input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.value));
    console.log("Selected Layer IDs:", selectedLayerIds);

    if (selectedLayerIds.length === 0) {
        await showAlert('Please select at least one layer to encrypt.');
        console.log('No layers selected. Aborting encryption.');
        return;
    }

    var encryptionKey = document.getElementById('encryption-key').value;
    var secretMessage = document.getElementById('secret-message').value;
    console.log('Encryption Key:', encryptionKey);
    console.log('Secret Message:', secretMessage);

    if (!encryptionKey || !secretMessage) {
        await showAlert('Please enter both an encryption key and a secret message.');
        console.log('Missing encryption key or message.');
        return;
    }

    try {
        var encryptedMessage = await encryptMessage(secretMessage, encryptionKey);
        console.log("Encrypted Message:", encryptedMessage);

        await executeAsModal(async () => {
            var activeDocument = app.activeDocument;

            var layers = await executeAsModal(getAllLayers, { commandName: 'Get Layers' });
            for (let layer of layers) {
                await embedMessageInLayer(layer, encryptedMessage);
            }
        }, { commandName: 'Encrypt Layers' });

        await showAlert('Selected layers have been encrypted successfully.');
        console.log('Encryption completed successfully.');
    } catch (error) {
        console.error("Error during encryption:", error);
        await showAlert("Failed to encrypt selected layers.");
    }
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
async function exportAsPNG(doc) {
    try {
        var folder = await fs.getFolder();
        var file = await folder.createFile("exported_image_with_encryption.png", { overwrite: true });

        await doc.saveAs.png(file, { compression: 9, interlaced: false });
        console.log("Exported as PNG to:", file.nativePath);
    } catch (error) {
        console.error("Error during PNG export:", error);
        await app.showAlert("Error exporting PNG: " + error.message);
    }
}
