export function getTextBetween(text: string, start: string, end: string) {
    const results = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        const startIdx = text.indexOf(start, startIndex);
        if (startIdx === -1) {
            break;
        }
        const endIdx = text.indexOf(end, startIdx + start.length);
        if (endIdx === -1) {
            break;
        }
        const match = text.substring(startIdx + start.length, endIdx);
        results.push(match);
        startIndex = endIdx + end.length;
    }
    return results;
}
export const delay = (milliseconds: number) => new Promise<void>((resolve, reject) => {
    setTimeout((_: any) => resolve(), milliseconds);
});
export function pickRandomProperties(obj: any, n: number) {
    const keys = Object.keys(obj);
    const randomKeys: string[] = [];
    if (n >= keys.length) {
        return keys.map(key => obj[key]);
    }

    while (randomKeys.length < n) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        if (!randomKeys.includes(randomKey)) {
            randomKeys.push(randomKey);
        }
    }
    return randomKeys;
}
export async function replaceAsync(str: string, regex: any, asyncFn: (...args: any[]) => any) {
    const promises: any[] = [];
    str.replace(regex, (full, ...args) => {
        promises.push(asyncFn(full, ...args));
        return full;
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}
export function getDeferred() {
    let resolve: undefined | ((arg: any) => void) = undefined;
    let reject: undefined | ((e?: Error) => void) = undefined;

    const promise = new Promise((resolveCb, rejectCb) => {
        resolve = resolveCb;
        reject = rejectCb;
    });

    return { resolve, reject, promise };
}
