'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('LoginLogs', 'updatedAt');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('LoginLogs', 'updatedAt', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('NOW')
    });
  }
};