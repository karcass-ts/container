# @karcass/container

Very tiny and simple async IoC container used in <a href="https://github.com/karcass-ts/karcass">karcass</a> skeleton

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

# Available methods

* add(constructor, initializer): void
* addInplace(constructor, initializer): Promise<instanceof constructor>
* get(constructor): Promise<instanceof constructor>
* getAll(): Promise<Array&lt;instanceof constructor&gt;>
* getConstructors(): Array&lt;constructor&gt;
