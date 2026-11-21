'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('Comments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        text: { type: Sequelize.STRING(280), allowNull: false },
        authorId: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        tweetId: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'Tweets', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      }, { transaction });
      await queryInterface.addIndex('Comments', ['tweetId'], { transaction });
      await queryInterface.addIndex('Comments', ['authorId'], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Comments');
  }
};
