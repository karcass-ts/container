# @karcass/container

Very tiny and simple IoC container used in <a href="https://github.com/karcass-ts/karcass">karcass</a> skeleton

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

container.add(HelloWorldMessagePrinter, () => {
    const logger = container.get(ConsoleLogger)
    console.log('HelloMessagePrinter initialization...')
    return new HelloMessagePrinter(logger)
})
container.add(ConsoleLogger, () => {
    console.log('ConsoleLogger initialization...')
    return new ConsoleLogger()
}
container.add(DummyClass, () => {
    console.log('DummyClass initialization...')
})

container.get(HelloMessagePrinter).print('Alice')
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

* add(constructor, initializer)
* addInplace(constructor, initializer)
* get(constructor): instanceof constructor
* getAll(): Array&lt;instanceof constructor&gt;
* getConstructors(): Array&lt;constructor&gt;
