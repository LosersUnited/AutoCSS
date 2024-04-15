import * as utils from "./utils"
import * as fetcher from "./fetcher"

type SolveResult = {
    isUnique: boolean,
    recipe: string[],
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
};

export default async function solver(targetModule: { [key: string]: any }, targetProp: string, targetModuleId: string) {
    /* 
        const targetModuleKeys = Object.keys(targetModule);
        const targetAmountOfPropertiesToPick = ((targetModuleKeys.length % 2 == 0) ? targetModuleKeys.length : targetModuleKeys.length - 1);
        const randomProps = utils.pickRandomProperties(targetModule, targetAmountOfPropertiesToPick > 1 ? (targetAmountOfPropertiesToPick / 2) : targetAmountOfPropertiesToPick);
     */
    for (let index = 0; index < Object.keys(stages).length; index++) {
        const currentStage = stages[index];
        const result = await currentStage(targetModule, targetProp, targetModuleId);
        if (result.isUnique == true) {
            return result.recipe;
        }
        console.log("Next stage.", targetModule, targetProp);
    }
    return null;
}
