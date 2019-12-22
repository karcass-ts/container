export class Container<ItemType extends any> {

    protected items: Record<string, {
        key: (new (...args: any[]) => ItemType)|string,
        initializer: () => ItemType|Promise<ItemType>,
        instance?: any,
        initializationsCount: number
    }> = {}

    public add<T extends ItemType>(key: (new (...args: any[]) => T)|string, initializer: () => T|Promise<T>) {
        const name = typeof key === 'string' ? key : key.name
        if (name in this.items) {
            throw new Error(`The item with name "${name}" already added before`)
        }
        this.items[name] = { key, initializer, initializationsCount: 0 }
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
        if (!item.instance) {
            if (item.initializationsCount > 0) {
                throw new Error(`Circular dependency in ${name} initializer detected`)
            }
            item.initializationsCount++
            item.instance = await item.initializer()
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