import * as utils from "./utils"
import * as fetcher from "./fetcher"

type SolveResult = {
    isUnique: boolean,
    recipe: string[],
    index?: number,
};

const stages: { [key: number]: (targetModule: { [key: string]: any }, targetProp: string, targetModuleId: string) => Promise<SolveResult> } = {
    0: async (targetModule, targetProp) => {
        const proxy = await fetcher.fetchFullDiscordCSSDefinitions();
        return {
            isUnique: proxy.filter(x => {
                return x.hasOwnProperty(targetProp);
            }).length == 1,
            recipe: [targetProp],
        };
    },
    1: async (targetModule, targetProp) => {
        const proxy = await fetcher.fetchFullDiscordCSSDefinitions();
        const targetModuleKeys = Object.keys(targetModule);
        const targetAmountOfPropertiesToPick = ((targetModuleKeys.length % 2 == 0) ? targetModuleKeys.length : targetModuleKeys.length - 1);
        for (let index = 0; index < 6; index++) {
            const randomProps = utils.pickRandomProperties(targetModule, targetAmountOfPropertiesToPick > 1 ? (targetAmountOfPropertiesToPick / 2) : targetAmountOfPropertiesToPick);
            const targetProps = randomProps.includes(targetProp) ? randomProps : [...randomProps, targetProp];
            const constructed = {
                isUnique: proxy.filter(x =>
                    targetProps.every(key => x && x.hasOwnProperty(key))).length == 1,
                recipe: targetProps
            };
            if (constructed.isUnique)
            // return constructed;
            {
                if (constructed.recipe.length > 4) {
                    let currentMaxPropCount = constructed.recipe.length - 2;
                    let last = { isUnique: false, recipe: [] } as SolveResult;
                    // for (let index2 = 0; index2 < 32; index2++) {
                    for (let index2 = 0; index2 < targetModuleKeys.length; index2++) {
                        const randomProps2 = utils.pickRandomProperties(targetModule, currentMaxPropCount);
                        const targetProps2 = randomProps2.includes(targetProp) ? randomProps2 : [...randomProps2, targetProp];
                        // if (randomProps2.length == 0)
                        //     continue;
                        const constructed2 = {
                            isUnique: proxy.filter(x =>
                                targetProps2.every(key => x && x.hasOwnProperty(key))).length == 1,
                            recipe: targetProps2
                        };
                        currentMaxPropCount--;
                        if (constructed2.isUnique) {
                            last = constructed2;
                        }
                        else {
                            return last;
                        }
                    }
                }
                return constructed;
            }
        }
        return {
            isUnique: false,
            recipe: [],
        };
    },
    2: async (targetModule, targetProp) => {
        const proxy = await fetcher.fetchFullDiscordCSSDefinitions();
        const found = proxy.filter(x => utils.haveSameKeys(x, targetModule));
        console.log("found", found, "targetModule", targetModule);
        if (!found.every(x => Object.keys(x).length == Object.keys(targetModule).length))
            return { isUnique: false, recipe: [...Object.keys(targetModule)], index: found.findIndex(x => x[targetProp] == targetModule[targetProp]) };
        // if (found.length > 0) {
        //     console.log(found, targetModule, targetProp);
        // }
        found.sort((a, b) => {
            const aValues = Object.values(a);
            const bValues = Object.values(b);
            return aValues.join().localeCompare(bValues.join());
        });
        return {
            isUnique: found.length > 0 && found.findIndex(x => x[targetProp] == targetModule[targetProp]) != -1,
            recipe: [...Object.keys(targetModule)],
            index: found.findIndex(x => x[targetProp] == targetModule[targetProp]),
        };
    },
    3: async (targetModule, targetProp) => {
        const proxy = await fetcher.fetchFullDiscordCSSDefinitions();
        // since we are at this stage, we need to assume there are a lot of results
        const allThatContainTheTargetProp = proxy.filter(x => {
            return x.hasOwnProperty(targetProp);
        });
        const targetModuleKeys = Object.keys(targetModule);
        const notInTargetFinal: string[] = [];
        // console.log(allThatContainTheTargetProp);
        for (let index = 0; index < allThatContainTheTargetProp.length; index++) {
            const current = allThatContainTheTargetProp[index];
            const currentModuleKeys = Object.keys(current);
            const notInTarget = currentModuleKeys.filter(key => !targetModuleKeys.includes(key));
            notInTargetFinal.push(...notInTarget);
        }
        if (notInTargetFinal.length > 2) {
            let currentMaxPropCount = notInTargetFinal.length - 2;
            const targetAmountOfPropertiesToPick = ((targetModuleKeys.length % 2 == 0) ? targetModuleKeys.length : targetModuleKeys.length - 1);
            let last = {
                isUnique: proxy.filter(x =>
                    x && x.hasOwnProperty(targetProp) && !notInTargetFinal.some(key => x && x.hasOwnProperty(key))).length == 1,
                recipe: [targetProp, ...notInTargetFinal.map(x => "!" + x)],
            } as SolveResult;
            console.log(last.isUnique, last.recipe, proxy.filter(x =>
                x && x.hasOwnProperty(targetProp) && !notInTargetFinal.some(key => x && x.hasOwnProperty(key))));
            // process.exit(1);
            // return { isUnique: false, recipe: [] };
            for (let index = 0; index < notInTargetFinal.length; index++) {
                const randomIndices = utils.pickRandomIndicesFromArr(notInTargetFinal, Math.max(0, Math.min(currentMaxPropCount, notInTargetFinal.length)));
                const randomProps = utils.pickRandomProperties(targetModule, targetAmountOfPropertiesToPick > 1 ? (targetAmountOfPropertiesToPick / 2) : targetAmountOfPropertiesToPick);
                const targetProps = randomProps.includes(targetProp) ? randomProps : [...randomProps, targetProp];

                currentMaxPropCount++;
                console.log("predicted", targetProps, proxy.filter(x => targetProps.every(key => x && x.hasOwnProperty(key)) &&
                    !randomIndices.some(randomIndex => x && x.hasOwnProperty(notInTargetFinal[randomIndex]))));
                const constructed2 = {
                    isUnique: proxy.filter(x => targetProps.every(key => x && x.hasOwnProperty(key)) &&
                        !randomIndices.some(randomIndex => x && x.hasOwnProperty(notInTargetFinal[randomIndex]))).length == 1,
                    recipe: [targetProp, ...randomIndices.map(x => notInTargetFinal[x]).map(x => "!" + x)],
                };
                const otherMatches = proxy.filter(x => targetProps.every(key => x && x.hasOwnProperty(key)) &&
                    !randomIndices.some(randomIndex => x && x.hasOwnProperty(notInTargetFinal[randomIndex])));
                let allKeysSame = true;
                for (let index2 = 0; index2 < otherMatches.length; index2++) {
                    const element = otherMatches[index2];
                    if (!utils.haveSameKeys(element, targetModule) || Object.keys(otherMatches[index2]).length != targetModuleKeys.length)
                        allKeysSame = false;
                }
                if (allKeysSame && otherMatches.length > 1) {
                    otherMatches.sort((a, b) => {
                        const aValues = Object.values(a);
                        const bValues = Object.values(b);
                        return aValues.join().localeCompare(bValues.join());
                    });
                    // console.log(otherMatches, otherMatches.filter(x => x[targetProp]), targetModule[targetProp]);
                    // console.log("test", proxy.filter(x => x.hasOwnProperty("container")).filter(x=>x[targetProp] == targetModule[targetProp]));
                    return {
                        isUnique: true,
                        index: otherMatches.findIndex(x => x[targetProp] == targetModule[targetProp]),
                        recipe: [...targetProps, ...notInTargetFinal.map(x => "!" + x)],
                    };
                }
                console.log("Constructed2:", constructed2, "Not in target:", notInTargetFinal);
                if (constructed2.isUnique) {
                    last = constructed2;
                    break;
                }
                // else {
                //     console.log("Returning last", last);
                //     return last;
                // }
            }
            console.log("Returning last 2", last);
            return last;
        }
        const calculatedIsUnique = proxy.filter(x =>
            x && x.hasOwnProperty(targetProp) && !notInTargetFinal.some(key => x && x.hasOwnProperty(key))).length == 1;
        console.log(notInTargetFinal, {
            isUnique: calculatedIsUnique,
            recipe: [targetProp, ...notInTargetFinal.map(x => "!" + x)],
        });
        return {
            isUnique: calculatedIsUnique,
            recipe: [targetProp, ...notInTargetFinal.map(x => "!" + x)],
        }
    },
};

