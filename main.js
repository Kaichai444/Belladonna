const photoshop = require("photoshop");
const { app, core } = photoshop;
const { executeAsModal } = core;
const fs = require("uxp").storage.localFileSystem;

// Event listener for exporting PNG with noise
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("export-noise-png").addEventListener("click", () => {
        executeAsModal(exportPngWithNoiseLayer, { commandName: "Export PNG with Noise Layer" });
    });
});

// Main function to handle adding noise layer, exporting, and removing noise layer
async function exportPngWithNoiseLayer() {
    const activeDoc = app.activeDocument;

    try {
        // Add noise layer
        const noiseLayer = await addNoiseLayer(activeDoc);

        // Export as PNG
        await exportAsPNG(activeDoc);

        // Remove noise layer after exporting
        await executeAsModal(async () => {
            await noiseLayer.delete();
        }, { commandName: "Remove Noise Layer" });

        // Alert the user that the export was successful
        await app.showAlert("PNG exported successfully with noise.");
    } catch (error) {
        console.error("Error exporting PNG:", error);
        await app.showAlert("An error occurred during export.");
    }
}

// Function to generate and add a noise layer
// TODO Eventually replace this logic with logic that will add a
// correctly formatted encryption layer
async function addNoiseLayer(doc) {
    const noiseLayer = await doc.createLayer({ name: "Noise Layer", kind: "pixelLayer" });

    // Fill the layer with 50% gray to make the noise effect visible
    await photoshop.action.batchPlay(
        [
            {
                "_obj": "fill",
                "using": { "_enum": "fillContents", "_value": "gray" },
                "opacity": 100,
                "mode": { "_enum": "blendMode", "_value": "normal" },
                "_isCommand": true,
                "_options": { "dialogOptions": "dontDisplay" }
            }
        ],
        { "synchronousExecution": true }
    );

    // Apply the Noise Filter to the layer
    await photoshop.action.batchPlay(
        [
            {
                "_obj": "addNoise",
                "noise": 50, // Adjust noise level as desired
                "distribution": { "_enum": "distribution", "_value": "uniform" },
                "monochromatic": true,
                "_isCommand": true,
                "_options": { "dialogOptions": "dontDisplay" }
            }
        ],
        { "synchronousExecution": true }
    );

    noiseLayer.opacity = 30; // Adjust the layer opacity for a subtle effect
    return noiseLayer;
}

// Function to export the PNG
async function exportAsPNG(doc) {
    const folder = await fs.getFolder(); // Prompt the user to select a folder for export
    const file = await folder.createFile("exported_image_with_noise.png", { overwrite: true });
    
    // Export document as PNG using saveAs
    await doc.saveAs.png(file, { compression: 9, interlaced: false });
}