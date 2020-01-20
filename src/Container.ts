import 'reflect-metadata'
import { dependenciesKeyName } from './Dependency'

class ContainerItem<T> {
    public instance?: any
    public initializationStartTimestamp?: number

    public constructor(
        public key: (new (...args: any[]) => T)|string,
        public initializer: () => T|Promise<T>,
    ) {}

    public get initializationDuration() {
        return this.initializationStartTimestamp ? Date.now() - this.initializationStartTimestamp : 0
    }

    public get name() {
        return typeof this.key === 'string' ? this.key : this.key.name
    }

    public async getInstance(maxWaitMs: number, timeoutCallback: () => Error) {
        if (this.instance !== undefined) {
            return this.instance
        }
        return this.instance = new Promise((resolve, reject) => {
            try {
                const obj = this.initializer()
                if (obj instanceof Promise) {
                    this.initializationStartTimestamp = Date.now()
                    const timeout = setTimeout(() => {
                        reject(timeoutCallback())
                        this.initializationStartTimestamp = undefined
                    }, maxWaitMs)

                    obj.then(result => resolve(this.instance = result)).catch(reject).finally(() => {
                        clearTimeout(timeout)
                        this.initializationStartTimestamp = undefined
                    })
                } else {
                    resolve(obj)
                }
            } catch (err) {
                reject(err)
            }
        })
    }

}
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
            initializer = async () => {
                const args = dependencies ? await Promise.all(dependencies.reverse().map(k => this.get(k))) : []
                return new key(...args)
            }
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

    public async get<T extends ItemType>(key: (new (...args: any[]) => T)|string): Promise<T> {
        const name = typeof key === 'string' ? key : key.name
        const item = this.items.find(i => i.name === name)
        if (!item) {
            throw new Error(`Item with key "${name}" not found`)
        }
        return item.getInstance(this.maxItemInitializationDurationMs, () => {
            const problems = this.items.filter(i => i.initializationDuration >= this.maxItemInitializationDurationMs * .9)
            let message = `Too long ${name} initialization (> ${this.maxItemInitializationDurationMs}ms). `
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