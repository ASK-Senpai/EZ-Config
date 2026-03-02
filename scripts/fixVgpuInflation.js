const fs = require('fs');
const path = require('path');

const DISCRETE_ANCHOR = 1159;

// Relative strength mapping provided by the user + reasonable interpolations for unlisted variants
const RELATIVE_SCORES = {
    // Intel
    "intel-uhd-630": 15,
    "intel-uhd-730": 20, // Intrapolated
    "intel-uhd-750": 22, // Intrapolated
    "intel-uhd-770": 25,
    "intel-xe-lpg": 40,

    // AMD
    "amd-vega-6": 30,
    "amd-vega-7": 35,
    "amd-vega-8": 40,
    "amd-rdna2-2cu": 45,
    "amd-rdna3-2cu": 55,
    "amd-rdna3-4cu": 90,
    "amd-rdna3-8cu": 140,
    "amd-rdna3-12cu": 180
};

function processVgpuFile(inputFilename, outputFilename) {
    const inputPath = path.join(__dirname, '../data/vgpu', inputFilename);
    const outputPath = path.join(__dirname, '../data/bench', outputFilename);

    // Ensure output dir exists
    const benchDir = path.dirname(outputPath);
    if (!fs.existsSync(benchDir)) {
        fs.mkdirSync(benchDir, { recursive: true });
    }

    const rawData = fs.readFileSync(inputPath, 'utf8');
    const records = JSON.parse(rawData);

    let maxVgpuScore = 0;

    const updatedRecords = records.map(record => {
        const iGpuId = record.id;
        const realVal = RELATIVE_SCORES[iGpuId];

        if (!realVal) {
            console.warn(`WARNING: Missing explicit mapping for ${iGpuId}.`);
        }

        // Scale to discrete universe
        const scaled_iGPU_score = Math.round((realVal / DISCRETE_ANCHOR) * 1000);
        const productivityScore = Math.round(scaled_iGPU_score * 0.75);

        maxVgpuScore = Math.max(maxVgpuScore, scaled_iGPU_score);

        return {
            ...record,
            normalized: {
                gamingScore: scaled_iGPU_score || 10,
                productivityScore: productivityScore || 8,
                scoreVersion: 2
            }
        };
    });

    fs.writeFileSync(outputPath, JSON.stringify(updatedRecords, null, 4), 'utf8');

    console.log(`Processed ${inputFilename} -> ${outputFilename}`);

    // Specific validation for RDNA3 12CU if it is in this file
    const rdna3_12 = updatedRecords.find(r => r.id === 'amd-rdna3-12cu');
    if (rdna3_12) {
        console.log(`\n🔍 VALIDATION: New RDNA3 12CU Score = ${rdna3_12.normalized.gamingScore} (Expected ~155)`);
    }

    console.log(`📊 Highest vGPU Score in file: ${maxVgpuScore}`);
    console.log(`📈 % of highest vGPU vs 5090 (${DISCRETE_ANCHOR}): ${((maxVgpuScore / 1000) * (1000 / DISCRETE_ANCHOR) * 100).toFixed(2)}%\n`);
}

function run() {
    console.log(`\n🚀 Scaling vGPUs to DISCRETE_ANCHOR = ${DISCRETE_ANCHOR}\n`);

    processVgpuFile('vgpu_amd.json', 'amd_vgpu_v2.json');
    processVgpuFile('vgpu_intel.json', 'intel_vgpu_v2.json');
}

run();
