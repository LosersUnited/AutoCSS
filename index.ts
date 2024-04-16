import * as fetcher from './assets/fetcher';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { EvaluatedScript } from "./assets/types";
import { pickRandomProperties, replaceAsync } from './assets/utils';
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
const REPLACEMENT_REGEX2 = /\.([a-zA-Z]+\_\_?[a-zA-Z0-9_.-]+)/g;

function replaceClassNamesByRegex(cssString: string, jsonFile: { [key: string]: string }[]): string {
    return cssString.replace(REPLACEMENT_REGEX, (match, group1: string, group2) => {
        const modifiedGroup = group1.replace(/'/g, "\"");
        // JSON.parse can't parse single quotes....?
        const rawProps: string[] = JSON.parse(modifiedGroup); // too lazy
        const toExcludeProps: string[] = [];
        const targetProps = rawProps.filter(x => x.startsWith("!") ? toExcludeProps.push(x) && false : true);
        console.log(match, targetProps);
        const targetClassName = jsonFile.find(x => targetProps.every(key => x && x.hasOwnProperty(key)) && !toExcludeProps.some(key => x && x.hasOwnProperty(key.slice(1))));
        if (targetClassName) {
            return targetClassName[group2].replace(' ', '.');
        }
        return match;
    });
}

function reverseLookup(realClassName: string, cssDefs: { [key: string]: string }[]) {
    let targetModuleId: string | null = null;
    const targetModule = cssDefs.find(x => {
        if (x.hasOwnProperty(realClassName)) {
            targetModuleId = x.module;
            return true;
        }
        return false;
    });
    if (!targetModule)
        // throw new Error(`Reverse lookup for ${realClassName} failed.`);
        return null;
    const targetProp = Object.keys(targetModule).find(x => targetModule[x] == realClassName);
    return { recipe: fetcher.conflictSolver(targetModule, targetProp!, targetModuleId!), targetProp };
}

async function replaceClassNamesByRegexInReverse(cssString: string, cssDefs: { [key: string]: string }[]) {
    return await replaceAsync(cssString, REPLACEMENT_REGEX2, async (match, group1: string) => {
        const modifiedGroup = group1.replace('.', ' ');
        const output = reverseLookup(modifiedGroup, cssDefs);
        if (output == null)
            return match;
        return `.${JSON.stringify(await output.recipe)}.${output.targetProp}`;
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

async function startReverseConverting(inputFilePath: string, basePath: string): Promise<void> {
    const fileName = path.basename(inputFilePath, path.extname(inputFilePath)) + ".raw";
    const inputParsed = path.relative(basePath, path.parse(inputFilePath).dir);
    console.log(inputParsed);
    const outputFolder = 'reverse-build/' + inputParsed;
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }
    const outputPath = path.join(outputFolder, fileName);
    try {
        if (!fs.existsSync(inputFilePath)) {
            fs.writeFileSync(inputFilePath, '');
        }

        const cssString = await fs.promises.readFile(inputFilePath, 'utf8');
        const cssDefs = await fetcher.fetchFullDiscordCSSDefinitions(true);
        const updatedCSS = await replaceClassNamesByRegexInReverse(cssString, cssDefs);
        const fileExtension = ".css";

        await writeFileAsync(outputPath + fileExtension, updatedCSS);

        console.log(`Updated CSS has been written to ${outputPath}`);
    } catch (err) {
        console.error('Error:', err);
    }
}


const args: string[] = process.argv.slice(2);
const mode = args.includes("--reverse") ? 1 : 0;
if (mode != 0)
    args.shift();
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
    /*     reverseLookup("emojiContainer__07d67").then(out => console.log(out));
        // @ts-ignore
        return; */
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
                if (mode == 0)
                    startConverting(element, optionalFilePath);
                else if (mode == 1)
                    startReverseConverting(element, resolvedPath);
            }
        })();
    }
    else if (mode == 0)
        startConverting(resolvedPath, optionalFilePath);
    else if (mode == 1)
        startReverseConverting(resolvedPath, path.resolve("./"));
}
