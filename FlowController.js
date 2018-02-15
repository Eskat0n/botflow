const Stack = require('./Stack');

class InputValidator {
    constructor(config) {
        this.config = config;
    }

    isValid(input) {
        if (this.config instanceof Function) {
            return this.config(input);
        }
        else if (this.config instanceof RegExp) {
            return this.config.test(input);
        }

        return false;
    }
}

class FlowController {
    constructor(bot) {
        this.storage = {};
        this.bot = bot;
    }

    start(flowClass) {
        this.flowClass = flowClass;

        this.bot.catch(err => {
            console.log(err);
        });

        this.bot.start(ctx => {
            let flow = new this.flowClass();

            this.pushFlow(ctx.from.id, flow);

            return flow.start(ctx);
        });

        this.bot.hears(/.+/, async ctx => {
            let flow = this.peekFlow(ctx.from.id);
            if (!flow) return;

            let messageText = ctx.message.text;
            if (flow.stateDef.commands) {
                let command = flow.stateDef.commands
                    .find(cmd => cmd.name === messageText);

                if (command) {
                    if (command.start) {
                        let flow = new command.start();

                        this.pushFlow(ctx.from.id, flow);
                        await flow.start(ctx);
                    }
                    else if (command.to) {
                        await flow.setState(ctx, command.to, {command});

                        if (flow.stateDef.start) {
                            let newFlow = new flow.stateDef.start();

                            this.pushFlow(ctx.from.id, newFlow);
                            await newFlow.start(ctx);
                        }
                        else if (flow.stateDef.goBack) {
                            this.popFlow(ctx.from.id);
                            let newFlow = this.peekFlow(ctx.from.id);

                            await newFlow.start(ctx);
                        }
                    }
                    else if (command.goBack) {
                        this.popFlow(ctx.from.id);
                        let newFlow = this.peekFlow(ctx.from.id);

                        await newFlow.start(ctx);
                    }

                    return;
                }
            }

            if (flow.stateDef.input) {
                let isValid = flow.stateDef.input.validate
                    ? new InputValidator(flow.stateDef.input.validate).isValid(messageText)
                    : true;

                if (isValid) {
                    await flow.setState(ctx, flow.stateDef.input.to, {input: messageText});

                    if (flow.stateDef.start) {
                        let newFlow = new flow.stateDef.start();

                        this.pushFlow(ctx.from.id, newFlow);
                        await newFlow.start(ctx);
                    }
                    else if (flow.stateDef.goBack) {
                        this.popFlow(ctx.from.id);
                        let newFlow = this.peekFlow(ctx.from.id);

                        await newFlow.start(ctx);
                    }
                } else {
                    let text = flow.stateDef.input.validationMessage
                        ? flow.stateDef.input.validationMessage
                        : 'Введённое значение имеет неверный формат';

                    await flow.reply(ctx, text);
                }
            }
        });

        this.bot.action(/.+/, async ctx => {
            let flow = this.peekFlow(ctx.from.id);
            if (!flow) return;

            let actionId = ctx.update['callback_query']['data'];
            if (flow.stateDef.actions) {
                let action = flow.stateDef.actions
                    .find((a, i) => actionId === `${flow.stateId}-${i}`);

                if (action && action.callback)
                    await action.callback({action}, ctx);

                if (action && action.start) {
                    let flow = new action.start();

                    this.pushFlow(ctx.from.id, flow);
                    await flow.start(ctx);
                }
                else if (action && action.to) {
                    await flow.setState(ctx, action.to, {action});

                    if (flow.stateDef.start) {
                        let newFlow = new flow.stateDef.start();

                        this.pushFlow(ctx.from.id, newFlow);
                        await newFlow.start(ctx);
                    }
                    else if (flow.stateDef.goBack) {
                        this.popFlow(ctx.from.id);
                        let newFlow = this.peekFlow(ctx.from.id);

                        await newFlow.start(ctx);
                    }
                }
                else if (action && action.goBack) {
                    this.popFlow(ctx.from.id);
                    let newFlow = this.peekFlow(ctx.from.id);

                    await newFlow.start(ctx);
                }
            }
        });
    }

    peekFlow(userId) {
        if (!this.storage[userId])
            this.storage[userId] = new Stack();
        return this.storage[userId].peek() || new this.flowClass();
    }

    popFlow(userId) {
        if (!this.storage[userId])
            this.storage[userId] = new Stack();
        return this.storage[userId].pop() || new this.flowClass();
    }

    pushFlow(userId, flow) {
        if (!this.storage[userId])
            this.storage[userId] = new Stack();
        this.storage[userId].push(flow);
    }
}

module.exports = FlowController;