import 'reflect-metadata'

export const dependenciesKeyName = '@karcass__dependencies'

export function Dependency<T>(key: (new (...args: any[]) => any)|string): any {
    return (target: T) => {
        let dependencies: string[]|undefined = Reflect.getMetadata(dependenciesKeyName, target)
        if (!dependencies) {
            dependencies = []
            Reflect.defineMetadata(dependenciesKeyName, dependencies, target)
        }
        dependencies.push(typeof key === 'string' ? key : key.name)
    }
}
