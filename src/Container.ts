import 'reflect-metadata'
import { dependenciesKeyName } from './Dependency'
import { ContainerItem, CircularDependencyDetectionReason } from './ContainerItem'

export class Container<ItemType extends any> {
    protected items: ContainerItem<ItemType>[] = []

    public constructor(protected maxItemInitializationDurationMs = 1e4) {}

    public add<T extends ItemType>(key: (new (...args: any[]) => T)): void

    public add<T extends ItemType>(key: (new (...args: any[]) => T)|string, initializer: () => T|Promise<T>): void

    public add<T extends ItemType>(key: (new (...args: any[]) => T)|string, initializer?: () => T|Promise<T>) {
        if (!initializer) {
            if (!(key instanceof Function)) {
                throw new Error('If second parameter omitted, first parameter must be a constructor')
            }
            const dependencies: string[]|undefined = Reflect.getMetadata(dependenciesKeyName, key)
            const constructorParamsLength = key.length
            const dependenciesLength = dependencies ? dependencies.length : 0
            if (constructorParamsLength !== dependenciesLength) {
                throw new Error(`The amount of the @Dependency decorator usages - ${dependenciesLength} in ${key.name} ` +
                    `differs from its constructor arguments count - ${constructorParamsLength}. ` +
                    'May be you have forgotten to add @Dependency decorator to some of constructor argument(s).')
            }
            initializer = () => this.inject(key)
        }
        const name = typeof key === 'string' ? key : key.name
        if (name in this.items) {
            throw new Error(`The item with name "${name}" already added before`)
        }
        this.items.push(new ContainerItem(key, initializer))
    }

    public async addInplace<T extends ItemType>(key: (new (...args: any[]) => T)): Promise<T>

    public async addInplace<T extends ItemType>(key: (new (...args: any[]) => T)|string, initializer: () => T|Promise<T>): Promise<T>

    public async addInplace<T extends ItemType>(key: (new (...args: any[]) => T)|string, initializer?: () => T|Promise<T>): Promise<T> {
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
        const dependencies: string[]|undefined = Reflect.getMetadata(dependenciesKeyName, constructor)
        const args = dependencies ? await Promise.all(dependencies.reverse().map(k => this.get(k))) : []
        return new constructor(...args)
    }

    public async get<T extends ItemType>(key: (new (...args: any[]) => T)|string): Promise<T> {
        const name = typeof key === 'string' ? key : key.name
        const item = this.items.find(i => i.name === name)
        if (!item) {
            throw new Error(`Item with key "${name}" not found`)
        }
        return item.getInstance(this.maxItemInitializationDurationMs, (reason) => {
            const problems = this.items
                .filter(i => i.initializationDuration >= this.maxItemInitializationDurationMs * .9 || i.initializerCalls >= 2)
            let message = reason === CircularDependencyDetectionReason.timeout ?
                `Too long ${name} initialization (> ${this.maxItemInitializationDurationMs}ms). ` :
                `Multiple attempts to initialize ${name}. `
            if (problems.length >= 2) {
                message += `It may be circular dependency between ${problems.map(p => p.name).join(' and ')}`
            }
            return new Error(message)
        })
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