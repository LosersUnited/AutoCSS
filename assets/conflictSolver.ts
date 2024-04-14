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
        for (let index = 0; index < 3; index++) {
            const randomProps = utils.pickRandomProperties(targetModule, targetAmountOfPropertiesToPick > 1 ? (targetAmountOfPropertiesToPick / 2) : targetAmountOfPropertiesToPick);
            const targetProps = [...randomProps, targetProp];
            const constructed = {
                isUnique: proxy.filter(x =>
                    targetProps.every(key => x && x.hasOwnProperty(key))).length == 1,
                recipe: targetProps
            };
            if (constructed.isUnique)
                return constructed;
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
