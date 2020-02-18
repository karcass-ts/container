export enum CircularDependencyDetectionReason {
    timeout = 'timeout',
    multipleInitialization = 'multiple_initialization',
}

export type KeyType<T = any> = (new (...args: any[]) => T)|string|symbol

export const getKeyName = (key: KeyType) => {
    if (key instanceof Function) {
        return key.name
    }
    return String(key)
}

/* 3 attemps needed to determine other problem services (to detect them they must accumulate at leas 2 tryings) */
const criticalAmountOfCalls = 3

export class ContainerItem<T> {
    public instance?: any
    public initializationStartTimestamp?: number
    public initializerCalls = 0

    public constructor(
        public key: KeyType<T>,
        public initializer: () => T|Promise<T>,
    ) {}

    public get initializationDuration() {
        return this.initializationStartTimestamp ? Date.now() - this.initializationStartTimestamp : 0
    }

    public async getInstance(maxWaitMs: number, circularDependencyDetectionCallback: (reason: CircularDependencyDetectionReason) => Error) {
        if (this.instance !== undefined) {
            return this.instance
        }
        return this.instance = new Promise((resolve, reject) => {
            try {
                this.initializerCalls++
                if (this.initializerCalls >= criticalAmountOfCalls) {
                    return reject(circularDependencyDetectionCallback(CircularDependencyDetectionReason.multipleInitialization))
                }
                const obj = this.initializer()
                if (obj instanceof Promise) {
                    this.initializationStartTimestamp = Date.now()
                    const timeout = setTimeout(() => {
                        reject(circularDependencyDetectionCallback(CircularDependencyDetectionReason.timeout))
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