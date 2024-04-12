import {EvaluatedScript, FetchedScript, PreparedScript} from "./types";

const DISCORD_DOMAIN = "discord.com";
const DISCORD_APP_PATH = "/app";

const DISCORD_CONSTANTS = {
    globalEnvStart: "window.GLOBAL_ENV = {",
    scriptSearchConstant: "e.exports={disabled", // seems to appear only in shared and the main one
    pushStatement: "(this.webpackChunkdiscord_app=this.webpackChunkdiscord_app||[]).push([[",
    pushStatementPart2: "],{",
};

const TEXT_CONSTANTS = {
    scriptStart: "<script",
    scriptSrc: "src=\"",
    scriptEndBlock: "></script>",
    scriptEnd: "</script>",
};

const MODULE_MATCHER_REGEX = (propName: string) => `({|,)(${propName}):`;

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.3";
import * as utils from "./utils";

function fetchDiscordPage() {
    return fetch(`https://${DISCORD_DOMAIN}${DISCORD_APP_PATH}`, {
        headers: {
            "User-Agent": USER_AGENT,
        }
    });
}

function findScripts(discordPageHTMLCode: string) {
    if (!discordPageHTMLCode.includes(DISCORD_CONSTANTS.globalEnvStart))
        throw new Error("Invalid input.");
    const allScriptsRaw: string[] = utils.getTextBetween(
        discordPageHTMLCode,
        `${TEXT_CONSTANTS.scriptStart} ${TEXT_CONSTANTS.scriptSrc}`,
        TEXT_CONSTANTS.scriptEnd, // we don't care about local scripts
    );
    const allScriptsUrls = allScriptsRaw.map(x => // we cut off anything after the quote
        x.slice(0, x.indexOf("\"")));
    return allScriptsUrls;
}

async function fetchScripts(scriptPathsArray: string[]) {
    const result = new Array<FetchedScript>();
    for (let index = 0; index < scriptPathsArray.length; index++) {
        const currentScriptPath = scriptPathsArray[index];
        const response = await fetch(`https://${DISCORD_DOMAIN}/${currentScriptPath}`);
        const responseAsText = await response.text();
        result.push({
            path: currentScriptPath,
            responseAsText
        });
        utils.delay(500); // we don't want to spam those requests
    }
    return result;
}

function findCSSModulesScripts(fetchedScriptArray: FetchedScript[]) {
    const results = new Array<FetchedScript>();
    for (let index = 0; index < fetchedScriptArray.length; index++) {
        const currentScript = fetchedScriptArray[index];
        if (currentScript.responseAsText.includes(DISCORD_CONSTANTS.scriptSearchConstant)) {
            results.push(currentScript);
        }
    }
    return results;
}

function convertScriptSourceCode(foundCSSModulesScripts: FetchedScript[]) {
    // cut after (this.webpackChunkdiscord_app=this.webpackChunkdiscord_app||[]).push([[
    // end at -3 characters
    const results = new Array<PreparedScript>();
    for (let index = 0; index < foundCSSModulesScripts.length; index++) {
        const currentScript = foundCSSModulesScripts[index];
        const resultForCurrentScript: PreparedScript = { path: currentScript.path, readySourceCode: currentScript.responseAsText };
        // resultForCurrentScript.readySourceCode = resultForCurrentScript.readySourceCode.slice(0, resultForCurrentScript.readySourceCode.indexOf(DISCORD_CONSTANTS.pushStatement)) + resultForCurrentScript.readySourceCode.slice(DISCORD_CONSTANTS.pushStatement.length);
        // console.log(resultForCurrentScript.readySourceCode.indexOf(DISCORD_CONSTANTS.pushStatementPart2));
        resultForCurrentScript.readySourceCode = resultForCurrentScript.readySourceCode.slice(resultForCurrentScript.readySourceCode.indexOf(DISCORD_CONSTANTS.pushStatementPart2) + DISCORD_CONSTANTS.pushStatementPart2.length);
        resultForCurrentScript.readySourceCode = resultForCurrentScript.readySourceCode.slice(0, -3);
        resultForCurrentScript.readySourceCode = `{${resultForCurrentScript.readySourceCode}`;
        results.push(resultForCurrentScript);
    }
    return results;
}

function evaluateScripts(convertedScripts: PreparedScript[]) {
    const results = new Array<EvaluatedScript>();
    for (let index = 0; index < convertedScripts.length; index++) {
        const currentScript = convertedScripts[index];
        const constructedFunction = new Function(`return (${currentScript.readySourceCode});`);
        const resultForCurrentScript: EvaluatedScript = { path: currentScript.path, value: constructedFunction() };
        results.push(resultForCurrentScript);
    }
    return results;
}

