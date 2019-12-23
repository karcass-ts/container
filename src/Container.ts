export class Container<ItemType extends any> {

    protected items: Record<string, {
        key: (new (...args: any[]) => ItemType)|string,
        initializer: () => ItemType|Promise<ItemType>,
        instance?: any,
        initializersCallStack: string[],
    }> = {}

    public add<T extends ItemType>(key: (new (...args: any[]) => T)|string, initializer: () => T|Promise<T>) {
        const name = typeof key === 'string' ? key : key.name
        if (name in this.items) {
            throw new Error(`The item with name "${name}" already added before`)
        }
        this.items[name] = { key, initializer, initializersCallStack: [] }
    }

    public async addInplace<T extends ItemType>(key: (new (...args: any[]) => T)|string, initializer: () => T|Promise<T>): Promise<T> {
        this.add(key, initializer)
        return this.get<T>(key)
    }

    public async get<T extends ItemType>(key: (new (...args: any[]) => T)|string): Promise<T> {
        const name = typeof key === 'string' ? key : key.name
        const item = this.items[name]
        if (!item) {
            throw new Error(`Item with key "${name}" not found`)
        }
        const checkRecursion = () => {
            const stack = new Error().stack
            if (!stack) {
                throw new Error('Unable to receive callstack')
            }
            for (const line of stack.split('\n').filter(line => line.indexOf('at Object.initializer') >= 0)) {
                const recursive = Object.values(this.items).find(otherItem => {
                    if (otherItem === item) {
                        return false
                    }
                    return otherItem.initializersCallStack.find(l => l === line)
                })
                if (recursive) {
                    const recName = typeof recursive.key === 'string' ? recursive.key : recursive.key.name
                    throw new Error(`Circular dependency ${recName} <==> ${name} detected`)
                }
                item.initializersCallStack.push(line)
            }
        }
        if (!item.instance) {
            checkRecursion()
            item.instance = item.initializer()
            if (item.instance instanceof Promise) {
                item.instance.then(result => item.instance = result).catch(() => item.instance = undefined)
            }
        }
        if (item.instance instanceof Promise) {
            checkRecursion()
        }
        return item.instance
    }

    public async getAll() {
        const result: ItemType[] = []
        for (const item of Object.values(this.items)) {
            result.push(await this.get(item.key))
        }
        return result
    }

    public getKeys() {
        return Object.values(this.items).map(i => i.key)
    }

}