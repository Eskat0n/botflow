class Stack {
    constructor() {
        this.array = [];
    }

    push(item) {
        return this.array.push(item);
    }

    pop() {
        return this.array.pop();
    }

    peek() {
        return this.array[this.array.length - 1];
    }

    get length() {
        return this.array.length;
    }
}

module.exports = Stack;