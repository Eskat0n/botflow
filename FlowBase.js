const Markup = require('telegraf/markup');
const {capitalize} = require('./utils');

class FlowBase {
    constructor(states) {
        this.states = states.map(state => new state());
        this.state = this.states.find(sc => sc.id === 'start');
    }

    async start(flowCtx) {
        let stateCtx = {
            ...flowCtx,
            flow: this,
            prevState: null,
            nextState: this.state
        };

        await this.state.enter(stateCtx, flowCtx.conv, flowCtx.storage);
    }

    async setState(stateId, flowCtx) {
        let prevState = this.state;
        let nextState = this.states.find(sc => sc.id === stateId);
        let stateCtx = {
            ...flowCtx,
            flow: this,
            prevState,
            nextState
        };

        console.log(`Started transiting ${this.constructor.name} from ${prevState.id} to ${nextState.id}`);

        let leaveResult = await prevState.leave(stateCtx, flowCtx.conv, flowCtx.storage);
        if (leaveResult === false) {
            console.log(`Leave handler blocked transition to state '${stateId}'`);
            return;
        }

        this.state = nextState;

        let enterResult = await nextState.enter(stateCtx, flowCtx.conv, flowCtx.storage);

        console.log(`Completed transiting ${this.constructor.name} to ${nextState.id}`);

        if (this.state.to)
            await this.setState(this.state.to, flowCtx);
    }

    async reply(botCtx, textOverride = null) {
        let text = textOverride || this.getStateText(botCtx);

        if (this.stateDef.beforeReply)
            this.stateDef.beforeReply(botCtx, text);

        if (this.stateDef.commands) {
            let buttons = this.stateDef.commands.map(cmd => cmd.name);
            let keyboard = Markup
                .keyboard(buttons, this.stateDef.layout || {columns: 2})
                .oneTime().resize().extra();

            if (this.stateDef.html)
                await botCtx.replyWithHTML(text, keyboard);
            else
                await botCtx.reply(text, keyboard);
        }
        else if (this.stateDef.actions) {
            let buttons = this.stateDef.actions.map((a, i) => Markup.callbackButton(a.name, `${this.stateId}-${i}`));
            let keyboard = Markup.inlineKeyboard(buttons, {columns: 2})
                .extra();

            if (this.stateDef.html)
                await botCtx.replyWithHTML(text, keyboard);
            else
                await botCtx.reply(text, keyboard);
        }
        else {
            if (this.stateDef.html)
                await botCtx.replyWithHTML(text);
            else
                await botCtx.reply(text);
        }

        if (this.stateDef.afterReply)
            this.stateDef.afterReply(botCtx, text);
    }
}

module.exports = FlowBase;