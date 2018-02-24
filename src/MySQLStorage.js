const Sequelize = require('sequelize');

class MySQLStorage {
    constructor(database) {
        this.sequelize = new Sequelize(database, 'root', 'lSSakKwLcFcp2PyjXhpd', {
            host: 'localhost',
            dialect: 'mysql',
            pool: {
                max: 15,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            operatorsAliases: false
        });


        this.User = this.sequelize.define('user', {
            adapter: Sequelize.STRING,
            peerId: {type: Sequelize.BIGINT, allowNull: false},
            userName: {type: Sequelize.STRING, allowNull: true},
            firstName: {type: Sequelize.STRING, allowNull: true},
            lastName: {type: Sequelize.STRING, allowNull: true},
            url: {type: Sequelize.STRING, allowNull: true},
            connectedAt: {type: Sequelize.DATE, allowNull: false},
            activeAt: {type: Sequelize.DATE, allowNull: false},
            referrerId: {type: Sequelize.INTEGER, allowNull: true},
            referralUrl: {type: Sequelize.STRING, allowNull: true},
            flowId: Sequelize.STRING,
            flowState: Sequelize.JSON
        });
    }

    extend(extender) {
        extender(Sequelize, (name, opts) => this.sequelize.define(name, opts));
    }

    async init() {
        await this.sequelize.sync();
    }
}

module.exports = MySQLStorage;

