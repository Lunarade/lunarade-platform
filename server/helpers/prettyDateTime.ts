export default function prettyDateTime(ms, resolution = Infinity) {
    const timeMap = [
        {
            value: 1e3 * 60 * 60 * 24 * 7 * 4 * 1.086 * 12,
            suffix: 'y'
        },
        {
            value: 1e3 * 60 * 60 * 24 * 7 * 4 * 1.086,
            suffix: 'mo'
        },
        {
            value: 1e3 * 60 * 60 * 24 * 7,
            suffix: 'w'
        },
        {
            value: 1e3 * 60 * 60 * 24,
            suffix: 'd'
        },
        {
            value: 1e3 * 60 * 60,
            suffix: 'h'
        },
        {
            value: 1e3 * 60,
            suffix: 'm'
        },
        {
            value: 1e3,
            suffix: 's'
        }
    ]

    var prettyString = [];

    for (let val of timeMap)
        if (ms / val.value > 1) {
            prettyString.push(~~(ms / val.value) + val.suffix);
            ms = ms % val.value;
        }

    return prettyString.slice(0, resolution).join(' ') || '0s';

}