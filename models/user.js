'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  User.init({
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user'
    },
    // НОВЫЕ ПОЛЯ:
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isBanned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    banReason: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};