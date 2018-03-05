const MySQLStorage = require('../src/MySQLStorage');
const TelegramAdapter = require('../src/adapters/TelegramAdapter');
const {FlowController, FlowBase, StateBase, createState} = require('../botflow');

class TopupFlow extends  FlowBase {
    constructor() {
        super([
            class extends StateBase {
                constructor() {
                    super('start');
                }

                async enter(ctx, conv, storage) {
                    this.clearRegistrations();

                    this.registerInput({
                        validate: input => {
                            if (!/\s*\d+\s*/i.test(input))
                                return false;

                            let number = parseInt(input.trim());
                            if (isNaN(number))
                                return false;

                            return 50 <= number && number <= 50000;
                        },
                        validationMessage: '😠 Выбранное кол-во меньше или больше положенного',
                        to: 'payment'
                    });

                    await conv.reply('Введите сумму для пополнения (минимум 50руб.)');
                }

                async leave(ctx, conv, storage) {
                    ctx.flow.amount = parseInt(ctx.transition.text);
                }
            },
            class extends StateBase {
                constructor() {
                    super('payment');
                }

                async enter(ctx, conv, storage) {
                    this.clearRegistrations();

                    let actions = this.registerActions([
                        {id: 'pay', text: `Оплатить ${ctx.flow.amount} руб.`, url: 'http://money.yandex.ru'}
                    ]);

                    await conv.reply('Для оплаты нажми на кнопку ниже 👇', actions);
                }
            }
        ]);

        this.amount = null;
    }
}

class OrderFlow extends FlowBase {

}

class RootFlow extends FlowBase {
    constructor() {
        super([
            createState({
                id: 'start',
                enter: async function (ctx, conv, storage) {
                    this.clearRegistrations();

                    let account = await storage.Account.findOne({
                        where: {userId: ctx.user.get('id')}
                    });

                    let commands = this.registerCommands([
                        {id: 'topup', text: `Пополнить баланс (${account.balance} руб.)`, start: TopupFlow},
                        {id: 'order', text: 'Сделать заказ', start: OrderFlow},
                        {id: 'order', text: 'Мои реферралы', to: 'referrals'},
                        {id: 'events', text: 'Акции', to: 'events'},
                    ]);

                    await conv.reply('Выберите пункт меню:', commands);
                }
            }),
            class extends StateBase {
                constructor() {
                    super('referrals');
                    this.goBack = true;
                }

                async enter(ctx, conv, storage) {
                    this.clearRegistrations();

                    let referrals = await storage.User.findAll({
                        where: {referrerId: ctx.user.get('id')}
                    });

                    if (referrals.length > 0) {
                        let referralsText = referrals
                            .map((x, i) => `${i}. ${x.get('userName')}`)
                            .join('\n');

                        await conv.reply('Ваши реферралы: ' + referralsText);
                    } else {
                        await conv.reply('У вас пока нет реферралов.\nПригласите их с помощью вашей персональной ссылки:');;
                    }
                }
            }
        ]);
    }
}

const flowController = new FlowController();
const storage = new MySQLStorage('botflow-sample-bot');

storage.extend((types, define) => {
    storage.Account = define('account', {
        userId: types.INTEGER,
        balance: types.DECIMAL(10, 2)
    });
});

flowController.useStorage(storage);
flowController.useAdapter(new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN));
flowController.start(RootFlow);