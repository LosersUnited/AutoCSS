function getTextBetween(text: string, start: string, end: string) {
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
const delay = (milliseconds: number) => new Promise<void>((resolve, reject) => {
	setTimeout(_ => resolve(), milliseconds);
});
module.exports = {
    getTextBetween,
    delay,
};
