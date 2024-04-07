const fetcher = require('./fetcher');
import * as fs from 'fs';
import * as path from 'path';


function readJSONFile(filename: string): { [key: string]: string }[] | null {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return null;
    }
}

function replaceClassNamesByRegex(cssString: string, jsonFile: { [key: string]: string }[]): string {
    return cssString.replace(/\[([^\]]+)]\.([^\s{]+)/g, (match, group1, group2) => {
        for (const key in jsonFile) {
            if (Object.prototype.hasOwnProperty.call(jsonFile, key) && jsonFile[key][group2] !== undefined) {
                return jsonFile[key][group2];
            }
        }
        return match;
    });
}

function startConverting(filePath: string): void {
    fs.readFile(filePath, 'utf8', (err: NodeJS.ErrnoException | null, cssString: string | Buffer) => {
        if (err) {
            console.error('Error reading CSS file:', err);
            return;
        }

        fetcher.fetchFullDiscordCSSDefinitions().then((jsonFile: { [key: string]: string }[]) => {
            const updatedCSS = replaceClassNamesByRegex(cssString.toString(), jsonFile);
            console.log(updatedCSS);
        });
    });
}

const args: string[] = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: npx ts-node index.ts  <file>');
    process.exit(1);
}

let inputPath: string = args[0];
if (inputPath) {
    let resolvedPath: string = path.resolve(inputPath);
    if (!fs.existsSync(resolvedPath)) {
        inputPath += '.css'; // we can try if the user doesn't wanna add .css or forgets to.
        resolvedPath = path.resolve(inputPath);
    }
    startConverting(resolvedPath);
}
