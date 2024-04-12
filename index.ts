import * as fetcher from './assets/fetcher';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {EvaluatedScript} from "./assets/types";
const writeFileAsync = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);

// we don't need this awesome method right now ;3
/*function readJSONFile(filename: string): { [key: string]: string }[] | null {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return null;
    }
}*/

// thankies shady. regex go brerrr
const REPLACEMENT_REGEX = /(\[["']\w+.+?]).(\w+)/g;

function replaceClassNamesByRegex(cssString: string, jsonFile: { [p: string]: any }[]): string {
    return cssString.replace(REPLACEMENT_REGEX, (match, group1: string, group2) => {
        const modifiedGroup = group1.replace(/'/g, "\""); 
        // JSON.parse can't parse single quotes....?
        const targetProps: string[] = JSON.parse(modifiedGroup);
        const targetClassName = jsonFile.find(x => targetProps.every(key => x && x.hasOwnProperty(key)));
        if (targetClassName) {
            return targetClassName[group2];
        }
        return match;
    });
}

async function startConverting(inputFilePath: string, optionalFilePath: string): Promise<void> {
    const outputFolder = 'build';
    const fileName = path.basename(inputFilePath, path.extname(inputFilePath));
    const outputPath = path.join(outputFolder, fileName);

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }

    try {
        if (!fs.existsSync(inputFilePath)) {
            fs.writeFileSync(inputFilePath, '');
        }

        const cssString = await fs.promises.readFile(inputFilePath, 'utf8');

        const jsonFile = await fetcher.fetchFullDiscordCSSDefinitions();
        const updatedCSS = replaceClassNamesByRegex(cssString, jsonFile);

        // you're welcome salty boi ;3
        const fileExtension = optionalFilePath && optionalFilePath.startsWith('.') ? optionalFilePath : `.${optionalFilePath || 'css'}`;

        await writeFileAsync(outputPath + fileExtension, updatedCSS);

        console.log(`Updated CSS has been written to ${outputPath}`);
    } catch (err) {
        console.error('Error:', err);
    }
}


const args: string[] = process.argv.slice(2);
if (args.includes("--help") || args.length == 0) {
    console.error('Usage:\n\tnpx ts-node index.ts <file or directory>');
    process.exit(1);
}

async function getFiles(dir: string): Promise<string[]> {
    const direntArr = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all<string[] | string>(direntArr.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

let inputPath: string = args[0];
console.log(args)
if (inputPath) {
    let resolvedPath: string = path.resolve(inputPath);
    let optionalFilePath = args[1];
    if (!fs.existsSync(resolvedPath)) {
        inputPath += '.css'; // we can try if the user doesn't wanna add .css or forgets to.
        resolvedPath = path.resolve(inputPath);
    }
    if (fs.statSync(resolvedPath).isDirectory()) {
        (async () => {
            const paths = await getFiles(resolvedPath);
            for (let index = 0; index < paths.length; index++) {
                const element = paths[index];
                startConverting(element, optionalFilePath);
            }
        })();
    }
    else
        startConverting(resolvedPath, optionalFilePath);
}
