import { Container } from './Container'
import assert from 'assert'
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
it('Order must be empty', () => {
    container.add(MasterClass, async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return new MasterClass(await container.get(SlaveClass))
    })
    container.add(SlaveClass, () => new SlaveClass())
    assert.deepEqual(records, [])
})
it(`Order must be ${SlaveClass.name}, ${MasterClass.name}`, async () => {
    container.get(MasterClass)
    container.get(MasterClass)
    container.get(MasterClass)
    await container.get(MasterClass)
    assert.deepEqual(records, [SlaveClass.name, MasterClass.name])
})
it('Must equals for 10', async () => {
    assert.equal((await container.get(MasterClass)).getTen(), 10)
})
it(`Initialization order must be ${InlineClass.name}`, () => {
    records = []
    const container = new Container()
    container.addInplace(InlineClass, () => new InlineClass())
    assert.deepEqual(records, [InlineClass.name])
})
it('Must throw circular dependency error async', async () => {
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
        assert(err.message.toLowerCase().indexOf('too long') >= 0)
        return
    }
    assert.fail('Error not throwed')
})
it('Must throw not found error', async () => {
    try {
        await container.get(NeverClass)
    } catch (err) {
        assert(err.message.indexOf('NeverClass'))
        return
    }
    assert.fail('Error not throwed')
})
it('Access by string key must be available', async () => {
    container.add('somekey', () => 'somevalue')
    const val = await container.get('somekey')
    assert(val === 'somevalue')
})
it('Must must work ok with DI', async () => {
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
    assert(diClass2.getTrue())
})
it('Must throw circular dependency error with DI initialization', async () => {
    class LeftSide { public constructor(@Dependency('RightSide') protected rightSide: any) {} }
    class RightSide { public constructor(@Dependency('LeftSide') protected leftSide: any) {} }
    const diContainer = new Container(1000)
    diContainer.add(LeftSide)
    try {
        await diContainer.addInplace(RightSide)
    } catch (err) {
        return assert(err.message.toLowerCase().indexOf('multiple attempts') >= 0)
    }
    assert.fail()
})
it('Must throw @Dependency amount differs from constructor arguments count error', async () => {
    class TestClass { public constructor(arg1: string) { return arg1 } }
    const diContainer = new Container()
    try {
        diContainer.add(TestClass)
    } catch (err) {
        return assert(err.message.toLowerCase().indexOf('decorator usages') >= 0)
    }
    assert.fail()
})