export default async function solver(targetModule: { [key: string]: any }, targetProp: string, targetModuleId: string) {
    /* 
        const targetModuleKeys = Object.keys(targetModule);
        const targetAmountOfPropertiesToPick = ((targetModuleKeys.length % 2 == 0) ? targetModuleKeys.length : targetModuleKeys.length - 1);
        const randomProps = utils.pickRandomProperties(targetModule, targetAmountOfPropertiesToPick > 1 ? (targetAmountOfPropertiesToPick / 2) : targetAmountOfPropertiesToPick);
     */
    const stageCount = Object.keys(stages).length;
    // let lastResult: SolveResult | null = null;
    for (let index = 0; index < stageCount; index++) {
        const currentStage = stages[index];
        console.log("Now running stage", index + 1);
        const result = await currentStage(targetModule, targetProp, targetModuleId);
        if (result.isUnique == true) {
            console.log("Found unique recipe.");
            return [result.recipe, result.index] as [string[], number | undefined];
        }
        // lastResult = result;
        console.log("Next stage.", `Now ${index + 1}/${stageCount}`, targetModule, targetProp);
    }
    console.log(targetModule, targetProp, targetModuleId);
    /*     const proxy = await fetcher.fetchFullDiscordCSSDefinitions();
        const res = proxy.filter(x => lastResult!.recipe.filter(x => !x.startsWith("!")).every(key => x && x.hasOwnProperty(key)) && !lastResult!.recipe.filter(x => x.startsWith("!")).some(key => x && x.hasOwnProperty(key.slice(1))))
        console.log(res);
        process.exit(1); */
    // return null;
    return null;
}
