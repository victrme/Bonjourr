type UnknownObject = Record<string, unknown>

// https://dmitripavlutin.com/how-to-compare-objects-in-javascript/#4-deep-equality
export function deepEqual(object1: UnknownObject, object2: UnknownObject): boolean {
    function isObject(object: unknown): boolean {
        return object !== null && typeof object === 'object'
    }

    const keys1 = Object.keys(object1)
    const keys2 = Object.keys(object2)

    if (keys1.length !== keys2.length) {
        return false
    }

    for (const key of keys1) {
        const val1 = object1[key]
        const val2 = object2[key]
        const areObjects = isObject(val1) && isObject(val2)
        const areDifferent = (areObjects && !deepEqual(val1 as UnknownObject, val2 as UnknownObject)) ||
            (!areObjects && val1 !== val2)

        if (areDifferent) {
            return false
        }
    }

    return true
}
