import 'reflect-metadata'
import { KeyType, getKeyName } from './ContainerItem'

const dependenciesKeyName = '@karcass__dependencies'

export function Dependency<T>(key: KeyType<T>): any {
    return (target: T) => {
        let dependencies: KeyType<T>[]|undefined = Reflect.getMetadata(dependenciesKeyName, target)
        if (!dependencies) {
            dependencies = []
            Reflect.defineMetadata(dependenciesKeyName, dependencies, target)
        }
        dependencies.push(key)
    }
}

export const getDependencies = (constructor: new (...args: any[]) => any): (string | (new (...args: any[]) => any))[] => {
    return Reflect.getMetadata(dependenciesKeyName, constructor)
}

export const checkDependenciesCount = (constructor: new (...args: any[]) => any) => {
    const dependencies = getDependencies(constructor)
    const constructorParamsLength = constructor.length
    const dependenciesLength = dependencies ? dependencies.length : 0
    if (constructorParamsLength !== dependenciesLength) {
        throw new Error(`The amount of the @Dependency decorator usages - ${dependenciesLength} in ${getKeyName(constructor)} ` +
            `differs from its constructor arguments count - ${constructorParamsLength}. ` +
            'May be you forgot add @Dependency decorator to some of constructor argument(s).')
    }
}
