import { Container } from './Container'
import { Dependency } from './Dependency'

let records: string[] = []

class MasterClass {
    public constructor(protected slaveClass: SlaveClass) {
        records.push(this.constructor.name)
    }
    public getTen() {
        return this.slaveClass.getFive() + 5
    }
}
class SlaveClass {
    public constructor() {
        records.push(this.constructor.name)
    }
    public getFive() {
        return 5
    }
}
class InlineClass { public constructor() { records.push(this.constructor.name) } }
class NeverClass {}

const container = new Container(1000)
test('Order must be empty', () => {
    container.add(MasterClass, async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return new MasterClass(await container.get(SlaveClass))
    })
    container.add(SlaveClass, () => new SlaveClass())
    expect(records).toStrictEqual([])
})
test(`Order must be ${SlaveClass.name}, ${MasterClass.name}`, async () => {
    container.get(MasterClass)
    container.get(MasterClass)
    container.get(MasterClass)
    await container.get(MasterClass)
    expect(records).toStrictEqual([SlaveClass.name, MasterClass.name])
})
test('Must equals for 10', async () => {
    expect((await container.get(MasterClass)).getTen()).toBe(10)
})
test(`Initialization order must be ${InlineClass.name}`, () => {
    records = []
    const container = new Container()
    container.addInplace(InlineClass, () => new InlineClass())
    expect(records).toStrictEqual([InlineClass.name])
})
test('Must throw circular dependency error async', async () => {
    class LeftSide { public constructor(protected rightSide: RightSide) {} }
    class RightSide { public constructor(protected leftSide: LeftSide) {} }
    container.add(LeftSide, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return new LeftSide(await container.get(RightSide))
    })
    container.add(RightSide, async () => new RightSide(await container.get(LeftSide)))
    try {
        await container.get(LeftSide)
    } catch (err) {
        expect(err.message.toLowerCase()).toMatch('too long')
        return
    }
    fail('Error not throwed')
})
test('Must throw not found error', async () => {
    try {
        await container.get(NeverClass)
    } catch (err) {
        expect(err.message).toMatch('NeverClass')
        return
    }
    fail('Error not throwed')
})
test('Access by string key must be available', async () => {
    container.add('somekey', () => 'somevalue')
    const val = await container.get('somekey')
    expect(val).toBe('somevalue')
})
test('Must must work ok with DI', async () => {
    const diContainer = new Container()
    class DiClass1 { protected val = 'dsd' }
    class TrueReturner { public get = () => true }
    class DiClass2 {
        public constructor(@Dependency(DiClass1) diClass1: DiClass1,
            @Dependency(TrueReturner) protected trueReturner: TrueReturner,
        ) {
            if (!(diClass1 instanceof DiClass1)) {
                throw new Error('diClass1 is not instance of DiClass1')
            }
        }
        public getTrue() {
            return this.trueReturner.get()
        }
    }
    diContainer.add(DiClass1)
    diContainer.add(DiClass2)
    diContainer.add(TrueReturner)
    const diClass2 = await diContainer.get(DiClass2)
    expect(diClass2.getTrue()).toStrictEqual(true)
})
test('Must throw circular dependency error with DI initialization', async () => {
    class LeftSide { public constructor(@Dependency('RightSide') protected rightSide: any) {} }
    class RightSide { public constructor(@Dependency('LeftSide') protected leftSide: any) {} }
    const diContainer = new Container(1000)
    diContainer.add(LeftSide)
    try {
        await diContainer.addInplace(RightSide)
    } catch (err) {
        return expect(err.message.toLowerCase()).toMatch('multiple attempts')
    }
    fail()
})
test('Must throw @Dependency amount differs from constructor arguments count error', async () => {
    class TestClass { public constructor(arg1: string) { return arg1 } }
    const diContainer = new Container()
    try {
        diContainer.add(TestClass)
    } catch (err) {
        return expect(err.message.toLowerCase()).toMatch('decorator usages')
    }
    fail()
})
test('Must throw error about key already exists', async () => {
    class TestClass1 {}
    class TestClass2 {}
    const diContainer = new Container()
    try {
        await diContainer.addInplace(TestClass1, () => new TestClass1())
        await diContainer.addInplace(TestClass1, () => new TestClass2())
        fail()
    } catch (err) {
        expect(err.message).toMatch('already')
    }
})
test('Must throw error about wrong return value of initializer', async () => {
    class TestClass1 {}
    class TestClass2 {}
    class TestClass3 extends TestClass2 {}
    const diContainer = new Container()
    try {
        await diContainer.addInplace(TestClass1, () => new TestClass2())
        fail()
    } catch (err) {
        expect(err.message).toMatch('is not instance')
    }
    await diContainer.addInplace(TestClass2, () => new TestClass3())
})
