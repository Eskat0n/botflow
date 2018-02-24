const CommandSet = require('./src/CommandSet');
const ActionSet = require('./src/ActionSet');

class StateBase {
    constructor(id) {
        this.id = id;
        this.commands = null;
        this.actions = null;
        this.input = null;
    }

    async enter(ctx, conv, storage) {
    }

    async leave(ctx, conv, storage) {
    }

    clearRegistrations() {
        this.commands = null;
        this.actions = null;
        this.input = null;
    }

    registerCommands(commands) {
        return new CommandSet(this.commands = commands);
    }

    registerActions(actions) {
        return new ActionSet(this.actions = actions);
    }

    registerInput(input) {
        return this.input = input;
    }
}

module.exports = StateBase;