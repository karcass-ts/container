import 'reflect-metadata'
import { checkDependenciesCount, getDependencies } from './Dependency'
import { ContainerItem, CircularDependencyDetectionReason, KeyType, getKeyName } from './ContainerItem'

export class Container<ItemType extends any> {
    protected items: ContainerItem<ItemType>[] = []

    public constructor(protected maxItemInitializationDurationMs = 1e4) {}

    public add<T extends ItemType>(key: (new (...args: any[]) => T)): void

    public add<T extends ItemType>(key: KeyType<T>, initializer: () => T|Promise<T>): void

    public add<T extends ItemType>(key: KeyType<T>, initializer?: () => T|Promise<T>) {
        const name = getKeyName(key)
        if (this.items.find(i => i.key === key)) {
            throw new Error(`The item with name "${name}" already added before`)
        }
        if (!initializer) {
            if (!(key instanceof Function)) {
                throw new Error('If second parameter omitted, first parameter must be a constructor')
            }
            checkDependenciesCount(key)
            initializer = () => this.inject(key)
        }
        this.items.push(new ContainerItem(key, initializer))
    }

    public async addInplace<T extends ItemType>(key: (new (...args: any[]) => T)): Promise<T>

    public async addInplace<T extends ItemType>(key: KeyType<T>, initializer: () => T|Promise<T>): Promise<T>

    public async addInplace<T extends ItemType>(key: KeyType<T>, initializer?: () => T|Promise<T>): Promise<T> {
        if (initializer) {
            this.add(key, initializer)
        } else {
            if (!(key instanceof Function)) {
                throw new Error('If second parameter omitted, first parameter must be a constructor')
            }
            this.add(key)
        }
        return this.get<T>(key)
    }

    /**
     * Creates instance of constructor and injects corresponding dependencies. This method doesn't perform addition of created object
     * into self index
     * @param constructor
     */
    public async inject<T>(constructor: new (...args: any[]) => T): Promise<T> {
        checkDependenciesCount(constructor)
        const dependencies = getDependencies(constructor)
        const args = dependencies ? await Promise.all(dependencies.reverse().map(k => this.get(k))) : []
        return new constructor(...args)
    }

    public async get<T extends ItemType>(key: KeyType<T>): Promise<T> {
        const name = getKeyName(key)
        const item = this.items.find(i => i.key === key)
        if (!item) {
            throw new Error(`Item with key "${name}" not found`)
        }
        const result = await item.getInstance(this.maxItemInitializationDurationMs, (reason) => {
            const problems = this.items
                .filter(i => i.initializationDuration >= this.maxItemInitializationDurationMs * .9 || i.initializerCalls >= 2)
            let message = reason === CircularDependencyDetectionReason.timeout ?
                `Too long ${name} initialization (> ${this.maxItemInitializationDurationMs}ms). ` :
                `Multiple attempts to initialize ${name}. `
            if (problems.length >= 2) {
                message += `It may be circular dependency between ${problems.map(p => getKeyName(p.key)).join(' and ')}`
            }
            return new Error(message)
        })
        if (typeof key === 'function' && !(result instanceof key)) {
            throw new Error(`The return value of ${name} initializer is not instance of ${name} but instance of ` +
                `${'constructor' in result ? getKeyName(result.constructor) : typeof result}`)
        }
        return result
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