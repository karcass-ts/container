export class Container<ItemType extends any> {

    protected items: Record<string, {
        constructor: new (...args: any[]) => ItemType,
        initializer: () => ItemType|Promise<ItemType>,
        instance?: any,
        initializationsCount: number
    }> = {}

    public add<T extends ItemType>(constructor: new (...args: any[]) => T, initializer: () => T|Promise<T>) {
        if (constructor.name in this.items) {
            throw new Error(`Constructor with name "${constructor.name}" already added before`)
        }
        this.items[constructor.name] = { constructor, initializer, initializationsCount: 0 }
    }

    public async addInplace<T extends ItemType>(constructor: new (...args: any[]) => T, initializer: () => T|Promise<T>): Promise<T> {
        this.add(constructor, initializer)
        return this.get(constructor)
    }

    public async get<T extends ItemType>(constructor: new (...args: any[]) => T): Promise<T> {
        const item = this.items[constructor.name]
        if (!item) {
            throw new Error(`Item with key "${constructor.name}" not found`)
        }
        if (!item.instance) {
            if (item.initializationsCount > 0) {
                throw new Error(`Circular dependency in ${constructor.name} initializer detected`)
            }
            item.initializationsCount++
            item.instance = await item.initializer()
        }
        return item.instance
    }

    public async getAll() {
        const result: ItemType[] = []
        for (const item of Object.values(this.items)) {
            result.push(await this.get(item.constructor))
        }
        return result
    }

    public getConstructors() {
        return Object.values(this.items).map(i => i.constructor)
    }

}