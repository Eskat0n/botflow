const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
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


const User = sequelize.define('user', {
    telegramId: Sequelize.INTEGER,
    name: Sequelize.STRING,
    firstName: Sequelize.STRING,
    lastName: Sequelize.STRING,
    connectedAt: Sequelize.DATE,
    activeAt: Sequelize.DATE,
    flowId: Sequelize.STRING,
    flowState: Sequelize.JSON
});