export async function fetchFullDiscordCSSDefinitions() {
    const response = await fetchDiscordPage();
    const responseAsText = await response.text();
    const foundScripts = findScripts(responseAsText);
    const fetchedScripts = await fetchScripts(foundScripts);
    const foundCSSModulesScripts = findCSSModulesScripts(fetchedScripts);
    const convertedScripts = convertScriptSourceCode(foundCSSModulesScripts);
    const evaluatedScripts = evaluateScripts(convertedScripts);
    /*
    const proxy = new Proxy([], {
        get(target, prop, receiver) {
            for (let index = 0; index < evaluatedScripts.length; index++) {
                const evaluatedScript = evaluatedScripts[index];
                const foundOrNot = Object.values(evaluatedScript.value).find(x=>x.toString().includes(prop));
                if ()
            }
        },
    });
    */
    // const result = new Array<{ [key: string]: string }>();
    // const cache: { [key: string]: any } = {};
    // const queued: string[] = [];
    /*
    for (let index = 0; index < evaluatedScripts.length; index++) {
        const evaluatedScript = evaluatedScripts[index];
        console.log("next script", evaluatedScript.path);
        const fakeRequire = (id: string, parent: string) => {
            const fakeWebpack = { exports: undefined };
            // console.log(id);
            if (cache[id] == undefined) {
    /*
                if (evaluatedScript.value[id] == undefined) {
                    queued.push(id);
                    queued.push(parent);
                    return {};
                }
    */
    /*
                if (evaluatedScript.value[id] == undefined) {
                    evaluatedScripts.find(x => x.value[id])?.value[id](fakeWebpack, undefined, (id: string) => fakeRequire(id, parent));
                    cache[id] = fakeWebpack.exports;
                    return cache[id];
                }
                evaluatedScript.value[id](fakeWebpack, undefined, (id: string) => fakeRequire(id, parent));
                cache[id] = fakeWebpack.exports;
            }
            return cache[id] ?? fakeWebpack.exports;
        };
        Object.keys(evaluatedScript.value as { [key: string]: ((e: {}, t: unknown, a: typeof fakeRequire) => void) }).forEach(key => {
            const module: (e: {}, t: unknown, a: typeof fakeRequire) => void = evaluatedScript.value[key];
            const fakeWebpack = { exports: undefined as unknown as { [key: string]: string } };
            if (cache[key] == undefined) {
                module(fakeWebpack, undefined, (id: string) => fakeRequire(id, key));
            }
            result.push(cache[key] ?? fakeWebpack.exports);
        });
    }
    */
    /*
    for (let index = 0; index < queued.length; index++) {
        const element = queued[index];
        const fakeRequire = (id: string, parent: string) => {
            const fakeWebpack = { exports: undefined };
            console.log(id);
            if (cache[id] == undefined) {
                evaluatedScript.value[id](fakeWebpack, undefined, (id: string) => fakeRequire(id, parent));
                cache[id] = fakeWebpack.exports;
            }
            return cache[id] ?? fakeWebpack.exports;
        };
    }
    */
    const cache: { [key: string]: any } = {};
    const result = {
        evaluatedScripts,
        find(predicate: (element: any) => boolean) {
            for (let index = 0; index < evaluatedScripts.length; index++) {
                const evaluatedScript = evaluatedScripts[index];
                const modules = Object.keys(evaluatedScript.value);
                const fakeArray: { module: string; hasOwnProperty(prop: string): boolean; }[] = [];
                modules.forEach((x) => {
                    const fakeObject = {
                        module: "",
                        hasOwnProperty(prop: string) { // and this is, kids, why you don't do something.hasOwnProperty() but Object.prototype.hasOwnProperty.call(something)
                            const regex = new RegExp(MODULE_MATCHER_REGEX(prop), "g");
                            if (regex.test(evaluatedScript.value[x].toString())) {
                                this.module = x;
                                return true;
                            }
                            return false;
                        }
                    };
                    fakeArray.push(fakeObject);
                });
                // const foundOrNot = modules.filter(x=>evaluatedScript.value[x].toString().includes())
                const foundOrNot = fakeArray.find(predicate);
                fakeArray.length = 0;
                if (foundOrNot) {
                    const fakeRequire = (id: string) => {
                        const fakeWebpack2 = { exports: undefined as unknown as { [key: string]: string } };
                        // console.log(id);
                        if (cache[id] == undefined) {
                            if (evaluatedScript.value[id] == undefined) {
                                evaluatedScripts.find(x => x.value[id])?.value[id](fakeWebpack2, undefined, fakeRequire);
                                cache[id] = fakeWebpack2.exports;
                                return cache[id];
                            }
                            evaluatedScript.value[id](fakeWebpack2, undefined, fakeRequire);
                            cache[id] = fakeWebpack2.exports;
                        }
                        return cache[id] ?? fakeWebpack2.exports;
                    };

                    const foundModule = foundOrNot.module;
                    if (cache[foundModule] == undefined) {
                        const builder = evaluatedScript.value[foundModule];
                        const fakeWebpack = { exports: undefined as unknown as { [key: string]: string } };
                        builder(fakeWebpack, undefined, fakeRequire);
                        cache[foundModule] = fakeWebpack.exports;
                    }
                    return cache[foundModule];
                }
            }
            return undefined;
        },
    };
    return result;
}
