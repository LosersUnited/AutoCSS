const fs = require('fs');

function readJSONFile(filename: string) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return null;
    }
}

function replaceClassNamesByRegex(cssString: string, jsonFile: any): string {
    return cssString.replace(/\[([^\]]+)]\.([^\s{]+)/g, (match, group1, group2) => {
        for (const key in jsonFile) {
            if (jsonFile.hasOwnProperty(key) && jsonFile[key][group2] !== undefined) {
                return jsonFile[key][group2];
            }
        }
        return match;
    });
}

fs.readFile('test.css', 'utf8', (err: any, cssString: any) => {
    if (err) {
        console.error('Error reading CSS file:', err);
        return;
    }

    fs.readFile('modulesData.json', 'utf8', (err: any, data: any) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return;
        }

        const jsonFile = JSON.parse(data);
        const updatedCSS = replaceClassNamesByRegex(cssString, jsonFile);
        console.log(updatedCSS);
    });
});