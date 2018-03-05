const FlowController = require('./FlowController');
const FlowBase = require('./FlowBase');
const StateBase = require('./StateBase');

const createState = obj => {
    return class extends StateBase {
        constructor() {
            super(obj.id);

            this.goBack = obj.goBack;
            this.to = obj.to;
        }

        async enter(ctx, conv, storage) {
            if (obj.enter)
                await obj.enter.call(this, ctx, conv, storage);
        }

        async leave(ctx, conv, storage) {
            if (obj.leave)
                await obj.leave.call(this, ctx, conv, storage);
        }
    }
};

module.exports = {
    FlowController,
    FlowBase,
    StateBase,
    createState
};