export enum CircularDependencyDetectionReason {
    timeout = 'timeout',
    multipleInitialization = 'multiple_initialization',
}

/* 3 attemps needed to determine other problem services (to detect them they must accumulate at leas 2 tryings) */
const criticalAmountOfCalls = 3

export class ContainerItem<T> {
    public instance?: any
    public initializationStartTimestamp?: number
    public initializerCalls = 0

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