import { Container } from './Container'
import assert from 'assert'

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

const container = new Container()
it('Order must be empty', () => {
    container.add(MasterClass, () => new MasterClass(container.get(SlaveClass)))
    container.add(SlaveClass, () => new SlaveClass())
    assert.deepEqual(records, [])
})
it(`Order must be ${SlaveClass.name}, ${MasterClass.name}`, () => {
    container.get(MasterClass)
    assert.deepEqual(records, [SlaveClass.name, MasterClass.name])
})
it('Must equals for 10', () => {
    assert.equal(container.get(MasterClass).getTen(), 10)
})
it(`Initialization order must be ${InlineClass.name}`, () => {
    records = []
    const container = new Container()
    container.addInplace(InlineClass, () => new InlineClass())
    assert.deepEqual(records, [InlineClass.name])
})
it('Must throw circular dependency error', () => {
    class LeftSide { public constructor(protected rightSide: RightSide) {} }
    class RightSide { public constructor(protected leftSide: LeftSide) {} }
    container.add(LeftSide, () => new LeftSide(container.get(RightSide)))
    container.add(RightSide, () => new RightSide(container.get(LeftSide)))
    try {
        container.get(LeftSide)
    } catch (err) {
        assert(err.message.indexOf('detected'))
        return
    }
    assert.fail('Error not throwed')
})
it('Must throw not found error', () => {
    try {
        container.get(NeverClass)
    } catch (err) {
        assert(err.message.indexOf('NeverClass'))
        return
    }
    assert.fail('Error not throwed')
})