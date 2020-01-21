# @karcass/container

Very tiny and simple async IoC container with dependency injection support
used in <a href="https://github.com/karcass-ts/karcass">karcass</a> skeleton

# Installation

```
npm install @karcass/container
```

# Usage

```typescript
import { Container } from '@karcass/container'

class ConsoleLogger {
    public log(text: string) {
        console.log(text)
    }
}

class HelloMessagePrinter {
    public constructor(protected helloSayer: HelloSayer) {}

    public print(username: string) {
        this.helloSayer.log(`Hello, ${username}!`)
    }
}

class DummyClass {}

const container = new Container()

container.add(HelloWorldMessagePrinter, async () => {
    const logger = await container.get(ConsoleLogger)
    console.log('HelloMessagePrinter initialization...')
    return new HelloMessagePrinter(logger)
})
container.add(ConsoleLogger, () => {
    console.log('ConsoleLogger initialization...')
    return new ConsoleLogger()
}
container.add(DummyClass, () => {
    console.log('DummyClass initialization...')
    return new DummyClass()
})

container.get(HelloMessagePrinter).then(printer => printer.print('Alice'))
```

This example will print:

```
ConsoleLogger initialization...
HelloMessagePrinter initialization...
Hello, Alice!
```

Also you can use `addInplace` method for immediate initialization of some instances for some reasons:

```typescript
container.add(HelloWorldMessagePrinter, () => {
    const logger = container.get(ConsoleLogger)
    console.log('HelloMessagePrinter initialization...')
    return new HelloMessagePrinter(logger)
})
container.add(ConsoleLogger, () => {
    console.log('ConsoleLogger initialization...')
    return new ConsoleLogger()
}
container.addInplace(DummyClass, () => {
    console.log('DummyClass initialization... It was first.')
})

container.get(HelloMessagePrinter).print('Alice')
```

Ouput:

```
DummyClass initialization... It was first.
ConsoleLogger initialization...
HelloMessagePrinter initialization...
Hello, Alice!
```

You can use dependency injection instead of service construction by hands:

```typescript
import { Container, Dependency } from '@karcass/container'

class FirstClass {}

class SecondClass {
    public constructor(@Dependency(FirstClass) firstClassInstance: FirstClass) {
        console.log(`${firstClassInstance.constructor.name} loaded`)
    }
}

const container = new Container()
container.add(FirstClass)
await container.addInplace(SecondClass)
```

Or you can just create instance of SecondClass using `inject` method, which creates instance of constructor and injects corresponding dependencies. This method doesn't perform addition of created object into self (container's) index:

```typescript
const secondClassInstance = await container.inject(SecondClass)
```

Feel free to use text keys for services:

```typescript
/* ... */
public constructor(@Dependency('first-class') firstClassInstance: FirstClass) {
/* ... */
container.add('first-class', () => new FirstClass())
await container.addInplace(SecondClass)
```

# Available methods

* `add<T>(key: costructor | string, initializer?: () => T | Promise<T>): void`;
* `addInplace<T>(key: consructor | string, initializer?: () => T | Promise<T>): Promise<T>`;
* `get<T>(key: constructor | string): Promise<T>`;
* `getAll(): Promise<T[]>`;
* `getKeys(): (string | constructor)[]`.
